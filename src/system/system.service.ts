import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig, BlockchainConfig } from '../config/config.types';
import { EnvironmentResponseDto } from './dto/environment-response.dto';

@Injectable()
export class SystemService {
  constructor(private readonly configService: ConfigService) {}

  getEnvironment(): EnvironmentResponseDto {
    const app = this.configService.get<AppConfig>('app');
    const blockchain = this.configService.get<BlockchainConfig>('blockchain');

    if (!app || !blockchain) {
      throw new Error('Application configuration is not loaded');
    }

    return {
      environment: app.appEnv,
      chain: blockchain.chain,
      chainId: blockchain.chainId,
      mainnetEnabled: blockchain.mainnetEnabled,
      allowMainnetTransactions: blockchain.allowMainnetTransactions,
    };
  }
}
