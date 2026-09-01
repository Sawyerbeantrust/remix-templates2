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

