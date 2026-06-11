import { Global, Module } from '@nestjs/common';
import { BullmqRedisService } from './bullmq-redis.service';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [RedisService, BullmqRedisService],
  exports: [RedisService, BullmqRedisService],
})
export class RedisModule {}
