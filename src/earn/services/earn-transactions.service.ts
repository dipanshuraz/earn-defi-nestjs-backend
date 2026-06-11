import { Injectable, NotFoundException } from '@nestjs/common';
import { TransactionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TransactionsService } from '../persistence/transactions/transactions.service';
import { TransactionRecord } from '../persistence/transactions/transaction.types';
import { TransactionsQueryDto } from '../dto/transactions-query.dto';
import {
  TransactionResponseDto,
  TransactionsListResponseDto,
} from '../dto/transaction-response.dto';
import { ExplorerUrlService } from './explorer-url.service';

@Injectable()
export class EarnTransactionsService {
  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly prisma: PrismaService,
    private readonly explorerUrlService: ExplorerUrlService,
  ) {}

  async listTransactions(
    userId: string,
    query: TransactionsQueryDto,
  ): Promise<TransactionsListResponseDto> {
    const result = await this.transactionsService.findByUserWithFilters({
      userId,
      walletId: query.walletId,
      vaultSlug: query.vaultId,
      positionId: query.positionId,
      type: query.type,
      status: query.status,
      page: query.page,
      limit: query.limit,
    });

    return {
      items: result.items.map((transaction) => this.toResponse(transaction)),
      page: result.page,
      limit: result.limit,
      total: result.total,
    };
  }

  async getTransaction(
    userId: string,
    transactionId: string,
  ): Promise<TransactionResponseDto> {
    const transaction = await this.transactionsService.findById(transactionId);

    if (!transaction || transaction.userId !== userId) {
      throw new NotFoundException('Transaction not found');
    }

    const vaultSlug = await this.resolveVaultSlug(transaction);
    return this.toResponse({ ...transaction, vaultSlug });
  }

  mapTransactions(transactions: TransactionRecord[]): TransactionResponseDto[] {
    return transactions.map((transaction) => this.toResponse(transaction));
  }

  private async resolveVaultSlug(transaction: TransactionRecord): Promise<string | null> {
    if (transaction.vaultSlug) {
      return transaction.vaultSlug;
    }

    if (!transaction.vaultId) {
      return null;
    }

    const vault = await this.prisma.vault.findUnique({
      where: { id: transaction.vaultId },
      select: { slug: true },
    });

    return vault?.slug ?? null;
  }

  private toResponse(transaction: TransactionRecord): TransactionResponseDto {
    const confirmedAt =
      transaction.status === TransactionStatus.CONFIRMED
        ? transaction.updatedAt.toISOString()
        : undefined;

    return {
      transactionId: transaction.transactionId,
      type: transaction.type,
      status: transaction.status,
      amount: transaction.amount,
      chainId: transaction.chainId,
      walletId: transaction.walletId ?? undefined,
      vaultId: transaction.vaultSlug ?? undefined,
      positionId: transaction.positionId ?? undefined,
      txHash: transaction.txHash ?? undefined,
      blockNumber: transaction.blockNumber ?? undefined,
      explorerUrl: this.explorerUrlService.forTransaction(
        transaction.chainId,
        transaction.txHash,
      ),
      confirmedAt,
      createdAt: transaction.createdAt.toISOString(),
      updatedAt: transaction.updatedAt.toISOString(),
    };
  }
}
