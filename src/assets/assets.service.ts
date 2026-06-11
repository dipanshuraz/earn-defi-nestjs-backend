import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AssetDefinition, AssetsConfig } from '../config/config.types';
import { AssetResponseDto } from './dto/asset-response.dto';
import { AssetsQueryDto } from './dto/assets-query.dto';

@Injectable()
export class AssetsService {
  constructor(private readonly configService: ConfigService) {}

  findAll(query: AssetsQueryDto = {}): AssetResponseDto[] {
    let assets = this.getConfiguredAssets().filter((asset) => asset.isEnabled);

    if (query.chainId !== undefined) {
      assets = assets.filter((asset) => asset.chainId === query.chainId);
    }

    if (query.symbol !== undefined) {
      const normalizedSymbol = query.symbol.trim().toUpperCase();
      assets = assets.filter((asset) => asset.symbol === normalizedSymbol);
    }

    return assets.map((asset) => this.toResponse(asset));
  }

  private getConfiguredAssets(): AssetDefinition[] {
    const assetsConfig = this.configService.get<AssetsConfig>('assets');

    if (!assetsConfig?.assets) {
      throw new Error('Assets configuration failed to load');
    }

    return assetsConfig.assets;
  }

  private toResponse(asset: AssetDefinition): AssetResponseDto {
    return {
      symbol: asset.symbol,
      name: asset.name,
      chainId: asset.chainId,
      contractAddress: asset.contractAddress,
      decimals: asset.decimals,
      isEnabled: asset.isEnabled,
    };
  }
}
