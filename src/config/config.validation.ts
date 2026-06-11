import * as Joi from 'joi';
import { AppEnvironment } from './config.types';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  APP_ENV: Joi.string()
    .valid(...Object.values(AppEnvironment))
    .default(AppEnvironment.Local),
  PORT: Joi.number().port().default(3000),
  API_PREFIX: Joi.string().default('api/v1'),
  CORS_ORIGINS: Joi.string().default('*'),
  RATE_LIMIT_TTL_MS: Joi.number().integer().positive().default(60000),
  RATE_LIMIT_MAX: Joi.number().integer().positive().default(100),
  MAX_DEPOSITS_PER_MINUTE: Joi.number().integer().positive().default(10),
  MAX_WITHDRAWALS_PER_MINUTE: Joi.number().integer().positive().default(10),
  DEPENDENCY_CHECK_TIMEOUT_MS: Joi.number().integer().positive().default(5000),
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug', 'verbose')
    .default('info'),
  DATABASE_URL: Joi.string().uri({ scheme: ['postgresql', 'postgres'] }).required(),
  CHAIN: Joi.string().required(),
  CHAIN_ID: Joi.number().integer().positive().required(),
  MAINNET_ENABLED: Joi.boolean().truthy('true').falsy('false').default(false),
  ALLOW_MAINNET_TRANSACTIONS: Joi.boolean().truthy('true').falsy('false').default(false),
  ALCHEMY_API_KEY: Joi.string().required(),
  RPC_URL: Joi.string().uri().required(),
  UPSTASH_REDIS_REST_URL: Joi.string().uri().required(),
  UPSTASH_REDIS_REST_TOKEN: Joi.string().required(),
  REDIS_URL: Joi.string().uri({ scheme: ['redis', 'rediss'] }).required(),
  QUEUE_ENABLED: Joi.boolean().truthy('true').falsy('false').default(true),
  PRIVY_APP_ID: Joi.string().required(),
  PRIVY_APP_SECRET: Joi.string().required(),
  PRIVY_JWKS_URL: Joi.string().uri().required(),
  PRIVY_AUTHORIZATION_PRIVATE_KEY: Joi.string().optional(),
  PRIVY_WALLET_SIGNER_KEY_QUORUM_ID: Joi.string().optional(),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),
  WALLET_PROVIDER: Joi.string().valid('privy').default('privy'),
  CHAINS_CONFIG: Joi.string().required(),
  ASSETS_CONFIG: Joi.string().required(),
  EARN_PROTOCOL_PROVIDER: Joi.string().valid('aave').default('aave'),
  AAVE_API_URL: Joi.string().uri().default('https://api.v3.aave.com/graphql'),
  AAVE_VAULTS_CONFIG: Joi.string().required(),
  IDEMPOTENCY_TTL_HOURS: Joi.number().integer().positive().default(24),
  IDEMPOTENCY_HEADER_NAME: Joi.string().default('idempotency-key'),
});

export const configModuleOptions = {
  isGlobal: true,
  envFilePath: [
    `.env.${process.env.APP_ENV ?? 'local'}`,
    '.env.local',
    '.env',
  ],
  validationSchema,
  validationOptions: {
    abortEarly: false,
    allowUnknown: true,
  },
};
