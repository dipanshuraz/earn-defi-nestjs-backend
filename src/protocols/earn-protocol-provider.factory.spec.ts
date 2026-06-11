import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AaveProvider } from './aave/aave.provider';
import { EarnProtocolProviderFactory } from './earn-protocol-provider.factory';

describe('EarnProtocolProviderFactory', () => {
  it('returns the Aave provider when configured', async () => {
    const aaveProvider = { protocol: 'aave' } as AaveProvider;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EarnProtocolProviderFactory,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue({ provider: 'aave' }),
          },
        },
        { provide: AaveProvider, useValue: aaveProvider },
      ],
    }).compile();

    const factory = module.get(EarnProtocolProviderFactory);

    expect(factory.create()).toBe(aaveProvider);
  });
});
