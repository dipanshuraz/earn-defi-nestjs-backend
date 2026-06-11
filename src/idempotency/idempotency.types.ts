import { IdempotencyOperation } from './idempotency.constants';

export interface IdempotentOptions {
  operation: IdempotencyOperation;
}

export interface IdempotencyRecord {
  id: string;
  key: string;
  requestHash: string;
  responseData: unknown | null;
  createdAt: Date;
}

export interface IdempotencyReplayResult {
  statusCode: number;
  responseData: unknown;
}

export interface CreateIdempotencyRecordInput {
  key: string;
  requestPath: string;
  requestHash: string;
  userId?: string;
  expiresAt: Date;
}

export interface RequestFingerprintInput {
  method: string;
  path: string;
  params: Record<string, string>;
  query: Record<string, unknown>;
  body: unknown;
}
