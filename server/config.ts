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
} as const;
