import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  PositionStatus,
  TransactionStatus,
  TransactionType,
  WalletProviderType,
  WalletType,
} from '@prisma/client';
import { EARN_PROTOCOL_PROVIDER } from '../../protocols/earn-protocol-provider.interface';
import { PositionsService } from '../persistence/positions/positions.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TransactionsService } from '../persistence/transactions/transactions.service';
import { AuditService } from '../../audit/audit.service';
import { WALLET_PROVIDER } from '../../wallets/providers/wallet-provider.interface';
import { EarnBlockchainService } from './earn-blockchain.service';
import { EarnDepositService } from './earn-deposit.service';
import { EarnTransactionValidationService } from './earn-transaction-validation.service';
import { EarnVaultRepository } from '../repositories/earn-vault.repository';
import { EarnMutationRateLimitService } from './earn-mutation-rate-limit.service';
import { ExplorerUrlService } from './explorer-url.service';
import {
  DepositInProgressException,
  InsufficientAllowanceException,
  InsufficientBalanceException,
} from '../exceptions/earn-deposit.exceptions';

describe('EarnDepositService', () => {
  let service: EarnDepositService;

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
    walletType: WalletType.EMBEDDED,
    providerId: 'privy-wallet-1',
    providerType: WalletProviderType.PRIVY,
    isPrimary: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const dbVault = {
    id: 'db-vault-1',
    slug: vault.vaultId,
  };

  const earnProtocolProviderMock = { getVault: jest.fn() };
  const earnTransactionValidationServiceMock = {
    assertDepositEnabled: jest.fn(),
    assertChainMatchesEnvironment: jest.fn(),
    assertRpcBelongsToChain: jest.fn(),
    assertVaultBelongsToChain: jest.fn(),
    assertWalletBelongsToUser: jest.fn(),
    assertWalletChainMatchesVault: jest.fn(),
  };
  const earnMutationRateLimitServiceMock = { assertDepositAllowed: jest.fn() };
  const explorerUrlServiceMock = {
    forTransaction: jest.fn().mockReturnValue('https://sepolia.basescan.org/tx/0xdeposithash'),
  };
  const auditServiceMock = { log: jest.fn().mockResolvedValue(undefined) };
  const walletProviderMock = { sendTransaction: jest.fn() };
  const earnBlockchainServiceMock = {
    assertMainnetTransactionsAllowed: jest.fn(),
    readAssetBalance: jest.fn(),
    readErc20Allowance: jest.fn(),
    previewDepositShares: jest.fn(),
    encodeVaultDeposit: jest.fn().mockReturnValue('0xdeposit'),
    waitForTransactionReceipt: jest.fn(),
  };
  const transactionsServiceMock = {
    hasOpenDeposit: jest.fn(),
    createTransaction: jest.fn(),
    markSubmitted: jest.fn(),
    confirmSubmitted: jest.fn(),
    markFailed: jest.fn(),
    markReverted: jest.fn(),
  };
  const positionsServiceMock = {
    findByUserAndVault: jest.fn(),
    createPending: jest.fn(),
    activate: jest.fn(),
    addDeposit: jest.fn(),
    close: jest.fn(),
    markFailed: jest.fn(),
  };
  const earnVaultRepositoryMock = { findOrCreate: jest.fn() };

  const prismaTransactionMock = jest.fn(async (callback: (tx: object) => Promise<unknown>) =>
    callback({}),
  );

  const prismaMock = {
    $transaction: prismaTransactionMock,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    earnProtocolProviderMock.getVault.mockResolvedValue(vault);
    earnTransactionValidationServiceMock.assertWalletBelongsToUser.mockResolvedValue(wallet);
    earnVaultRepositoryMock.findOrCreate.mockResolvedValue(dbVault);
    positionsServiceMock.findByUserAndVault.mockResolvedValue(null);
    transactionsServiceMock.hasOpenDeposit.mockResolvedValue(false);
    earnBlockchainServiceMock.readAssetBalance.mockResolvedValue(5_000_000n);
    earnBlockchainServiceMock.readErc20Allowance.mockResolvedValue(2_000_000n);
    earnBlockchainServiceMock.previewDepositShares.mockResolvedValue(1_000_000n);
    walletProviderMock.sendTransaction.mockResolvedValue({
      hash: '0xdeposithash',
      transactionId: 'privy-tx-2',
    });
    earnBlockchainServiceMock.waitForTransactionReceipt.mockResolvedValue({
      status: 'success',
      blockNumber: 18_450_321n,
      gasUsed: 120_000n,
    });

    positionsServiceMock.createPending.mockResolvedValue({
      positionId: 'position-1',
      userId: 'user-1',
      vaultId: 'db-vault-1',
      status: PositionStatus.PENDING,
      depositedAmount: '0',
      currentAmount: '0',
      shares: '0',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    transactionsServiceMock.createTransaction.mockResolvedValue({
      transactionId: 'tx-record-1',
      status: TransactionStatus.CREATED,
      txHash: null,
      blockNumber: null,
      userId: 'user-1',
      walletId: 'wallet-1',
      vaultId: 'db-vault-1',
      positionId: 'position-1',
      type: TransactionType.DEPOSIT,
      amount: '1000000',
      chainId: 84532,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    transactionsServiceMock.markSubmitted.mockResolvedValue({
      transactionId: 'tx-record-1',
      status: TransactionStatus.SUBMITTED,
      txHash: '0xdeposithash',
      blockNumber: null,
      userId: 'user-1',
      walletId: 'wallet-1',
      vaultId: 'db-vault-1',
      positionId: 'position-1',
      type: TransactionType.DEPOSIT,
      amount: '1000000',
      chainId: 84532,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    positionsServiceMock.activate.mockResolvedValue({
      positionId: 'position-1',
      userId: 'user-1',
      vaultId: 'db-vault-1',
      status: PositionStatus.ACTIVE,
      depositedAmount: '1000000',
      currentAmount: '1000000',
      shares: '1000000',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    transactionsServiceMock.confirmSubmitted.mockResolvedValue({
      applied: true,
      transaction: {
        transactionId: 'tx-record-1',
        status: TransactionStatus.CONFIRMED,
        txHash: '0xdeposithash',
        blockNumber: '18450321',
        userId: 'user-1',
        walletId: 'wallet-1',
        vaultId: 'db-vault-1',
        positionId: 'position-1',
        type: TransactionType.DEPOSIT,
        amount: '1000000',
        chainId: 84532,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EarnDepositService,
        { provide: EARN_PROTOCOL_PROVIDER, useValue: earnProtocolProviderMock },
        { provide: WALLET_PROVIDER, useValue: walletProviderMock },
        { provide: EarnBlockchainService, useValue: earnBlockchainServiceMock },
        { provide: TransactionsService, useValue: transactionsServiceMock },
        { provide: PositionsService, useValue: positionsServiceMock },
        { provide: EarnVaultRepository, useValue: earnVaultRepositoryMock },
        { provide: PrismaService, useValue: prismaMock },
        {
          provide: EarnTransactionValidationService,
          useValue: earnTransactionValidationServiceMock,
        },
        {
          provide: EarnMutationRateLimitService,
          useValue: earnMutationRateLimitServiceMock,
        },
        { provide: ExplorerUrlService, useValue: explorerUrlServiceMock },
        { provide: AuditService, useValue: auditServiceMock },
      ],
    }).compile();

    service = module.get(EarnDepositService);
    prismaTransactionMock.mockImplementation(async (callback) => callback({}));
  });

  it('submits deposit and activates position after confirmation', async () => {
    const result = await service.depositVault('user-1', vault.vaultId, {
      walletId: 'wallet-1',
      amount: '1000000',
    });

    expect(result).toMatchObject({
      vaultId: vault.vaultId,
      amount: '1000000',
      positionStatus: PositionStatus.ACTIVE,
      status: TransactionStatus.CONFIRMED,
      shares: '1000000',
      txHash: '0xdeposithash',
    });

    expect(positionsServiceMock.createPending).toHaveBeenCalled();
    expect(positionsServiceMock.activate).toHaveBeenCalled();
    expect(walletProviderMock.sendTransaction).toHaveBeenCalled();
    expect(prismaTransactionMock).toHaveBeenCalledTimes(2);
  });

  it('rejects deposits with insufficient balance', async () => {
    earnBlockchainServiceMock.readAssetBalance.mockResolvedValueOnce(100n);

    await expect(
      service.depositVault('user-1', vault.vaultId, {
        walletId: 'wallet-1',
        amount: '1000000',
      }),
    ).rejects.toThrow(InsufficientBalanceException);
  });

  it('rejects deposits with insufficient allowance using APPROVAL_REQUIRED', async () => {
    earnBlockchainServiceMock.readErc20Allowance.mockResolvedValueOnce(0n);

    try {
      await service.depositVault('user-1', vault.vaultId, {
        walletId: 'wallet-1',
        amount: '1000000',
      });
      fail('Expected InsufficientAllowanceException');
    } catch (error) {
      expect(error).toBeInstanceOf(InsufficientAllowanceException);
      expect((error as InsufficientAllowanceException).getResponse()).toMatchObject({
        code: 'APPROVAL_REQUIRED',
      });
    }
  });

  it('prevents duplicate deposits when a position is pending', async () => {
    positionsServiceMock.findByUserAndVault.mockResolvedValueOnce({
      positionId: 'position-1',
      status: PositionStatus.PENDING,
      depositedAmount: '0',
      currentAmount: '0',
      shares: '0',
      userId: 'user-1',
      vaultId: 'db-vault-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      service.depositVault('user-1', vault.vaultId, {
        walletId: 'wallet-1',
        amount: '1000000',
      }),
    ).rejects.toThrow(DepositInProgressException);
  });

  it('rejects wallet chain mismatch', async () => {
    earnTransactionValidationServiceMock.assertWalletChainMatchesVault.mockImplementationOnce(
      () => {
        throw new BadRequestException('Wallet chain 8453 does not match vault chain 84532');
      },
    );

    await expect(
      service.depositVault('user-1', vault.vaultId, {
        walletId: 'wallet-1',
        amount: '1000000',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
