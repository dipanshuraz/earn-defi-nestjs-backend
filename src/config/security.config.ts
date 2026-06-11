import { registerAs } from '@nestjs/config';
import { SecurityConfig } from './config.types';

export default registerAs(
  'security',
  (): SecurityConfig => ({
    rateLimitTtlMs: parseInt(process.env.RATE_LIMIT_TTL_MS ?? '60000', 10),
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX ?? '100', 10),
    maxDepositsPerMinute: parseInt(process.env.MAX_DEPOSITS_PER_MINUTE ?? '10', 10),
    maxWithdrawalsPerMinute: parseInt(process.env.MAX_WITHDRAWALS_PER_MINUTE ?? '10', 10),
    dependencyCheckTimeoutMs: parseInt(
      process.env.DEPENDENCY_CHECK_TIMEOUT_MS ?? '5000',
      10,
    ),
  }),
);
