import { Test, TestingModule } from '@nestjs/testing';
import { TransactionStatus, TransactionType } from '@prisma/client';
import { TransactionsRepository } from './transactions.repository';
import { TransactionsService } from './transactions.service';

describe('TransactionsService', () => {
  let service: TransactionsService;

  const repositoryMock = {
    create: jest.fn(),
    updateStatus: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    repositoryMock.create.mockResolvedValue({
      id: 'tx-1',
      userId: 'user-1',
      walletId: 'wallet-1',
      vaultId: null,
      positionId: null,
      type: TransactionType.APPROVAL,
      status: TransactionStatus.CREATED,
      amount: { toString: () => '1000000' },
      txHash: null,
      chainId: 84532,
      blockNumber: null,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    repositoryMock.updateStatus.mockResolvedValue({
      id: 'tx-1',
      userId: 'user-1',
      walletId: 'wallet-1',
      vaultId: null,
      positionId: null,
      type: TransactionType.APPROVAL,
      status: TransactionStatus.SUBMITTED,
      amount: { toString: () => '1000000' },
      txHash: '0xabc',
      chainId: 84532,
      blockNumber: null,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: TransactionsRepository, useValue: repositoryMock },
      ],
    }).compile();

    service = module.get(TransactionsService);
  });

  it('creates transactions in CREATED status', async () => {
    const record = await service.createTransaction({
      userId: 'user-1',
      walletId: 'wallet-1',
      chainId: 84532,
      type: TransactionType.APPROVAL,
      amount: '1000000',
    });

    expect(record.status).toBe(TransactionStatus.CREATED);
    expect(record.amount).toBe('1000000');
  });

  it('marks transactions as submitted with tx hash', async () => {
    const record = await service.markSubmitted('tx-1', '0xabc');

    expect(record.status).toBe(TransactionStatus.SUBMITTED);
    expect(record.txHash).toBe('0xabc');
  });
});
