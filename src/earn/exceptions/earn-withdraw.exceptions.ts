import { BadRequestException, ConflictException } from '@nestjs/common';

export class WithdrawInProgressException extends ConflictException {
  constructor(positionId: string) {
    super(`A withdrawal is already in progress for position: ${positionId}`);
  }
}

export class InsufficientPositionBalanceException extends BadRequestException {
  constructor(required: string, available: string) {
    super(`Insufficient position balance: required ${required}, available ${available}`);
  }
}

export class PositionNotActiveException extends BadRequestException {
  constructor(positionId: string) {
    super(`Position is not active: ${positionId}`);
  }
}
