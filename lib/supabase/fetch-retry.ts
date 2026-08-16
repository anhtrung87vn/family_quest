const MAX_RETRIES = 5;
const RETRY_BASE_MS = 500;

/**
 * Wraps fetch with exponential-backoff retry for transient ECONNRESET errors.
 * Passed as `global.fetch` to every Supabase client so all RPC/REST calls
 * are automatically retried on TCP connection resets without surfacing 500s.
 */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fetch(input, init);
    } catch (err) {
      lastError = err;
      const isTransient =
        err instanceof TypeError &&
        (err.message.includes("ECONNRESET") ||
          err.message.includes("fetch failed") ||
          err.message.includes("socket hang up") ||
          err.message.includes("ETIMEDOUT"));
      if (!isTransient) throw err;
      const delay = RETRY_BASE_MS * 2 ** attempt;
      console.warn(
        `[supabase/fetch-retry] attempt ${attempt + 1}/${MAX_RETRIES} failed — retrying in ${delay}ms`,
        (err as Error).message,
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}
