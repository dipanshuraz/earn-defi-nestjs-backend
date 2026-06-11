jest.mock('../../../auth/privy.service', () => ({
  PrivyService: class PrivyService {},
}));

import { NotFoundException } from '@nestjs/common';
import { PrivyService } from '../../../auth/privy.service';
import { PrivyWalletService } from './privy-wallet.service';

describe('PrivyWalletService', () => {
  let service: PrivyWalletService;

  const walletsApi = {
    create: jest.fn(),
    get: jest.fn(),
    balance: {
      get: jest.fn(),
    },
    ethereum: jest.fn(),
  };

  const privyClientMock = {
    wallets: jest.fn(() => walletsApi),
  };

  const privyServiceMock = {
    getClient: jest.fn(() => privyClientMock),
    getWalletSignerKeyQuorumId: jest.fn().mockReturnValue(undefined),
    getAuthorizationContext: jest.fn().mockReturnValue(undefined),
  };

  const prismaMock = {
    user: {
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    privyServiceMock.getWalletSignerKeyQuorumId.mockReturnValue(undefined);
    privyServiceMock.getAuthorizationContext.mockReturnValue(undefined);
    service = new PrivyWalletService(
      privyServiceMock as unknown as PrivyService,
      prismaMock as never,
    );
  });

  it('creates a server-owned wallet when authorization keys are configured', async () => {
    privyServiceMock.getWalletSignerKeyQuorumId.mockReturnValue('quorum-1');
    privyServiceMock.getAuthorizationContext.mockReturnValue({
      authorization_private_keys: ['wallet-auth:test'],
    });
    walletsApi.create.mockResolvedValue({
      id: 'privy-wallet-2',
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
    });

    await service.createWallet({
      userId: '550e8400-e29b-41d4-a716-446655440000',
      chainId: 84532,
      privyUserId: 'did:privy:abc',
    });

    expect(walletsApi.create).toHaveBeenCalledWith(
      expect.objectContaining({
        owner_id: 'quorum-1',
      }),
    );
    expect(walletsApi.create).not.toHaveBeenCalledWith(
      expect.objectContaining({
        owner: expect.anything(),
      }),
    );
  });

  it('creates a wallet without exposing private keys', async () => {
    walletsApi.create.mockResolvedValue({
      id: 'privy-wallet-1',
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
    });

    const wallet = await service.createWallet({
      userId: '550e8400-e29b-41d4-a716-446655440000',
      chainId: 84532,
      privyUserId: 'did:privy:abc',
    });

    expect(walletsApi.create).toHaveBeenCalledWith(
      expect.objectContaining({
        chain_type: 'ethereum',
        owner: { user_id: 'did:privy:abc' },
      }),
    );
    expect(wallet).toEqual({
      providerWalletId: 'privy-wallet-1',
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      chainId: 84532,
    });
    expect(wallet).not.toHaveProperty('privateKey');
  });

  it('returns wallet metadata from Privy', async () => {
    walletsApi.get.mockResolvedValue({
      id: 'privy-wallet-1',
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
    });

    const wallet = await service.getWallet('privy-wallet-1', 84532);

    expect(wallet.providerWalletId).toBe('privy-wallet-1');
    expect(wallet).not.toHaveProperty('privateKey');
  });

  it('returns ETH and USDC balances for a supported chain', async () => {
    walletsApi.get.mockResolvedValue({
      id: 'privy-wallet-1',
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
    });
    walletsApi.balance.get.mockResolvedValue({
      balances: [
        {
          asset: 'eth',
          raw_value: '1000000000000000',
          raw_value_decimals: 18,
        },
        {
          asset: 'usdc',
          raw_value: '5000000',
          raw_value_decimals: 6,
        },
      ],
    });

    const balances = await service.getBalances('privy-wallet-1', 84532);

    expect(walletsApi.balance.get).toHaveBeenCalledTimes(2);
    expect(walletsApi.balance.get).toHaveBeenCalledWith('privy-wallet-1', {
      asset: 'eth',
      chain: 'base_sepolia',
    });
    expect(walletsApi.balance.get).toHaveBeenCalledWith('privy-wallet-1', {
      asset: 'usdc',
      chain: 'base_sepolia',
    });
    expect(balances).toEqual([
      {
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        chainId: 84532,
        balance: '1000000000000000',
        symbol: 'ETH',
        decimals: 18,
      },
      {
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        chainId: 84532,
        balance: '5000000',
        symbol: 'USDC',
        decimals: 6,
      },
    ]);

    const balance = await service.getBalance('privy-wallet-1', 84532);

    expect(balance.symbol).toBe('ETH');
    expect(balance.balance).toBe('1000000000000000');
  });

  it('prepares transaction signing without exposing private keys', async () => {
    const signTransaction = jest.fn().mockResolvedValue({
      signed_transaction: '0xsigned',
      encoding: 'rlp',
    });
    walletsApi.ethereum.mockReturnValue({ signTransaction });

    const signed = await service.prepareTransactionSigning({
      providerWalletId: 'privy-wallet-1',
      chainId: 84532,
      to: '0x0000000000000000000000000000000000000001',
      value: '1000',
    });

    expect(signTransaction).toHaveBeenCalled();
    expect(signed.signature).toBe('0xsigned');
    expect(signed.encoding).toBe('rlp');
    expect(signed).not.toHaveProperty('privateKey');
  });

  it('maps Privy not found errors', async () => {
    walletsApi.get.mockRejectedValue(
      Object.assign(new Error('not found'), { name: 'NotFoundError', status: 404 }),
    );

    await expect(service.getWallet('missing', 84532)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
