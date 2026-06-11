import {
  interpolateConfigValues,
  parseConfigJson,
} from './config-json.util';

describe('config-json.util', () => {
  it('parses JSON arrays from environment strings', () => {
    const parsed = parseConfigJson<{ slug: string }>(
      '[{"slug":"base-sepolia"}]',
      'CHAINS_CONFIG',
    );

    expect(parsed).toEqual([{ slug: 'base-sepolia' }]);
  });

  it('interpolates environment variables into config values', () => {
    const result = interpolateConfigValues(
      [{ rpcUrl: 'https://base-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}' }],
      { ALCHEMY_API_KEY: 'test-key' },
    );

    expect(result[0]?.rpcUrl).toBe('https://base-sepolia.g.alchemy.com/v2/test-key');
  });
});
