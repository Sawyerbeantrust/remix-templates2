import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? "debug" : "info"),
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers['x-triton-key']",
      "req.headers['x-cf-bypass-secret']",
      "req.headers['x-vercel-secret']",
      "password",
      "token",
      "secret",
      "body.data", // Avoid dumping massive base64 in logs
      "body.image",
    ],
    censor: "[REDACTED]",
  },
  transport: isDev
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          ignore: "pid,hostname",
          translateTime: "SYS:standard",
        },
      }
    : undefined,
});
