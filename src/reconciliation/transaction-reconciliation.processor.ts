import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import { BullmqRedisService } from '../redis/bullmq-redis.service';
import {
  TRANSACTION_RECONCILIATION_JOB,
  TRANSACTION_RECONCILIATION_QUEUE,
} from './reconciliation.constants';
import { TransactionReconciliationService } from './transaction-reconciliation.service';

@Injectable()
export class TransactionReconciliationProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TransactionReconciliationProcessor.name);
  private worker: Worker | null = null;

  constructor(
    private readonly bullmqRedisService: BullmqRedisService,
    private readonly reconciliationService: TransactionReconciliationService,
  ) {}

  onModuleInit(): void {
    if (!this.bullmqRedisService.isQueueEnabled()) {
      this.logger.log('Transaction reconciliation worker disabled');
      return;
    }

    this.worker = new Worker(
      TRANSACTION_RECONCILIATION_QUEUE,
      async (job: Job) => this.processJob(job),
      {
        connection: this.bullmqRedisService.getConnectionOptions(),
        concurrency: 1,
        settings: {
          backoffStrategy: (attemptsMade) => Math.min(attemptsMade * 2000, 30_000),
        },
      },
    );

    this.worker.on('failed', (job, error) => {
      this.logger.error(
        `Transaction reconciliation job ${job?.id ?? 'unknown'} failed`,
        error.stack,
      );
    });

    this.logger.log('Transaction reconciliation worker started');
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
    }
  }

  private async processJob(job: Job): Promise<void> {
    if (job.name !== TRANSACTION_RECONCILIATION_JOB) {
      this.logger.warn(`Ignoring unknown reconciliation job: ${job.name}`);
      return;
    }

    await this.reconciliationService.reconcilePendingTransactions(job.id ?? 'unknown');
  }
}
