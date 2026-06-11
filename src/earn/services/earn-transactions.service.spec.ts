import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TransactionStatus, TransactionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TransactionsService } from '../persistence/transactions/transactions.service';
import { EarnTransactionsService } from './earn-transactions.service';
import { ExplorerUrlService } from './explorer-url.service';

describe('EarnTransactionsService', () => {
  let service: EarnTransactionsService;

  const transaction = {
    transactionId: 'tx-1',
    userId: 'user-1',
    walletId: 'wallet-1',
    vaultId: 'vault-db-1',
    vaultSlug: 'aave-base-sepolia-usdc',
    positionId: 'position-1',
    type: TransactionType.DEPOSIT,
    status: TransactionStatus.CONFIRMED,
    amount: '1000000',
    txHash: '0xabc',
    chainId: 84532,
    blockNumber: '18450321',
    metadata: null,
    createdAt: new Date('2026-06-11T12:00:00.000Z'),
    updatedAt: new Date('2026-06-11T12:05:00.000Z'),
  };

  const transactionsServiceMock = {
    findByUserWithFilters: jest.fn(),
    findById: jest.fn(),
  };

  const prismaMock = {
    vault: {
      findUnique: jest.fn(),
    },
  };

  const explorerUrlServiceMock = {
    forTransaction: jest.fn().mockReturnValue('https://sepolia.basescan.org/tx/0xabc'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    transactionsServiceMock.findByUserWithFilters.mockResolvedValue({
      items: [transaction],
      total: 1,
      page: 1,
      limit: 20,
    });
    transactionsServiceMock.findById.mockResolvedValue(transaction);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EarnTransactionsService,
        { provide: TransactionsService, useValue: transactionsServiceMock },
        { provide: PrismaService, useValue: prismaMock },
        { provide: ExplorerUrlService, useValue: explorerUrlServiceMock },
      ],
    }).compile();

    service = module.get(EarnTransactionsService);
  });

  it('lists transactions with explorer URLs', async () => {
    const result = await service.listTransactions('user-1', {});

    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({
      transactionId: 'tx-1',
      vaultId: 'aave-base-sepolia-usdc',
      explorerUrl: 'https://sepolia.basescan.org/tx/0xabc',
      confirmedAt: '2026-06-11T12:05:00.000Z',
    });
  });

  it('returns a transaction owned by the user', async () => {
    const result = await service.getTransaction('user-1', 'tx-1');

    expect(result.transactionId).toBe('tx-1');
  });

  it('rejects access to transactions not owned by the user', async () => {
    await expect(service.getTransaction('other-user', 'tx-1')).rejects.toThrow(
      NotFoundException,
    );
  });
});
