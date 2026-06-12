import type { Chain, EnvironmentInfo, Wallet } from '../api/types';

export function resolveCreateChainId(
  chains: Chain[],
  wallets: Wallet[],
  environment: EnvironmentInfo | null,
): number {
  const enabled = chains.filter((c) => c.isEnabled);
  if (enabled.length === 0) {
    return environment?.chainId ?? 84532;
  }

  if (wallets.length > 0) {
    const match = enabled.find((c) => c.chainId === wallets[0].chainId);
    if (match) return match.chainId;
  }

  return enabled[0].chainId;
}

export function chainLabel(chains: Chain[], chainId: number): string {
  return chains.find((c) => c.chainId === chainId)?.name ?? `Chain ${chainId}`;
}
