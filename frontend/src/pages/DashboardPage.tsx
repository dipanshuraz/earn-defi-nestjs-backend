import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { EarnVault, Position } from '../api/types';
import { VaultCard } from '../components/VaultCard';
import { ErrorBanner } from '../components/ErrorBanner';
import { PageSkeleton } from '../components/Skeleton';
import { useAsync } from '../hooks/useAsync';
import { useWallets } from '../context/WalletContext';
import { formatAmount, truncateAddress } from '../utils/format';

export function DashboardPage() {
  const { primaryWallet, loading: walletsLoading } = useWallets();
  const { data, loading, error, refresh } = useAsync(async () => {
    const [vaultList, posList] = await Promise.all([
      api.getVaults(),
      api.getPositions(),
    ]);
    return {
      vaults: vaultList.filter((v) => v.isEnabled).slice(0, 3) as EarnVault[],
      positions: posList.filter((p) => p.status === 'ACTIVE') as Position[],
    };
  });

  const positions = data?.positions ?? [];
  const vaults = data?.vaults ?? [];
  const totalValue = positions.reduce(
    (sum, p) => sum + BigInt(p.currentValue),
    0n,
  );
  const decimals = positions[0]?.assetDecimals ?? 6;
  const symbol = positions[0]?.assetSymbol ?? 'USDC';
  const pageLoading = loading || walletsLoading;

  return (
    <div className="page">
      <header className="page-header">
        <h1>Dashboard</h1>
        <p className="muted">Overview of your wallet, positions, and vaults.</p>
      </header>

      {error && <ErrorBanner message={error} onRetry={refresh} />}

      <section className="section">
        <div className="section-header">
          <h2>Wallet</h2>
          <Link to="/wallets" className="link">
            Manage
          </Link>
        </div>

        {!pageLoading && !primaryWallet ? (
          <div className="card empty-card">
            <p>No wallet yet.</p>
            <Link to="/wallets" className="btn btn-primary">
              Create wallet
            </Link>
          </div>
        ) : pageLoading ? (
          <div className="card wallet-summary skeleton-card">
            <div className="skeleton" style={{ height: 14, width: '40%' }} />
            <div className="skeleton" style={{ height: 20, width: '60%', marginTop: 8 }} />
          </div>
        ) : (
          primaryWallet && (
            <Link to="/wallets" className="card wallet-summary vault-link">
              <span className="stat-label">Primary wallet</span>
              <span className="wallet-address-sm">
                {truncateAddress(primaryWallet.walletAddress)}
              </span>
              <div className="wallet-balances-inline">
                {primaryWallet.balances?.map((b) => (
                  <span key={b.symbol} className="muted">
                    {formatAmount(b.balance, b.decimals, 2)} {b.symbol}
                  </span>
                ))}
              </div>
            </Link>
          )
        )}
      </section>

      <section className="section">
        <div className="section-header">
          <h2>Portfolio</h2>
          <Link to="/portfolio" className="link">
            View all
          </Link>
        </div>

        {pageLoading ? (
          <div className="card skeleton-card">
            <div className="skeleton" style={{ height: 12, width: 80 }} />
            <div className="skeleton" style={{ height: 28, width: 140, marginTop: 8 }} />
          </div>
        ) : positions.length === 0 ? (
          <p className="muted">No active positions.</p>
        ) : (
          <div className="summary-card card">
            <span className="stat-label">Total value</span>
            <span className="stat-value stat-large">
              {formatAmount(totalValue.toString(), decimals, 4)} {symbol}
            </span>
            <span className="muted">{positions.length} position(s)</span>
          </div>
        )}
      </section>

      <section className="section">
        <div className="section-header">
          <h2>Vaults</h2>
          <Link to="/vaults" className="link">
            View all
          </Link>
        </div>

        {pageLoading ? (
          <PageSkeleton count={2} />
        ) : (
          <div className="vault-grid">
            {vaults.map((v) => (
              <Link key={v.vaultId} to={`/vaults/${v.vaultId}`} className="vault-link">
                <VaultCard vault={v} />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
