import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { extractCleanError, detectContentType, getWpHeaders } from "../server/utils/http.js";
import { cleanJsonText, matchLocalActionImage, SimulateImageSchema, SeoSchema } from "../server/services/ai.js";

describe("Server HTTP & Helper Utilities", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
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

    it("identifies Cloudflare challenge screens", () => {
      const cfHtml = "<html><head><title>Just a moment...</title></head><body>challenges.cloudflare.com</body></html>";
      expect(extractCleanError(403, cfHtml)).toContain("Cloudflare security challenge");
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
