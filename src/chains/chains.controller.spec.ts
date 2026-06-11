import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ChainsController } from './chains.controller';
import { ChainsService } from './chains.service';

describe('ChainsController', () => {
  let controller: ChainsController;

  const chainsServiceMock = {
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChainsController],
      providers: [{ provide: ChainsService, useValue: chainsServiceMock }],
    }).compile();

    controller = module.get(ChainsController);
  });

  it('returns configured chains', () => {
    chainsServiceMock.findAll.mockReturnValue([
      {
        slug: 'base-sepolia',
        name: 'Base Sepolia',
        chainId: 84532,
        isTestnet: true,
        isEnabled: true,
        rpcUrl: 'https://base-sepolia.g.alchemy.com/v2/test',
        explorerUrl: 'https://sepolia.basescan.org',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      },
    ]);

    expect(controller.findAll({})).toHaveLength(1);
  });

  it('passes chainId filter to the service', () => {
    chainsServiceMock.findAll.mockReturnValue([]);

    controller.findAll({ chainId: 8453 });

    expect(chainsServiceMock.findAll).toHaveBeenCalledWith({ chainId: 8453 });
  });
});

describe('ChainsService', () => {
  let service: ChainsService;

  const configServiceMock = {
    get: jest.fn().mockReturnValue({
      chains: [
        {
          slug: 'base-sepolia',
          name: 'Base Sepolia',
          chainId: 84532,
          isTestnet: true,
          isEnabled: true,
          rpcUrl: 'https://base-sepolia.g.alchemy.com/v2/test',
          explorerUrl: 'https://sepolia.basescan.org',
          nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        },
        {
          slug: 'base',
          name: 'Base',
          chainId: 8453,
          isTestnet: false,
          isEnabled: false,
          rpcUrl: 'https://base-mainnet.g.alchemy.com/v2/test',
          explorerUrl: 'https://basescan.org',
          nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        },
      ],
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChainsService,
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    service = module.get(ChainsService);
  });

  it('returns only enabled chains by default', () => {
    const chains = service.findAll();

    expect(chains).toHaveLength(1);
    expect(chains[0]?.chainId).toBe(84532);
  });

  it('filters chains by chainId', () => {
    configServiceMock.get.mockReturnValueOnce({
      chains: [
        {
          slug: 'base',
          name: 'Base',
          chainId: 8453,
          isTestnet: false,
          isEnabled: true,
          rpcUrl: 'https://base-mainnet.g.alchemy.com/v2/test',
          explorerUrl: 'https://basescan.org',
          nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        },
      ],
    });

    const chains = service.findAll({ chainId: 8453 });

    expect(chains).toHaveLength(1);
    expect(chains[0]?.slug).toBe('base');
  });
});
