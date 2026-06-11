export const WALLET_PROVIDER = Symbol('WALLET_PROVIDER');

export interface CreateWalletInput {
  userId: string;
  chainId: number;
  privyUserId?: string | null;
}

export interface ProviderWallet {
  providerWalletId: string;
  address: string;
  chainId: number;
}

export interface WalletBalance {
  address: string;
  chainId: number;
  balance: string;
  symbol: string;
  decimals: number;
}

export interface SignTransactionInput {
  providerWalletId: string;
  chainId: number;
  to: string;
  value: string;
  data?: string;
}

export interface SignedTransaction {
  hash: string;
  /** RLP-encoded signed transaction prepared by the wallet provider. */
  signature: string;
  encoding?: 'rlp';
}

export interface SendTransactionInput {
  providerWalletId: string;
  chainId: number;
  to: string;
  value?: string;
  data?: string;
}

export interface BroadcastTransaction {
  hash: string;
  transactionId?: string;
}

export interface WalletProvider {
  readonly providerType: 'privy';

  ensurePrivyUserId(userId: string): Promise<string>;

  createWallet(input: CreateWalletInput): Promise<ProviderWallet>;

  getWallet(providerWalletId: string): Promise<ProviderWallet>;

  getBalance(providerWalletId: string, chainId: number): Promise<WalletBalance>;

  getBalances(providerWalletId: string, chainId: number): Promise<WalletBalance[]>;

  ensureWalletServerSigner(providerWalletId: string): Promise<void>;

  signTransaction(input: SignTransactionInput): Promise<SignedTransaction>;

  sendTransaction(input: SendTransactionInput): Promise<BroadcastTransaction>;
}
