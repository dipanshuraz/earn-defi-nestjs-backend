import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { Observable, from, throwError } from 'rxjs';
import { catchError, mergeMap } from 'rxjs/operators';
import { AuthenticatedUser } from '../auth/auth.types';
import { IdempotencyConfig } from '../config/config.types';
import { IdempotencyKeyRequiredException } from './exceptions/idempotency.exceptions';
import {
  IDEMPOTENCY_REQUEST_PATHS,
  IDEMPOTENT_METADATA_KEY,
} from './idempotency.constants';
import { IdempotencyService } from './idempotency.service';
import { IdempotentOptions } from './idempotency.types';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly idempotencyService: IdempotencyService,
    private readonly configService: ConfigService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const options = this.reflector.get<IdempotentOptions | undefined>(
      IDEMPOTENT_METADATA_KEY,
      context.getHandler(),
    );

    if (!options) {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<Request & { user?: AuthenticatedUser }>();
    const response = http.getResponse<Response>();
    const config = this.getConfig();
    const idempotencyKey = this.readIdempotencyKey(request, config.headerName);

    if (!idempotencyKey) {
      throw new IdempotencyKeyRequiredException(config.headerName);
    }

    const requestPath = IDEMPOTENCY_REQUEST_PATHS[options.operation];
    const fingerprint = {
      method: request.method,
      path: request.route?.path ?? request.path,
      params: this.normalizeParams(request.params),
      query: this.normalizeQuery(request.query),
      body: request.body ?? null,
    };

    return from(
      this.idempotencyService.acquire({
        key: idempotencyKey,
        requestPath,
        fingerprint,
        userId: request.user?.userId,
      }),
    ).pipe(
      mergeMap(({ replay, record }) => {
        if (replay) {
          response.status(replay.statusCode);
          return from([replay.responseData]);
        }

        return next.handle().pipe(
          mergeMap(async (body) => {
            await this.idempotencyService.complete(
              record.id,
              response.statusCode || 200,
              body,
            );
            return body;
          }),
          catchError((error) =>
            from(this.handleFailure(record.id, error)).pipe(mergeMap(() => throwError(() => error))),
          ),
        );
      }),
    );
  }

  private async handleFailure(recordId: string, error: unknown): Promise<void> {
    if (error instanceof Error && 'getStatus' in error && typeof error.getStatus === 'function') {
      const statusCode = (error as { getStatus: () => number }).getStatus();
      const responseBody =
        'getResponse' in error && typeof error.getResponse === 'function'
          ? (error as { getResponse: () => unknown }).getResponse()
          : { message: error.message };

      await this.idempotencyService.complete(recordId, statusCode, responseBody);
      return;
    }

    await this.idempotencyService.complete(recordId, 500, {
      message: 'Internal server error',
    });
  }

  private readIdempotencyKey(request: Request, headerName: string): string | undefined {
    const headerValue = request.header(headerName);

    if (!headerValue?.trim()) {
      return undefined;
    }

    return headerValue.trim();
  }

  private normalizeParams(params: Request['params']): Record<string, string> {
    return Object.fromEntries(
      Object.entries(params).map(([key, value]) => [key, String(value)]),
    );
  }

  private normalizeQuery(query: Request['query']): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(query).map(([key, value]) => [
        key,
        Array.isArray(value) ? value.map((entry) => String(entry)) : String(value),
      ]),
    );
  }

  private getConfig(): IdempotencyConfig {
    const config = this.configService.get<IdempotencyConfig>('idempotency');

    if (!config) {
      throw new Error('Idempotency configuration failed to load');
    }

    return config;
  }
}
