import type {
  ApiError,
  AuthResponse,
  Chain,
  DepositPreview,
  EarnVault,
  EnvironmentInfo,
  MutationResponse,
  Position,
  Transaction,
  TransactionsList,
  UserProfile,
  Wallet,
} from './types';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api/v1';

let accessToken: string | null = localStorage.getItem('accessToken');

export function setAccessToken(token: string | null): void {
  accessToken = token;
  if (token) {
    localStorage.setItem('accessToken', token);
  } else {
    localStorage.removeItem('accessToken');
  }
}

export function getAccessToken(): string | null {
  return accessToken;
}

async function request<T>(
  path: string,
  options: RequestInit & { idempotencyKey?: string } = {},
): Promise<T> {
  const { idempotencyKey, headers: customHeaders, ...rest } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  if (idempotencyKey) {
    headers['idempotency-key'] = idempotencyKey;
  }

  const response = await fetch(`${API_BASE}${path}`, { ...rest, headers });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiError;
    throw new Error(body.message ?? `Request failed (${response.status})`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  register(email: string, password: string) {
    return request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  login(email: string, password: string) {
    return request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  getMe() {
    return request<UserProfile>('/users/me');
  },

  getEnvironment() {
    return request<EnvironmentInfo>('/system/environment');
  },

  getWallets() {
    return request<Wallet[]>('/wallets');
  },

  getWallet(walletId: string) {
    return request<Wallet>(`/wallets/${walletId}`);
  },

  createWallet(chainId: number) {
    return request<Wallet>('/wallets', {
      method: 'POST',
      body: JSON.stringify({ chainId, isPrimary: true }),
    });
  },

  enableServerSigning(walletId: string) {
    return request<Wallet>(`/wallets/${walletId}/enable-server-signing`, {
      method: 'POST',
    });
  },

  getChains() {
    return request<Chain[]>('/chains');
  },

  faucetUsdc(walletId: string) {
    return request<MutationResponse>(`/wallets/${walletId}/faucet/aave-usdc`, {
      method: 'POST',
    });
  },

  getVaults(chainId?: number) {
    const query = chainId ? `?chainId=${chainId}` : '';
    return request<EarnVault[]>(`/earn/vaults${query}`);
  },

  getVault(vaultId: string) {
    return request<EarnVault>(`/earn/vaults/${vaultId}`);
  },

  previewDeposit(vaultId: string, walletId: string, amount: string) {
    return request<DepositPreview>(`/earn/vaults/${vaultId}/deposit/preview`, {
      method: 'POST',
      body: JSON.stringify({ walletId, amount }),
    });
  },

  approve(vaultId: string, walletId: string, amount: string, idempotencyKey: string) {
    return request<MutationResponse>(`/earn/vaults/${vaultId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ walletId, amount }),
      idempotencyKey,
    });
  },

  deposit(vaultId: string, walletId: string, amount: string, idempotencyKey: string) {
    return request<MutationResponse>(`/earn/vaults/${vaultId}/deposit`, {
      method: 'POST',
      body: JSON.stringify({ walletId, amount }),
      idempotencyKey,
    });
  },

  getPositions() {
    return request<Position[]>('/earn/positions');
  },

  withdraw(
    positionId: string,
    walletId: string,
    opts: { amount?: string; fullWithdraw?: boolean },
    idempotencyKey: string,
  ) {
    return request<MutationResponse>(`/earn/positions/${positionId}/withdraw`, {
      method: 'POST',
      body: JSON.stringify({ walletId, ...opts }),
      idempotencyKey,
    });
  },

  getTransactions(page = 1, limit = 20) {
    return request<TransactionsList>(
      `/earn/transactions?page=${page}&limit=${limit}`,
    );
  },

  getTransaction(transactionId: string) {
    return request<Transaction>(`/earn/transactions/${transactionId}`);
  },
};
