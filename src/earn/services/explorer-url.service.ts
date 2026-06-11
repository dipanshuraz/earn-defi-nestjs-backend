import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChainsConfig } from '../../config/config.types';
import { buildExplorerUrl } from '../utils/explorer-url.util';

@Injectable()
export class ExplorerUrlService {
  constructor(private readonly configService: ConfigService) {}

  forTransaction(chainId: number, txHash?: string | null): string | undefined {
    const chainsConfig = this.configService.get<ChainsConfig>('chains');
    const explorerBase = chainsConfig?.chains.find((chain) => chain.chainId === chainId)
      ?.explorerUrl;

    return buildExplorerUrl(explorerBase, txHash);
  }
}
