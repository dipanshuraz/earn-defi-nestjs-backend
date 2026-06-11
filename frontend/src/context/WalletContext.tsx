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
import { useAuth } from './AuthContext';

interface WalletContextValue {
  wallets: Wallet[];
  primaryWallet: Wallet | null;
  chains: Chain[];
  environment: EnvironmentInfo | null;
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
    setError(null);
    try {
      const [walletList, chainList, env] = await Promise.all([
        api.getWallets(),
        api.getChains(),
        api.getEnvironment(),
      ]);
      setWallets(walletList);
      setChains(chainList);
      setEnvironment(env);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load wallets');
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

  const createWallet = useCallback(async () => {
    const chainId = environment?.chainId ?? 84532;
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
  }, [environment?.chainId, wallets.length]);

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
