import { Injectable } from '@nestjs/common';
import { IdempotencyKey, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIdempotencyRecordInput } from './idempotency.types';

@Injectable()
export class IdempotencyRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByKeyAndPath(key: string, requestPath: string): Promise<IdempotencyKey | null> {
    return this.prisma.idempotencyKey.findUnique({
      where: {
        key_requestPath: {
          key,
          requestPath,
        },
      },
    });
  }

  create(input: CreateIdempotencyRecordInput): Promise<IdempotencyKey> {
    return this.prisma.idempotencyKey.create({
      data: {
        key: input.key,
        requestPath: input.requestPath,
        requestHash: input.requestHash,
        userId: input.userId,
        expiresAt: input.expiresAt,
      },
    });
  }

  saveResponse(
    id: string,
    responseData: Prisma.InputJsonValue,
    statusCode: number,
  ): Promise<IdempotencyKey> {
    return this.prisma.idempotencyKey.update({
      where: { id },
      data: {
        responseData,
        statusCode,
      },
    });
  }

  deleteById(id: string): Promise<IdempotencyKey> {
    return this.prisma.idempotencyKey.delete({
      where: { id },
    });
  }

  toRecord(record: IdempotencyKey) {
    return {
      id: record.id,
      key: record.key,
      requestHash: record.requestHash,
      responseData: record.responseData,
      createdAt: record.createdAt,
    };
  }
}
