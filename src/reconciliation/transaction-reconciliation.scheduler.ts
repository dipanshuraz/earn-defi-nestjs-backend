import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { BullmqRedisService } from '../redis/bullmq-redis.service';
import {
  TRANSACTION_RECONCILIATION_INTERVAL_MS,
  TRANSACTION_RECONCILIATION_JOB,
  TRANSACTION_RECONCILIATION_QUEUE,
  TRANSACTION_RECONCILIATION_REPEAT_JOB_ID,
} from './reconciliation.constants';

@Injectable()
export class TransactionReconciliationScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TransactionReconciliationScheduler.name);
  private queue: Queue | null = null;

  constructor(private readonly bullmqRedisService: BullmqRedisService) {}

  async onModuleInit(): Promise<void> {
    if (!this.bullmqRedisService.isQueueEnabled()) {
      this.logger.log('Transaction reconciliation scheduler disabled');
      return;
    }

    this.queue = new Queue(TRANSACTION_RECONCILIATION_QUEUE, {
      connection: this.bullmqRedisService.getConnectionOptions(),
    });

    await this.queue.add(
      TRANSACTION_RECONCILIATION_JOB,
      {},
      {
        jobId: TRANSACTION_RECONCILIATION_REPEAT_JOB_ID,
        repeat: { every: TRANSACTION_RECONCILIATION_INTERVAL_MS },
        removeOnComplete: true,
        removeOnFail: 100,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    );

    this.logger.log(
      `Transaction reconciliation job scheduled every ${TRANSACTION_RECONCILIATION_INTERVAL_MS / 1000}s`,
    );
  }

  async onModuleDestroy(): Promise<void> {
    if (this.queue) {
      await this.queue.close();
      this.queue = null;
    }
  }
}
