import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AaveProvider } from './aave.provider';
import { AaveViemService } from './aave-viem.service';

describe('AaveProvider', () => {
  let provider: AaveProvider;

  const vaultDefinition = {
    vaultId: 'aave-base-sepolia-usdc',
    chainId: 84532,
    poolAddress: '0x8bAB6d1b75f19e9eD9fCe8b9BD338844fF79aE27',
    aTokenAddress: '0x10F1A9D11CDf50041f3f8cB7191CBE2f31750ACC',
    assetSymbol: 'USDC',
    assetAddress: '0xba50Cd2A20f6DA35D788639E581bca8d0B5d4D5f',
    isEnabled: true,
  };

  const configServiceMock = {
    get: jest.fn((key: string) => {
      if (key === 'aave') {
        return { apiUrl: 'https://api.v3.aave.com/graphql', vaults: [vaultDefinition] };
      }

      if (key === 'assets') {
        return {
          assets: [
            {
              symbol: 'USDC',
              chainId: 84532,
              contractAddress: '0xba50Cd2A20f6DA35D788639E581bca8d0B5d4D5f',
              decimals: 6,
              isEnabled: true,
            },
          ],
        };
      }

      return undefined;
    }),
  };

  const aaveViemServiceMock = {
    readReserveData: jest.fn(),
    previewDeposit: jest.fn(),
    previewWithdraw: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    aaveViemServiceMock.readReserveData.mockResolvedValue({
      name: 'Aave V3 USDC',
      symbol: 'aBasUSDC',
      assetAddress: vaultDefinition.assetAddress,
      aTokenAddress: vaultDefinition.aTokenAddress,
      apy: '3.2500',
      tvl: '5000000000',
      sharePrice: '1.000000000000000000000000001',
      totalSupply: 5_000_000_000n,
      liquidityIndex: 1_000_000_000_000_000_000_000_000_001n,
    });

    aaveViemServiceMock.previewDeposit.mockResolvedValue({
      shares: '1000000',
      sharePrice: '1.000000000000000000000000001',
    });

    aaveViemServiceMock.previewWithdraw.mockResolvedValue({
      shares: '500000',
      sharePrice: '1.000000000000000000000000001',
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AaveProvider,
        { provide: ConfigService, useValue: configServiceMock },
        { provide: AaveViemService, useValue: aaveViemServiceMock },
      ],
    }).compile();

    provider = module.get(AaveProvider);
  });

  it('lists configured Aave vaults', async () => {
    const vaults = await provider.getVaults({ chainId: 84532 });

    expect(vaults).toHaveLength(1);
    expect(vaults[0]).toMatchObject({
      vaultId: 'aave-base-sepolia-usdc',
      protocol: 'aave',
      contractAddress: vaultDefinition.poolAddress,
      shareTokenAddress: vaultDefinition.aTokenAddress,
      assetSymbol: 'USDC',
    });
  });

  it('returns a vault by id', async () => {
    const vault = await provider.getVault({ vaultId: 'aave-base-sepolia-usdc' });

    expect(vault.vaultId).toBe('aave-base-sepolia-usdc');
    expect(vault.apy).toBe('3.2500');
  });

  it('previews deposit shares as 1:1 underlying amount', async () => {
    const preview = await provider.previewDeposit({
      vaultId: 'aave-base-sepolia-usdc',
      chainId: 84532,
      assetAmount: '1000000',
    });

    expect(preview).toEqual({
      vaultId: 'aave-base-sepolia-usdc',
      chainId: 84532,
      assetAmount: '1000000',
      shares: '1000000',
      sharePrice: '1.000000000000000000000000001',
    });
  });

  it('previews withdraw shares as 1:1 underlying amount', async () => {
    const preview = await provider.previewWithdraw({
      vaultId: 'aave-base-sepolia-usdc',
      chainId: 84532,
      assetAmount: '500000',
    });

    expect(preview.shares).toBe('500000');
  });

  it('throws when vault is not found', async () => {
    await expect(provider.getVault({ vaultId: 'missing-vault' })).rejects.toThrow(
      NotFoundException,
    );
  });
});
