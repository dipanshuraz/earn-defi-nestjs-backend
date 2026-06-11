import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { WalletType } from '@prisma/client';
import { WalletsController } from './wallets.controller';
import { WalletsService } from './wallets.service';

describe('WalletsController', () => {
  let controller: WalletsController;

  const walletsServiceMock = {
    createWallet: jest.fn(),
    listWallets: jest.fn(),
    getWallet: jest.fn(),
  };

  const authUser = {
    userId: 'user-1',
    email: 'user@example.com',
  };

  const wallet = {
    walletId: '550e8400-e29b-41d4-a716-446655440000',
    privyWalletId: 'privy-wallet-1',
    walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
    chainId: 84532,
    walletType: WalletType.EMBEDDED,
    isPrimary: true,
    createdAt: new Date('2026-06-11T12:00:00.000Z'),
    updatedAt: new Date('2026-06-11T12:00:00.000Z'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WalletsController],
      providers: [{ provide: WalletsService, useValue: walletsServiceMock }],
    }).compile();

    controller = module.get(WalletsController);
  });

  it('creates a wallet for the current user', async () => {
    walletsServiceMock.createWallet.mockResolvedValue(wallet);

    await expect(
      controller.createWallet(authUser, { isPrimary: true }),
    ).resolves.toEqual(wallet);
  });

  it('lists wallets for the current user', async () => {
    walletsServiceMock.listWallets.mockResolvedValue([wallet]);

    await expect(controller.listWallets(authUser)).resolves.toEqual([wallet]);
  });

  it('returns a wallet for the current user', async () => {
    walletsServiceMock.getWallet.mockResolvedValue({
      ...wallet,
      balance: {
        address: wallet.walletAddress,
        chainId: 84532,
        balance: '1000',
        symbol: 'ETH',
        decimals: 18,
      },
    });

    await expect(
      controller.getWallet(authUser, wallet.walletId),
    ).resolves.toMatchObject({ privyWalletId: 'privy-wallet-1' });
  });

  it('propagates not found errors', async () => {
    walletsServiceMock.getWallet.mockRejectedValue(
      new NotFoundException('Wallet not found'),
    );

    await expect(controller.getWallet(authUser, wallet.walletId)).rejects.toThrow(
      NotFoundException,
    );
  });
});
