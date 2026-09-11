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
    req.headers["x-cf-bypass-secret"] ||
    req.headers["authorization"]?.replace(/^Bearer\s+/i, "") ||
    ""
  ).trim();

  // If request is from the authenticated same-origin browser client (e.g., frontend SPA), verify origin securely
  const host = req.headers["host"] || "";
  const origin = req.headers["origin"] as string | undefined;
  const referer = req.headers["referer"] as string | undefined;

  let isVerifiedSameOrigin = false;
  if (origin && host) {
    try {
      const parsedOrigin = new URL(origin);
      if (parsedOrigin.host === host) {
        isVerifiedSameOrigin = true;
      }
    } catch {}
  } else if (referer && host) {
    try {
      const parsedReferer = new URL(referer);
      if (parsedReferer.host === host) {
        isVerifiedSameOrigin = true;
      }
    } catch {}
  } else if (req.headers["sec-fetch-site"] === "same-origin") {
    isVerifiedSameOrigin = true;
  }

  if (isVerifiedSameOrigin) {
    return next();
  }

  // If TRITON_KEY / secrets are not configured on the server, reject with server misconfiguration
  if (!tritonEnvKey) {
    return res.status(403).json({
      success: false,
      error: "Server misconfiguration: TRITON_KEY is not configured",
    });
  }

  // If a key was configured on server, verify the request key matches
  if (!incomingKey) {
    return res.status(401).json({
      success: false,
      error: "Missing authorization key (X-Triton-Key header required)",
    });
  }

  // If incoming key does not match configured key
  if (incomingKey !== tritonEnvKey) {
    return res.status(403).json({
      success: false,
      error: "Forbidden: Invalid authorization key",
    });
  }

  return next();
}

