import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ConnectionOptions } from 'bullmq';
import { RedisConfig } from '../config/config.types';

@Injectable()
export class BullmqRedisService {
  constructor(private readonly configService: ConfigService) {}

  getConnectionOptions(): ConnectionOptions {
    const redisConfig = this.getRedisConfig();

    return {
      url: redisConfig.url,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    };
  }

  isQueueEnabled(): boolean {
    return this.getRedisConfig().queueEnabled;
  }

  private getRedisConfig(): RedisConfig {
    const redisConfig = this.configService.get<RedisConfig>('redis');

    if (!redisConfig?.url) {
      throw new Error('Redis URL configuration failed to load');
    }

    return redisConfig;
  }
}
