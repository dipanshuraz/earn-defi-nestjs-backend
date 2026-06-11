import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from '@upstash/redis';
import { RedisConfig } from '../config/config.types';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const redisConfig = this.configService.get<RedisConfig>('redis');

    if (!redisConfig?.restUrl || !redisConfig.restToken) {
      throw new Error('Redis configuration failed to load');
    }

    this.client = new Redis({
      url: redisConfig.restUrl,
      token: redisConfig.restToken,
    });

    const pong = await this.client.ping();
    this.logger.log(`Connected to Upstash Redis (${pong})`);
  }

  getClient(): Redis {
    return this.client;
  }

  async ping(): Promise<string> {
    return this.client.ping();
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Redis client released on shutdown');
  }
}
