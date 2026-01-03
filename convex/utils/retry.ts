/**
 * Retry utility with exponential backoff
 * Handles transient failures gracefully
 */

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  timeoutMs?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  attempts: number;
}

/**
 * Execute a function with retry logic and timeout
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  sourceName: string,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 10000,
    timeoutMs = 15000,
    onRetry,
  } = options;

  let lastError: string = '';
  let attempts = 0;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    attempts = attempt;
    
    try {
      // Race between function execution and timeout
      const data = await Promise.race([
        fn(),
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
        ),
      ]);

      return { success: true, data, attempts };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.error(`[${sourceName}] Attempt ${attempt}/${maxRetries} failed: ${lastError}`);

      // Check if it's a rate limit error (429)
      if (lastError.includes('429') || lastError.toLowerCase().includes('rate limit')) {
        // Longer backoff for rate limits
        const delayMs = Math.min(baseDelayMs * Math.pow(3, attempt - 1), maxDelayMs);
        console.log(`[${sourceName}] Rate limited, waiting ${delayMs}ms before retry...`);
        await sleep(delayMs);
      } else if (attempt < maxRetries) {
        // Standard exponential backoff
        const delayMs = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
        onRetry?.(attempt, err as Error);
        await sleep(delayMs);
      }
    }
  }

  return { success: false, error: lastError, attempts };
}

/**
 * Execute multiple scrapers in parallel with individual retry logic
 */
export async function executeWithRetry<T>(
  scrapers: Array<{
    name: string;
    fn: () => Promise<T>;
    options?: RetryOptions;
  }>
): Promise<Map<string, RetryResult<T>>> {
  const results = new Map<string, RetryResult<T>>();

  const promises = scrapers.map(async ({ name, fn, options }) => {
    const result = await withRetry(fn, name, options);
    results.set(name, result);
  });

  await Promise.allSettled(promises);
  return results;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
