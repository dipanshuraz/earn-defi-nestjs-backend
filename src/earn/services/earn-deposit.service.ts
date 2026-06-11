import {
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { AuditAction, PositionStatus, TransactionType } from '@prisma/client';
import { AuditService } from '../../audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  EARN_PROTOCOL_PROVIDER,
  EarnProtocolProvider,
} from '../../protocols/earn-protocol-provider.interface';
import { ProtocolVault } from '../../protocols/earn-protocol.types';
import { PositionsService } from '../persistence/positions/positions.service';
import { TransactionsService } from '../persistence/transactions/transactions.service';
import { WALLET_PROVIDER, WalletProvider } from '../../wallets/providers/wallet-provider.interface';
import { DepositPreviewDto } from '../dto/deposit-preview.dto';
import { DepositVaultResponseDto } from '../dto/deposit-vault-response.dto';
import { EarnBlockchainService } from './earn-blockchain.service';
import { EarnTransactionValidationService } from './earn-transaction-validation.service';
import { EarnVaultRepository } from '../repositories/earn-vault.repository';
import { EarnMutationRateLimitService } from './earn-mutation-rate-limit.service';
import { ExplorerUrlService } from './explorer-url.service';
import {
  DepositInProgressException,
  InsufficientAllowanceException,
  InsufficientBalanceException,
} from '../exceptions/earn-deposit.exceptions';
import { PositionRecord } from '../persistence/positions/position.types';
import { TransactionRecord } from '../persistence/transactions/transaction.types';

@Injectable()
export class EarnDepositService {
  private readonly logger = new Logger(EarnDepositService.name);

  constructor(
    @Inject(EARN_PROTOCOL_PROVIDER)
    private readonly earnProtocolProvider: EarnProtocolProvider,
    @Inject(WALLET_PROVIDER) private readonly walletProvider: WalletProvider,
    private readonly earnBlockchainService: EarnBlockchainService,
    private readonly transactionsService: TransactionsService,
    private readonly positionsService: PositionsService,
    private readonly earnVaultRepository: EarnVaultRepository,
    private readonly prisma: PrismaService,
    private readonly earnTransactionValidationService: EarnTransactionValidationService,
    private readonly earnMutationRateLimitService: EarnMutationRateLimitService,
    private readonly explorerUrlService: ExplorerUrlService,
    private readonly auditService: AuditService,
  ) {}

  async depositVault(
    userId: string,
    vaultId: string,
    dto: DepositPreviewDto,
  ): Promise<DepositVaultResponseDto> {
    await this.earnMutationRateLimitService.assertDepositAllowed(userId);

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

    const [walletBalance, allowance, estimatedShares] = await Promise.all([
      this.earnBlockchainService.readAssetBalance({
        chainId: vault.chainId,
        walletAddress: wallet.address,
        assetAddress: vault.assetAddress,
      }),
      vault.assetAddress === 'native'
        ? Promise.resolve(amount)
        : this.earnBlockchainService.readErc20Allowance({
            chainId: vault.chainId,
            ownerAddress: wallet.address,
            assetAddress: vault.assetAddress,
            spenderAddress: vault.contractAddress,
          }),
      this.earnBlockchainService.previewDepositShares(vault, amount),
    ]);

    if (walletBalance < amount) {
      throw new InsufficientBalanceException(dto.amount, walletBalance.toString());
    }

    if (allowance < amount) {
      throw new InsufficientAllowanceException(dto.amount, allowance.toString());
    }

    const dbVault = await this.earnVaultRepository.findOrCreate(vault);
    await this.assertNoDuplicateDeposit(userId, dbVault.id, vault.vaultId);

    const { position, transaction, isNewPosition } = await this.prisma.$transaction(
      async (tx) => {
        const existingPosition = await this.positionsService.findByUserAndVault(
          userId,
          dbVault.id,
          tx,
        );

        if (existingPosition?.status === PositionStatus.PENDING) {
          throw new DepositInProgressException(vault.vaultId);
        }

        const hasOpenDeposit = await this.transactionsService.hasOpenDeposit(
          userId,
          dbVault.id,
          tx,
        );

        if (hasOpenDeposit) {
          throw new DepositInProgressException(vault.vaultId);
        }

        let positionRecord = existingPosition;
        let isNew = false;

        if (!positionRecord) {
          positionRecord = await this.positionsService.createPending(
            { userId, vaultId: dbVault.id },
            tx,
          );
          isNew = true;
        }

        const transactionRecord = await this.transactionsService.createTransaction(
          {
            userId,
            walletId: wallet.id,
            vaultId: dbVault.id,
            positionId: positionRecord.positionId,
            chainId: vault.chainId,
            type: TransactionType.DEPOSIT,
            amount: dto.amount,
            metadata: {
              protocolVaultId: vault.vaultId,
              estimatedShares: estimatedShares.toString(),
              walletBalance: walletBalance.toString(),
              allowance: allowance.toString(),
            },
          },
          tx,
        );

        return {
          position: positionRecord,
          transaction: transactionRecord,
          isNewPosition: isNew,
        };
      },
    );

    await this.auditService.log({
      userId,
      action: AuditAction.DEPOSIT_REQUESTED,
      entityType: 'transaction',
      entityId: transaction.transactionId,
      metadata: {
        vaultId: vault.vaultId,
        walletId: dto.walletId,
        amount: dto.amount,
        positionId: position.positionId,
      },
    });

    try {
      const depositData = this.earnBlockchainService.encodeVaultDeposit(
        vault,
        amount,
        wallet.address,
      );

      const broadcast = await this.walletProvider.sendTransaction({
        providerWalletId: wallet.providerId,
        chainId: vault.chainId,
        to: vault.contractAddress,
        value: '0',
        data: depositData,
      });

      const submitted = await this.transactionsService.markSubmitted(
        transaction.transactionId,
        broadcast.hash,
        {
          privyTransactionId: broadcast.transactionId,
          estimatedShares: estimatedShares.toString(),
        },
      );

      const receipt = await this.earnBlockchainService.waitForTransactionReceipt(
        vault.chainId,
        broadcast.hash,
      );

      if (receipt.status !== 'success') {
        if (isNewPosition) {
          await this.positionsService.markFailed(position.positionId);
        }

        const reverted = await this.transactionsService.markReverted(
          submitted.transactionId,
          receipt.blockNumber,
          { gasUsed: receipt.gasUsed.toString() },
        );

        const currentPosition = await this.positionsService.findByUserAndVault(
          userId,
          dbVault.id,
        );

        return this.toResponse({
          vault,
          dto,
          walletBalance,
          allowance,
          position: currentPosition ?? position,
          transaction: reverted,
          shares: currentPosition?.shares ?? '0',
        });
      }

      const depositAmounts = {
        depositedAmount: dto.amount,
        currentAmount: dto.amount,
        shares: estimatedShares.toString(),
      };

      const finalState = await this.prisma.$transaction(async (tx) => {
        const { applied, transaction: confirmed } =
          await this.transactionsService.confirmSubmitted(
            submitted.transactionId,
            receipt.blockNumber,
            {
              gasUsed: receipt.gasUsed.toString(),
              estimatedShares: estimatedShares.toString(),
            },
            tx,
          );

        const updatedPosition = applied
          ? isNewPosition
            ? await this.positionsService.activate(position.positionId, depositAmounts, tx)
            : await this.positionsService.addDeposit(position.positionId, depositAmounts, tx)
          : await this.positionsService.findById(position.positionId, tx);

        if (!updatedPosition) {
          throw new Error(`Position ${position.positionId} not found after deposit confirmation`);
        }

        return { confirmed, updatedPosition };
      });

      await this.auditService.log({
        userId,
        action: AuditAction.DEPOSIT_CONFIRMED,
        entityType: 'transaction',
        entityId: finalState.confirmed.transactionId,
        metadata: {
          vaultId: vault.vaultId,
          txHash: finalState.confirmed.txHash,
          positionId: finalState.updatedPosition.positionId,
        },
      });

      return this.toResponse({
        vault,
        dto,
        walletBalance,
        allowance,
        position: finalState.updatedPosition,
        transaction: finalState.confirmed,
        shares: finalState.updatedPosition.shares,
      });
    } catch (error) {
      await this.transactionsService.markFailed(transaction.transactionId, {
        error: error instanceof Error ? error.message : 'Unknown deposit failure',
      });

      if (isNewPosition) {
        await this.positionsService.markFailed(position.positionId);
      }

      this.logger.error(
        `Deposit failed for vault ${vault.vaultId}`,
        error instanceof Error ? error.stack : String(error),
      );

      throw error;
    }
  }

  private async assertNoDuplicateDeposit(
    userId: string,
    dbVaultId: string,
    protocolVaultId: string,
  ): Promise<void> {
    const [existingPosition, hasOpenDeposit] = await Promise.all([
      this.positionsService.findByUserAndVault(userId, dbVaultId),
      this.transactionsService.hasOpenDeposit(userId, dbVaultId),
    ]);

    if (existingPosition?.status === PositionStatus.PENDING) {
      throw new DepositInProgressException(protocolVaultId);
    }

    if (hasOpenDeposit) {
      throw new DepositInProgressException(protocolVaultId);
    }
  }

  private toResponse(input: {
    vault: ProtocolVault;
    dto: DepositPreviewDto;
    walletBalance: bigint;
    allowance: bigint;
    position: PositionRecord;
    transaction: TransactionRecord;
    shares: string;
  }): DepositVaultResponseDto {
    return {
      vaultId: input.vault.vaultId,
      chainId: input.vault.chainId,
      walletId: input.dto.walletId,
      amount: input.dto.amount,
      walletBalance: input.walletBalance.toString(),
      allowance: input.allowance.toString(),
      positionId: input.position.positionId,
      positionStatus: input.position.status,
      depositedAmount: input.position.depositedAmount,
      shares: input.shares,
      transactionId: input.transaction.transactionId,
      status: input.transaction.status,
      txHash: input.transaction.txHash ?? undefined,
      blockNumber: input.transaction.blockNumber ?? undefined,
      explorerUrl: this.explorerUrlService.forTransaction(
        input.vault.chainId,
        input.transaction.txHash,
      ),
    };
  }
}
