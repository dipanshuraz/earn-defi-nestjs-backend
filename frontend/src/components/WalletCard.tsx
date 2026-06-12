import { useState } from 'react';
import type { Wallet } from '../api/types';
import { useWallets } from '../context/WalletContext';
import { formatAmount } from '../utils/format';
import { Spinner } from './Spinner';

interface WalletCardProps {
  wallet: Wallet;
  isPending?: boolean;
}

export function WalletCard({ wallet, isPending }: WalletCardProps) {
  const { chains, environment, faucetUsdc, verifySigning, explorerUrl } =
    useWallets();
  const [fauceting, setFauceting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const chain = chains.find((c) => c.chainId === wallet.chainId);
  const isTestnet = environment ? !environment.allowMainnetTransactions : true;
  const explorer = explorerUrl(wallet.chainId, wallet.walletAddress);

  async function handleCopy() {
    await navigator.clipboard.writeText(wallet.walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleFaucet() {
    setFauceting(true);
    setActionError(null);
    try {
      await faucetUsdc(wallet.walletId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Faucet failed');
    } finally {
      setFauceting(false);
    }
  }

  async function handleVerify() {
    setVerifying(true);
    setActionError(null);
    try {
      await verifySigning(wallet.walletId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className={`card wallet-card ${isPending ? 'card-pending' : ''}`}>
      <div className="wallet-card-inner">
        <div className="wallet-card-accent">
          <div className="wallet-card-icon" aria-hidden>
            ◈
          </div>
          <div className="wallet-card-header">
            <span className="wallet-card-type">Embedded wallet</span>
            <div className="wallet-address-row">
              <code className="wallet-address">{wallet.walletAddress}</code>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handleCopy}
                disabled={isPending}
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
          {wallet.isPrimary && <span className="badge badge-low">Primary</span>}
        </div>

        <div className="wallet-chain-pill">
          {chain?.name ?? `Chain ${wallet.chainId}`}
          {isPending && ' · Creating…'}
        </div>

        <div className="wallet-balances">
          {wallet.balances?.map((b) => (
            <div key={b.symbol} className="balance-item">
              <span className="stat-label">{b.symbol}</span>
              <span className="stat-value">
                {isPending ? '—' : formatAmount(b.balance, b.decimals, 4)}
              </span>
            </div>
          )) ?? (
            <>
              <div className="balance-item">
                <span className="stat-label">ETH</span>
                <span className="stat-value muted">—</span>
              </div>
              <div className="balance-item">
                <span className="stat-label">USDC</span>
                <span className="stat-value muted">—</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="wallet-actions">
        {explorer && !isPending && (
          <a
            href={explorer}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm"
          >
            Explorer
          </a>
        )}
        {isTestnet && !isPending && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleFaucet}
            disabled={fauceting}
          >
            {fauceting ? <Spinner /> : null}
            {fauceting ? 'Minting…' : 'Get test USDC'}
          </button>
        )}
        {!isPending && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleVerify}
            disabled={verifying}
          >
            {verifying ? <Spinner /> : null}
            {verifying ? 'Verifying…' : 'Verify signing'}
          </button>
        )}
      </div>

      {actionError && <p className="error">{actionError}</p>}
    </div>
  );
}
