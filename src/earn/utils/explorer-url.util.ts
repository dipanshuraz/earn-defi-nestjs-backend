export function buildExplorerUrl(
  explorerBaseUrl: string | undefined,
  txHash: string | null | undefined,
): string | undefined {
  if (!explorerBaseUrl || !txHash) {
    return undefined;
  }

  const base = explorerBaseUrl.replace(/\/$/, '');
  return `${base}/tx/${txHash}`;
}
