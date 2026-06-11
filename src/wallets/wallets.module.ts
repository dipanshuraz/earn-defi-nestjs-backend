import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { WalletsController } from './wallets.controller';
import { WalletsService } from './wallets.service';
import { PrivyWalletService } from './providers/privy/privy-wallet.service';
import {
  WalletProviderFactory,
  walletProviderFactory,
} from './providers/wallet-provider.factory';
import { WALLET_PROVIDER } from './providers/wallet-provider.interface';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [WalletsController],
  providers: [
    WalletsService,
    PrivyWalletService,
    WalletProviderFactory,
    walletProviderFactory,
  ],
  exports: [WalletsService, WALLET_PROVIDER, PrivyWalletService],
})
export class WalletsModule {}
