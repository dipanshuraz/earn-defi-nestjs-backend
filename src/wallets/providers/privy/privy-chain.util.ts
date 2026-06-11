const CHAIN_ID_TO_PRIVY_CHAIN: Record<number, string> = {
  1: 'ethereum',
  8453: 'base',
  84532: 'base_sepolia',
  11155111: 'sepolia',
};

export function resolveCaip2Chain(chainId: number): `eip155:${number}` {
  return `eip155:${chainId}`;
}

export function resolvePrivyChain(chainId: number): string {
  const chain = CHAIN_ID_TO_PRIVY_CHAIN[chainId];

  if (!chain) {
    throw new Error(`Unsupported chain ID for Privy wallet operations: ${chainId}`);
  }

  return chain;
}

export function toHexQuantity(value: string): string {
  if (value.startsWith('0x')) {
    return value;
  }

  return `0x${BigInt(value).toString(16)}`;
}
