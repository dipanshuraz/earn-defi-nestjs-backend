import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { IdempotencyInterceptor } from './idempotency.interceptor';
import { IdempotencyRepository } from './idempotency.repository';
import { IdempotencyService } from './idempotency.service';

@Global()
@Module({
  providers: [
    IdempotencyRepository,
    IdempotencyService,
    IdempotencyInterceptor,
    {
      provide: APP_INTERCEPTOR,
      useClass: IdempotencyInterceptor,
    },
  ],
  exports: [IdempotencyService, IdempotencyRepository],
})
export class IdempotencyModule {}
