import { z } from "zod";

/**
 * Base validation schemas used across API endpoints
 * Provides strict type checking and error messages for incoming requests
 */

// ============ IMAGE UPLOAD VALIDATION ============

export const UploadImageSchema = z.object({
  name: z.string().max(200).optional(),
  data: z.string().refine(
    (val) => !val || val.startsWith("data:") || Buffer.from(val, "base64").length > 0,
    "Must be valid base64 or data URI"
  ).optional(),
  image: z.string().refine(
    (val) => !val || val.startsWith("data:") || Buffer.from(val, "base64").length > 0,
    "Must be valid base64 or data URI"
  ).optional(),
}).refine(
  (obj) => Boolean(obj.data || obj.image),
  "Either 'data' or 'image' field is required"
);

export const SaveCategoryImageSchema = UploadImageSchema;

// ============ IMAGE DELETION VALIDATION ============

export const DeleteImageSchema = z.object({
  id: z.union([z.number(), z.string().regex(/^\d+$/)]).transform(Number).optional(),
  url: z.string().url().optional(),
  path: z.string().optional(),
}).refine(
  (obj) => Boolean(obj.id || obj.url || obj.path),
  "At least one of 'id', 'url', or 'path' is required"
);

// ============ EMAIL GENERATION VALIDATION ============

export const GenerateEmailSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  customerName: z.string().min(2).max(100).optional(),
  email: z.string().email("Invalid email address").optional(),
  customerEmail: z.string().email("Invalid email address").optional(),
  phone: z.string().regex(/^[\d\s\-+()]{6,}$/, "Invalid phone number format").optional(),
  equipment: z.string().max(500).optional(),
  message: z.string().max(3000).optional(),
  location: z.string().max(200).optional(),
}).refine(
  (obj) => Boolean(obj.name || obj.customerName || obj.email || obj.customerEmail),
  "Customer contact information (name or email) is required"
);

// ============ INQUIRY SUBMISSION VALIDATION ============

export const SendInquirySchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  name: z.string().min(2).max(100).optional(),
  email: z.string().email("Invalid email address"),
  phone: z.string().regex(/^[\d\s\-+()]{6,}$/, "Invalid phone number"),
  address: z.string().max(500).optional(),
  suburb: z.string().max(100).optional(),
  province: z.string().max(100).optional(),
  deliveryPreference: z.string().max(50).optional(),
  cartItems: z.array(
    z.object({
      product: z.object({
        id: z.string().or(z.number()).optional(),
        name: z.string().optional(),
      }).passthrough().optional(),
      quantity: z.number().int().positive().optional(),
    }).passthrough()
  ).optional(),
  message: z.string().max(3000).optional(),
  equipment: z.string().max(500).optional(),
}).refine(
  (obj) => Boolean(obj.fullName || obj.name),
  "Either 'fullName' or 'name' is required"
);

// ============ SIMULATE IMAGE VALIDATION ============

export const SimulateImageRequestSchema = z.object({
  name: z.string().min(2, "Product name is required").max(200, "Product name too long"),
  description: z.string().max(2000).optional(),
  category: z.string().max(100).optional(),
  specifications: z.record(z.string(), z.any()).optional(),
});

// ============ SEO GENERATION VALIDATION ============

export const GenerateSeoSchema = z.object({
  name: z.string().min(2, "Product name is required").max(200),
  category: z.string().max(100).optional(),
  currentDescription: z.string().max(3000).optional(),
  currentSeo: z.object({
    metaTitle: z.string().optional(),
    metaDescription: z.string().optional(),
    focusKeywords: z.array(z.string()).optional(),
  }).optional(),
  specifications: z.record(z.string(), z.any()).optional(),
});

export const GenerateGlobalSeoSchema = z.object({
  storeName: z.string().min(2).max(200).optional(),
  targetAudience: z.string().max(500).optional(),
  primaryKeywords: z.array(z.string()).optional(),
  location: z.string().max(100).optional(),
  catalogSummary: z.string().max(3000).optional(),
});

export const SeoHealthSchema = z.object({
  siteUrl: z.string().url().optional().or(z.string().max(200).optional()),
  pageTitle: z.string().max(200).optional(),
  metaDescription: z.string().max(500).optional(),
  productsCount: z.number().int().nonnegative().optional(),
  categoriesCount: z.number().int().nonnegative().optional(),
  sampleProducts: z.array(z.any()).optional(),
});

export const CategoryAuditSchema = z.object({
  categoryName: z.string().min(2, "Category name is required").max(200),
  categoryDescription: z.string().max(3000).optional(),
  productCount: z.number().int().nonnegative().optional(),
  sampleProducts: z.array(z.any()).optional(),
});

// ============ ASSISTANT CHAT VALIDATION ============

export const AssistantChatSchema = z.object({
  message: z.string().min(1, "Message is required").max(3000, "Message must be under 3000 characters"),
  history: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      text: z.string(),
    })
  ).optional(),
});

// ============ CATALOG MANAGEMENT VALIDATION ============

export const UpdateCatalogSchema = z.object({
  products: z.array(z.any()).optional(),
  featuredCategories: z.array(z.any()).optional(),
  categoriesList: z.array(z.string()).optional(),
  maintenanceMode: z.boolean().optional(),
});

export const UpdateSeoFilesSchema = z.object({
  sitemapXml: z.string().optional(),
  robotsTxt: z.string().optional(),
});

// ============ TYPE EXPORTS ============

export type UploadImageRequest = z.infer<typeof UploadImageSchema>;
export type DeleteImageRequest = z.infer<typeof DeleteImageSchema>;
export type SendInquiryRequest = z.infer<typeof SendInquirySchema>;
export type GenerateEmailRequest = z.infer<typeof GenerateEmailSchema>;
export type SimulateImageRequest = z.infer<typeof SimulateImageRequestSchema>;
export type GenerateSeoRequest = z.infer<typeof GenerateSeoSchema>;
export type GenerateGlobalSeoRequest = z.infer<typeof GenerateGlobalSeoSchema>;
export type SeoHealthRequest = z.infer<typeof SeoHealthSchema>;
export type CategoryAuditRequest = z.infer<typeof CategoryAuditSchema>;
export type AssistantChatRequest = z.infer<typeof AssistantChatSchema>;
export type UpdateCatalogRequest = z.infer<typeof UpdateCatalogSchema>;
export type UpdateSeoFilesRequest = z.infer<typeof UpdateSeoFilesSchema>;
