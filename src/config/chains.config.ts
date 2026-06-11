import { registerAs } from '@nestjs/config';
import { ChainDefinition, ChainsConfig } from './config.types';
import { interpolateConfigValues, parseConfigJson } from './config-json.util';

function validateChains(chains: ChainDefinition[]): ChainDefinition[] {
  const seenChainIds = new Set<number>();

  for (const chain of chains) {
    if (seenChainIds.has(chain.chainId)) {
      throw new Error(`Duplicate chainId in CHAINS_CONFIG: ${chain.chainId}`);
    }

    seenChainIds.add(chain.chainId);
  }

  return chains;
}

export default registerAs('chains', (): ChainsConfig => {
  const parsed = parseConfigJson<ChainDefinition>(
    process.env.CHAINS_CONFIG,
    'CHAINS_CONFIG',
  );

  const chains = interpolateConfigValues(parsed, {
    ALCHEMY_API_KEY: process.env.ALCHEMY_API_KEY ?? '',
    RPC_URL: process.env.RPC_URL ?? '',
  });

  return {
    chains: validateChains(chains),
  };
});
