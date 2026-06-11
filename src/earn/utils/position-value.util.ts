import { parseUnits } from 'viem';

const RAY = 10n ** 27n;

export function computeCurrentValue(
  shares: string,
  sharePrice: string,
  assetDecimals: number,
  shareDecimals = assetDecimals,
): string {
  if (shares === '0') {
    return '0';
  }

  const sharesBn = BigInt(shares);

  if (shareDecimals === assetDecimals) {
    const priceScaled = parseUnits(sharePrice, 27);
    return ((sharesBn * priceScaled) / RAY).toString();
  }

  const priceScaled = parseUnits(sharePrice, assetDecimals);
  return ((sharesBn * priceScaled) / 10n ** BigInt(shareDecimals)).toString();
}
