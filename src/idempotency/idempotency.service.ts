import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { IdempotencyConfig } from '../config/config.types';
import {
  IdempotencyConflictException,
  IdempotencyInProgressException,
  isRetryableIdempotencyError,
} from './exceptions/idempotency.exceptions';
import { IdempotencyRepository } from './idempotency.repository';
import {
  IdempotencyRecord,
  IdempotencyReplayResult,
  RequestFingerprintInput,
} from './idempotency.types';
import { hashRequest } from './utils/request-hash.util';

interface AcquireIdempotencyInput {
  key: string;
  requestPath: string;
  fingerprint: RequestFingerprintInput;
  userId?: string;
}

interface AcquireIdempotencyResult {
  replay: IdempotencyReplayResult | null;
  record: IdempotencyRecord;
}

@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);

  constructor(
    private readonly repository: IdempotencyRepository,
    private readonly configService: ConfigService,
  ) {}

  buildRequestHash(fingerprint: RequestFingerprintInput): string {
    return hashRequest(fingerprint);
  }

  async acquire(input: AcquireIdempotencyInput): Promise<AcquireIdempotencyResult> {
    const requestHash = this.buildRequestHash(input.fingerprint);
    const existing = await this.repository.findByKeyAndPath(input.key, input.requestPath);

    if (existing) {
      return this.resolveExistingRecord(existing, requestHash);
    }

    try {
      const created = await this.repository.create({
        key: input.key,
        requestPath: input.requestPath,
        requestHash,
        userId: input.userId,
        expiresAt: this.computeExpiryDate(),
      });

      return {
        replay: null,
        record: this.repository.toRecord(created),
      };
    } catch (error) {
      if (!isRetryableIdempotencyError(error)) {
        throw error;
      }

      this.logger.debug(
        `Idempotency race detected for key=${input.key} path=${input.requestPath}, retrying lookup`,
      );

      const raced = await this.repository.findByKeyAndPath(input.key, input.requestPath);

      if (!raced) {
        throw error;
      }

      return this.resolveExistingRecord(raced, requestHash);
    }
  }

  async complete(
    recordId: string,
    statusCode: number,
    responseData: unknown,
  ): Promise<void> {
    if (!this.shouldPersistResponse(statusCode)) {
      await this.repository.deleteById(recordId);
      return;
    }

    await this.repository.saveResponse(
      recordId,
      responseData as Prisma.InputJsonValue,
      statusCode,
    );
  }

  private resolveExistingRecord(
    existing: {
      id: string;
      key: string;
      requestHash: string;
      responseData: unknown;
      statusCode: number | null;
      createdAt: Date;
    },
    requestHash: string,
  ): AcquireIdempotencyResult {
    if (existing.requestHash !== requestHash) {
      throw new IdempotencyConflictException(existing.key);
    }

    if (existing.responseData === null || existing.statusCode === null) {
      throw new IdempotencyInProgressException(existing.key);
    }

    return {
      replay: {
        statusCode: existing.statusCode,
        responseData: existing.responseData,
      },
      record: {
        id: existing.id,
        key: existing.key,
        requestHash: existing.requestHash,
        responseData: existing.responseData,
        createdAt: existing.createdAt,
      },
    };
  }

  private shouldPersistResponse(statusCode: number): boolean {
    return statusCode >= 200 && statusCode < 300;
  }

  private computeExpiryDate(): Date {
    const config = this.getConfig();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + config.ttlHours);
    return expiresAt;
  }

  private getConfig(): IdempotencyConfig {
    const config = this.configService.get<IdempotencyConfig>('idempotency');

    if (!config) {
      throw new Error('Idempotency configuration failed to load');
    }

    return config;
  }
}
