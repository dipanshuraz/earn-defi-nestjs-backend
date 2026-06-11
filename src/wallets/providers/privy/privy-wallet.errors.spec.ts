import { BadRequestException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { mapPrivyError } from './privy-wallet.errors';

function createPrivyLikeError(name: string, status: number): Error {
  return Object.assign(new Error(name), { name, status });
}

describe('mapPrivyError', () => {
  it('maps Privy not found errors', () => {
    const mapped = mapPrivyError(createPrivyLikeError('NotFoundError', 404), 'get wallet');

    expect(mapped).toBeInstanceOf(NotFoundException);
  });

  it('maps Privy rate limit errors', () => {
    const mapped = mapPrivyError(createPrivyLikeError('RateLimitError', 429), 'get wallet');

    expect(mapped).toBeInstanceOf(ServiceUnavailableException);
  });

  it('maps missing authorization key errors with setup guidance', () => {
    const mapped = mapPrivyError(
      Object.assign(new Error('401 {"error":"No valid authorization keys or user signing keys available"}'), {
        status: 401,
      }),
      'send transaction',
    );

    expect(mapped).toBeInstanceOf(BadRequestException);
    expect(mapped.message).toContain('POST /api/v1/wallets');
  });

  it('maps Privy connection errors', () => {
    const mapped = mapPrivyError(createPrivyLikeError('APIConnectionError', 0), 'get wallet');

    expect(mapped.getStatus()).toBe(502);
  });
});
