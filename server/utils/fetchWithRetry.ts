import { logger } from "./logger.js";

export interface FetchRetryOptions {
  /** Timeout per attempt in milliseconds (default: 5000ms) */
  timeoutMs?: number;
  /** Maximum retry attempts for transient failures (default: 2) */
  retries?: number;
  /** Initial backoff delay in milliseconds (default: 300ms) */
  backoffMs?: number;
  /** Whether to apply random jitter to backoff (default: true) */
  jitter?: boolean;
}

export interface FetchRetryResult<T = any> {
  ok: boolean;
  status: number;
  data: T | null;
  text: string;
  contentType: string;
  headers?: Record<string, string>;
  error?: string;
}

/**
 * Resilient fetch utility featuring per-request timeout aborts and
 * exponential backoff with randomized jitter on transient HTTP 5xx/429 status codes.
 */
export async function fetchWithRetry<T = any>(
  url: string,
  options: RequestInit = {},
  retryOpts: FetchRetryOptions = {}
): Promise<FetchRetryResult<T>> {
  const {
    timeoutMs = 5000,
    retries = 2,
    backoffMs = 300,
    jitter = true,
  } = retryOpts;

  let attempt = 0;
  let lastError: any = null;

  while (attempt <= retries) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timer);

      const status = response.status;
      const contentType = response.headers.get("content-type") || "";
      const text = await response.text().catch(() => "");

      // Extract response headers as a clean key-value object
      const headerMap: Record<string, string> = {};
      response.headers.forEach((val, key) => {
        headerMap[key.toLowerCase()] = val;
      });

      // Retry on transient server errors (500, 502, 503, 504) or rate limits (429)
      const isTransient = (status >= 500 && status <= 504) || status === 429;
      if (isTransient && attempt < retries) {
        attempt++;
        const jitterOffset = jitter ? Math.floor(Math.random() * 200) : 0;
        const delay = Math.pow(2, attempt) * backoffMs + jitterOffset;
        logger.warn(
          { url, status, attempt, maxRetries: retries, delay },
          "Transient HTTP status from remote service; retrying with exponential backoff..."
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      // Parse JSON only when content-type is JSON or body appears to be JSON
      let data: T | null = null;
      if (
        contentType.includes("application/json") ||
        contentType.includes("+json") ||
        text.trim().startsWith("{") ||
        text.trim().startsWith("[")
      ) {
        try {
          data = JSON.parse(text);
        } catch {
          data = null;
        }
      }

      return {
        ok: response.ok,
        status,
        data,
        text,
        contentType,
        headers: headerMap,
        error: response.ok ? undefined : (data as any)?.message || `HTTP ${status}`,
      };
    } catch (err: any) {
      clearTimeout(timer);
      lastError = err;
      const isAbort = err?.name === "AbortError";

      if (attempt < retries) {
        attempt++;
        const jitterOffset = jitter ? Math.floor(Math.random() * 200) : 0;
        const delay = Math.pow(2, attempt) * backoffMs + jitterOffset;
        logger.warn(
          { url, err: err?.message, attempt, maxRetries: retries, delay, isTimeout: isAbort },
          "Network or timeout error during request; retrying with backoff..."
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      return {
        ok: false,
        status: 0,
        data: null,
        text: "",
        contentType: "",
        error: isAbort ? `Request timed out after ${timeoutMs}ms` : (err?.message || "Network error"),
      };
    }
  }

  return {
    ok: false,
    status: 0,
    data: null,
    text: "",
    contentType: "",
    error: lastError?.message || "Maximum retry attempts exceeded",
  };
}
