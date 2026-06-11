import { createHash } from 'crypto';
import { RequestFingerprintInput } from '../idempotency.types';

export function hashRequest(fingerprint: RequestFingerprintInput): string {
  const canonical = stableStringify(fingerprint);
  return createHash('sha256').update(canonical).digest('hex');
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => sortValue(entry));
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const sortedEntries = Object.keys(record)
      .sort()
      .map((key) => [key, sortValue(record[key])]);

    return Object.fromEntries(sortedEntries);
  }

  return value;
}
