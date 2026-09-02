import express from "express";
import path from "path";
import fs from "fs";
import http from "http";
import https from "https";
import crypto from "crypto";
import dotenv from "dotenv";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import morgan from "morgan";
import { apiRouter, apiRateLimiter, DEFAULT_FEATURED_CATEGORIES, DEFAULT_CATEGORIES_LIST } from "./server/routes/api.js";
import { requireTritonKey } from "./server/middleware/requireTritonKey.js";
import { logger } from "./server/utils/logger.js";
import { sendError } from "./server/utils/asyncHandler.js";
import { CONFIG } from "./server/config.js";
import { UpdateSeoFilesSchema } from "./server/types/validation.js";
import { PRODUCTS } from "./src/data/products.js";

dotenv.config();

const app = express();
const PORT = 3000;

// Trust proxy for reverse proxy environment (Cloud Run / Nginx / Vercel)
app.set("trust proxy", 1);

// Request ID tracking middleware for distributed correlation
app.use((req, res, next) => {
  const incomingId = req.headers["x-request-id"] as string | undefined;
  const requestId = incomingId && incomingId.trim() ? incomingId.trim() : crypto.randomUUID();
  (req as any).id = requestId;
  res.locals.requestId = requestId;
  res.setHeader("X-Request-ID", requestId);
  next();
});

// Security Headers with Helmet
app.use(
  helmet({
    contentSecurityPolicy: false, // SPA renders dynamic images from WordPress/Unsplash
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// Compression middleware
app.use(compression());

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean)
  : [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://car-lifts.co.za",
      "https://store.car-lifts.co.za",
      "https://remix-templates2.vercel.app",
    ];

const isProduction = process.env.NODE_ENV === "production";

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) {
        return callback(null, true);
      }

      // Check if origin is explicitly allowed
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // In development mode, automatically allow localhost and preview subdomains
      if (!isProduction) {
        if (
          origin.startsWith("http://localhost:") ||
          origin.startsWith("http://127.0.0.1:") ||
          origin.endsWith(".run.app") ||
          origin.endsWith(".vercel.app")
        ) {
          return callback(null, true);
        }
      }

      // In production, block origins not in ALLOWED_ORIGINS
      if (isProduction) {
        logger.warn({ origin, allowedOrigins }, "CORS blocked request from untrusted origin in production");
        return callback(null, false);
      }

      return callback(null, true);
    },
    credentials: true,
  })
);

// Request body size limits (hardened from 50mb to 10mb)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// HTTP Request logging with Morgan and Pino
const morganFormat = process.env.NODE_ENV === "production" ? "combined" : "dev";
app.use(
  morgan(morganFormat, {
    skip: (req) => req.url === "/health" || req.url === "/ready",
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  })
);

// Probes for Kubernetes / Cloud Run / container orchestration
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get("/ready", (req, res) => {
  res.status(200).json({
    status: "ready",
    timestamp: new Date().toISOString(),
  });
});

// Static route options
const staticOptions = {
  maxAge: process.env.NODE_ENV === "production" ? "7d" : "0",
  etag: true,
};

/**
 * Registers unified static asset handlers across public, src, and build outputs
 */
function setupStaticAssetRoutes(expressApp: express.Express) {
  const distPath = path.join(process.cwd(), "dist");
  expressApp.use("/images", express.static(path.join(process.cwd(), "public", "images"), staticOptions));
  expressApp.use("/images", express.static(path.join(process.cwd(), "src", "assets", "images"), staticOptions));
  expressApp.use("/images", express.static(path.join(distPath, "images"), staticOptions));

  expressApp.use("/assets/images", express.static(path.join(process.cwd(), "public", "assets", "images"), staticOptions));
  expressApp.use("/assets/images", express.static(path.join(process.cwd(), "src", "assets", "images"), staticOptions));
  expressApp.use("/assets/images", express.static(path.join(distPath, "assets", "images"), staticOptions));
}

import { fetchAndProcessThumbnail, getCacheStats, invalidateCache } from "./server/services/thumbnails.js";
import { THUMBNAIL_SIZES, type ThumbnailSizeKey } from "./server/config.js";

/**
 * Common handler for /api/media-thumb and /api/media-thumb-sized
 */
async function handleThumbnailRequest(req: express.Request, res: express.Response) {
  const startTime = Date.now();
  const rawUrl = req.query.url as string | undefined;
  const rawSize = (req.query.size as string | undefined) || "medium";
  const size: ThumbnailSizeKey = (rawSize in THUMBNAIL_SIZES ? rawSize : "medium") as ThumbnailSizeKey;

  if (!rawUrl || typeof rawUrl !== "string" || !rawUrl.trim()) {
    return res.status(400).json({
      success: false,
      error: "Missing required 'url' query parameter",
      statusCode: 400,
      timestamp: new Date().toISOString(),
      requestId: res.locals.requestId,
    });
  }

  const result = await fetchAndProcessThumbnail(rawUrl, size);

  const duration = Date.now() - startTime;

  if (!result.success || !result.buffer) {
    logger.warn(
      {
        endpoint: req.path,
        url: rawUrl,
        size,
        statusCode: result.statusCode || 404,
        duration,
        requestId: res.locals.requestId,
        error: result.error,
      },
      "Thumbnail proxy request failed"
    );

    return res.status(result.statusCode || 404).json({
      success: false,
      error: result.error || "Thumbnail not found or unavailable",
      statusCode: result.statusCode || 404,
      timestamp: new Date().toISOString(),
      requestId: res.locals.requestId,
    });
  }

  // 1. ETag conditional checking
  const clientEtag = req.headers["if-none-match"];
  if (clientEtag && result.etag && clientEtag === result.etag) {
    res.setHeader("ETag", result.etag);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    return res.status(304).end();
  }

  // 2. If-Modified-Since conditional checking
  const clientModifiedSince = req.headers["if-modified-since"];
  if (clientModifiedSince && result.lastModified && clientModifiedSince === result.lastModified) {
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    return res.status(304).end();
  }

  // 3. Set standard caching and content headers
  res.setHeader("Content-Type", result.contentType || "image/jpeg");
  res.setHeader("Content-Length", result.sizeBytes || result.buffer.length);
  if (result.etag) {
    res.setHeader("ETag", result.etag);
  }
  if (result.lastModified) {
    res.setHeader("Last-Modified", result.lastModified);
  }
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.setHeader("X-Cache-Hit", result.fromCache ? "true" : "false");
  if (result.width !== undefined) {
    res.setHeader("X-Image-Width", String(result.width));
  }
  if (result.height !== undefined) {
    res.setHeader("X-Image-Height", String(result.height));
  }

  logger.info(
    {
      endpoint: req.path,
      url: rawUrl,
      size,
      statusCode: 200,
      duration,
      fromCache: result.fromCache ?? false,
      bytes: result.buffer.length,
      requestId: res.locals.requestId,
    },
    "Thumbnail served successfully"
  );

  return res.status(200).send(result.buffer);
}

// GET /api/media-thumb & GET /api/media-thumb-sized - Resilient thumbnail proxy
app.get("/api/media-thumb", handleThumbnailRequest);
app.get("/api/media-thumb-sized", handleThumbnailRequest);

// Cache statistics and management
app.get("/api/media-thumb-cache-stats", (req, res) => {
  res.status(200).json({
    success: true,
    ...getCacheStats(),
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/images/cache-stats", (req, res) => {
  res.status(200).json({
    success: true,
    ...getCacheStats(),
    timestamp: new Date().toISOString(),
  });
});

app.post("/api/images/cache-clear", requireTritonKey, (req, res) => {
  const urlPattern = req.query.url as string | undefined;
  const clearedCount = invalidateCache(urlPattern);
  res.status(200).json({
    success: true,
    clearedCount,
    message: urlPattern ? `Cleared cache matching '${urlPattern}'` : "Cleared entire thumbnail cache",
    timestamp: new Date().toISOString(),
  });
});


// Register static assets
setupStaticAssetRoutes(app);

// Mount rate-limited API routes
app.use("/api", apiRateLimiter, apiRouter);

// Dynamic XML Sitemap & Robots.txt
let customSitemapXmlOverride: string | null = null;
let customRobotsTxtOverride: string | null = null;

app.post("/api/seo/update-files", requireTritonKey, (req, res) => {
  try {
    const parseResult = UpdateSeoFilesSchema.safeParse(req.body);
    if (!parseResult.success) {
      return sendError(res, parseResult.error.issues[0]?.message || "Invalid SEO files update payload", 400);
    }
    const { sitemapXml, robotsTxt } = parseResult.data;
    if (typeof sitemapXml === "string" && sitemapXml.trim()) {
      customSitemapXmlOverride = sitemapXml;
    }
    if (typeof robotsTxt === "string" && robotsTxt.trim()) {
      customRobotsTxtOverride = robotsTxt;
    }
    return res.status(200).json({
      success: true,
      message: "Server sitemap.xml and robots.txt updated live!",
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

app.get("/sitemap.xml", (req, res) => {
  res.header("Content-Type", "application/xml");
  if (customSitemapXmlOverride) {
    return res.send(customSitemapXmlOverride);
  }

  const baseUrl = CONFIG.BASE_URL;
  const currentDate = new Date().toISOString().split("T")[0];

  const staticRoutes = [
    { path: "", priority: "1.0", changefreq: "daily" },
    { path: "?view=about", priority: "0.8", changefreq: "weekly" },
    { path: "?view=contact", priority: "0.8", changefreq: "weekly" },
    { path: "?view=faq", priority: "0.7", changefreq: "weekly" },
  ];

  const xmlUrls = staticRoutes.map(
    (route) => `  <url>
    <loc>${baseUrl}${route.path ? "/" + route.path : ""}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`
  );

  PRODUCTS.forEach((product) => {
    const loc = `${baseUrl}?product=${product.id}`;
    xmlUrls.push(`  <url>
    <loc>${loc}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`);
  });

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${xmlUrls.join("\n")}
</urlset>`;

  res.send(sitemapXml);
});

app.get("/robots.txt", (req, res) => {
  res.header("Content-Type", "text/plain");
  if (customRobotsTxtOverride) {
    return res.send(customRobotsTxtOverride);
  }
  const host = req.get("host") || "car-lifts.co.za";
  const protocol = req.secure ? "https" : "http";
  const domain = `${protocol}://${host}`;
  res.send(`User-agent: *
Allow: /
Sitemap: ${domain}/sitemap.xml
`);
});

// Centralized error-handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const status = err.status && err.status >= 400 && err.status <= 599 ? err.status : 500;
  logger.error({ err: err?.message || err, status, url: req.url }, "Unhandled server error caught");

  if (!res.headersSent) {
    const isProduction = process.env.NODE_ENV === "production";
    sendError(
      res,
      err.message || "Internal server error",
      status,
      isProduction ? undefined : err.stack
    );
  }
});

let serverInstance: any = null;

function serveProductionSpa(expressApp: express.Express) {
  const distPath = path.join(process.cwd(), "dist");
  expressApp.use(express.static(distPath, staticOptions));
  expressApp.get("*", (req, res) => {
    const indexPath = path.join(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send("Not found");
    }
  });
}

// Serve static assets in production, otherwise mount Vite development server middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    serveProductionSpa(app);
  }

  if (!process.env.VERCEL) {
    serverInstance = app.listen(PORT, "0.0.0.0", () => {
      logger.info(`[Triton Server] System running on http://0.0.0.0:${PORT}`);
    });
  }
}

// In Vercel serverless environment, setup static routes synchronously and export app
if (process.env.VERCEL) {
  serveProductionSpa(app);
} else {
  startServer();
}

// Graceful shutdown handling for SIGINT / SIGTERM
const handleShutdown = (signal: string) => {
  logger.info({ signal }, "Received shutdown signal. Closing server cleanly...");
  if (serverInstance) {
    serverInstance.close(() => {
      logger.info("HTTP server closed cleanly.");
      process.exit(0);
    });
    setTimeout(() => {
      logger.warn("Forceful termination after timeout.");
      process.exit(1);
    }, 5000);
  } else {
    process.exit(0);
  }
};

process.on("SIGINT", () => handleShutdown("SIGINT"));
process.on("SIGTERM", () => handleShutdown("SIGTERM"));

export default app;
