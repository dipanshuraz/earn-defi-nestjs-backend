import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export class IdempotencyKeyRequiredException extends BadRequestException {
  constructor(headerName: string) {
    super(`Missing required header: ${headerName}`);
  }
}

export class IdempotencyConflictException extends ConflictException {
  constructor(key: string) {
    super(`Idempotency key "${key}" was already used with a different request payload`);
  }
}

export class IdempotencyInProgressException extends ConflictException {
  constructor(key: string) {
    super(`Idempotency key "${key}" is already being processed`);
  }
}

export function isRetryableIdempotencyError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
  );
}
