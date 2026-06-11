import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createPublicClient,
  defineChain,
  formatUnits,
  http,
  type Address,
} from 'viem';
import { ChainDefinition, ChainsConfig } from '../../config/config.types';
import { aavePoolAbi } from '../../blockchain/abis/aave-pool.abi';
import { erc20Abi } from '../../blockchain/abis/erc20.abi';
import { AaveOnChainReserveData } from './aave.types';

const RAY = 10n ** 27n;

@Injectable()
export class AaveViemService {
  constructor(private readonly configService: ConfigService) {}

  async readReserveData(input: {
    chainId: number;
    poolAddress: string;
    assetAddress: string;
    aTokenAddress: string;
    assetDecimals: number;
    assetSymbol: string;
  }): Promise<AaveOnChainReserveData> {
    const client = this.createClient(input.chainId);
    const poolAddress = input.poolAddress as Address;
    const assetAddress = input.assetAddress as Address;
    const aTokenAddress = input.aTokenAddress as Address;

    const [reserveData, totalSupply, aTokenSymbol] = await Promise.all([
      client.readContract({
        address: poolAddress,
        abi: aavePoolAbi,
        functionName: 'getReserveData',
        args: [assetAddress],
      }),
      client.readContract({
        address: aTokenAddress,
        abi: [
          {
            type: 'function',
            name: 'totalSupply',
            stateMutability: 'view',
            inputs: [],
            outputs: [{ type: 'uint256' }],
          },
        ] as const,
        functionName: 'totalSupply',
      }),
      this.readTokenSymbol(client, aTokenAddress),
    ]);

    const liquidityIndex = BigInt(reserveData.liquidityIndex);
    const sharePrice = formatUnits(liquidityIndex, 27);
    const apy = this.formatSupplyApy(BigInt(reserveData.currentLiquidityRate));

    return {
      name: `Aave V3 ${input.assetSymbol}`,
      symbol: aTokenSymbol,
      assetAddress: input.assetAddress,
      aTokenAddress: input.aTokenAddress,
      apy,
      tvl: totalSupply.toString(),
      sharePrice,
      totalSupply,
      liquidityIndex,
    };
  }

  async previewDeposit(input: {
    chainId: number;
    assetAmount: string;
    assetDecimals: number;
    poolAddress: string;
    assetAddress: string;
    aTokenAddress: string;
  }): Promise<{ shares: string; sharePrice: string }> {
    const onChain = await this.readReserveData({
      chainId: input.chainId,
      poolAddress: input.poolAddress,
      assetAddress: input.assetAddress,
      aTokenAddress: input.aTokenAddress,
      assetDecimals: input.assetDecimals,
      assetSymbol: 'ASSET',
    });

    return {
      shares: input.assetAmount,
      sharePrice: onChain.sharePrice,
    };
  }

  async previewWithdraw(input: {
    chainId: number;
    assetAmount: string;
    assetDecimals: number;
    poolAddress: string;
    assetAddress: string;
    aTokenAddress: string;
  }): Promise<{ shares: string; sharePrice: string }> {
    const onChain = await this.readReserveData({
      chainId: input.chainId,
      poolAddress: input.poolAddress,
      assetAddress: input.assetAddress,
      aTokenAddress: input.aTokenAddress,
      assetDecimals: input.assetDecimals,
      assetSymbol: 'ASSET',
    });

    return {
      shares: input.assetAmount,
      sharePrice: onChain.sharePrice,
    };
  }

  async readATokenBalance(
    chainId: number,
    aTokenAddress: string,
    walletAddress: string,
  ): Promise<bigint> {
    const client = this.createClient(chainId);

    return client.readContract({
      address: aTokenAddress as Address,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [walletAddress as Address],
    });
  }

  private formatSupplyApy(liquidityRate: bigint): string {
    if (liquidityRate === 0n) {
      return '0';
    }

    const apyScaled = (liquidityRate * 1_000_000n) / RAY;
    return (Number(apyScaled) / 10_000).toFixed(4);
  }

  private async readTokenSymbol(
    client: ReturnType<typeof createPublicClient>,
    tokenAddress: Address,
  ): Promise<string> {
    try {
      return await client.readContract({
        address: tokenAddress,
        abi: [
          {
            type: 'function',
            name: 'symbol',
            stateMutability: 'view',
            inputs: [],
            outputs: [{ type: 'string' }],
          },
        ] as const,
        functionName: 'symbol',
      });
    } catch {
      return 'aToken';
    }
  }

  private createClient(chainId: number) {
    const chain = this.getChainDefinition(chainId);
    const viemChain = defineChain({
      id: chain.chainId,
      name: chain.name,
      nativeCurrency: chain.nativeCurrency,
      rpcUrls: {
        default: { http: [chain.rpcUrl] },
      },
    });

    return createPublicClient({
      chain: viemChain,
      transport: http(chain.rpcUrl),
    });
  }

  private getChainDefinition(chainId: number): ChainDefinition {
    const chainsConfig = this.configService.get<ChainsConfig>('chains');

    if (!chainsConfig?.chains) {
      throw new Error('Chains configuration failed to load');
    }

    const chain = chainsConfig.chains.find((entry) => entry.chainId === chainId);

    if (!chain) {
      throw new Error(`Unsupported chainId for Aave provider: ${chainId}`);
    }

    return chain;
  }
}
