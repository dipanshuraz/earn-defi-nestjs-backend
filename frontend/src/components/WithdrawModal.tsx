import { useState } from 'react';
import { api } from '../api/client';
import type { Position, Wallet } from '../api/types';
import { formatAmount } from '../utils/format';
import { newIdempotencyKey } from '../utils/idempotency';
import { Spinner } from './Spinner';

interface WithdrawModalProps {
  position: Position;
  wallet: Wallet;
  onClose: () => void;
  onComplete: () => void;
}

export function WithdrawModal({
  position,
  wallet,
  onClose,
  onComplete,
}: WithdrawModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [explorerUrl, setExplorerUrl] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleFullWithdraw() {
    setError(null);
    setLoading(true);

    try {
      const res = await api.withdraw(
        position.positionId,
        wallet.walletId,
        { fullWithdraw: true },
        newIdempotencyKey(),
      );
      if (res.explorerUrl) setExplorerUrl(res.explorerUrl);
      setDone(true);
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Withdraw failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-withdraw" onClick={(e) => e.stopPropagation()}>
        <div className="modal-withdraw-header">
          <h2>Withdraw</h2>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-withdraw-body">
          {!done ? (
            <>
              <p className="modal-withdraw-desc">
                Withdraw all from <strong>{position.vaultName}</strong>
              </p>

              <div className="modal-withdraw-amount">
                <p className="stat-value">
                  {formatAmount(position.currentValue, position.assetDecimals, 6)}
                </p>
                <span className="stat-label">{position.assetSymbol}</span>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleFullWithdraw}
                disabled={loading}
              >
                {loading && <Spinner />}
                {loading ? 'Withdrawing…' : 'Withdraw all'}
              </button>

              {error && <p className="error">{error}</p>}
            </>
          ) : (
            <div className="success-panel">
              <p>Withdrawal submitted.</p>
              {explorerUrl && (
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link"
                >
                  View on explorer
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
