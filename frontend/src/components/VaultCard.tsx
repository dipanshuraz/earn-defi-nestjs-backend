import type { EarnVault } from '../api/types';
import { formatApy, formatTvl } from '../utils/format';

interface VaultCardProps {
  vault: EarnVault;
}

export function VaultCard({ vault }: VaultCardProps) {
  return (
    <div className="card vault-card">
      <div className="vault-card-top">
        <div>
          <h3>{vault.name}</h3>
          <p className="muted">
            {vault.assetSymbol} · {vault.protocol}
          </p>
        </div>
        <span className={`badge badge-${vault.riskLevel}`}>{vault.riskLevel}</span>
      </div>

      <div className="vault-stats">
        <div>
          <span className="stat-label">APY</span>
          <span className="stat-value stat-apy">{formatApy(vault.apy)}</span>
        </div>
        <div>
          <span className="stat-label">TVL</span>
          <span className="stat-value">
            {formatTvl(vault.tvl, vault.assetDecimals)} {vault.assetSymbol}
          </span>
        </div>
      </div>
    </div>
  );
}
