import { registerAs } from '@nestjs/config';
import { PrivyConfig } from './config.types';

export default registerAs(
  'privy',
  (): PrivyConfig => ({
    appId: process.env.PRIVY_APP_ID ?? '',
    appSecret: process.env.PRIVY_APP_SECRET ?? '',
    jwksUrl: process.env.PRIVY_JWKS_URL ?? '',
    authorizationPrivateKey: process.env.PRIVY_AUTHORIZATION_PRIVATE_KEY,
    walletSignerKeyQuorumId: process.env.PRIVY_WALLET_SIGNER_KEY_QUORUM_ID,
  }),
);
