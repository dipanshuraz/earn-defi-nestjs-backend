import { registerAs } from '@nestjs/config';
import { WalletConfig } from './config.types';

export default registerAs(
  'wallet',
  (): WalletConfig => ({
    provider: (process.env.WALLET_PROVIDER ?? 'privy') as WalletConfig['provider'],
  }),
);
