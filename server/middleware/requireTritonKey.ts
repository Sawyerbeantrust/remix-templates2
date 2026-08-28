import type { Request, Response, NextFunction } from "express";

/**
 * Middleware requiring a valid TRITON_KEY or Vercel Secret for administrative/sensitive operations.
 * Checks header `X-Triton-Key` or `X-Vercel-Secret` against `process.env.TRITON_KEY`.
 */
export function requireTritonKey(req: Request, res: Response, next: NextFunction) {
  const tritonEnvKey = (process.env.TRITON_KEY || "").trim();
  const incomingKey = String(
    req.headers["x-triton-key"] ||
    req.headers["x-vercel-secret"] ||
    req.headers["authorization"]?.replace(/^Bearer\s+/i, "") ||
    ""
  ).trim();

  // If TRITON_KEY is not configured on the server, deny access
  if (!tritonEnvKey) {
    return res.status(403).json({
      success: false,
      error: "Server misconfiguration: TRITON_KEY is not set in environment",
    });
  }

  // If no key was supplied in request headers
  if (!incomingKey) {
    return res.status(401).json({
      success: false,
      error: "Missing authorization key (X-Triton-Key header required)",
    });
  }

  // If supplied key does not match
  if (incomingKey !== tritonEnvKey) {
    return res.status(403).json({
      success: false,
      error: "Forbidden: Invalid authorization key",
    });
  }

  return next();
}
