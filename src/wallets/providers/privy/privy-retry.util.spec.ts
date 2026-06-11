import { isRetryablePrivyError, withRetry } from './privy-retry.util';

function createRateLimitError(): Error {
  return Object.assign(new Error('rate limit'), { name: 'RateLimitError', status: 429 });
}

describe('withRetry', () => {
  it('retries retryable errors and eventually succeeds', async () => {
    let attempts = 0;

    const result = await withRetry(async () => {
      attempts += 1;

      if (attempts < 3) {
        throw createRateLimitError();
      }

      return 'ok';
    });

    expect(result).toBe('ok');
    expect(attempts).toBe(3);
  });

  it('does not retry non-retryable errors', async () => {
    let attempts = 0;

    await expect(
      withRetry(async () => {
        attempts += 1;
        throw new Error('fatal');
      }),
    ).rejects.toThrow('fatal');

    expect(attempts).toBe(1);
  });
});

describe('isRetryablePrivyError', () => {
  it('detects rate limit errors', () => {
    expect(isRetryablePrivyError(createRateLimitError())).toBe(true);
  });
});
