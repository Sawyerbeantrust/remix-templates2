import { Product, FeaturedCategory } from '../types';
import { safeLocalStorage } from './safeStorage';
import { autoSyncCatalogImages } from './imageUpload';

export const DEFAULT_CATEGORIES_LIST = [
  'automotive-spray-booths',
  'car-lifts',
  'mig-welders-direct',
  'budget-infrared-heaters',
  'bus-spray-booths',
  'chassis-straightener',
  'filter-media',
  'telescopic-ladders',
  's-a-parking-storage-lifts',
  '20-ton-bus-lifts',
  'hydraulic-oil-46gr-10-litres',
  'forklift-loading-ramps',
  'parking-lifts'
];

export function getStoredCategoriesList(): string[] {
  const saved = safeLocalStorage.getItem('triton_categories_list_v2');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) {}
  }
  return DEFAULT_CATEGORIES_LIST;
}

function hasUnpersistedImages(products: Product[], featuredCategories: FeaturedCategory[]): boolean {
  for (const p of products) {
    if (p.image && typeof p.image === 'string' && (p.image.startsWith('data:image') || p.image.startsWith('blob:'))) return true;
    if (Array.isArray(p.images)) {
      for (const img of p.images) {
        if (img && typeof img === 'string' && (img.startsWith('data:image') || img.startsWith('blob:'))) return true;
      }
    }
  }
  for (const c of featuredCategories) {
    if (c.img && typeof c.img === 'string' && (c.img.startsWith('data:image') || c.img.startsWith('blob:'))) return true;
  }
  return false;
}

export async function syncCatalogToServer(
  products: Product[],
  featuredCategories: FeaturedCategory[],
  categoriesList?: string[],
  maintenanceMode?: boolean
): Promise<boolean> {
  try {
    // Auto-sync any remaining base64/blob images to WordPress Media before sending catalog
    const { sanitizedProducts, sanitizedCategories } = await autoSyncCatalogImages(
      products,
      featuredCategories
    );

    if (hasUnpersistedImages(sanitizedProducts, sanitizedCategories)) {
      console.error('[Catalog Save] Aborted: unpersisted base64/blob images remain in catalog.');
      return false;
    }

    const catsList = categoriesList && categoriesList.length > 0 ? categoriesList : getStoredCategoriesList();
    const isMaintenance = typeof maintenanceMode === 'boolean' 
      ? maintenanceMode 
      : safeLocalStorage.getItem('triton_maintenance_mode') === 'true';

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const cfSecret = (import.meta as any).env?.VITE_CF_BYPASS_SECRET;
    if (cfSecret) {
      headers['X-Vercel-Secret'] = cfSecret;
    }

    const response = await fetch('/api/catalog', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        products: sanitizedProducts,
        featuredCategories: sanitizedCategories,
        categoriesList: catsList,
        maintenanceMode: isMaintenance
      })
    });
    const data = await response.json();
    if (data && data.success) {
      console.log('✅ [Catalog Sync] Successfully saved catalog state to server.');
      return true;
    } else {
      console.warn('⚠️ [Catalog Sync] Server catalog save response:', data);
      return false;
    }
  } catch (err: any) {
    console.error('⚠️ [Catalog Sync] Error saving catalog to server:', err?.message || err);
    return false;
  }
}

export async function fetchServerCatalog(): Promise<{
  products?: Product[];
  featuredCategories?: FeaturedCategory[];
  categoriesList?: string[];
  maintenanceMode?: boolean;
} | null> {
  try {
    const response = await fetch('/api/catalog');
    if (!response.ok) return null;
    const data = await response.json();
    if (data && (Array.isArray(data.products) || Array.isArray(data.featuredCategories) || typeof data.maintenanceMode === 'boolean')) {
      return data;
    }
    return null;
  } catch (err) {
    console.warn('⚠️ [Catalog Sync] Error fetching catalog from server:', err);
    return null;
  }
}
