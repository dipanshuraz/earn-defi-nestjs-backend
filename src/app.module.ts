import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import {
  appConfig,
  blockchainConfig,
  configModuleOptions,
  databaseConfig,
  privyConfig,
  redisConfig,
  jwtConfig,
  walletConfig,
  chainsConfig,
  assetsConfig,
  aaveConfig,
  protocolsConfig,
  idempotencyConfig,
  securityConfig,
} from './config';
import { SecurityConfig } from './config/config.types';
import {
  RequestIdMiddleware,
  StructuredLoggingMiddleware,
} from './common';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { SystemModule } from './system/system.module';
import { UsersModule } from './users/users.module';
import { WalletsModule } from './wallets/wallets.module';
import { ChainsModule } from './chains/chains.module';
import { AssetsModule } from './assets/assets.module';
import { ProtocolsModule } from './protocols/protocols.module';
import { EarnModule } from './earn/earn.module';
import { PrismaModule } from './prisma/prisma.module';
import { ReconciliationModule } from './reconciliation/reconciliation.module';
import { RedisModule } from './redis/redis.module';
import { IdempotencyModule } from './idempotency/idempotency.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      ...configModuleOptions,
      load: [
        appConfig,
        securityConfig,
        databaseConfig,
        blockchainConfig,
        redisConfig,
        privyConfig,
        jwtConfig,
        walletConfig,
        chainsConfig,
        assetsConfig,
        aaveConfig,
        protocolsConfig,
        idempotencyConfig,
      ],
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const security = configService.get<SecurityConfig>('security');

        return [
          {
            ttl: security?.rateLimitTtlMs ?? 60_000,
            limit: security?.rateLimitMax ?? 100,
          },
        ];
      },
    }),
    PrismaModule,
    AuditModule,
    IdempotencyModule,
    RedisModule,
    AuthModule,
    HealthModule,
    SystemModule,
    UsersModule,
    WalletsModule,
    ChainsModule,
    AssetsModule,
    ProtocolsModule,
    EarnModule,
    ReconciliationModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware, StructuredLoggingMiddleware).forRoutes('*');
  }
}
