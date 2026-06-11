import { registerAs } from '@nestjs/config';
import { AaveConfig, AaveVaultDefinition } from './config.types';
import { parseConfigJson } from './config-json.util';

function validateAaveVaults(vaults: AaveVaultDefinition[]): AaveVaultDefinition[] {
  const seenIds = new Set<string>();

  for (const vault of vaults) {
    if (seenIds.has(vault.vaultId)) {
      throw new Error(`Duplicate vaultId in AAVE_VAULTS_CONFIG: ${vault.vaultId}`);
    }

    seenIds.add(vault.vaultId);
  }

  return vaults;
}

export default registerAs('aave', (): AaveConfig => {
  const vaults = parseConfigJson<AaveVaultDefinition>(
    process.env.AAVE_VAULTS_CONFIG,
    'AAVE_VAULTS_CONFIG',
  );

  return {
    apiUrl: process.env.AAVE_API_URL ?? 'https://api.v3.aave.com/graphql',
    vaults: validateAaveVaults(vaults),
  };
});
