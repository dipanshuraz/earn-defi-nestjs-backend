import { Module } from '@nestjs/common';
import { EarnModule } from '../earn/earn.module';
import { EarnPersistenceModule } from '../earn/persistence/earn-persistence.module';
import { RedisModule } from '../redis/redis.module';
import { ReconciliationLockService } from './reconciliation-lock.service';
import { TransactionReconciliationProcessor } from './transaction-reconciliation.processor';
import { TransactionReconciliationScheduler } from './transaction-reconciliation.scheduler';
import { TransactionReconciliationService } from './transaction-reconciliation.service';

@Module({
  imports: [EarnPersistenceModule, EarnModule, RedisModule],
  providers: [
    TransactionReconciliationService,
    ReconciliationLockService,
    TransactionReconciliationProcessor,
    TransactionReconciliationScheduler,
  ],
  exports: [TransactionReconciliationService],
})
export class ReconciliationModule {}
