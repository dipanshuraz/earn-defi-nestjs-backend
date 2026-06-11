import { Module } from '@nestjs/common';
import { PositionsModule } from './positions/positions.module';
import { TransactionsModule } from './transactions/transactions.module';

@Module({
  imports: [PositionsModule, TransactionsModule],
  exports: [PositionsModule, TransactionsModule],
})
export class EarnPersistenceModule {}
