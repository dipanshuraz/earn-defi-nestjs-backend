import { registerAs } from '@nestjs/config';
import { DatabaseConfig } from './config.types';

export default registerAs(
  'database',
  (): DatabaseConfig => ({
    url: process.env.DATABASE_URL ?? '',
  }),
);
