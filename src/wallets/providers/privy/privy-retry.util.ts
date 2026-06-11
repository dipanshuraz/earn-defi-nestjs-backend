export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
}

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_BASE_DELAY_MS = 250;

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const shouldRetry =
    options.shouldRetry ??
    ((error: unknown) => isRetryablePrivyError(error));

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt >= maxAttempts || !shouldRetry(error, attempt)) {
        throw error;
      }

      await sleep(baseDelayMs * attempt);
    }
  }

  throw lastError;
}

export function isRetryablePrivyError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const status = 'status' in error ? Number(error.status) : undefined;

  if (status === 429) {
    return true;
  }

  if (status !== undefined && status >= 500) {
    return true;
  }

  const name = 'name' in error ? String(error.name) : '';

  return (
    name === 'APIConnectionError' ||
    name === 'APIConnectionTimeoutError' ||
    name === 'InternalServerError'
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
