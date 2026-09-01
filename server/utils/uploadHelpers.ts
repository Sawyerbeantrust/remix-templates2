import path from "path";
import sharp from "sharp";
import { detectContentType } from "./http.js";
import { CONFIG } from "../config.js";

export const DEFAULT_MAX_UPLOAD_BYTES = CONFIG.UPLOAD_MAX_SIZE; // 5MB

export interface UploadValidationSuccess {
  valid: true;
  buffer: Buffer;
  contentType: string;
  filename: string;
  byteLength: number;
  width?: number;
  height?: number;
  format?: string;
  error?: never;
  status?: never;
}

export interface UploadValidationFailure {
  valid: false;
  status: 400 | 413 | 415 | 422;
  error: string;
  buffer?: never;
  contentType?: never;
  filename?: never;
  byteLength?: never;
  width?: never;
  height?: never;
  format?: never;
}

export type UploadValidationResult = UploadValidationSuccess | UploadValidationFailure;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/avif",
]);

/**
 * Checks file header magic bytes to verify genuine image content
 */
export function validateImageMagicBytes(buffer: Buffer): string | null {
  if (!buffer || buffer.length < 4) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  // GIF: 47 49 46 38 (GIF87a / GIF89a)
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38
  ) {
    return "image/gif";
  }

  // WebP: RIFF ... WEBP
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }

  // SVG: starts with <svg or <?xml or contains <svg
  const snippet = buffer.subarray(0, Math.min(buffer.length, 512)).toString("utf8").trim().toLowerCase();
  if (snippet.startsWith("<?xml") || snippet.startsWith("<svg") || snippet.includes("<svg")) {
    return "image/svg+xml";
  }

  // AVIF: ....ftypavif or ftypavis
  if (buffer.length >= 12 && buffer.toString("ascii", 4, 12).includes("ftypav")) {
    return "image/avif";
  }

  return null;
}

/**
 * Validates image dimensions and structure using sharp
 */
export async function validateImageDimensions(
  buffer: Buffer,
  declaredContentType: string
): Promise<{ valid: boolean; error?: string; width?: number; height?: number; format?: string }> {
  // SVG vector format bypasses strict pixel dimension bounding
  if (declaredContentType === "image/svg+xml") {
    return { valid: true, format: "svg" };
  }

  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();


    if (!metadata || !metadata.width || !metadata.height) {
      return { valid: false, error: "Unable to parse image dimensions. Corrupt image file." };
    }

    const { minWidth, minHeight, maxWidth, maxHeight } = CONFIG.IMAGE_DIMENSION_LIMITS;

    if (metadata.width < minWidth || metadata.height < minHeight) {
      return {
        valid: false,
        error: `Image dimensions (${metadata.width}x${metadata.height}px) are too small. Minimum required is ${minWidth}x${minHeight}px.`,
      };
    }

    if (metadata.width > maxWidth || metadata.height > maxHeight) {
      return {
        valid: false,
        error: `Image dimensions (${metadata.width}x${metadata.height}px) exceed maximum allowed size of ${maxWidth}x${maxHeight}px.`,
      };
    }

    return {
      valid: true,
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
    };
  } catch (err: any) {
    return {
      valid: false,
      error: `Invalid or corrupt image binary: ${err.message || "Failed to decode image"}`,
    };
  }
}

/**
 * Validates and decodes base64 image data.
 * - Enforces strict byte length ceiling (defaults to 5MB, returning 413 on breach).
 * - Detects and validates allowed MIME content-type.
 * - Sanitizes target filename.
 */
export function validateBase64Image(
  dataUriOrBase64: string | undefined | null,
  filename?: string,
  maxBytes: number = DEFAULT_MAX_UPLOAD_BYTES
): UploadValidationResult {
  if (!dataUriOrBase64 || typeof dataUriOrBase64 !== "string") {
    return {
      valid: false,
      status: 400,
      error: "Missing image payload in request body",
    };
  }

  const cleanFilename = (filename || `upload_${Date.now()}.jpg`)
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/^_+/, "");

  const contentType = detectContentType(dataUriOrBase64, cleanFilename);

  if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
    return {
      valid: false,
      status: 400,
      error: `Unsupported image format (${contentType}). Allowed formats: JPEG, PNG, WebP, GIF, SVG, AVIF`,
    };
  }

  const base64Data = dataUriOrBase64.replace(/^data:[^;]+;base64,/, "").trim();
  if (!base64Data) {
    return {
      valid: false,
      status: 400,
      error: "Empty base64 image data",
    };
  }

  const buffer = Buffer.from(base64Data, "base64");
  const byteLength = buffer.length;

  if (byteLength === 0) {
    return {
      valid: false,
      status: 400,
      error: "Decoded image buffer is empty",
    };
  }

  if (byteLength > maxBytes) {
    const sizeMb = (byteLength / (1024 * 1024)).toFixed(2);
    const maxMb = (maxBytes / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      status: 413,
      error: `Image payload (${sizeMb}MB) exceeds maximum limit of ${maxMb}MB`,
    };
  }

  return {
    valid: true,
    buffer,
    contentType,
    filename: cleanFilename,
    byteLength,
  };
}

/**
 * Full async upload validation pipeline: base64 decoding + magic bytes + sharp dimension limits
 */
export async function validateAndInspectUpload(
  dataUriOrBase64: string | undefined | null,
  filename?: string,
  maxBytes: number = DEFAULT_MAX_UPLOAD_BYTES
): Promise<UploadValidationResult> {
  const baseResult = validateBase64Image(dataUriOrBase64, filename, maxBytes);
  if (!baseResult.valid) {
    return baseResult;
  }

  // Magic bytes inspection
  const detectedMagicMime = validateImageMagicBytes(baseResult.buffer);
  if (detectedMagicMime && detectedMagicMime !== baseResult.contentType) {
    // If declared MIME was generic or mismatched, prefer genuine detected magic MIME
    baseResult.contentType = detectedMagicMime;
  }

  // Sharp dimension validation
  const dimResult = await validateImageDimensions(baseResult.buffer, baseResult.contentType);
  if (!dimResult.valid) {
    return {
      valid: false,
      status: 422,
      error: dimResult.error || "Image dimension validation failed",
    };
  }

  return {
    valid: true,
    buffer: baseResult.buffer,
    contentType: baseResult.contentType,
    filename: baseResult.filename,
    byteLength: baseResult.byteLength,
    width: dimResult.width,
    height: dimResult.height,
    format: dimResult.format,
  };
}

