import { Test, TestingModule } from '@nestjs/testing';
import { PositionStatus, TransactionStatus } from '@prisma/client';
import { EarnPositionsController } from './earn-positions.controller';
import { EarnPositionsService } from '../services/earn-positions.service';
import { EarnWithdrawService } from '../services/earn-withdraw.service';

describe('EarnPositionsController', () => {
  let controller: EarnPositionsController;

  const earnPositionsServiceMock = {
    listPositions: jest.fn(),
    getPosition: jest.fn(),
  };

  const earnWithdrawServiceMock = {
    withdrawPosition: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EarnPositionsController],
      providers: [
        { provide: EarnPositionsService, useValue: earnPositionsServiceMock },
        { provide: EarnWithdrawService, useValue: earnWithdrawServiceMock },
      ],
    }).compile();

    controller = module.get(EarnPositionsController);
  });

  it('lists positions for the authenticated user', async () => {
    earnPositionsServiceMock.listPositions.mockResolvedValue([
      {
        positionId: 'position-1',
        status: PositionStatus.ACTIVE,
        currentValue: '1007205',
      },
    ]);

    const positions = await controller.listPositions(
      {
        userId: 'user-1',
        email: 'user@example.com',
      },
      {},
    );

    expect(positions).toHaveLength(1);
    expect(earnPositionsServiceMock.listPositions).toHaveBeenCalledWith('user-1', {});
  });

  it('returns a position by id for the authenticated user', async () => {
    earnPositionsServiceMock.getPosition.mockResolvedValue({
      positionId: 'position-1',
      status: PositionStatus.ACTIVE,
      currentValue: '1007350',
    });

    const position = await controller.getPosition(
      { userId: 'user-1', email: 'user@example.com' },
      'position-1',
    );

    expect(position.positionId).toBe('position-1');
    expect(earnPositionsServiceMock.getPosition).toHaveBeenCalledWith(
      'user-1',
      'position-1',
    );
  });

  it('submits withdrawal for the authenticated user', async () => {
    earnWithdrawServiceMock.withdrawPosition.mockResolvedValue({
      positionId: 'position-1',
      status: TransactionStatus.CONFIRMED,
      fullWithdraw: false,
    });

    const result = await controller.withdrawPosition(
      { userId: 'user-1', email: 'user@example.com' },
      'position-1',
      { walletId: 'wallet-1', amount: '500000' },
    );

    expect(result.status).toBe(TransactionStatus.CONFIRMED);
    expect(earnWithdrawServiceMock.withdrawPosition).toHaveBeenCalledWith(
      'user-1',
      'position-1',
      { walletId: 'wallet-1', amount: '500000' },
    );
  });
});
