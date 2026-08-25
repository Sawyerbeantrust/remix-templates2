export interface Product {
  id: string;
  name: string;
  description: string;
  longDescription?: string;
  category: string;
  price: number; // in ZAR Rands
  image: string;
  images?: string[];
  specifications: Record<string, string>;
  features: string[];
  inStock: boolean;
  modelCode: string;
  rating: number;
  status?: 'publish' | 'draft';
  dateCreated?: string;
  sortOrder?: number;
  seoTitle?: string;
  seoDescription?: string;
  seoFocusKeyword?: string;
  seoScore?: number;
  badgeType?: 'instock' | 'backorder' | 'leadtime_24_48' | 'leadtime_custom';
  leadTimeValue?: string;
  rawCategoryName?: string;
  productType?: 'simple' | 'grouped' | 'variable' | 'external';
  linkedSkuString?: string;
  parentSku?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface InquiryFormData {
  fullName: string;
  email: string;
  phone: string;
  companyName: string;
  location: string;
  voltagePreference: '380V (Three-Phase)' | '220V (Single-Phase)';
  ceilingHeight: string;
  equipmentInterest: string[];
  message: string;
  installationRequired: boolean;
  financingRequired: boolean;
}

export interface SEOKeywordMetric {
  keyword: string;
  volume: string;
  difficulty: 'Low' | 'Medium' | 'High';
  relevance: 'Primary' | 'Secondary';
  currentRank: string;
}

export interface ElementorBlock {
  id: string;
  type: 'hero' | 'header' | 'features-grid' | 'product-highlight' | 'contact-cta' | 'footer';
  title: string;
  subtitle?: string;
  backgroundColor: string;
  textColor: string;
  padding: number; // in px
  margin: number; // in px
  layout: 'centered' | 'split-left' | 'split-right';
}

export interface FeaturedCategory {
  id: string;
  name: string;
  count: string;
  img: string;
  status?: 'publish' | 'draft';
  seoTitle?: string;
  seoDescription?: string;
}

export interface CatalogData {
  products?: Product[];
  featuredCategories?: FeaturedCategory[];
  categoriesList?: string[];
  maintenanceMode?: boolean;
}

