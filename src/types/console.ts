import { Product, FeaturedCategory } from './index.js';

export type ConsoleTabType =
  | 'sync'
  | 'products'
  | 'seo'
  | 'categories'
  | 'shortcodes'
  | 'config'
  | 'logs'
  | 'tools'
  | 'admin'
  | 'assets'
  | 'media'
  | 'import_export'
  | 'errors';

export interface WordPressConsoleProps {
  isFullPage?: boolean;
  onBackToShop?: () => void;
  products?: Product[];
  onProductsChange?: (newProducts: Product[]) => void;
  featuredCategories?: FeaturedCategory[];
  onFeaturedCategoriesChange?: (newCats: FeaturedCategory[]) => void;
  theme?: 'triton' | 'inospace';
  onThemeChange?: (newTheme: 'triton' | 'inospace') => void;
  globalSeoTitle?: string;
  onGlobalSeoTitleChange?: (val: string) => void;
  globalSeoDescription?: string;
  onGlobalSeoDescriptionChange?: (val: string) => void;
  onCategoryClick?: (catName: string) => void;
  maintenanceMode?: boolean;
  onMaintenanceModeChange?: (active: boolean) => void;
}

export interface ProjectAssetImage {
  path: string;
  label: string;
  category: string;
  isCustom?: boolean;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
}

export interface ErrorLogItem {
  id: string;
  timestamp: string;
  error: string;
  context?: string;
  stack?: string;
  category?: string;
}

export interface MigrationSummaryData {
  uploaded: number;
  replaced: number;
  map: Record<string, string>;
}

export interface CompetitiveKeyword {
  keyword: string;
  volume: string;
  difficulty: 'Low' | 'Medium' | 'High';
  cpc: string;
  intent: string;
}

export interface CategoryAuditResult {
  categoryScore: number;
  optimizedTitle: string;
  optimizedDescription: string;
  metaKeywords: string[];
  commercialIntent: string;
  topBuyerQuestions: { question: string; suggestedAnswer: string }[];
  suggestedRelatedKeywords: string[];
}

export interface SeoHealthResult {
  score: number;
  status: string;
  summary: string;
  strengths: string[];
  issues: { severity: 'low' | 'medium' | 'high'; title: string; recommendation: string }[];
  keywordOpportunities: string[];
}
