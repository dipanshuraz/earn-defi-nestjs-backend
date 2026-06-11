import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import type { EarnVault, Wallet } from '../api/types';
import { DepositFlow } from '../components/DepositFlow';
import { VaultCard } from '../components/VaultCard';
import { formatApy, formatTvl } from '../utils/format';

export function VaultsPage() {
  const { vaultId } = useParams();
  const navigate = useNavigate();
  const [vaults, setVaults] = useState<EarnVault[]>([]);
  const [selected, setSelected] = useState<EarnVault | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [vaultList, wallets] = await Promise.all([
          api.getVaults(),
          api.getWallets(),
        ]);
        const enabled = vaultList.filter((v) => v.isEnabled);
        setVaults(enabled);
        setWallet(wallets[0] ?? null);

        if (vaultId) {
          const match = enabled.find((v) => v.vaultId === vaultId);
          if (match) setSelected(match);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load vaults');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [vaultId]);

  if (loading) return <p className="muted">Loading…</p>;

  if (selected) {
    return (
      <div className="page">
        <Link to="/vaults" className="back-btn link">
          ← Vaults
        </Link>

        <header className="page-header">
          <h1>{selected.name}</h1>
          <p className="muted">
            {selected.assetSymbol} · {formatApy(selected.apy)} APY · TVL{' '}
            {formatTvl(selected.tvl, selected.assetDecimals)} {selected.assetSymbol}
          </p>
        </header>

        {!wallet ? (
          <p className="muted">Create a wallet from the dashboard first.</p>
        ) : (
          <div className="card">
            <h2>Deposit</h2>
            <DepositFlow
              vault={selected}
              wallet={wallet}
              onComplete={() => navigate('/vaults')}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Vaults</h1>
        <p className="muted">Supply assets to Aave V3 and earn yield.</p>
      </header>

      {error && <p className="error">{error}</p>}

      <div className="vault-grid">
        {vaults.map((v) => (
          <Link key={v.vaultId} to={`/vaults/${v.vaultId}`} className="vault-link">
            <VaultCard vault={v} />
          </Link>
        ))}
      </div>
    </div>
  );
}
