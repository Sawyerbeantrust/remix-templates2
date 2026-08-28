export interface Product {
  id: string;
  name: string;
  category: string;
  image: string;
  images?: string[];
  modelCode?: string;
  sku?: string;
  price?: number;
  description?: string;
  specifications?: Record<string, any>;
  [key: string]: any;
}

export interface FeaturedCategory {
  id: string;
  name: string;
  count: string;
  img: string;
}

export interface CatalogData {
  products: Product[];
  featuredCategories: FeaturedCategory[];
  categoriesList: string[];
  maintenanceMode: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
  status?: number;
  [key: string]: any;
}

export interface WpMediaItem {
  id: number;
  date?: string;
  slug?: string;
  source_url?: string;
  link?: string;
  title?: { rendered?: string };
  guid?: { rendered?: string };
  media_details?: {
    filesize?: number;
    width?: number;
    height?: number;
    sizes?: Record<string, { source_url: string; width: number; height: number }>;
  };
}

export interface SafeWpResult {
  ok: boolean;
  status: number;
  data: any;
  text: string;
  error?: string;
  contentType?: string;
}
