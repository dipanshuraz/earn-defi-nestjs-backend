import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PositionStatus, TransactionStatus, TransactionType } from '@prisma/client';
import { EARN_PROTOCOL_PROVIDER } from '../../protocols/earn-protocol-provider.interface';
import { PositionsService } from '../persistence/positions/positions.service';
import { TransactionsService } from '../persistence/transactions/transactions.service';
import { EarnPositionsService } from './earn-positions.service';
import { EarnTransactionsService } from './earn-transactions.service';

describe('EarnPositionsService', () => {
  let service: EarnPositionsService;

  const positionsServiceMock = {
    findByUserWithFilters: jest.fn(),
    findByIdWithVault: jest.fn(),
  };

  const transactionsServiceMock = {
    findByPositionId: jest.fn(),
  };

  const earnTransactionsServiceMock = {
    mapTransactions: jest.fn(),
  };

  const earnProtocolProviderMock = {
    getVault: jest.fn(),
  };

  const positionWithVault = {
    id: 'position-1',
    userId: 'user-1',
    vaultId: 'db-vault-1',
    status: PositionStatus.ACTIVE,
    depositedAmount: { toString: () => '1000000' },
    currentAmount: { toString: () => '1000000' },
    shares: { toString: () => '1000000' },
    createdAt: new Date('2026-06-11T12:00:00.000Z'),
    updatedAt: new Date('2026-06-11T12:00:00.000Z'),
    vault: {
      id: 'db-vault-1',
      slug: 'aave-base-sepolia-usdc',
      name: 'Aave V3 USDC',
      chainId: 84532,
      assetSymbol: 'USDC',
      assetDecimals: 6,
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    positionsServiceMock.findByUserWithFilters.mockResolvedValue([positionWithVault]);
    positionsServiceMock.findByIdWithVault.mockResolvedValue(positionWithVault);
    transactionsServiceMock.findByPositionId.mockResolvedValue([
      {
        transactionId: 'tx-1',
        userId: 'user-1',
        walletId: 'wallet-1',
        vaultId: 'db-vault-1',
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
      },
    ]);
    earnTransactionsServiceMock.mapTransactions.mockReturnValue([
      {
        transactionId: 'tx-1',
        status: TransactionStatus.CONFIRMED,
      },
    ]);
    earnProtocolProviderMock.getVault.mockResolvedValue({
      vaultId: 'aave-base-sepolia-usdc',
      sharePrice: '1.02735',
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EarnPositionsService,
        { provide: PositionsService, useValue: positionsServiceMock },
        { provide: TransactionsService, useValue: transactionsServiceMock },
        { provide: EarnTransactionsService, useValue: earnTransactionsServiceMock },
        { provide: EARN_PROTOCOL_PROVIDER, useValue: earnProtocolProviderMock },
      ],
    }).compile();

    service = module.get(EarnPositionsService);
  });

  it('lists positions with filters', async () => {
    const positions = await service.listPositions('user-1', {
      vaultId: 'aave-base-sepolia-usdc',
      status: PositionStatus.ACTIVE,
    });

    expect(positions).toHaveLength(1);
    expect(positionsServiceMock.findByUserWithFilters).toHaveBeenCalledWith({
      userId: 'user-1',
      vaultSlug: 'aave-base-sepolia-usdc',
      status: PositionStatus.ACTIVE,
      walletId: undefined,
    });
  });

  it('returns position detail with transactions', async () => {
    const position = await service.getPosition('user-1', 'position-1');

    expect(position.positionId).toBe('position-1');
    expect(position.transactions).toHaveLength(1);
    expect(earnTransactionsServiceMock.mapTransactions).toHaveBeenCalled();
  });

  it('rejects access to positions not owned by the user', async () => {
    positionsServiceMock.findByIdWithVault.mockResolvedValueOnce({
      ...positionWithVault,
      userId: 'other-user',
    });

    await expect(service.getPosition('user-1', 'position-1')).rejects.toThrow(
      NotFoundException,
    );
  });
});
