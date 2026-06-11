import { TransactionStatus, TransactionType } from '@prisma/client';

export interface CreateTransactionInput {
  userId: string;
  walletId: string;
  chainId: number;
  type: TransactionType;
  amount: string;
  vaultId?: string;
  positionId?: string;
  metadata?: Record<string, unknown>;
}

export interface TransactionRecord {
  transactionId: string;
  userId: string;
  walletId: string | null;
  vaultId: string | null;
  vaultSlug?: string | null;
  positionId: string | null;
  type: TransactionType;
  status: TransactionStatus;
  amount: string;
  txHash: string | null;
  chainId: number;
  blockNumber: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export { TransactionStatus, TransactionType };
