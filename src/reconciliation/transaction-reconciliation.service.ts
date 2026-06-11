import { Injectable, Logger } from '@nestjs/common';
import { AuditAction, PositionStatus, TransactionType } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { EarnBlockchainService } from '../earn/services/earn-blockchain.service';
import { PositionsService } from '../earn/persistence/positions/positions.service';
import { TransactionsService } from '../earn/persistence/transactions/transactions.service';
import { TransactionRecord } from '../earn/persistence/transactions/transaction.types';
import { STALE_CREATED_TRANSACTION_MINUTES } from './reconciliation.constants';
import { ReconciliationLockService } from './reconciliation-lock.service';

export interface ReconciliationSummary {
  scanned: number;
  confirmed: number;
  reverted: number;
  failed: number;
  pending: number;
}

@Injectable()
export class TransactionReconciliationService {
  private readonly logger = new Logger(TransactionReconciliationService.name);

  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly positionsService: PositionsService,
    private readonly earnBlockchainService: EarnBlockchainService,
    private readonly prisma: PrismaService,
    private readonly reconciliationLockService: ReconciliationLockService,
    private readonly auditService: AuditService,
  ) {}

  async reconcilePendingTransactions(jobId = 'manual'): Promise<ReconciliationSummary> {
    const acquired = await this.reconciliationLockService.acquire(jobId);

    if (!acquired) {
      this.logger.warn(
        JSON.stringify({
          type: 'reconciliation_skipped',
          requestId: jobId,
          reason: 'LOCK_HELD',
        }),
      );

      return {
        scanned: 0,
        confirmed: 0,
        reverted: 0,
        failed: 0,
        pending: 0,
      };
    }

    try {
      return await this.runReconciliation(jobId);
    } finally {
      await this.reconciliationLockService.release(jobId);
    }
  }

  private async runReconciliation(jobId: string): Promise<ReconciliationSummary> {
    const summary: ReconciliationSummary = {
      scanned: 0,
      confirmed: 0,
      reverted: 0,
      failed: 0,
      pending: 0,
    };

    await this.reconcileStaleCreatedTransactions(summary);

    const pendingTransactions = await this.transactionsService.findPendingReconciliation();

    for (const transaction of pendingTransactions) {
      summary.scanned += 1;

      try {
        const outcome = await this.reconcileTransaction(transaction);

        if (outcome === 'confirmed') {
          summary.confirmed += 1;
        } else if (outcome === 'reverted') {
          summary.reverted += 1;
        } else {
          summary.pending += 1;
        }
      } catch (error) {
        this.logger.error(
          JSON.stringify({
            type: 'reconciliation_error',
            requestId: jobId,
            transactionId: transaction.transactionId,
            message: error instanceof Error ? error.message : String(error),
          }),
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    if (summary.confirmed > 0 || summary.reverted > 0 || summary.failed > 0) {
      this.logger.log(
        JSON.stringify({
          type: 'reconciliation_complete',
          requestId: jobId,
          ...summary,
        }),
      );
    }

    return summary;
  }

  private async reconcileStaleCreatedTransactions(summary: ReconciliationSummary): Promise<void> {
    const olderThan = new Date(Date.now() - STALE_CREATED_TRANSACTION_MINUTES * 60_000);
    const staleTransactions = await this.transactionsService.findStaleCreated(olderThan);

    for (const transaction of staleTransactions) {
      summary.scanned += 1;
      summary.failed += 1;

      await this.transactionsService.markFailed(transaction.transactionId, {
        reason: 'STALE_CREATED_TRANSACTION',
      });

      if (transaction.positionId && transaction.type === TransactionType.DEPOSIT) {
        const position = await this.positionsService.findById(transaction.positionId);

        if (position?.status === PositionStatus.PENDING) {
          await this.positionsService.markFailed(position.positionId);
        }
      }
    }
  }

  private async reconcileTransaction(
    transaction: TransactionRecord,
  ): Promise<'confirmed' | 'reverted' | 'pending'> {
    if (!transaction.txHash) {
      return 'pending';
    }

    const receipt = await this.earnBlockchainService.getTransactionReceiptWithRetry(
      transaction.chainId,
      transaction.txHash,
    );

    if (!receipt) {
      return 'pending';
    }

    if (receipt.status === 'success') {
      await this.handleConfirmedTransaction(transaction, receipt.blockNumber, receipt.gasUsed);
      return 'confirmed';
    }

    await this.handleRevertedTransaction(transaction, receipt.blockNumber, receipt.gasUsed);
    return 'reverted';
  }

  private async handleConfirmedTransaction(
    transaction: TransactionRecord,
    blockNumber: bigint,
    gasUsed: bigint,
  ): Promise<void> {
    if (transaction.type === TransactionType.DEPOSIT) {
      await this.confirmDepositTransaction(transaction, blockNumber, gasUsed);
      return;
    }

    if (transaction.type === TransactionType.WITHDRAW) {
      await this.confirmWithdrawTransaction(transaction, blockNumber, gasUsed);
      return;
    }

    const { applied, transaction: confirmed } =
      await this.transactionsService.confirmSubmitted(transaction.transactionId, blockNumber, {
        gasUsed: gasUsed.toString(),
        reconciled: true,
      });

    if (!applied) {
      return;
    }

    await this.logConfirmedAudit(transaction, confirmed.transactionId, confirmed.txHash);
  }

  private async logConfirmedAudit(
    transaction: TransactionRecord,
    transactionId: string,
    txHash: string | null,
  ): Promise<void> {
    const actionByType: Partial<Record<TransactionType, AuditAction>> = {
      [TransactionType.APPROVAL]: AuditAction.APPROVAL_CONFIRMED,
      [TransactionType.DEPOSIT]: AuditAction.DEPOSIT_CONFIRMED,
      [TransactionType.WITHDRAW]: AuditAction.WITHDRAW_CONFIRMED,
    };

    const action = actionByType[transaction.type];

    if (!action) {
      return;
    }

    await this.auditService.log({
      userId: transaction.userId,
      action,
      entityType: 'transaction',
      entityId: transactionId,
      metadata: {
        txHash,
        reconciled: true,
        type: transaction.type,
      },
    });
  }

  private async handleRevertedTransaction(
    transaction: TransactionRecord,
    blockNumber: bigint,
    gasUsed: bigint,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await this.transactionsService.markReverted(
        transaction.transactionId,
        blockNumber,
        {
          gasUsed: gasUsed.toString(),
          reconciled: true,
        },
        tx,
      );

      if (!transaction.positionId) {
        return;
      }

      const position = await this.positionsService.findById(transaction.positionId, tx);

      if (
        transaction.type === TransactionType.DEPOSIT &&
        position?.status === PositionStatus.PENDING
      ) {
        await this.positionsService.markFailed(position.positionId, tx);
        return;
      }

      if (
        transaction.type === TransactionType.WITHDRAW &&
        position?.status === PositionStatus.WITHDRAWING
      ) {
        await this.positionsService.markActive(position.positionId, tx);
      }
    });
  }

  private async confirmDepositTransaction(
    transaction: TransactionRecord,
    blockNumber: bigint,
    gasUsed: bigint,
  ): Promise<void> {
    const estimatedShares = this.readEstimatedShares(transaction);
    const depositAmounts = {
      depositedAmount: transaction.amount,
      currentAmount: transaction.amount,
      shares: estimatedShares,
    };

    await this.prisma.$transaction(async (tx) => {
      const { applied } = await this.transactionsService.confirmSubmitted(
        transaction.transactionId,
        blockNumber,
        {
          gasUsed: gasUsed.toString(),
          estimatedShares,
          reconciled: true,
        },
        tx,
      );

      if (!applied || !transaction.positionId) {
        return;
      }

      const position = await this.positionsService.findById(transaction.positionId, tx);

      if (!position || position.status !== PositionStatus.PENDING) {
        return;
      }

      await this.positionsService.activate(position.positionId, depositAmounts, tx);
    });
  }

  private async confirmWithdrawTransaction(
    transaction: TransactionRecord,
    blockNumber: bigint,
    gasUsed: bigint,
  ): Promise<void> {
    const sharesBurned = this.readMetadataString(transaction, 'sharesBurned');

    await this.prisma.$transaction(async (tx) => {
      const { applied } = await this.transactionsService.confirmSubmitted(
        transaction.transactionId,
        blockNumber,
        {
          gasUsed: gasUsed.toString(),
          sharesBurned,
          reconciled: true,
        },
        tx,
      );

      if (!applied || !transaction.positionId) {
        return;
      }

      const position = await this.positionsService.findById(transaction.positionId, tx);

      if (!position || position.status !== PositionStatus.WITHDRAWING) {
        return;
      }

      await this.positionsService.subtractWithdraw(
        transaction.positionId,
        {
          withdrawnAmount: transaction.amount,
          shares: sharesBurned,
        },
        tx,
      );
    });
  }

  private readEstimatedShares(transaction: TransactionRecord): string {
    return this.readMetadataString(transaction, 'estimatedShares');
  }

  private readMetadataString(transaction: TransactionRecord, field: string): string {
    const value = transaction.metadata?.[field];

    if (typeof value === 'string' && value.length > 0) {
      return value;
    }

    return '0';
  }
}
