import { useCallback } from 'react';

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  timeoutMs?: number;
  /** Called on each failed attempt before the next retry */
  onRetry?: (attempt: number, error: any) => void;
}

/**
 * Pure utility: retries an async function with exponential backoff.
 * Compatible with Supabase-style `{ data, error }` responses.
 *
 * Throws if all attempts fail.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxRetries = 3, baseDelay = 1000, maxDelay = 5000, timeoutMs = 20000, onRetry } = options;

  let lastError: any = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Race against a per-attempt timeout
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
      );

      const result = await Promise.race([fn(), timeoutPromise]);
      return result;
    } catch (err: any) {
      lastError = err;

      if (attempt < maxRetries - 1) {
        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
        onRetry?.(attempt + 1, err);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Hook version: returns a stable `retryableCall` function.
 * Useful when the wrapped function is referenced in a useCallback / useEffect.
 */
export function useRetryableCall(options: RetryOptions = {}) {
  const retryableCall = useCallback(
    <T>(fn: () => Promise<T>) => withRetry(fn, options),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [options.maxRetries, options.baseDelay, options.maxDelay, options.timeoutMs]
  );

  return retryableCall;
}
