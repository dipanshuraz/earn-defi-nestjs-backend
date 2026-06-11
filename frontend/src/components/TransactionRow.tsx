import type { Transaction } from '../api/types';
import { formatAmount, formatDate } from '../utils/format';

interface TransactionRowProps {
  transaction: Transaction;
  assetDecimals?: number;
  assetSymbol?: string;
}

export function TransactionRow({
  transaction,
  assetDecimals = 6,
  assetSymbol = 'USDC',
}: TransactionRowProps) {
  return (
    <div className="tx-row">
      <div className="tx-row-main">
        <span className={`tx-type tx-type-${transaction.type.toLowerCase()}`}>
          {transaction.type}
        </span>
        <span className="tx-amount">
          {formatAmount(transaction.amount, assetDecimals, 4)} {assetSymbol}
        </span>
      </div>

      <div className="tx-row-meta">
        <span className={`status status-${transaction.status.toLowerCase()}`}>
          {transaction.status}
        </span>
        <span className="muted">{formatDate(transaction.createdAt)}</span>
        {transaction.explorerUrl && (
          <a
            href={transaction.explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="link"
          >
            Explorer
          </a>
        )}
      </div>
    </div>
  );
}
