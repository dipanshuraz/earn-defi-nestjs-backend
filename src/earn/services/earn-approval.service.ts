import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { AuditAction, TransactionStatus, TransactionType } from '@prisma/client';
import { AuditService } from '../../audit/audit.service';
import {
  EARN_PROTOCOL_PROVIDER,
  EarnProtocolProvider,
} from '../../protocols/earn-protocol-provider.interface';
import { ProtocolVault } from '../../protocols/earn-protocol.types';
import { TransactionsService } from '../persistence/transactions/transactions.service';
import { WALLET_PROVIDER, WalletProvider } from '../../wallets/providers/wallet-provider.interface';
import { EarnBlockchainService } from './earn-blockchain.service';
import { EarnTransactionValidationService } from './earn-transaction-validation.service';
import { ExplorerUrlService } from './explorer-url.service';
import { ApproveVaultDto } from '../dto/approve-vault.dto';
import { ApproveVaultResponseDto } from '../dto/approve-vault-response.dto';

@Injectable()
export class EarnApprovalService {
  private readonly logger = new Logger(EarnApprovalService.name);

  constructor(
    @Inject(EARN_PROTOCOL_PROVIDER)
    private readonly earnProtocolProvider: EarnProtocolProvider,
    @Inject(WALLET_PROVIDER) private readonly walletProvider: WalletProvider,
    private readonly earnBlockchainService: EarnBlockchainService,
    private readonly transactionsService: TransactionsService,
    private readonly earnTransactionValidationService: EarnTransactionValidationService,
    private readonly explorerUrlService: ExplorerUrlService,
    private readonly auditService: AuditService,
  ) {}

  async approveVault(
    userId: string,
    vaultId: string,
    dto: ApproveVaultDto,
  ): Promise<ApproveVaultResponseDto> {
    const amount = BigInt(dto.amount);
    const vault = await this.earnProtocolProvider.getVault({ vaultId });

    this.earnTransactionValidationService.assertDepositEnabled(vault);
    this.earnTransactionValidationService.assertChainMatchesEnvironment(vault.chainId);
    this.earnTransactionValidationService.assertRpcBelongsToChain(vault.chainId);
    this.earnTransactionValidationService.assertVaultBelongsToChain(vault, vault.chainId);

    const wallet = await this.earnTransactionValidationService.assertWalletBelongsToUser(
      userId,
      dto.walletId,
    );
    this.earnTransactionValidationService.assertWalletChainMatchesVault(wallet, vault);

    if (vault.assetAddress === 'native') {
      throw new BadRequestException('Native assets do not require ERC-20 approval');
    }

    const allowance = await this.earnBlockchainService.readErc20Allowance({
      chainId: vault.chainId,
      ownerAddress: wallet.address,
      assetAddress: vault.assetAddress,
      spenderAddress: vault.contractAddress,
    });

    const requiresApproval = allowance < amount;

    if (!requiresApproval) {
      const transaction = await this.transactionsService.createTransaction({
        userId,
        walletId: wallet.id,
        chainId: vault.chainId,
        type: TransactionType.APPROVAL,
        amount: dto.amount,
        metadata: {
          vaultId: vault.vaultId,
          assetAddress: vault.assetAddress,
          spenderAddress: vault.contractAddress,
          skipped: true,
          reason: 'SUFFICIENT_ALLOWANCE',
        },
      });

      const confirmed = await this.transactionsService.markConfirmed(
        transaction.transactionId,
        0n,
        {
          allowance: allowance.toString(),
          requiresApproval: false,
        },
      );

      await this.auditService.log({
        userId,
        action: AuditAction.APPROVAL_CONFIRMED,
        entityType: 'transaction',
        entityId: confirmed.transactionId,
        metadata: { vaultId: vault.vaultId, skipped: true },
      });

      return this.toResponse(vault, dto, allowance, false, confirmed);
    }

    const transaction = await this.transactionsService.createTransaction({
      userId,
      walletId: wallet.id,
      chainId: vault.chainId,
      type: TransactionType.APPROVAL,
      amount: dto.amount,
      metadata: {
        vaultId: vault.vaultId,
        assetAddress: vault.assetAddress,
        spenderAddress: vault.contractAddress,
        allowanceBefore: allowance.toString(),
      },
    });

    await this.auditService.log({
      userId,
      action: AuditAction.APPROVAL_REQUESTED,
      entityType: 'transaction',
      entityId: transaction.transactionId,
      metadata: { vaultId: vault.vaultId, amount: dto.amount },
    });

    try {
      const approveData = this.earnBlockchainService.encodeErc20Approve(
        vault.contractAddress,
        amount,
      );

      const broadcast = await this.walletProvider.sendTransaction({
        providerWalletId: wallet.providerId,
        chainId: vault.chainId,
        to: vault.assetAddress,
        value: '0',
        data: approveData,
      });

      const submitted = await this.transactionsService.markSubmitted(
        transaction.transactionId,
        broadcast.hash,
        {
          privyTransactionId: broadcast.transactionId,
          allowanceBefore: allowance.toString(),
        },
      );

      const receipt = await this.earnBlockchainService.waitForTransactionReceipt(
        vault.chainId,
        broadcast.hash,
      );

      const finalRecord =
        receipt.status === 'success'
          ? (
              await this.transactionsService.confirmSubmitted(
                submitted.transactionId,
                receipt.blockNumber,
                {
                  gasUsed: receipt.gasUsed.toString(),
                  allowanceBefore: allowance.toString(),
                },
              )
            ).transaction
          : await this.transactionsService.markReverted(
              submitted.transactionId,
              receipt.blockNumber,
              {
                gasUsed: receipt.gasUsed.toString(),
                allowanceBefore: allowance.toString(),
              },
            );

      const updatedAllowance = await this.earnBlockchainService.readErc20Allowance({
        chainId: vault.chainId,
        ownerAddress: wallet.address,
        assetAddress: vault.assetAddress,
        spenderAddress: vault.contractAddress,
      });

      if (finalRecord.status === TransactionStatus.CONFIRMED) {
        await this.auditService.log({
          userId,
          action: AuditAction.APPROVAL_CONFIRMED,
          entityType: 'transaction',
          entityId: finalRecord.transactionId,
          metadata: { vaultId: vault.vaultId, txHash: finalRecord.txHash },
        });
      }

      return this.toResponse(
        vault,
        dto,
        updatedAllowance,
        updatedAllowance < amount,
        finalRecord,
      );
    } catch (error) {
      await this.transactionsService.markFailed(transaction.transactionId, {
        error: error instanceof Error ? error.message : 'Unknown transaction failure',
        allowanceBefore: allowance.toString(),
      });

      this.logger.error(
        `Approval failed for vault ${vault.vaultId}`,
        error instanceof Error ? error.stack : String(error),
      );

      throw error;
    }
  }

  private toResponse(
    vault: ProtocolVault,
    dto: ApproveVaultDto,
    allowance: bigint,
    requiresApproval: boolean,
    transaction: {
      transactionId: string;
      status: TransactionStatus;
      txHash: string | null;
      blockNumber: string | null;
    },
  ): ApproveVaultResponseDto {
    return {
      vaultId: vault.vaultId,
      chainId: vault.chainId,
      walletId: dto.walletId,
      amount: dto.amount,
      allowance: allowance.toString(),
      requiresApproval,
      status: transaction.status,
      transactionId: transaction.transactionId,
      txHash: transaction.txHash ?? undefined,
      blockNumber: transaction.blockNumber ?? undefined,
      explorerUrl: this.explorerUrlService.forTransaction(vault.chainId, transaction.txHash),
    };
  }
}
