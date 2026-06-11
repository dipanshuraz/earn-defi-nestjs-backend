import { WalletCard } from '../components/WalletCard';
import { ErrorBanner } from '../components/ErrorBanner';
import { Spinner } from '../components/Spinner';
import { WalletSkeleton } from '../components/Skeleton';
import { useWallets } from '../context/WalletContext';

export function WalletsPage() {
  const {
    wallets,
    environment,
    loading,
    error,
    creating,
    pendingWalletId,
    refresh,
    createWallet,
  } = useWallets();

  const chainName =
    environment?.chain === 'base'
      ? 'Base'
      : environment?.chain === 'base-sepolia'
        ? 'Base Sepolia'
        : environment?.chain;

  return (
    <div className="page">
      <header className="page-header page-header-row">
        <div>
          <h1>Wallets</h1>
          <p className="muted">
            Privy embedded wallets on {chainName ?? 'configured chain'} (chain{' '}
            {environment?.chainId ?? '…'})
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => createWallet()}
          disabled={creating}
        >
          {creating ? <Spinner /> : null}
          {creating ? 'Creating…' : 'Create wallet'}
        </button>
      </header>

      {error && <ErrorBanner message={error} onRetry={() => refresh()} />}

      {loading ? (
        <div className="wallet-list">
          <WalletSkeleton />
          <WalletSkeleton />
        </div>
      ) : wallets.length === 0 ? (
        <div className="card empty-card">
          <p>No wallets yet. Create one to deposit and earn yield.</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => createWallet()}
            disabled={creating}
          >
            {creating ? <Spinner /> : null}
            {creating ? 'Creating…' : 'Create wallet'}
          </button>
        </div>
      ) : (
        <div className="wallet-list">
          {wallets.map((w) => (
            <WalletCard
              key={w.walletId}
              wallet={w}
              isPending={w.walletId === pendingWalletId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
