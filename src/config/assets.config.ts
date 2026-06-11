import { registerAs } from '@nestjs/config';
import { AssetDefinition, AssetsConfig } from './config.types';
import { parseConfigJson } from './config-json.util';

function validateAssets(assets: AssetDefinition[]): AssetDefinition[] {
  const seenKeys = new Set<string>();

  for (const asset of assets) {
    const key = `${asset.chainId}:${asset.symbol.toUpperCase()}`;

    if (seenKeys.has(key)) {
      throw new Error(`Duplicate asset in ASSETS_CONFIG: ${key}`);
    }

    seenKeys.add(key);
  }

  return assets;
}

export default registerAs('assets', (): AssetsConfig => {
  const assets = parseConfigJson<AssetDefinition>(
    process.env.ASSETS_CONFIG,
    'ASSETS_CONFIG',
  );

  return {
    assets: validateAssets(
      assets.map((asset) => ({
        ...asset,
        symbol: asset.symbol.toUpperCase(),
      })),
    ),
  };
});
