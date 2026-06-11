import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { WalletProviderType, WalletType } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { WALLET_PROVIDER } from './providers/wallet-provider.interface';
import { WalletsService } from './wallets.service';

describe('WalletsService', () => {
  let service: WalletsService;

  const walletProviderMock = {
    providerType: 'privy' as const,
    ensurePrivyUserId: jest.fn(),
    createWallet: jest.fn(),
    getWallet: jest.fn(),
    getBalance: jest.fn(),
    getBalances: jest.fn(),
    sendTransaction: jest.fn(),
    ensureWalletServerSigner: jest.fn(),
    signTransaction: jest.fn(),
  };

  const prismaMock = {
    user: {
      findUniqueOrThrow: jest.fn(),
    },
    wallet: {
      count: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  const configServiceMock = {
    get: jest.fn().mockReturnValue({ chainId: 84532 }),
  };

  const dbWallet = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    userId: 'user-1',
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
    chainId: 84532,
    walletType: WalletType.EMBEDDED,
    providerId: 'privy-wallet-1',
    providerType: WalletProviderType.PRIVY,
    isPrimary: true,
    createdAt: new Date('2026-06-11T12:00:00.000Z'),
    updatedAt: new Date('2026-06-11T12:00:00.000Z'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: ConfigService, useValue: configServiceMock },
        { provide: WALLET_PROVIDER, useValue: walletProviderMock },
        { provide: AuditService, useValue: { log: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();

    service = module.get(WalletsService);
  });

  it('creates a Privy-backed wallet for the authenticated user', async () => {
    walletProviderMock.ensurePrivyUserId.mockResolvedValue('did:privy:abc');
    prismaMock.wallet.count.mockResolvedValue(0);
    walletProviderMock.createWallet.mockResolvedValue({
      providerWalletId: 'privy-wallet-1',
      address: dbWallet.address,
      chainId: 84532,
    });
    prismaMock.wallet.create.mockResolvedValue({
      id: dbWallet.id,
      address: dbWallet.address,
      chainId: dbWallet.chainId,
      walletType: dbWallet.walletType,
      providerId: dbWallet.providerId,
      isPrimary: true,
      createdAt: dbWallet.createdAt,
      updatedAt: dbWallet.updatedAt,
    });

    const result = await service.createWallet('user-1', {});

    expect(walletProviderMock.createWallet).toHaveBeenCalledWith({
      userId: 'user-1',
      chainId: 84532,
      privyUserId: 'did:privy:abc',
    });
    expect(result).toEqual({
      walletId: dbWallet.id,
      privyWalletId: 'privy-wallet-1',
      walletAddress: dbWallet.address,
      chainId: 84532,
      walletType: WalletType.EMBEDDED,
      isPrimary: true,
      createdAt: dbWallet.createdAt,
      updatedAt: dbWallet.updatedAt,
    });
    expect(result).not.toHaveProperty('privateKey');
  });

  it('lists wallets scoped to the user with live balances', async () => {
    prismaMock.wallet.findMany.mockResolvedValue([
      {
        id: dbWallet.id,
        address: dbWallet.address,
        chainId: dbWallet.chainId,
        walletType: dbWallet.walletType,
        providerId: dbWallet.providerId,
        isPrimary: true,
        createdAt: dbWallet.createdAt,
        updatedAt: dbWallet.updatedAt,
      },
    ]);
    walletProviderMock.getBalances.mockResolvedValue([
      {
        address: dbWallet.address,
        chainId: 84532,
        balance: '1000',
        symbol: 'ETH',
        decimals: 18,
      },
      {
        address: dbWallet.address,
        chainId: 84532,
        balance: '5000000',
        symbol: 'USDC',
        decimals: 6,
      },
    ]);

    const result = await service.listWallets('user-1');

    expect(walletProviderMock.getBalances).toHaveBeenCalledWith('privy-wallet-1', 84532);
    expect(result[0]?.privyWalletId).toBe('privy-wallet-1');
    expect(result[0]?.walletAddress).toBe(dbWallet.address);
    expect(result[0]?.balances).toHaveLength(2);
    expect(result[0]?.balance?.symbol).toBe('ETH');
  });

  it('returns wallet details with balance for owned wallet', async () => {
    prismaMock.wallet.findFirst.mockResolvedValue(dbWallet);
    walletProviderMock.getBalances.mockResolvedValue([
      {
        address: dbWallet.address,
        chainId: 84532,
        balance: '1000',
        symbol: 'ETH',
        decimals: 18,
      },
      {
        address: dbWallet.address,
        chainId: 84532,
        balance: '0',
        symbol: 'USDC',
        decimals: 6,
      },
    ]);

    const result = await service.getWallet('user-1', dbWallet.id);

    expect(result.balance?.balance).toBe('1000');
    expect(result.balances).toHaveLength(2);
    expect(result.privyWalletId).toBe('privy-wallet-1');
  });

  it('returns wallets without balances when Privy lookup fails', async () => {
    prismaMock.wallet.findMany.mockResolvedValue([
      {
        id: dbWallet.id,
        address: dbWallet.address,
        chainId: dbWallet.chainId,
        walletType: dbWallet.walletType,
        providerId: dbWallet.providerId,
        isPrimary: true,
        createdAt: dbWallet.createdAt,
        updatedAt: dbWallet.updatedAt,
      },
    ]);
    walletProviderMock.getBalances.mockRejectedValue(new Error('Privy unavailable'));

    const result = await service.listWallets('user-1');

    expect(result[0]?.walletAddress).toBe(dbWallet.address);
    expect(result[0]?.balances).toBeUndefined();
    expect(result[0]?.balance).toBeUndefined();
  });

  it('mints Aave test USDC via the on-chain faucet', async () => {
    prismaMock.wallet.findFirst.mockResolvedValue(dbWallet);
    walletProviderMock.sendTransaction.mockResolvedValue({
      hash: '0xabc',
      transactionId: 'tx-1',
    });

    const result = await service.mintAaveTestUsdc('user-1', dbWallet.id);

    expect(walletProviderMock.sendTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        providerWalletId: 'privy-wallet-1',
        chainId: 84532,
        to: '0xD9145b5F45Ad4519c7ACcD6E0A4A82e83bB8A6Dc',
      }),
    );
    expect(result.txHash).toBe('0xabc');
    expect(result.amount).toBe('1000000');
  });

  it('throws when wallet is not owned by the user', async () => {
    prismaMock.wallet.findFirst.mockResolvedValue(null);

    await expect(service.getWallet('user-1', dbWallet.id)).rejects.toThrow(
      NotFoundException,
    );
  });
});
