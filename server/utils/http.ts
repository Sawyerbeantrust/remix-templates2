import path from "path";
import type { SafeWpResult } from "../types/index.js";
import { fetchWithRetry, FetchRetryOptions, FetchRetryResult } from "./fetchWithRetry.js";
import { CONFIG } from "../config.js";
import { logger } from "./logger.js";

export const DEFAULT_TIMEOUT_MS = 5000;
export const MEDIA_UPLOAD_TIMEOUT_MS = 15000;
export const AI_REQUEST_TIMEOUT_MS = 20000;

export const WP_BASE_URL = CONFIG.WP_BASE_URL;
export const BASE_URL = CONFIG.BASE_URL;

/**
 * Normalizes any image URL or relative path to a canonical, secure absolute HTTPS URL
 * @param rawUrl Raw URL or path string
 * @param wpBaseUrl Optional base domain for WordPress (defaults to CONFIG.WP_BASE_URL)
 */
export function normalizeImageUrl(rawUrl?: string | null, wpBaseUrl = CONFIG.WP_BASE_URL): string {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  let s = rawUrl.trim();
  if (!s) return "";

  // Protocol-relative URLs (e.g. //domain.com/path)
  if (s.startsWith("//")) {
    return `https:${s}`;
  }

  // Force HTTPS on insecure HTTP URLs
  if (s.startsWith("http://")) {
    s = s.replace(/^http:\/\//i, "https://");
  }

  // If it's already an absolute URL
  if (s.startsWith("https://")) {
    return s;
  }

  // Data or blob URIs
  if (s.startsWith("data:") || s.startsWith("blob:")) {
    return s;
  }

  // Other explicit URI schemes (e.g. ftp:, file:, gopher:) - preserve so validator can reject invalid protocols
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(s)) {
    return s;
  }

  // Handle absolute paths starting with /
  if (s.startsWith("/")) {
    if (s.startsWith("/wp-content/")) {
      return `${wpBaseUrl}${s}`;
    }
    if (s.startsWith("/images/") || s.startsWith("/assets/images/") || s.startsWith("/assets/")) {
      return `${CONFIG.BASE_URL}${s}`;
    }
    return `${wpBaseUrl}${s}`;
  }

  // Handle relative WordPress upload paths
  if (s.startsWith("wp-content/")) {
    return `${wpBaseUrl}/${s}`;
  }

  // Default to WordPress uploads folder for bare filenames
  return `${wpBaseUrl}/wp-content/uploads/${s}`;
}

export interface RemoteImageValidationResult {
  safe: boolean;
  valid: boolean;
  normalizedUrl?: string;
  error?: string;
  statusCode?: number;
}

/**
 * Validates whether a remote URL is safe to fetch (strict SSRF protection)
 */
export function validateRemoteImageUrl(rawUrl: string): RemoteImageValidationResult {
  if (!rawUrl || typeof rawUrl !== "string") {
    return { safe: false, valid: false, error: "Missing or invalid URL parameter", statusCode: 400 };
  }

  const normalized = normalizeImageUrl(rawUrl);
  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    return { safe: false, valid: false, error: "Malformed URL", statusCode: 400 };
  }

  // Require HTTP or HTTPS protocol
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { safe: false, valid: false, error: "Only HTTP and HTTPS protocols are permitted", statusCode: 400 };
  }


  const hostname = parsed.hostname.toLowerCase().trim();

  // Block loopback and local hostnames
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    hostname === "0" ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    logger.warn(
      { url: hostname, reason: "loopback_address", ip: hostname },
      "SSRF attack prevented: attempted access to local address"
    );
    return { safe: false, valid: false, error: "Access to loopback/local addresses is blocked", statusCode: 403 };
  }

  // Block private IPv4 ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16 link-local / cloud metadata)
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = hostname.match(ipv4Regex);
  if (match) {
    const octets = match.slice(1, 5).map(Number);
    if (
      octets[0] === 10 || // 10.0.0.0/8
      (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) || // 172.16.0.0/12
      (octets[0] === 192 && octets[1] === 168) || // 192.168.0.0/16
      (octets[0] === 169 && octets[1] === 254) || // 169.254.0.0/16 (AWS/GCP metadata)
      octets[0] === 127 || // 127.0.0.0/8
      octets[0] === 0 // 0.0.0.0/8
    ) {
      logger.warn(
        { url: hostname, reason: "private_ip", octets },
        "SSRF attack prevented: attempted access to private IP"
      );
      return { safe: false, valid: false, error: "Access to private IP addresses is blocked", statusCode: 403 };
    }
  }

  // Check against trusted domain whitelist
  const allowedDomains: string[] = [...CONFIG.TRUSTED_IMAGE_DOMAINS];
  try {
    if (CONFIG.WP_BASE_URL) {
      allowedDomains.push(new URL(CONFIG.WP_BASE_URL).hostname);
    }
  } catch {}
  try {
    if (CONFIG.BASE_URL) {
      allowedDomains.push(new URL(CONFIG.BASE_URL).hostname);
    }
  } catch {}

  const isAllowedHost = allowedDomains.some((d) => hostname === d || hostname.endsWith(`.${d}`));
  if (!isAllowedHost) {
    logger.warn(
      { url: hostname, allowedDomains, reason: "not_whitelisted" },
      "Image URL blocked: domain not in trusted whitelist"
    );
    return {
      safe: false,
      valid: false,
      error: `Domain '${hostname}' is not in the trusted image whitelist`,
      statusCode: 403,
    };
  }

  return { safe: true, valid: true, normalizedUrl: normalized };
}



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
