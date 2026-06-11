export interface UserProfile {
  id: string;
  email: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  accessToken: string;
  user: UserProfile;
}

export interface WalletBalance {
  address: string;
  chainId: number;
  balance: string;
  symbol: string;
  decimals: number;
}

export interface Wallet {
  walletId: string;
  privyWalletId: string;
  walletAddress: string;
  chainId: number;
  walletType: string;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
  balance?: WalletBalance;
  balances?: WalletBalance[];
}

export interface EarnVault {
  vaultId: string;
  protocol: string;
  chainId: number;
  contractAddress: string;
  name: string;
  symbol: string;
  assetSymbol: string;
  assetDecimals: number;
  assetAddress: string;
  apy: string;
  tvl: string;
  sharePrice: string;
  totalSupply: string;
  metadata: { description?: string; image?: string; curator?: string };
  isEnabled: boolean;
  depositEnabled: boolean;
  withdrawEnabled: boolean;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface DepositPreview {
  vaultId: string;
  chainId: number;
  walletId: string;
  amount: string;
  walletBalance: string;
  allowance: string;
  requiresApproval: boolean;
  estimatedGas: string;
  estimatedShares: string;
}

export interface Position {
  positionId: string;
  vaultId: string;
  vaultName: string;
  chainId: number;
  assetSymbol: string;
  assetDecimals: number;
  status: string;
  depositedAmount: string;
  currentAmount: string;
  shares: string;
  sharePrice: string;
  currentValue: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  transactionId: string;
  type: string;
  status: string;
  amount: string;
  chainId: number;
  walletId?: string;
  vaultId?: string;
  positionId?: string;
  txHash?: string;
  blockNumber?: string;
  explorerUrl?: string;
  confirmedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionsList {
  items: Transaction[];
  page: number;
  limit: number;
  total: number;
}

export interface EnvironmentInfo {
  environment: string;
  chain: string;
  chainId: number;
  mainnetEnabled: boolean;
  allowMainnetTransactions: boolean;
}

export interface MutationResponse {
  status: string;
  transactionId?: string;
  txHash?: string;
  explorerUrl?: string;
  positionId?: string;
  positionStatus?: string;
}

export interface ApiError {
  message: string;
  code?: string;
  requestId?: string;
}
