export enum AppEnvironment {
  Local = 'local',
  Develop = 'develop',
  Production = 'production',
}

export interface AppConfig {
  nodeEnv: string;
  appEnv: AppEnvironment;
  port: number;
  apiPrefix: string;
  logLevel: string;
  corsOrigins: string[];
}

export interface SecurityConfig {
  rateLimitTtlMs: number;
  rateLimitMax: number;
  maxDepositsPerMinute: number;
  maxWithdrawalsPerMinute: number;
  dependencyCheckTimeoutMs: number;
}

export interface DatabaseConfig {
  url: string;
}

export interface BlockchainConfig {
  chain: string;
  chainId: number;
  mainnetEnabled: boolean;
  allowMainnetTransactions: boolean;
  rpcUrl: string;
  alchemyApiKey: string;
}

export interface RedisConfig {
  restUrl: string;
  restToken: string;
  url: string;
  queueEnabled: boolean;
}

export interface PrivyConfig {
  appId: string;
  appSecret: string;
  jwksUrl: string;
  /** Base64 PKCS8 P-256 private key for server-side wallet transaction signing. */
  authorizationPrivateKey?: string;
  /** Key quorum ID registered in Privy Dashboard, added as wallet additional signer. */
  walletSignerKeyQuorumId?: string;
}

export interface JwtConfig {
  secret: string;
  expiresIn: string;
}

export type WalletProviderName = 'privy';

export interface WalletConfig {
  provider: WalletProviderName;
}

export interface ChainNativeCurrency {
  name: string;
  symbol: string;
  decimals: number;
}

export interface ChainDefinition {
  slug: string;
  name: string;
  chainId: number;
  isTestnet: boolean;
  isEnabled: boolean;
  rpcUrl: string;
  explorerUrl: string;
  nativeCurrency: ChainNativeCurrency;
}

export interface ChainsConfig {
  chains: ChainDefinition[];
}

export interface AssetDefinition {
  symbol: string;
  name: string;
  chainId: number;
  contractAddress: string;
  decimals: number;
  isEnabled: boolean;
}

export interface AssetsConfig {
  assets: AssetDefinition[];
}

export interface AaveVaultDefinition {
  vaultId: string;
  chainId: number;
  poolAddress: string;
  aTokenAddress: string;
  assetSymbol: string;
  assetAddress: string;
  isEnabled: boolean;
  riskLevel?: 'low' | 'medium' | 'high';
  depositEnabled?: boolean;
  withdrawEnabled?: boolean;
}

export interface AaveConfig {
  apiUrl: string;
  vaults: AaveVaultDefinition[];
}

export interface ProtocolsConfig {
  provider: 'aave';
  aave: AaveConfig;
}

export interface IdempotencyConfig {
  ttlHours: number;
  headerName: string;
}

export interface AllConfig {
  app: AppConfig;
  security: SecurityConfig;
  database: DatabaseConfig;
  blockchain: BlockchainConfig;
  redis: RedisConfig;
  privy: PrivyConfig;
  jwt: JwtConfig;
  wallet: WalletConfig;
  chains: ChainsConfig;
  assets: AssetsConfig;
  protocols: ProtocolsConfig;
  idempotency: IdempotencyConfig;
}
