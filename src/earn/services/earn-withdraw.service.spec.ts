import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PositionStatus, TransactionStatus, TransactionType } from '@prisma/client';
import { EARN_PROTOCOL_PROVIDER } from '../../protocols/earn-protocol-provider.interface';
import { PositionsService } from '../persistence/positions/positions.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TransactionsService } from '../persistence/transactions/transactions.service';
import { WALLET_PROVIDER } from '../../wallets/providers/wallet-provider.interface';
import { EarnBlockchainService } from './earn-blockchain.service';
import { AuditService } from '../../audit/audit.service';
import { EarnTransactionValidationService } from './earn-transaction-validation.service';
import { EarnWithdrawService } from './earn-withdraw.service';
import { EarnMutationRateLimitService } from './earn-mutation-rate-limit.service';
import { ExplorerUrlService } from './explorer-url.service';
import {
  InsufficientPositionBalanceException,
  PositionNotActiveException,
  WithdrawInProgressException,
} from '../exceptions/earn-withdraw.exceptions';

describe('EarnWithdrawService', () => {
  let service: EarnWithdrawService;

  const vault = {
    vaultId: 'aave-base-sepolia-usdc',
    protocol: 'aave' as const,
    chainId: 84532,
    contractAddress: '0x8bAB6d1b75f19e9eD9fCe8b9BD338844fF79aE27',
    shareTokenAddress: '0x10F1A9D11CDf50041f3f8cB7191CBE2f31750ACC',
    name: 'Aave V3 USDC',
    symbol: 'aBasUSDC',
    assetSymbol: 'USDC',
    assetDecimals: 6,
    assetAddress: '0xba50Cd2A20f6DA35D788639E581bca8d0B5d4D5f',
    apy: '3.2500',
    tvl: '1000000',
    sharePrice: '1',
    totalSupply: '1000000',
    metadata: {},
    isEnabled: true,
    depositEnabled: true,
    withdrawEnabled: true,
    riskLevel: 'medium' as const,
  };

  const wallet = {
    id: 'wallet-1',
    userId: 'user-1',
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
    chainId: 84532,
    walletType: 'EMBEDDED' as const,
    providerId: 'privy-wallet-1',
    providerType: 'PRIVY' as const,
    isPrimary: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const positionWithVault = {
    id: 'position-1',
    userId: 'user-1',
    vaultId: 'db-vault-1',
    status: PositionStatus.ACTIVE,
    depositedAmount: { toString: () => '1000000' },
    currentAmount: { toString: () => '1000000' },
    shares: { toString: () => '1000000' },
    createdAt: new Date(),
    updatedAt: new Date(),
    vault: {
      id: 'db-vault-1',
      slug: vault.vaultId,
      name: vault.name,
      chainId: 84532,
      assetSymbol: 'USDC',
      assetDecimals: 6,
    },
  };

  const positionsServiceMock = {
    findByIdWithVault: jest.fn(),
  };

  const earnProtocolProviderMock = {
    getVault: jest.fn(),
  };

  const earnTransactionValidationServiceMock = {
    assertWithdrawEnabled: jest.fn(),
    assertChainMatchesEnvironment: jest.fn(),
    assertVaultBelongsToChain: jest.fn(),
    assertRpcBelongsToChain: jest.fn(),
    assertWalletBelongsToUser: jest.fn(),
    assertWalletChainMatchesVault: jest.fn(),
  };
  const earnMutationRateLimitServiceMock = { assertWithdrawAllowed: jest.fn() };
  const explorerUrlServiceMock = {
    forTransaction: jest.fn().mockReturnValue('https://sepolia.basescan.org/tx/0xwithdrawhash'),
  };
  const auditServiceMock = { log: jest.fn().mockResolvedValue(undefined) };

  const walletProviderMock = {
    sendTransaction: jest.fn(),
  };

  const earnBlockchainServiceMock = {
    previewWithdrawShares: jest.fn(),
    readVaultShareBalance: jest.fn(),
    encodeVaultWithdraw: jest.fn().mockReturnValue('0xwithdraw'),
    waitForTransactionReceipt: jest.fn(),
  };

  const transactionsServiceMock = {
    hasOpenWithdraw: jest.fn(),
    createTransaction: jest.fn(),
    markSubmitted: jest.fn(),
    confirmSubmitted: jest.fn(),
    markFailed: jest.fn(),
    markReverted: jest.fn(),
  };

  const positionsSubtractMock = {
    subtractWithdraw: jest.fn(),
    markWithdrawing: jest.fn(),
    markActive: jest.fn(),
  };

  const prismaTransactionMock = jest.fn(async (callback: (tx: object) => Promise<unknown>) =>
    callback({}),
  );

  const prismaMock = {
    $transaction: prismaTransactionMock,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    positionsServiceMock.findByIdWithVault.mockResolvedValue(positionWithVault);
    earnProtocolProviderMock.getVault.mockResolvedValue(vault);
    earnTransactionValidationServiceMock.assertWalletBelongsToUser.mockResolvedValue(wallet);
    transactionsServiceMock.hasOpenWithdraw.mockResolvedValue(false);
    earnBlockchainServiceMock.previewWithdrawShares.mockResolvedValue(500_000n);
    earnBlockchainServiceMock.readVaultShareBalance.mockResolvedValue(1_000_000n);
    walletProviderMock.sendTransaction.mockResolvedValue({
      hash: '0xwithdrawhash',
      transactionId: 'privy-tx-3',
    });
    earnBlockchainServiceMock.waitForTransactionReceipt.mockResolvedValue({
      status: 'success',
      blockNumber: 18_450_322n,
      gasUsed: 95_000n,
    });

    transactionsServiceMock.createTransaction.mockResolvedValue({
      transactionId: 'tx-withdraw-1',
      status: TransactionStatus.CREATED,
      amount: '500000',
      txHash: null,
      blockNumber: null,
      userId: 'user-1',
      walletId: 'wallet-1',
      vaultId: 'db-vault-1',
      positionId: 'position-1',
      type: TransactionType.WITHDRAW,
      chainId: 84532,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    transactionsServiceMock.markSubmitted.mockResolvedValue({
      transactionId: 'tx-withdraw-1',
      status: TransactionStatus.SUBMITTED,
      amount: '500000',
      txHash: '0xwithdrawhash',
      blockNumber: null,
      userId: 'user-1',
      walletId: 'wallet-1',
      vaultId: 'db-vault-1',
      positionId: 'position-1',
      type: TransactionType.WITHDRAW,
      chainId: 84532,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    transactionsServiceMock.confirmSubmitted.mockResolvedValue({
      applied: true,
      transaction: {
        transactionId: 'tx-withdraw-1',
        status: TransactionStatus.CONFIRMED,
        amount: '500000',
        txHash: '0xwithdrawhash',
        blockNumber: '18450322',
        userId: 'user-1',
        walletId: 'wallet-1',
        vaultId: 'db-vault-1',
        positionId: 'position-1',
        type: TransactionType.WITHDRAW,
        chainId: 84532,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    positionsSubtractMock.subtractWithdraw.mockResolvedValue({
      positionId: 'position-1',
      status: PositionStatus.ACTIVE,
      depositedAmount: '500000',
      currentAmount: '500000',
      shares: '500000',
      userId: 'user-1',
      vaultId: 'db-vault-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EarnWithdrawService,
        { provide: PositionsService, useValue: { ...positionsServiceMock, ...positionsSubtractMock } },
        { provide: EARN_PROTOCOL_PROVIDER, useValue: earnProtocolProviderMock },
        {
          provide: EarnTransactionValidationService,
          useValue: earnTransactionValidationServiceMock,
        },
        { provide: WALLET_PROVIDER, useValue: walletProviderMock },
        { provide: EarnBlockchainService, useValue: earnBlockchainServiceMock },
        { provide: TransactionsService, useValue: transactionsServiceMock },
        { provide: PrismaService, useValue: prismaMock },
        {
          provide: EarnMutationRateLimitService,
          useValue: earnMutationRateLimitServiceMock,
        },
        { provide: ExplorerUrlService, useValue: explorerUrlServiceMock },
        { provide: AuditService, useValue: auditServiceMock },
      ],
    }).compile();

    service = module.get(EarnWithdrawService);
  });

  it('submits partial withdrawal and updates position after confirmation', async () => {
    const result = await service.withdrawPosition('user-1', 'position-1', {
      walletId: 'wallet-1',
      amount: '500000',
    });

    expect(result).toMatchObject({
      positionId: 'position-1',
      amount: '500000',
      fullWithdraw: false,
      status: TransactionStatus.CONFIRMED,
      positionStatus: PositionStatus.ACTIVE,
    });
    expect(positionsSubtractMock.subtractWithdraw).toHaveBeenCalled();
    expect(walletProviderMock.sendTransaction).toHaveBeenCalled();
  });

  it('submits full withdrawal using entire position balance', async () => {
    positionsSubtractMock.subtractWithdraw.mockResolvedValueOnce({
      positionId: 'position-1',
      status: PositionStatus.CLOSED,
      depositedAmount: '0',
      currentAmount: '0',
      shares: '0',
      userId: 'user-1',
      vaultId: 'db-vault-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.withdrawPosition('user-1', 'position-1', {
      walletId: 'wallet-1',
      fullWithdraw: true,
    });

    expect(result.fullWithdraw).toBe(true);
    expect(result.positionStatus).toBe(PositionStatus.CLOSED);
  });

  it('submits full withdrawal when on-chain share balance exceeds DB shares', async () => {
    positionsServiceMock.findByIdWithVault.mockResolvedValueOnce({
      ...positionWithVault,
      currentAmount: { toString: () => '2' },
      shares: { toString: () => '2' },
    });
    earnBlockchainServiceMock.readVaultShareBalance.mockResolvedValueOnce(99_999n);
    transactionsServiceMock.createTransaction.mockResolvedValueOnce({
      transactionId: 'tx-withdraw-dust',
      status: TransactionStatus.CREATED,
      amount: '2',
      txHash: null,
      blockNumber: null,
      userId: 'user-1',
      walletId: 'wallet-1',
      vaultId: 'db-vault-1',
      positionId: 'position-1',
      type: TransactionType.WITHDRAW,
      chainId: 84532,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    transactionsServiceMock.markSubmitted.mockResolvedValueOnce({
      transactionId: 'tx-withdraw-dust',
      status: TransactionStatus.SUBMITTED,
      amount: '2',
      txHash: '0xwithdrawhash',
      blockNumber: null,
      userId: 'user-1',
      walletId: 'wallet-1',
      vaultId: 'db-vault-1',
      positionId: 'position-1',
      type: TransactionType.WITHDRAW,
      chainId: 84532,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    transactionsServiceMock.confirmSubmitted.mockResolvedValueOnce({
      applied: true,
      transaction: {
        transactionId: 'tx-withdraw-dust',
        status: TransactionStatus.CONFIRMED,
        amount: '2',
        txHash: '0xwithdrawhash',
        blockNumber: 18_450_322,
        userId: 'user-1',
        walletId: 'wallet-1',
        vaultId: 'db-vault-1',
        positionId: 'position-1',
        type: TransactionType.WITHDRAW,
        chainId: 84532,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    positionsSubtractMock.subtractWithdraw.mockResolvedValueOnce({
      positionId: 'position-1',
      status: PositionStatus.CLOSED,
      depositedAmount: '0',
      currentAmount: '0',
      shares: '0',
      userId: 'user-1',
      vaultId: 'db-vault-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.withdrawPosition('user-1', 'position-1', {
      walletId: 'wallet-1',
      fullWithdraw: true,
    });

    expect(result.fullWithdraw).toBe(true);
    expect(result.amount).toBe('2');
    expect(result.sharesBurned).toBe('2');
    expect(positionsSubtractMock.subtractWithdraw).toHaveBeenCalledWith(
      'position-1',
      { withdrawnAmount: '2', shares: '2' },
      expect.anything(),
    );
  });

  it('rejects withdrawals for positions not owned by the user', async () => {
    positionsServiceMock.findByIdWithVault.mockResolvedValueOnce({
      ...positionWithVault,
      userId: 'other-user',
    });

    await expect(
      service.withdrawPosition('user-1', 'position-1', {
        walletId: 'wallet-1',
        amount: '500000',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects withdrawals when position is not active', async () => {
    positionsServiceMock.findByIdWithVault.mockResolvedValueOnce({
      ...positionWithVault,
      status: PositionStatus.CLOSED,
    });

    await expect(
      service.withdrawPosition('user-1', 'position-1', {
        walletId: 'wallet-1',
        amount: '500000',
      }),
    ).rejects.toThrow(PositionNotActiveException);
  });

  it('rejects withdrawals exceeding position balance', async () => {
    await expect(
      service.withdrawPosition('user-1', 'position-1', {
        walletId: 'wallet-1',
        amount: '2000000',
      }),
    ).rejects.toThrow(InsufficientPositionBalanceException);
  });

  it('prevents duplicate withdrawals while one is in progress', async () => {
    transactionsServiceMock.hasOpenWithdraw.mockResolvedValueOnce(true);

    await expect(
      service.withdrawPosition('user-1', 'position-1', {
        walletId: 'wallet-1',
        amount: '500000',
      }),
    ).rejects.toThrow(WithdrawInProgressException);
  });
});
