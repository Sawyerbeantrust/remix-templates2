import { Product, FeaturedCategory } from '../types';
import { safeLocalStorage } from './safeStorage';

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

export async function syncCatalogToServer(
  products: Product[],
  featuredCategories: FeaturedCategory[],
  categoriesList?: string[]
): Promise<boolean> {
  try {
    const catsList = categoriesList && categoriesList.length > 0 ? categoriesList : getStoredCategoriesList();
    const response = await fetch('/api/catalog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        products,
        featuredCategories,
        categoriesList: catsList
      })
    });
    const data = await response.json();
    if (data && data.success) {
      console.log('✅ [Catalog Sync] Successfully saved catalog state to server Blob.');
      return true;
    } else {
      console.warn('⚠️ [Catalog Sync] Server catalog save response:', data);
      return false;
    }
  } catch (err) {
    console.warn('⚠️ [Catalog Sync] Error saving catalog to server Blob:', err);
    return false;
  }
}

export async function fetchServerCatalog(): Promise<{
  products?: Product[];
  featuredCategories?: FeaturedCategory[];
  categoriesList?: string[];
} | null> {
  try {
    const response = await fetch('/api/catalog');
    if (!response.ok) return null;
    const data = await response.json();
    if (data && (Array.isArray(data.products) || Array.isArray(data.featuredCategories))) {
      return data;
    }
    return null;
  } catch (err) {
    console.warn('⚠️ [Catalog Sync] Error fetching catalog from server Blob:', err);
    return null;
  }
}
