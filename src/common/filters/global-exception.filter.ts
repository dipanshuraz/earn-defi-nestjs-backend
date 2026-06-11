import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

export interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  code?: string;
  requestId?: string;
  timestamp: string;
  path: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = request.requestId;

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    let message: string | string[] = 'Internal server error';
    let error = HttpStatus[status] ?? 'Error';
    let code: string | undefined;

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (
      exceptionResponse !== null &&
      typeof exceptionResponse === 'object' &&
      'message' in exceptionResponse
    ) {
      const payload = exceptionResponse as {
        message?: string | string[];
        error?: string;
        code?: string;
      };
      message = payload.message ?? message;
      error = payload.error ?? error;
      code = payload.code;
    }

    const logPayload = {
      requestId,
      method: request.method,
      path: request.url,
      status,
      code,
      message,
    };

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        JSON.stringify(logPayload),
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(JSON.stringify(logPayload));
    }

    const body: ErrorResponse = {
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    if (code) {
      body.code = code;
    }

    if (requestId) {
      body.requestId = requestId;
    }

    response.status(status).json(body);
  }
}
