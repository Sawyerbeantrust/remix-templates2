import path from "path";
import { getWpHeaders, fetchWpSafe, WP_BASE_URL, MEDIA_UPLOAD_TIMEOUT_MS, extractCleanError } from "../utils/http.js";
import { logger } from "../utils/logger.js";
import { CONFIG } from "../config.js";
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
 * Uploads an image buffer directly to the WordPress Media Library
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

  logger.info({ safeFileName, contentType, sizeBytes: buffer.length }, "Initiating WordPress media upload");

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

  if (wpRes.ok && (wpRes.status === 200 || wpRes.status === 201) && wpRes.data) {
    const wpJson = wpRes.data;
    const sourceUrl = wpJson.source_url || wpJson.guid?.rendered || "";
    if (sourceUrl) {
      logger.info({ id: wpJson.id, sourceUrl }, "Successfully uploaded image to WordPress Media Library");
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
  logger.error({ status: wpStatus, cleanError }, "WordPress media upload failed");

  return {
    success: false,
    error: "WordPress media upload failed",
    status: wpStatus,
    details: cleanError,
  };
}

/**
 * Lists images from WordPress Media Library
 */
export async function listWpImages(perPage = 100): Promise<Array<{
  id: number;
  filename: string;
  url: string;
  relativePath: string;
  size: number;
  date?: string;
}>> {
  const wpBase = (process.env.WP_BASE_URL || WP_BASE_URL).replace(/\/+$/, "");
  const endpoint = `${wpBase}/wp-json/wp/v2/media?per_page=${perPage}`;

  const wpRes = await fetchWpSafe(
    endpoint,
    {
      headers: getWpHeaders(),
    },
    8000
  );

  if (!wpRes.ok || !Array.isArray(wpRes.data)) {
    logger.warn({ status: wpRes.status }, "Unable to retrieve WordPress media list; returning empty array");
    return [];
  }

  return wpRes.data.map((it: WpMediaItem) => {
    const rawUrl = (it.source_url || "")
      .replace(/^http:\/\/store\.car-lifts\.co\.za/i, "https://store.car-lifts.co.za")
      .replace(/^http:\/\/car-lifts\.co\.za/i, "https://car-lifts.co.za");
    return {
      id: it.id,
      filename: it.title?.rendered || it.slug || "image",
      url: rawUrl,
      relativePath: rawUrl,
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
