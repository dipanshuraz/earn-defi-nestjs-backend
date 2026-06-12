import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api } from '../api/client';
import type { Chain, EnvironmentInfo, Wallet } from '../api/types';
import { chainLabel, resolveCreateChainId } from '../utils/chain';
import { useAuth } from './AuthContext';

interface WalletContextValue {
  wallets: Wallet[];
  primaryWallet: Wallet | null;
  chains: Chain[];
  environment: EnvironmentInfo | null;
  createChainId: number;
  createChainName: string;
  loading: boolean;
  error: string | null;
  creating: boolean;
  pendingWalletId: string | null;
  refresh: () => Promise<void>;
  createWallet: () => Promise<Wallet>;
  faucetUsdc: (walletId: string) => Promise<void>;
  verifySigning: (walletId: string) => Promise<void>;
  explorerUrl: (chainId: number, address: string) => string | null;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [chains, setChains] = useState<Chain[]>([]);
  const [environment, setEnvironment] = useState<EnvironmentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [pendingWalletId, setPendingWalletId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;

    const results = await Promise.allSettled([
      api.getWallets(),
      api.getChains(),
      api.getEnvironment(),
    ]);

    const failures: string[] = [];

    if (results[0].status === 'fulfilled') {
      setWallets(results[0].value);
    } else {
      failures.push('wallets');
    }

    if (results[1].status === 'fulfilled') {
      setChains(results[1].value);
    } else {
      failures.push('chains');
    }

    if (results[2].status === 'fulfilled') {
      setEnvironment(results[2].value);
    } else {
      failures.push('environment');
    }

    if (failures.length === 3) {
      const first = results[0];
      const reason = first.status === 'rejected' ? first.reason : null;
      setError(
        reason instanceof Error
          ? reason.message
          : 'Failed to load wallet data',
      );
    } else if (failures.length > 0) {
      setError(null);
    } else {
      setError(null);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setWallets([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [user, refresh]);

  const createChainId = resolveCreateChainId(chains, wallets, environment);
  const createChainName = chainLabel(chains, createChainId);

  const createWallet = useCallback(async () => {
    const chainId = resolveCreateChainId(chains, wallets, environment);
    setCreating(true);
    setError(null);

    const optimistic: Wallet = {
      walletId: `pending-${Date.now()}`,
      privyWalletId: '…',
      walletAddress: '0x0000000000000000000000000000000000000000',
      chainId,
      walletType: 'EMBEDDED',
      isPrimary: wallets.length === 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setWallets((prev) => [...prev, optimistic]);
    setPendingWalletId(optimistic.walletId);

    try {
      const wallet = await api.createWallet(chainId);
      setWallets((prev) =>
        prev.map((w) => (w.walletId === optimistic.walletId ? wallet : w)),
      );
      setPendingWalletId(null);
      return wallet;
    } catch (err) {
      setWallets((prev) => prev.filter((w) => w.walletId !== optimistic.walletId));
      setPendingWalletId(null);
      const msg = err instanceof Error ? err.message : 'Failed to create wallet';
      setError(msg);
      throw err;
    } finally {
      setCreating(false);
    }
  }, [chains, wallets, environment]);

  const faucetUsdc = useCallback(
    async (walletId: string) => {
      setError(null);
      await api.faucetUsdc(walletId);
      await refresh();
    },
    [refresh],
  );

  const verifySigning = useCallback(
    async (walletId: string) => {
      setError(null);
      await api.enableServerSigning(walletId);
      await refresh();
    },
    [refresh],
  );

  const explorerUrl = useCallback(
    (chainId: number, address: string) => {
      const chain = chains.find((c) => c.chainId === chainId);
      return chain ? `${chain.explorerUrl}/address/${address}` : null;
    },
    [chains],
  );

  const primaryWallet = wallets.find((w) => w.isPrimary) ?? wallets[0] ?? null;

  const value = useMemo(
    () => ({
      wallets,
      primaryWallet,
      chains,
      environment,
      createChainId,
      createChainName,
      loading,
      error,
      creating,
      pendingWalletId,
      refresh,
      createWallet,
      faucetUsdc,
      verifySigning,
      explorerUrl,
    }),
    [
      wallets,
      primaryWallet,
      chains,
      environment,
      createChainId,
      createChainName,
      loading,
      error,
      creating,
      pendingWalletId,
      refresh,
      createWallet,
      faucetUsdc,
      verifySigning,
      explorerUrl,
    ],
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWallets(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallets must be used within WalletProvider');
  return ctx;
}
