export interface AaveOnChainReserveData {
  name: string;
  symbol: string;
  assetAddress: string;
  aTokenAddress: string;
  apy: string;
  tvl: string;
  sharePrice: string;
  totalSupply: bigint;
  liquidityIndex: bigint;
}
