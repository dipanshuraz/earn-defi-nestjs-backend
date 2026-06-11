export type EarnProtocolName = 'aave';

export interface ProtocolVaultMetadata {
  description?: string;
  image?: string;
  curator?: string;
}

export interface ProtocolVault {
  vaultId: string;
  protocol: EarnProtocolName;
  chainId: number;
  contractAddress: string;
  shareTokenAddress: string;
  name: string;
  symbol: string;
  assetSymbol: string;
  assetDecimals: number;
  assetAddress: string;
  apy: string;
  tvl: string;
  sharePrice: string;
  totalSupply: string;
  metadata: ProtocolVaultMetadata;
  isEnabled: boolean;
  depositEnabled: boolean;
  withdrawEnabled: boolean;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface GetVaultsInput {
  chainId?: number;
  assetSymbol?: string;
  protocol?: EarnProtocolName;
}

export interface GetVaultInput {
  vaultId: string;
  chainId?: number;
}

export interface PreviewDepositInput {
  vaultId: string;
  chainId: number;
  assetAmount: string;
}

export interface PreviewWithdrawInput {
  vaultId: string;
  chainId: number;
  assetAmount: string;
}

export interface PreviewDepositResult {
  vaultId: string;
  chainId: number;
  assetAmount: string;
  shares: string;
  sharePrice: string;
}

export interface PreviewWithdrawResult {
  vaultId: string;
  chainId: number;
  assetAmount: string;
  shares: string;
  sharePrice: string;
}
