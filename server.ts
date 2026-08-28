import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import morgan from "morgan";
import { apiRouter, apiRateLimiter, DEFAULT_FEATURED_CATEGORIES, DEFAULT_CATEGORIES_LIST } from "./server/routes/api.js";
import { requireTritonKey } from "./server/middleware/requireTritonKey.js";
import { logger } from "./server/utils/logger.js";
import { sendError } from "./server/utils/asyncHandler.js";
import { PRODUCTS } from "./src/data/products.js";

dotenv.config();

const app = express();
const PORT = 3000;

// Trust proxy for reverse proxy environment (Cloud Run / Nginx / Vercel)
app.set("trust proxy", 1);

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
  : ["http://localhost:3000", "https://car-lifts.co.za", "https://store.car-lifts.co.za"];

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

// Static route aliases for assets - ensure /assets/images/* and /images/* are served seamlessly
const staticOptions = {
  maxAge: process.env.NODE_ENV === "production" ? "7d" : "0",
  etag: true,
};

app.use("/assets/images", express.static(path.join(process.cwd(), "public", "assets", "images"), staticOptions));
app.use("/assets/images", express.static(path.join(process.cwd(), "src", "assets", "images"), staticOptions));
app.use("/images", express.static(path.join(process.cwd(), "public", "images"), staticOptions));
app.use("/images", express.static(path.join(process.cwd(), "src", "assets", "images"), staticOptions));

// Mount rate-limited API routes
app.use("/api", apiRateLimiter, apiRouter);

// Dynamic XML Sitemap & Robots.txt
let customSitemapXmlOverride: string | null = null;
let customRobotsTxtOverride: string | null = null;

app.post("/api/seo/update-files", requireTritonKey, (req, res) => {
  try {
    const { sitemapXml, robotsTxt } = req.body || {};
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

  const baseUrl = "https://car-lifts.co.za";
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
    const distPath = path.join(process.cwd(), "dist");
    app.use("/images", express.static(path.join(process.cwd(), "src", "assets", "images"), staticOptions));
    app.use("/images", express.static(path.join(process.cwd(), "public", "images"), staticOptions));
    app.use("/images", express.static(path.join(distPath, "images"), staticOptions));
    app.use("/assets/images", express.static(path.join(process.cwd(), "src", "assets", "images"), staticOptions));
    app.use("/assets/images", express.static(path.join(process.cwd(), "public", "assets", "images"), staticOptions));
    app.use("/assets/images", express.static(path.join(distPath, "assets", "images"), staticOptions));
    app.use(express.static(distPath, staticOptions));
    app.get("*", (req, res) => {
      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send("Not found");
      }
    });
  }

  if (!process.env.VERCEL) {
    serverInstance = app.listen(PORT, "0.0.0.0", () => {
      logger.info(`[Triton Server] System running on http://0.0.0.0:${PORT}`);
    });
  }
}

// In Vercel serverless environment, setup static routes synchronously and export app
if (process.env.VERCEL) {
  const distPath = path.join(process.cwd(), "dist");
  app.use("/images", express.static(path.join(process.cwd(), "src", "assets", "images"), staticOptions));
  app.use("/images", express.static(path.join(process.cwd(), "public", "images"), staticOptions));
  app.use("/images", express.static(path.join(distPath, "images"), staticOptions));
  app.use("/assets/images", express.static(path.join(process.cwd(), "src", "assets", "images"), staticOptions));
  app.use("/assets/images", express.static(path.join(process.cwd(), "public", "assets", "images"), staticOptions));
  app.use("/assets/images", express.static(path.join(distPath, "assets", "images"), staticOptions));
  app.use(express.static(distPath, staticOptions));
  app.get("*", (req, res) => {
    const indexPath = path.join(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send("Not found");
    }
  });
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
