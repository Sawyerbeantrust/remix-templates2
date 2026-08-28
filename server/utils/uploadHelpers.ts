import path from "path";
import { detectContentType } from "./http.js";

export const DEFAULT_MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB

export interface UploadValidationSuccess {
  valid: true;
  buffer: Buffer;
  contentType: string;
  filename: string;
  byteLength: number;
  error?: never;
  status?: never;
}

export interface UploadValidationFailure {
  valid: false;
  status: 400 | 413;
  error: string;
  buffer?: never;
  contentType?: never;
  filename?: never;
  byteLength?: never;
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
