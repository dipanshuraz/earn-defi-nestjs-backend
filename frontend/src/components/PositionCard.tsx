import type { Position } from '../api/types';
import { formatAmount } from '../utils/format';

interface PositionCardProps {
  position: Position;
  onWithdraw: (position: Position) => void;
}

export function PositionCard({ position, onWithdraw }: PositionCardProps) {
  const canWithdraw =
    position.status === 'ACTIVE' && BigInt(position.currentValue) > 0n;

  return (
    <div className="card position-card">
      <div className="position-card-top">
        <div>
          <h3>{position.vaultName}</h3>
          <p className="muted">{position.assetSymbol}</p>
        </div>
        <span className={`status status-${position.status.toLowerCase()}`}>
          {position.status}
        </span>
      </div>

      <div className="position-value">
        <span className="stat-label">Current value</span>
        <span className="stat-value">
          {formatAmount(position.currentValue, position.assetDecimals, 6)}{' '}
          {position.assetSymbol}
        </span>
      </div>

      <div className="position-meta muted">
        Deposited {formatAmount(position.depositedAmount, position.assetDecimals, 4)}{' '}
        · Share price {position.sharePrice}
      </div>

      {canWithdraw && (
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => onWithdraw(position)}
        >
          Withdraw
        </button>
      )}
    </div>
  );
}
