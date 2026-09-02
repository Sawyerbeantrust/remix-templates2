import path from "path";
import { getWpHeaders, fetchWpSafe, WP_BASE_URL, MEDIA_UPLOAD_TIMEOUT_MS, extractCleanError, normalizeImageUrl } from "../utils/http.js";
import { logger } from "../utils/logger.js";
import { CONFIG } from "../config.js";
import { generateThumbnails, setCachedThumbnail, computeEtag } from "./thumbnails.js";
import type { WpMediaItem, CatalogData } from "../types/index.js";

const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif", "svg", "avif"]);

/**
 * Sanitizes original filename and enforces extension whitelist to prevent path traversal / executable uploads
 */
function sanitizeFileName(originalName: string): string {
  const rawExt = path.extname(originalName).toLowerCase().replace(/^\./, "") || "jpg";
  const ext = ALLOWED_EXTENSIONS.has(rawExt) ? rawExt : "jpg";
  const baseName = path
    .basename(originalName, `.${rawExt}`)
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 80) || `upload_${Date.now()}`;
  return `${baseName}.${ext}`;
}

/**
 * Helper to detect Cloudflare challenges in raw response text
 */
function isCloudflareChallenge(text?: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return (
    text.includes("<title>Just a moment...</title>") ||
    text.includes("challenges.cloudflare.com") ||
    text.includes("cf-chl") ||
    text.includes("cf-mitigated") ||
    lower.includes("attention required! | cloudflare") ||
    lower.includes("cf-browser-verification") ||
    lower.includes("cloudflare ray id")
  );
}

/**
 * Uploads an image buffer directly to the WordPress Media Library and caches thumbnail variants
 */
export async function uploadBufferToWordPress(
  buffer: Buffer,
  originalName: string,
  contentType: string
): Promise<{
  success: boolean;
  id?: number;
  url?: string;
  path?: string;
  filename?: string;
  error?: string;
  status?: number;
  details?: string;
  debugSnippet?: string;
}> {
  // File size validation (default 5MB)
  if (!buffer || buffer.length === 0) {
    return {
      success: false,
      error: "Upload buffer is empty",
      status: 400,
    };
  }

  if (buffer.length > CONFIG.UPLOAD_MAX_SIZE) {
    const sizeMb = (buffer.length / (1024 * 1024)).toFixed(2);
    const maxMb = (CONFIG.UPLOAD_MAX_SIZE / (1024 * 1024)).toFixed(1);
    return {
      success: false,
      error: `File payload (${sizeMb}MB) exceeds maximum allowed size of ${maxMb}MB`,
      status: 413,
    };
  }

  const safeFileName = sanitizeFileName(originalName);
  const wpBase = CONFIG.WP_BASE_URL;
  const endpoint = `${wpBase}/wp-json/wp/v2/media`;
  const startTime = Date.now();

  logger.info(
    { safeFileName, contentType, sizeBytes: buffer.length, endpoint },
    "Initiating WordPress media upload"
  );

  const wpRes = await fetchWpSafe(
    endpoint,
    {
      method: "POST",
      headers: getWpHeaders({
        "Content-Disposition": `attachment; filename="${safeFileName}"`,
        "Content-Type": contentType,
        "Accept": "application/json",
      }),
      body: buffer,
    },
    MEDIA_UPLOAD_TIMEOUT_MS
  );

  const durationMs = Date.now() - startTime;
  const isCloudflare = isCloudflareChallenge(wpRes.text);
  const bodySnippet = (wpRes.text || "").slice(0, 2048);

  if (wpRes.ok && (wpRes.status === 200 || wpRes.status === 201) && wpRes.data) {
    const wpJson = wpRes.data;
    const rawSourceUrl = wpJson.source_url || wpJson.guid?.rendered || "";
    const sourceUrl = normalizeImageUrl(rawSourceUrl);
    if (sourceUrl) {
      logger.info(
        { id: wpJson.id, sourceUrl, durationMs, status: wpRes.status },
        "Successfully uploaded image to WordPress Media Library"
      );

      // Asynchronously pre-generate and cache 3 thumbnail variants (small, medium, large)
      try {
        const variants = await generateThumbnails(buffer, safeFileName);
        const lastMod = new Date().toUTCString();
        for (const [sizeKey, variant] of Object.entries(variants)) {
          const etag = computeEtag(variant.buffer, sizeKey);
          setCachedThumbnail(sourceUrl, sizeKey as "small" | "medium" | "large", {
            buffer: variant.buffer,
            contentType: variant.contentType,
            etag,
            lastModified: lastMod,
            width: variant.width,
            height: variant.height,
            sizeBytes: variant.sizeBytes,
          });
        }
      } catch (err: any) {
        logger.warn({ err: err.message, sourceUrl }, "Failed to pre-generate upload thumbnails");
      }

      return {
        success: true,
        id: wpJson.id,
        url: sourceUrl,
        path: sourceUrl,
        filename: wpJson.slug || safeFileName,
      };
    }
  }

  const wpStatus = wpRes.status || 500;
  const cleanError = extractCleanError(wpStatus, wpRes.text || wpRes.error || "");
  const isDebug = process.env.TRITON_DEBUG_UPLOADS === "true" && process.env.NODE_ENV !== "production";

  if (isCloudflare) {
    logger.warn({ endpoint, status: wpStatus }, "Cloudflare security challenge detected during WordPress upload");
  }

  logger.error(
    {
      status: wpStatus,
      endpoint,
      cleanError,
      durationMs,
      isCloudflare,
      bodySnippet: isDebug && bodySnippet ? bodySnippet : undefined,
    },
    "WordPress media upload failed"
  );

  return {
    success: false,
    error: isCloudflare ? "Cloudflare challenge blocked WordPress upload" : "WordPress media upload failed",
    status: wpStatus,
    details: isDebug && bodySnippet ? `${cleanError} (Response Snippet: ${bodySnippet})` : cleanError,
    ...(isDebug && bodySnippet ? { debugSnippet: bodySnippet } : {}),
  };
}

/**
 * Lists images from WordPress Media Library
 */
export async function listWpImages(perPage = 100): Promise<Array<{
  id: number;
  filename: string;
  url: string;
  source_url?: string;
  relativePath: string;
  size: number;
  date?: string;
}>> {
  const wpBase = CONFIG.WP_BASE_URL;
  const endpoint = `${wpBase}/wp-json/wp/v2/media?per_page=${perPage}`;
  const startTime = Date.now();

  logger.info({ endpoint, perPage }, "Fetching WordPress media list");

  const wpRes = await fetchWpSafe(
    endpoint,
    {
      headers: getWpHeaders(),
    },
    15000
  );

  const durationMs = Date.now() - startTime;
  const isCloudflare = isCloudflareChallenge(wpRes.text);

  if (!wpRes.ok || !Array.isArray(wpRes.data)) {
    const bodySnippet = (wpRes.text || "").slice(0, 2048);
    logger.warn(
      {
        status: wpRes.status,
        endpoint,
        durationMs,
        isCloudflare,
        bodySnippet: bodySnippet || undefined,
      },
      "Unable to retrieve WordPress media list; returning empty array"
    );
    return [];
  }

  logger.info({ count: wpRes.data.length, durationMs }, "Successfully retrieved WordPress media list");

  return wpRes.data.map((it: WpMediaItem) => {
    const rawSourceUrl = it.source_url || it.guid?.rendered || "";
    const canonicalUrl = normalizeImageUrl(rawSourceUrl);
    return {
      id: it.id,
      filename: it.title?.rendered || it.slug || "image",
      url: canonicalUrl,
      source_url: rawSourceUrl,
      relativePath: canonicalUrl,
      size: it.media_details?.filesize || 0,
      date: it.date,
    };
  });
}


/**
 * Deletes an image from WordPress Media Library by ID or URL
 */
export async function deleteWpImage(id?: number, url?: string): Promise<{ success: boolean; error?: string }> {
  const wpBase = (process.env.WP_BASE_URL || WP_BASE_URL).replace(/\/+$/, "");

  if (id) {
    const delEndpoint = `${wpBase}/wp-json/wp/v2/media/${id}?force=true`;
    const delRes = await fetchWpSafe(delEndpoint, {
      method: "DELETE",
      headers: getWpHeaders(),
    });
    if (!delRes.ok && delRes.status > 0) {
      return { success: false, error: extractCleanError(delRes.status, delRes.text) };
    }
    return { success: true };
  }

  if (url) {
    const listEndpoint = `${wpBase}/wp-json/wp/v2/media?per_page=100`;
    const listRes = await fetchWpSafe(listEndpoint, { headers: getWpHeaders() });

    if (listRes.ok && Array.isArray(listRes.data)) {
      const items = listRes.data as WpMediaItem[];
      const matched = items.find(
        (it) =>
          it.source_url === url ||
          it.guid?.rendered === url ||
          (it.source_url && path.basename(it.source_url) === path.basename(url))
      );
      if (matched && matched.id) {
        const delEndpoint = `${wpBase}/wp-json/wp/v2/media/${matched.id}?force=true`;
        await fetchWpSafe(delEndpoint, { method: "DELETE", headers: getWpHeaders() });
      }
    }
  }

  return { success: true };
}
