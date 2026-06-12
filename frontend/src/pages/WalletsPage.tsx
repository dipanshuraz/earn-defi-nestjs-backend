import { WalletCard } from '../components/WalletCard';
import { ErrorBanner } from '../components/ErrorBanner';
import { Spinner } from '../components/Spinner';
import { WalletSkeleton } from '../components/Skeleton';
import { useWallets } from '../context/WalletContext';

export function WalletsPage() {
  const {
    wallets,
    createChainName,
    createChainId,
    environment,
    loading,
    error,
    creating,
    pendingWalletId,
    refresh,
    createWallet,
  } = useWallets();

  const isTestnet = environment ? !environment.allowMainnetTransactions : true;

  async function handleCreate() {
    try {
      await createWallet();
    } catch {
      // error shown via context
    }
  }

  return (
    <div className="page">
      <header className="page-header page-header-row">
        <div>
          <h1>Wallets</h1>
          <p className="muted">
            Privy embedded wallets · new wallets created on{' '}
            <strong>{createChainName}</strong> (chain {createChainId})
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleCreate}
          disabled={creating}
        >
          {creating ? <Spinner /> : null}
          {creating ? 'Creating…' : 'Create wallet'}
        </button>
      </header>

      {creating && (
        <p className="info-banner">
          Creating wallet via Privy — this can take up to 60 seconds. Please wait…
        </p>
      )}

      {error && <ErrorBanner message={error} onRetry={() => refresh()} />}

      {loading ? (
        <div className="wallet-list">
          <WalletSkeleton />
        </div>
      ) : wallets.length === 0 ? (
        <div className="card empty-card">
          <p>No wallets yet. Create one to deposit and earn yield.</p>
          {!isTestnet && (
            <p className="muted">
              Mainnet mode — fund with real ETH (gas) and USDC after creating.
            </p>
          )}
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleCreate}
            disabled={creating}
          >
            {creating ? <Spinner /> : null}
            {creating ? 'Creating…' : `Create wallet on ${createChainName}`}
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
