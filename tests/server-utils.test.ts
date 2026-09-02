import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { extractCleanError, detectContentType, getWpHeaders, DEFAULT_TIMEOUT_MS, MEDIA_UPLOAD_TIMEOUT_MS } from "../server/utils/http.js";
import { cleanJsonText, matchLocalActionImage, SimulateImageSchema, SeoSchema } from "../server/services/ai.js";
import { uploadBufferToWordPress } from "../server/services/wp.js";
import * as httpUtils from "../server/utils/http.js";

describe("Server HTTP & Helper Utilities", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe("Timeouts", () => {
    it("exports configurable default timeouts with correct default values", () => {
      expect(DEFAULT_TIMEOUT_MS).toBeGreaterThanOrEqual(5000);
      expect(MEDIA_UPLOAD_TIMEOUT_MS).toBe(30000);
    });
  });

  describe("detectContentType", () => {
    it("detects image MIME type from data URIs", () => {
      expect(detectContentType("data:image/png;base64,iVBORw0KGgo...", "photo.jpg")).toBe("image/png");
      expect(detectContentType("data:image/webp;base64,UklGR...", "test.bin")).toBe("image/webp");
      expect(detectContentType("data:image/svg+xml;base64,PHN2Zy...", "test.bin")).toBe("image/svg+xml");
    });

    it("detects image MIME type from filenames", () => {
      expect(detectContentType("", "lift.png")).toBe("image/png");
      expect(detectContentType("", "booth.webp")).toBe("image/webp");
      expect(detectContentType("", "welder.jpg")).toBe("image/jpeg");
      expect(detectContentType("", "welder.jpeg")).toBe("image/jpeg");
      expect(detectContentType("", "tool.gif")).toBe("image/gif");
      expect(detectContentType("", "logo.svg")).toBe("image/svg+xml");
      expect(detectContentType("", "unknown.xyz")).toBe("image/jpeg");
    });
  });

  describe("extractCleanError", () => {
    it("parses JSON error responses from WordPress", () => {
      const jsonErr = JSON.stringify({ message: "Sorry, you are not allowed to create posts as this user." });
      expect(extractCleanError(401, jsonErr)).toBe("WordPress (401): Sorry, you are not allowed to create posts as this user.");
    });

    it("identifies Cloudflare challenge screens across multiple signatures", () => {
      const cfHtml1 = "<html><head><title>Just a moment...</title></head><body>challenges.cloudflare.com</body></html>";
      expect(extractCleanError(403, cfHtml1)).toContain("Cloudflare security challenge");

      const cfHtml2 = "<!DOCTYPE html><html><head><title>Attention Required! | Cloudflare</title></head><body>cf-browser-verification</body></html>";
      expect(extractCleanError(403, cfHtml2)).toContain("Cloudflare security challenge");

      const cfHtml3 = "<html><body>cf-chl cf-mitigated cloudflare ray id: 89324792384</body></html>";
      expect(extractCleanError(403, cfHtml3)).toContain("Cloudflare security challenge");
    });

    it("extracts clean title from generic HTML error pages", () => {
      const htmlErr = "<!DOCTYPE html><html><head><title>502 Bad Gateway</title></head></html>";
      expect(extractCleanError(502, htmlErr)).toBe("WordPress returned HTML error (HTTP 502): 502 Bad Gateway");
    });

    it("handles empty or plain text errors", () => {
      expect(extractCleanError(500, "")).toBe("HTTP 500");
      expect(extractCleanError(404, "Page not found")).toBe("Page not found");
    });
  });

  describe("getWpHeaders", () => {
    it("does NOT include Authorization header when credentials are not provided", () => {
      delete process.env.WP_APP_USER;
      delete process.env.WP_APP_PASSWORD;
      delete process.env.WP_AUTH_TOKEN;
      delete process.env.TRITON_KEY;
      delete process.env.WP_MIGRATE_KEY;

      const headers = getWpHeaders();
      expect(headers["Authorization"]).toBeUndefined();
      expect(headers["X-Triton-Key"]).toBeUndefined();
      expect(headers["User-Agent"]).toContain("TritonShowroomSync");
    });

    it("sets Basic authorization when user and password exist", () => {
      process.env.WP_APP_USER = "admin";
      process.env.WP_APP_PASSWORD = "app password 123";

      const headers = getWpHeaders();
      const expectedB64 = Buffer.from("admin:apppassword123").toString("base64");
      expect(headers["Authorization"]).toBe(`Basic ${expectedB64}`);
    });

    it("sets Bearer authorization when WP_AUTH_TOKEN is provided", () => {
      delete process.env.WP_APP_USER;
      delete process.env.WP_APP_PASSWORD;
      process.env.WP_AUTH_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";

      const headers = getWpHeaders();
      expect(headers["Authorization"]).toBe("Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9");
    });

    it("conditionally sets TRITON_KEY when provided in environment", () => {
      process.env.TRITON_KEY = "CustomSecretKey2026";
      const headers = getWpHeaders();
      expect(headers["X-Triton-Key"]).toBe("CustomSecretKey2026");
    });

    it("conditionally sets CF_BYPASS_SECRET when provided", () => {
      process.env.CF_BYPASS_SECRET = "TestCfSecret123";
      const headers = getWpHeaders();
      expect(headers["X-CF-Bypass-Secret"]).toBe("TestCfSecret123");
      expect(headers["X-Vercel-Secret"]).toBe("TestCfSecret123");
    });
  });

  describe("uploadBufferToWordPress Diagnostic Behavior", () => {
    it("includes truncated body snippet in details when TRITON_DEBUG_UPLOADS is enabled in non-production", async () => {
      process.env.NODE_ENV = "development";
      process.env.TRITON_DEBUG_UPLOADS = "true";

      const mockHtmlResponse = "<html><head><title>Cloudflare WAF Block</title></head><body>" + "x".repeat(3000) + "</body></html>";
      
      vi.spyOn(httpUtils, "fetchWpSafe").mockResolvedValue({
        ok: false,
        status: 403,
        data: null,
        text: mockHtmlResponse,
      });

      const tinyBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      const result = await uploadBufferToWordPress(tinyBuffer, "diagnostic-test.jpg", "image/jpeg");

      expect(result.success).toBe(false);
      expect(result.status).toBe(403);
      expect(result.debugSnippet).toBeDefined();
      expect(result.debugSnippet?.length).toBeLessThanOrEqual(2048);
      expect(result.details).toContain("Response Snippet");
    });

    it("does NOT include debugSnippet when TRITON_DEBUG_UPLOADS is not set", async () => {
      process.env.NODE_ENV = "development";
      delete process.env.TRITON_DEBUG_UPLOADS;

      vi.spyOn(httpUtils, "fetchWpSafe").mockResolvedValue({
        ok: false,
        status: 500,
        data: null,
        text: "<title>Error 500</title>",
      });

      const tinyBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      const result = await uploadBufferToWordPress(tinyBuffer, "diagnostic-test.jpg", "image/jpeg");

      expect(result.success).toBe(false);
      expect(result.debugSnippet).toBeUndefined();
    });
  });

  describe("cleanJsonText & AI Schemas", () => {
    it("removes markdown fences and parses valid JSON", () => {
      const raw = '```json\n{"actionDescription": "Test desc", "visualPrompt": "Test prompt", "matchedCategory": "car-lift"}\n```';
      const cleaned = cleanJsonText(raw);
      expect(cleaned).toBe('{"actionDescription": "Test desc", "visualPrompt": "Test prompt", "matchedCategory": "car-lift"}');
      const parsed = JSON.parse(cleaned);
      const res = SimulateImageSchema.safeParse(parsed);
      expect(res.success).toBe(true);
    });

    it("validates SeoSchema structure", () => {
      const validSeo = {
        metaTitle: "4-Ton Two Post Car Lift | Cape Town",
        metaDescription: "Heavy-duty 4-ton two post lift with dual hydraulic cylinders and 3-year warranty.",
        focusKeywords: ["2 post lift", "car lift south africa"],
      };
      const res = SeoSchema.safeParse(validSeo);
      expect(res.success).toBe(true);
    });

    it("rejects invalid SEO payload missing metaTitle", () => {
      const invalidSeo = {
        metaDescription: "Short",
      };
      const res = SeoSchema.safeParse(invalidSeo);
      expect(res.success).toBe(false);
    });
  });

  describe("matchLocalActionImage", () => {
    it("matches relevant spray booth image for booth keywords", () => {
      const match = matchLocalActionImage("Automotive Down-Draft Spray Booth 7m", "automotive-spray-booths", "paint cabin with heater");
      expect(match.url).toContain("photo-");
      expect(match.description.toLowerCase()).toContain("spray");
    });

    it("matches relevant car lift image for hoist keywords", () => {
      const match = matchLocalActionImage("4-Ton Clear Floor 2-Post Hoist", "car-lifts", "hydraulic vehicle lift");
      expect(match.url).toContain("photo-");
      expect(match.description.toLowerCase()).toContain("lift");
    });
  });
});
