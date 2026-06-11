import { api } from '../api/client';
import { TransactionRow } from '../components/TransactionRow';
import { ErrorBanner } from '../components/ErrorBanner';
import { Skeleton } from '../components/Skeleton';
import { useAsync } from '../hooks/useAsync';

export function ActivityPage() {
  const { data, loading, error, refresh } = useAsync(() =>
    api.getTransactions(1, 50).then((res) => res.items),
  );

  const transactions = data ?? [];

  return (
    <div className="page">
      <header className="page-header">
        <h1>Activity</h1>
        <p className="muted">Your on-chain transactions.</p>
      </header>

      {error && <ErrorBanner message={error} onRetry={refresh} />}

      {loading ? (
        <div className="tx-list">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="tx-row skeleton-card">
              <Skeleton height={14} width="30%" />
              <Skeleton height={12} width="50%" />
            </div>
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <p className="muted">No transactions yet.</p>
      ) : (
        <div className="tx-list">
          {transactions.map((tx) => (
            <TransactionRow key={tx.transactionId} transaction={tx} />
          ))}
        </div>
      )}
    </div>
  );
}
