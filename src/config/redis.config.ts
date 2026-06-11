import { registerAs } from '@nestjs/config';
import { RedisConfig } from './config.types';

export default registerAs(
  'redis',
  (): RedisConfig => ({
    restUrl: process.env.UPSTASH_REDIS_REST_URL ?? '',
    restToken: process.env.UPSTASH_REDIS_REST_TOKEN ?? '',
    url: process.env.REDIS_URL ?? '',
    queueEnabled:
      process.env.NODE_ENV !== 'test' &&
      (process.env.QUEUE_ENABLED ?? 'true').toLowerCase() !== 'false',
  }),
);
