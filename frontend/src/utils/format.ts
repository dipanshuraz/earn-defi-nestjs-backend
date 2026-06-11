export function formatAmount(
  baseUnits: string,
  decimals: number,
  maxFractionDigits = 4,
): string {
  const value = BigInt(baseUnits);
  const divisor = 10n ** BigInt(decimals);
  const whole = value / divisor;
  const fraction = value % divisor;
  const fractionStr = fraction
    .toString()
    .padStart(decimals, '0')
    .slice(0, maxFractionDigits)
    .replace(/0+$/, '');
  return fractionStr ? `${whole}.${fractionStr}` : whole.toString();
}

export function parseAmount(input: string, decimals: number): string {
  const trimmed = input.trim();
  if (!trimmed || !/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error('Enter a valid amount');
  }
  const [whole, fraction = ''] = trimmed.split('.');
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
  const base = BigInt(whole) * 10n ** BigInt(decimals);
  const frac = paddedFraction ? BigInt(paddedFraction) : 0n;
  return (base + frac).toString();
}

export function formatApy(apy: string): string {
  const num = parseFloat(apy);
  if (Number.isNaN(num)) return apy;
  return `${(num * 100).toFixed(2)}%`;
}

export function formatTvl(baseUnits: string, decimals: number): string {
  const amount = formatAmount(baseUnits, decimals, 2);
  const num = parseFloat(amount);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`;
  return amount;
}

export function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
