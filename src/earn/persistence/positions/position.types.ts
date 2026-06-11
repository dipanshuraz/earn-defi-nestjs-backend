import { PositionStatus } from '@prisma/client';

export interface CreatePositionInput {
  userId: string;
  vaultId: string;
  status?: PositionStatus;
}

export interface ActivatePositionInput {
  depositedAmount: string;
  currentAmount: string;
  shares: string;
}

export interface WithdrawPositionInput {
  withdrawnAmount: string;
  shares: string;
}

export interface PositionRecord {
  positionId: string;
  userId: string;
  vaultId: string;
  status: PositionStatus;
  depositedAmount: string;
  currentAmount: string;
  shares: string;
  createdAt: Date;
  updatedAt: Date;
}
