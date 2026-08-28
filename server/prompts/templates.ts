/**
 * Centralized Prompt Templates for Gemini AI Services
 */

export function buildSimulateImagePrompt(
  name: string,
  category: string,
  description?: string,
  specifications?: any
): string {
  return `You are a visual director for an industrial automotive workshop and car lift manufacturer showroom.
Given the product details below, provide:
1. "visualPrompt": A descriptive, photorealistic scenario prompt describing the machine installed in a clean, high-end South African automotive workshop or dealership bay.
2. "actionDescription": A compelling 2-sentence marketing description highlighting its robust steel construction, hydraulic reliability, and safety standards.
3. "matchedCategory": Best category classification (one of: "car-lift", "spray-booth", "wheel-care", "welding", "workshop").

Product Name: ${name}
Category: ${category}
Description: ${description || "Industrial automotive workshop machinery"}
Specs: ${JSON.stringify(specifications || {})}

Return STRICT JSON only matching this format:
{
  "visualPrompt": "string",
  "actionDescription": "string",
  "matchedCategory": "string"
}`;
}

export function buildSeoPrompt(
  name: string,
  category: string,
  currentDesc?: string,
  currentSeo?: any,
  specs?: any
): string {
  return `You are an elite SEO strategist specializing in South African automotive workshop machinery, two-post car lifts, spray booths, and industrial equipment.
Generate high-converting, Google-optimized SEO metadata and rich descriptions for this product.

Product Name: ${name}
Category: ${category}
Current Description: ${currentDesc || "None"}
Current SEO: ${JSON.stringify(currentSeo || {})}
Specifications: ${JSON.stringify(specs || {})}

Target Market: South Africa (Johannesburg, Cape Town, Durban, Pretoria, nationwide delivery, RMI/CE certified).

Return STRICT JSON only matching this schema:
{
  "metaTitle": "string (50-60 characters, include brand/model and key search terms)",
  "metaDescription": "string (150-160 characters, persuasive call to action, warranty, delivery)",
  "focusKeywords": ["string", "string", "string", "string", "string"],
  "h1Tag": "string",
  "enhancedDescription": "string (2-3 detailed, technical paragraphs with benefits and features)",
  "faqs": [
    { "question": "string", "answer": "string" },
    { "question": "string", "answer": "string" }
  ]
}`;
}

export function buildGlobalSeoPrompt(
  storeName: string,
  targetAudience: string,
  primaryKeywords: string,
  location: string,
  catalogSummary: string
): string {
  return `You are a master SEO architect. Generate a comprehensive sitewide SEO strategy and meta payload for:

Store: ${storeName || "Triton Car Lifts & Automotive Equipment"}
Target Audience: ${targetAudience || "South African auto repair workshops, panel beaters, dealerships, tyre shops"}
Primary Keywords: ${primaryKeywords || "car lifts south africa, 2 post lift, 4 post lift, spray booths, automotive tools"}
Location Focus: ${location || "South Africa (Gauteng, Western Cape, KZN, Free State)"}
Catalog Overview: ${catalogSummary}

Return STRICT JSON only:
{
  "globalTitle": "string (max 65 chars)",
  "globalMetaDescription": "string (max 160 chars)",
  "siteKeywords": ["string", "string", "string", "string", "string", "string"],
  "ogTitle": "string",
  "ogDescription": "string",
  "recommendedCategories": ["string", "string", "string"],
  "schemaOrgSnippet": {
    "@context": "https://schema.org",
    "@type": "AutoEquipmentStore",
    "name": "Triton Equipment",
    "description": "string",
    "areaServed": "ZA"
  }
}`;
}

export function buildEmailPrompt(
  customerName: string,
  customerEmail: string,
  customerPhone?: string,
  company?: string,
  inquiryType?: string,
  message?: string,
  cartItems?: any[],
  totalAmount?: number
): string {
  return `You are a senior sales manager at Triton Car Lifts & Automotive Equipment (car-lifts.co.za).
Draft a professional, courteous, and detailed formal quotation/inquiry response email to a client.

Customer Name: ${customerName}
Customer Email: ${customerEmail}
Phone: ${customerPhone || "Not provided"}
Company: ${company || "Not provided"}
Inquiry Type: ${inquiryType || "Equipment Quotation"}
Message: ${message || "Interested in equipment and delivery terms"}
Items In Cart: ${JSON.stringify(cartItems || [])}
Estimated Total: ${totalAmount ? `R ${totalAmount.toLocaleString()}` : "To be calculated"}

Return STRICT JSON only:
{
  "subject": "string",
  "bodyHtml": "string (clean, modern HTML email with professional header, item breakdown, warranty info, payment terms, and sales contact signature)",
  "bodyText": "string (plain text fallback)"
}`;
}

export function buildSeoHealthPrompt(
  siteUrl: string,
  pageTitle: string,
  metaDesc: string,
  productsCount: number,
  categoriesCount: number,
  sampleProducts: any[]
): string {
  return `Analyze the technical and commercial SEO health of this automotive equipment e-commerce catalog:

Site: ${siteUrl}
Title: ${pageTitle}
Meta Description: ${metaDesc}
Total Products: ${productsCount}
Total Categories: ${categoriesCount}
Sample Products: ${JSON.stringify(sampleProducts)}

Evaluate on a scale of 0-100 and provide actionable technical fixes.
Return STRICT JSON:
{
  "score": 85,
  "status": "Good" | "Needs Improvement" | "Critical",
  "summary": "string",
  "strengths": ["string", "string"],
  "issues": [
    { "severity": "high" | "medium" | "low", "title": "string", "recommendation": "string" }
  ],
  "keywordOpportunities": ["string", "string", "string"]
}`;
}

export function buildCategoryAuditPrompt(
  categoryName: string,
  categoryDesc: string,
  productCount: number,
  sampleProducts: any[]
): string {
  return `Perform an SEO and content audit for this specific automotive equipment product category:

Category Name: ${categoryName}
Current Description: ${categoryDesc || "None"}
Products Count: ${productCount}
Sample Products in Category: ${JSON.stringify(sampleProducts)}

Return STRICT JSON:
{
  "categoryScore": 88,
  "optimizedTitle": "string",
  "optimizedDescription": "string",
  "metaKeywords": ["string", "string", "string"],
  "commercialIntent": "high" | "medium" | "low",
  "topBuyerQuestions": [
    { "question": "string", "suggestedAnswer": "string" }
  ],
  "suggestedRelatedKeywords": ["string", "string"]
}`;
}

export const TRITON_ASSISTANT_SYSTEM_PROMPT = `You are Triton Assistant, the official AI technical specialist for Triton Car Lifts & Automotive Equipment (store.car-lifts.co.za).
Physical Address: Unit 4, 13 Killarney Avenue, Killarney Gardens, Cape Town, 7441.
You assist South African auto mechanics, panel beaters, tyre shop owners, and fleet managers with equipment specifications, ceiling height requirements, concrete slab thickness, hydraulic fluid specifications (ISO 46), single vs 3-phase power, CE certifications, and quotation assistance.
Always provide helpful, precise, technical, and commercial guidance in South African Rand (ZAR) context.`;
