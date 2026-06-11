import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TransactionStatus, TransactionType, WalletProviderType, WalletType } from '@prisma/client';
import { EARN_PROTOCOL_PROVIDER } from '../../protocols/earn-protocol-provider.interface';
import { TransactionsService } from '../persistence/transactions/transactions.service';
import { AuditService } from '../../audit/audit.service';
import { WALLET_PROVIDER } from '../../wallets/providers/wallet-provider.interface';
import { EarnApprovalService } from './earn-approval.service';
import { EarnBlockchainService } from './earn-blockchain.service';
import { EarnTransactionValidationService } from './earn-transaction-validation.service';
import { ExplorerUrlService } from './explorer-url.service';

describe('EarnApprovalService', () => {
  let service: EarnApprovalService;

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

  const earnProtocolProviderMock = { getVault: jest.fn() };
  const earnTransactionValidationServiceMock = {
    assertDepositEnabled: jest.fn(),
    assertChainMatchesEnvironment: jest.fn(),
    assertRpcBelongsToChain: jest.fn(),
    assertVaultBelongsToChain: jest.fn(),
    assertWalletBelongsToUser: jest.fn(),
    assertWalletChainMatchesVault: jest.fn(),
  };
  const explorerUrlServiceMock = {
    forTransaction: jest.fn().mockReturnValue('https://sepolia.basescan.org/tx/0xabc123'),
  };
  const auditServiceMock = { log: jest.fn().mockResolvedValue(undefined) };
  const walletProviderMock = { sendTransaction: jest.fn() };
  const earnBlockchainServiceMock = {
    assertMainnetTransactionsAllowed: jest.fn(),
    readErc20Allowance: jest.fn(),
    encodeErc20Approve: jest.fn().mockReturnValue('0xapprove'),
    waitForTransactionReceipt: jest.fn(),
  };
  const transactionsServiceMock = {
    createTransaction: jest.fn(),
    markSubmitted: jest.fn(),
    markConfirmed: jest.fn(),
    confirmSubmitted: jest.fn(),
    markReverted: jest.fn(),
    markFailed: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    earnProtocolProviderMock.getVault.mockResolvedValue(vault);
    earnTransactionValidationServiceMock.assertDepositEnabled.mockImplementation(() => undefined);
    earnTransactionValidationServiceMock.assertChainMatchesEnvironment.mockImplementation(
      () => undefined,
    );
    earnTransactionValidationServiceMock.assertRpcBelongsToChain.mockImplementation(() => undefined);
    earnTransactionValidationServiceMock.assertVaultBelongsToChain.mockImplementation(() => undefined);
    earnTransactionValidationServiceMock.assertWalletBelongsToUser.mockResolvedValue(wallet);
    earnTransactionValidationServiceMock.assertWalletChainMatchesVault.mockImplementation(
      () => undefined,
    );
    earnBlockchainServiceMock.readErc20Allowance
      .mockResolvedValueOnce(0n)
      .mockResolvedValueOnce(1_000_000n);
    walletProviderMock.sendTransaction.mockResolvedValue({
      hash: '0xabc123',
      transactionId: 'privy-tx-1',
    });
    earnBlockchainServiceMock.waitForTransactionReceipt.mockResolvedValue({
      status: 'success',
      blockNumber: 18_450_321n,
      gasUsed: 65_000n,
    });
    transactionsServiceMock.createTransaction.mockResolvedValue({
      transactionId: 'tx-record-1',
      status: TransactionStatus.CREATED,
      txHash: null,
      blockNumber: null,
    });
    transactionsServiceMock.markSubmitted.mockResolvedValue({
      transactionId: 'tx-record-1',
      status: TransactionStatus.SUBMITTED,
      txHash: '0xabc123',
      blockNumber: null,
    });
    transactionsServiceMock.confirmSubmitted.mockResolvedValue({
      applied: true,
      transaction: {
        transactionId: 'tx-record-1',
        status: TransactionStatus.CONFIRMED,
        txHash: '0xabc123',
        blockNumber: '18450321',
      },
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EarnApprovalService,
        { provide: EARN_PROTOCOL_PROVIDER, useValue: earnProtocolProviderMock },
        { provide: WALLET_PROVIDER, useValue: walletProviderMock },
        { provide: EarnBlockchainService, useValue: earnBlockchainServiceMock },
        { provide: TransactionsService, useValue: transactionsServiceMock },
        {
          provide: EarnTransactionValidationService,
          useValue: earnTransactionValidationServiceMock,
        },
        { provide: ExplorerUrlService, useValue: explorerUrlServiceMock },
        { provide: AuditService, useValue: auditServiceMock },
      ],
    }).compile();

    service = module.get(EarnApprovalService);
  });

  it('submits ERC-20 approval and tracks transaction lifecycle', async () => {
    const result = await service.approveVault('user-1', vault.vaultId, {
      walletId: 'wallet-1',
      amount: '1000000',
    });

    expect(result).toMatchObject({
      vaultId: vault.vaultId,
      chainId: 84532,
      amount: '1000000',
      allowance: '1000000',
      requiresApproval: false,
      status: TransactionStatus.CONFIRMED,
      transactionId: 'tx-record-1',
      txHash: '0xabc123',
      blockNumber: '18450321',
    });

    expect(transactionsServiceMock.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        type: TransactionType.APPROVAL,
        amount: '1000000',
      }),
    );
    expect(walletProviderMock.sendTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        providerWalletId: 'privy-wallet-1',
        to: vault.assetAddress,
        data: '0xapprove',
      }),
    );
  });

  it('skips approval when allowance is already sufficient', async () => {
    earnBlockchainServiceMock.readErc20Allowance.mockReset();
    earnBlockchainServiceMock.readErc20Allowance.mockResolvedValue(2_000_000n);
    transactionsServiceMock.markConfirmed.mockResolvedValue({
      transactionId: 'tx-record-2',
      status: TransactionStatus.CONFIRMED,
      txHash: null,
      blockNumber: '0',
    });
    transactionsServiceMock.createTransaction.mockResolvedValue({
      transactionId: 'tx-record-2',
      status: TransactionStatus.CREATED,
      txHash: null,
      blockNumber: null,
    });

    const result = await service.approveVault('user-1', vault.vaultId, {
      walletId: 'wallet-1',
      amount: '1000000',
    });

    expect(result.requiresApproval).toBe(false);
    expect(result.status).toBe(TransactionStatus.CONFIRMED);
    expect(walletProviderMock.sendTransaction).not.toHaveBeenCalled();
  });

  it('rejects mainnet transactions when disabled', async () => {
    earnProtocolProviderMock.getVault.mockResolvedValueOnce({
      ...vault,
      chainId: 8453,
    });
    earnTransactionValidationServiceMock.assertChainMatchesEnvironment.mockImplementation(() => {
      throw new ForbiddenException('Mainnet transactions are disabled');
    });

    await expect(
      service.approveVault('user-1', vault.vaultId, {
        walletId: 'wallet-1',
        amount: '1000000',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects wallet chain mismatch', async () => {
    earnTransactionValidationServiceMock.assertWalletChainMatchesVault.mockImplementationOnce(
      () => {
        throw new BadRequestException('Wallet chain 8453 does not match vault chain 84532');
      },
    );

    await expect(
      service.approveVault('user-1', vault.vaultId, {
        walletId: 'wallet-1',
        amount: '1000000',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
