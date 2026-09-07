import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { logger } from "../utils/logger.js";
import { CONFIG } from "../config.js";
import {
  buildSimulateImagePrompt,
  buildSeoPrompt,
  buildLongDescriptionPrompt,
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

export const LongDescriptionSchema = z.object({
  longDescription: z.string().min(40),
  summary: z.string().optional(),
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
    geminiClientInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
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
  const primaryModel = options.primaryModel || CONFIG.GEMINI_MODELS.primary;
  const fallbackModels = Array.from(
    new Set([primaryModel, ...CONFIG.GEMINI_MODELS.fallbacks, "gemini-3.8-flash", "gemini-2.5-flash", "gemini-flash-latest"])
  );
  aiTelemetry.totalRequests++;

  let lastError: any = null;

  for (const model of fallbackModels) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Gemini timeout after 6000ms calling model ${model}`)), 6000)
        );
        const response = (await Promise.race([
          ai.models.generateContent({
            model,
            contents: options.contents,
            config: options.config,
          }),
          timeoutPromise,
        ])) as any;
        aiTelemetry.successfulAiResponses++;
        return response;
      } catch (err: any) {
        lastError = err;
        if (isQuotaOrBillingError(err)) {
          aiTelemetry.quotaErrors++;
          aiTelemetry.fallbacksTriggered++;
          logger.warn({ model, err: err?.message }, "Gemini quota or billing limit reached. Triggering local matchmaker fallback.");
          throw err;
        }

        const isNotFound = String(err?.message || "").includes("404") || String(err?.message || "").includes("NOT_FOUND");
        if (isNotFound) {
          logger.warn({ model, err: err?.message }, "Model not found or deprecated, trying fallback model...");
          break; // Try next model in fallbackModels
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
          break; // Try next model in fallback list
        }
      }
    }
  }

  aiTelemetry.fallbacksTriggered++;
  logger.warn({ primaryModel, err: lastError?.message }, "Gemini call failed. Triggering local fallback.");
  throw lastError || new Error("Gemini generateContent failed after retries");
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

/**
 * High-quality deterministic long description generator for offline/fallback use
 */
export function generateDeterministicLongDescription(options: {
  name: string;
  category?: string;
  modelCode?: string;
  price?: number;
  description?: string;
  features?: string[];
  specifications?: Record<string, string>;
}): { longDescription: string; summary: string } {
  const { name, category = "Automotive Machinery", modelCode = "", price, description = "", features = [], specifications = {} } = options;

  const priceStr = price ? `R ${price.toLocaleString()}` : "Trade Price Available Upon Inquiry";
  const modelStr = modelCode ? ` (Model: ${modelCode})` : "";
  const categoryLower = (category || "").toLowerCase();

  const isLift = categoryLower.includes("lift") || categoryLower.includes("hoist");
  const isSprayBooth = categoryLower.includes("spray") || categoryLower.includes("booth");
  const isWelder = categoryLower.includes("weld");
  const isWheel = categoryLower.includes("wheel") || categoryLower.includes("tire") || categoryLower.includes("tyre") || categoryLower.includes("balancer");

  let domainOverview = "";
  let operationalHighlights: string[] = [];

  if (isLift) {
    domainOverview = `Engineered specifically for heavy-throughput commercial automotive service bays, the ${name}${modelStr} sets the professional standard for vehicle elevation, undercarriage inspections, gearbox swaps, and suspension servicing. Built with high-tensile structural steel columns, synchronized dual hydraulic cylinders, and high-strength equalizing wire ropes, this lift ensures consistent, vibration-free lifting even under maximum rated loads.`;
    operationalHighlights = [
      `<strong>Dual Direct-Drive Hydraulic Cylinders:</strong> Engineered for silky-smooth lifting dynamics, minimized mechanical wear, and whisper-quiet operation during daily continuous shop cycles.`,
      `<strong>Automatic Mechanical Locking Ladders:</strong> Integrated fail-safe locking dogs at short increments guarantee complete technician security with zero drift under sustained elevation.`,
      `<strong>Versatile Arm Configurations:</strong> Telescoping symmetric/asymmetric support arms with low-profile drop-in pads accommodate low-clearance performance sedans through to high-axle 4x4 commercial bakkies.`,
      `<strong>Overload Pressure Relief Bypass:</strong> Built-in hydraulic bypass valve shields the pump motor and hydraulic pack from unintentional overload damage.`,
    ];
  } else if (isSprayBooth) {
    domainOverview = `The ${name}${modelStr} provides automotive refinishing workshops and panel beaters with a controlled, dust-free paint curing environment engineered to deliver factory-level glass finishes. Featuring pressurized downdraft airflow, multi-stage ceiling filter media, and high-efficiency thermal heat-exchange burners, this booth eliminates overspray turbulence while accelerating cycle turnover times.`;
    operationalHighlights = [
      `<strong>High-CFM Centrifugal Turbo Fans:</strong> Deliver balanced, laminar air displacement across the entire vehicle envelope, ensuring complete evacuation of solvent fumes.`,
      `<strong>Multi-Tier Filter Array:</strong> Combines pre-filtration mats, sub-micron ceiling diffusion pads, and high-absorption floor exhaust fiberglass filters for pristine finishes.`,
      `<strong>Precision Digital Microprocessor Console:</strong> Intuitive bake-and-spray cycles with programmable temperature ramps, safety interlocks, and automatic burner shutdown.`,
      `<strong>Explosion-Proof LED Light Enclosures:</strong> Day-balanced shadow-free illumination across roof and side walls to reveal precise color match nuances and metallic flakes.`,
    ];
  } else if (isWelder) {
    domainOverview = `The ${name}${modelStr} is a high-duty cycle, precision inverter welding workstation designed for fabrication plants, exhaust shops, and heavy structural collision repair. Equipped with advanced IGBT inverter modules, arc stability processors, and synergic wire speed controls, it delivers clean, spatter-free welds across carbon steel, stainless alloys, and lightweight automotive aluminum.`;
    operationalHighlights = [
      `<strong>Advanced IGBT Inverter Topology:</strong> High electrical conversion efficiency with immediate arc strike and dynamic molten puddle viscosity control.`,
      `<strong>Gas & Gasless Flux-Core Versatility:</strong> Seamlessly transitions between shielding gas applications for showroom-grade cosmetic seams and rugged outdoor flux-cored jobs.`,
      `<strong>Integrated Thermal Overload & Undervoltage Protection:</strong> Intelligent sensors safeguard electrical components against South African power grid fluctuations and thermal peaks.`,
      `<strong>Heavy-Duty Euro-Connect Torch & Brass Grounding Clamps:</strong> Industrial-grade consumables crafted for ergonomic operator grip and continuous duty cycles.`,
    ];
  } else if (isWheel) {
    domainOverview = `Designed for high-volume tyre fitment bays and high-end wheel refurbishment workshops, the ${name}${modelStr} pairs rapid mechanical turnaround with micron-precise calibration. Its rugged chassis resists structural deflection when mounting stiff, low-profile run-flat tyres, while automated distance sonar and laser balance pointers ensure vibration-free customer ride comfort.`;
    operationalHighlights = [
      `<strong>High-Torque Pneumatic Clamping Turntable:</strong> Hardened steel jaws lock rims securely without scuffing premium alloy clear coats or bead edges.`,
      `<strong>Pneumatic Assist Helper Arms:</strong> Effortlessly depresses stiff sidewalls and bead humps on oversized SUV and low-profile sports tyres without tyre lever fatigue.`,
      `<strong>Micro-Precision Dynamic & Static Balancing:</strong> Laser plane guidance automatically pinpoints the exact hidden clip-on or adhesive tape weight placement.`,
      `<strong>Rugged Industrial Grade Air Regulator & Oiler:</strong> Moisture-separator assembly ensures clean, lubricated pneumatic air supply for long valve and seal longevity.`,
    ];
  } else {
    domainOverview = `The ${name}${modelStr} is an industrial-grade workshop machine manufactured to exacting standards for automotive service centers, fabrication bays, and industrial maintenance facilities across Southern Africa. Engineered using heavy-gauge reinforced steel and commercial-grade mechanical components, this unit maximizes workshop throughput while maintaining safety.`;
    operationalHighlights = [
      `<strong>Reinforced Commercial Construction:</strong> High-tensile steel framing and powder-coated enamel resist aggressive workshop chemicals, brake fluid, and daily impact.`,
      `<strong>Ergonomic Operator Controls:</strong> Intuitive controls reduce technician fatigue and improve precision during repetitive maintenance tasks.`,
      `<strong>Industrial Power System:</strong> Designed to operate efficiently on standard workshop power connections with integrated overload thermal protection.`,
      `<strong>Low-Maintenance Architecture:</strong> Readily serviceable wear points and sealed maintenance-free bearings maximize equipment uptime.`,
    ];
  }

  // Incorporate existing features if provided
  if (features.length > 0) {
    for (const f of features.slice(0, 3)) {
      operationalHighlights.push(`<strong>Commercial Capability:</strong> ${f}`);
    }
  }

  // Specifications summary bullets
  const specKeys = Object.keys(specifications);
  let specsHtml = "";
  if (specKeys.length > 0) {
    const specItems = specKeys.slice(0, 6).map(k => `<li><strong>${k}:</strong> ${specifications[k]}</li>`).join("\n    ");
    specsHtml = `
  <h3>Operational Specifications & Technical Ratings</h3>
  <ul>
    ${specItems}
  </ul>`;
  }

  const longDescription = `
  <h3>Engineering Architecture & Commercial Overview</h3>
  <p>${domainOverview}</p>
  <p>${description || `The ${name} is engineered to elevate productivity, reduce operator cycle times, and meet stringent occupational health and safety benchmarks across South Africa. Every structural component undergoes rigorous static and dynamic load testing prior to factory dispatch.`}</p>

  <h3>Key Structural & Operational Advantages</h3>
  <ul>
    ${operationalHighlights.map(h => `<li>${h}</li>`).join("\n    ")}
  </ul>
${specsHtml}
  <h3>Built for Demanding South African Workshop Environments</h3>
  <p>All Triton automotive equipment is designed and tested to withstand high ambient workshop temperatures and intensive daily operation. Structural metalwork receives a specialized electrostatic powder-coated finish that resists oil, solvent corrosion, and chipping. Power units are calibrated to ensure reliable continuous performance on South African single-phase (220V/50Hz) or three-phase (380V/50Hz) electrical connections.</p>

  <h3>Warranty, Spares & Triton Certified Support</h3>
  <p>Your investment is backed by Triton's comprehensive <strong>3-Year Structural Warranty</strong> and a 1-Year warranty on electrical and hydraulic power packs. Triton maintains a fully stocked central warehouse with genuine replacement seals, cables, valves, and switches in Gauteng and the Western Cape, guaranteeing rapid nationwide parts delivery and dedicated technical assistance.</p>
`.trim();

  const summary = `${name} (${priceStr}) engineered for commercial automotive workshops, featuring high-duty cycle reliability, CE compliance, and nationwide Triton service backing.`;

  return { longDescription, summary };
}

