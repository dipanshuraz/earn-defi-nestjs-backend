import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { withTimeout } from '../../common/utils/with-timeout.util';
import { ConfigService } from '@nestjs/config';
import {
  createPublicClient,
  defineChain,
  encodeFunctionData,
  http,
  maxUint256,
  type Address,
  type Hash,
} from 'viem';
import { BlockchainConfig, ChainDefinition, ChainsConfig } from '../../config/config.types';
import { aavePoolAbi } from '../../blockchain/abis/aave-pool.abi';
import { erc20Abi } from '../../blockchain/abis/erc20.abi';
import { ProtocolVault } from '../../protocols/earn-protocol.types';

export interface DepositPreviewChainData {
  walletBalance: bigint;
  allowance: bigint;
  requiresApproval: boolean;
  estimatedGas: bigint;
  estimatedShares: bigint;
}

@Injectable()
export class EarnBlockchainService {
  private readonly logger = new Logger(EarnBlockchainService.name);

  constructor(private readonly configService: ConfigService) {}

  assertMainnetTransactionsAllowed(chainId: number): void {
    const chain = this.getChainDefinition(chainId);
    const blockchain = this.getBlockchainConfig();

    if (!chain.isTestnet && !blockchain.allowMainnetTransactions) {
      throw new ForbiddenException(
        'Mainnet transactions are disabled. Set ALLOW_MAINNET_TRANSACTIONS=true to enable.',
      );
    }
  }

  async readErc20Allowance(input: {
    chainId: number;
    ownerAddress: string;
    assetAddress: string;
    spenderAddress: string;
  }): Promise<bigint> {
    const client = this.createClient(input.chainId);

    return client.readContract({
      address: input.assetAddress as Address,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [input.ownerAddress as Address, input.spenderAddress as Address],
    });
  }

  async readAssetBalance(input: {
    chainId: number;
    walletAddress: string;
    assetAddress: string;
  }): Promise<bigint> {
    const client = this.createClient(input.chainId);

    if (input.assetAddress === 'native') {
      return client.getBalance({ address: input.walletAddress as Address });
    }

    return client.readContract({
      address: input.assetAddress as Address,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [input.walletAddress as Address],
    });
  }

  async previewDepositShares(_vault: ProtocolVault, amount: bigint): Promise<bigint> {
    return amount;
  }

  async previewWithdrawShares(_vault: ProtocolVault, amount: bigint): Promise<bigint> {
    return amount;
  }

  async readVaultShareBalance(
    vault: ProtocolVault,
    walletAddress: string,
  ): Promise<bigint> {
    const client = this.createClient(vault.chainId);

    return client.readContract({
      address: vault.shareTokenAddress as Address,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [walletAddress as Address],
    });
  }

  encodeVaultDeposit(vault: ProtocolVault, amount: bigint, receiverAddress: string): `0x${string}` {
    return encodeFunctionData({
      abi: aavePoolAbi,
      functionName: 'supply',
      args: [
        vault.assetAddress as Address,
        amount,
        receiverAddress as Address,
        0,
      ],
    });
  }

  encodeVaultWithdraw(
    vault: ProtocolVault,
    amount: bigint,
    receiverAddress: string,
    fullWithdraw = false,
  ): `0x${string}` {
    return encodeFunctionData({
      abi: aavePoolAbi,
      functionName: 'withdraw',
      args: [
        vault.assetAddress as Address,
        fullWithdraw ? maxUint256 : amount,
        receiverAddress as Address,
      ],
    });
  }

  encodeErc20Approve(spenderAddress: string, amount: bigint): `0x${string}` {
    return encodeFunctionData({
      abi: erc20Abi,
      functionName: 'approve',
      args: [spenderAddress as Address, amount],
    });
  }

  async waitForTransactionReceipt(chainId: number, txHash: string) {
    const client = this.createClient(chainId);
    return client.waitForTransactionReceipt({
      hash: txHash as Hash,
      confirmations: 1,
    });
  }

  async getTransactionReceipt(chainId: number, txHash: string) {
    const client = this.createClient(chainId);
    return client.getTransactionReceipt({ hash: txHash as Hash });
  }

  async getTransactionReceiptWithRetry(
    chainId: number,
    txHash: string,
    maxAttempts = 3,
  ) {
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await this.getTransactionReceipt(chainId, txHash);
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `Receipt fetch attempt ${attempt}/${maxAttempts} failed for ${txHash} on chain ${chainId}`,
        );

        if (attempt < maxAttempts) {
          await this.delay(attempt * 1000);
        }
      }
    }

    throw lastError;
  }

  async isRpcHealthy(timeoutMs: number, chainId?: number): Promise<boolean> {
    const targetChainId = chainId ?? this.getBlockchainConfig().chainId;

    try {
      await withTimeout(async () => {
        const client = this.createClient(targetChainId);
        await client.getBlockNumber();
      }, timeoutMs, 'RPC health check');

      return true;
    } catch {
      return false;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  async fetchDepositPreviewData(input: {
    vault: ProtocolVault;
    walletAddress: string;
    amount: bigint;
  }): Promise<DepositPreviewChainData> {
    const client = this.createClient(input.vault.chainId);
    const walletAddress = input.walletAddress as Address;
    const poolAddress = input.vault.contractAddress as Address;
    const isNativeAsset = input.vault.assetAddress === 'native';

    const [walletBalance, allowance, estimatedShares] = await Promise.all([
      isNativeAsset
        ? client.getBalance({ address: walletAddress })
        : client.readContract({
            address: input.vault.assetAddress as Address,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [walletAddress],
          }),
      isNativeAsset
        ? Promise.resolve(0n)
        : client.readContract({
            address: input.vault.assetAddress as Address,
            abi: erc20Abi,
            functionName: 'allowance',
            args: [walletAddress, poolAddress],
          }),
      this.previewDepositShares(input.vault, input.amount),
    ]);

    const requiresApproval = !isNativeAsset && allowance < input.amount;
    const hasSufficientBalance = walletBalance >= input.amount;

    let estimatedGas = 0n;

    if (hasSufficientBalance && requiresApproval) {
      estimatedGas += await client.estimateGas({
        account: walletAddress,
        to: input.vault.assetAddress as Address,
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: 'approve',
          args: [poolAddress, input.amount],
        }),
      });
    }

    if (hasSufficientBalance && !requiresApproval) {
      estimatedGas += await client.estimateGas({
        account: walletAddress,
        to: poolAddress,
        data: this.encodeVaultDeposit(input.vault, input.amount, input.walletAddress),
      });
    }

    return {
      walletBalance,
      allowance,
      requiresApproval,
      estimatedGas,
      estimatedShares,
    };
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

  private getBlockchainConfig(): BlockchainConfig {
    const blockchain = this.configService.get<BlockchainConfig>('blockchain');

    if (!blockchain) {
      throw new Error('Blockchain configuration failed to load');
    }

    return blockchain;
  }

  private getChainDefinition(chainId: number): ChainDefinition {
    const chainsConfig = this.configService.get<ChainsConfig>('chains');

    if (!chainsConfig?.chains) {
      throw new Error('Chains configuration failed to load');
    }

    const chain = chainsConfig.chains.find((entry) => entry.chainId === chainId);

    if (!chain) {
      throw new Error(`Unsupported chainId: ${chainId}`);
    }

    return chain;
  }
}
