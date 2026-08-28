import { describe, it, expect } from "vitest";
import { validateBase64Image, DEFAULT_MAX_UPLOAD_BYTES } from "../server/utils/uploadHelpers.js";

describe("uploadHelpers - validateBase64Image", () => {
  const smallPngBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

  it("successfully validates and decodes a valid small base64 image", () => {
    const result = validateBase64Image(smallPngBase64, "pixel.png");

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.contentType).toBe("image/png");
      expect(result.filename).toBe("pixel.png");
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.byteLength).toBeGreaterThan(0);
    }
  });

  it("rejects empty or non-string inputs with status 400", () => {
    const res1 = validateBase64Image("");
    expect(res1.valid).toBe(false);
    if (res1.valid === false) {
      expect(res1.status).toBe(400);
      expect(res1.error).toContain("Missing image payload");
    }

    const res2 = validateBase64Image(null as any);
    expect(res2.valid).toBe(false);
    if (res2.valid === false) {
      expect(res2.status).toBe(400);
    }
  });

  it("rejects unsupported MIME types with status 400", () => {
    const pdfDataUri = "data:application/pdf;base64,JVBERi0xLjUK...";
    const res = validateBase64Image(pdfDataUri, "document.pdf");

    expect(res.valid).toBe(false);
    if (res.valid === false) {
      expect(res.status).toBe(400);
      expect(res.error).toContain("Unsupported image format");
    }
  });

  it("rejects payloads that exceed max upload size limit with status 413", () => {
    // Generate a payload exceeding 1KB when tested with a tight limit of 500 bytes
    const largeDummyBuffer = Buffer.alloc(1024, "A");
    const largeBase64 = `data:image/jpeg;base64,${largeDummyBuffer.toString("base64")}`;

    const res = validateBase64Image(largeBase64, "large.jpg", 500);

    expect(res.valid).toBe(false);
    if (res.valid === false) {
      expect(res.status).toBe(413);
      expect(res.error).toContain("exceeds maximum limit");
    }
  });

  it("sanitizes filenames with unsafe characters", () => {
    const result = validateBase64Image(smallPngBase64, "../../../etc/passwd<>.png");

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.filename).not.toContain("../");
      expect(result.filename).not.toContain("<");
      expect(result.filename).not.toContain(">");
    }
  });
});
