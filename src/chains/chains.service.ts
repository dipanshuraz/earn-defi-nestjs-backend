import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChainDefinition, ChainsConfig } from '../config/config.types';
import { ChainResponseDto } from './dto/chain-response.dto';
import { ChainsQueryDto } from './dto/chains-query.dto';

@Injectable()
export class ChainsService {
  constructor(private readonly configService: ConfigService) {}

  findAll(query: ChainsQueryDto = {}): ChainResponseDto[] {
    const chains = this.getConfiguredChains().filter((chain) => chain.isEnabled);

    if (query.chainId === undefined) {
      return chains.map((chain) => this.toResponse(chain));
    }

    return chains
      .filter((chain) => chain.chainId === query.chainId)
      .map((chain) => this.toResponse(chain));
  }

  private getConfiguredChains(): ChainDefinition[] {
    const chainsConfig = this.configService.get<ChainsConfig>('chains');

    if (!chainsConfig?.chains) {
      throw new Error('Chains configuration failed to load');
    }

    return chainsConfig.chains;
  }

  private toResponse(chain: ChainDefinition): ChainResponseDto {
    return {
      slug: chain.slug,
      name: chain.name,
      chainId: chain.chainId,
      isTestnet: chain.isTestnet,
      isEnabled: chain.isEnabled,
      rpcUrl: chain.rpcUrl,
      explorerUrl: chain.explorerUrl,
      nativeCurrency: chain.nativeCurrency,
    };
  }
}
