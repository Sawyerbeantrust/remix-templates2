import { z } from "zod";

/**
 * Zod validation schemas for server API endpoints
 */

export const UploadImageSchema = z.object({
  name: z.string().max(150).optional(),
  data: z.string().min(10).optional(),
  image: z.string().min(10).optional(),
}).refine((data) => Boolean(data.data || data.image), {
  message: "Either 'data' or 'image' base64 payload is required",
});

export const DeleteImageSchema = z.object({
  id: z.union([z.number(), z.string()]).optional(),
  url: z.string().optional(),
  path: z.string().optional(),
}).refine((data) => Boolean(data.id || data.url || data.path), {
  message: "Asset ID, url, or path is required for deletion",
});

export const SendInquirySchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters").max(120).optional(),
  name: z.string().min(2, "Name must be at least 2 characters").max(120).optional(),
  email: z.string().email("Please provide a valid email address"),
  phone: z.string().min(6, "Please provide a valid phone number").max(40),
  address: z.string().max(250).optional(),
  suburb: z.string().max(100).optional(),
  province: z.string().max(100).optional(),
  deliveryPreference: z.string().max(50).optional(),
  equipment: z.string().max(300).optional(),
  message: z.string().max(3000).optional(),
  cartItems: z.array(z.any()).optional(),
}).refine((data) => Boolean(data.fullName || data.name), {
  message: "Customer name is required",
});

export const GenerateEmailSchema = z.object({
  name: z.string().max(120).optional(),
  customerName: z.string().max(120).optional(),
  email: z.string().email().optional(),
  customerEmail: z.string().email().optional(),
  phone: z.string().max(40).optional(),
  equipment: z.string().max(300).optional(),
  message: z.string().max(3000).optional(),
  location: z.string().max(150).optional(),
});

export const SeoHealthSchema = z.object({
  siteUrl: z.string().url().optional(),
  pageTitle: z.string().max(200).optional(),
  metaDescription: z.string().max(500).optional(),
  productsCount: z.number().nonnegative().optional(),
  categoriesCount: z.number().nonnegative().optional(),
  sampleProducts: z.array(z.any()).optional(),
});
