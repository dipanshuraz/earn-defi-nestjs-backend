import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { WalletsService } from '../../wallets/wallets.service';
import { EarnTransactionValidationService } from './earn-transaction-validation.service';

describe('EarnTransactionValidationService', () => {
  let service: EarnTransactionValidationService;

  const walletsServiceMock = {
    findOwnedWallet: jest.fn(),
  };

  const configServiceMock = {
    get: jest.fn((key: string) => {
      if (key === 'blockchain') {
        return {
          allowMainnetTransactions: false,
          mainnetEnabled: false,
        };
      }

      if (key === 'chains') {
        return {
          chains: [
            {
              chainId: 84532,
              isTestnet: true,
              isEnabled: true,
              rpcUrl: 'https://base-sepolia.g.alchemy.com/v2/test',
            },
            {
              chainId: 8453,
              isTestnet: false,
              isEnabled: true,
              rpcUrl: 'https://base-mainnet.g.alchemy.com/v2/test',
            },
          ],
        };
      }

      return undefined;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EarnTransactionValidationService,
        { provide: ConfigService, useValue: configServiceMock },
        { provide: WalletsService, useValue: walletsServiceMock },
      ],
    }).compile();

    service = module.get(EarnTransactionValidationService);
  });

  it('allows testnet chains when mainnet transactions are disabled', () => {
    expect(() => service.assertChainMatchesEnvironment(84532)).not.toThrow();
  });

  it('blocks mainnet chains when mainnet transactions are disabled', () => {
    expect(() => service.assertChainMatchesEnvironment(8453)).toThrow(ForbiddenException);
  });

  it('asserts vault belongs to chain', () => {
    expect(() =>
      service.assertVaultBelongsToChain(
        {
          vaultId: 'aave-base-sepolia-usdc',
          chainId: 84532,
        } as never,
        8453,
      ),
    ).toThrow('does not belong to chain');
  });
});
