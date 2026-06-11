import { HttpStatus } from '@nestjs/common';
import { ApiException } from '../../common/exceptions/api.exception';

export class DepositInProgressException extends ApiException {
  constructor(vaultId: string) {
    super(HttpStatus.CONFLICT, {
      message: `A deposit is already in progress for vault: ${vaultId}`,
      code: 'DEPOSIT_IN_PROGRESS',
      details: { vaultId },
    });
  }
}

export class InsufficientBalanceException extends ApiException {
  constructor(required: string, available: string) {
    super(HttpStatus.BAD_REQUEST, {
      message: `Insufficient balance: required ${required}, available ${available}`,
      code: 'INSUFFICIENT_BALANCE',
      details: { required, available },
    });
  }
}

export class InsufficientAllowanceException extends ApiException {
  constructor(required: string, available: string) {
    super(HttpStatus.BAD_REQUEST, {
      message: `Insufficient allowance: required ${required}, available ${available}. Call POST /earn/vaults/:vaultId/approve first.`,
      code: 'APPROVAL_REQUIRED',
      details: { required, available },
    });
  }
}
