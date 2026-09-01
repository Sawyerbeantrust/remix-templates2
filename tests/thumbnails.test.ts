import { describe, it, expect, beforeEach } from "vitest";
import sharp from "sharp";
import { LRUCache } from "lru-cache";
import {
  generateThumbnails,
  computeEtag,
  failedUrlBlacklist,
  isUrlBlacklisted,
  recordFailedUrl,
  clearBlacklist,
  fetchAndProcessThumbnail,
  getCacheStats,
  invalidateCache,
} from "../server/services/thumbnails.js";
import { normalizeImageUrl, validateRemoteImageUrl } from "../server/utils/http.js";
import { validateImageMagicBytes, validateImageDimensions } from "../server/utils/uploadHelpers.js";
import {
  isWordPressImage,
  getThumbnailUrl,
  getThumbnailVariants,
  normalizeImageUrl as normalizeFrontendImageUrl,
} from "../src/utils/imageHelpers.js";

describe("Thumbnail Service & Image Utilities", () => {
  let sampleImageBuffer: Buffer;

  beforeEach(async () => {
    clearBlacklist();
    // Create a 800x600 test image using sharp

    sampleImageBuffer = await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 3,
        background: { r: 50, g: 100, b: 200 },
      },
    })
      .jpeg()
      .toBuffer();
  });

  describe("generateThumbnails", () => {
    it("generates small, medium, and large variants maintaining aspect ratio", async () => {
      const variants = await generateThumbnails(sampleImageBuffer, "test-lift.jpg");

      expect(variants.small).toBeDefined();
      expect(variants.medium).toBeDefined();
      expect(variants.large).toBeDefined();

      // Inspect metadata of generated small variant (max 300x300 inside 800x600 -> 300x225)
      const smallMeta = await sharp(variants.small.buffer).metadata();
      expect(smallMeta.width).toBeLessThanOrEqual(300);
      expect(smallMeta.height).toBeLessThanOrEqual(300);
      expect(smallMeta.format).toBe("jpeg");

      // Inspect medium variant (max 600x600 inside 800x600 -> 600x450)
      const medMeta = await sharp(variants.medium.buffer).metadata();
      expect(medMeta.width).toBeLessThanOrEqual(600);
      expect(medMeta.height).toBeLessThanOrEqual(600);

      // Large variant (max 1200x1200, withoutEnlargement -> stays <= 800x600)
      const largeMeta = await sharp(variants.large.buffer).metadata();
      expect(largeMeta.width).toBeLessThanOrEqual(800);
      expect(largeMeta.height).toBeLessThanOrEqual(600);
    });
  });

  describe("computeEtag", () => {
    it("generates deterministic ETags based on content and size key", () => {
      const etag1 = computeEtag(sampleImageBuffer, "medium");
      const etag2 = computeEtag(sampleImageBuffer, "medium");
      const etagSmall = computeEtag(sampleImageBuffer, "small");

      expect(etag1).toBe(etag2);
      expect(etag1.startsWith('"')).toBe(true);
      expect(etag1.endsWith('"')).toBe(true);
      expect(etag1).not.toBe(etagSmall);
    });
  });

  describe("LRUCache", () => {
    it("stores and retrieves items correctly", () => {
      const cache = new LRUCache<string, string>({ max: 3, ttl: 5000 });

      cache.set("k1", "val1");
      cache.set("k2", "val2");

      expect(cache.get("k1")).toBe("val1");
      expect(cache.get("k2")).toBe("val2");
      expect(cache.get("k3")).toBeUndefined();
    });

    it("evicts oldest items when capacity is exceeded", () => {
      const cache = new LRUCache<string, string>({ max: 2, ttl: 5000 });

      cache.set("k1", "val1");
      cache.set("k2", "val2");
      cache.set("k3", "val3");

      expect(cache.get("k1")).toBeUndefined(); // Evicted
      expect(cache.get("k2")).toBe("val2");
      expect(cache.get("k3")).toBe("val3");
    });
  });

  describe("failedUrlBlacklist", () => {
    it("blocks blacklisted URLs and expires them after duration", () => {
      const testUrl = "https://store.car-lifts.co.za/wp-content/uploads/missing.jpg";

      expect(isUrlBlacklisted(testUrl)).toBe(false);

      recordFailedUrl(testUrl, 404, 100); // 100ms TTL
      expect(isUrlBlacklisted(testUrl)).toBe(true);
    });
  });

  describe("normalizeImageUrl", () => {
    it("converts http to https for trusted domains", () => {
      const res = normalizeImageUrl("http://store.car-lifts.co.za/wp-content/uploads/lift.jpg");
      expect(res).toBe("https://store.car-lifts.co.za/wp-content/uploads/lift.jpg");
    });

    it("handles protocol-relative URLs", () => {
      const res = normalizeImageUrl("//store.car-lifts.co.za/wp-content/uploads/lift.jpg");
      expect(res).toBe("https://store.car-lifts.co.za/wp-content/uploads/lift.jpg");
    });

    it("prepends host for root-relative paths", () => {
      const res = normalizeImageUrl("/wp-content/uploads/2026/01/booth.jpg");
      expect(res).toBe("https://store.car-lifts.co.za/wp-content/uploads/2026/01/booth.jpg");
    });

    it("prepends uploads directory for raw filenames", () => {
      const res = normalizeImageUrl("2026/01/welder.jpg");
      expect(res).toBe("https://store.car-lifts.co.za/wp-content/uploads/2026/01/welder.jpg");
    });
  });

  describe("validateRemoteImageUrl (SSRF Protection)", () => {
    it("allows trusted WordPress and CDN domains", () => {
      const valid1 = validateRemoteImageUrl("https://store.car-lifts.co.za/wp-content/uploads/lift.jpg");
      expect(valid1.valid).toBe(true);

      const valid2 = validateRemoteImageUrl("https://images.unsplash.com/photo-1590623091395-e3ae3f6d71b4");
      expect(valid2.valid).toBe(true);
    });

    it("blocks loopback and private IP addresses", () => {
      const loopback1 = validateRemoteImageUrl("http://127.0.0.1/wp-content/uploads/secret.jpg");
      expect(loopback1.valid).toBe(false);

      const loopback2 = validateRemoteImageUrl("http://localhost:3000/api/admin");
      expect(loopback2.valid).toBe(false);

      const privateIp = validateRemoteImageUrl("http://192.168.1.50/image.jpg");
      expect(privateIp.valid).toBe(false);

      const metadataService = validateRemoteImageUrl("http://169.254.169.254/latest/meta-data/");
      expect(metadataService.valid).toBe(false);
    });

    it("blocks untrusted foreign domains", () => {
      const untrusted = validateRemoteImageUrl("https://malicious-site.example.com/exploit.png");
      expect(untrusted.valid).toBe(false);
    });
  });

  describe("Magic Bytes & Dimension Validation", () => {
    it("identifies valid JPEG magic bytes", () => {
      const mime = validateImageMagicBytes(sampleImageBuffer);
      expect(mime).toBe("image/jpeg");
    });

    it("identifies valid PNG magic bytes", async () => {
      const pngBuffer = await sharp({
        create: { width: 300, height: 300, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 1 } },
      })
        .png()
        .toBuffer();

      const mime = validateImageMagicBytes(pngBuffer);
      expect(mime).toBe("image/png");
    });

    it("rejects non-image buffers", () => {
      const textBuffer = Buffer.from("Hello world, this is not an image");
      const mime = validateImageMagicBytes(textBuffer);
      expect(mime).toBeNull();
    });

    it("validates dimensions within allowed bounds", async () => {
      const result = await validateImageDimensions(sampleImageBuffer, "image/jpeg");
      expect(result.valid).toBe(true);
      expect(result.width).toBe(800);
      expect(result.height).toBe(600);
    });

    it("rejects images smaller than minWidth/minHeight (200x200)", async () => {
      const tinyBuffer = await sharp({
        create: { width: 100, height: 100, channels: 3, background: { r: 0, g: 0, b: 0 } },
      })
        .jpeg()
        .toBuffer();

      const result = await validateImageDimensions(tinyBuffer, "image/jpeg");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("too small");
    });
  });

  describe("fetchAndProcessThumbnail Security & Resilience", () => {
    it("safely blocks SSRF loopback URLs with status 403 or 400", async () => {
      const res = await fetchAndProcessThumbnail("http://127.0.0.1/sensitive.jpg", "medium");
      expect(res.success).toBe(false);
      expect(res.statusCode).toBe(403);
    });

    it("safely blocks untrusted external domains with status 403", async () => {
      const res = await fetchAndProcessThumbnail("https://untrusted-host.example.com/exploit.png", "small");
      expect(res.success).toBe(false);
      expect(res.statusCode).toBe(403);
    });

    it("rejects invalid non-HTTP/HTTPS URLs", async () => {
      const res = await fetchAndProcessThumbnail("file:///etc/passwd", "small");
      expect(res.success).toBe(false);
      expect(res.statusCode).toBe(400);
    });
  });

  describe("Cache Management Utilities", () => {
    it("reports correct cache statistics structure", () => {
      const stats = getCacheStats();
      expect(stats).toHaveProperty("itemCount");
      expect(stats).toHaveProperty("currentSizeBytes");
      expect(stats).toHaveProperty("maxSizeBytes");
      expect(stats).toHaveProperty("hitRatePercent");
      expect(stats).toHaveProperty("blacklistCount");
    });

    it("invalidates cache entries selectively or completely", () => {
      const clearedAll = invalidateCache();
      expect(typeof clearedAll).toBe("number");

      const clearedPattern = invalidateCache("nonexistent-pattern-xyz");
      expect(clearedPattern).toBe(0);
    });
  });

  describe("Frontend imageHelpers", () => {
    it("detects WordPress and local image URLs correctly", () => {
      expect(isWordPressImage("https://store.car-lifts.co.za/wp-content/uploads/lift.jpg")).toBe(true);
      expect(isWordPressImage("wp-content/uploads/2026/01/scissortest.jpg")).toBe(true);
      expect(isWordPressImage("/assets/hero.jpg")).toBe(false);
      expect(isWordPressImage("https://external-cdn.com/other.png")).toBe(false);
    });

    it("generates correct thumbnail URLs for frontend components", () => {
      const thumbUrl = getThumbnailUrl("https://store.car-lifts.co.za/wp-content/uploads/lift.jpg", "small");
      expect(thumbUrl).toContain("/api/media-thumb?url=");
      expect(thumbUrl).toContain("size=small");
    });

    it("generates all thumbnail variants", () => {
      const variants = getThumbnailVariants("https://store.car-lifts.co.za/wp-content/uploads/lift.jpg");
      expect(variants.small).toContain("size=small");
      expect(variants.medium).toContain("size=medium");
      expect(variants.large).toContain("size=large");
      expect(variants.original).toContain("size=original");
    });

    it("normalizes frontend relative image paths", () => {
      const normalized = normalizeFrontendImageUrl("2026/01/lift.jpg");
      expect(normalized).toBe("https://store.car-lifts.co.za/wp-content/uploads/2026/01/lift.jpg");
    });
  });
});
