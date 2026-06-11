import { Test, TestingModule } from '@nestjs/testing';
import { PositionStatus, TransactionStatus, TransactionType } from '@prisma/client';
import { EarnBlockchainService } from '../earn/services/earn-blockchain.service';
import { PositionsService } from '../earn/persistence/positions/positions.service';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionsService } from '../earn/persistence/transactions/transactions.service';
import { AuditService } from '../audit/audit.service';
import { ReconciliationLockService } from './reconciliation-lock.service';
import { TransactionReconciliationService } from './transaction-reconciliation.service';

describe('TransactionReconciliationService', () => {
  let service: TransactionReconciliationService;

  const transactionsServiceMock = {
    findPendingReconciliation: jest.fn(),
    findStaleCreated: jest.fn(),
    markConfirmed: jest.fn(),
    confirmSubmitted: jest.fn(),
    markReverted: jest.fn(),
    markFailed: jest.fn(),
  };

  const positionsServiceMock = {
    findById: jest.fn(),
    activate: jest.fn(),
    addDeposit: jest.fn(),
    close: jest.fn(),
    markFailed: jest.fn(),
    markActive: jest.fn(),
    subtractWithdraw: jest.fn(),
  };

  const earnBlockchainServiceMock = {
    getTransactionReceiptWithRetry: jest.fn(),
  };

  const reconciliationLockServiceMock = {
    acquire: jest.fn().mockResolvedValue(true),
    release: jest.fn().mockResolvedValue(undefined),
  };

  const auditServiceMock = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  const prismaTransactionMock = jest.fn(async (callback: (tx: object) => Promise<unknown>) =>
    callback({}),
  );

  const prismaMock = {
    $transaction: prismaTransactionMock,
  };

  const submittedDeposit = {
    transactionId: 'tx-1',
    userId: 'user-1',
    walletId: 'wallet-1',
    vaultId: 'vault-1',
    positionId: 'position-1',
    type: TransactionType.DEPOSIT,
    status: TransactionStatus.SUBMITTED,
    amount: '1000000',
    txHash: '0xdeposithash',
    chainId: 84532,
    blockNumber: null,
    metadata: { estimatedShares: '980392156862745098' },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    transactionsServiceMock.findStaleCreated.mockResolvedValue([]);
    transactionsServiceMock.findPendingReconciliation.mockResolvedValue([submittedDeposit]);
    earnBlockchainServiceMock.getTransactionReceiptWithRetry.mockResolvedValue({
      status: 'success',
      blockNumber: 18_450_321n,
      gasUsed: 120_000n,
    });
    positionsServiceMock.findById.mockResolvedValue({
      positionId: 'position-1',
      status: PositionStatus.PENDING,
      depositedAmount: '0',
      currentAmount: '0',
      shares: '0',
      userId: 'user-1',
      vaultId: 'vault-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    transactionsServiceMock.confirmSubmitted.mockResolvedValue({
      applied: true,
      transaction: {
        ...submittedDeposit,
        status: TransactionStatus.CONFIRMED,
      },
    });
    positionsServiceMock.activate.mockResolvedValue({
      positionId: 'position-1',
      status: PositionStatus.ACTIVE,
      depositedAmount: '1000000',
      currentAmount: '1000000',
      shares: '980392156862745098',
      userId: 'user-1',
      vaultId: 'vault-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionReconciliationService,
        { provide: TransactionsService, useValue: transactionsServiceMock },
        { provide: PositionsService, useValue: positionsServiceMock },
        { provide: EarnBlockchainService, useValue: earnBlockchainServiceMock },
        { provide: PrismaService, useValue: prismaMock },
        { provide: ReconciliationLockService, useValue: reconciliationLockServiceMock },
        { provide: AuditService, useValue: auditServiceMock },
      ],
    }).compile();

    service = module.get(TransactionReconciliationService);
  });

  it('confirms submitted deposit transactions and activates pending positions', async () => {
    const summary = await service.reconcilePendingTransactions();

    expect(summary).toMatchObject({
      scanned: 1,
      confirmed: 1,
      reverted: 0,
      failed: 0,
      pending: 0,
    });
    expect(earnBlockchainServiceMock.getTransactionReceiptWithRetry).toHaveBeenCalledWith(
      84532,
      '0xdeposithash',
    );
    expect(transactionsServiceMock.confirmSubmitted).toHaveBeenCalled();
    expect(positionsServiceMock.addDeposit).not.toHaveBeenCalled();
    expect(positionsServiceMock.activate).toHaveBeenCalledWith(
      'position-1',
      {
        depositedAmount: '1000000',
        currentAmount: '1000000',
        shares: '980392156862745098',
      },
      expect.any(Object),
    );
  });

  it('leaves transactions pending when no receipt is available', async () => {
    earnBlockchainServiceMock.getTransactionReceiptWithRetry.mockResolvedValueOnce(null);

    const summary = await service.reconcilePendingTransactions();

    expect(summary.pending).toBe(1);
    expect(summary.confirmed).toBe(0);
    expect(transactionsServiceMock.confirmSubmitted).not.toHaveBeenCalled();
  });

  it('reverts deposit transactions and marks pending positions as failed', async () => {
    earnBlockchainServiceMock.getTransactionReceiptWithRetry.mockResolvedValueOnce({
      status: 'reverted',
      blockNumber: 18_450_322n,
      gasUsed: 45_000n,
    });

    const summary = await service.reconcilePendingTransactions();

    expect(summary.reverted).toBe(1);
    expect(transactionsServiceMock.markReverted).toHaveBeenCalled();
    expect(positionsServiceMock.markFailed).toHaveBeenCalledWith('position-1', expect.any(Object));
  });

  it('confirms submitted withdraw transactions and updates positions', async () => {
    const withdrawTx = {
      ...submittedDeposit,
      transactionId: 'tx-withdraw-1',
      type: TransactionType.WITHDRAW,
      amount: '500000',
      metadata: { sharesBurned: '490196078431372549' },
    };

    transactionsServiceMock.findPendingReconciliation.mockResolvedValueOnce([withdrawTx]);
    transactionsServiceMock.confirmSubmitted.mockResolvedValueOnce({
      applied: true,
      transaction: {
        ...withdrawTx,
        status: TransactionStatus.CONFIRMED,
      },
    });
    positionsServiceMock.findById.mockResolvedValueOnce({
      positionId: 'position-1',
      status: PositionStatus.WITHDRAWING,
      depositedAmount: '1000000',
      currentAmount: '1000000',
      shares: '1000000',
      userId: 'user-1',
      vaultId: 'vault-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    positionsServiceMock.subtractWithdraw.mockResolvedValueOnce({
      positionId: 'position-1',
      status: PositionStatus.CLOSED,
      depositedAmount: '0',
      currentAmount: '0',
      shares: '0',
      userId: 'user-1',
      vaultId: 'vault-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const summary = await service.reconcilePendingTransactions();

    expect(summary.confirmed).toBe(1);
    expect(positionsServiceMock.subtractWithdraw).toHaveBeenCalledWith(
      'position-1',
      {
        withdrawnAmount: '500000',
        shares: '490196078431372549',
      },
      expect.any(Object),
    );
  });

  it('marks stale created transactions as failed', async () => {
    transactionsServiceMock.findPendingReconciliation.mockResolvedValueOnce([]);
    transactionsServiceMock.findStaleCreated.mockResolvedValueOnce([
      {
        ...submittedDeposit,
        status: TransactionStatus.CREATED,
        txHash: null,
        positionId: 'position-1',
      },
    ]);
    positionsServiceMock.findById.mockResolvedValueOnce({
      positionId: 'position-1',
      status: PositionStatus.PENDING,
      depositedAmount: '0',
      currentAmount: '0',
      shares: '0',
      userId: 'user-1',
      vaultId: 'vault-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const summary = await service.reconcilePendingTransactions();

    expect(summary.failed).toBe(1);
    expect(transactionsServiceMock.markFailed).toHaveBeenCalled();
    expect(positionsServiceMock.markFailed).toHaveBeenCalledWith('position-1');
  });
});
