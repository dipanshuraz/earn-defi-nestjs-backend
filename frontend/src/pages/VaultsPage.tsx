import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import type { EarnVault } from '../api/types';
import { DepositFlow } from '../components/DepositFlow';
import { VaultCard } from '../components/VaultCard';
import { ErrorBanner } from '../components/ErrorBanner';
import { PageSkeleton } from '../components/Skeleton';
import { useWallets } from '../context/WalletContext';
import { useAsync } from '../hooks/useAsync';
import { formatApy, formatTvl } from '../utils/format';

export function VaultsPage() {
  const { vaultId } = useParams();
  const navigate = useNavigate();
  const { primaryWallet } = useWallets();

  const { data, loading, error, refresh } = useAsync(async () => {
    const vaultList = await api.getVaults();
    const enabled = vaultList.filter((v) => v.isEnabled);
    const selected = vaultId
      ? (enabled.find((v) => v.vaultId === vaultId) ?? null)
      : null;
    return { vaults: enabled, selected };
  }, [vaultId]);

  const vaults = data?.vaults ?? [];
  const selected = data?.selected ?? null;

  if (loading) {
    return (
      <div className="page">
        <header className="page-header">
          <h1>Vaults</h1>
        </header>
        <PageSkeleton count={3} />
      </div>
    );
  }

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

        {!primaryWallet ? (
          <div className="card empty-card">
            <p>Create a wallet before depositing.</p>
            <Link to="/wallets" className="btn btn-primary">
              Go to Wallets
            </Link>
          </div>
        ) : (
          <div className="card">
            <h2 className="section-title">Deposit</h2>
            <DepositFlow
              vault={selected}
              wallet={primaryWallet}
              onComplete={() => navigate('/portfolio')}
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

      {error && <ErrorBanner message={error} onRetry={refresh} />}

      <div className="vault-grid">
        {vaults.map((v: EarnVault) => (
          <Link key={v.vaultId} to={`/vaults/${v.vaultId}`} className="vault-link">
            <VaultCard vault={v} />
          </Link>
        ))}
      </div>
    </div>
  );
}
