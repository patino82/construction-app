export interface RetryOptions {
  retries?: number;
  factor?: number;
  minTimeoutMs?: number;
}

export async function withRetry<T>(operation: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { retries = 3, factor = 2, minTimeoutMs = 250 } = options;

  let attempt = 0;
  let delay = minTimeoutMs;
  let lastError: unknown;

  while (attempt <= retries) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === retries) break;
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= factor;
      attempt += 1;
    }
  }

  throw lastError;
}
