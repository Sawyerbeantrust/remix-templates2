import path from "path";
import type { SafeWpResult } from "../types/index.js";
import { fetchWithRetry, FetchRetryOptions, FetchRetryResult } from "./fetchWithRetry.js";

export const DEFAULT_TIMEOUT_MS = 5000;
export const MEDIA_UPLOAD_TIMEOUT_MS = 15000;
export const AI_REQUEST_TIMEOUT_MS = 20000;

export const WP_BASE_URL = (process.env.WP_BASE_URL || "https://store.car-lifts.co.za").replace(/\/+$/, "");

/**
 * Extracts a concise, human-readable error from raw response text
 */
export function extractCleanError(status: number, rawText: string): string {
  if (!rawText) return `HTTP ${status}`;
  try {
    const parsed = JSON.parse(rawText);
    if (parsed.message) {
      return `WordPress (${status}): ${parsed.message}`;
    }
  } catch {}
  if (
    rawText.includes("<title>Just a moment...</title>") ||
    rawText.includes("challenges.cloudflare.com") ||
    rawText.includes("cf-chl")
  ) {
    return `Cloudflare security challenge (HTTP ${status}). Ensure CF_BYPASS_SECRET is set in environment and configured in Cloudflare WAF.`;
  }
  if (rawText.startsWith("<!DOCTYPE") || rawText.startsWith("<html")) {
    const titleMatch = rawText.match(/<title>([^<]*)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      return `WordPress returned HTML error (HTTP ${status}): ${titleMatch[1].trim()}`;
    }
    return `WordPress returned HTML page (HTTP ${status})`;
  }
  return rawText.slice(0, 300);
}

/**
 * Detects MIME content-type from a data URI or filename extension
 */
export function detectContentType(dataUri: string, filename: string): string {
  if (typeof dataUri === "string") {
    const match = dataUri.match(/^data:([^;]+);base64,/i);
    if (match && match[1]) {
      return match[1].toLowerCase();
    }
  }
  const ext = path.extname(filename || "").toLowerCase();
  switch (ext) {
    case ".png": return "image/png";
    case ".webp": return "image/webp";
    case ".gif": return "image/gif";
    case ".svg": return "image/svg+xml";
    case ".avif": return "image/avif";
    case ".jpg":
    case ".jpeg":
    default:
      return "image/jpeg";
  }
}

/**
 * Builds HTTP headers for WordPress API calls.
 * - Only sets Authorization header if user/password or token are provided.
 * - Reads TRITON_KEY / WP_MIGRATE_KEY conditionally from environment instead of hard-coding.
 */
export function getWpHeaders(extra?: Record<string, string>): Record<string, string> {
  const user = (process.env.WP_APP_USER || "").trim();
  const pass = (process.env.WP_APP_PASSWORD || "").replace(/\s+/g, "").trim();
  const token = (process.env.WP_AUTH_TOKEN || "").trim();

  const headers: Record<string, string> = {
    "User-Agent": (process.env.WP_USER_AGENT || "TritonShowroomSync/2.0 (sync@car-lifts.co.za)").trim(),
    "Accept": "application/json, text/plain, */*",
    ...extra,
  };

  // Only set Authorization header when credentials/token explicitly exist
  if (user && pass) {
    headers["Authorization"] = "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");
  } else if (token) {
    headers["Authorization"] = token.startsWith("Bearer ") || token.startsWith("Basic ")
      ? token
      : `Bearer ${token}`;
  }

  // Use environment variable TRITON_KEY or WP_MIGRATE_KEY conditionally
  const tritonKey = (process.env.TRITON_KEY || process.env.WP_MIGRATE_KEY || "").trim();
  if (tritonKey) {
    headers["X-Triton-Key"] = tritonKey;
  }

  const cfBypassSecret = (process.env.CF_BYPASS_SECRET || process.env.VERCEL_SECRET || "").trim();
  if (cfBypassSecret) {
    headers["X-CF-Bypass-Secret"] = cfBypassSecret;
    if (!headers["X-Vercel-Secret"]) {
      headers["X-Vercel-Secret"] = cfBypassSecret;
    }
  }

  return headers;
}

/**
 * Legacy fetchWithTimeout wrapper using fetchWithRetry with 0 retries
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Resilient fetch with jittered backoff for transient 5xx/503 errors and network drops.
 * Backed by the central fetchWithRetry engine.
 */
export async function fetchWpSafe(
  url: string,
  options: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxRetries = 2
): Promise<SafeWpResult> {
  const res: FetchRetryResult = await fetchWithRetry(url, options, {
    timeoutMs,
    retries: maxRetries,
    backoffMs: 250,
    jitter: true,
  });

  return {
    ok: res.ok,
    status: res.status,
    data: res.data,
    text: res.text,
    contentType: res.contentType,
    error: res.error,
  };
}

export { fetchWithRetry };
