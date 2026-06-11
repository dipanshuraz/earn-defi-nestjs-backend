import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { EarnVault, Position, Wallet } from '../api/types';
import { VaultCard } from '../components/VaultCard';
import { formatAmount, truncateAddress } from '../utils/format';

export function DashboardPage() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [vaults, setVaults] = useState<EarnVault[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [fauceting, setFauceting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [wallets, vaultList, posList] = await Promise.all([
        api.getWallets(),
        api.getVaults(),
        api.getPositions(),
      ]);
      setWallet(wallets[0] ?? null);
      setVaults(vaultList.filter((v) => v.isEnabled).slice(0, 3));
      setPositions(posList.filter((p) => p.status === 'ACTIVE'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreateWallet() {
    setCreating(true);
    setError(null);
    try {
      const env = await api.getEnvironment();
      const w = await api.createWallet(env.chainId);
      setWallet(w);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create wallet');
    } finally {
      setCreating(false);
    }
  }

  async function handleFaucet() {
    if (!wallet) return;
    setFauceting(true);
    setError(null);
    try {
      await api.faucetUsdc(wallet.walletId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Faucet failed');
    } finally {
      setFauceting(false);
    }
  }

  const totalValue = positions.reduce(
    (sum, p) => sum + BigInt(p.currentValue),
    0n,
  );
  const decimals = positions[0]?.assetDecimals ?? 6;
  const symbol = positions[0]?.assetSymbol ?? 'USDC';

  if (loading) {
    return <p className="muted">Loading…</p>;
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Dashboard</h1>
      </header>

      {error && <p className="error">{error}</p>}

      <section className="section">
        <h2>Wallet</h2>
        {!wallet ? (
          <div className="card empty-card">
            <p>No wallet yet. Create one to start earning.</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCreateWallet}
              disabled={creating}
            >
              {creating ? 'Creating…' : 'Create wallet'}
            </button>
          </div>
        ) : (
          <div className="card wallet-card">
            <p className="wallet-address">{truncateAddress(wallet.walletAddress)}</p>
            <div className="wallet-balances">
              {wallet.balances?.map((b) => (
                <div key={b.symbol}>
                  <span className="stat-label">{b.symbol}</span>
                  <span className="stat-value">
                    {formatAmount(b.balance, b.decimals, 4)}
                  </span>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleFaucet}
              disabled={fauceting}
            >
              {fauceting ? 'Minting…' : 'Get test USDC'}
            </button>
          </div>
        )}
      </section>

      <section className="section">
        <div className="section-header">
          <h2>Portfolio</h2>
          <Link to="/portfolio" className="link">
            View all
          </Link>
        </div>

        {positions.length === 0 ? (
          <p className="muted">No active positions. Deposit into a vault to start.</p>
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

        <div className="vault-grid">
          {vaults.map((v) => (
            <Link key={v.vaultId} to={`/vaults/${v.vaultId}`} className="vault-link">
              <VaultCard vault={v} />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
