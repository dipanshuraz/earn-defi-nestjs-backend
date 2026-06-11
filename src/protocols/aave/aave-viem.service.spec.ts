import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AaveViemService } from './aave-viem.service';

describe('AaveViemService', () => {
  let service: AaveViemService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AaveViemService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(AaveViemService);
  });

  it('formats supply APY as an annualized percent without seconds scaling', () => {
    const formatSupplyApy = (
      service as unknown as { formatSupplyApy: (rate: bigint) => string }
    ).formatSupplyApy.bind(service);

    expect(formatSupplyApy(0n)).toBe('0');
    expect(formatSupplyApy(32_500_000_000_000_000_000_000_000n)).toBe('3.2500');
    expect(formatSupplyApy(10n ** 27n)).toBe('100.0000');
  });
});
