import {
  BadRequestException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { WalletsService } from '../../wallets/wallets.service';
import {
  EARN_PROTOCOL_PROVIDER,
  EarnProtocolProvider,
} from '../../protocols/earn-protocol-provider.interface';
import { ProtocolVault } from '../../protocols/earn-protocol.types';
import { EarnBlockchainService } from './earn-blockchain.service';
import { DepositPreviewDto } from '../dto/deposit-preview.dto';
import { DepositPreviewResponseDto } from '../dto/deposit-preview-response.dto';
import { EarnVaultResponseDto } from '../dto/earn-vault-response.dto';
import { EarnVaultsQueryDto } from '../dto/earn-vaults-query.dto';
import { InsufficientBalanceException } from '../exceptions/earn-deposit.exceptions';

@Injectable()
export class EarnService {
  constructor(
    @Inject(EARN_PROTOCOL_PROVIDER)
    private readonly earnProtocolProvider: EarnProtocolProvider,
    private readonly walletsService: WalletsService,
    private readonly earnBlockchainService: EarnBlockchainService,
  ) {}

  async listVaults(query: EarnVaultsQueryDto = {}): Promise<EarnVaultResponseDto[]> {
    const vaults = await this.earnProtocolProvider.getVaults({
      chainId: query.chainId,
      assetSymbol: query.assetSymbol,
      protocol: query.protocol,
    });

    return vaults.map((vault) => this.toVaultResponse(vault));
  }

  async getVault(vaultId: string, chainId?: number): Promise<EarnVaultResponseDto> {
    const vault = await this.earnProtocolProvider.getVault({ vaultId, chainId });
    return this.toVaultResponse(vault);
  }

  async previewDeposit(
    userId: string,
    vaultId: string,
    dto: DepositPreviewDto,
  ): Promise<DepositPreviewResponseDto> {
    const amount = BigInt(dto.amount);
    const vault = await this.earnProtocolProvider.getVault({ vaultId });

    this.assertVaultActive(vault);

    const wallet = await this.walletsService.findOwnedWallet(userId, dto.walletId);

    if (wallet.chainId !== vault.chainId) {
      throw new BadRequestException(
        `Wallet chain ${wallet.chainId} does not match vault chain ${vault.chainId}`,
      );
    }

    const preview = await this.earnBlockchainService.fetchDepositPreviewData({
      vault,
      walletAddress: wallet.address,
      amount,
    });

    if (preview.walletBalance < amount) {
      throw new InsufficientBalanceException(dto.amount, preview.walletBalance.toString());
    }

    return {
      vaultId: vault.vaultId,
      chainId: vault.chainId,
      walletId: dto.walletId,
      amount: dto.amount,
      walletBalance: preview.walletBalance.toString(),
      allowance: preview.allowance.toString(),
      requiresApproval: preview.requiresApproval,
      estimatedGas: preview.estimatedGas.toString(),
      estimatedShares: preview.estimatedShares.toString(),
    };
  }

  private assertVaultActive(vault: ProtocolVault): void {
    if (!vault.isEnabled) {
      throw new BadRequestException(`Vault is not active: ${vault.vaultId}`);
    }
  }

  private toVaultResponse(vault: ProtocolVault): EarnVaultResponseDto {
    return {
      vaultId: vault.vaultId,
      protocol: vault.protocol,
      chainId: vault.chainId,
      contractAddress: vault.contractAddress,
      name: vault.name,
      symbol: vault.symbol,
      assetSymbol: vault.assetSymbol,
      assetDecimals: vault.assetDecimals,
      assetAddress: vault.assetAddress,
      apy: vault.apy,
      tvl: vault.tvl,
      sharePrice: vault.sharePrice,
      totalSupply: vault.totalSupply,
      metadata: vault.metadata,
      isEnabled: vault.isEnabled,
      depositEnabled: vault.depositEnabled,
      withdrawEnabled: vault.withdrawEnabled,
      riskLevel: vault.riskLevel,
    };
  }
}
