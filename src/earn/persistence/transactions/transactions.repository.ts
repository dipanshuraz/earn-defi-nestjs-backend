import { Injectable } from '@nestjs/common';
import { Prisma, Transaction, TransactionStatus, TransactionType, Vault } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateTransactionInput } from './transaction.types';

type DbClient = Prisma.TransactionClient | PrismaService;

@Injectable()
export class TransactionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: CreateTransactionInput, db: DbClient = this.prisma): Promise<Transaction> {
    return db.transaction.create({
      data: {
        userId: input.userId,
        walletId: input.walletId,
        vaultId: input.vaultId,
        positionId: input.positionId,
        type: input.type,
        status: TransactionStatus.CREATED,
        amount: input.amount,
        chainId: input.chainId,
        metadata: input.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }

  findOpenDeposit(
    userId: string,
    vaultId: string,
    db: DbClient = this.prisma,
  ): Promise<Transaction | null> {
    return db.transaction.findFirst({
      where: {
        userId,
        vaultId,
        type: TransactionType.DEPOSIT,
        status: {
          in: [TransactionStatus.CREATED, TransactionStatus.SUBMITTED],
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOpenWithdraw(
    positionId: string,
    db: DbClient = this.prisma,
  ): Promise<Transaction | null> {
    return db.transaction.findFirst({
      where: {
        positionId,
        type: TransactionType.WITHDRAW,
        status: {
          in: [TransactionStatus.CREATED, TransactionStatus.SUBMITTED],
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  updateStatus(
    transactionId: string,
    data: {
      status: TransactionStatus;
      txHash?: string | null;
      blockNumber?: bigint | null;
      metadata?: Prisma.InputJsonValue;
    },
    db: DbClient = this.prisma,
  ): Promise<Transaction> {
    return db.transaction.update({
      where: { id: transactionId },
      data: {
        status: data.status,
        txHash: data.txHash,
        blockNumber: data.blockNumber,
        metadata: data.metadata,
      },
    });
  }

  async confirmSubmitted(
    transactionId: string,
    blockNumber: bigint,
    metadata: Prisma.InputJsonValue | undefined,
    db: DbClient = this.prisma,
  ): Promise<{ applied: boolean; transaction: Transaction }> {
    const result = await db.transaction.updateMany({
      where: {
        id: transactionId,
        status: TransactionStatus.SUBMITTED,
      },
      data: {
        status: TransactionStatus.CONFIRMED,
        blockNumber,
        metadata,
      },
    });

    const transaction = await db.transaction.findUniqueOrThrow({
      where: { id: transactionId },
    });

    return {
      applied: result.count > 0,
      transaction,
    };
  }

  findById(transactionId: string, db: DbClient = this.prisma): Promise<Transaction | null> {
    return db.transaction.findUnique({
      where: { id: transactionId },
    });
  }

  findPendingReconciliation(
    limit = 100,
    db: DbClient = this.prisma,
  ): Promise<Transaction[]> {
    return db.transaction.findMany({
      where: {
        status: TransactionStatus.SUBMITTED,
        txHash: { not: null },
      },
      orderBy: { updatedAt: 'asc' },
      take: limit,
    });
  }

  findStaleCreated(
    olderThan: Date,
    limit = 50,
    db: DbClient = this.prisma,
  ): Promise<Transaction[]> {
    return db.transaction.findMany({
      where: {
        status: TransactionStatus.CREATED,
        txHash: null,
        createdAt: { lt: olderThan },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  findByPositionId(
    positionId: string,
    db: DbClient = this.prisma,
  ): Promise<Transaction[]> {
    return db.transaction.findMany({
      where: { positionId },
      orderBy: { createdAt: 'desc' },
    });
  }

  findByUserWithFilters(
    input: {
      userId: string;
      walletId?: string;
      vaultSlug?: string;
      positionId?: string;
      type?: TransactionType;
      status?: TransactionStatus;
      skip: number;
      take: number;
    },
    db: DbClient = this.prisma,
  ): Promise<{ items: Array<Transaction & { vault: Vault | null }>; total: number }> {
    const where: Prisma.TransactionWhereInput = {
      userId: input.userId,
    };

    if (input.walletId) {
      where.walletId = input.walletId;
    }

    if (input.positionId) {
      where.positionId = input.positionId;
    }

    if (input.type) {
      where.type = input.type;
    }

    if (input.status) {
      where.status = input.status;
    }

    if (input.vaultSlug) {
      where.vault = { slug: input.vaultSlug };
    }

    return Promise.all([
      db.transaction.findMany({
        where,
        include: { vault: true },
        orderBy: { createdAt: 'desc' },
        skip: input.skip,
        take: input.take,
      }),
      db.transaction.count({ where }),
    ]).then(([items, total]) => ({ items, total }));
  }
}
