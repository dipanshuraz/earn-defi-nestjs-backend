import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Transaction } from '../api/types';
import { TransactionRow } from '../components/TransactionRow';

export function ActivityPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getTransactions(1, 50)
      .then((res) => setTransactions(res.items))
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Failed to load activity'),
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="muted">Loading…</p>;

  return (
    <div className="page">
      <header className="page-header">
        <h1>Activity</h1>
        <p className="muted">Your on-chain transactions.</p>
      </header>

      {error && <p className="error">{error}</p>}

      {transactions.length === 0 ? (
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
