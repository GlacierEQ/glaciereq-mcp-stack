/**
 * Exponential backoff retry wrapper.
 * Retries up to `maxAttempts` times with jitter.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxAttempts?: number; baseDelayMs?: number; label?: string } = {}
): Promise<T> {
  const { maxAttempts = 3, baseDelayMs = 300, label = "operation" } = options;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        const delay = baseDelayMs * 2 ** (attempt - 1) + Math.random() * 100;
        process.stderr.write(
          `[RETRY] ${label} failed (attempt ${attempt}/${maxAttempts}), retrying in ${Math.round(delay)}ms\n`
        );
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}
