export const IDEMPOTENT_METADATA_KEY = 'idempotent';

export const IDEMPOTENCY_HEADER = 'idempotency-key';

export enum IdempotencyOperation {
  Approval = 'approval',
  Deposit = 'deposit',
  Withdrawal = 'withdrawal',
}

export const IDEMPOTENCY_REQUEST_PATHS: Record<IdempotencyOperation, string> = {
  [IdempotencyOperation.Approval]: 'POST /earn/vaults/:vaultId/approve',
  [IdempotencyOperation.Deposit]: 'POST /earn/vaults/:vaultId/deposit',
  [IdempotencyOperation.Withdrawal]: 'POST /earn/positions/:positionId/withdraw',
};
