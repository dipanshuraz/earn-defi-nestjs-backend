import { registerAs } from '@nestjs/config';

export interface IdempotencyConfig {
  ttlHours: number;
  headerName: string;
}

export default registerAs('idempotency', (): IdempotencyConfig => {
  const ttlHours = parseInt(process.env.IDEMPOTENCY_TTL_HOURS ?? '24', 10);

  return {
    ttlHours: Number.isFinite(ttlHours) && ttlHours > 0 ? ttlHours : 24,
    headerName: (process.env.IDEMPOTENCY_HEADER_NAME ?? 'idempotency-key').toLowerCase(),
  };
});
