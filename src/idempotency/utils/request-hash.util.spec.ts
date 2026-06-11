import { hashRequest } from './request-hash.util';

describe('hashRequest', () => {
  it('produces stable hashes regardless of object key order', () => {
    const first = hashRequest({
      method: 'POST',
      path: '/earn/vaults/:vaultId/deposit',
      params: { vaultId: 'vault-1' },
      query: { chainId: '8453' },
      body: { amount: '1000000', walletId: 'wallet-1' },
    });

    const second = hashRequest({
      method: 'POST',
      path: '/earn/vaults/:vaultId/deposit',
      params: { vaultId: 'vault-1' },
      query: { chainId: '8453' },
      body: { walletId: 'wallet-1', amount: '1000000' },
    });

    expect(first).toBe(second);
  });

  it('changes hash when request payload changes', () => {
    const first = hashRequest({
      method: 'POST',
      path: '/earn/vaults/:vaultId/deposit',
      params: { vaultId: 'vault-1' },
      query: {},
      body: { amount: '1000000' },
    });

    const second = hashRequest({
      method: 'POST',
      path: '/earn/vaults/:vaultId/deposit',
      params: { vaultId: 'vault-1' },
      query: {},
      body: { amount: '2000000' },
    });

    expect(first).not.toBe(second);
  });
});
