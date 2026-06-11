import { Injectable } from '@nestjs/common';
import { Position, PositionStatus, Prisma, Vault } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  ActivatePositionInput,
  CreatePositionInput,
  WithdrawPositionInput,
} from './position.types';

type DbClient = Prisma.TransactionClient | PrismaService;

export type PositionWithVault = Position & { vault: Vault };

@Injectable()
export class PositionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUserAndVault(
    userId: string,
    vaultId: string,
    db: DbClient = this.prisma,
  ): Promise<Position | null> {
    return db.position.findUnique({
      where: {
        userId_vaultId: {
          userId,
          vaultId,
        },
      },
    });
  }

  findById(positionId: string, db: DbClient = this.prisma): Promise<Position | null> {
    return db.position.findUnique({
      where: { id: positionId },
    });
  }

  findByIdWithVault(
    positionId: string,
    db: DbClient = this.prisma,
  ): Promise<PositionWithVault | null> {
    return db.position.findUnique({
      where: { id: positionId },
      include: { vault: true },
    });
  }

  findByUserIdWithVaults(
    userId: string,
    db: DbClient = this.prisma,
  ): Promise<PositionWithVault[]> {
    return this.findByUserWithFilters({ userId }, db);
  }

  findByUserWithFilters(
    input: {
      userId: string;
      vaultSlug?: string;
      status?: PositionStatus;
      walletId?: string;
    },
    db: DbClient = this.prisma,
  ): Promise<PositionWithVault[]> {
    const where: Prisma.PositionWhereInput = {
      userId: input.userId,
    };

    if (input.status) {
      where.status = input.status;
    }

    if (input.vaultSlug) {
      where.vault = { slug: input.vaultSlug };
    }

    if (input.walletId) {
      where.transactions = {
        some: {
          walletId: input.walletId,
        },
      };
    }

    return db.position.findMany({
      where,
      include: { vault: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  create(
    input: CreatePositionInput,
    db: DbClient = this.prisma,
  ): Promise<Position> {
    return db.position.create({
      data: {
        userId: input.userId,
        vaultId: input.vaultId,
        status: input.status ?? PositionStatus.PENDING,
      },
    });
  }

  activate(
    positionId: string,
    input: ActivatePositionInput,
    db: DbClient = this.prisma,
  ): Promise<Position> {
    return db.position.update({
      where: { id: positionId },
      data: {
        status: PositionStatus.ACTIVE,
        depositedAmount: input.depositedAmount,
        currentAmount: input.currentAmount,
        shares: input.shares,
      },
    });
  }

  close(positionId: string, db: DbClient = this.prisma): Promise<Position> {
    return db.position.update({
      where: { id: positionId },
      data: {
        status: PositionStatus.CLOSED,
      },
    });
  }

  markWithdrawing(positionId: string, db: DbClient = this.prisma): Promise<Position> {
    return db.position.update({
      where: { id: positionId },
      data: {
        status: PositionStatus.WITHDRAWING,
      },
    });
  }

  markActive(positionId: string, db: DbClient = this.prisma): Promise<Position> {
    return db.position.update({
      where: { id: positionId },
      data: {
        status: PositionStatus.ACTIVE,
      },
    });
  }

  markFailed(positionId: string, db: DbClient = this.prisma): Promise<Position> {
    return db.position.update({
      where: { id: positionId },
      data: {
        status: PositionStatus.FAILED,
      },
    });
  }

  addDeposit(
    positionId: string,
    input: ActivatePositionInput,
    db: DbClient = this.prisma,
  ): Promise<Position> {
    const position = db.position.update({
      where: { id: positionId },
      data: {
        status: PositionStatus.ACTIVE,
        depositedAmount: { increment: input.depositedAmount },
        currentAmount: { increment: input.currentAmount },
        shares: { increment: input.shares },
      },
    });

    return position;
  }

  async subtractWithdraw(
    positionId: string,
    input: WithdrawPositionInput,
    db: DbClient = this.prisma,
  ): Promise<Position> {
    const existing = await db.position.findUnique({
      where: { id: positionId },
    });

    if (!existing) {
      throw new Error(`Position not found: ${positionId}`);
    }

    const remainingShares = BigInt(existing.shares.toString()) - BigInt(input.shares);
    const remainingCurrent =
      BigInt(existing.currentAmount.toString()) - BigInt(input.withdrawnAmount);
    const remainingDeposited =
      BigInt(existing.depositedAmount.toString()) - BigInt(input.withdrawnAmount);

    if (remainingShares <= 0n) {
      return db.position.update({
        where: { id: positionId },
        data: {
          status: PositionStatus.CLOSED,
          depositedAmount: '0',
          currentAmount: '0',
          shares: '0',
        },
      });
    }

    return db.position.update({
      where: { id: positionId },
      data: {
        status: PositionStatus.ACTIVE,
        depositedAmount: remainingDeposited.toString(),
        currentAmount: remainingCurrent.toString(),
        shares: remainingShares.toString(),
      },
    });
  }
}
