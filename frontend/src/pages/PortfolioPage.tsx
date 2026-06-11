import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Position, Wallet } from '../api/types';
import { PositionCard } from '../components/PositionCard';
import { WithdrawModal } from '../components/WithdrawModal';
import { formatAmount } from '../utils/format';

export function PortfolioPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [withdrawTarget, setWithdrawTarget] = useState<Position | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [posList, wallets] = await Promise.all([
        api.getPositions(),
        api.getWallets(),
      ]);
      setPositions(posList);
      setWallet(wallets[0] ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load positions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const active = positions.filter((p) => p.status !== 'CLOSED');
  const totalValue = active.reduce(
    (sum, p) => sum + BigInt(p.currentValue),
    0n,
  );
  const decimals = active[0]?.assetDecimals ?? 6;
  const symbol = active[0]?.assetSymbol ?? 'USDC';

  if (loading) return <p className="muted">Loading…</p>;

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

      {error && <p className="error">{error}</p>}

      {active.length === 0 ? (
        <p className="muted">No positions yet.</p>
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

      {withdrawTarget && wallet && (
        <WithdrawModal
          position={withdrawTarget}
          wallet={wallet}
          onClose={() => setWithdrawTarget(null)}
          onComplete={() => {
            setWithdrawTarget(null);
            load();
          }}
        />
      )}
    </div>
  );
}
