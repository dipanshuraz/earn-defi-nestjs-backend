import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { Position } from '../api/types';
import { PositionCard } from '../components/PositionCard';
import { WithdrawModal } from '../components/WithdrawModal';
import { ErrorBanner } from '../components/ErrorBanner';
import { PageSkeleton } from '../components/Skeleton';
import { useWallets } from '../context/WalletContext';
import { useAsync } from '../hooks/useAsync';
import { formatAmount } from '../utils/format';

export function PortfolioPage() {
  const { primaryWallet } = useWallets();
  const [withdrawTarget, setWithdrawTarget] = useState<Position | null>(null);

  const { data, loading, error, refresh } = useAsync(() => api.getPositions());

  const positions = data ?? [];
  const active = positions.filter((p) => p.status !== 'CLOSED');
  const totalValue = active.reduce(
    (sum, p) => sum + BigInt(p.currentValue),
    0n,
  );
  const decimals = active[0]?.assetDecimals ?? 6;
  const symbol = active[0]?.assetSymbol ?? 'USDC';

  if (loading) {
    return (
      <div className="page">
        <header className="page-header">
          <h1>Portfolio</h1>
        </header>
        <PageSkeleton count={2} />
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Portfolio</h1>
        {active.length > 0 && (
          <p className="stat-value stat-large">
            {formatAmount(totalValue.toString(), decimals, 4)} {symbol}
          </p>
        )}
      </header>

      {error && <ErrorBanner message={error} onRetry={refresh} />}

      {active.length === 0 ? (
        <div className="card empty-card">
          <p className="muted">No positions yet.</p>
          <Link to="/vaults" className="btn btn-primary">
            Browse vaults
          </Link>
        </div>
      ) : (
        <div className="position-grid">
          {active.map((p) => (
            <PositionCard
              key={p.positionId}
              position={p}
              onWithdraw={setWithdrawTarget}
            />
          ))}
        </div>
      )}

      {withdrawTarget && primaryWallet && (
        <WithdrawModal
          position={withdrawTarget}
          wallet={primaryWallet}
          onClose={() => setWithdrawTarget(null)}
          onComplete={() => {
            setWithdrawTarget(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}
