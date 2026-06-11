import { Test, TestingModule } from '@nestjs/testing';
import { TransactionStatus, TransactionType } from '@prisma/client';
import { EarnTransactionsController } from './earn-transactions.controller';
import { EarnTransactionsService } from '../services/earn-transactions.service';

describe('EarnTransactionsController', () => {
  let controller: EarnTransactionsController;

  const earnTransactionsServiceMock = {
    listTransactions: jest.fn(),
    getTransaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EarnTransactionsController],
      providers: [
        { provide: EarnTransactionsService, useValue: earnTransactionsServiceMock },
      ],
    }).compile();

    controller = module.get(EarnTransactionsController);
  });

  it('lists transactions for the authenticated user', async () => {
    earnTransactionsServiceMock.listTransactions.mockResolvedValue({
      items: [{ transactionId: 'tx-1', status: TransactionStatus.CONFIRMED }],
      page: 1,
      limit: 20,
      total: 1,
    });

    const result = await controller.listTransactions(
      { userId: 'user-1', email: 'user@example.com' },
      {},
    );

    expect(result.items).toHaveLength(1);
    expect(earnTransactionsServiceMock.listTransactions).toHaveBeenCalledWith('user-1', {});
  });

  it('returns a transaction by id', async () => {
    earnTransactionsServiceMock.getTransaction.mockResolvedValue({
      transactionId: 'tx-1',
      type: TransactionType.DEPOSIT,
    });

    const result = await controller.getTransaction(
      { userId: 'user-1', email: 'user@example.com' },
      'tx-1',
    );

    expect(result.transactionId).toBe('tx-1');
  });
});
