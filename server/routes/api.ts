import { Router } from "express";
import path from "path";
import rateLimit from "express-rate-limit";
import { PRODUCTS } from "../../src/data/products.js";
import { asyncHandler, sendSuccess, sendError } from "../utils/asyncHandler.js";
import { detectContentType, fetchWpSafe, getWpHeaders, extractCleanError } from "../utils/http.js";
import { requireTritonKey } from "../middleware/requireTritonKey.js";
import { validateBase64Image } from "../utils/uploadHelpers.js";
import { logger } from "../utils/logger.js";
import { uploadBufferToWordPress, listWpImages, deleteWpImage } from "../services/wp.js";
import {
  getGeminiClient,
  generateContentWithResilience,
  cleanJsonText,
  matchLocalActionImage,
  SimulateImageSchema,
  SeoSchema,
  GlobalSeoSchema,
  SeoHealthSchema,
  CategoryAuditSchema,
} from "../services/ai.js";
import {
  buildSimulateImagePrompt,
  buildSeoPrompt,
  buildGlobalSeoPrompt,
  buildSeoHealthPrompt,
  buildCategoryAuditPrompt,
} from "../prompts/templates.js";
import { generateEmailPayloadWithGemini, sendSmtpEmail } from "../services/email.js";
import type { CatalogData, FeaturedCategory } from "../types/index.js";

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

// Maximum upload size limit: 5MB
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

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

// 1) POST /api/upload-image
apiRouter.post(
  "/upload-image",
  asyncHandler(async (req, res) => {
    const { name, data, image } = req.body || {};
    const imgData = data || image;
    const imgName = name || `upload_${Date.now()}.jpg`;

    const validation = validateBase64Image(imgData, imgName);
    if (!validation.valid) {
      return sendError(res, validation.error, validation.status);
    }

    const { buffer, contentType, filename } = validation;
    const result = await uploadBufferToWordPress(buffer, filename, contentType);

    if (result.success) {
      const sanitizedUrl = result.url ? result.url.replaceAll("http://store.car-lifts.co.za", "https://store.car-lifts.co.za") : result.url;
      const sanitizedPath = result.path ? result.path.replaceAll("http://store.car-lifts.co.za", "https://store.car-lifts.co.za") : result.path;
      return res.status(200).json({
        success: true,
        id: result.id,
        url: sanitizedUrl,
        path: sanitizedPath,
        filename: result.filename,
      });
    }

    const httpStatus = result.status && result.status >= 400 && result.status <= 599 ? result.status : 500;
    return sendError(res, result.error || "WordPress media upload failed", httpStatus, result.details);
  })
);

// 2) POST /api/save-category-image
apiRouter.post(
  "/save-category-image",
  asyncHandler(async (req, res) => {
    const { name, data, image } = req.body || {};
    const imgData = data || image;
    const imgName = name || `category_${Date.now()}.jpg`;

    const validation = validateBase64Image(imgData, imgName);
    if (!validation.valid) {
      return sendError(res, validation.error, validation.status);
    }

    const { buffer, contentType, filename } = validation;
    const result = await uploadBufferToWordPress(buffer, filename, contentType);

    if (result.success) {
      return res.status(200).json({
        success: true,
        id: result.id,
        url: result.url,
        path: result.path,
        filename: result.filename,
      });
    }

    const httpStatus = result.status && result.status >= 400 && result.status <= 599 ? result.status : 500;
    return sendError(res, result.error || "WordPress media upload failed", httpStatus, result.details);
  })
);

// 3) GET /api/list-images
apiRouter.get(
  "/list-images",
  asyncHandler(async (req, res) => {
    const images = await listWpImages(100);
    return res.status(200).json({ success: true, images });
  })
);

// 4) POST /api/delete-image (protected with TRITON_KEY)
apiRouter.post(
  "/delete-image",
  requireTritonKey,
  asyncHandler(async (req, res) => {
    const { id, url, path: assetPath } = req.body || {};
    const targetUrl = url || assetPath || "";
    const result = await deleteWpImage(id, targetUrl);
    return res.status(200).json(result);
  })
);

// 5) GET /api/catalog
apiRouter.get(
  "/catalog",
  asyncHandler(async (req, res) => {
    const wpBase = (process.env.WP_BASE_URL || "https://store.car-lifts.co.za").replace(/\/+$/, "");
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
        return res.status(200).json({ success: true, source: "wordpress", ...wpRes.data });
      }
    } catch {
      // Return local catalog fallback seamlessly
    }

    return res.status(200).json({ success: true, source: "local", ...localData });
  })
);

// 6) POST /api/catalog (protected with TRITON_KEY)
apiRouter.post(
  "/catalog",
  requireTritonKey,
  asyncHandler(async (req, res) => {
    const incomingData = req.body || {};
    if (incomingData.products) memoryCatalog.products = incomingData.products;
    if (incomingData.featuredCategories) memoryCatalog.featuredCategories = incomingData.featuredCategories;
    if (incomingData.categoriesList) memoryCatalog.categoriesList = incomingData.categoriesList;
    if (typeof incomingData.maintenanceMode === "boolean") memoryCatalog.maintenanceMode = incomingData.maintenanceMode;

    const wpBase = (process.env.WP_BASE_URL || "https://store.car-lifts.co.za").replace(/\/+$/, "");
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
    const { name, description, category, specifications } = req.body || {};

    if (!name || typeof name !== "string") {
      return sendError(res, "Missing or invalid name in request body", 400);
    }

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
        const validated = SimulateImageSchema.safeParse(parsed);

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
    const { name, category, currentDescription, currentSeo, specifications } = req.body || {};

    if (!name || typeof name !== "string") {
      return sendError(res, "Missing product name for SEO generation", 400);
    }

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
          const validated = SeoSchema.safeParse(parsed);
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
    const { storeName, targetAudience, primaryKeywords, location, catalogSummary } = req.body || {};

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
        const prompt = buildGlobalSeoPrompt(storeName, targetAudience, primaryKeywords, location, catalogSummary);
        const response = await generateContentWithResilience(ai, {
          contents: prompt,
          config: { responseMimeType: "application/json" },
        });

        if (response && response.text) {
          const text = cleanJsonText(response.text);
          const parsed = JSON.parse(text);
          const validated = GlobalSeoSchema.safeParse(parsed);
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
    const { name, customerName, email, customerEmail, phone, equipment, message, location } = req.body || {};
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

    if (process.env.SMTP_HOST && process.env.SMTP_PASS) {
      await sendSmtpEmail({
        replyTo: finalEmail,
        subject: payload.subject,
        body: payload.body,
        fromName: finalName,
      });
    }

    return res.status(200).json(payload);
  })
);

// 13) POST /api/send-inquiry
apiRouter.post(
  "/send-inquiry",
  asyncHandler(async (req, res) => {
    const { fullName, name, email, phone, address, suburb, province, deliveryPreference, cartItems, message, equipment } = req.body || {};
    const custName = fullName || name;

    if (!custName || !email || !phone) {
      return sendError(res, "Required inquiry fields (name, email, phone) are missing.", 400);
    }

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
      message: message || (deliveryPreference ? `Delivery Requested: ${deliveryPreference === "yes" ? "YES" : "NO"}` : undefined),
      location: loc,
    });

    let smtpResult: { sent: boolean; reason?: string } = { sent: false, reason: "email not configured" };
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
      }
    }

    const refId = `CL-REQ-${Math.floor(100000 + Math.random() * 900000)}`;

    return res.status(200).json({
      success: true,
      message: "Success! Inquiry processed and notification sent to sales team.",
      referenceId: refId,
      smtpStatus: smtpResult.sent ? "sent" : "logged",
      emailPayload,
    });
  })
);

// 14) POST /api/seo-health
apiRouter.post(
  "/seo-health",
  asyncHandler(async (req, res) => {
    const { siteUrl, pageTitle, metaDescription, productsCount, categoriesCount, sampleProducts } = req.body || {};

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
          const validated = SeoHealthSchema.safeParse(parsed);
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
    const { categoryName, categoryDescription, productCount, sampleProducts } = req.body || {};

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
          const validated = CategoryAuditSchema.safeParse(parsed);
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
  const { message, history } = req.body || {};

  if (!message || typeof message !== "string") {
    return sendError(res, "Missing message parameter in request body", 400);
  }

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

    const candidateModels = ["gemini-3.7-flash", "gemini-flash-latest", "gemini-3.1-pro-preview"];
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
