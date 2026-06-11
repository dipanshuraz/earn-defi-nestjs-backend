import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WalletConfig } from '../../config/config.types';
import { PrivyWalletProvider } from './privy/privy-wallet.provider';
import { PrivyWalletService } from './privy/privy-wallet.service';
import { WALLET_PROVIDER, WalletProvider } from './wallet-provider.interface';

@Injectable()
export class WalletProviderFactory {
  constructor(
    private readonly configService: ConfigService,
    private readonly privyWalletService: PrivyWalletService,
  ) {}

  create(): WalletProvider {
    const walletConfig = this.configService.get<WalletConfig>('wallet');
    const provider = walletConfig?.provider ?? 'privy';

    if (provider !== 'privy') {
      throw new Error(
        `Unsupported wallet provider "${provider as string}". Only "privy" is supported.`,
      );
    }

    return new PrivyWalletProvider(this.privyWalletService);
  }
}

export const walletProviderFactory = {
  provide: WALLET_PROVIDER,
  inject: [WalletProviderFactory],
  useFactory: (factory: WalletProviderFactory): WalletProvider => factory.create(),
};
