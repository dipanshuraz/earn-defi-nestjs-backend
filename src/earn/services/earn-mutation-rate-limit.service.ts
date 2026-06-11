import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service';
import { SecurityConfig } from '../../config/config.types';

@Injectable()
export class EarnMutationRateLimitService {
  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {}

  async assertDepositAllowed(userId: string): Promise<void> {
    await this.assertAllowed(userId, 'deposit', this.getSecurityConfig().maxDepositsPerMinute);
  }

  async assertWithdrawAllowed(userId: string): Promise<void> {
    await this.assertAllowed(userId, 'withdraw', this.getSecurityConfig().maxWithdrawalsPerMinute);
  }

  private async assertAllowed(
    userId: string,
    action: 'deposit' | 'withdraw',
    limit: number,
  ): Promise<void> {
    const windowKey = Math.floor(Date.now() / 60_000);
    const key = `earn:${action}:${userId}:${windowKey}`;

    const count = await this.redisService.getClient().incr(key);

    if (count === 1) {
      await this.redisService.getClient().expire(key, 60);
    }

    if (count > limit) {
      throw new HttpException(
        {
          message: `Too many ${action} requests. Limit is ${limit} per minute.`,
          code: 'RATE_LIMIT_EXCEEDED',
          details: { action, limit, windowSeconds: 60 },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private getSecurityConfig(): SecurityConfig {
    const security = this.configService.get<SecurityConfig>('security');

    if (!security) {
      throw new Error('Security configuration failed to load');
    }

    return security;
  }
}
