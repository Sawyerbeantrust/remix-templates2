import type { Request, Response, NextFunction, RequestHandler } from "express";
import { logger } from "./logger.js";

export type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<any>;

/**
 * Wraps async Express route handlers to eliminate repetitive try/catch blocks
 * and pass uncaught exceptions cleanly to the centralized error middleware.
 */
export const asyncHandler = (fn: AsyncRequestHandler): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      const reqId = res.locals.requestId || req.headers["x-request-id"];
      logger.error({ requestId: reqId, error: err?.message || err, path: req.path }, "Unhandled error in async route");
      next(err);
    });
  };
};

/**
 * Standardized API response helpers
 */
export const sendSuccess = <T>(res: Response, data: T, status = 200) => {
  if (typeof data === "object" && data !== null && "success" in (data as any)) {
    return res.status(status).json(data);
  }
  return res.status(status).json({
    success: true,
    data,
    requestId: res.locals.requestId,
  });
};

export const sendError = (
  res: Response,
  error: string,
  status = 500,
  details?: any
) => {
  return res.status(status).json({
    success: false,
    error,
    ...(details !== undefined ? { details } : {}),
    requestId: res.locals.requestId,
  });
};
