import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AaveConfig, AaveVaultDefinition, AssetsConfig } from '../../config/config.types';
import { EarnProtocolProvider } from '../earn-protocol-provider.interface';
import {
  GetVaultInput,
  GetVaultsInput,
  PreviewDepositInput,
  PreviewDepositResult,
  PreviewWithdrawInput,
  PreviewWithdrawResult,
  ProtocolVault,
} from '../earn-protocol.types';
import { AaveViemService } from './aave-viem.service';

@Injectable()
export class AaveProvider implements EarnProtocolProvider {
  readonly protocol = 'aave' as const;

  constructor(
    private readonly configService: ConfigService,
    private readonly aaveViemService: AaveViemService,
  ) {}

  async getVaults(input: GetVaultsInput = {}): Promise<ProtocolVault[]> {
    if (input.protocol && input.protocol !== this.protocol) {
      return [];
    }

    const vaults = this.getEnabledVaultDefinitions(input);
    return Promise.all(vaults.map((vault) => this.buildVault(vault)));
  }

  async getVault(input: GetVaultInput): Promise<ProtocolVault> {
    const vault = this.findVaultDefinition(input.vaultId, input.chainId);

    if (!vault) {
      throw new NotFoundException(`Vault not found: ${input.vaultId}`);
    }

    return this.buildVault(vault);
  }

  async previewDeposit(input: PreviewDepositInput): Promise<PreviewDepositResult> {
    const vault = this.requireVaultDefinition(input.vaultId, input.chainId);
    const assetDecimals = this.resolveAssetDecimals(vault);

    const preview = await this.aaveViemService.previewDeposit({
      chainId: vault.chainId,
      assetAmount: input.assetAmount,
      assetDecimals,
      poolAddress: vault.poolAddress,
      assetAddress: vault.assetAddress,
      aTokenAddress: vault.aTokenAddress,
    });

    return {
      vaultId: vault.vaultId,
      chainId: vault.chainId,
      assetAmount: input.assetAmount,
      shares: preview.shares,
      sharePrice: preview.sharePrice,
    };
  }

  async previewWithdraw(input: PreviewWithdrawInput): Promise<PreviewWithdrawResult> {
    const vault = this.requireVaultDefinition(input.vaultId, input.chainId);
    const assetDecimals = this.resolveAssetDecimals(vault);

    const preview = await this.aaveViemService.previewWithdraw({
      chainId: vault.chainId,
      assetAmount: input.assetAmount,
      assetDecimals,
      poolAddress: vault.poolAddress,
      assetAddress: vault.assetAddress,
      aTokenAddress: vault.aTokenAddress,
    });

    return {
      vaultId: vault.vaultId,
      chainId: vault.chainId,
      assetAmount: input.assetAmount,
      shares: preview.shares,
      sharePrice: preview.sharePrice,
    };
  }

  private async buildVault(vault: AaveVaultDefinition): Promise<ProtocolVault> {
    const assetDecimals = this.resolveAssetDecimals(vault);

    const onChain = await this.aaveViemService.readReserveData({
      chainId: vault.chainId,
      poolAddress: vault.poolAddress,
      assetAddress: vault.assetAddress,
      aTokenAddress: vault.aTokenAddress,
      assetDecimals,
      assetSymbol: vault.assetSymbol,
    });

    return {
      vaultId: vault.vaultId,
      protocol: this.protocol,
      chainId: vault.chainId,
      contractAddress: vault.poolAddress,
      shareTokenAddress: vault.aTokenAddress,
      name: onChain.name,
      symbol: onChain.symbol,
      assetSymbol: vault.assetSymbol,
      assetDecimals,
      assetAddress: vault.assetAddress,
      apy: onChain.apy,
      tvl: onChain.tvl,
      sharePrice: onChain.sharePrice,
      totalSupply: onChain.totalSupply.toString(),
      metadata: {
        description: `Supply ${vault.assetSymbol} to Aave V3 on chain ${vault.chainId}`,
      },
      isEnabled: vault.isEnabled,
      depositEnabled: vault.depositEnabled ?? vault.isEnabled,
      withdrawEnabled: vault.withdrawEnabled ?? vault.isEnabled,
      riskLevel: vault.riskLevel ?? 'medium',
    };
  }

  private resolveAssetDecimals(vault: AaveVaultDefinition): number {
    const assetsConfig = this.configService.get<AssetsConfig>('assets');
    const asset = assetsConfig?.assets.find(
      (entry) =>
        entry.chainId === vault.chainId &&
        entry.symbol.toUpperCase() === vault.assetSymbol.toUpperCase() &&
        entry.isEnabled,
    );

    if (!asset) {
      throw new Error(
        `Asset decimals not found for ${vault.assetSymbol} on chain ${vault.chainId}`,
      );
    }

    return asset.decimals;
  }

  private getAaveConfig(): AaveConfig {
    const aaveConfig = this.configService.get<AaveConfig>('aave');

    if (!aaveConfig?.vaults) {
      throw new Error('Aave configuration failed to load');
    }

    return aaveConfig;
  }

  private getEnabledVaultDefinitions(input: GetVaultsInput = {}): AaveVaultDefinition[] {
    return this.getAaveConfig().vaults.filter((vault) => {
      if (!vault.isEnabled) {
        return false;
      }

      if (input.chainId !== undefined && vault.chainId !== input.chainId) {
        return false;
      }

      if (
        input.assetSymbol &&
        vault.assetSymbol.toUpperCase() !== input.assetSymbol.toUpperCase()
      ) {
        return false;
      }

      return true;
    });
  }

  private findVaultDefinition(
    vaultId: string,
    chainId?: number,
  ): AaveVaultDefinition | undefined {
    return this.getAaveConfig().vaults.find((vault) => {
      if (vault.vaultId !== vaultId || !vault.isEnabled) {
        return false;
      }

      if (chainId !== undefined && vault.chainId !== chainId) {
        return false;
      }

      return true;
    });
  }

  private requireVaultDefinition(
    vaultId: string,
    chainId: number,
  ): AaveVaultDefinition {
    const vault = this.findVaultDefinition(vaultId, chainId);

    if (!vault) {
      throw new NotFoundException(`Vault not found: ${vaultId}`);
    }

    return vault;
  }
}
