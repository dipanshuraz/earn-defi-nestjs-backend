import { Injectable } from '@nestjs/common';
import { Prisma, TransactionStatus, TransactionType } from '@prisma/client';
import { TransactionsRepository } from './transactions.repository';
import { CreateTransactionInput, TransactionRecord } from './transaction.types';

type DbClient = Prisma.TransactionClient;

@Injectable()
export class TransactionsService {
  constructor(private readonly repository: TransactionsRepository) {}

  hasOpenDeposit(
    userId: string,
    vaultId: string,
    db?: DbClient,
  ): Promise<boolean> {
    return this.repository
      .findOpenDeposit(userId, vaultId, db)
      .then((transaction) => transaction !== null);
  }

  hasOpenWithdraw(positionId: string, db?: DbClient): Promise<boolean> {
    return this.repository
      .findOpenWithdraw(positionId, db)
      .then((transaction) => transaction !== null);
  }

  async createTransaction(
    input: CreateTransactionInput,
    db?: DbClient,
  ): Promise<TransactionRecord> {
    const transaction = await this.repository.create(input, db);
    return this.toRecord(transaction);
  }

  async markSubmitted(
    transactionId: string,
    txHash: string,
    metadata?: Record<string, unknown>,
    db?: DbClient,
  ): Promise<TransactionRecord> {
    const transaction = await this.repository.updateStatus(
      transactionId,
      {
        status: TransactionStatus.SUBMITTED,
        txHash,
        metadata: metadata as never,
      },
      db,
    );

    return this.toRecord(transaction);
  }

  async markConfirmed(
    transactionId: string,
    blockNumber: bigint,
    metadata?: Record<string, unknown>,
    db?: DbClient,
  ): Promise<TransactionRecord> {
    const transaction = await this.repository.updateStatus(
      transactionId,
      {
        status: TransactionStatus.CONFIRMED,
        blockNumber,
        metadata: metadata as never,
      },
      db,
    );

    return this.toRecord(transaction);
  }

  async confirmSubmitted(
    transactionId: string,
    blockNumber: bigint,
    metadata?: Record<string, unknown>,
    db?: DbClient,
  ): Promise<{ applied: boolean; transaction: TransactionRecord }> {
    const result = await this.repository.confirmSubmitted(
      transactionId,
      blockNumber,
      metadata as never,
      db,
    );

    return {
      applied: result.applied,
      transaction: this.toRecord(result.transaction),
    };
  }

  async markFailed(
    transactionId: string,
    metadata?: Record<string, unknown>,
    db?: DbClient,
  ): Promise<TransactionRecord> {
    const transaction = await this.repository.updateStatus(
      transactionId,
      {
        status: TransactionStatus.FAILED,
        metadata: metadata as never,
      },
      db,
    );

    return this.toRecord(transaction);
  }

  async markReverted(
    transactionId: string,
    blockNumber: bigint,
    metadata?: Record<string, unknown>,
    db?: DbClient,
  ): Promise<TransactionRecord> {
    const transaction = await this.repository.updateStatus(
      transactionId,
      {
        status: TransactionStatus.REVERTED,
        blockNumber,
        metadata: metadata as never,
      },
      db,
    );

    return this.toRecord(transaction);
  }

  findPendingReconciliation(limit = 100, db?: DbClient): Promise<TransactionRecord[]> {
    return this.repository
      .findPendingReconciliation(limit, db)
      .then((transactions) => transactions.map((transaction) => this.toRecord(transaction)));
  }

  findStaleCreated(olderThan: Date, limit = 50, db?: DbClient): Promise<TransactionRecord[]> {
    return this.repository
      .findStaleCreated(olderThan, limit, db)
      .then((transactions) => transactions.map((transaction) => this.toRecord(transaction)));
  }

  async findById(transactionId: string, db?: DbClient): Promise<TransactionRecord | null> {
    const transaction = await this.repository.findById(transactionId, db);
    return transaction ? this.toRecord(transaction) : null;
  }

  findByPositionId(positionId: string, db?: DbClient): Promise<TransactionRecord[]> {
    return this.repository
      .findByPositionId(positionId, db)
      .then((transactions) => transactions.map((transaction) => this.toRecord(transaction)));
  }

  async findByUserWithFilters(
    input: {
      userId: string;
      walletId?: string;
      vaultSlug?: string;
      positionId?: string;
      type?: TransactionType;
      status?: TransactionStatus;
      page?: number;
      limit?: number;
    },
    db?: DbClient,
  ): Promise<{ items: TransactionRecord[]; total: number; page: number; limit: number }> {
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;
    const skip = (page - 1) * limit;

    const result = await this.repository.findByUserWithFilters(
      {
        userId: input.userId,
        walletId: input.walletId,
        vaultSlug: input.vaultSlug,
        positionId: input.positionId,
        type: input.type,
        status: input.status,
        skip,
        take: limit,
      },
      db,
    );

    return {
      items: result.items.map((transaction) =>
        this.toRecord(transaction, transaction.vault?.slug ?? null),
      ),
      total: result.total,
      page,
      limit,
    };
  }

  private toRecord(
    transaction: {
      id: string;
      userId: string;
      walletId: string | null;
      vaultId: string | null;
      positionId: string | null;
      type: TransactionRecord['type'];
      status: TransactionRecord['status'];
      amount: { toString(): string };
      txHash: string | null;
      chainId: number;
      blockNumber: bigint | null;
      metadata: unknown;
      createdAt: Date;
      updatedAt: Date;
    },
    vaultSlug?: string | null,
  ): TransactionRecord {
    return {
      transactionId: transaction.id,
      userId: transaction.userId,
      walletId: transaction.walletId,
      vaultId: transaction.vaultId,
      vaultSlug: vaultSlug ?? null,
      positionId: transaction.positionId,
      type: transaction.type,
      status: transaction.status,
      amount: transaction.amount.toString(),
      txHash: transaction.txHash,
      chainId: transaction.chainId,
      blockNumber: transaction.blockNumber?.toString() ?? null,
      metadata: (transaction.metadata as Record<string, unknown> | null) ?? null,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    };
  }
}
