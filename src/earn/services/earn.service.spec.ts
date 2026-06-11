import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { WalletProviderType, WalletType } from '@prisma/client';
import { EARN_PROTOCOL_PROVIDER } from '../../protocols/earn-protocol-provider.interface';
import { WalletsService } from '../../wallets/wallets.service';
import { EarnBlockchainService } from './earn-blockchain.service';
import { EarnService } from './earn.service';

describe('EarnService', () => {
  let service: EarnService;

  const vault = {
    vaultId: 'aave-base-usdc',
    protocol: 'aave' as const,
    chainId: 8453,
    contractAddress: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
    shareTokenAddress: '0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB',
    name: 'Aave V3 USDC',
    symbol: 'aBasUSDC',
    assetSymbol: 'USDC',
    assetDecimals: 6,
    assetAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    apy: '3.2500',
    tvl: '5000000000',
    sharePrice: '1.000000000000000000000000001',
    totalSupply: '5000000000',
    metadata: {},
    isEnabled: true,
    depositEnabled: true,
    withdrawEnabled: true,
    riskLevel: 'medium' as const,
  };

  const earnProtocolProviderMock = {
    getVaults: jest.fn(),
    getVault: jest.fn(),
    previewDeposit: jest.fn(),
    previewWithdraw: jest.fn(),
  };

  const walletsServiceMock = {
    findOwnedWallet: jest.fn(),
  };

  const earnBlockchainServiceMock = {
    fetchDepositPreviewData: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    earnProtocolProviderMock.getVaults.mockResolvedValue([vault]);
    earnProtocolProviderMock.getVault.mockResolvedValue(vault);
    walletsServiceMock.findOwnedWallet.mockResolvedValue({
      id: 'wallet-1',
      userId: 'user-1',
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      chainId: 8453,
      walletType: WalletType.EMBEDDED,
      providerId: 'privy-wallet-1',
      providerType: WalletProviderType.PRIVY,
      isPrimary: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    earnBlockchainServiceMock.fetchDepositPreviewData.mockResolvedValue({
      walletBalance: 5_000_000n,
      allowance: 0n,
      requiresApproval: true,
      estimatedGas: 250_000n,
      estimatedShares: 1_000_000n,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EarnService,
        { provide: EARN_PROTOCOL_PROVIDER, useValue: earnProtocolProviderMock },
        { provide: WalletsService, useValue: walletsServiceMock },
        { provide: EarnBlockchainService, useValue: earnBlockchainServiceMock },
      ],
    }).compile();

    service = module.get(EarnService);
  });

  it('lists vaults from the protocol provider', async () => {
    const vaults = await service.listVaults({ chainId: 8453 });

    expect(vaults).toHaveLength(1);
    expect(vaults[0]?.vaultId).toBe('aave-base-usdc');
    expect(earnProtocolProviderMock.getVaults).toHaveBeenCalledWith({ chainId: 8453 });
  });

  it('returns a vault by id', async () => {
    const result = await service.getVault('aave-base-usdc');

    expect(result.name).toBe('Aave V3 USDC');
  });

  it('previews deposit with bigint-backed response fields', async () => {
    const preview = await service.previewDeposit('user-1', 'aave-base-usdc', {
      walletId: 'wallet-1',
      amount: '1000000',
    });

    expect(preview).toEqual({
      vaultId: 'aave-base-usdc',
      chainId: 8453,
      walletId: 'wallet-1',
      amount: '1000000',
      walletBalance: '5000000',
      allowance: '0',
      requiresApproval: true,
      estimatedGas: '250000',
      estimatedShares: '1000000',
    });

    expect(earnBlockchainServiceMock.fetchDepositPreviewData).toHaveBeenCalledWith({
      vault,
      walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      amount: 1_000_000n,
    });
  });

  it('rejects preview when vault is inactive', async () => {
    earnProtocolProviderMock.getVault.mockResolvedValueOnce({
      ...vault,
      isEnabled: false,
    });

    await expect(
      service.previewDeposit('user-1', 'aave-base-usdc', {
        walletId: 'wallet-1',
        amount: '1000000',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects preview when wallet chain does not match vault chain', async () => {
    walletsServiceMock.findOwnedWallet.mockResolvedValueOnce({
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
    });

    await expect(
      service.previewDeposit('user-1', 'aave-base-usdc', {
        walletId: 'wallet-1',
        amount: '1000000',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('propagates wallet not found errors', async () => {
    walletsServiceMock.findOwnedWallet.mockRejectedValueOnce(
      new NotFoundException('Wallet not found'),
    );

    await expect(
      service.previewDeposit('user-1', 'aave-base-usdc', {
        walletId: 'missing-wallet',
        amount: '1000000',
      }),
    ).rejects.toThrow(NotFoundException);
  });
});
