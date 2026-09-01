/**
 * Centralized server configuration constants with environment overrides
 */
export const CONFIG = {
  WP_BASE_URL: (process.env.WP_BASE_URL || "https://store.car-lifts.co.za").replace(/\/+$/, ""),
  BASE_URL: (process.env.BASE_URL || "https://car-lifts.co.za").replace(/\/+$/, ""),
  SMTP_USER: (process.env.SMTP_USER || "info@car-lifts.co.za").trim(),
  SMTP_PORT: Number(process.env.SMTP_PORT || 465),
  GEMINI_MODELS: {
    primary: "gemini-2.5-flash",
    fallbacks: ["gemini-1.5-flash", "gemini-1.5-pro"],
  },
  UPLOAD_MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_EXTENSIONS: ["jpg", "jpeg", "png", "webp", "gif", "svg", "avif"] as const,
  TRUSTED_IMAGE_DOMAINS: [
    "store.car-lifts.co.za",
    "car-lifts.co.za",
    "images.unsplash.com",
    "unsplash.com",
  ] as const,
  IMAGE_DIMENSION_LIMITS: {
    minWidth: 200,
    minHeight: 200,
    maxWidth: 8000,
    maxHeight: 8000,
  } as const,
} as const;

export const THUMBNAIL_SIZES = {
  small: { width: 300, height: 300 },
  medium: { width: 600, height: 600 },
  large: { width: 1200, height: 1200 },
  original: null,
} as const;

export type ThumbnailSizeKey = keyof typeof THUMBNAIL_SIZES;

export const THUMBNAIL_CONFIG = {
  // Cache settings
  CACHE_MAX_ITEMS: 500,
  CACHE_MAX_BYTES: 500 * 1024 * 1024, // 500MB
  CACHE_TTL_MS: 1000 * 60 * 60 * 24, // 24 hours

  // Blacklist settings (prevent hammering failed URLs)
  BLACKLIST_TTL_MS: 1000 * 60 * 5, // 5 minutes
  BLACKLIST_MAX_ATTEMPTS: 3, // Block URL after 3 consecutive failures

  // Fetch settings
  FETCH_TIMEOUT_MS: 10000,
  FETCH_MAX_RETRIES: 1,

  // Sharp image processing
  JPEG_QUALITY: 85,
  PNG_COMPRESSION_LEVEL: 8,
  WEBP_QUALITY: 85,
  ENABLE_MOZJPEG: true,
} as const;

