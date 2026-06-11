import { registerAs } from '@nestjs/config';
import { AppConfig, AppEnvironment } from './config.types';

function parseCorsOrigins(value: string | undefined): string[] {
  if (!value || value.trim() === '*') {
    return ['*'];
  }

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

export default registerAs(
  'app',
  (): AppConfig => ({
    nodeEnv: process.env.NODE_ENV ?? 'development',
    appEnv: (process.env.APP_ENV as AppEnvironment) ?? AppEnvironment.Local,
    port: parseInt(process.env.PORT ?? '3000', 10),
    apiPrefix: process.env.API_PREFIX ?? 'api/v1',
    logLevel: process.env.LOG_LEVEL ?? 'info',
    corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS),
  }),
);
