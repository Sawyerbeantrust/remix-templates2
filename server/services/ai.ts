import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { logger } from "../utils/logger.js";
import {
  buildSimulateImagePrompt,
  buildSeoPrompt,
  buildGlobalSeoPrompt,
  buildEmailPrompt,
  buildSeoHealthPrompt,
  buildCategoryAuditPrompt,
  TRITON_ASSISTANT_SYSTEM_PROMPT,
} from "../prompts/templates.js";

// Telemetry counters for AI requests and fallbacks
export const aiTelemetry = {
  totalRequests: 0,
  successfulAiResponses: 0,
  quotaErrors: 0,
  transientErrors: 0,
  fallbacksTriggered: 0,
};

// Zod schemas for strict AI response validation
export const SimulateImageSchema = z.object({
  visualPrompt: z.string().default("Photorealistic automotive lift installed in workshop"),
  actionDescription: z.string().default("Heavy-duty vehicle service unit engineered with dual hydraulic cylinders."),
  matchedCategory: z.string().default("car-lift"),
});

export const SeoSchema = z.object({
  metaTitle: z.string().min(5),
  metaDescription: z.string().min(10),
  focusKeywords: z.array(z.string()).default([]),
  h1Tag: z.string().optional(),
  enhancedDescription: z.string().optional(),
  faqs: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
});

export const GlobalSeoSchema = z.object({
  globalTitle: z.string(),
  globalMetaDescription: z.string(),
  siteKeywords: z.array(z.string()).default([]),
  ogTitle: z.string().optional(),
  ogDescription: z.string().optional(),
  recommendedCategories: z.array(z.string()).optional(),
  schemaOrgSnippet: z.record(z.string(), z.any()).optional(),
});

export const EmailSchema = z.object({
  subject: z.string(),
  bodyHtml: z.string(),
  bodyText: z.string().optional(),
});

export const SeoHealthSchema = z.object({
  score: z.number().min(0).max(100),
  status: z.string(),
  summary: z.string(),
  strengths: z.array(z.string()).default([]),
  issues: z.array(z.object({
    severity: z.string(),
    title: z.string(),
    recommendation: z.string(),
  })).default([]),
  keywordOpportunities: z.array(z.string()).default([]),
});

export const CategoryAuditSchema = z.object({
  categoryScore: z.number().min(0).max(100),
  optimizedTitle: z.string(),
  optimizedDescription: z.string(),
  metaKeywords: z.array(z.string()).default([]),
  commercialIntent: z.string(),
  topBuyerQuestions: z.array(z.object({ question: z.string(), suggestedAnswer: z.string() })).default([]),
  suggestedRelatedKeywords: z.array(z.string()).default([]),
});

export const ACTION_IMAGES_CATALOG = [
  {
    url: "https://images.unsplash.com/photo-1563720223185-11003d516935?q=80&w=800&auto=format&fit=crop",
    keywords: ["car-lift", "hoist", "hydraulic", "vehicle elevated", "undercarriage inspection", "chassis repair", "two-post lift"],
    description: "Full-size SUV elevated on a heavy-duty two-post hydraulic vehicle lift inside a brightly-lit commercial workshop."
  },
  {
    url: "https://images.unsplash.com/photo-1507136566006-cfc505b114fc?q=80&w=800&auto=format&fit=crop",
    keywords: ["car-lift", "scissor-lift", "mechanic working", "repair underbody", "safety certified", "torque wrench"],
    description: "Professional automotive technician under a securely raised sports vehicle, utilizing precision tools with safety lighting."
  },
  {
    url: "https://images.unsplash.com/photo-1617531653332-bd46c24f2068?q=80&w=800&auto=format&fit=crop",
    keywords: ["car-lift", "showroom lifter", "four-post lift", "wheel alignment", "garage repair", "low-profile vehicle"],
    description: "Modern German vehicle lifted on a precision alignment four-post lift inside an industrial clean-room repair facility."
  },
  {
    url: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?q=80&w=800&auto=format&fit=crop",
    keywords: ["car-lift", "workshop hoist", "diagnostic equipment", "electronic scan", "suspension check"],
    description: "A close-up of a high-performance tire and steering system elevated for thorough electronic suspension diagnostics."
  },
  {
    url: "https://images.unsplash.com/photo-1616788494707-ec28f08d05a1?q=80&w=800&auto=format&fit=crop",
    keywords: ["spray-booth", "paint cabin", "spray-gun", "automotive coating", "car spray", "painting-process", "protective suit"],
    description: "A newly base-coated premium sports coupe inside a state-of-the-art down-draft heating spray booth with LED panels."
  },
  {
    url: "https://images.unsplash.com/photo-1625233810172-740510f0003c?q=80&w=800&auto=format&fit=crop",
    keywords: ["spray-booth", "painter in suit", "masking tape", "refinishing active", "paint-gun", "clear coat"],
    description: "An experienced automotive painter in a full protective HAZMAT suit applying premium clear coat utilizing an ergonomic spray gun."
  },
  {
    url: "https://images.unsplash.com/photo-1517524206127-48bbd363f3d7?q=80&w=800&auto=format&fit=crop",
    keywords: ["spray-booth", "preparation bay", "body shop bodywork", "sandpaper", "primer spray"],
    description: "Preparation bay activities showing bodywork and initial high-build primer sanding prior to spray booth cabin insertion."
  },
  {
    url: "https://images.unsplash.com/photo-1580273916550-e323be2ae537?q=80&w=800&auto=format&fit=crop",
    keywords: ["wheel-care", "tire changer", "wheel-aligner", "carbon wheel", "rim service", "balance weights"],
    description: "A luxury vehicle completing dynamic 3D wheel alignment, showing target clamping systems engaged on premium standard rims."
  },
  {
    url: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=800&auto=format&fit=crop",
    keywords: ["wheel-care", "pneumatic tire mount", "bead breaker", "high torque changer"],
    description: "An active tire extraction process using a heavy-duty pneumatic helper arm tire changer system safely breaking the bead."
  },
  {
    url: "https://images.unsplash.com/photo-1504215680048-db15fc060c3a?q=80&w=800&auto=format&fit=crop",
    keywords: ["wheel-care", "wheel-balancer", "laser guidance", "spin calibration"],
    description: "Automotive tire spinning on a digital high-speed wheel balancing node with laser calibration indicators."
  },
  {
    url: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?q=80&w=800&auto=format&fit=crop",
    keywords: ["workshop-equipment", "welder", "welding sparks", "metal fabrication", "plasma cutter"],
    description: "High-temperature metal arc-welding emitting brilliant blue-amber sparks on industrial machinery joints."
  },
  {
    url: "https://images.unsplash.com/photo-1530047625168-4b18fa25d370?q=80&w=800&auto=format&fit=crop",
    keywords: ["workshop-equipment", "crane", "engine hoist", "gearbox puller", "compressor"],
    description: "An overhead chain hoist lifting a massive cast-iron cylinder engine block inside an active heavy-duty mechanics bay."
  },
  {
    url: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=800&auto=format&fit=crop",
    keywords: ["workshop-equipment", "compressor", "impact wrench", "air line regulator", "pneumatic tool"],
    description: "Compressed air distribution regulator and pneumatic lines delivering torque pressure to impact guns on a service bench."
  }
];

let geminiClientInstance: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!geminiClientInstance) {
    geminiClientInstance = new GoogleGenAI({ apiKey });
  }
  return geminiClientInstance;
}

export function isQuotaOrBillingError(err: any): boolean {
  if (!err) return false;
  const errStr = String(err?.message || err?.status || err?.statusCode || err?.code || "");
  const lower = errStr.toLowerCase();
  return (
    errStr.includes("429") ||
    lower.includes("quota") ||
    lower.includes("resource_exhausted") ||
    lower.includes("limit") ||
    lower.includes("billing") ||
    lower.includes("plan")
  );
}

/**
 * Strips Markdown code blocks and extracts JSON object safely
 */
export function cleanJsonText(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/i, "").replace(/\s*```$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }
  return cleaned.trim();
}

/**
 * Resilient helper to call Gemini models with automatic transient error retry and structured logging
 */
export async function generateContentWithResilience(
  ai: GoogleGenAI,
  options: {
    contents: string;
    config?: any;
    primaryModel?: string;
  }
) {
  const model = options.primaryModel || "gemini-2.5-flash";
  aiTelemetry.totalRequests++;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: options.contents,
        config: options.config,
      });
      aiTelemetry.successfulAiResponses++;
      return response;
    } catch (err: any) {
      if (isQuotaOrBillingError(err)) {
        aiTelemetry.quotaErrors++;
        aiTelemetry.fallbacksTriggered++;
        logger.warn({ model, err: err?.message }, "Gemini quota or billing limit reached. Triggering local matchmaker fallback.");
        throw err;
      }

      const isTransient =
        String(err?.message || "").includes("503") ||
        String(err?.message || "").includes("500") ||
        String(err?.message || "").includes("UNAVAILABLE");

      if (isTransient && attempt === 1) {
        aiTelemetry.transientErrors++;
        const delay = 500 + Math.floor(Math.random() * 200);
        logger.warn({ model, attempt, delay }, "Gemini transient error; retrying with backoff...");
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        aiTelemetry.fallbacksTriggered++;
        logger.warn({ model, err: err?.message }, "Gemini call failed. Triggering local fallback.");
        throw err;
      }
    }
  }
  throw new Error("Gemini generateContent failed after retries");
}

/**
 * Local Matchmaker fallback for action images
 */
export function matchLocalActionImage(name: string, category: string, description?: string) {
  const combined = `${name || ""} ${category || ""} ${description || ""}`.toLowerCase();
  let best = ACTION_IMAGES_CATALOG[0];
  let maxScore = -1;

  for (const item of ACTION_IMAGES_CATALOG) {
    let score = 0;
    for (const kw of item.keywords) {
      if (combined.includes(kw.toLowerCase())) {
        score += 2;
      }
    }
    if (score > maxScore) {
      maxScore = score;
      best = item;
    }
  }

  return {
    url: best.url,
    description: best.description,
    matchedKeywords: best.keywords,
  };
}
