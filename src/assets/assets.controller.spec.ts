import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';

describe('AssetsController', () => {
  let controller: AssetsController;

  const assetsServiceMock = {
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AssetsController],
      providers: [{ provide: AssetsService, useValue: assetsServiceMock }],
    }).compile();

    controller = module.get(AssetsController);
  });

  it('returns configured assets', () => {
    assetsServiceMock.findAll.mockReturnValue([
      {
        symbol: 'USDC',
        name: 'USD Coin',
        chainId: 84532,
        contractAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
        decimals: 6,
        isEnabled: true,
      },
    ]);

    expect(controller.findAll({})).toHaveLength(1);
  });

  it('passes filters to the service', () => {
    assetsServiceMock.findAll.mockReturnValue([]);

    controller.findAll({ chainId: 84532, symbol: 'usdc' });

    expect(assetsServiceMock.findAll).toHaveBeenCalledWith({
      chainId: 84532,
      symbol: 'usdc',
    });
  });
});

describe('AssetsService', () => {
  let service: AssetsService;

  const configServiceMock = {
    get: jest.fn().mockReturnValue({
      assets: [
        {
          symbol: 'ETH',
          name: 'Ether',
          chainId: 84532,
          contractAddress: 'native',
          decimals: 18,
          isEnabled: true,
        },
        {
          symbol: 'USDC',
          name: 'USD Coin',
          chainId: 84532,
          contractAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
          decimals: 6,
          isEnabled: true,
        },
        {
          symbol: 'USDC',
          name: 'USD Coin',
          chainId: 8453,
          contractAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
          decimals: 6,
          isEnabled: false,
        },
      ],
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssetsService,
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    service = module.get(AssetsService);
  });

  it('returns only enabled assets by default', () => {
    const assets = service.findAll();

    expect(assets).toHaveLength(2);
  });

  it('filters assets by chainId', () => {
    const assets = service.findAll({ chainId: 84532 });

    expect(assets.every((asset) => asset.chainId === 84532)).toBe(true);
  });

  it('filters assets by symbol case-insensitively', () => {
    const assets = service.findAll({ symbol: 'usdc' });

    expect(assets).toHaveLength(1);
    expect(assets[0]?.symbol).toBe('USDC');
  });
});
