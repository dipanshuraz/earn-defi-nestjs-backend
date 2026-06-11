jest.mock('./privy-wallet.service', () => ({
  PrivyWalletService: class PrivyWalletService {},
}));

import { PrivyWalletProvider } from './privy-wallet.provider';
import { PrivyWalletService } from './privy-wallet.service';

describe('PrivyWalletProvider', () => {
  const privyWalletServiceMock = {
    createWallet: jest.fn(),
    getWallet: jest.fn(),
    getBalance: jest.fn(),
    prepareTransactionSigning: jest.fn(),
    sendTransaction: jest.fn(),
  };

  let provider: PrivyWalletProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new PrivyWalletProvider(
      privyWalletServiceMock as unknown as PrivyWalletService,
    );
  });

  it('uses the privy provider type', () => {
    expect(provider.providerType).toBe('privy');
  });

  it('delegates signTransaction to prepareTransactionSigning', async () => {
    privyWalletServiceMock.prepareTransactionSigning.mockResolvedValue({
      hash: '0xabc',
      signature: '0xsigned',
      encoding: 'rlp',
    });

    const result = await provider.signTransaction({
      providerWalletId: 'privy-wallet-1',
      chainId: 84532,
      to: '0x0000000000000000000000000000000000000001',
      value: '1000',
    });

    expect(privyWalletServiceMock.prepareTransactionSigning).toHaveBeenCalled();
    expect(result.signature).toBe('0xsigned');
  });
});
