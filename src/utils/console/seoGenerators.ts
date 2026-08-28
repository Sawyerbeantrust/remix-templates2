import { CompetitiveKeyword } from '../../types/console.js';
import { Product } from '../../types/index.js';

export const SOUTH_AFRICAN_COMPETITIVE_KEYWORDS: Record<string, CompetitiveKeyword[]> = {
  'car-lift': [
    { keyword: "2 post car lift price south africa", volume: "1,200/mo", difficulty: "Medium", cpc: "R12.50", intent: "Transactional" },
    { keyword: "4 post vehicle lift johannesburg", volume: "750/mo", difficulty: "High", cpc: "R16.80", intent: "Transactional" },
    { keyword: "hydraulic car hoist suppliers SA", volume: "620/mo", difficulty: "Low", cpc: "R9.40", intent: "Commercial" },
    { keyword: "scissor lift prices durban", volume: "480/mo", difficulty: "Low", cpc: "R8.20", intent: "Commercial" },
    { keyword: "portable vehicle hoist cape town", volume: "350/mo", difficulty: "Low", cpc: "R11.10", intent: "Commercial" }
  ],
  'spray-booth': [
    { keyword: "spray booth for sale south africa", volume: "950/mo", difficulty: "High", cpc: "R21.40", intent: "Transactional" },
    { keyword: "automotive spray booth price", volume: "820/mo", difficulty: "Medium", cpc: "R17.50", intent: "Transactional" },
    { keyword: "downdraft paint booth suppliers", volume: "380/mo", difficulty: "Low", cpc: "R14.20", intent: "Commercial" },
    { keyword: "industrial spray booths johannesburg", volume: "510/mo", difficulty: "Medium", cpc: "R19.80", intent: "Commercial" }
  ],
  'welder': [
    { keyword: "mig welder price south africa", volume: "1,400/mo", difficulty: "Medium", cpc: "R8.50", intent: "Transactional" },
    { keyword: "professional inverter welder SA", volume: "920/mo", difficulty: "Low", cpc: "R6.80", intent: "Commercial" },
    { keyword: "co2 welding machine price", volume: "780/mo", difficulty: "Medium", cpc: "R11.20", intent: "Transactional" },
    { keyword: "spot welder suppliers johannesburg", volume: "310/mo", difficulty: "Low", cpc: "R9.90", intent: "Commercial" }
  ],
  'default': [
    { keyword: "automotive workshop equipment south africa", volume: "1,800/mo", difficulty: "Medium", cpc: "R15.50", intent: "Commercial" },
    { keyword: "garage equipment suppliers SA", volume: "1,100/mo", difficulty: "High", cpc: "R18.20", intent: "Commercial" },
    { keyword: "wheel alignment machine price", volume: "670/mo", difficulty: "Medium", cpc: "R14.30", intent: "Transactional" },
    { keyword: "tyre changer and wheel balancer combo", volume: "540/mo", difficulty: "Low", cpc: "R12.10", intent: "Transactional" },
    { keyword: "heavy duty truck hoists", volume: "420/mo", difficulty: "Low", cpc: "R13.40", intent: "Commercial" }
  ]
};

export const calculateSeoScore = (
  title?: string,
  description?: string,
  focusKeyword?: string,
  productName?: string
): number => {
  let score = 30; // base score
  if (title && title.length >= 30 && title.length <= 65) score += 25;
  else if (title && title.length > 0) score += 10;

  if (description && description.length >= 80 && description.length <= 160) score += 25;
  else if (description && description.length > 0) score += 10;

  if (focusKeyword && focusKeyword.trim().length > 2) {
    score += 10;
    if (title && title.toLowerCase().includes(focusKeyword.toLowerCase())) score += 5;
    if (description && description.toLowerCase().includes(focusKeyword.toLowerCase())) score += 5;
  }

  return Math.min(100, score);
};

export const generateSchemaOrg = (
  product: Product,
  storeName: string = "Triton Automotive Equipment South Africa",
  reviewsCount: number = 18,
  stockStatus: 'instock' | 'outofstock' = 'instock'
): object => {
  return {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": product.name,
    "image": [product.image, ...(product.images || [])],
    "description": product.seoDescription || product.description,
    "sku": product.modelCode || product.id,
    "brand": {
      "@type": "Brand",
      "name": "Triton"
    },
    "offers": {
      "@type": "Offer",
      "url": `https://car-lifts.co.za/?product=${product.id}`,
      "priceCurrency": "ZAR",
      "price": product.price,
      "availability": stockStatus === 'instock' ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "seller": {
        "@type": "Organization",
        "name": storeName
      }
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": product.rating || "4.9",
      "reviewCount": reviewsCount
    }
  };
};
