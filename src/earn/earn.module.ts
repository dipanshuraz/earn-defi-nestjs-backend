import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ProtocolsModule } from '../protocols/protocols.module';
import { WalletsModule } from '../wallets/wallets.module';
import { EarnController } from './controllers/earn.controller';
import { EarnPositionsController } from './controllers/earn-positions.controller';
import { EarnTransactionsController } from './controllers/earn-transactions.controller';
import { EarnPersistenceModule } from './persistence/earn-persistence.module';
import { EarnVaultRepository } from './repositories/earn-vault.repository';
import { EarnApprovalService } from './services/earn-approval.service';
import { EarnBlockchainService } from './services/earn-blockchain.service';
import { EarnDepositService } from './services/earn-deposit.service';
import { EarnMutationRateLimitService } from './services/earn-mutation-rate-limit.service';
import { EarnPositionsService } from './services/earn-positions.service';
import { EarnService } from './services/earn.service';
import { EarnTransactionValidationService } from './services/earn-transaction-validation.service';
import { EarnTransactionsService } from './services/earn-transactions.service';
import { EarnWithdrawService } from './services/earn-withdraw.service';
import { ExplorerUrlService } from './services/explorer-url.service';

@Module({
  imports: [
    AuthModule,
    ProtocolsModule,
    WalletsModule,
    EarnPersistenceModule,
    PrismaModule,
  ],
  controllers: [EarnController, EarnPositionsController, EarnTransactionsController],
  providers: [
    EarnService,
    EarnApprovalService,
    EarnDepositService,
    EarnWithdrawService,
    EarnPositionsService,
    EarnTransactionsService,
    EarnTransactionValidationService,
    EarnBlockchainService,
    EarnVaultRepository,
    EarnMutationRateLimitService,
    ExplorerUrlService,
  ],
  exports: [
    EarnService,
    EarnApprovalService,
    EarnDepositService,
    EarnWithdrawService,
    EarnBlockchainService,
    EarnTransactionValidationService,
    ExplorerUrlService,
    EarnPersistenceModule,
  ],
})
export class EarnModule {}
