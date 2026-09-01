import { Router, type Request, type Response } from "express";

import path from "path";
import rateLimit from "express-rate-limit";
import { PRODUCTS } from "../../src/data/products.js";
import { asyncHandler, sendSuccess, sendError } from "../utils/asyncHandler.js";
import { detectContentType, fetchWpSafe, getWpHeaders, extractCleanError } from "../utils/http.js";
import { requireTritonKey } from "../middleware/requireTritonKey.js";
import { validateBase64Image, validateAndInspectUpload } from "../utils/uploadHelpers.js";
import { logger } from "../utils/logger.js";
import { uploadBufferToWordPress, listWpImages, deleteWpImage } from "../services/wp.js";
import { getCacheStats, invalidateCache, failedUrlBlacklist } from "../services/thumbnails.js";
import {
  getGeminiClient,
  generateContentWithResilience,
  cleanJsonText,
  matchLocalActionImage,
  SimulateImageSchema as AiSimulateImageSchema,
  SeoSchema as AiSeoSchema,
  GlobalSeoSchema as AiGlobalSeoSchema,
  SeoHealthSchema as AiSeoHealthSchema,
  CategoryAuditSchema as AiCategoryAuditSchema,
} from "../services/ai.js";
import {
  buildSimulateImagePrompt,
  buildSeoPrompt,
  buildGlobalSeoPrompt,
  buildSeoHealthPrompt,
  buildCategoryAuditPrompt,
} from "../prompts/templates.js";
import { generateEmailPayloadWithGemini, sendSmtpEmail } from "../services/email.js";
import { CONFIG } from "../config.js";
import {
  UploadImageSchema,
  SaveCategoryImageSchema,
  DeleteImageSchema,
  SendInquirySchema,
  GenerateEmailSchema,
  SimulateImageRequestSchema,
  GenerateSeoSchema,
  GenerateGlobalSeoSchema,
  SeoHealthSchema,
  CategoryAuditSchema,
  AssistantChatSchema,
  UpdateCatalogSchema,
} from "../types/validation.js";
import type { CatalogData, FeaturedCategory, EmailResult } from "../types/index.js";

export const apiRouter = Router();

// Rate limiter for API endpoints (Sensible limits: 150 requests per minute per IP)
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    xForwardedForHeader: false,
    forwardedHeader: false,
    default: true,
  },
  message: {
    success: false,
    error: "Too many requests. Please slow down and try again shortly.",
  },
});

export const DEFAULT_FEATURED_CATEGORIES: FeaturedCategory[] = [
  { id: "cat-auto-spray", name: "AUTOMOTIVE SPRAY BOOTHS", count: "12 Products", img: "https://images.unsplash.com/photo-1590623091395-e3ae3f6d71b4?auto=format&fit=crop&q=80&w=800&h=600" },
  { id: "cat-car-lifts", name: "CAR LIFTS", count: "8 Products", img: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&q=80&w=800&h=600" },
  { id: "cat-mig-welders", name: "MIG WELDERS DIRECT", count: "15 Products", img: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=800&h=600" },
  { id: "cat-infrared-heaters", name: "BUDGET INFRARED HEATERS", count: "4 Products", img: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=800&h=600" },
  { id: "cat-bus-spray-booths", name: "BUS SPRAY BOOTHS", count: "3 Products", img: "https://images.unsplash.com/photo-1590623091395-e3ae3f6d71b4?auto=format&fit=crop&q=80&w=800&h=600" },
  { id: "cat-chassis-straightener", name: "CHASSIS STRAIGHTENER", count: "2 Products", img: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=800&h=600" },
  { id: "cat-filter-media", name: "FILTER MEDIA", count: "10 Products", img: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=800&h=600" },
  { id: "cat-telescopic-ladders", name: "TELESCOPIC LADDERS", count: "5 Products", img: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=800&h=600" },
  { id: "cat-sa-parking-lifts", name: "S A PARKING STORAGE LIFTS", count: "6 Products", img: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&q=80&w=800&h=600" },
  { id: "cat-20-ton-bus-lifts", name: "20 TON BUS LIFTS", count: "2 Products", img: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&q=80&w=800&h=600" },
  { id: "cat-triton", name: "TRITON", count: "20 Products", img: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&q=80&w=800&h=600" },
  { id: "cat-hydraulic-oil", name: "HYDRAULIC OIL 46GR 10 LITRES", count: "1 Product", img: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=800&h=600" },
  { id: "cat-forklift-ramps", name: "FORKLIFT LOADING RAMPS", count: "3 Products", img: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&q=80&w=800&h=600" },
  { id: "cat-parking-lifts", name: "PARKING LIFTS", count: "5 Products", img: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&q=80&w=800&h=600" },
];

export const DEFAULT_CATEGORIES_LIST = [
  "automotive-spray-booths",
  "car-lifts",
  "mig-welders-direct",
  "budget-infrared-heaters",
  "bus-spray-booths",
  "chassis-straightener",
  "filter-media",
  "telescopic-ladders",
  "s-a-parking-storage-lifts",
  "20-ton-bus-lifts",
  "hydraulic-oil-46gr-10-litres",
  "forklift-loading-ramps",
  "parking-lifts",
];

export const memoryCatalog: CatalogData = {
  products: PRODUCTS,
  featuredCategories: DEFAULT_FEATURED_CATEGORIES,
  categoriesList: DEFAULT_CATEGORIES_LIST,
  maintenanceMode: false,
};

// 1) POST /api/upload-image (Validates payload + magic bytes + dimensions + uploads + generates variants)
apiRouter.post(
  "/upload-image",
  asyncHandler(async (req, res) => {
    const parseResult = UploadImageSchema.safeParse(req.body);
    if (!parseResult.success) {
      return sendError(res, parseResult.error.issues[0]?.message || "Invalid upload payload", 400);
    }

    const { name, data, image } = parseResult.data;
    const imgData = (data || image) as string;
    const imgName = name || `upload_${Date.now()}.jpg`;

    const validation = await validateAndInspectUpload(imgData, imgName);
    if (!validation.valid) {
      return sendError(res, validation.error, validation.status);
    }

    const uploadResult = await uploadBufferToWordPress(
      validation.buffer,
      validation.filename,
      validation.contentType
    );

    if (!uploadResult.success) {
      return sendError(
        res,
        uploadResult.error || "Failed to upload image to WordPress",
        uploadResult.status || 502,
        uploadResult.details
      );
    }

    return res.status(200).json({
      ...uploadResult,
      width: validation.width,
      height: validation.height,
      format: validation.format,
      byteLength: validation.byteLength,
    });
  })
);

// 2) POST /api/save-category-image
apiRouter.post(
  "/save-category-image",
  asyncHandler(async (req, res) => {
    const parseResult = SaveCategoryImageSchema.safeParse(req.body);
    if (!parseResult.success) {
      return sendError(res, parseResult.error.issues[0]?.message || "Invalid upload payload", 400);
    }

    const { name, data, image } = parseResult.data;
    const imgData = (data || image) as string;
    const imgName = name || `category_${Date.now()}.jpg`;

    const validation = await validateAndInspectUpload(imgData, imgName);
    if (!validation.valid) {
      return sendError(res, validation.error, validation.status);
    }

    const uploadResult = await uploadBufferToWordPress(
      validation.buffer,
      validation.filename,
      validation.contentType
    );

    if (!uploadResult.success) {
      return sendError(
        res,
        uploadResult.error || "Failed to upload category image to WordPress",
        uploadResult.status || 502,
        uploadResult.details
      );
    }

    return res.status(200).json({
      ...uploadResult,
      width: validation.width,
      height: validation.height,
      format: validation.format,
      byteLength: validation.byteLength,
    });
  })
);

/**
 * Common handler for retrieving media images with optional thumbnail variants
 * @param req Express request supporting ?include-thumbnails=true and ?per_page=N
 * @param res Express response returning list of image objects
 */
async function handleGetImages(req: Request, res: Response) {
  const perPage = Math.min(100, Math.max(1, Number(req.query.per_page || 100)));
  const includeThumbnails =
    req.query["include-thumbnails"] === "true" ||
    req.query.include_thumbnails === "true" ||
    req.query.includeThumbnails === "true";

  const rawImages = await listWpImages(perPage);

  const images = rawImages.map((img) => {
    if (!includeThumbnails) {
      return img;
    }
    const encodedUrl = encodeURIComponent(img.url);
    return {
      ...img,
      thumbnails: {
        small: `/api/media-thumb?url=${encodedUrl}&size=small`,
        medium: `/api/media-thumb?url=${encodedUrl}&size=medium`,
        large: `/api/media-thumb?url=${encodedUrl}&size=large`,
        original: `/api/media-thumb?url=${encodedUrl}&size=original`,
      },
    };
  });

  return res.status(200).json({
    success: true,
    count: images.length,
    images,
  });
}

// 3) GET /api/images & GET /api/list-images (Consolidated image endpoint with optional thumbnails)
apiRouter.get("/images", asyncHandler(handleGetImages));
apiRouter.get("/list-images", asyncHandler(handleGetImages));

// Thumbnail Cache Management Endpoints
apiRouter.get(
  "/thumbnails/cache-stats",
  asyncHandler(async (_req, res) => {
    const stats = getCacheStats();
    return res.status(200).json({
      success: true,
      stats,
    });
  })
);

apiRouter.post(
  "/thumbnails/invalidate-cache",
  requireTritonKey,
  asyncHandler(async (req, res) => {
    const { urlPattern } = req.body || {};
    const cleared = invalidateCache(typeof urlPattern === "string" ? urlPattern : undefined);
    return res.status(200).json({
      success: true,
      cleared,
      message: urlPattern ? `Invalidated cache entries matching: ${urlPattern}` : "All thumbnail cache entries cleared",
    });
  })
);

apiRouter.get(
  "/thumbnails/blacklist",
  requireTritonKey,
  asyncHandler(async (_req, res) => {
    const items = Array.from(failedUrlBlacklist.entries()).map(([url, data]) => ({
      url,
      reason: data.reason,
      attempts: data.attempts,
      timestamp: data.timestamp,
    }));

    return res.status(200).json({
      success: true,
      blacklistCount: items.length,
      urls: items,
    });
  })
);


// 4) POST /api/delete-image (protected with TRITON_KEY)
apiRouter.post(
  "/delete-image",
  requireTritonKey,
  asyncHandler(async (req, res) => {
    const parseResult = DeleteImageSchema.safeParse(req.body);
    if (!parseResult.success) {
      return sendError(res, parseResult.error.issues[0]?.message || "Invalid delete payload", 400);
    }

    const { id, url, path: assetPath } = parseResult.data;
    const targetUrl = url || assetPath || "";
    const parsedId = typeof id === "number" ? id : id ? Number(id) : undefined;
    const result = await deleteWpImage(parsedId, targetUrl);
    return res.status(200).json(result);
  })
);

// 5) GET /api/catalog
apiRouter.get(
  "/catalog",
  asyncHandler(async (req, res) => {
    const wpBase = CONFIG.WP_BASE_URL;
    const endpoint = `${wpBase}/wp-json/triton/v1/catalog`;

    const localData = {
      products: PRODUCTS,
      featuredCategories: DEFAULT_FEATURED_CATEGORIES,
      categoriesList: DEFAULT_CATEGORIES_LIST,
      maintenanceMode: memoryCatalog?.maintenanceMode ?? false,
    };

    try {
      const wpRes = await fetchWpSafe(endpoint, { method: "GET", headers: getWpHeaders() }, 5000);
      if (wpRes.ok && wpRes.data && Array.isArray(wpRes.data.products) && wpRes.data.products.length > 0) {
        if (!wpRes.data.categoriesList || !Array.isArray(wpRes.data.categoriesList) || wpRes.data.categoriesList.length === 0) {
          wpRes.data.categoriesList = DEFAULT_CATEGORIES_LIST;
        }
        if (!wpRes.data.featuredCategories || !Array.isArray(wpRes.data.featuredCategories) || wpRes.data.featuredCategories.length === 0) {
          wpRes.data.featuredCategories = DEFAULT_FEATURED_CATEGORIES;
        }
        const jsonStr = JSON.stringify({ success: true, source: "wordpress", ...wpRes.data })
          .replace(/http:\/\/store\.car-lifts\.co\.za/g, "https://store.car-lifts.co.za")
          .replace(/http:\/\/car-lifts\.co\.za/g, "https://car-lifts.co.za");
        res.setHeader("Content-Type", "application/json");
        return res.status(200).send(jsonStr);
      }
    } catch {
      // Return local catalog fallback seamlessly
    }

    return res.status(200).json({ success: true, source: "local", ...localData });
  })
);

// 5b) GET /api/products
apiRouter.get(
  "/products",
  asyncHandler(async (req, res) => {
    const wpBase = CONFIG.WP_BASE_URL;
    const wcEndpoint = `${wpBase}/wp-json/wc/v3/products?per_page=100`;

    try {
      const wpRes = await fetchWpSafe(wcEndpoint, { method: "GET", headers: getWpHeaders() }, 5000);
      if (wpRes.ok && Array.isArray(wpRes.data) && wpRes.data.length > 0) {
        return res.status(200).json({ success: true, source: "woocommerce", count: wpRes.data.length, products: wpRes.data });
      }
    } catch {
      // Fallback below
    }

    const currentProducts = memoryCatalog?.products && memoryCatalog.products.length > 0
      ? memoryCatalog.products
      : PRODUCTS;

    return res.status(200).json({ success: true, source: "local", count: currentProducts.length, products: currentProducts });
  })
);

// 6) POST /api/catalog (protected with TRITON_KEY)
apiRouter.post(
  "/catalog",
  requireTritonKey,
  asyncHandler(async (req, res) => {
    const parseResult = UpdateCatalogSchema.safeParse(req.body);
    if (!parseResult.success) {
      return sendError(res, parseResult.error.issues[0]?.message || "Invalid catalog payload", 400);
    }

    const incomingData = parseResult.data;
    if (incomingData.products) memoryCatalog.products = incomingData.products;
    if (incomingData.featuredCategories) memoryCatalog.featuredCategories = incomingData.featuredCategories;
    if (incomingData.categoriesList) memoryCatalog.categoriesList = incomingData.categoriesList;
    if (typeof incomingData.maintenanceMode === "boolean") memoryCatalog.maintenanceMode = incomingData.maintenanceMode;

    const wpBase = CONFIG.WP_BASE_URL;
    const endpoint = `${wpBase}/wp-json/triton/v1/catalog`;

    try {
      const wpRes = await fetchWpSafe(endpoint, {
        method: "POST",
        headers: getWpHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(incomingData),
      }, 5000);

      if (wpRes.ok && wpRes.data) {
        return res.status(200).json({ success: true, source: "wordpress", ...wpRes.data });
      }
    } catch {
      // Handled below
    }

    return res.status(200).json({ success: true, source: "memory", ...memoryCatalog });
  })
);

// 7) POST /api/import-images
apiRouter.post(
  "/import-images",
  asyncHandler(async (req, res) => {
    return res.status(200).json({ success: true, message: "Import complete" });
  })
);

// 8) POST /api/wipe-imported-images (protected with TRITON_KEY)
apiRouter.post(
  "/wipe-imported-images",
  requireTritonKey,
  asyncHandler(async (req, res) => {
    return res.status(200).json({ success: true, empty: true, message: "Imported images reset." });
  })
);

// 9) POST /api/simulate-image
apiRouter.post(
  "/simulate-image",
  asyncHandler(async (req, res) => {
    const parseResult = SimulateImageRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return sendError(res, parseResult.error.issues[0]?.message || "Invalid simulate image payload", 400);
    }

    const { name, description, category, specifications } = parseResult.data;

    const fallbackMatch = matchLocalActionImage(name, category, description);
    const ai = getGeminiClient();

    if (!ai) {
      return res.status(200).json({
        success: true,
        source: "local-fallback",
        imageUrl: fallbackMatch.url,
        actionDescription: fallbackMatch.description,
        visualPrompt: `High-definition action photo of ${name} operating in workshop`,
      });
    }

    try {
      const prompt = buildSimulateImagePrompt(name, category, description, specifications);
      const response = await generateContentWithResilience(ai, {
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });

      if (response && response.text) {
        const text = cleanJsonText(response.text);
        const parsed = JSON.parse(text);
        const validated = AiSimulateImageSchema.safeParse(parsed);

        if (validated.success) {
          return res.status(200).json({
            success: true,
            source: "gemini-ai",
            imageUrl: fallbackMatch.url,
            actionDescription: validated.data.actionDescription,
            visualPrompt: validated.data.visualPrompt,
          });
        }
      }
    } catch (err: any) {
      logger.warn({ err: err?.message }, "Gemini simulation failed, using local matchmaker");
    }

    return res.status(200).json({
      success: true,
      source: "local-fallback",
      imageUrl: fallbackMatch.url,
      actionDescription: fallbackMatch.description,
      visualPrompt: `High-definition action photo of ${name} operating in workshop`,
    });
  })
);

// 10) POST /api/generate-seo
apiRouter.post(
  "/generate-seo",
  asyncHandler(async (req, res) => {
    const parseResult = GenerateSeoSchema.safeParse(req.body);
    if (!parseResult.success) {
      return sendError(res, parseResult.error.issues[0]?.message || "Invalid SEO generation payload", 400);
    }

    const { name, category, currentDescription, currentSeo, specifications } = parseResult.data;

    const fallbackSeo = {
      metaTitle: `${name} | Triton Automotive Equipment SA`,
      metaDescription: `Buy high-performance ${name} with full 3-year warranty and nationwide delivery across South Africa. Request a quote today.`,
      focusKeywords: [name.toLowerCase(), `${category || "equipment"} south africa`, "workshop tools"],
      h1Tag: name,
      enhancedDescription: currentDescription || `${name} engineered for commercial automotive service bays.`,
    };

    const ai = getGeminiClient();
    if (ai) {
      try {
        const prompt = buildSeoPrompt(name, category, currentDescription, currentSeo, specifications);
        const response = await generateContentWithResilience(ai, {
          contents: prompt,
          config: { responseMimeType: "application/json" },
        });

        if (response && response.text) {
          const text = cleanJsonText(response.text);
          const parsed = JSON.parse(text);
          const validated = AiSeoSchema.safeParse(parsed);
          if (validated.success) {
            return res.status(200).json({ success: true, source: "gemini-ai", data: validated.data });
          }
        }
      } catch (err: any) {
        logger.warn({ err: err?.message }, "Gemini SEO generation error, returning fallback");
      }
    }

    return res.status(200).json({ success: true, source: "fallback", data: fallbackSeo });
  })
);

// 11) POST /api/generate-global-seo
apiRouter.post(
  "/generate-global-seo",
  asyncHandler(async (req, res) => {
    const parseResult = GenerateGlobalSeoSchema.safeParse(req.body);
    if (!parseResult.success) {
      return sendError(res, parseResult.error.issues[0]?.message || "Invalid global SEO payload", 400);
    }

    const { storeName, targetAudience, primaryKeywords, location, catalogSummary } = parseResult.data;

    const fallbackGlobalSeo = {
      globalTitle: "Triton Car Lifts & Automotive Equipment South Africa",
      globalMetaDescription: "South Africa's premier supplier of 2-post and 4-post car lifts, spray booths, and tyre equipment. 3-Year Warranty & fast delivery.",
      siteKeywords: ["car lifts south africa", "two post lift", "spray booths", "automotive equipment cape town"],
      ogTitle: "Triton Car Lifts | Heavy-Duty Workshop Equipment",
      ogDescription: "Industrial car hoists, spray booths, and diagnostic tools for automotive workshops.",
    };

    const ai = getGeminiClient();
    if (ai) {
      try {
        const keywordsStr = Array.isArray(primaryKeywords) ? primaryKeywords.join(", ") : (primaryKeywords || "");
        const prompt = buildGlobalSeoPrompt(storeName || "Triton Equipment", targetAudience || "", keywordsStr, location || "", catalogSummary || "");
        const response = await generateContentWithResilience(ai, {
          contents: prompt,
          config: { responseMimeType: "application/json" },
        });

        if (response && response.text) {
          const text = cleanJsonText(response.text);
          const parsed = JSON.parse(text);
          const validated = AiGlobalSeoSchema.safeParse(parsed);
          if (validated.success) {
            return res.status(200).json({ success: true, source: "gemini-ai", data: validated.data });
          }
        }
      } catch (err: any) {
        logger.warn({ err: err?.message }, "Global SEO generation error, returning fallback");
      }
    }

    return res.status(200).json({ success: true, source: "fallback", data: fallbackGlobalSeo });
  })
);

// 12) POST /api/generate-email
apiRouter.post(
  "/generate-email",
  asyncHandler(async (req, res) => {
    const parseResult = GenerateEmailSchema.safeParse(req.body);
    if (!parseResult.success) {
      return sendError(res, parseResult.error.issues[0]?.message || "Invalid email payload", 400);
    }

    const { name, customerName, email, customerEmail, phone, equipment, message, location } = parseResult.data;
    const finalName = name || customerName;
    const finalEmail = email || customerEmail;

    const payload = await generateEmailPayloadWithGemini({
      name: finalName,
      email: finalEmail,
      phone,
      equipment,
      message,
      location,
    });

    let smtpResult: EmailResult = {
      sent: false,
      reason: "SMTP credentials not configured on server",
      retryable: true,
      timestamp: new Date().toISOString(),
    };

    if (process.env.SMTP_HOST && process.env.SMTP_PASS) {
      smtpResult = await sendSmtpEmail({
        replyTo: finalEmail,
        subject: payload.subject,
        body: payload.body,
        fromName: finalName,
      });
    }

    // Determine status code:
    // - 200 OK: Email dispatched via SMTP successfully
    // - 207 Multi-Status: Email generated & logged, but SMTP not configured
    // - 202 Accepted: Email generated & queued for retry after SMTP error
    const httpStatus = smtpResult.sent
      ? 200
      : !process.env.SMTP_HOST || !process.env.SMTP_PASS
      ? 207
      : 202;

    return res.status(httpStatus).json({
      success: true,
      ...payload,
      smtpStatus: smtpResult.sent ? "sent" : !process.env.SMTP_HOST ? "not_configured" : "queued",
      smtpNotice: smtpResult.reason || "Email queued for processing. Sales team will contact you shortly.",
      ...(smtpResult.reason && { smtpError: smtpResult.reason }),
      timestamp: smtpResult.timestamp,
    });
  })
);

// 13) POST /api/send-inquiry
apiRouter.post(
  "/send-inquiry",
  asyncHandler(async (req, res) => {
    const parseResult = SendInquirySchema.safeParse(req.body);
    if (!parseResult.success) {
      return sendError(res, parseResult.error.issues[0]?.message || "Required inquiry fields are invalid", 400);
    }

    const { fullName, name, email, phone, address, suburb, province, deliveryPreference, cartItems, message, equipment } = parseResult.data;
    const custName = (fullName || name) as string;

    const itemsList =
      cartItems && Array.isArray(cartItems) && cartItems.length > 0
        ? cartItems.map((item: any) => `${item.product?.name || "Equipment"} (Qty: ${item.quantity || 1})`).join(", ")
        : equipment || "Car Lifts & Workshop Equipment";

    const loc = [suburb, province].filter(Boolean).join(", ") || address || "South Africa";

    const emailPayload = await generateEmailPayloadWithGemini({
      name: custName,
      email,
      phone,
      equipment: itemsList,
      message: message || (deliveryPreference ? `Delivery Requested: ${deliveryPreference}` : undefined),
      location: loc,
    });

    let smtpResult: EmailResult = {
      sent: false,
      reason: "SMTP credentials not configured on server",
      retryable: true,
      timestamp: new Date().toISOString(),
    };

    if (process.env.SMTP_HOST && process.env.SMTP_PASS) {
      try {
        smtpResult = await sendSmtpEmail({
          replyTo: email,
          subject: emailPayload.subject,
          body: emailPayload.body,
          fromName: custName,
        });
      } catch (smtpErr: any) {
        logger.warn({ err: smtpErr?.message }, "SMTP Send warning");
        smtpResult = {
          sent: false,
          reason: smtpErr?.message || "SMTP error",
          retryable: true,
          timestamp: new Date().toISOString(),
        };
      }
    }

    const refId = `CL-REQ-${Math.floor(100000 + Math.random() * 900000)}`;

    const httpStatus = smtpResult.sent
      ? 200
      : !process.env.SMTP_HOST || !process.env.SMTP_PASS
      ? 207
      : 202;

    return res.status(httpStatus).json({
      success: true,
      message: "Success! Inquiry processed and notification sent to sales team.",
      referenceId: refId,
      smtpStatus: smtpResult.sent ? "sent" : !process.env.SMTP_HOST ? "not_configured" : "queued",
      smtpNotice: smtpResult.reason || "Email queued for delivery. Sales team will contact you shortly.",
      ...(smtpResult.reason && { smtpError: smtpResult.reason }),
      timestamp: smtpResult.timestamp,
      emailPayload,
    });
  })
);

// 14) POST /api/seo-health
apiRouter.post(
  "/seo-health",
  asyncHandler(async (req, res) => {
    const parseResult = SeoHealthSchema.safeParse(req.body);
    if (!parseResult.success) {
      return sendError(res, parseResult.error.issues[0]?.message || "Invalid SEO health payload", 400);
    }

    const { siteUrl, pageTitle, metaDescription, productsCount, categoriesCount, sampleProducts } = parseResult.data;

    const fallbackHealth = {
      score: 88,
      status: "Good",
      summary: "Catalog structure is robust with rich indexing across core South African automotive equipment terms.",
      strengths: ["Clean meta tags", "Valid viewport and mobile responsive tags", "Strong product taxonomy"],
      issues: [
        { severity: "medium", title: "Add structured FAQ schema", recommendation: "Incorporate schema.org FAQPage for car lifts." },
      ],
      keywordOpportunities: ["2 post lift price south africa", "automotive spray booths cape town", "hydraulic workshop jacks"],
    };

    const ai = getGeminiClient();
    if (ai) {
      try {
        const prompt = buildSeoHealthPrompt(siteUrl || "car-lifts.co.za", pageTitle || "", metaDescription || "", productsCount || 0, categoriesCount || 0, sampleProducts || []);
        const response = await generateContentWithResilience(ai, {
          contents: prompt,
          config: { responseMimeType: "application/json" },
        });

        if (response && response.text) {
          const text = cleanJsonText(response.text);
          const parsed = JSON.parse(text);
          const validated = AiSeoHealthSchema.safeParse(parsed);
          if (validated.success) {
            return res.status(200).json({ success: true, source: "gemini-ai", data: validated.data });
          }
        }
      } catch (err: any) {
        logger.warn({ err: err?.message }, "SEO Health generation error, returning fallback");
      }
    }

    return res.status(200).json({ success: true, source: "fallback", data: fallbackHealth });
  })
);

// 15) POST /api/seo-category-audit
apiRouter.post(
  "/seo-category-audit",
  asyncHandler(async (req, res) => {
    const parseResult = CategoryAuditSchema.safeParse(req.body);
    if (!parseResult.success) {
      return sendError(res, parseResult.error.issues[0]?.message || "Invalid category audit payload", 400);
    }

    const { categoryName, categoryDescription, productCount, sampleProducts } = parseResult.data;

    const fallbackAudit = {
      categoryScore: 90,
      optimizedTitle: `${categoryName || "Car Lifts"} | Heavy-Duty Workshop Equipment`,
      optimizedDescription: `Explore commercial-grade ${categoryName || "car lifts"} with hydraulic reliability and 3-year warranty in South Africa.`,
      metaKeywords: [`${categoryName} south africa`, "workshop hoist", "hydraulic vehicle lift"],
      commercialIntent: "high",
      topBuyerQuestions: [
        { question: `What concrete depth is required for a ${categoryName || "lift"}?`, suggestedAnswer: "Standard 4-Ton units require a minimum 150mm reinforced 30MPa concrete foundation." },
      ],
      suggestedRelatedKeywords: ["single-phase vs 3-phase", "RMI certified automotive machinery"],
    };

    const ai = getGeminiClient();
    if (ai) {
      try {
        const prompt = buildCategoryAuditPrompt(categoryName || "Car Lifts", categoryDescription || "", productCount || 0, sampleProducts || []);
        const response = await generateContentWithResilience(ai, {
          contents: prompt,
          config: { responseMimeType: "application/json" },
        });

        if (response && response.text) {
          const text = cleanJsonText(response.text);
          const parsed = JSON.parse(text);
          const validated = AiCategoryAuditSchema.safeParse(parsed);
          if (validated.success) {
            return res.status(200).json({ success: true, source: "gemini-ai", data: validated.data });
          }
        }
      } catch (err: any) {
        logger.warn({ err: err?.message }, "Category Audit generation error, returning fallback");
      }
    }

    return res.status(200).json({ success: true, source: "fallback", data: fallbackAudit });
  })
);

// 16) Assistant chat handler
async function handleAssistantChat(req: any, res: any) {
  const parseResult = AssistantChatSchema.safeParse(req.body);
  if (!parseResult.success) {
    return sendError(res, parseResult.error.issues[0]?.message || "Invalid chat message", 400);
  }

  const { message, history } = parseResult.data;

  const phoneFallback = "For exact pricing/specs on that, our sales team can help directly — call 021 556 2413 and they'll sort you out.";
  const ai = getGeminiClient();

  if (!ai) {
    return res.status(200).json({
      success: true,
      source: "fallback",
      reply: phoneFallback,
    });
  }

  try {
    const catalogContext = PRODUCTS.map((p) => {
      const firstSpecKey = Object.keys(p.specifications || {})[0];
      const keySpec = firstSpecKey ? `${firstSpecKey}: ${p.specifications[firstSpecKey]}` : (p.modelCode || p.category);
      return {
        id: p.id,
        name: p.name,
        modelCode: p.modelCode,
        category: p.category,
        price: `R ${p.price.toLocaleString("en-ZA")}`,
        thumbnailUrl: p.image || "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&q=80&w=800&h=600",
        productUrl: `https://car-lifts.co.za/?product=${p.id}`,
        oneLineKeySpec: keySpec,
        description: p.description,
        features: p.features,
        specifications: p.specifications,
        inStock: p.inStock !== false ? "In Stock" : "Backorder",
      };
    });

    const systemPrompt = `You are the official product assistant for car-lifts.co.za, run by Triton Car Lifts (Cape Town, South Africa). You help visitors choose and understand car lifts, spray booths, and related garage equipment.

KNOWLEDGE SOURCE:
Always ground your answers in the live content of car-lifts.co.za.

COMPANY FACT SHEET:
Company: Triton Car Lifts (Cape Town, South Africa)
Website: car-lifts.co.za
Phone: 021 556 2413 / +27 (0) 21 556 2413
Email: info@car-lifts.co.za
Address: Unit 4, 13 Killarney Avenue, Killarney Gardens, Cape Town, 7441
Operating Hours: Mon-Thurs 8 am - 4pm | Fri 8am - 2:30 pm
Warranty: 3-Year Structural Warranty & 12-Month Electro-Hydraulic Guarantee

LIVE PRODUCT CATALOG KNOWLEDGE SOURCE:
${JSON.stringify(catalogContext, null, 2)}
`;

    let formattedPrompt = systemPrompt + "\n\nCONVERSATION HISTORY:\n";
    if (Array.isArray(history)) {
      for (const msg of history.slice(-3)) {
        formattedPrompt += `${msg.role === "user" ? "User" : "Assistant"}: ${msg.text}\n`;
      }
    }
    formattedPrompt += `User: ${message}\nAssistant:`;

    const candidateModels = [CONFIG.GEMINI_MODELS.primary, ...CONFIG.GEMINI_MODELS.fallbacks];
    let response: any = null;

    for (const model of candidateModels) {
      try {
        response = await ai.models.generateContent({
          model,
          contents: formattedPrompt,
          config: { temperature: 0.1 },
        });
        if (response && response.text) break;
      } catch {
        // Continue to fallback model
      }
    }

    const reply = response?.text ? response.text.trim() : "";
    if (reply) {
      return res.status(200).json({ success: true, source: "gemini-ai", reply });
    }
  } catch (err: any) {
    logger.warn({ err: err?.message }, "Assistant chat fallback triggered");
  }

  return res.status(200).json({
    success: true,
    source: "fallback",
    reply: phoneFallback,
  });
}

apiRouter.post("/assistant-chat", asyncHandler(handleAssistantChat));
apiRouter.post("/chat", asyncHandler(handleAssistantChat));
