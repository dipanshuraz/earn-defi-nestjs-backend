import { useState } from 'react';
import { api } from '../api/client';
import type { EarnVault, Wallet } from '../api/types';
import { formatAmount, parseAmount } from '../utils/format';
import { newIdempotencyKey } from '../utils/idempotency';
import { Spinner } from './Spinner';

interface DepositFlowProps {
  vault: EarnVault;
  wallet: Wallet;
  onComplete: () => void;
}

type Step = 'amount' | 'approve' | 'deposit' | 'done';

const STEPS: Step[] = ['amount', 'approve', 'deposit', 'done'];

export function DepositFlow({ vault, wallet, onComplete }: DepositFlowProps) {
  const [amountInput, setAmountInput] = useState('');
  const [step, setStep] = useState<Step>('amount');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [explorerUrl, setExplorerUrl] = useState<string | null>(null);
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [baseAmount, setBaseAmount] = useState('');

  const usdcBalance = wallet.balances?.find((b) => b.symbol === 'USDC');
  const stepIndex = STEPS.indexOf(step);

  async function handlePreview(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const amount = parseAmount(amountInput, vault.assetDecimals);
      const preview = await api.previewDeposit(vault.vaultId, wallet.walletId, amount);
      setBaseAmount(amount);
      setRequiresApproval(preview.requiresApproval);
      setStep(preview.requiresApproval ? 'approve' : 'deposit');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Preview failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    setError(null);
    setLoading(true);

    try {
      const res = await api.approve(
        vault.vaultId,
        wallet.walletId,
        baseAmount,
        newIdempotencyKey(),
      );
      if (res.explorerUrl) setExplorerUrl(res.explorerUrl);
      setStep('deposit');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approval failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeposit() {
    setError(null);
    setLoading(true);

    try {
      const res = await api.deposit(
        vault.vaultId,
        wallet.walletId,
        baseAmount,
        newIdempotencyKey(),
      );
      if (res.explorerUrl) setExplorerUrl(res.explorerUrl);
      setStep('done');
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deposit failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="deposit-flow">
      <div className="step-indicator">
        {['Amount', requiresApproval ? 'Approve' : null, 'Deposit', 'Done']
          .filter(Boolean)
          .map((label, i) => (
            <span
              key={label as string}
              className={`step-dot ${i <= stepIndex ? 'step-dot-active' : ''}`}
            >
              {label}
            </span>
          ))}
      </div>

      {step === 'amount' && (
        <form onSubmit={handlePreview} className="form">
          <label className="label">
            Amount ({vault.assetSymbol})
            <input
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              className="input"
              autoFocus
            />
          </label>

          {usdcBalance && (
            <p className="muted">
              Balance:{' '}
              {formatAmount(usdcBalance.balance, usdcBalance.decimals, 4)}{' '}
              {usdcBalance.symbol}
            </p>
          )}

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading && <Spinner />}
            {loading ? 'Checking…' : 'Continue'}
          </button>
        </form>
      )}

      {step === 'approve' && (
        <div className="step-panel">
          <p>Approve {vault.assetSymbol} spending for this vault.</p>
          <p className="muted">
            {formatAmount(baseAmount, vault.assetDecimals, 4)} {vault.assetSymbol}
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleApprove}
            disabled={loading}
          >
            {loading && <Spinner />}
            {loading ? 'Approving…' : 'Approve'}
          </button>
        </div>
      )}

      {step === 'deposit' && (
        <div className="step-panel">
          <p>
            {requiresApproval
              ? 'Approval complete. Confirm deposit.'
              : 'Confirm your deposit.'}
          </p>
          <p className="muted">
            {formatAmount(baseAmount, vault.assetDecimals, 4)} {vault.assetSymbol}
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleDeposit}
            disabled={loading}
          >
            {loading && <Spinner />}
            {loading ? 'Depositing…' : 'Deposit'}
          </button>
        </div>
      )}

      {step === 'done' && (
        <div className="step-panel success-panel">
          <p>Deposit submitted successfully.</p>
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

      {error && <p className="error">{error}</p>}
    </div>
  );
}
