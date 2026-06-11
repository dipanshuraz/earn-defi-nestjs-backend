import { registerAs } from '@nestjs/config';
import { BlockchainConfig } from './config.types';

export default registerAs(
  'blockchain',
  (): BlockchainConfig => ({
    chain: process.env.CHAIN ?? 'base-sepolia',
    chainId: parseInt(process.env.CHAIN_ID ?? '84532', 10),
    mainnetEnabled: process.env.MAINNET_ENABLED === 'true',
    allowMainnetTransactions: process.env.ALLOW_MAINNET_TRANSACTIONS === 'true',
    rpcUrl: process.env.RPC_URL ?? 'https://sepolia.base.org',
    alchemyApiKey: process.env.ALCHEMY_API_KEY ?? '',
  }),
);
