import { Injectable } from '@nestjs/common';
import { PositionStatus, Prisma } from '@prisma/client';
import { PositionsRepository, PositionWithVault } from './positions.repository';
import {
  ActivatePositionInput,
  CreatePositionInput,
  PositionRecord,
  WithdrawPositionInput,
} from './position.types';

type DbClient = Prisma.TransactionClient;

@Injectable()
export class PositionsService {
  constructor(private readonly repository: PositionsRepository) {}

  findByUserAndVault(
    userId: string,
    vaultId: string,
    db?: DbClient,
  ): Promise<PositionRecord | null> {
    return this.repository
      .findByUserAndVault(userId, vaultId, db)
      .then((position) => (position ? this.toRecord(position) : null));
  }

  findById(positionId: string, db?: DbClient): Promise<PositionRecord | null> {
    return this.repository
      .findById(positionId, db)
      .then((position) => (position ? this.toRecord(position) : null));
  }

  findByIdWithVault(positionId: string, db?: DbClient): Promise<PositionWithVault | null> {
    return this.repository.findByIdWithVault(positionId, db);
  }

  findByUserIdWithVaults(userId: string, db?: DbClient): Promise<PositionWithVault[]> {
    return this.repository.findByUserIdWithVaults(userId, db);
  }

  findByUserWithFilters(
    input: {
      userId: string;
      vaultSlug?: string;
      status?: PositionStatus;
      walletId?: string;
    },
    db?: DbClient,
  ): Promise<PositionWithVault[]> {
    return this.repository.findByUserWithFilters(input, db);
  }

  async createPending(
    input: CreatePositionInput,
    db?: DbClient,
  ): Promise<PositionRecord> {
    const position = await this.repository.create(
      { ...input, status: PositionStatus.PENDING },
      db,
    );

    return this.toRecord(position);
  }

  async activate(
    positionId: string,
    input: ActivatePositionInput,
    db?: DbClient,
  ): Promise<PositionRecord> {
    const position = await this.repository.activate(positionId, input, db);
    return this.toRecord(position);
  }

  async addDeposit(
    positionId: string,
    input: ActivatePositionInput,
    db?: DbClient,
  ): Promise<PositionRecord> {
    const position = await this.repository.addDeposit(positionId, input, db);
    return this.toRecord(position);
  }

  async close(positionId: string, db?: DbClient): Promise<PositionRecord> {
    const position = await this.repository.close(positionId, db);
    return this.toRecord(position);
  }

  async markWithdrawing(positionId: string, db?: DbClient): Promise<PositionRecord> {
    const position = await this.repository.markWithdrawing(positionId, db);
    return this.toRecord(position);
  }

  async markActive(positionId: string, db?: DbClient): Promise<PositionRecord> {
    const position = await this.repository.markActive(positionId, db);
    return this.toRecord(position);
  }

  async markFailed(positionId: string, db?: DbClient): Promise<PositionRecord> {
    const position = await this.repository.markFailed(positionId, db);
    return this.toRecord(position);
  }

  async subtractWithdraw(
    positionId: string,
    input: WithdrawPositionInput,
    db?: DbClient,
  ): Promise<PositionRecord> {
    const position = await this.repository.subtractWithdraw(positionId, input, db);
    return this.toRecord(position);
  }

  private toRecord(position: {
    id: string;
    userId: string;
    vaultId: string;
    status: PositionStatus;
    depositedAmount: { toString(): string };
    currentAmount: { toString(): string };
    shares: { toString(): string };
    createdAt: Date;
    updatedAt: Date;
  }): PositionRecord {
    return {
      positionId: position.id,
      userId: position.userId,
      vaultId: position.vaultId,
      status: position.status,
      depositedAmount: position.depositedAmount.toString(),
      currentAmount: position.currentAmount.toString(),
      shares: position.shares.toString(),
      createdAt: position.createdAt,
      updatedAt: position.updatedAt,
    };
  }
}
