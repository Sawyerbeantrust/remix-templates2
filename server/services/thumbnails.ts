import http from "http";
import https from "https";
import crypto from "crypto";
import sharp from "sharp";
import { LRUCache } from "lru-cache";
import { CONFIG, THUMBNAIL_SIZES, THUMBNAIL_CONFIG, type ThumbnailSizeKey } from "../config.js";
import { normalizeImageUrl, validateRemoteImageUrl } from "../utils/http.js";
import { logger } from "../utils/logger.js";

export interface ThumbnailCacheEntry {
  buffer: Buffer;
  contentType: string;
  etag: string;
  lastModified: string;
  width?: number;
  height?: number;
  sizeBytes: number;
  createdAt: number;
}

export interface ThumbnailVariantResult {
  size: ThumbnailSizeKey;
  buffer: Buffer;
  contentType: string;
  width: number;
  height: number;
  sizeBytes: number;
}

export interface ProcessThumbnailResult {
  success: boolean;
  buffer?: Buffer;
  contentType?: string;
  etag?: string;
  lastModified?: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  fromCache?: boolean;
  error?: string;
  statusCode?: number;
}

// In-memory LRU cache configured via centralized THUMBNAIL_CONFIG
const thumbnailCache = new LRUCache<string, ThumbnailCacheEntry>({
  max: THUMBNAIL_CONFIG.CACHE_MAX_ITEMS,
  maxSize: THUMBNAIL_CONFIG.CACHE_MAX_BYTES,
  sizeCalculation: (entry) => entry.buffer.length,
  ttl: THUMBNAIL_CONFIG.CACHE_TTL_MS,
});

// Blacklist for failed URLs to prevent repeated server hammering
export const failedUrlBlacklist = new Map<string, { timestamp: number; reason: string; attempts: number }>();

/**
 * Checks if a URL is currently blacklisted due to recent repeated failures
 */
export function isUrlBlacklisted(url: string, ttlMs = THUMBNAIL_CONFIG.BLACKLIST_TTL_MS): boolean {
  const item = failedUrlBlacklist.get(url);
  if (!item) return false;
  if (Date.now() - item.timestamp > ttlMs) {
    failedUrlBlacklist.delete(url);
    return false;
  }
  return true;
}

/**
 * Records a URL into the failure blacklist
 */
export function recordFailedUrl(url: string, reason: string | number, ttlMs = THUMBNAIL_CONFIG.BLACKLIST_TTL_MS): void {
  const current = failedUrlBlacklist.get(url);
  const attempts = (current?.attempts || 0) + 1;
  failedUrlBlacklist.set(url, {
    timestamp: Date.now(),
    reason: String(reason),
    attempts,
  });
}

/**
 * Clears the failed URL blacklist
 */
export function clearBlacklist(): void {
  failedUrlBlacklist.clear();
}


// Cache metrics
let cacheHits = 0;
let cacheMisses = 0;

// Insecure agents for SSL bypass
const httpsInsecureAgent = new https.Agent({ rejectUnauthorized: false, keepAlive: true, maxSockets: 50 });
const httpInsecureAgent = new http.Agent({ keepAlive: true, maxSockets: 50 });

/**
 * Builds a unique cache key for a URL and size variant
 */
function buildCacheKey(url: string, size: ThumbnailSizeKey): string {
  const normalized = normalizeImageUrl(url);
  return `${normalized}::${size}`;
}

/**
 * Computes an ETag from buffer content and size
 */
export function computeEtag(buffer: Buffer, sizeKey: string): string {
  const hash = crypto.createHash("md5").update(buffer).digest("hex");
  return `"${hash.slice(0, 24)}-${sizeKey}"`;
}

/**
 * Generates resized image variants using sharp
 * @param buffer Input image buffer
 * @param filename Original filename for logging/formatting
 */
export async function generateThumbnails(
  buffer: Buffer,
  filename: string
): Promise<Record<"small" | "medium" | "large", ThumbnailVariantResult>> {
  const pipeline = sharp(buffer).rotate();
  const metadata = await pipeline.metadata();


  const results: Partial<Record<"small" | "medium" | "large", ThumbnailVariantResult>> = {};

  const sizes: Array<"small" | "medium" | "large"> = ["small", "medium", "large"];

  for (const sizeKey of sizes) {
    const config = THUMBNAIL_SIZES[sizeKey];
    if (!config) continue;

    let resizer = pipeline.clone().resize({
      width: config.width,
      height: config.height,
      fit: "inside",
      withoutEnlargement: true,
    });

    let outputBuffer: Buffer;
    let contentType = "image/jpeg";

    if (metadata.format === "png") {
      outputBuffer = await resizer
        .png({ quality: THUMBNAIL_CONFIG.PNG_COMPRESSION_LEVEL ? 85 : 85, compressionLevel: THUMBNAIL_CONFIG.PNG_COMPRESSION_LEVEL })
        .toBuffer();
      contentType = "image/png";
    } else if (metadata.format === "webp") {
      outputBuffer = await resizer.webp({ quality: THUMBNAIL_CONFIG.WEBP_QUALITY }).toBuffer();
      contentType = "image/webp";
    } else {
      outputBuffer = await resizer
        .jpeg({ quality: THUMBNAIL_CONFIG.JPEG_QUALITY, mozjpeg: THUMBNAIL_CONFIG.ENABLE_MOZJPEG })
        .toBuffer();
      contentType = "image/jpeg";
    }

    const resMeta = await sharp(outputBuffer).metadata();

    results[sizeKey] = {
      size: sizeKey,
      buffer: outputBuffer,
      contentType,
      width: resMeta.width || config.width,
      height: resMeta.height || config.height,
      sizeBytes: outputBuffer.length,
    };
  }

  return results as Record<"small" | "medium" | "large", ThumbnailVariantResult>;
}

/**
 * Retrieves a cached thumbnail if available
 */
export function getCachedThumbnail(url: string, size: ThumbnailSizeKey = "medium"): ThumbnailCacheEntry | undefined {
  const key = buildCacheKey(url, size);
  const entry = thumbnailCache.get(key);
  if (entry) {
    cacheHits++;
    return entry;
  }
  cacheMisses++;
  return undefined;
}

/**
 * Stores a thumbnail into the LRU cache
 */
export function setCachedThumbnail(
  url: string,
  size: ThumbnailSizeKey,
  data: Omit<ThumbnailCacheEntry, "createdAt">
): void {
  const key = buildCacheKey(url, size);
  thumbnailCache.set(key, {
    ...data,
    createdAt: Date.now(),
  });
}

/**
 * Helper to fetch remote raw image buffer with timeout, redirect following, and retry logic
 */
async function fetchRemoteBuffer(
  targetUrl: string,
  timeoutMs: number = THUMBNAIL_CONFIG.FETCH_TIMEOUT_MS,
  maxRetries: number = THUMBNAIL_CONFIG.FETCH_MAX_RETRIES
): Promise<{ buffer: Buffer; contentType: string; lastModified: string }> {
  let attempt = 0;
  let lastError: Error = new Error("Fetch failed");

  while (attempt <= maxRetries) {
    try {
      return await new Promise<{ buffer: Buffer; contentType: string; lastModified: string }>((resolve, reject) => {
        const parsedUrl = new URL(targetUrl);
        const isHttps = parsedUrl.protocol === "https:";
        const client = isHttps ? https : http;
        const agent = isHttps ? httpsInsecureAgent : httpInsecureAgent;

        const requestOptions = {
          protocol: parsedUrl.protocol,
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || (isHttps ? 443 : 80),
          path: parsedUrl.pathname + parsedUrl.search,
          method: "GET",
          agent,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) TritonProxy/2.0",
            Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
          },
          timeout: timeoutMs,
        };

        const req = client.request(requestOptions, (res) => {
          // Handle redirects (up to 1 hop)
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            const redirectUrl = res.headers.location.startsWith("http")
              ? res.headers.location
              : new URL(res.headers.location, targetUrl).toString();
            return fetchRemoteBuffer(redirectUrl, timeoutMs, 0).then(resolve).catch(reject);
          }

          if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
            return reject(new Error(`Origin returned HTTP ${res.statusCode || "unknown"}`));
          }

          const chunks: Buffer[] = [];
          res.on("data", (chunk: Buffer) => chunks.push(chunk));
          res.on("end", () => {
            const buffer = Buffer.concat(chunks);
            const contentType = res.headers["content-type"] || "image/jpeg";
            const lastModified = res.headers["last-modified"] || new Date().toUTCString();
            resolve({ buffer, contentType, lastModified });
          });
        });

        req.on("error", (err) => reject(err));
        req.on("timeout", () => {
          req.destroy(new Error(`Request timed out after ${timeoutMs}ms`));
        });

        req.end();
      });
    } catch (err: any) {
      lastError = err;
      attempt++;
      if (attempt <= maxRetries) {
        await new Promise((r) => setTimeout(r, 200 * attempt));
      }
    }
  }

  throw lastError;
}

/**
 * Processes, resizes, and caches a thumbnail from a URL
 */
export async function fetchAndProcessThumbnail(
  rawUrl: string,
  size: ThumbnailSizeKey = "medium",
  options: { bypassBlacklist?: boolean } = {}
): Promise<ProcessThumbnailResult> {
  const startTime = Date.now();

  // 1. SSRF & URL Validation
  const validation = validateRemoteImageUrl(rawUrl);
  if (!validation.safe || !validation.normalizedUrl) {
    return {
      success: false,
      error: validation.error || "Invalid image URL",
      statusCode: validation.statusCode || 400,
    };
  }

  const targetUrl = validation.normalizedUrl;

  // 2. Check Blacklist / Circuit Breaker
  if (!options.bypassBlacklist) {
    const blacklisted = failedUrlBlacklist.get(targetUrl);
    if (blacklisted) {
      if (Date.now() - blacklisted.timestamp < THUMBNAIL_CONFIG.BLACKLIST_TTL_MS) {
        return {
          success: false,
          error: `URL temporarily blocked due to repeated failures: ${blacklisted.reason}`,
          statusCode: 404,
        };
      } else {
        failedUrlBlacklist.delete(targetUrl);
      }
    }
  }

  // 3. Check Cache
  const cached = getCachedThumbnail(targetUrl, size);
  if (cached) {
    return {
      success: true,
      buffer: cached.buffer,
      contentType: cached.contentType,
      etag: cached.etag,
      lastModified: cached.lastModified,
      sizeBytes: cached.sizeBytes,
      width: cached.width,
      height: cached.height,
      fromCache: true,
    };
  }

  // 4. Fetch Remote Buffer
  try {
    const { buffer: rawBuffer, contentType: rawContentType, lastModified } = await fetchRemoteBuffer(
      targetUrl,
      THUMBNAIL_CONFIG.FETCH_TIMEOUT_MS,
      THUMBNAIL_CONFIG.FETCH_MAX_RETRIES
    );

    if (!rawBuffer || rawBuffer.length === 0) {
      throw new Error("Received empty response body from origin");
    }

    let finalBuffer = rawBuffer;
    let finalContentType = rawContentType;
    let finalWidth: number | undefined;
    let finalHeight: number | undefined;

    // 5. Perform Sharp Resizing if size !== "original"
    const sizeConfig = THUMBNAIL_SIZES[size];
    if (size !== "original" && sizeConfig) {
      try {
        const image = sharp(rawBuffer).rotate();
        const metadata = await image.metadata();

        const resizedPipeline = image.resize({
          width: sizeConfig.width,
          height: sizeConfig.height,
          fit: "inside",
          withoutEnlargement: true,
        });

        if (metadata.format === "png") {
          finalBuffer = await resizedPipeline
            .png({ quality: 85, compressionLevel: THUMBNAIL_CONFIG.PNG_COMPRESSION_LEVEL })
            .toBuffer();
          finalContentType = "image/png";
        } else if (metadata.format === "webp") {
          finalBuffer = await resizedPipeline.webp({ quality: THUMBNAIL_CONFIG.WEBP_QUALITY }).toBuffer();
          finalContentType = "image/webp";
        } else {
          finalBuffer = await resizedPipeline
            .jpeg({ quality: THUMBNAIL_CONFIG.JPEG_QUALITY, mozjpeg: THUMBNAIL_CONFIG.ENABLE_MOZJPEG })
            .toBuffer();
          finalContentType = "image/jpeg";
        }

        const resMeta = await sharp(finalBuffer).metadata();
        finalWidth = resMeta.width;
        finalHeight = resMeta.height;
      } catch (sharpErr: any) {
        logger.warn({ targetUrl, err: sharpErr.message }, "Sharp resizing failed, falling back to original buffer");
        finalBuffer = rawBuffer;
      }
    }

    const etag = computeEtag(finalBuffer, size);

    // 6. Save to Cache
    setCachedThumbnail(targetUrl, size, {
      buffer: finalBuffer,
      contentType: finalContentType,
      etag,
      lastModified,
      width: finalWidth,
      height: finalHeight,
      sizeBytes: finalBuffer.length,
    });

    // Clear any past blacklist record
    failedUrlBlacklist.delete(targetUrl);

    logger.debug(
      {
        url: targetUrl,
        size,
        durationMs: Date.now() - startTime,
        bytes: finalBuffer.length,
      },
      "Thumbnail processed and cached successfully"
    );

    return {
      success: true,
      buffer: finalBuffer,
      contentType: finalContentType,
      etag,
      lastModified,
      sizeBytes: finalBuffer.length,
      width: finalWidth,
      height: finalHeight,
      fromCache: false,
    };
  } catch (err: any) {
    // Record into blacklist
    const current = failedUrlBlacklist.get(targetUrl);
    const attempts = (current?.attempts || 0) + 1;
    failedUrlBlacklist.set(targetUrl, {
      timestamp: Date.now(),
      reason: err.message || "Fetch failed",
      attempts,
    });

    logger.warn(
      {
        url: targetUrl,
        size,
        durationMs: Date.now() - startTime,
        error: err.message,
        attempts,
      },
      "Failed to fetch or process thumbnail"
    );

    return {
      success: false,
      error: `Failed to fetch thumbnail: ${err.message}`,
      statusCode: 404,
    };
  }
}

/**
 * Returns cache and blacklist statistics
 */
export function getCacheStats() {
  const totalEntries = thumbnailCache.size;
  const currentSizeBytes = thumbnailCache.calculatedSize || 0;
  const totalRequests = cacheHits + cacheMisses;
  const hitRate = totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0;

  return {
    itemCount: totalEntries,
    currentSizeBytes,
    currentSizeMb: Number((currentSizeBytes / (1024 * 1024)).toFixed(2)),
    maxSizeBytes: THUMBNAIL_CONFIG.CACHE_MAX_BYTES,
    maxSizeMb: THUMBNAIL_CONFIG.CACHE_MAX_BYTES / (1024 * 1024),
    maxItems: THUMBNAIL_CONFIG.CACHE_MAX_ITEMS,
    hits: cacheHits,
    misses: cacheMisses,
    hitRatePercent: Number(hitRate.toFixed(1)),
    blacklistCount: failedUrlBlacklist.size,
  };
}

/**
 * Clears or invalidates cache entries
 */
export function invalidateCache(urlPattern?: string): number {
  if (!urlPattern) {
    const count = thumbnailCache.size;
    thumbnailCache.clear();
    failedUrlBlacklist.clear();
    return count;
  }

  let removed = 0;
  for (const key of thumbnailCache.keys()) {
    if (key.includes(urlPattern)) {
      thumbnailCache.delete(key);
      removed++;
    }
  }

  for (const blacklistedUrl of failedUrlBlacklist.keys()) {
    if (blacklistedUrl.includes(urlPattern)) {
      failedUrlBlacklist.delete(blacklistedUrl);
    }
  }

  return removed;
}

// Cleanup interval: prune stale blacklist records every 10 minutes
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [url, item] of failedUrlBlacklist.entries()) {
    if (now - item.timestamp > THUMBNAIL_CONFIG.BLACKLIST_TTL_MS) {
      failedUrlBlacklist.delete(url);
    }
  }
}, 10 * 60 * 1000);

if (cleanupTimer.unref) {
  cleanupTimer.unref();
}

