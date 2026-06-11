import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

const LOCK_KEY = 'reconciliation:lock';
const LOCK_TTL_SECONDS = 25;

@Injectable()
export class ReconciliationLockService {
  constructor(private readonly redisService: RedisService) {}

  async acquire(jobId: string): Promise<boolean> {
    const result = await this.redisService.getClient().set(LOCK_KEY, jobId, {
      nx: true,
      ex: LOCK_TTL_SECONDS,
    });

    return result === 'OK';
  }

  async release(jobId: string): Promise<void> {
    const current = await this.redisService.getClient().get<string>(LOCK_KEY);

    if (current === jobId) {
      await this.redisService.getClient().del(LOCK_KEY);
    }
  }
}
