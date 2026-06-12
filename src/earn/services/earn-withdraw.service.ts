import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, PositionStatus, TransactionType } from '@prisma/client';
import { AuditService } from '../../audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  EARN_PROTOCOL_PROVIDER,
  EarnProtocolProvider,
} from '../../protocols/earn-protocol-provider.interface';
import { PositionWithVault } from '../persistence/positions/positions.repository';
import { PositionsService } from '../persistence/positions/positions.service';
import { TransactionsService } from '../persistence/transactions/transactions.service';
import { TransactionRecord } from '../persistence/transactions/transaction.types';
import { WALLET_PROVIDER, WalletProvider } from '../../wallets/providers/wallet-provider.interface';
import { WithdrawPositionDto } from '../dto/withdraw-position.dto';
import { WithdrawPositionResponseDto } from '../dto/withdraw-position-response.dto';
import { EarnBlockchainService } from './earn-blockchain.service';
import { EarnTransactionValidationService } from './earn-transaction-validation.service';
import { EarnMutationRateLimitService } from './earn-mutation-rate-limit.service';
import { ExplorerUrlService } from './explorer-url.service';
import {
  InsufficientPositionBalanceException,
  PositionNotActiveException,
  WithdrawInProgressException,
} from '../exceptions/earn-withdraw.exceptions';
import { PositionRecord } from '../persistence/positions/position.types';

@Injectable()
export class EarnWithdrawService {
  private readonly logger = new Logger(EarnWithdrawService.name);

  constructor(
    private readonly positionsService: PositionsService,
    @Inject(EARN_PROTOCOL_PROVIDER)
    private readonly earnProtocolProvider: EarnProtocolProvider,
    private readonly earnTransactionValidationService: EarnTransactionValidationService,
    @Inject(WALLET_PROVIDER) private readonly walletProvider: WalletProvider,
    private readonly earnBlockchainService: EarnBlockchainService,
    private readonly transactionsService: TransactionsService,
    private readonly prisma: PrismaService,
    private readonly earnMutationRateLimitService: EarnMutationRateLimitService,
    private readonly explorerUrlService: ExplorerUrlService,
    private readonly auditService: AuditService,
  ) {}

  async withdrawPosition(
    userId: string,
    positionId: string,
    dto: WithdrawPositionDto,
  ): Promise<WithdrawPositionResponseDto> {
    await this.earnMutationRateLimitService.assertWithdrawAllowed(userId);

    const position = await this.positionsService.findByIdWithVault(positionId);

    if (!position || position.userId !== userId) {
      throw new NotFoundException('Position not found');
    }

    if (position.status !== PositionStatus.ACTIVE) {
      throw new PositionNotActiveException(positionId);
    }

    const vault = await this.earnProtocolProvider.getVault({
      vaultId: position.vault.slug,
      chainId: position.vault.chainId,
    });

    this.earnTransactionValidationService.assertWithdrawEnabled(vault);
    this.earnTransactionValidationService.assertChainMatchesEnvironment(vault.chainId);
    this.earnTransactionValidationService.assertVaultBelongsToChain(vault, vault.chainId);
    this.earnTransactionValidationService.assertRpcBelongsToChain(vault.chainId);

    const wallet = await this.earnTransactionValidationService.assertWalletBelongsToUser(
      userId,
      dto.walletId,
    );
    this.earnTransactionValidationService.assertWalletChainMatchesVault(wallet, vault);

    const fullWithdraw = dto.fullWithdraw === true;
    const onChainShares = await this.earnBlockchainService.readVaultShareBalance(
      vault,
      wallet.address,
    );
    const positionShares = BigInt(position.shares.toString());
    const withdrawAmount = this.resolveWithdrawAmount(position, dto, fullWithdraw);
    const amountBn = BigInt(withdrawAmount);
    const positionAmount = BigInt(position.currentAmount.toString());

    if (amountBn > positionAmount) {
      throw new InsufficientPositionBalanceException(
        withdrawAmount,
        position.currentAmount.toString(),
      );
    }

    const sharesToBurn = fullWithdraw
      ? positionShares
      : await this.earnBlockchainService.previewWithdrawShares(vault, amountBn);

    if (sharesToBurn > positionShares) {
      throw new InsufficientPositionBalanceException(
        sharesToBurn.toString(),
        position.shares.toString(),
      );
    }

    if (sharesToBurn > onChainShares) {
      throw new InsufficientPositionBalanceException(
        sharesToBurn.toString(),
        onChainShares.toString(),
      );
    }

    const hasOpenWithdraw = await this.transactionsService.hasOpenWithdraw(positionId);

    if (hasOpenWithdraw) {
      throw new WithdrawInProgressException(positionId);
    }

    const transaction = await this.prisma.$transaction(async (tx) => {
      const openWithdraw = await this.transactionsService.hasOpenWithdraw(positionId, tx);

      if (openWithdraw) {
        throw new WithdrawInProgressException(positionId);
      }

      await this.positionsService.markWithdrawing(position.id, tx);

      return this.transactionsService.createTransaction(
        {
          userId,
          walletId: wallet.id,
          vaultId: position.vaultId,
          positionId: position.id,
          chainId: vault.chainId,
          type: TransactionType.WITHDRAW,
          amount: withdrawAmount,
          metadata: {
            protocolVaultId: vault.vaultId,
            sharesBurned: sharesToBurn.toString(),
            fullWithdraw,
            onChainShares: onChainShares.toString(),
          },
        },
        tx,
      );
    });

    await this.auditService.log({
      userId,
      action: AuditAction.WITHDRAW_REQUESTED,
      entityType: 'transaction',
      entityId: transaction.transactionId,
      metadata: {
        positionId,
        vaultId: vault.vaultId,
        amount: withdrawAmount,
        fullWithdraw,
      },
    });

    try {
      const withdrawData = this.earnBlockchainService.encodeVaultWithdraw(
        vault,
        amountBn,
        wallet.address,
        fullWithdraw,
      );

      const broadcast = await this.walletProvider.sendTransaction({
        providerWalletId: wallet.providerId,
        chainId: vault.chainId,
        to: vault.contractAddress,
        value: '0',
        data: withdrawData,
      });

      const submitted = await this.transactionsService.markSubmitted(
        transaction.transactionId,
        broadcast.hash,
        {
          privyTransactionId: broadcast.transactionId,
          sharesBurned: sharesToBurn.toString(),
          fullWithdraw,
        },
      );

      const receipt = await this.earnBlockchainService.waitForTransactionReceipt(
        vault.chainId,
        broadcast.hash,
      );

      if (receipt.status !== 'success') {
        const reverted = await this.transactionsService.markReverted(
          submitted.transactionId,
          receipt.blockNumber,
          { gasUsed: receipt.gasUsed.toString() },
        );

        await this.positionsService.markActive(position.id);

        return this.toResponse({
          position,
          dto,
          fullWithdraw,
          sharesBurned: sharesToBurn.toString(),
          transaction: reverted,
        });
      }

      const finalState = await this.prisma.$transaction(async (tx) => {
        const { applied, transaction: confirmed } =
          await this.transactionsService.confirmSubmitted(
            submitted.transactionId,
            receipt.blockNumber,
            {
              gasUsed: receipt.gasUsed.toString(),
              sharesBurned: sharesToBurn.toString(),
              fullWithdraw,
            },
            tx,
          );

        const updatedPosition = applied
          ? await this.positionsService.subtractWithdraw(
              position.id,
              {
                withdrawnAmount: withdrawAmount,
                shares: sharesToBurn.toString(),
              },
              tx,
            )
          : await this.positionsService.findById(position.id, tx);

        if (!updatedPosition) {
          throw new Error(`Position ${position.id} not found after withdrawal confirmation`);
        }

        return { confirmed, updatedPosition };
      });

      await this.auditService.log({
        userId,
        action: AuditAction.WITHDRAW_CONFIRMED,
        entityType: 'transaction',
        entityId: finalState.confirmed.transactionId,
        metadata: {
          positionId,
          txHash: finalState.confirmed.txHash,
          fullWithdraw,
        },
      });

      return this.toResponse({
        position,
        dto,
        fullWithdraw,
        sharesBurned: sharesToBurn.toString(),
        transaction: finalState.confirmed,
        updatedPosition: finalState.updatedPosition,
      });
    } catch (error) {
      await this.transactionsService.markFailed(transaction.transactionId, {
        error: error instanceof Error ? error.message : 'Unknown withdrawal failure',
      });

      await this.positionsService.markActive(position.id);

      this.logger.error(
        `Withdrawal failed for position ${positionId}`,
        error instanceof Error ? error.stack : String(error),
      );

      throw error;
    }
  }

  private resolveWithdrawAmount(
    position: PositionWithVault,
    dto: WithdrawPositionDto,
    fullWithdraw: boolean,
  ): string {
    if (fullWithdraw) {
      return position.currentAmount.toString();
    }

    if (!dto.amount) {
      throw new BadRequestException('Either amount or fullWithdraw must be provided');
    }

    return dto.amount;
  }

  private toResponse(input: {
    position: PositionWithVault;
    dto: WithdrawPositionDto;
    fullWithdraw: boolean;
    sharesBurned: string;
    transaction: TransactionRecord;
    updatedPosition?: PositionRecord;
  }): WithdrawPositionResponseDto {
    const positionState = input.updatedPosition ?? {
      status: input.position.status,
      currentAmount: input.position.currentAmount.toString(),
      shares: input.position.shares.toString(),
    };

    return {
      positionId: input.position.id,
      vaultId: input.position.vault.slug,
      chainId: input.position.vault.chainId,
      walletId: input.dto.walletId,
      amount: input.transaction.amount,
      fullWithdraw: input.fullWithdraw,
      sharesBurned: input.sharesBurned,
      positionStatus: positionState.status,
      remainingAmount: positionState.currentAmount,
      remainingShares: positionState.shares,
      transactionId: input.transaction.transactionId,
      status: input.transaction.status,
      txHash: input.transaction.txHash ?? undefined,
      blockNumber: input.transaction.blockNumber ?? undefined,
      explorerUrl: this.explorerUrlService.forTransaction(
        input.position.vault.chainId,
        input.transaction.txHash,
      ),
    };
  }
}
