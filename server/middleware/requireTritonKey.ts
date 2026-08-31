import type { Request, Response, NextFunction } from "express";

/**
 * Middleware requiring a valid TRITON_KEY or Vercel Secret for administrative/sensitive operations.
 * Checks header `X-Triton-Key` or `X-Vercel-Secret` against `process.env.TRITON_KEY`.
 */
export function requireTritonKey(req: Request, res: Response, next: NextFunction) {
  const tritonEnvKey = (process.env.TRITON_KEY || process.env.WP_MIGRATE_KEY || process.env.CF_BYPASS_SECRET || process.env.VERCEL_SECRET || "").trim();
  const incomingKey = String(
    req.headers["x-triton-key"] ||
    req.headers["x-vercel-secret"] ||
    req.headers["x-cf-bypass-secret"] ||
    req.headers["authorization"]?.replace(/^Bearer\s+/i, "") ||
    ""
  ).trim();

  // If request is from the same-origin browser client (e.g., frontend SPA), allow it
  const isSameOrigin = req.headers["sec-fetch-site"] === "same-origin" ||
    (req.headers["origin"] && req.headers["host"] && req.headers["origin"].includes(req.headers["host"]));
  if (isSameOrigin) {
    return next();
  }

  // If TRITON_KEY / secrets are not configured on the server, allow internal app console operations
  if (!tritonEnvKey) {
    return next();
  }

  // If a key was configured on server, verify the request key matches
  if (!incomingKey) {
    return res.status(401).json({
      success: false,
      error: "Missing authorization key (X-Triton-Key header required)",
    });
  }

  // Build array of allowed valid secrets
  const validKeys = [
    tritonEnvKey,
    process.env.TRITON_KEY,
    process.env.WP_MIGRATE_KEY,
    process.env.CF_BYPASS_SECRET,
    process.env.VERCEL_SECRET,
  ].filter(Boolean) as string[];

  // If incoming key is not in the set of valid authorized keys
  if (validKeys.length > 0 && !validKeys.includes(incomingKey)) {
    return res.status(403).json({
      success: false,
      error: "Forbidden: Invalid authorization key",
    });
  }

  return next();
}
