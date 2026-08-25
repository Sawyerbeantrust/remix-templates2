import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { safeLocalStorage, safeSessionStorage } from './utils/safeStorage';
import { syncCatalogToServer, fetchServerCatalog, getStoredCategoriesList } from './utils/catalogSync';
import { autoSyncCatalogImages } from './utils/imageUpload';
import Header from './components/Header';
import ProductCard from './components/ProductCard';
import CartDrawer from './components/CartDrawer';
import WordPressConsole from './components/WordPressConsole';
import MaintenancePage from './components/MaintenancePage';
import LegalPoliciesModal from './components/LegalPoliciesModal';
import CookieConsentBanner from './components/CookieConsentBanner';
import AboutModal from './components/AboutModal';
import ContactModal from './components/ContactModal';
import FaqModal from './components/FaqModal';
import CompareModal from './components/CompareModal';
import AssistantChatModal from './components/AssistantChatModal';
import WishlistModal from './components/WishlistModal';
import ResponsiveImage from './components/ResponsiveImage';
import CategoryPreviewImage from './components/CategoryPreviewImage';
import { handleImageElementError } from './utils/imageFallback';
import { useResolvedImage } from './hooks/useResolvedImage';
import { useImagePreloader } from './hooks/useImagePreloader';
import { processCategoriesForStorage, processProductsForStorage } from './utils/sanitizeAndStoreImages';
import { PRODUCTS } from './data/products';
import { Product, CartItem, InquiryFormData, FeaturedCategory } from './types';
import { getCategoryFromQuery } from './utils/seoKeywords';
import { normalizeCategorySlug, formatCategoryLabel } from './utils/categoryUtils';
import { stripHtml } from './utils/stripHtml';
import { ShieldCheck, Calendar, PhoneCall, HelpCircle, ArrowRight, Download, Send, Coins, FileText, CheckCircle2, Award, Hammer, Sparkles, Building2, Eye, X, Settings, ChevronDown, ChevronUp, ZoomIn, Map, MapPin, ZoomOut, RotateCcw, Plus, Minus, Move, ArrowUp, MessageCircle, ChevronLeft, ChevronRight, Trash2, ArrowLeftRight, Bot, Heart } from 'lucide-react';

const WHATSAPP_NUMBER = "27768252078";

const normalizeProductCategory = (p: Product): Product => {
  let nameStr = p.name || '';
  let descStr = p.description || '';
  let seoTitleStr = p.seoTitle || '';
  let seoDescStr = p.seoDescription || '';

  const safeRotaryRegex = /\bRotary\b(?!\s+(?:screw|safety|valve))/gi;

  if (safeRotaryRegex.test(nameStr)) {
    const oldName = nameStr;
    if (nameStr.trim().toLowerCase() === 'rotary') {
      nameStr = 'Triton Lift';
    } else {
      nameStr = nameStr.replace(safeRotaryRegex, 'Triton');
    }
    console.log(`[Trace Rotary Renaming] Renamed Product Name: "${oldName}" -> "${nameStr}"`);
  }

  if (safeRotaryRegex.test(descStr)) {
    descStr = descStr.replace(safeRotaryRegex, 'Triton');
  }
  if (seoTitleStr && safeRotaryRegex.test(seoTitleStr)) {
    seoTitleStr = seoTitleStr.replace(safeRotaryRegex, 'Triton');
  }
  if (seoDescStr && safeRotaryRegex.test(seoDescStr)) {
    seoDescStr = seoDescStr.replace(safeRotaryRegex, 'Triton');
  }

  const rawCat = p.category || p.rawCategoryName || '';
  const categorySlug = normalizeCategorySlug(rawCat, nameStr, p.id, descStr);

  return { 
    ...p, 
    image: normalizeImagePath(p.image),
    images: Array.isArray(p.images) ? p.images.map(normalizeImagePath) : (p.image ? [normalizeImagePath(p.image)] : []),
    name: nameStr,
    description: descStr,
    seoTitle: seoTitleStr,
    seoDescription: seoDescStr,
    category: categorySlug,
    rawCategoryName: p.rawCategoryName || rawCat,
    status: p.status || 'publish',
    dateCreated: p.dateCreated || '2026-06-19'
  };
};

function isUnresolvedOrBase64Image(val: any): boolean {
  if (!val || typeof val !== 'string') return false;
  const trimmed = val.trim();
  if (!trimmed) return false;
  if (
    trimmed.startsWith('data:image') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('img_store_') ||
    trimmed.startsWith('category_image_') ||
    trimmed.startsWith('product_cover_') ||
    trimmed.startsWith('product_gallery_')
  ) {
    return true;
  }
  return false;
}

function hasUnresolvedImageReference(productsList: Product[], categoriesList: FeaturedCategory[]): boolean {
  for (const p of productsList) {
    if (isUnresolvedOrBase64Image(p.image)) return true;
    if (Array.isArray(p.images)) {
      for (const img of p.images) {
        if (isUnresolvedOrBase64Image(img)) return true;
      }
    }
  }
  for (const c of categoriesList) {
    if (isUnresolvedOrBase64Image(c.img)) return true;
  }
  return false;
}

// Helper to normalize image paths to /assets/images/ paths
function normalizeImagePath(imgUrl?: string): string {
  if (!imgUrl || typeof imgUrl !== 'string') return imgUrl || '';
  if (imgUrl.startsWith('http://') || imgUrl.startsWith('https://') || imgUrl.startsWith('data:') || imgUrl.startsWith('blob:')) return imgUrl;
  if (
    imgUrl.startsWith('/images/') ||
    imgUrl.startsWith('/src/assets/images/') ||
    imgUrl.startsWith('images/') ||
    imgUrl.startsWith('/src/assets/') ||
    imgUrl.startsWith('/assets/images/')
  ) {
    const filename = imgUrl.split('?')[0].split('#')[0].split('/').filter(Boolean).pop();
    if (filename) return `/assets/images/${filename}`;
  }
  return imgUrl;
}

export default function App() {
  const [currentView, setCurrentView] = useState<'store' | 'admin'>(() => {
    return (window.location.hash === '#admin' || window.location.search.includes('admin')) ? 'admin' : 'store';
  });
  const [adminClicks, setAdminClicks] = useState(0);

  // Global Maintenance Mode State (persisted via WordPress MySQL & mirrored in localStorage)
  const [maintenanceMode, setMaintenanceMode] = useState<boolean>(() => {
    return safeLocalStorage.getItem('triton_maintenance_mode') === 'true';
  });

  // Back to top navigation states and event tracking
  const [showScrollTop, setShowScrollTop] = useState(false);
  useEffect(() => {
    const handleScrollEvent = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };
    window.addEventListener('scroll', handleScrollEvent, { passive: true });
    return () => window.removeEventListener('scroll', handleScrollEvent);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#admin') {
        setCurrentView('admin');
      } else {
        setCurrentView('store');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const [catalogHydrated, setCatalogHydrated] = useState<boolean>(false);

  const [products, setProducts] = useState<Product[]>(() => {
    console.log("[Product Initialization] Starting product loading...");
    const saved = safeLocalStorage.getItem('triton_products_db');
    let loadedProducts = PRODUCTS;
    if (saved) {
      try {
        console.log("[Product Initialization] Found products in localStorage.");
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          loadedProducts = parsed.map(p => {
            const original = PRODUCTS.find(orig => orig.id === p.id);
            if (original) {
              return {
                ...p,
                image: p.image || original.image,
                images: (Array.isArray(p.images) && p.images.length > 0) ? p.images : (original.images || [original.image])
              };
            }
            return p;
          });
        }
      } catch (e) {
        console.error("[Product Initialization] Error loading products:", e);
      }
    }
    console.log(`[Product Initialization] Mapping and normalizing ${loadedProducts.length} loaded products...`);
    const mapped = (Array.isArray(loadedProducts) ? loadedProducts : PRODUCTS).map((p, idx) => {
      const normalized = normalizeProductCategory(p);
      console.log(`[Product Initialization] [${idx + 1}/${loadedProducts.length}] Processed SKU/ID: ${normalized.id}, Category: ${normalized.category}, Price: ${normalized.price}`);
      return normalized;
    });
    console.log("[Product Initialization] Product loading completed.");
    try {
      safeLocalStorage.setItem('triton_products_db', JSON.stringify(mapped));
    } catch (e) {
      console.error("[Product Initialization] Error re-saving normalized products to localStorage:", e);
    }
    return mapped;
  });

  const [featuredCategories, setFeaturedCategories] = useState<FeaturedCategory[]>(() => {
    const defaultCats: FeaturedCategory[] = [
      { id: "cat-auto-spray", name: "AUTOMOTIVE SPRAY BOOTHS", count: "12 Products", img: "https://images.unsplash.com/photo-1590623091395-e3ae3f6d71b4?auto=format&fit=crop&q=80&w=800&h=600" },
      { id: "cat-car-lifts", name: "CAR LIFTS", count: "8 Products", img: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&q=80&w=800&h=600" },
      { id: "cat-mig-welders", name: "MIG WELDERS DIRECT", count: "15 Products", img: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=800&h=600" },
      { id: "cat-infrared-heaters", name: "BUDGET INFRARED HEATERS", count: "4 Products", img: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=800&h=600" },
      { id: "cat-bus-spray-booths", name: "BUS SPRAY BOOTHS", count: "3 Products", img: "https://images.unsplash.com/photo-1590623091395-e3ae3f6d71b4?auto=format&fit=crop&q=80&w=800&h=600" },
      { id: "cat-chassis-straightener", name: "CHASSIS STRAIGHTENER", count: "2 Products", img: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=800&h=600" },
      { id: "cat-filter-media", name: "FILTER MEDIA", count: "10 Products", img: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=800&h=600" },
      { id: "cat-telescopic-ladders", name: "TELESCOPIC LADDERS", count: "5 Products", img: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=800&h=600" },
      { id: "cat-sa-parking-lifts", name: "S A PARKING STORAGE LIFTS", count: "6 Products", img: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&q=80&w=800&h=600" },
      { id: "cat-20-ton-bus-lifts", name: "20 TON BUS LIFTS", count: "2 Products", img: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&q=80&w=800&h=600" },
      { id: "cat-triton", name: "TRITON", count: "20 Products", img: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&q=80&w=800&h=600" },
      { id: "cat-hydraulic-oil", name: "HYDRAULIC OIL 46GR 10 LITRES", count: "1 Product", img: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=800&h=600" },
      { id: "cat-forklift-ramps", name: "FORKLIFT LOADING RAMPS", count: "3 Products", img: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&q=80&w=800&h=600" },
      { id: "cat-parking-lifts", name: "PARKING LIFTS", count: "5 Products", img: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&q=80&w=800&h=600" }
    ];
    const saved = safeLocalStorage.getItem('triton_featured_categories_db_v3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const merged = parsed.map(pCat => {
            const def = defaultCats.find(d => d.name.toUpperCase() === pCat.name.toUpperCase() || d.id === pCat.id);
            const rawImg = pCat.img || def?.img;
            const normalizedImg = normalizeImagePath(rawImg);
            if (def) {
              return { ...def, ...pCat, img: normalizedImg };
            }
            return { ...pCat, img: normalizedImg };
          });
          defaultCats.forEach(cat => {
            if (!merged.some(m => m.name.toUpperCase() === cat.name.toUpperCase() || m.id === cat.id)) {
              merged.push({ ...cat, img: normalizeImagePath(cat.img) });
            }
          });
          return merged;
        }
      } catch (e) {
        console.error("Error loading featured categories:", e);
      }
    }
    return defaultCats;
  });

  // Centralized real-time stock sync state to replace individual timers in ProductCards
  const [stockSyncState, setStockSyncState] = useState<Record<string, { inStock: boolean; isSyncing: boolean; flash: boolean }>>({});

  useEffect(() => {
    const baseInterval = 12000;
    const randomOffset = Math.floor(Math.random() * 8000);
    const intervalTime = baseInterval + randomOffset;

    const interval = setInterval(() => {
      // Pick 1-2 random products to trigger sync simulation
      const randomProducts = [...products].sort(() => 0.5 - Math.random()).slice(0, 2);
      if (randomProducts.length === 0) return;

      randomProducts.forEach(prod => {
        setStockSyncState(prev => ({
          ...prev,
          [prod.id]: {
            inStock: prev[prod.id] ? prev[prod.id].inStock : (prod.inStock !== false),
            isSyncing: true,
            flash: false
          }
        }));

        setTimeout(() => {
          setStockSyncState(prev => {
            const current = prev[prod.id] || { inStock: prod.inStock !== false };
            const nextStock = Math.random() < 0.25 ? !current.inStock : current.inStock;
            return {
              ...prev,
              [prod.id]: {
                inStock: nextStock,
                isSyncing: false,
                flash: true
              }
            };
          });

          // End flash visual indicator after 1.2s
          setTimeout(() => {
            setStockSyncState(prev => {
              if (!prev[prod.id]) return prev;
              return {
                ...prev,
                [prod.id]: {
                  ...prev[prod.id],
                  flash: false
                }
              };
            });
          }, 1200);
        }, 900);
      });
    }, intervalTime);

    return () => clearInterval(interval);
  }, [products]);

  // ON LOAD: Hydrate catalog from /api/catalog and perform automatic path migration
  useEffect(() => {
    let isMounted = true;
    const hydrateCatalog = async () => {
      try {
        let loadedProds: Product[] = [];
        let loadedCats: FeaturedCategory[] = [];
        let loadedCatList: string[] = [];

        const response = await fetch('/api/catalog');
        if (response.ok) {
          const catData = await response.json();
          if (catData) {
            if (typeof catData.maintenanceMode === 'boolean') {
              setMaintenanceMode(catData.maintenanceMode);
              safeLocalStorage.setItem('triton_maintenance_mode', String(catData.maintenanceMode));
              console.log('[Catalog] Maintenance mode status from server:', catData.maintenanceMode);
            }
            if (Array.isArray(catData.products) && Array.isArray(catData.featuredCategories)) {
              loadedProds = catData.products.map(normalizeProductCategory);
              loadedCats = catData.featuredCategories;
              loadedCatList = Array.isArray(catData.categoriesList) ? catData.categoriesList : [];
              console.log('[Catalog] Hydrated from server');
            }
          }
        }

        // If server had no data or failed, inspect local state/cache
        if (loadedProds.length === 0) {
          loadedProds = products;
          loadedCats = featuredCategories;
        }

        // Check if any product or category needs image path normalization
        let hasLegacyAssets = false;
        const correctedProds = loadedProds.map(p => {
          let needsUpdate = false;
          let newImage = p.image;
          if (newImage && (newImage.startsWith('/images/') || newImage.startsWith('/assets/') || newImage.startsWith('images/'))) {
            newImage = normalizeImagePath(newImage);
            needsUpdate = true;
          }
          let newImages = p.images;
          if (Array.isArray(newImages)) {
            newImages = newImages.map(img => {
              if (img && (img.startsWith('/images/') || img.startsWith('/assets/') || img.startsWith('images/'))) {
                needsUpdate = true;
                return normalizeImagePath(img);
              }
              return img;
            });
          }
          if (needsUpdate) hasLegacyAssets = true;
          return {
            ...p,
            image: newImage,
            images: newImages
          };
        });

        const correctedCats = loadedCats.map(c => {
          if (c.img && (c.img.startsWith('/images/') || c.img.startsWith('/assets/') || c.img.startsWith('images/'))) {
            hasLegacyAssets = true;
            return {
              ...c,
              img: normalizeImagePath(c.img)
            };
          }
          return c;
        });

        if (isMounted) {
          setProducts(correctedProds);
          setFeaturedCategories(correctedCats);
          safeLocalStorage.setItem('triton_products_db', JSON.stringify(correctedProds));
          safeLocalStorage.setItem('triton_featured_categories_db_v3', JSON.stringify(correctedCats));
          if (loadedCatList.length > 0) {
            safeLocalStorage.setItem('triton_categories_list_v2', JSON.stringify(loadedCatList));
          }

          if (hasLegacyAssets) {
            console.log('[Catalog Migration] Detected legacy /images/ paths. Auto-corrected to /src/assets/images/ and syncing to /api/catalog...');
            try {
              const migrationHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
              const cfSecret = (import.meta as any).env?.VITE_CF_BYPASS_SECRET;
              if (cfSecret) {
                migrationHeaders['X-Vercel-Secret'] = cfSecret;
              }

              await fetch('/api/catalog', {
                method: 'POST',
                headers: migrationHeaders,
                body: JSON.stringify({
                  products: correctedProds,
                  featuredCategories: correctedCats,
                  categoriesList: loadedCatList
                })
              });
              console.log('[Catalog Migration] Successfully synced corrected /src/assets/images/ catalog to server.');
            } catch (postErr) {
              console.error('[Catalog Migration] Failed to sync updated catalog to server:', postErr);
            }
          }
        }
      } catch (err) {
        console.log('[Catalog] Server unreachable, using local cache');
      } finally {
        if (isMounted) {
          setCatalogHydrated(true);
        }
      }
    };

    hydrateCatalog();
    return () => {
      isMounted = false;
    };
  }, []);

  // ON EVERY SAVE: Watch products & featuredCategories when hydrated, debounce 1500ms then POST to /api/catalog
  useEffect(() => {
    if (!catalogHydrated) return;

    const timer = setTimeout(async () => {
      try {
        // Auto-sync any data:image base64 to WordPress Media Library
        const { sanitizedProducts, sanitizedCategories, replacedCount } = await autoSyncCatalogImages(
          products,
          featuredCategories
        );

        if (replacedCount > 0) {
          setProducts(sanitizedProducts);
          setFeaturedCategories(sanitizedCategories);
        }

        if (hasUnresolvedImageReference(sanitizedProducts, sanitizedCategories)) {
          console.log('[Catalog] Some images are still local base64. They will be uploaded to WordPress automatically on save.');
          return;
        }

        // Keep local cache synced
        safeLocalStorage.setItem('triton_products_db', JSON.stringify(sanitizedProducts));
        safeLocalStorage.setItem('triton_featured_categories_db_v3', JSON.stringify(sanitizedCategories));

        const catalogHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
        const cfSecret = (import.meta as any).env?.VITE_CF_BYPASS_SECRET;
        if (cfSecret) {
          catalogHeaders['X-Vercel-Secret'] = cfSecret;
        }

        const isMaintenance = typeof maintenanceMode === 'boolean'
          ? maintenanceMode
          : safeLocalStorage.getItem('triton_maintenance_mode') === 'true';

        const response = await fetch('/api/catalog', {
          method: 'POST',
          headers: catalogHeaders,
          body: JSON.stringify({
            products: sanitizedProducts,
            featuredCategories: sanitizedCategories,
            maintenanceMode: isMaintenance
          })
        });

        if (response.ok) {
          const resData = await response.json();
          if (resData && resData.success) {
            console.log('[Catalog] Saved to server');
          }
        }
      } catch (err) {
        console.error('[Catalog] Error saving to server:', err);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [products, featuredCategories, catalogHydrated]);

  const handleProductsChange = async (newProducts: Product[]) => {
    try {
      const cleaned = newProducts.map(normalizeProductCategory);
      const sanitized = await processProductsForStorage(cleaned);
      setProducts(sanitized);
    } catch (err: any) {
      console.error('Failed to process products:', err);
      setProducts(newProducts.map(normalizeProductCategory));
    }
  };

  const saveProductSpecifications = (productId: string, specsArray: [string, string][]) => {
    const specsRecord: Record<string, string> = {};
    specsArray.forEach(([k, v]) => {
      const trimmedK = k.trim();
      if (trimmedK) {
        specsRecord[trimmedK] = v;
      }
    });

    const updatedProducts = products.map(p => {
      if (p.id === productId) {
        const updated = { ...p, specifications: specsRecord };
        if (quickViewProduct && quickViewProduct.id === productId) {
          setRawQuickViewProduct(updated);
        }
        return updated;
      }
      return p;
    });

    handleProductsChange(updatedProducts);
  };

  const handleFeaturedCategoriesChange = async (newCats: FeaturedCategory[]) => {
    try {
      const sanitized = await processCategoriesForStorage(newCats);
      setFeaturedCategories(sanitized);
    } catch (err: any) {
      console.error('Failed to process categories:', err);
      setFeaturedCategories(newCats);
    }
  };

  const [activeCategoryTab, setActiveCategoryTab] = useState<string>('ALL EQUIPMENT');

  const getCategoryDisplayName = (name: string): string => {
    if (language === 'en') return name;
    const nameUpper = String(name).toUpperCase();
    if (nameUpper === "ALL EQUIPMENT") return "ALLE TOERUSTING";
    if (nameUpper === "AUTOMOTIVE SPRAY BOOTHS") return "SPUITKABIENE VIR MOTORS";
    if (nameUpper === "CAR LIFTS") return "MOTORLIFTE";
    if (nameUpper === "MIG WELDERS DIRECT") return "MIG SWEISMASJIENE DIRECT";
    if (nameUpper === "BUDGET INFRARED HEATERS") return "BEGROTING INFRAROOI VERWARMERS";
    if (nameUpper === "BUS SPRAY BOOTHS") return "BUS SPUITKABIENE";
    if (nameUpper === "CHASSIS STRAIGHTENER") return "ONDERSTEL RIGTER";
    if (nameUpper === "FILTER MEDIA") return "FILTER MEDIA";
    if (nameUpper === "TELESCOPIC LADDERS") return "TELESKOPIESE LERE";
    if (nameUpper === "S A PARKING STORAGE LIFTS") return "S A PARKEER STOOR LIFTE";
    if (nameUpper === "20 TON BUS LIFTS") return "20 TON BUS LIFTE";
    if (nameUpper === "TRITON") return "TRITON";
    if (nameUpper === "HYDRAULIC OIL 46GR 10 LITRES") return "HIDROULIESE OLIE 10L";
    if (nameUpper === "FORKLIFT LOADING RAMPS") return "KAFFELAAI RAMPS";
    if (nameUpper === "PARKING LIFTS") return "PARKEERLIFTE";
    
    if (nameUpper === "SPRAY BOOTHS") return "SPUITKASTE";
    if (nameUpper === "2-POST LIFTS") return "2-KOLOM MOTORLIFTE";
    if (nameUpper === "4-POST LIFTS") return "4-KOLOM MOTORLIFTE";
    if (nameUpper === "SCISSOR LIFTS") return "SKÊRLIFTE";
    if (nameUpper === "WORKSHOP ACCESSORIES" || nameUpper === "WORKSHOP EQUIPMENT") return "WERKSWINKEL BYBEHORE";
    if (nameUpper === "WHEEL CARE") return "WIELVERSORGING";
    return name;
  };

  const [globalSeoTitle, setGlobalSeoTitle] = useState(() => {
    return safeLocalStorage.getItem('triton_global_seo_title') || 'Triton Car Lifts & Premium Workshop Equipment Cape Town';
  });

  const [globalSeoDescription, setGlobalSeoDescription] = useState(() => {
    return safeLocalStorage.getItem('triton_global_seo_description') || 'Top-quality 2-Post and 4-Post car lifts, down-draft spray booths, and specialized welding gear for professional garages in South Africa.';
  });

  const [cart, setCart] = useState<CartItem[]>([]);
  const [lastAddedProductId, setLastAddedProductId] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);

  // Compare Tool State & Handlers
  const [compareList, setCompareList] = useState<Product[]>(() => {
    const saved = safeLocalStorage.getItem('triton_compare_list');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error("Error loading compare list:", e);
      }
    }
    return [];
  });
  const [isCompareOpen, setIsCompareOpen] = useState<boolean>(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState<boolean>(false);

  const [wishlist, setWishlist] = useState<Product[]>(() => {
    const saved = safeLocalStorage.getItem('triton_wishlist_storage');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error("Error loading wishlist:", e);
      }
    }
    return [];
  });
  const [isWishlistOpen, setIsWishlistOpen] = useState<boolean>(false);

  const handleToggleWishlist = (product: Product) => {
    setWishlist(prev => {
      let next: Product[];
      if (prev.some(p => p.id === product.id)) {
        next = prev.filter(p => p.id !== product.id);
      } else {
        next = [...prev, product];
      }
      safeLocalStorage.setItem('triton_wishlist_storage', JSON.stringify(next));
      return next;
    });
  };

  const handleRemoveFromWishlist = (productId: string) => {
    setWishlist(prev => {
      const next = prev.filter(p => p.id !== productId);
      safeLocalStorage.setItem('triton_wishlist_storage', JSON.stringify(next));
      return next;
    });
  };

  const handleClearWishlist = () => {
    setWishlist([]);
    safeLocalStorage.removeItem('triton_wishlist_storage');
  };

  const handleToggleCompare = (product: Product) => {
    setCompareList(prev => {
      let next: Product[];
      if (prev.some(p => p.id === product.id)) {
        next = prev.filter(p => p.id !== product.id);
      } else {
        if (prev.length >= 4) {
          alert(language === 'af' ? 'U kan hoogstens 4 produkte gelyktydig vergelyk.' : 'You can compare a maximum of 4 products simultaneously.');
          return prev;
        }
        next = [...prev, product];
      }
      safeLocalStorage.setItem('triton_compare_list', JSON.stringify(next));
      return next;
    });
  };

  const handleRemoveFromCompare = (productId: string) => {
    setCompareList(prev => {
      const next = prev.filter(p => p.id !== productId);
      safeLocalStorage.setItem('triton_compare_list', JSON.stringify(next));
      return next;
    });
  };

  const handleClearCompare = () => {
    setCompareList([]);
    safeLocalStorage.removeItem('triton_compare_list');
  };

  const handleAddToCompare = (product: Product) => {
    setCompareList(prev => {
      if (prev.some(p => p.id === product.id)) return prev;
      if (prev.length >= 4) {
        alert(language === 'af' ? 'U kan hoogstens 4 produkte gelyktydig vergelyk.' : 'You can compare a maximum of 4 products simultaneously.');
        return prev;
      }
      const next = [...prev, product];
      safeLocalStorage.setItem('triton_compare_list', JSON.stringify(next));
      return next;
    });
  };

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('default');
  const [visibleCount, setVisibleCount] = useState<number>(12);

  const [language, setLanguage] = useState<'en' | 'af'>(() => {
    const saved = safeLocalStorage.getItem('cape_town_equipment_lang');
    return (saved === 'af' || saved === 'en') ? saved : 'en';
  });

  const handleLanguageChange = (lang: 'en' | 'af') => {
    setLanguage(lang);
    safeLocalStorage.setItem('cape_town_equipment_lang', lang);
  };

  const [theme, setTheme] = useState<'triton' | 'inospace'>(() => {
    const saved = safeLocalStorage.getItem('cape_town_equipment_theme');
    return (saved === 'triton' || saved === 'inospace') ? saved : 'inospace';
  });

  const handleThemeChange = (newTheme: 'triton' | 'inospace') => {
    setTheme(newTheme);
    safeLocalStorage.setItem('cape_town_equipment_theme', newTheme);
  };

  const t = {
    en: {
      professional_car_lifts: "Premium Garage Equipment.",
      south_africa_tag: "PREMIUM GARAGE & WORKSHOP EQUIPMENT FOR SOUTH AFRICA",
      hero_desc: "Heavy-duty hydraulic car lifts, premium spray booths, wheel care & professional workshop gear.",
      shop_now: "Shop Now",
      request_quote: "Request Quote",
      featured_categories_title: "Featured Categories",
      featured_categories_subtitle: "Explore our extensive range of high-quality lifting equipment designed for every professional scenario.",
      browse_category: "Browse Category →",
      spec_sheet: "Specs Sheet",
      add_to_cart: "Add to Inquiry Cart",
      close_specs: "Close Specs",
      standard_deposit: "STANDARD DEPOSIT PRICE",
      request_a_quote: "Request a Quote →",
      operational_strengths: "Key Operational Strengths",
      datasheet: "Technical Engineering Datasheet",
      recommended_extensions: "RECOMMENDED EXTENSIONS & COMPLEMENTARY GEAR",
      view_details: "View Details →",
      showroom_map: "SHOWROOM GEOLOCATION MAP",
      showroom_desc: "Unit 4, 13 Killarney Avenue. Demo units are available for physical test runs during operating hours.",
      view_on_google_maps: "VIEW ON GOOGLE MAPS",
      how_we_work: "How We Work",
      trusted_by: "Trusted by Workshop Owners",
      see_what_customers: "See what our customers say about their experience",
      our_equipment_catalog: "Our Equipment Catalog",
      browse_comprehensive: "Browse our comprehensive warehouse of structural automotive lifting machines, specialized premium spray booths, and high-quality workshop accessories.",
      quick_search: "Quick search showroom...",
      results: "Results",
      live_showroom: "LIVE COMMERCIAL SHOWROOM",
      expert_installation: "Expert Installation",
      expert_installation_desc: "We provide professional on-site setup with nationwide coverage. Our trained engineering crews handle full rig compliance.",
      support_24_7: "24/7 Support",
      support_24_7_desc: "Long-term maintenance agreements and a dedicated support team ensure your workshop operates smoothly day and night.",
      no_machines_match: "No machines or workshop equipment match your filters.",
      reset_all_filters: "Reset All Filters",
      all_equipment: "All Equipment",
      view_specifications: "View Specifications",
      add_to_quote: "Add To Quote",
      load_more_equipment: "Load More Equipment",
      browse_compare: "Browse & Compare",
      browse_compare_desc: "Explore our full range of car lifts. Use our comparison tool to find the perfect fit for your workshop.",
      get_expert_advice: "Get Expert Advice",
      get_expert_advice_desc: "Chat with our specialists about your needs. Request a quote for bulk orders and installation services.",
      install_enjoy: "Install & Enjoy",
      install_enjoy_desc: "Professional installation & staff training. Long-term support & maintenance agreements to keep you running.",
      stay_updated: "Stay Updated",
      newsletter_desc: "Get latest product launches, tips, and exclusive offers.",
      enter_your_email: "Enter your email",
      subscribe: "Subscribe",
      sort_by: "Sort By",
      sort_default: "Default Ordering",
      sort_price_low_high: "Price: Low to High",
      sort_price_high_low: "Price: High to Low",
      sort_newest: "Newest Arrivals",
    },
    af: {
      professional_car_lifts: "Premium Motorhawe-Toerusting.",
      south_africa_tag: "PREMIUM MOTORHAWE & WERKSWINKEL TOERUSTING VIR SUID-AFRIKA",
      hero_desc: "Swaardiens hidrouliese motorlifte, premium spuitkabiene, wielbelyning & professionele werkswinkelgereedskap.",
      shop_now: "Koop Nou",
      request_quote: "Vra Kwotasie",
      featured_categories_title: "Gewilde Kategorieë",
      featured_categories_subtitle: "Verken ons uitgebreide reeks hoëgehalte-ligtoerusting wat vir elke professionele scenario ontwerp is.",
      browse_category: "Blaai deur Kategorie →",
      spec_sheet: "Spesifikasieblad",
      add_to_cart: "Voeg by Navraagmandjie",
      close_specs: "Sluit Spesifikasies",
      standard_deposit: "STANDAARD DEPOSITO PRYS",
      request_a_quote: "Vra 'n Kwotasie →",
      operational_strengths: "Sleutel Operasionele Sterkpunte",
      datasheet: "Tegniese Ingenieurswese Inlagtingsblad",
      recommended_extensions: "AANBEVOLE UITBREIDINGS & KOMPLEMENTÊRE TOERUSTING",
      view_details: "Sien Besonderhede →",
      showroom_map: "VERTOONLOKAAL GEOLOKASIE KAART",
      showroom_desc: "Eenheid 4, Killarney-laan 13. Demo-eenhede is beskikbaar vir fisiese toetslopies gedurende werksure.",
      view_on_google_maps: "SIEN OP GOOGLE KAARTE",
      how_we_work: "Hoe Ons Werk",
      trusted_by: "Vertrou deur Werkswinkeleienaars",
      see_what_customers: "Kyk wat ons kliënte oor hul ervaring sê",
      our_equipment_catalog: "Ons Toerusting Katalogus",
      browse_comprehensive: "Blaai deur of soek in ons uitgebreide katalogus van strukturele motorlifte, spuitkante en hoëgehalte werkswinkelbybehore.",
      quick_search: "Soek vertoonlokaal vinnig...",
      results: "Resultate",
      live_showroom: "REGSTREEKSE KOMMERSIËLE VERTOONLOKAAL",
      expert_installation: "Deskundige Installasie",
      expert_installation_desc: "Ons bied professionele installasie op die perseel met landwye dekking. CE-gesertifiseerde ingenieurspanne op roep.",
      support_24_7: "24/7 Ondersteuning",
      support_24_7_desc: "Langtermyn instandhoudingsooreenkomste en 'n toegewyde ondersteuningspan verseker dat jou werkswinkel dag en nag glad verloop.",
      no_machines_match: "Geen masjiene of werkswinkeltoerusting pas by jou filters nie.",
      reset_all_filters: "Herstel Alle Filters",
      all_equipment: "Alle Toerusting",
      view_specifications: "Sien Spesifikasies",
      add_to_quote: "Voeg by Kwotasie",
      load_more_equipment: "Laai Meer Toerusting",
      browse_compare: "Blaai & Vergelyk",
      browse_compare_desc: "Verken ons volle reeks motorlifte. Blokkeer of vergelyk om die beste eenheid vir jou laai-kapasiteit te vind.",
      get_expert_advice: "Kry Kundige Advies",
      get_expert_advice_desc: "Praat met ons spesialiste oor jou spesifikasies. Vra direkte kwotasies vir aflewering of self-afhaal.",
      install_enjoy: "Installeer & Geniet",
      install_enjoy_desc: "CE-rigging en installasies op aanvraag. Volle tegniese ondersteuning vir gemoedsrus.",
      stay_updated: "Bly Op Hoogte",
      newsletter_desc: "Kry nuus oor ons nuutste aanbiedings, produkbekendstellings en afslag.",
      enter_your_email: "Sleutel jou e-posadres in",
      subscribe: "Teken in",
      sort_by: "Sorteer Volgens",
      sort_default: "Standaard Volgorde",
      sort_price_low_high: "Prys: Laag tot Hoog",
      sort_price_high_low: "Prys: Hoog tot Laag",
      sort_newest: "Nuutste Aankomste",
    }
  };

  // Thumbnail selector and Zoom Lightbox states
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);
  const resolvedZoomUrl = useResolvedImage(zoomImageUrl);

  const [zoomScale, setZoomScale] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingPan, setIsDraggingPan] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Slider Touch & Mouse Swipe / Dragging State
  const [qvDragStart, setQvDragStart] = useState<number | null>(null);
  const [hasDraggedQv, setHasDraggedQv] = useState<boolean>(false);

  useEffect(() => {
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
    setIsDraggingPan(false);
    setQvDragStart(null);
    setHasDraggedQv(false);
  }, [zoomImageUrl]);

  const handleZoomIn = () => {
    setZoomScale(prev => Math.min(prev + 0.25, 4));
  };

  const handleZoomOut = () => {
    setZoomScale(prev => {
      const next = prev - 0.25;
      if (next <= 1) {
        setPanOffset({ x: 0, y: 0 }); // reset pan when fit to screen
        return 1;
      }
      return next;
    });
  };

  const handleResetZoom = () => {
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
    setIsDraggingPan(false);
  };

  const handleZoomMouseDown = (e: React.MouseEvent) => {
    if (zoomScale <= 1) {
      setQvDragStart(e.clientX);
      setHasDraggedQv(false);
      return;
    }
    setIsDraggingPan(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    e.preventDefault();
  };

  const handleZoomMouseMove = (e: React.MouseEvent) => {
    if (zoomScale <= 1) {
      if (qvDragStart !== null && Math.abs(e.clientX - qvDragStart) > 10) {
        setHasDraggedQv(true);
      }
      return;
    }
    if (!isDraggingPan) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleZoomMouseUp = (e: React.MouseEvent) => {
    setIsDraggingPan(false);
    if (zoomScale <= 1 && qvDragStart !== null) {
      const deltaX = e.clientX - qvDragStart;
      const activeProduct = products.find(p => p.image === zoomImageUrl || (p.images && p.images.includes(zoomImageUrl)));
      const activeImages = activeProduct ? getProductImages(activeProduct) : [zoomImageUrl];
      const currentIndex = activeImages.indexOf(zoomImageUrl);
      if (activeImages.length > 1 && currentIndex !== -1) {
        if (deltaX > 40) {
          // swipe right -> previous image
          const prevIdx = currentIndex > 0 ? currentIndex - 1 : activeImages.length - 1;
          setZoomImageUrl(activeImages[prevIdx]);
        } else if (deltaX < -40) {
          // swipe left -> next image
          const nextIdx = currentIndex < activeImages.length - 1 ? currentIndex + 1 : 0;
          setZoomImageUrl(activeImages[nextIdx]);
        }
      }
      setQvDragStart(null);
    }
  };

  const handleZoomTouchStart = (e: React.TouchEvent) => {
    if (zoomScale <= 1) {
      setQvDragStart(e.touches[0].clientX);
      setHasDraggedQv(false);
      return;
    }
    if (e.touches.length !== 1) return;
    setIsDraggingPan(true);
    const touch = e.touches[0];
    setDragStart({ x: touch.clientX - panOffset.x, y: touch.clientY - panOffset.y });
  };

  const handleZoomTouchMove = (e: React.TouchEvent) => {
    if (zoomScale <= 1) {
      if (qvDragStart !== null && Math.abs(e.touches[0].clientX - qvDragStart) > 10) {
        setHasDraggedQv(true);
      }
      return;
    }
    if (!isDraggingPan || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setPanOffset({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y
    });
  };

  const handleZoomTouchEnd = (e: React.TouchEvent) => {
    setIsDraggingPan(false);
    if (zoomScale <= 1 && qvDragStart !== null && e.changedTouches.length > 0) {
      const deltaX = e.changedTouches[0].clientX - qvDragStart;
      const activeProduct = products.find(p => p.image === zoomImageUrl || (p.images && p.images.includes(zoomImageUrl)));
      const activeImages = activeProduct ? getProductImages(activeProduct) : [zoomImageUrl];
      const currentIndex = activeImages.indexOf(zoomImageUrl);
      if (activeImages.length > 1 && currentIndex !== -1) {
        if (deltaX > 40) {
          const prevIdx = currentIndex > 0 ? currentIndex - 1 : activeImages.length - 1;
          setZoomImageUrl(activeImages[prevIdx]);
        } else if (deltaX < -40) {
          const nextIdx = currentIndex < activeImages.length - 1 ? currentIndex + 1 : 0;
          setZoomImageUrl(activeImages[nextIdx]);
        }
      }
      setQvDragStart(null);
    }
  };

  // Quick View Touch & Mouse Drag Swipe event handlers
  const handleQvTouchStart = (e: React.TouchEvent) => {
    setQvDragStart(e.touches[0].clientX);
    setHasDraggedQv(false);
  };

  const handleQvTouchMove = (e: React.TouchEvent) => {
    if (qvDragStart === null) return;
    const currentX = e.touches[0].clientX;
    if (Math.abs(currentX - qvDragStart) > 10) {
      setHasDraggedQv(true);
    }
  };

  const handleQvTouchEnd = (e: React.TouchEvent) => {
    if (qvDragStart === null) return;
    const deltaX = e.changedTouches[0].clientX - qvDragStart;
    const images = getProductImages(quickViewProduct!);
    if (deltaX > 40) {
      setActiveImageIndex(prev => (prev > 0 ? prev - 1 : images.length - 1));
    } else if (deltaX < -40) {
      setActiveImageIndex(prev => (prev < images.length - 1 ? prev + 1 : 0));
    }
    setQvDragStart(null);
  };

  const handleQvMouseDown = (e: React.MouseEvent) => {
    setQvDragStart(e.clientX);
    setHasDraggedQv(false);
  };

  const handleQvMouseMove = (e: React.MouseEvent) => {
    if (qvDragStart === null) return;
    if (Math.abs(e.clientX - qvDragStart) > 10) {
      setHasDraggedQv(true);
    }
  };

  const handleQvMouseUp = (e: React.MouseEvent) => {
    if (qvDragStart === null) return;
    const deltaX = e.clientX - qvDragStart;
    const images = getProductImages(quickViewProduct!);
    if (deltaX > 40) {
      setActiveImageIndex(prev => (prev > 0 ? prev - 1 : images.length - 1));
    } else if (deltaX < -40) {
      setActiveImageIndex(prev => (prev < images.length - 1 ? prev + 1 : 0));
    }
    setQvDragStart(null);
  };

  const getProductImages = (product: Product): string[] => {
    const images: string[] = [];
    if (product.image) {
      images.push(product.image);
    }
    if (product.images && product.images.length > 0) {
      for (const img of product.images) {
        if (img && !images.includes(img)) {
          images.push(img);
        }
      }
    }
    let pool: string[] = [];
    if (product.category === 'car-lift') {
      pool = [
        "https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?q=80&w=600&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1507136566006-cfc505b114fc?q=80&w=600&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1616788494707-ec28f08d05a1?q=80&w=600&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?q=80&w=600&auto=format&fit=crop"
      ];
    } else if (product.category === 'spray-booth') {
      pool = [
        "https://images.unsplash.com/photo-1590623091395-e3ae3f6d71b4?q=80&w=600&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=600&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=600&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?q=80&w=600&auto=format&fit=crop"
      ];
    } else {
      pool = [
        "https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=600&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1530124560072-a059b014b411?q=80&w=600&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=600&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1581092162384-8987c1794ed9?q=80&w=600&auto=format&fit=crop"
      ];
    }
    for (const url of pool) {
      if (!images.includes(url)) {
        images.push(url);
      }
    }
    return images.slice(0, 5);
  };

  const getRelatedProducts = (product: Product): Product[] => {
    let relatedIds: string[] = [];
    if (product.category === 'car-lift') {
      relatedIds = ['floor-protective-board', 'lift-4p-parking-heavy', 'lift-2p-parking-storage'];
    } else if (product.category === 'spray-booth') {
      relatedIds = ['peelable-coating-film-l', 'floor-protective-board', 'custom-bus-booth-xxl'];
    } else if (product.id.includes('mig') || product.id.includes('welder') || product.id.includes('tig')) {
      relatedIds = ['flux-wire-1kg', 'mig-torch-replacement', 'mig-shrouds-mb15', 'welding-helmet-auto'];
    } else {
      relatedIds = ['floor-protective-board', 'thermometer-ir-noncontact', 'ladders-telescopic-38m'];
    }
    return products.filter(p => p.status !== 'draft' && relatedIds.includes(p.id) && p.id !== product.id).slice(0, 3);
  };

  // South African Compliance Legal Policies states
  const [legalModalOpen, setLegalModalOpen] = useState<boolean>(false);
  const [legalInitialTab, setLegalInitialTab] = useState<'privacy' | 'terms' | 'cookie'>('privacy');
  
  // Immersive Cape Town About Us state
  const [aboutModalOpen, setAboutModalOpen] = useState<boolean>(false);
  
  // Cape Town Contact & Enquiry Form state
  const [contactModalOpen, setContactModalOpen] = useState<boolean>(false);
  
  // Cape Town Equipment FAQ state
  const [faqModalOpen, setFaqModalOpen] = useState<boolean>(false);

  // Showroom Walkthrough guided tour states
  const [isTourOpen, setIsTourOpen] = useState<boolean>(false);
  const [tourStep, setTourStep] = useState<number>(0);

  const tourSteps = [
    {
      title: "Welcome to Triton Showroom!",
      description: "Welcome to our premium virtual showroom! Triton is South Africa's premier supplier of heavy-duty automotive workshop equipment. Let's take a quick 1-minute guided tour to showcase our industry-leading equipment catalog.",
      category: "all",
      highlight: "Start exploring our collection"
    },
    {
      title: "Vehicle Lift & Hoist Systems",
      description: "Discover our heavy-duty hydraulic lifting systems. Engineered to meet strict safety criteria, our range includes 2-Post clear-floor hoists, robust 4-Post alignment lifts, and low-profile scissor lifts trusted by workshops across Cape Town and South Africa.",
      category: "car-lift",
      highlight: "Filtering car lifts & hydraulic hoists"
    },
    {
      title: "Heated & Spray Booth Systems",
      description: "Explore our pristine down-draft paint spray chambers. Featuring premium EPS insulated walls, high-efficiency fan intake units, and Italian Riello burner arrays for perfect baked finishes and fast curing times.",
      category: "spray-booth",
      highlight: "Filtering heated paint booth systems"
    },
    {
      title: "Specialized Workshop Equipment",
      description: "Equip your workspace with our professional tools. From DC inverter multi-MIG welding stations to digital infrared thermometers and workshop safety gear, we supply everything a modern auto-repair facility needs.",
      category: "workshop-equipment",
      highlight: "Filtering specialized tools & welding gear"
    },
    {
      title: "Specifications & PDF Downloads",
      description: "Every item in our showroom contains full CE-compliant engineering data. You can click 'View Specifications' on any product card, read extensive specs, and click 'Download PDF Datasheet' to save a beautiful, ready-to-print datasheet for your workshop planning.",
      category: "all",
      highlight: "Professional documents available instantly"
    },
    {
      title: "Inquiry Basket & Custom Quotation",
      description: "Interested in a professional setup? Add items to your inquiry cart to compile your custom workspace setup, then hit 'Request Quote' to send the inquiry directly to our Cape Town head office for immediate assistance.",
      category: "all",
      highlight: "Ready to upgrade your workshop?"
    }
  ];

  const handleTourStepChange = (newStep: number) => {
    setTourStep(newStep);
    const stepCategory = tourSteps[newStep].category;
    setSelectedCategory(stepCategory);
    setSearchQuery('');
    
    // Smooth scroll the catalog into focus when transitioning categories
    if (stepCategory !== 'all') {
      const el = document.getElementById('product-segment-anchor');
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    }
  };

  const openLegalPolicy = (tab: 'privacy' | 'terms' | 'cookie') => {
    setLegalInitialTab(tab);
    setLegalModalOpen(true);
  };

  const handleCategoryClick = (catName: string) => {
    setActiveCategoryTab(catName);
    setSearchQuery('');
    
    const nameLower = catName.toLowerCase().trim();
    if (nameLower === "all equipment" || nameLower === "all") {
      setSelectedCategory('all');
    } else {
      setSelectedCategory(nameLower.replace(/\s+/g, '-'));
    }

    const anchor = document.getElementById('product-segment-anchor');
    if (anchor) {
      setTimeout(() => {
        anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }
  };

  const isProductMatchedToCategory = (product: Product, catName: string): boolean => {
    if (!product || !catName) return false;
    const name = (product.name || '').toLowerCase();
    const desc = (product.description || '').toLowerCase();
    const cat = (product.category || '').toLowerCase();
    const model = (product.modelCode || '').toLowerCase();
    const rawCat = (product.rawCategoryName || '').toLowerCase();
    
    const nameLower = catName.toLowerCase().trim();
    const targetSlug = nameLower.replace(/\s+/g, '-');
    const catSlug = cat.replace(/\s+/g, '-');
    const rawCatSlug = rawCat.replace(/\s+/g, '-');

    if (nameLower === "all equipment" || nameLower === "all") {
      return true;
    }

    // 1. Direct category slug / folder name exact match or equivalence
    if (
      (catSlug === 'spray-booth' || catSlug === 'automotive-spray-booths' || catSlug === 'spray-booths') &&
      (targetSlug === 'spray-booth' || targetSlug === 'automotive-spray-booths' || targetSlug === 'spray-booths')
    ) {
      return true;
    }

    if (catSlug && (catSlug === targetSlug || catSlug.replace(/s$/, '') === targetSlug.replace(/s$/, ''))) {
      return true;
    }
    if (rawCatSlug && (rawCatSlug === targetSlug || rawCatSlug.replace(/s$/, '') === targetSlug.replace(/s$/, ''))) {
      return true;
    }

    // 2. Specific featured category fallback rules
    if (nameLower === "2-post car lifts" || nameLower === "2-post lifts" || nameLower === "2 post lifts" || targetSlug === "2-post-car-lifts") {
      const is2Post = name.includes('2-post') || desc.includes('2-post') || model.includes('2-post') || name.includes('2 post') || name.includes('2-kolom');
      return is2Post || (cat.includes('car-lift') && (name.includes('2') || desc.includes('2')));
    }
    if (nameLower === "4-post car lifts" || nameLower === "4-post lifts" || nameLower === "4 post lifts" || targetSlug === "4-post-car-lifts") {
      const is4Post = name.includes('4-post') || desc.includes('4-post') || model.includes('4-post') || name.includes('4 post') || name.includes('4-kolom');
      return is4Post || (cat.includes('car-lift') && (name.includes('4') || desc.includes('4')));
    }
    if (nameLower === "parking lifts" || nameLower === "s a parking storage lifts" || targetSlug === "parking-lifts" || targetSlug === "s-a-parking-storage-lifts") {
      return catSlug.includes('parking') || name.includes('parking') || desc.includes('parking') || model.includes('parking') || name.includes('stacker') || name.includes('parkeer') || name.includes('storage');
    }
    if (nameLower === "bus lifts" || nameLower === "20 ton bus lifts" || targetSlug === "20-ton-bus-lifts") {
      return catSlug.includes('bus-lift') || catSlug.includes('20-ton') || name.includes('bus') || name.includes('heavy') || name.includes('industrial') || name.includes('column') || name.includes('heavy-duty') || name.includes('truck');
    }
    if (nameLower === "automotive spray booths" || targetSlug === "automotive-spray-booths" || targetSlug === "spray-booth" || targetSlug === "spray-booths") {
      const isSprayBooth = cat === 'spray-booth' || cat === 'automotive-spray-booths' || cat.includes('spray-booth') || cat.includes('automotive-spray-booths') || cat.includes('spraybooth') || cat.includes('spray') || name.includes('booth') || name.includes('spuitkab');
      return isSprayBooth && !name.includes('bus') && !name.includes('truck') && !desc.includes('bus') && !desc.includes('truck');
    }
    if (nameLower === "bus spray booths" || targetSlug === "bus-spray-booths") {
      const isSprayBooth = cat.includes('spray-booth') || cat.includes('spraybooth') || cat.includes('spray') || name.includes('booth') || name.includes('spuitkab');
      return isSprayBooth && (name.includes('bus') || name.includes('truck') || desc.includes('bus') || desc.includes('truck'));
    }
    if (nameLower === "mig welders direct" || targetSlug === "mig-welders-direct") {
      return catSlug.includes('mig') || catSlug.includes('welder') || name.includes('mig') || desc.includes('mig') || name.includes('welder') || desc.includes('welder') || name.includes('sweis');
    }
    if (nameLower === "budget infrared heaters" || targetSlug === "budget-infrared-heaters") {
      return catSlug.includes('heater') || catSlug.includes('infrared') || name.includes('heater') || name.includes('infrared') || desc.includes('heater') || desc.includes('infrared') || name.includes('verwarmer');
    }
    if (nameLower === "chassis straightener" || targetSlug === "chassis-straightener") {
      return catSlug.includes('straightener') || catSlug.includes('chassis') || name.includes('straightener') || name.includes('chassis') || name.includes('rigter');
    }
    if (nameLower === "filter media" || targetSlug === "filter-media") {
      return catSlug.includes('filter') || name.includes('filter') || desc.includes('filter') || name.includes('media') || desc.includes('media');
    }
    if (nameLower === "telescopic ladders" || targetSlug === "telescopic-ladders") {
      return catSlug.includes('ladder') || name.includes('ladder') || desc.includes('ladder') || name.includes('telescopic') || name.includes('leer') || name.includes('lere');
    }
    if (nameLower === "forklift loading ramps" || targetSlug === "forklift-loading-ramps") {
      return catSlug.includes('ramp') || catSlug.includes('loading') || name.includes('ramp') || desc.includes('ramp') || name.includes('loading') || name.includes('laai');
    }
    if (nameLower === "hydraulic oil 46gr 10 litres" || targetSlug === "hydraulic-oil-46gr-10-litres") {
      return catSlug.includes('oil') || name.includes('oil') || desc.includes('oil') || name.includes('hydraulic') || desc.includes('hydraulic') || name.includes('olie');
    }
    if (nameLower === "triton") {
      return name.includes('triton') || desc.includes('triton');
    }
    if (nameLower === "car lifts" || nameLower === "car lift" || targetSlug === "car-lifts" || targetSlug === "car-lift") {
      return cat.includes('car-lift') || cat.includes('lift') || name.includes('lift') || name.includes('hoist') || name.includes('hys');
    }

    const slugMatched = cat === nameLower || catSlug === targetSlug || targetSlug.includes(catSlug) || catSlug.includes(targetSlug);
    const textMatched = name.includes(nameLower) || desc.includes(nameLower);

    return slugMatched || textMatched;
  };

  const getCategoryCountText = (catName: string, productsList: Product[]): string => {
    if (!catName) return `0 ${language === 'en' ? 'Products' : 'Produkte'}`;
    const count = productsList.filter(product => {
      if (!product) return false;
      if (product.status === 'draft') return false;
      return isProductMatchedToCategory(product, catName);
    }).length;

    return `${count} ${language === 'en' ? `Product${count === 1 ? '' : 's'}` : `Produk${count === 1 ? '' : 'te'}`}`;
  };

  const getProductCategoryName = (product: Product): string => {
    if (!product) return 'EQUIPMENT';

    // 1. If active category tab is specific and product matches it, use active category tab name
    if (activeCategoryTab && activeCategoryTab.toUpperCase() !== 'ALL EQUIPMENT' && isProductMatchedToCategory(product, activeCategoryTab)) {
      return activeCategoryTab.toUpperCase();
    }

    // 2. Formatted label of product.category
    if (product.category && product.category.trim()) {
      return formatCategoryLabel(product.category).toUpperCase();
    }

    // 3. If product has explicit rawCategoryName
    if (product.rawCategoryName && product.rawCategoryName.trim()) {
      return product.rawCategoryName.trim().toUpperCase();
    }

    // 4. Find matching category from featuredCategories
    const matchedCat = featuredCategories.find(cat => 
      cat.name && 
      cat.name.toUpperCase() !== 'ALL EQUIPMENT' && 
      isProductMatchedToCategory(product, cat.name)
    );
    if (matchedCat) {
      return matchedCat.name.toUpperCase();
    }

    return 'WORKSHOP EQUIPMENT';
  };

  // Reset pagination on filter search updates
  useEffect(() => {
    setVisibleCount(12);
  }, [selectedCategory, searchQuery]);

  // Quick view model dialog state
  const [quickViewProduct, setRawQuickViewProduct] = useState<Product | null>(null);
  const [copiedSpecs, setCopiedSpecs] = useState(false);

  const setQuickViewProduct = (p: Product | null | ((prev: Product | null) => Product | null)) => {
    if (typeof p === 'function') {
      setRawQuickViewProduct(prev => {
        const next = p(prev);
        if (next && next.status === 'draft') return prev;
        return next;
      });
    } else {
      if (p && p.status === 'draft') return;
      setRawQuickViewProduct(p);
    }
  };

  useEffect(() => {
    setActiveImageIndex(0);
  }, [quickViewProduct]);

  // Support deep-linking for sharing specific product pages on load
  useEffect(() => {
    const handleUrlParams = () => {
      const params = new URLSearchParams(window.location.search);
      const productId = params.get('product');
      if (productId && products.length > 0) {
        const prod = products.find(p => p.id === productId);
        if (prod && prod.status !== 'draft') {
          setRawQuickViewProduct(prod);
        }
      }
    };
    
    handleUrlParams();
    window.addEventListener('popstate', handleUrlParams);
    return () => window.removeEventListener('popstate', handleUrlParams);
  }, [products]);

  // Synchronize browser URL bar when quickViewProduct changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (quickViewProduct) {
      params.set('product', quickViewProduct.id);
      const newUrl = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
      window.history.replaceState({ ...window.history.state }, '', newUrl);
    } else {
      if (params.has('product')) {
        params.delete('product');
        const searchStr = params.toString();
        const newUrl = `${window.location.pathname}${searchStr ? '?' + searchStr : ''}${window.location.hash}`;
        window.history.replaceState({ ...window.history.state }, '', newUrl);
      }
    }
  }, [quickViewProduct]);

  // Prefilled WhatsApp link helper
  const getWhatsAppUrl = () => {
    let text = "";
    
    if (quickViewProduct) {
      const productLink = `${window.location.origin}${window.location.pathname}?product=${quickViewProduct.id}`;
      text = `Hello Triton Car Lifts SA, I would like to make a sales inquiry about:\n\n` +
             `• *Product Name:* ${quickViewProduct.name}\n` +
             `• *Model:* ${quickViewProduct.modelCode || quickViewProduct.id}\n` +
             `• *Price:* R ${quickViewProduct.price || 'Request Quote'}\n\n` +
             `Product Link: ${productLink}`;
    } else {
      text = `Hello Triton Car Lifts SA, I would like to make an inquiry about your workshop equipment and car lifts.\n\n` +
             `Page Link: ${window.location.href}`;
    }
    
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
  };

  // Add to cart function - WooCommerce simulator
  const handleAddToCart = (product: Product) => {
    if (product.status === 'draft') {
      return; // Do not add draft products to cart on front end
    }
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setLastAddedProductId(product.id);
    // Open cart automatically to show feedback unless they close it
    setIsCartOpen(true);
  };

  const handleContinueShopping = () => {
    setIsCartOpen(false);
    if (lastAddedProductId) {
      // Find the last product
      const lastProduct = products.find(p => p.id === lastAddedProductId);
      if (lastProduct) {
        // Unfilter view to ensure the item is visible in the showroom listing block
        setSelectedCategory('all');
        setSearchQuery('');
        
        setTimeout(() => {
          const element = document.getElementById(`product-card-${lastAddedProductId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('ring-4', 'ring-red-600', 'scale-[1.02]', 'shadow-2xl', 'z-50');
            setTimeout(() => {
              element.classList.remove('ring-4', 'ring-red-600', 'scale-[1.02]', 'shadow-2xl', 'z-50');
            }, 3000);
          }
        }, 400);
      }
    } else {
      setTimeout(() => {
        const el = document.getElementById('product-segment-anchor');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 400);
    }
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const handleUpdateCartQuantity = (productId: string, quantity: number) => {
    setCart(prev => prev.map(item => 
      item.product.id === productId 
        ? { ...item, quantity: Math.max(1, quantity) }
        : item
    ));
  };

  const handleCheckoutComplete = () => {
    setCart([]);
  };

  // Filter products based on active categories and search query query inputs
  const filteredProducts = products.filter(product => {
    if (product.status === 'draft') return false;

    // 1. Featured Category Tab Filter:
    // If a featured category is active and not 'ALL EQUIPMENT', only list products matched to that category
    if (activeCategoryTab && activeCategoryTab.toUpperCase() !== 'ALL EQUIPMENT') {
      const isMatched = isProductMatchedToCategory(product, activeCategoryTab);
      if (!isMatched) return false;
    } else if (selectedCategory && selectedCategory !== 'all') {
      // 2. Fallback category slug check
      if (product.category !== selectedCategory) return false;
    }

    // 3. Search query filter
    const queryStr = String(searchQuery || '').toLowerCase().trim();
    if (queryStr) {
      const nameStr = String(product.name || '').toLowerCase();
      const descStr = String(product.description || '').toLowerCase();
      const modelStr = String(product.modelCode || '').toLowerCase();
      const catStr = String(product.category || '').toLowerCase();
      const rawCatStr = String(product.rawCategoryName || '').toLowerCase();

      const mappedCategory = getCategoryFromQuery(queryStr);

      const directMatch = nameStr.includes(queryStr) || 
                          descStr.includes(queryStr) ||
                          modelStr.includes(queryStr) ||
                          catStr.includes(queryStr) ||
                          rawCatStr.includes(queryStr);

      const seoMatch = mappedCategory && product.category === mappedCategory;

      if (!directMatch && !seoMatch) return false;
    }

    return true;
  });

  // Sort products dynamically based on selected sorting option
  if (sortBy === 'price-low-high') {
    filteredProducts.sort((a, b) => {
      const priceA = a.price || 0;
      const priceB = b.price || 0;
      return priceA - priceB;
    });
  } else if (sortBy === 'price-high-low') {
    filteredProducts.sort((a, b) => {
      const priceA = a.price || 0;
      const priceB = b.price || 0;
      return priceB - priceA;
    });
  } else if (sortBy === 'newest') {
    filteredProducts.sort((a, b) => {
      if (a.dateCreated && b.dateCreated) {
        return new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime();
      }
      const indexA = products.findIndex(p => p.id === a.id);
      const indexB = products.findIndex(p => p.id === b.id);
      return indexB - indexA; // Higher index/added last means newer
    });
  } else {
    // Offer in category order when viewing 'all' products per user request, respecting customized arrangement sortOrder
    if (selectedCategory === 'all') {
      const categoryOrder: Record<string, number> = {
        'car-lift': 1,
        'spray-booth': 2,
        'wheel-care': 3,
        'workshop-equipment': 4
      };
      filteredProducts.sort((a, b) => {
        const orderA = categoryOrder[a.category || ''] || 99;
        const orderB = categoryOrder[b.category || ''] || 99;
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        const sortA = a.sortOrder ?? 99999;
        const sortB = b.sortOrder ?? 99999;
        if (sortA !== sortB) {
          return sortA - sortB;
        }
        return String(a.name || '').localeCompare(String(b.name || ''));
      });
    } else {
      // If viewing a specific category, respect customized sorting arranged by user
      filteredProducts.sort((a, b) => {
        const sortA = a.sortOrder ?? 99999;
        const sortB = b.sortOrder ?? 99999;
        if (sortA !== sortB) {
          return sortA - sortB;
        }
        return String(a.name || '').localeCompare(String(b.name || ''));
      });
    }
  }

  // Preload images for currently visible products in the showroom grid
  const visibleShowroomProducts = filteredProducts.slice(0, visibleCount);
  useImagePreloader(visibleShowroomProducts, {
    priorityCount: 8,
    includeSecondaryImages: true
  });

  const handleShortcutInquiry = (product: Product) => {
    handleAddToCart(product);
    setQuickViewProduct(null);
  };

  const handleDownloadPdf = async (product: Product) => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const RED: [number, number, number] = [220, 38, 38]; // #dc2626
    const DARK: [number, number, number] = [15, 23, 42]; // #0f172a (dark slate)
    const GRAY: [number, number, number] = [71, 85, 105]; // #475569
    const LIGHT_BG: [number, number, number] = [248, 250, 252]; // #f8fafc

    let y = 15;

    const drawHeaderFooter = () => {
      // Top accent banner
      doc.setFillColor(DARK[0], DARK[1], DARK[2]);
      doc.rect(0, 0, 210, 15, 'F');
      
      doc.setFillColor(RED[0], RED[1], RED[2]);
      doc.rect(0, 15, 210, 1.5, 'F');

      // Top banner text
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text('TRITON AUTOMOTIVE WORKSHOP EQUIPMENT  |  OFFICIAL PRODUCT SPECIFICATION SHEET', 15, 9);

      // Bottom footer banner
      const pageHeight = 297;
      doc.setFillColor(LIGHT_BG[0], LIGHT_BG[1], LIGHT_BG[2]);
      doc.rect(0, pageHeight - 16, 210, 16, 'F');
      
      doc.setFillColor(RED[0], RED[1], RED[2]);
      doc.rect(0, pageHeight - 16, 210, 0.8, 'F');

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(GRAY[0], GRAY[1], GRAY[2]);
      doc.text('AUTHORIZED DISTRIBUTOR | SOUTH AFRICA', 15, pageHeight - 8);
      doc.text('CAPE TOWN HEAD OFFICE: UNIT 4, 13 KILLARNEY AVENUE, KILLARNEY GARDENS', 15, pageHeight - 4);
      doc.text('Page ' + doc.internal.pages.length, 195, pageHeight - 8, { align: 'right' });
    };

    const checkPageBreak = (neededHeight: number) => {
      if (y + neededHeight > 270) {
        doc.addPage();
        drawHeaderFooter();
        y = 25;
      }
    };

    // Draw initial decorations
    drawHeaderFooter();
    y = 28;

    // Brand and Label
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(RED[0], RED[1], RED[2]);
    doc.text('PROFESSIONAL TECHNICAL DATASHEET', 15, y);
    y += 5.5;

    // Product Title
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(DARK[0], DARK[1], DARK[2]);
    doc.text(product.name.toUpperCase(), 15, y);
    y += 7;

    // Subtitle (Model and Cat)
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(GRAY[0], GRAY[1], GRAY[2]);
    const catLabel = product.category === 'car-lift' ? 'Vehicle Lift / Hoist System' : product.category.replace('-', ' ').toUpperCase();
    doc.text(`Model: ${product.modelCode.toUpperCase()}   |   Category: ${catLabel}`, 15, y);
    y += 6;

    // Horizontal Rule
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.4);
    doc.line(15, y, 195, y);
    y += 8;

    // Product Overview Section
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(DARK[0], DARK[1], DARK[2]);
    doc.text('PRODUCT OVERVIEW', 15, y);
    y += 5;

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    const descText = stripHtml(product.description || 'Professional automotive workshop equipment designed to rigorous safety and structural engineering specifications.');
    const descLines = doc.splitTextToSize(descText, 180);
    doc.text(descLines, 15, y);
    y += descLines.length * 4.8 + 6;

    // Price Indicator
    if (product.price && product.price > 0) {
      checkPageBreak(18);
      doc.setFillColor(241, 245, 249); // slate-100
      doc.rect(15, y, 180, 14, 'F');
      
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(GRAY[0], GRAY[1], GRAY[2]);
      doc.text('INDICATIVE SOUTH AFRICAN BASE INVESTMENT (EXCL. VAT)', 20, y + 5);

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11.5);
      doc.setTextColor(DARK[0], DARK[1], DARK[2]);
      doc.text(`R ${product.price.toLocaleString('en-ZA')}.00`, 20, y + 10.5);
      y += 19;
    }

    // Key Features Bullet List
    if (product.features && product.features.length > 0) {
      checkPageBreak(25);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(DARK[0], DARK[1], DARK[2]);
      doc.text('KEY OPERATIONAL STRENGTHS', 15, y);
      y += 5;

      product.features.forEach((feature) => {
        const featLines = doc.splitTextToSize(feature, 172);
        checkPageBreak(featLines.length * 4.5 + 3);

        // Draw bullet dot
        doc.setFillColor(RED[0], RED[1], RED[2]);
        doc.circle(18, y - 1, 0.9, 'F');

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59);
        doc.text(featLines, 22, y);
        y += featLines.length * 4.5 + 2;
      });
      y += 4;
    }

    // Specifications Grid / Table
    if (product.specifications && Object.keys(product.specifications).length > 0) {
      checkPageBreak(30);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(DARK[0], DARK[1], DARK[2]);
      doc.text('TECHNICAL ENGINEERING DATA SHEET', 15, y);
      y += 5.5;

      // Table Header Row
      doc.setFillColor(DARK[0], DARK[1], DARK[2]);
      doc.rect(15, y, 180, 7.5, 'F');

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      doc.text('SPECIFICATION PARAMETER', 19, y + 5);
      doc.text('ENGINEERING RATING / SCOPE', 110, y + 5);
      y += 7.5;

      let isEven = false;
      const specEntries = Object.entries(product.specifications);

      specEntries.forEach(([prop, val]) => {
        // Measure heights
        const propLines = doc.splitTextToSize(prop, 85);
        const valLines = doc.splitTextToSize(val, 80);
        const rowHeight = Math.max(propLines.length, valLines.length) * 4.2 + 4.5;

        checkPageBreak(rowHeight);

        // Background color
        if (isEven) {
          doc.setFillColor(248, 250, 252); // slate-50
        } else {
          doc.setFillColor(255, 255, 255);
        }
        doc.rect(15, y, 180, rowHeight, 'F');

        // Draw thin bottom boundary
        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.3);
        doc.line(15, y + rowHeight, 195, y + rowHeight);

        // Write Parameter (bold)
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105);
        doc.text(propLines, 19, y + 4.5);

        // Write value (regular, dark)
        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(15, 23, 42);
        doc.text(valLines, 110, y + 4.5);

        y += rowHeight;
        isEven = !isEven;
      });
      y += 5;
    }

    // Extended description if available
    if (product.longDescription) {
      const cleanLongDesc = product.longDescription.trim();
      if (cleanLongDesc) {
        checkPageBreak(30);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(DARK[0], DARK[1], DARK[2]);
        doc.text('DETAILED COMPLIANCE & DESIGN CRITERIA', 15, y);
        y += 5;

        const longLines = doc.splitTextToSize(cleanLongDesc, 180);
        let lineIdx = 0;
        
        while (lineIdx < longLines.length) {
          const linesAvailable = Math.floor((270 - y) / 4.5);
          if (linesAvailable <= 3) {
            doc.addPage();
            drawHeaderFooter();
            y = 25;
            continue;
          }
          
          const chunk = longLines.slice(lineIdx, lineIdx + linesAvailable);
          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(8.5);
          doc.setTextColor(51, 65, 85);
          doc.text(chunk, 15, y);
          
          y += chunk.length * 4.5;
          lineIdx += chunk.length;
        }
      }
    }

    const safeName = product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    doc.save(`triton-datasheet-${safeName}.pdf`);
  };

  // Compute dynamic SEO metadata based on current state (category, search, or active product specs)
  let seoTitle = globalSeoTitle || "Triton Car Lifts & Premium Workshop Equipment Cape Town";
  let seoDescription = globalSeoDescription || "Top-quality 2-Post and 4-Post car lifts, down-draft spray booths, and specialized welding gear for professional garages in South Africa.";

  if (quickViewProduct) {
    seoTitle = quickViewProduct.seoTitle || `${quickViewProduct.name} - Dimensions & Technical Specs | car-lifts.co.za`;
    seoDescription = quickViewProduct.seoDescription || `Get absolute pricing, complete spec sheets, and engineering highlights for ${quickViewProduct.name}. Certified durability at car-lifts.co.za Cape Town.`;
  } else if (selectedCategory === 'car-lift') {
    if (searchQuery.toLowerCase().includes('2-post')) {
      seoTitle = "Professional 2-Post Car Lifts South Africa | car-lifts.co.za";
      seoDescription = "Durable 2-Post hydraulic vehicle lifters and hoisting solutions with dual manual side locks. Certified workshop safety at car-lifts.co.za Cape Town.";
    } else if (searchQuery.toLowerCase().includes('4-post')) {
      seoTitle = "Industrial 4-Post Car Lifts South Africa | car-lifts.co.za";
      seoDescription = "Heavy duty 4-Post standard and wheel-alignment hydraulic platforms for professional diagnostic centers and vehicle parking storage.";
    } else if (searchQuery.toLowerCase().includes('parking') || searchQuery.toLowerCase().includes('storage')) {
      seoTitle = "Secure Multi-Car Parking Storage Lifts | car-lifts.co.za";
      seoDescription = "Space-saving 2-Post vertical parking elevators and low-ceiling tilting lifts for home garages and commercial lots in South Africa.";
    } else {
      seoTitle = "Heavy-Duty Car Lifts & Parking Hoists Cape Town | car-lifts.co.za";
      seoDescription = "Premium certified 2-Post clear-floor hoists, tilting parking space-savers, and 4-Post structural vehicle ramps at car-lifts.co.za catalog.";
    }
  } else if (selectedCategory === 'spray-booth') {
    seoTitle = "High-Performance Down-Draft Heated Spray Booths | car-lifts.co.za";
    seoDescription = "Pristine heated-baking spray booths featuring EPS insulated walls and Italian Riello burner arrays. Industrial grade paint chambers.";
  } else if (selectedCategory === 'workshop-equipment') {
    seoTitle = "Premium Welding Machines & Workshop Gear South Africa | car-lifts.co.za";
    seoDescription = "Premium multi-MIG DC inverter welding stations, auto-darkening solar shielding helmets, and professional diagnostic thermometers.";
  }

  // Synchronize document.title, canonical URLs, meta tags and JSON-LD schema for all modern browsers
  useEffect(() => {
    // 1. Update Title
    document.title = seoTitle;

    // 2. Update Description Meta
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', seoDescription);

    // 3. Helper to update or create Open Graph and Twitter card tags
    const updateOrCreateMeta = (selector: string, attrName: string, attrVal: string, contentVal: string) => {
      let element = document.querySelector(selector);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attrName, attrVal);
        document.head.appendChild(element);
      }
      element.setAttribute('content', contentVal);
    };

    const currentUrl = window.location.href;
    const defaultImage = `${window.location.origin}/images/modern_workshop_car_lift_1780988724101.png`;
    const productImage = quickViewProduct && quickViewProduct.image 
      ? (quickViewProduct.image.startsWith('http') ? quickViewProduct.image : `${window.location.origin}${quickViewProduct.image}`) 
      : defaultImage;

    updateOrCreateMeta('meta[property="og:title"]', 'property', 'og:title', seoTitle);
    updateOrCreateMeta('meta[property="og:description"]', 'property', 'og:description', seoDescription);
    updateOrCreateMeta('meta[property="og:url"]', 'property', 'og:url', currentUrl);
    updateOrCreateMeta('meta[property="og:image"]', 'property', 'og:image', productImage);
    updateOrCreateMeta('meta[property="og:type"]', 'property', 'og:type', quickViewProduct ? 'product' : 'website');

    updateOrCreateMeta('meta[name="twitter:title"]', 'name', 'twitter:title', seoTitle);
    updateOrCreateMeta('meta[name="twitter:description"]', 'name', 'twitter:description', seoDescription);
    updateOrCreateMeta('meta[name="twitter:image"]', 'name', 'twitter:image', productImage);

    // 4. Update Canonical Link tag
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', currentUrl);

    // 5. Ingest JSON-LD Structured Data for Elite Google/Bing Search Performance
    let ldScript = document.getElementById('jsonld-seo');
    if (!ldScript) {
      ldScript = document.createElement('script');
      ldScript.setAttribute('id', 'jsonld-seo');
      ldScript.setAttribute('type', 'application/ld+json');
      document.head.appendChild(ldScript);
    }

    let schemaObject: any = {};

    if (quickViewProduct) {
      // Dynamic Product Page Rich Snippets Schema
      schemaObject = {
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": quickViewProduct.name,
        "image": [productImage],
        "description": quickViewProduct.description,
        "sku": quickViewProduct.modelCode || quickViewProduct.id,
        "mpn": quickViewProduct.modelCode || quickViewProduct.id,
        "brand": {
          "@type": "Brand",
          "name": "Triton"
        },
        "offers": {
          "@type": "Offer",
          "url": currentUrl,
          "priceCurrency": "ZAR",
          "price": quickViewProduct.price && quickViewProduct.price > 0 ? quickViewProduct.price : "0.00",
          "priceValidUntil": "2027-12-31",
          "itemCondition": "https://schema.org/NewCondition",
          "availability": quickViewProduct.inStock !== false ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          "seller": {
            "@type": "LocalBusiness",
            "name": "Triton Car Lifts & Premium Workshop Equipment Cape Town",
            "telephone": "+27215562413",
            "email": "info@car-lifts.co.za",
            "address": {
              "@type": "PostalAddress",
              "streetAddress": "14 Killarney Avenue, Killarney Gardens",
              "addressLocality": "Cape Town",
              "addressRegion": "Western Cape",
              "postalCode": "7441",
              "addressCountry": "ZA"
            },
            "geo": {
              "@type": "GeoCoordinates",
              "latitude": -33.828569,
              "longitude": 18.531859
            },
            "hasMap": "https://maps.google.com/?q=-33.828569,18.531859"
          }
        },
        "category": quickViewProduct.category,
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": -33.828569,
          "longitude": 18.531859
        },
        "hasMap": "https://maps.google.com/?q=-33.828569,18.531859"
      };
    } else {
      // Local Business / Commercial Shop Rich Snippets Schema
      schemaObject = {
        "@context": "https://schema.org",
        "@type": "AutomotiveBusiness",
        "name": "Triton Car Lifts & Premium Workshop Equipment Cape Town",
        "alternateName": "Triton Car Lifts SA",
        "url": window.location.origin,
        "logo": productImage,
        "image": defaultImage,
        "description": seoDescription,
        "telephone": "+27215562413",
        "email": "info@car-lifts.co.za",
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "14 Killarney Avenue, Killarney Gardens",
          "addressLocality": "Cape Town",
          "addressRegion": "Western Cape",
          "postalCode": "7441",
          "addressCountry": "ZA"
        },
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": -33.828569,
          "longitude": 18.531859
        },
        "hasMap": "https://maps.google.com/?q=-33.828569,18.531859",
        "openingHoursSpecification": [
          {
            "@type": "OpeningHoursSpecification",
            "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
            "opens": "08:00",
            "closes": "17:00"
          },
          {
            "@type": "OpeningHoursSpecification",
            "dayOfWeek": "Saturday",
            "opens": "09:00",
            "closes": "13:00"
          }
        ],
        "sameAs": [
          "https://www.facebook.com/tritoncar-lifts",
          "https://car-lifts.co.za"
        ],
        "priceRange": "ZAR"
      };
    }

    ldScript.textContent = JSON.stringify(schemaObject);
  }, [seoTitle, seoDescription, quickViewProduct]);

  const isTourEnabled = safeLocalStorage.getItem('showroom_walkthrough_enabled') !== 'false';

  const isAdminAuthenticated = () => {
    if (typeof window === 'undefined') return false;
    return (
      currentView === 'admin' ||
      window.location.hash === '#admin' ||
      window.location.search.includes('admin') ||
      safeSessionStorage.getItem('admin_authenticated') === 'true'
    );
  };

  // If maintenance mode is ON and visitor is not authenticated as administrator, show maintenance page
  if (maintenanceMode && !isAdminAuthenticated()) {
    return (
      <MaintenancePage
        onAdminAccess={() => {
          window.location.hash = '#admin';
          setCurrentView('admin');
        }}
      />
    );
  }

  if (currentView === 'admin') {
    return (
      <div className="w-full min-h-screen">
        <title>WooCommerce Sync Terminal - Triton Car Lifts & Premium Workshop Equipment</title>
        <WordPressConsole 
          isFullPage={true} 
          onBackToShop={() => { window.location.hash = ''; setCurrentView('store'); }} 
          products={products}
          onProductsChange={handleProductsChange}
          featuredCategories={featuredCategories}
          onFeaturedCategoriesChange={handleFeaturedCategoriesChange}
          theme={theme}
          onThemeChange={handleThemeChange}
          globalSeoTitle={globalSeoTitle}
          onGlobalSeoTitleChange={setGlobalSeoTitle}
          globalSeoDescription={globalSeoDescription}
          onGlobalSeoDescriptionChange={setGlobalSeoDescription}
          onCategoryClick={handleCategoryClick}
          maintenanceMode={maintenanceMode}
          onMaintenanceModeChange={(mode) => setMaintenanceMode(mode)}
        />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen">
      <title>{seoTitle}</title>
      <meta name="description" content={seoDescription} />

      {/* Maintenance Mode Admin Notice Sticky Banner */}
      {maintenanceMode && (
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-black px-4 py-2 font-sans flex items-center justify-between shadow-lg sticky top-0 z-[120] border-b border-amber-700/50">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-black uppercase tracking-wide">
            <span className="w-2.5 h-2.5 rounded-full bg-black animate-ping shrink-0"></span>
            <span>MAINTENANCE MODE IS ACTIVE — Regular visitors see the maintenance screen. You have admin access.</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                window.location.hash = '#admin';
                setCurrentView('admin');
              }}
              className="px-2.5 py-1 bg-black text-white text-xs font-black uppercase rounded hover:bg-neutral-900 transition-colors cursor-pointer"
            >
              Admin Console
            </button>
            <button
              onClick={async () => {
                setMaintenanceMode(false);
                safeLocalStorage.setItem('triton_maintenance_mode', 'false');
                try {
                  await syncCatalogToServer(products, featuredCategories, undefined, false);
                } catch (e) {}
              }}
              className="px-2.5 py-1 bg-white/40 hover:bg-white/60 text-black text-xs font-black uppercase rounded transition-colors cursor-pointer"
              title="Instantly turn off maintenance mode"
            >
              Turn Off
            </button>
          </div>
        </div>
      )}

      <div className={`min-h-screen flex flex-col font-sans transition-all duration-300 antialiased ${theme === 'inospace' ? 'bg-[#f4f5f6] text-neutral-900' : 'bg-[#0a0a0a] text-neutral-200'}`}>
      
      {/* Dynamic Header */}
      <Header
        cart={cart}
        setIsCartOpen={setIsCartOpen}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        onOpenAbout={() => setAboutModalOpen(true)}
        onOpenContact={() => setContactModalOpen(true)}
        onOpenFaq={() => setFaqModalOpen(true)}
        products={products}
        onSelectProduct={(p) => {
          setQuickViewProduct(p);
          setActiveImageIndex(0);
        }}
        language={language}
        onLanguageChange={handleLanguageChange}
        theme={theme}
        onThemeChange={handleThemeChange}
        compareList={compareList}
        onOpenCompare={() => setIsCompareOpen(true)}
        onOpenAssistant={() => setIsAssistantOpen(true)}
        wishlist={wishlist}
        onOpenWishlist={() => setIsWishlistOpen(true)}
      />

      {/* CORE HERO SECTION */}
      <section className="relative text-white py-24 md:py-32 border-b border-neutral-900 overflow-hidden flex items-center min-h-[85vh]">
          {/* High-fidelity custom-generated Hero Banner of premium garage equipment */}
          <div className="absolute inset-0 w-full h-full z-0 overflow-hidden bg-neutral-950">
            <CategoryPreviewImage 
              src="/assets/images/garage_equipment_welder_hero_1783939957746.jpg" 
              alt="Triton Premium Garage Equipment Hero" 
              className="absolute inset-0 w-full h-full object-cover opacity-70 filter brightness-[0.45] contrast-[1.05] transition-transform duration-1000 hover:scale-105"
            />
            {/* Ambient gradients for text contrast */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-black/45"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/50"></div>
          </div>

          <div className="max-w-4xl mx-auto px-4 relative z-10 flex flex-col items-center justify-center w-full text-center mt-8">
            <span className="text-neutral-300 font-sans font-medium text-xs tracking-[0.3em] inline-flex items-center gap-2 mb-6">
              <Sparkles size={12} className="text-white text-opacity-80 animate-pulse" />
              {t[language].south_africa_tag}
            </span>
            <h1 className="text-5xl md:text-7xl font-light tracking-tight leading-tight text-white mb-6">
              {language === 'en' ? (
                <>Premium <span className="font-medium text-white">Garage Equipment.</span></>
              ) : (
                <>Premium <span className="font-medium text-white">Motorhawe-Toerusting.</span></>
              )}
            </h1>
            <p className="text-lg md:text-xl text-neutral-300 leading-relaxed max-w-2xl font-light">
              {t[language].hero_desc}
            </p>

            {/* Action shortcuts */}
            <div className="flex flex-col sm:flex-row gap-4 mt-12 w-full justify-center font-sans">
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setSearchQuery('');
                  const el = document.getElementById('product-segment-anchor');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`px-8 py-4 ${theme === 'inospace' ? 'bg-[#e31b23] hover:bg-[#c2141b] rounded-none' : 'bg-[#1e3a5f] hover:bg-[#152a45]'} text-white text-sm font-medium tracking-widest transition-all cursor-pointer uppercase`}
              >
                {t[language].shop_now} {theme === 'inospace' ? '»' : ''}
              </button>
              <button
                onClick={() => setIsAssistantOpen(true)}
                className="px-8 py-4 bg-[#ff0000] hover:bg-[#cc0000] text-white text-sm font-medium tracking-widest transition-all cursor-pointer uppercase flex items-center justify-center gap-2 shadow-lg"
              >
                <Bot size={18} />
                {language === 'af' ? 'Vra AI Assistent' : 'Ask AI Assistant'}
              </button>
              <button
                onClick={() => setIsCartOpen(true)}
                className={`px-8 py-4 bg-transparent hover:bg-neutral-900/50 border border-white text-white text-sm font-medium tracking-widest transition-all cursor-pointer uppercase backdrop-blur-sm ${theme === 'inospace' ? 'rounded-none border-red-500 hover:border-red-600' : ''}`}
              >
                {t[language].request_quote} {theme === 'inospace' ? '»' : ''}
              </button>
            </div>


            
             {/* Small scroll indicator */}
             <div className="mt-20 md:mt-24 text-neutral-500">
               <span className="text-[10px] uppercase tracking-widest block mb-4 opacity-50">Scroll to Explore</span>
               <div className="w-px h-16 bg-gradient-to-b from-neutral-500 to-transparent mx-auto"></div>
             </div>
          </div>
        </section>

      {/* FEATURED CATEGORIES SECTION */}
      <section className="bg-white py-20 px-4">
        <div className="w-full text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-[#333333] mb-4">{t[language].featured_categories_title}</h2>
          <p className="text-[#666666] text-lg max-w-2xl mx-auto">{t[language].featured_categories_subtitle}</p>
        </div>
        <div className="w-full grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-6">
          {featuredCategories.map((cat, idx) => {
            return (
              <div 
                key={cat.id ? `${cat.id}-${idx}` : `cat-${idx}`} 
                onClick={() => handleCategoryClick(cat.name)}
                className={`group cursor-pointer text-center flex flex-col items-center relative ${cat.status === 'draft' ? 'opacity-60' : ''}`}
              >
                <div className="w-full aspect-square bg-white overflow-hidden mb-3 shadow-xs hover:shadow-md border border-[#e0e0e0] flex items-center justify-center p-3 rounded group-hover:border-[#ff0000] transition-colors duration-300 relative">
                  {cat.status === 'draft' && (
                    <span className="absolute top-2 right-2 bg-amber-500 text-white text-[8px] font-mono font-bold px-1.5 py-0.5 rounded shadow-sm z-10 animate-pulse">
                      DRAFT
                    </span>
                  )}
                  <CategoryPreviewImage 
                    src={cat.img} 
                    alt={cat.name} 
                    className="max-h-full max-w-full object-contain opacity-95 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" 
                  />
                </div>
                <h3 className="text-xs font-extrabold uppercase tracking-wide text-[#1e3a5f] group-hover:text-[#ff0000] transition-colors leading-tight min-h-[36px] flex items-center justify-center line-clamp-3 px-1">
                  <span>{getCategoryDisplayName(cat.name)}</span>
                  {cat.status === 'draft' && (
                    <span className="text-amber-600 font-mono text-[9px] font-semibold lowercase ml-1">
                      (draft)
                    </span>
                  )}
                </h3>
              </div>
            );
          })}
        </div>
      </section>



      {/* WHY CHOOSE US SECTION */}
      <section className="bg-[#f5f5f5] py-20 px-4 border-y border-[#e0e0e0]">
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-12 text-center md:text-left">
          <div className="flex flex-col items-center md:items-start">
            <div className="w-20 h-20 bg-[#1e3a5f]/10 rounded-full flex items-center justify-center text-[#1e3a5f] mb-6">
              <Award size={40} strokeWidth={1.5} />
            </div>
            <h4 className="text-xl font-bold text-[#333333] mb-3">
              {language === 'en' ? 'Certified & Compliant' : 'Gesertifiseer & Voldoenend'}
            </h4>
            <p className="text-sm text-[#666666] leading-relaxed">
              {language === 'en' 
                ? 'All our car lifts meet CE safety standards and comply with strict national regulations. Each unit comes with certified documentation.'
                : 'Al ons motorlifte voldoen aan CE-veiligheidstandaarde en streng nasionale regulasies. Elke eenheid kom met gesertifiseerde dokumentasie.'}
            </p>
          </div>
          <div className="flex flex-col items-center md:items-start">
            <div className="w-20 h-20 bg-[#1e3a5f]/10 rounded-full flex items-center justify-center text-[#1e3a5f] mb-6">
              <Building2 size={40} strokeWidth={1.5} />
            </div>
            <h4 className="text-xl font-bold text-[#333333] mb-3">{t[language].expert_installation}</h4>
            <p className="text-sm text-[#666666] leading-relaxed">{t[language].expert_installation_desc}</p>
          </div>
          <div className="flex flex-col items-center md:items-start">
            <div className="w-20 h-20 bg-[#1e3a5f]/10 rounded-full flex items-center justify-center text-[#1e3a5f] mb-6">
              <ShieldCheck size={40} strokeWidth={1.5} />
            </div>
            <h4 className="text-xl font-bold text-[#333333] mb-3">{t[language].support_24_7}</h4>
            <p className="text-sm text-[#666666] leading-relaxed">{t[language].support_24_7_desc}</p>
          </div>
        </div>
      </section>

      {/* COMPREHENSIVE INTERACTIVE PRODUCT SHOWROOM & CATALOG */}
      <section id="product-segment-anchor" className="bg-[#fcfcfc] py-24 px-4 border-t border-neutral-200">
        <div className="w-full">
          
          {/* Header Area */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12 pb-6 border-b border-neutral-100">
            <div>
              <h2 className="text-3xl md:text-5xl font-black text-[#1a1a1a] tracking-tight">
                {t[language].our_equipment_catalog}
              </h2>
              <p className="text-sm text-[#666666] mt-2 max-w-xl">
                {t[language].browse_comprehensive}
              </p>
            </div>
            
            {/* Live Search, Sorting and Counts */}
            <div className="w-full md:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t[language].quick_search}
                  className="w-full sm:w-60 bg-white text-sm px-4 py-2.5 pr-10 border border-[#e0e0e0] rounded focus:outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f] transition-all font-sans placeholder-[#999999] text-gray-950"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 font-bold"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Sorting Filter Selector */}
              <div className="relative flex items-center bg-white border border-[#e0e0e0] rounded px-3 py-2 text-sm font-sans text-gray-950 focus-within:border-[#1e3a5f] transition-all">
                <span className="text-[10px] text-neutral-400 font-extrabold uppercase mr-1.5 shrink-0 select-none tracking-wider">{t[language].sort_by}:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent focus:outline-none text-xs font-bold cursor-pointer text-slate-800 pr-4 outline-none border-0 py-0.5"
                >
                  <option value="default">{t[language].sort_default}</option>
                  <option value="price-low-high">{t[language].sort_price_low_high}</option>
                  <option value="price-high-low">{t[language].sort_price_high_low}</option>
                  <option value="newest">{t[language].sort_newest}</option>
                </select>
                <span className="absolute right-2 pointer-events-none text-[#999999] text-[10px]">▼</span>
              </div>

              <span className="text-xs text-[#999999] font-mono bg-[#f5f5f5] px-3 py-2.5 rounded border border-[#e0e0e0] text-center shrink-0">
                {filteredProducts.length} {t[language].results}
              </span>

              {/* Compare Matrix Button */}
              <button
                id="catalog-compare-matrix-btn"
                onClick={() => setIsCompareOpen(true)}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 ${
                  compareList.length > 0
                    ? 'bg-[#ff0000] text-white border-[#ff0000]'
                    : 'bg-white text-neutral-800 border-[#e0e0e0] hover:bg-neutral-50'
                } border rounded text-xs font-bold uppercase tracking-wider transition-all shadow-xs cursor-pointer shrink-0`}
                title={language === 'af' ? 'Oop Vergelykingsmatriks' : 'Open Comparison Matrix'}
              >
                <ArrowLeftRight size={14} className={compareList.length > 0 ? 'text-white' : 'text-[#ff0000]'} />
                <span>{language === 'af' ? 'Vergelyk Matriks' : 'Compare Matrix'}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                  compareList.length > 0 ? 'bg-white text-[#ff0000]' : 'bg-neutral-100 text-neutral-700'
                }`}>
                  {compareList.length}
                </span>
              </button>
            </div>
          </div>

          {/* Filtering Category Tab Pills */}
          <div className="flex flex-wrap items-center gap-2 mb-10">
            {(() => {
              const dropdownSummaryCategories = [
                { id: 'all-equipment', name: 'ALL EQUIPMENT' },
                ...featuredCategories
              ];

              return dropdownSummaryCategories.map((tab) => {
                const isActive = activeCategoryTab.toUpperCase() === tab.name.toUpperCase();
                const label = getCategoryDisplayName(tab.name);

                return (
                  <button
                    key={tab.id || tab.name}
                    onClick={() => handleCategoryClick(tab.name)}
                    className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      isActive 
                        ? theme === 'inospace' 
                          ? 'bg-[#e31b23] text-white font-extrabold rounded-none shadow-md' 
                          : 'bg-[#1e3a5f] text-white shadow-sm font-extrabold rounded-md' 
                        : theme === 'inospace' 
                          ? 'bg-neutral-800 text-neutral-300 hover:text-white hover:bg-[#e31b23] rounded-none' 
                          : 'bg-[#f5f5f5] text-[#333333] hover:text-[#ff0000] hover:bg-[#e0e0e0] rounded-md'
                    }`}
                  >
                    {label} {isActive && theme === 'inospace' ? '»' : ''}
                  </button>
                );
              });
            })()}
          </div>



          {/* Empty Results Case */}
          {filteredProducts.length === 0 ? (
            <div className="text-center py-20 bg-white border border-dashed border-[#e0e0e0] rounded-lg">
              <p className="text-[#666666] mb-4 text-base font-sans">{t[language].no_machines_match}</p>
              <button 
                onClick={() => { setSelectedCategory('all'); setSearchQuery(''); }}
                className="px-5 py-2 bg-[#1e3a5f] hover:bg-[#152a45] text-white text-xs font-bold uppercase tracking-wider rounded transition-colors cursor-pointer"
              >
                {t[language].reset_all_filters}
              </button>
            </div>
          ) : (
            <>
              {/* Product Showroom Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.slice(0, visibleCount).map((product, idx) => (
                  <motion.div 
                    key={product.id} 
                    id={`product-card-${product.id}`}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ 
                      duration: 0.6, 
                      ease: [0.25, 1, 0.5, 1], 
                      delay: Math.min((idx % 4) * 0.05, 0.25)
                    }}
                    className={`bg-white p-4 border border-[#e0e0e0] shadow-sm hover:shadow-xl hover:border-neutral-350 transition-all duration-300 group flex flex-col h-full ${theme === 'inospace' ? 'rounded-none border-neutral-300' : 'rounded-md'}`}
                  >
                    {/* Visual Stage */}
                    <div 
                      onClick={() => setQuickViewProduct(product)}
                      title="Click to view specifications"
                      className={`relative aspect-square bg-[#f8f8f8] mb-4 overflow-hidden border border-neutral-100 cursor-pointer hover:opacity-95 transition-opacity group/stage ${theme === 'inospace' ? 'rounded-none' : 'rounded-md'}`}
                    >
                      <span className={`absolute top-2 left-2 ${theme === 'inospace' ? 'bg-[#e31b23]' : 'bg-[#1e3a5f]'} text-white text-[9px] font-extrabold px-2.5 py-1 uppercase tracking-widest z-10 max-w-[85%] truncate shadow-sm ${theme === 'inospace' ? 'rounded-none' : 'rounded'}`}>
                        {getCategoryDisplayName(getProductCategoryName(product))}
                      </span>
                      {(() => {
                        const bType = product.badgeType || (product.inStock !== false ? 'instock' : 'backorder');
                        if (bType === 'instock') {
                          return (
                            <span className={`absolute top-2 right-2 bg-emerald-600 text-white text-[9px] font-extrabold px-2 py-0.5 tracking-wide z-10 uppercase ${theme === 'inospace' ? 'rounded-none' : 'rounded'}`}>
                              S.A. Stock
                            </span>
                          );
                        } else if (bType === 'backorder') {
                          return (
                            <span className={`absolute top-2 right-2 bg-amber-600 text-white text-[9px] font-extrabold px-2 py-0.5 tracking-wide z-10 uppercase ${theme === 'inospace' ? 'rounded-none' : 'rounded'}`}>
                              Back Order
                            </span>
                          );
                        } else if (bType === 'leadtime_24_48') {
                          return (
                            <span className={`absolute top-2 right-2 bg-blue-600 text-white text-[9px] font-extrabold px-2 py-0.5 tracking-wide z-10 uppercase ${theme === 'inospace' ? 'rounded-none' : 'rounded'}`}>
                              24-48hr Lead
                            </span>
                          );
                        } else if (bType === 'leadtime_custom') {
                          return (
                            <span className={`absolute top-2 right-2 bg-purple-600 text-white text-[9px] font-extrabold px-2 py-0.5 tracking-wide z-10 uppercase ${theme === 'inospace' ? 'rounded-none' : 'rounded'}`}>
                              {product.leadTimeValue || 'Lead Time'}
                            </span>
                          );
                        }
                        return null;
                      })()}
                      
                      {/* Floating Action Buttons */}
                      <div className="absolute bottom-2.5 right-2.5 z-20 flex items-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleWishlist(product);
                          }}
                          className={`p-2 rounded-full transition-all duration-300 shadow-md hover:scale-110 flex items-center justify-center cursor-pointer ${
                            wishlist.some(w => w.id === product.id)
                              ? 'bg-[#ff0000] text-white opacity-100'
                              : 'bg-black/75 text-white/80 hover:text-white hover:bg-black/90 opacity-0 group-hover:opacity-100'
                          }`}
                          title={wishlist.some(w => w.id === product.id) ? "Remove from Saved Wishlist" : "Save to Wishlist"}
                        >
                          <Heart size={14} className={wishlist.some(w => w.id === product.id) ? 'fill-current' : ''} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const filename = `${product.id || 'product'}-image.jpg`;
                            const link = document.createElement('a');
                            link.href = product.image;
                            link.download = filename;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                          className={`bg-black/75 hover:bg-emerald-600 text-white p-2 rounded-full transition-all duration-300 shadow-md hover:scale-110 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer`}
                          title="Save/Download Product Image"
                        >
                          <Download size={14} className="stroke-[2.5]" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setZoomImageUrl(product.image);
                          }}
                          className={`bg-black/75 ${theme === 'inospace' ? 'hover:bg-[#e31b23]' : 'hover:bg-[#ff0000]'} text-white p-2 rounded-full transition-all duration-300 shadow-md hover:scale-110 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer`}
                          title="Quick Zoom View"
                        >
                          <ZoomIn size={14} className="stroke-[2.5]" />
                        </button>
                      </div>

                      <ResponsiveImage
                        src={product.image}
                        alt={product.name}
                        className="group-hover/stage:scale-105 transition-transform duration-500"
                        aspectRatioClassName="aspect-square"
                        showFitToggle={false}
                      />
                    </div>

                    {/* Meta Identifiers */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className={`text-[10px] font-mono text-[#999999] tracking-wider uppercase bg-[#f5f5f5] px-2 py-0.5 border border-[#e0e0e0] ${theme === 'inospace' ? 'rounded-none' : 'rounded'}`}>
                        {product.modelCode}
                      </span>
                      <span className={`text-[11px] ${theme === 'inospace' ? 'text-[#e31b23]' : 'text-[#ff0000]'} font-bold uppercase tracking-widest max-w-[65%] truncate text-right`}>
                        {getCategoryDisplayName(getProductCategoryName(product))}
                      </span>
                    </div>

                    {/* Product Typography descriptions */}
                    <h3 className={`text-sm font-bold text-[#1a1a1a] leading-snug line-clamp-2 h-10 mb-2 ${theme === 'inospace' ? 'group-hover:text-[#e31b23]' : 'group-hover:text-[#ff0000]'} transition-colors`}>{product.name}</h3>
                    <p className="text-xs text-[#666666] line-clamp-3 mb-4 leading-relaxed flex-grow">
                      {stripHtml(product.description)}
                    </p>

                    {/* Pricing removed per user request */}

                    {/* Integrated CTA Button Group */}
                    <div className="mt-auto flex flex-col gap-2">
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={() => setQuickViewProduct(product)} 
                          className={`py-2 bg-neutral-900 text-white ${theme === 'inospace' ? 'hover:bg-[#e31b23] rounded-none' : 'hover:bg-[#ff0000] rounded-md'} text-[11px] font-bold uppercase transition-all tracking-wider cursor-pointer`}
                        >
                          {t[language].view_specifications}
                        </button>
                        <button
                          onClick={() => handleToggleCompare(product)}
                          className={`py-2 px-2 border transition-colors flex items-center justify-center gap-1 font-bold text-[11px] uppercase cursor-pointer ${
                            compareList.some(cp => cp.id === product.id)
                              ? 'bg-[#ff0000] border-[#ff0000] text-white'
                              : 'bg-neutral-100 text-neutral-800 border-neutral-300 hover:bg-neutral-200'
                          } ${theme === 'inospace' ? 'rounded-none' : 'rounded-md'}`}
                          title={compareList.some(cp => cp.id === product.id) ? 'Remove from compare matrix' : 'Add to compare matrix'}
                        >
                          <ArrowLeftRight size={12} />
                          <span className="truncate">{compareList.some(cp => cp.id === product.id) ? (language === 'af' ? 'Gekies' : 'In Compare') : (language === 'af' ? 'Vergelyk' : 'Compare')}</span>
                        </button>
                      </div>
                      
                      <button 
                        onClick={() => handleAddToCart(product)} 
                        className={`w-full py-2 ${theme === 'inospace' ? 'bg-[#e31b23] hover:bg-[#c2141b] rounded-none' : 'bg-[#1e3a5f] hover:bg-[#152a45] rounded-md'} text-white text-xs font-bold uppercase transition-colors tracking-wider flex items-center justify-center gap-1.5 cursor-pointer`}
                      >
                        <span>{t[language].add_to_quote}</span>
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Load More Pagination Selector */}
              {filteredProducts.length > visibleCount && (
                <div className="flex justify-center mt-12 pt-6 border-t border-neutral-150">
                  <button
                    onClick={() => setVisibleCount(counter => counter + 12)}
                    className={`px-8 py-3.5 bg-white hover:bg-[#f5f5f5] ${theme === 'inospace' ? 'text-[#e31b23] hover:text-[#c2141b] rounded-none' : 'text-[#1e3a5f] hover:text-[#ff0000] rounded'} border border-[#e0e0e0] hover:border-neutral-350 text-xs font-bold uppercase tracking-widest transition-all shadow-xs cursor-pointer inline-flex items-center gap-2`}
                  >
                    <span>{t[language].load_more_equipment}</span>
                    <ChevronDown size={14} className="mt-0.5" />
                  </button>
                </div>
              )}
            </>
          )}

        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section className="bg-[#1a1a1a] text-white py-20 px-4">
        <div className="w-full">
          <h2 className="text-3xl md:text-5xl font-bold mb-16 text-center md:text-left">{t[language].how_we_work}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="relative">
              <span className="text-6xl font-bold text-[#1e3a5f] opacity-50 absolute -top-10 -left-4">01</span>
              <h4 className="text-xl font-bold mb-4 relative z-10">{t[language].browse_compare}</h4>
              <p className="text-sm font-light text-neutral-300 leading-relaxed relative z-10 mb-4">{t[language].browse_compare_desc}</p>
              <button
                onClick={() => setIsCompareOpen(true)}
                className="relative z-10 inline-flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-[#ff0000] text-white text-xs font-bold uppercase tracking-wider rounded border border-neutral-700 transition-colors cursor-pointer shadow-md"
              >
                <ArrowLeftRight size={14} />
                {language === 'af' ? 'Oop Vergelyk Matriks' : 'Open Compare Matrix'} ({compareList.length})
              </button>
            </div>
            <div className="relative">
              <span className="text-6xl font-bold text-[#1e3a5f] opacity-50 absolute -top-10 -left-4">02</span>
              <h4 className="text-xl font-bold mb-4 relative z-10">{t[language].get_expert_advice}</h4>
              <p className="text-sm font-light text-neutral-300 leading-relaxed relative z-10 mb-4">{t[language].get_expert_advice_desc}</p>
              <button
                onClick={() => setIsAssistantOpen(true)}
                className="relative z-10 inline-flex items-center gap-2 px-4 py-2 bg-[#ff0000] hover:bg-[#cc0000] text-white text-xs font-bold uppercase tracking-wider rounded transition-colors cursor-pointer shadow-md"
              >
                <Bot size={15} />
                {language === 'af' ? 'Praat Met AI Assistent' : 'Ask Product AI Assistant'}
              </button>
            </div>
            <div className="relative">
              <span className="text-6xl font-bold text-[#1e3a5f] opacity-50 absolute -top-10 -left-4">03</span>
              <h4 className="text-xl font-bold mb-4 relative z-10">{t[language].install_enjoy}</h4>
              <p className="text-sm font-light text-neutral-300 leading-relaxed relative z-10">{t[language].install_enjoy_desc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS SECTION */}
      <section className="bg-white py-20 px-4">
        <div className="w-full">
          <div className="text-center md:text-left mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-[#333333] mb-4">{t[language].trusted_by}</h2>
            <p className="text-lg text-[#666666]">{t[language].see_what_customers}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                text_en: "Best car lifts we've purchased. Installation was smooth and the team was professional from start to finish.",
                text_af: "Die beste motorlifte wat ons nog gekoop het. Installasie het seepglad verloop en die span was professioneel van begin tot einde.",
                author: "Mike Ross",
                title_en: "Workshop Manager, Cape Town",
                title_af: "Werkswinkelbestuurder, Kaapstad"
              },
              {
                text_en: "Upgraded our entire facility with Nutec lifts. Excellent build quality, zero issues so far. Highly recommend the 2-post line.",
                text_af: "Ons hele werkswinkel met Nutec-lifte opgegradeer. Uitstekende gehalte, geen probleme tot dusver. Beveel die 2-kolom reeks sterk aan.",
                author: "Sarah Jenkins",
                title_en: "Fleet Director, Gauteng",
                title_af: "Vlootdirekteur, Gauteng"
              },
              {
                text_en: "Support team is top notch. Had a minor electrical query on a Saturday and they sorted it out via phone in 5 minutes.",
                text_af: "Die ondersteuningspan is uitstaande. Saterdag 'n klein elektriese navraag gehad en hulle het dit binne 5 minute oor die foon opgelos.",
                author: "David Nxumalo",
                title_en: "Auto Repair Shop Owner, KZN",
                title_af: "Motorherstelwerk-Eienaar, KZN"
              }
            ].map((review, idx) => (
              <div key={idx} className="bg-[#f5f5f5] p-8 border border-[#e0e0e0]">
                <div className="text-[#f59e0b] mb-4 flex gap-1">
                  {"★★★★★".split("").map((star, i) => <span key={i}>{star}</span>)}
                </div>
                <p className="text-[#333333] italic mb-6 leading-relaxed">
                  "{language === 'en' ? review.text_en : review.text_af}"
                </p>
                <div>
                  <h4 className="text-base font-bold text-[#333333]">{review.author}</h4>
                  <p className="text-sm text-[#666666]">
                    {language === 'en' ? review.title_en : review.title_af}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NEWSLETTER SIGNUP SECTION */}
      <section className={`${theme === 'inospace' ? 'bg-[#e31b23]' : 'bg-[#1e3a5f]'} py-16 px-4 transition-colors duration-300`}>
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex-1 flex gap-6 items-center">
            <div className={`w-16 h-16 bg-white/10 ${theme === 'inospace' ? 'rounded-none' : 'rounded'} flex items-center justify-center shrink-0`}>
               <Send size={32} className="text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">{t[language].stay_updated}</h3>
              <p className="text-sm text-blue-100">{t[language].newsletter_desc}</p>
            </div>
          </div>
          <div className="flex-1 w-full flex">
            <input 
              type="email" 
              placeholder={t[language].enter_your_email}
              className={`flex-grow px-6 py-4 bg-white text-[#333333] outline-none ${theme === 'inospace' ? 'rounded-none' : ''}`}
            />
            <button className={`${theme === 'inospace' ? 'bg-neutral-900 hover:bg-neutral-950 rounded-none' : 'bg-[#0f1d2f] hover:bg-[#0a1420]'} px-8 py-4 text-white font-bold uppercase transition-colors shrink-0`}>
              {t[language].subscribe}
            </button>
          </div>
        </div>
      </section>

      {/* CORE SPECIFICATIONS DETAIL OVERLAY DIALOG */}
      {quickViewProduct && (
        <div className="fixed inset-0 z-110 flex items-center justify-center p-4">
          {/* backdrop */}
          <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs" onClick={() => setQuickViewProduct(null)} />
          
          {/* Card dialog contents */}
          <div className="relative bg-white rounded-3xl w-[80%] max-w-[80%] overflow-hidden shadow-2xl z-10 border border-slate-200 animate-scale-up max-h-[90vh] flex flex-col">
            
            {/* Header banner */}
            <div className="bg-gradient-to-r from-blue-900 to-blue-950 text-white p-5 flex justify-between items-center border-b border-blue-950 shrink-0">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono uppercase bg-orange-500 text-white px-2.5 py-1 rounded font-extrabold">{quickViewProduct.modelCode}</span>
                  <span className="text-xs font-mono uppercase bg-blue-600 text-white px-2.5 py-1 rounded font-extrabold">
                    {quickViewProduct.category === 'car-lift' ? 'Car Lift' : quickViewProduct.category === 'spray-booth' ? 'Spray Booth' : quickViewProduct.category.replace('-', ' ')}
                  </span>
                </div>
                <h3 className="font-bold text-base sm:text-xl tracking-tight capitalize mt-1.5 text-white">{quickViewProduct.name} Specs Sheet</h3>
              </div>
              <button
                onClick={() => setQuickViewProduct(null)}
                className="p-1.5 px-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Contents body */}
            <div className="p-8 overflow-y-auto space-y-6">
              
              {/* Image & Main description with Interactive Thumbnails */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                <div className="flex flex-col gap-3.5">
                  {/* Main Display Frame with Zoom Trigger */}
                  <div 
                    onClick={(e) => {
                      if (hasDraggedQv) {
                        e.preventDefault();
                        e.stopPropagation();
                        return;
                      }
                      setZoomImageUrl(getProductImages(quickViewProduct!)[activeImageIndex]);
                    }}
                    onTouchStart={handleQvTouchStart}
                    onTouchMove={handleQvTouchMove}
                    onTouchEnd={handleQvTouchEnd}
                    onMouseDown={handleQvMouseDown}
                    onMouseMove={handleQvMouseMove}
                    onMouseUp={handleQvMouseUp}
                    onMouseLeave={() => setQvDragStart(null)}
                    className="relative aspect-[4/3] bg-slate-900 rounded-xl overflow-hidden shadow-xs border border-slate-200 cursor-zoom-in group select-none touch-pan-y"
                    title="Click for full-screen Quick Zoom or Drag/Swipe Left or Right"
                  >
                    <ResponsiveImage 
                      src={getProductImages(quickViewProduct!)[activeImageIndex]} 
                      alt={quickViewProduct.name} 
                      className="group-hover:scale-[1.03] transition-transform duration-500 pointer-events-none" 
                      aspectRatioClassName="aspect-[4/3]"
                      showFitToggle={true}
                    />
                    {/* Save/Download Image Button in Quick View */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const currentImg = getProductImages(quickViewProduct!)[activeImageIndex];
                        const filename = `${quickViewProduct!.id || 'product'}-image-${activeImageIndex + 1}.jpg`;
                        const link = document.createElement('a');
                        link.href = currentImg;
                        link.download = filename;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      className="absolute top-2.5 left-2.5 z-20 p-1.5 rounded-lg bg-black/75 hover:bg-emerald-600/90 text-white font-mono text-[9px] font-bold uppercase tracking-wider border border-neutral-800 transition-all hover:scale-105 active:scale-95 shadow flex items-center gap-1 cursor-pointer"
                      title="Save / Download this Image file to Disk"
                    >
                      <Download size={10} />
                      <span>Save Image</span>
                    </button>
                    {/* Hover Zoom HUD */}
                    <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
                      <span className="bg-black/75 backdrop-blur-xs px-4 py-2 rounded-full text-white text-xs sm:text-sm font-bold tracking-wider uppercase flex items-center gap-1.5 shadow">
                        <ZoomIn size={15} strokeWidth={2.5} />
                        Quick Zoom
                      </span>
                    </div>

                    {/* Gallery Navigation Arrows inside Quick View */}
                    {(() => {
                      const images = getProductImages(quickViewProduct!);
                      if (images.length <= 1) return null;
                      return (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveImageIndex(prev => (prev > 0 ? prev - 1 : images.length - 1));
                            }}
                            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/60 hover:bg-black/90 text-white rounded-full transition-all opacity-0 group-hover:opacity-100 flex items-center justify-center shadow-lg hover:scale-110 cursor-pointer"
                            title="Previous Image"
                          >
                            <ChevronLeft size={16} strokeWidth={2.5} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveImageIndex(prev => (prev < images.length - 1 ? prev + 1 : 0));
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/60 hover:bg-black/90 text-white rounded-full transition-all opacity-0 group-hover:opacity-100 flex items-center justify-center shadow-lg hover:scale-110 cursor-pointer"
                            title="Next Image"
                          >
                            <ChevronRight size={16} strokeWidth={2.5} />
                          </button>
                        </>
                      );
                    })()}
                  </div>

                  {/* Up to 5 Thumbnails strips */}
                  <div className="grid grid-cols-5 gap-2">
                    {getProductImages(quickViewProduct!).map((thumb, idx) => {
                      const isActive = activeImageIndex === idx;
                      return (
                        <button
                          key={idx}
                          id={`quickview-thumb-${idx}`}
                          onClick={() => setActiveImageIndex(idx)}
                          className={`aspect-square bg-slate-100 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                            isActive 
                              ? 'border-[#ff0000] scale-95 shadow-sm brightness-100' 
                              : 'border-slate-200 hover:border-slate-400 brightness-90 hover:brightness-100'
                          }`}
                        >
                          <CategoryPreviewImage 
                            src={thumb} 
                            alt={`Angle ${idx + 1}`} 
                            className="w-full h-full object-cover"
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col justify-between h-full space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider font-sans">Product Classification</h4>
                    <p className="text-sm sm:text-base text-slate-700 leading-relaxed mt-2">{stripHtml(quickViewProduct.description)}</p>
                  </div>
                  <div className="bg-slate-50 p-4.5 rounded-xl border border-slate-150 flex flex-col justify-center">
                    <span className="text-xs text-slate-500 font-extrabold block uppercase tracking-wider">AVAILABILITY</span>
                    <button
                      onClick={() => handleShortcutInquiry(quickViewProduct!)}
                      className="text-base font-black text-[#ff0000] hover:text-[#cc0000] underline uppercase tracking-widest block mt-1.5 transition-colors cursor-pointer text-left focus:outline-none"
                    >
                      Request a Quote →
                    </button>
                  </div>
                </div>
              </div>

              {/* Technical features & specs lists */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-150">
                <div>
                  <h4 className="text-sm sm:text-base font-extrabold uppercase text-slate-900 mb-3">Key Operational Strengths</h4>
                  <ul className="space-y-2 text-sm text-slate-600 font-sans">
                    {(quickViewProduct.features || []).map((feat, idx) => (
                      <li key={idx} className="flex gap-2 items-start">
                        <span className="text-emerald-500 font-bold mt-0.5 text-base">✔</span>
                        <span className="leading-relaxed">{feat}</span>
                      </li>
                    ))}
                    {(!quickViewProduct.features || quickViewProduct.features.length === 0) && (
                      <li className="text-slate-400 text-xs italic">No features specified</li>
                    )}
                  </ul>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 bg-blue-50 text-blue-900 rounded-lg">
                          <Settings size={16} className="text-blue-900" />
                        </span>
                        <div>
                          <h4 className="text-sm font-black uppercase text-slate-900 tracking-wide">Technical Engineering Datasheet</h4>
                          <p className="text-[10px] text-slate-500 font-mono">SABS & CE COMPLIANCE REPORT</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button 
                          onClick={() => {
                            const specsString = Object.entries(quickViewProduct.specifications || {})
                              .map(([key, val]) => `${key}: ${val}`)
                              .join('\n');
                            navigator.clipboard.writeText(`Product: ${quickViewProduct.name}\nModel Code: ${quickViewProduct.modelCode}\n\nTechnical Specifications:\n${specsString}`);
                            setCopiedSpecs(true);
                            setTimeout(() => setCopiedSpecs(false), 2000);
                          }}
                          className="text-[10px] font-bold font-mono uppercase bg-white border border-slate-200 hover:border-slate-300 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition text-slate-600 hover:text-slate-900 shadow-2xs cursor-pointer focus:outline-none"
                          title="Copy specifications to clipboard"
                        >
                          {copiedSpecs ? (
                            <>
                              <span className="text-emerald-600">✔</span>
                              <span className="text-emerald-700">COPIED</span>
                            </>
                          ) : (
                            <>
                              <span>📋</span>
                              <span>COPY</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="bg-white border border-slate-150 rounded-xl overflow-hidden divide-y divide-slate-100 font-mono text-xs sm:text-sm">
                      {/* Standard structural specifications */}
                      <div className="py-2.5 px-3.5 flex justify-between gap-3 bg-slate-50/50">
                        <span className="text-slate-500 font-medium">Model Code:</span>
                        <span className="text-right text-slate-950 font-extrabold">{quickViewProduct.modelCode}</span>
                      </div>

                      
                      {/* Dynamic specifications mapping with no truncating */}
                      <>
                        {Object.entries(quickViewProduct.specifications || {}).map(([key, val]) => (
                          <div key={key} className="py-2.5 px-3.5 flex justify-between gap-3 items-start hover:bg-slate-50/30 transition-colors">
                            <span className="text-slate-500 font-medium text-left leading-relaxed">{key}:</span>
                            <span className="text-right text-slate-950 font-bold whitespace-normal break-words leading-relaxed max-w-[65%]">{val}</span>
                          </div>
                        ))}
                        {Object.keys(quickViewProduct.specifications || {}).length === 0 && (
                          <div className="text-slate-400 text-xs italic py-3 text-center">No structural specifications available</div>
                        )}
                      </>
                    </div>
                  </div>

                  {/* Safety & Standards Certification footer */}
                  <div className="mt-5 pt-3 border-t border-slate-200/80 flex items-center justify-between text-[10px] text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Award size={13} className="text-[#ff0000]" />
                      <span className="font-semibold text-slate-700 font-mono">12-Month Structural Guarantee</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                      <span className="font-semibold text-slate-600 font-mono">SABS COMPLIANT</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Long Description */}
              {quickViewProduct.longDescription && (
                <div className="pt-6 border-t border-slate-200">
                  <h4 className="text-sm sm:text-base font-black uppercase text-black mb-2 flex items-center gap-1.5 font-sans">
                    <span className="w-2 h-2 bg-black rounded-full" />
                    Detailed Equipment Overview & Compliance
                  </h4>
                  <p className="text-sm sm:text-base text-black font-extrabold tracking-wide leading-relaxed font-sans whitespace-pre-line p-6 bg-white border-2 border-black rounded-xl shadow-md">
                    {stripHtml(quickViewProduct.longDescription)}
                  </p>
                </div>
              )}

              {/* Recommended Extensions & Complementary Side-Sales/Upsells */}
              <div className="pt-6 border-t border-slate-150 space-y-3">
                <div className="text-slate-500 text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <span className="w-2 h-2 bg-indigo-500 rounded-full" />
                  RECOMMENDED EXTENSIONS & COMPLEMENTARY GEAR
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {getRelatedProducts(quickViewProduct).map((related) => (
                    <div key={related.id} className="p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-350 transition flex flex-col justify-between space-y-3">
                      <div className="flex gap-2.5">
                        <CategoryPreviewImage 
                          src={related.image} 
                          alt={related.name} 
                          className="w-12 h-12 object-cover rounded-lg shrink-0 border border-slate-100"
                        />
                        <div className="min-w-0">
                          <h5 className="font-extrabold text-xs sm:text-sm uppercase tracking-tight text-slate-900 truncate leading-tight">{related.name}</h5>
                          <span className="text-xs font-mono text-slate-500 block mt-1">{related.modelCode}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
                        <span className="text-xs sm:text-sm font-extrabold font-sans text-[#ff0000] uppercase tracking-wider">
                          Quote on Request
                        </span>
                        <button
                          onClick={() => {
                            setQuickViewProduct(related);
                            setActiveImageIndex(0);
                          }}
                          className="text-xs font-bold uppercase tracking-widest text-[#ff0000] hover:text-[#cc0000] cursor-pointer"
                        >
                          View Details →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Showroom Map Integration block */}
              <div className="pt-6 border-t border-slate-150 space-y-3">
                <div className="text-slate-500 text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <span className="w-2 h-2 bg-[#ff0000] rounded-full animate-ping" />
                  SHOWROOM GEOLOCATION MAP
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                  
                  {/* Google Map iframe container */}
                  <div className="aspect-video relative bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-inner min-h-[160px]">
                    <iframe
                      src="https://maps.google.com/maps?q=-33.828569,18.531859&hl=en&z=15&output=embed"
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      allowFullScreen={false}
                      loading="lazy"
                      title="Quick View Showroom Map Location"
                      className="absolute inset-0 w-full h-full opacity-90 hover:opacity-100 transition-opacity duration-300"
                    />
                  </div>

                  {/* Informative description & link */}
                  <div className="text-sm space-y-3 bg-slate-50 border border-slate-150 p-4 rounded-xl flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-slate-950 font-bold">
                        <MapPin size={16} className="text-[#ff0000]" />
                        <h5 className="font-extrabold uppercase tracking-tight text-xs sm:text-sm">Killarney Gardens Cape Town</h5>
                      </div>
                      <p className="text-slate-500 mt-2 leading-relaxed text-xs sm:text-sm">
                        Unit 4, 13 Killarney Avenue. Demo units are available for physical test runs during operating hours.
                      </p>
                    </div>
                    <a 
                      href="https://maps.google.com/?q=-33.828569,18.531859"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full text-center py-3.5 px-4 bg-[#ff0000] hover:bg-[#cc0000] text-white text-xs sm:text-sm font-black uppercase tracking-widest rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <span>VIEW ON GOOGLE MAPS</span>
                      <span>→</span>
                    </a>
                  </div>

                </div>
              </div>

              {/* CE regulation guarantee message removed per user request */}

            </div>

            {/* Sticky Actions Footer */}
            <div className="p-5 bg-blue-50/10 border-t border-slate-150 flex flex-wrap items-center justify-end gap-3 shrink-0">
              <button
                onClick={() => setQuickViewProduct(null)}
                className="px-5 py-2.5 border border-slate-350 bg-white text-slate-700 text-xs sm:text-sm font-bold rounded-xl hover:bg-slate-50 transition cursor-pointer mr-auto"
              >
                Close Specs
              </button>
              <button
                onClick={() => handleToggleWishlist(quickViewProduct!)}
                className={`px-4 py-2.5 border text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer shadow-sm flex items-center gap-1.5 uppercase tracking-wider ${
                  wishlist.some(w => w.id === quickViewProduct!.id)
                    ? 'bg-red-50 text-[#ff0000] border-red-300'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                }`}
                title={wishlist.some(w => w.id === quickViewProduct!.id) ? "Remove from wishlist" : "Save to wishlist"}
              >
                <Heart size={16} className={wishlist.some(w => w.id === quickViewProduct!.id) ? 'fill-current text-[#ff0000]' : ''} />
                <span>{wishlist.some(w => w.id === quickViewProduct!.id) ? 'Saved' : 'Wishlist'}</span>
              </button>
              <button
                onClick={() => handleDownloadPdf(quickViewProduct!)}
                className="px-5 py-2.5 bg-[#ff0000] hover:bg-[#cc0000] text-white text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-sm flex items-center gap-1.5 uppercase tracking-widest rounded-xl hover:scale-[1.02] active:scale-[0.98]"
              >
                <FileText size={16} />
                Download PDF Datasheet
              </button>
              <button
                onClick={() => handleShortcutInquiry(quickViewProduct!)}
                className="px-5 py-2.5 bg-white hover:bg-neutral-200 text-black text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-sm flex items-center gap-1.5 uppercase tracking-widest"
              >
                Add to Inquiry Cart
              </button>
            </div>

          </div>
        </div>
      )}

      {/* WOOCONMMECE CART DRAWER SIMULATOR */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onRemoveFromCart={handleRemoveFromCart}
        onUpdateCartQuantity={handleUpdateCartQuantity}
        onCheckoutComplete={handleCheckoutComplete}
        onContinueShopping={handleContinueShopping}
      />

      {/* STATIC WEB FOOTER BACKGROUND AND BRAND DETAILS */}
      <footer className="bg-[#0a0a0a] text-[#f5f5f5] pt-16 pb-8 border-t border-[#333333]">
        <div className="w-full px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            
            {/* Column 1: Company */}
            <div className="space-y-6">
              <div className="flex items-center gap-4 group cursor-pointer">
                <div className="w-8 h-8 border border-[#e0e0e0] bg-transparent flex items-center justify-center transition-colors">
                  <div className="font-bold text-xs text-white">CL</div>
                </div>
                <div>
                  <div className="flex items-center gap-0">
                    <span className="text-xl font-bold tracking-[0.2em] text-white uppercase">Car-Lifts</span>
                    <span className="text-[10px] text-[#999999] mt-1 ml-1">.co.za</span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-[#f5f5f5]">
                Professional car lifts for South Africa
              </p>
              <div className="flex gap-4 pt-2">
                <a href="#" className="w-8 h-8 rounded-full bg-[#1a1a1a] flex items-center justify-center border border-[#333333] hover:border-white hover:text-white transition-colors">
                  <span className="text-xs">FB</span>
                </a>
                <a href="#" className="w-8 h-8 rounded-full bg-[#1a1a1a] flex items-center justify-center border border-[#333333] hover:border-white hover:text-white transition-colors">
                  <span className="text-xs">IN</span>
                </a>
                <a href="#" className="w-8 h-8 rounded-full bg-[#1a1a1a] flex items-center justify-center border border-[#333333] hover:border-white hover:text-white transition-colors">
                  <span className="text-xs">WA</span>
                </a>
              </div>
            </div>

            {/* Column 2: Quick Links */}
            <div>
              <h4 className="text-base font-bold text-white mb-6 uppercase tracking-wider">Shop</h4>
              <ul className="space-y-3">
                <li>
                  <button 
                    onClick={(e) => { 
                      e.preventDefault(); 
                      handleCategoryClick('ALL EQUIPMENT'); 
                      setTimeout(() => { 
                        const el = document.getElementById('product-segment-anchor'); 
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); 
                      }, 100); 
                    }}
                    className="text-sm text-[#f5f5f5] hover:text-white hover:underline transition-colors bg-transparent border-none p-0 cursor-pointer text-left"
                  >
                    All Products
                  </button>
                </li>
                <li>
                  <button 
                    onClick={(e) => { 
                      e.preventDefault(); 
                      const el = document.getElementById('product-segment-anchor'); 
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); 
                    }}
                    className="text-sm text-[#f5f5f5] hover:text-white hover:underline transition-colors bg-transparent border-none p-0 cursor-pointer text-left"
                  >
                    Categories
                  </button>
                </li>
                <li>
                  <button 
                    onClick={(e) => { 
                      e.preventDefault(); 
                      handleCategoryClick('ALL EQUIPMENT'); 
                      setSearchQuery(''); 
                      setTimeout(() => { 
                        const el = document.getElementById('product-segment-anchor'); 
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); 
                      }, 100); 
                    }}
                    className="text-sm text-[#f5f5f5] hover:text-white hover:underline transition-colors bg-transparent border-none p-0 cursor-pointer text-left"
                  >
                    New Arrivals
                  </button>
                </li>
                <li>
                  <button 
                    onClick={(e) => { 
                      e.preventDefault(); 
                      handleCategoryClick('ALL EQUIPMENT'); 
                      setSearchQuery('special'); 
                      setTimeout(() => { 
                        const el = document.getElementById('product-segment-anchor'); 
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); 
                      }, 100); 
                    }}
                    className="text-sm text-[#f5f5f5] hover:text-white hover:underline transition-colors bg-transparent border-none p-0 cursor-pointer text-left"
                  >
                    Sale Items
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 3: Support */}
            <div>
              <h4 className="text-base font-bold text-white mb-6 uppercase tracking-wider">Support</h4>
              <ul className="space-y-3">
                <li>
                  <button 
                    id="footer-faq-btn"
                    onClick={(e) => { e.preventDefault(); setFaqModalOpen(true); }}
                    className="text-sm text-[#f5f5f5] hover:text-[#ff0000] hover:underline transition-colors bg-transparent border-none p-0 cursor-pointer text-left"
                  >
                    FAQ
                  </button>
                </li>
                <li>
                  <button 
                    onClick={(e) => { e.preventDefault(); openLegalPolicy('terms'); }}
                    className="text-sm text-[#f5f5f5] hover:text-white hover:underline transition-colors bg-transparent border-none p-0 cursor-pointer text-left"
                  >
                    Shipping Policy
                  </button>
                </li>
                <li>
                  <button 
                    onClick={(e) => { e.preventDefault(); openLegalPolicy('terms'); }}
                    className="text-sm text-[#f5f5f5] hover:text-white hover:underline transition-colors bg-transparent border-none p-0 cursor-pointer text-left"
                  >
                    Returns
                  </button>
                </li>
                <li>
                  <button 
                    onClick={(e) => { e.preventDefault(); openLegalPolicy('terms'); }}
                    className="text-sm text-[#f5f5f5] hover:text-white hover:underline transition-colors bg-transparent border-none p-0 cursor-pointer text-left"
                  >
                    Warranty
                  </button>
                </li>
                <li>
                  <button 
                    onClick={(e) => { e.preventDefault(); setFaqModalOpen(true); }}
                    className="text-sm text-[#f5f5f5] hover:text-white hover:underline transition-colors bg-transparent border-none p-0 cursor-pointer text-left"
                  >
                    Installation Guides
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 4: Contact Us */}
            <div id="footer-contact-info">
              <h4 className="text-base font-bold text-white mb-6 uppercase tracking-wider">Contact Us</h4>
              <ul className="space-y-4">
                <li>
                  <a href="tel:0215562413" className="text-sm text-[#f5f5f5] hover:text-white transition-colors block">
                    021 556 2413
                  </a>
                </li>
                <li>
                  <a href="mailto:info@car-lifts.co.za" className="text-sm text-[#f5f5f5] hover:text-white transition-colors block">
                    info@car-lifts.co.za
                  </a>
                </li>
                <li>
                  <p className="text-sm text-[#f5f5f5] leading-relaxed">
                    Unit 4, 13 Killarney Avenue,<br />
                    Killarney Gardens, Cape Town
                  </p>
                </li>
                <li>
                  <p className="text-sm text-[#999999]">
                    Mon-Thurs 8 am - 4pm | Fri 8am - 2:30 pm
                  </p>
                </li>
                <li className="pt-2">
                  <button 
                    onClick={() => setContactModalOpen(true)}
                    className="w-full text-center px-4 py-2 border border-[#ff0000] hover:bg-[#ff0000] text-[#ff0000] hover:text-white text-xs font-bold uppercase tracking-wider rounded transition-all cursor-pointer"
                  >
                    Open Enquiry Form
                  </button>
                </li>
              </ul>
            </div>

          </div>

          {/* Legal copyrights strip */}
          <div className="border-t border-[#333333] pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-[#999999] gap-4">
            <p 
              onClick={() => {
                setAdminClicks(prev => {
                  const next = prev + 1;
                  if (next >= 5) {
                    window.location.hash = '#admin';
                    setCurrentView('admin');
                    return 0;
                  }
                  return next;
                });
              }}
              className="cursor-pointer select-none active:text-[#ff0000]/40 transition-colors"
              title="Version 2.4.1"
            >
              © Nutec Machinery T/A Car-Lifts 2026. All Rights Reserved.
            </p>
            <div className="flex gap-4">
              <button 
                id="footer-privacy-btn"
                onClick={(e) => { e.preventDefault(); openLegalPolicy('privacy'); }}
                className="text-[#f5f5f5] hover:text-white transition-colors bg-transparent border-none p-0 cursor-pointer text-xs"
              >
                Privacy Policy
              </button>
              <span className="text-[#333333]">|</span>
              <button 
                id="footer-terms-btn"
                onClick={(e) => { e.preventDefault(); openLegalPolicy('terms'); }}
                className="text-[#f5f5f5] hover:text-white transition-colors bg-transparent border-none p-0 cursor-pointer text-xs"
              >
                Terms & Conditions
              </button>
              <span className="text-[#333333]">|</span>
              <button 
                id="footer-cookie-btn"
                onClick={(e) => { e.preventDefault(); openLegalPolicy('cookie'); }}
                className="text-[#f5f5f5] hover:text-white transition-colors bg-transparent border-none p-0 cursor-pointer text-xs"
              >
                Cookie Policy
              </button>
            </div>
          </div>

        </div>
      </footer>

      {/* South African POPIA Legal & Consent Overlays */}
      <LegalPoliciesModal 
        isOpen={legalModalOpen}
        onClose={() => setLegalModalOpen(false)}
        initialTab={legalInitialTab}
      />
      <AboutModal 
        isOpen={aboutModalOpen}
        onClose={() => setAboutModalOpen(false)}
        onContactClick={() => setContactModalOpen(true)}
      />
      <ContactModal 
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        cart={cart}
      />
      <FaqModal 
        isOpen={faqModalOpen}
        onClose={() => setFaqModalOpen(false)}
        onOpenContact={() => setContactModalOpen(true)}
      />
      <CompareModal 
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        compareList={compareList}
        onRemoveFromCompare={handleRemoveFromCompare}
        onClearCompare={handleClearCompare}
        onAddToCart={handleAddToCart}
        allProducts={products}
        onAddToCompare={handleAddToCompare}
        language={language}
        theme={theme}
      />
      <WishlistModal
        isOpen={isWishlistOpen}
        onClose={() => setIsWishlistOpen(false)}
        wishlist={wishlist}
        onRemoveFromWishlist={handleRemoveFromWishlist}
        onClearWishlist={handleClearWishlist}
        onAddToCart={handleAddToCart}
        onOpenQuickView={(p) => {
          setIsWishlistOpen(false);
          setQuickViewProduct(p);
          setActiveImageIndex(0);
        }}
        language={language}
        theme={theme}
      />
      <AssistantChatModal
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        onOpenContact={() => setContactModalOpen(true)}
        onSelectProduct={(productId) => {
          setIsAssistantOpen(false);
          setSelectedCategory('all');
          setCurrentView('store');
          setTimeout(() => {
            const el = document.getElementById(`product-card-${productId}`);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              el.classList.add('ring-4', 'ring-[#ff0000]', 'scale-[1.02]', 'shadow-2xl', 'z-50');
              setTimeout(() => {
                el.classList.remove('ring-4', 'ring-[#ff0000]', 'scale-[1.02]', 'shadow-2xl', 'z-50');
              }, 3000);
            }
          }, 300);
        }}
        language={language}
      />
      <CookieConsentBanner 
        onOpenPreferences={() => openLegalPolicy('cookie')}
      />

      {/* Floating Bottom Action Bar (Centered Inline) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2.5 sm:gap-3 max-w-[95vw]">
        {currentView === 'store' && (
          <button
            id="floating-compare-pill"
            onClick={() => setIsCompareOpen(true)}
            className="flex items-center gap-2 md:gap-2.5 px-3 md:px-4 py-3 bg-[#111111] border-2 border-[#ff0000] text-white rounded-full shadow-2xl hover:bg-[#ff0000] transition-all duration-300 cursor-pointer group shrink-0"
            title="Open Equipment Comparison Matrix"
          >
            <ArrowLeftRight size={18} className="text-[#ff0000] group-hover:text-white transition-colors" />
            <span className="text-xs font-bold uppercase tracking-wider font-sans hidden md:inline">
              {language === 'af' ? 'Vergelyk Matriks' : 'Compare Matrix'} ({compareList.length})
            </span>
            <span className="flex items-center justify-center px-1.5 py-0.5 text-[10px] font-black bg-[#ff0000] group-hover:bg-white text-white group-hover:text-[#ff0000] rounded-full md:hidden">
              {compareList.length}
            </span>
            <span className="w-2 h-2 rounded-full bg-[#ff0000] group-hover:bg-white animate-ping hidden md:inline-block" />
          </button>
        )}

        <button
          id="floating-assistant-btn"
          onClick={() => setIsAssistantOpen(true)}
          className="flex items-center gap-2.5 px-4 py-3 bg-[#111111] border-2 border-[#ff0000] text-white rounded-full shadow-2xl hover:bg-[#ff0000] transition-all duration-300 cursor-pointer group shrink-0"
          title="Ask Triton Product AI"
        >
          <Bot size={20} className="text-[#ff0000] group-hover:text-white transition-colors" />
          <span className="text-xs font-bold uppercase tracking-wider font-sans hidden sm:inline">
            {language === 'af' ? 'Vra Assistent' : 'Ask Product Assistant'}
          </span>
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
        </button>
      </div>

      {/* WordPress & WooCommerce Sync Controller */}
      <WordPressConsole 
        products={products}
        onProductsChange={handleProductsChange}
        featuredCategories={featuredCategories}
        onFeaturedCategoriesChange={handleFeaturedCategoriesChange}
        theme={theme}
        onThemeChange={handleThemeChange}
        globalSeoTitle={globalSeoTitle}
        onGlobalSeoTitleChange={setGlobalSeoTitle}
        globalSeoDescription={globalSeoDescription}
        onGlobalSeoDescriptionChange={setGlobalSeoDescription}
        onCategoryClick={handleCategoryClick}
        maintenanceMode={maintenanceMode}
        onMaintenanceModeChange={(mode) => setMaintenanceMode(mode)}
      />

      {/* Floating Back to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          id="back-to-top-btn"
          className="fixed bottom-24 right-6 z-[100] p-3.5 bg-[#0d0d0d] hover:bg-red-600 text-white rounded-full border border-neutral-800 hover:border-red-500 shadow-2xl transition-all duration-300 group flex items-center justify-center cursor-pointer animate-[fadeIn_0.2s_ease-out]"
          title="Scroll Back to Top"
        >
          <ArrowUp size={18} className="transition-transform group-hover:-translate-y-1" strokeWidth={2.5} />
        </button>
      )}

      {/* WhatsApp Floating Action Button */}
      {currentView === 'store' && (
        <a
          href={getWhatsAppUrl()}
          target="_blank"
          rel="noopener noreferrer"
          id="whatsapp-fab"
          className="fixed bottom-6 right-6 z-[100] flex items-center gap-2 p-3.5 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-full shadow-2xl transition-all duration-300 group cursor-pointer hover:scale-105 active:scale-95 border border-emerald-500/50"
          title={quickViewProduct ? `Inquire about ${quickViewProduct.name} via WhatsApp` : "Direct Sales Inquiry via WhatsApp"}
        >
          <div className="relative flex items-center justify-center">
            {/* Soft pulse ring */}
            <span className="absolute inline-flex h-6 w-6 rounded-full bg-white opacity-20 animate-ping" />
            <MessageCircle size={20} className="relative z-10" fill="currentColor" />
          </div>
          <span className="max-w-0 overflow-hidden whitespace-nowrap text-xs font-bold tracking-wider uppercase opacity-0 transition-all duration-300 md:group-hover:max-w-[140px] md:group-hover:opacity-100 md:group-hover:pl-1 font-sans">
            WhatsApp Sales
          </span>
        </a>
      )}

      {/* FULLSCREEN QUICK ZOOM LIGHTBOX MODAL */}
      {zoomImageUrl && (
        <div 
          className="fixed inset-0 z-[120] bg-black/98 flex flex-col items-center justify-center p-4 transition-all duration-300 animate-[fadeIn_0.2s_ease-out]"
          onClick={() => setZoomImageUrl(null)}
        >
          {/* Top panel actions info */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-[130]">
            <span className="text-[10px] sm:text-xs font-mono font-black tracking-[0.2em] text-neutral-400 bg-neutral-900/90 px-4 py-2 rounded-xl border-2 border-neutral-805 shadow-xl">
              CLICK ANYWHERE TO DISMISS
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const link = document.createElement('a');
                  link.href = zoomImageUrl;
                  link.download = `triton-zoom-image.jpg`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="p-2 sm:p-2.5 bg-neutral-900 border-2 border-neutral-800 hover:border-emerald-500 text-neutral-300 hover:text-white rounded-xl transition cursor-pointer flex items-center justify-center shadow-lg gap-2 text-xs font-bold font-mono tracking-wider uppercase px-4"
                title="Save this Zoomed Image to disk"
              >
                <Download size={14} />
                <span className="hidden sm:inline">Save Image</span>
              </button>
              <button
                onClick={() => setZoomImageUrl(null)}
                className="p-2 sm:p-2.5 bg-neutral-900 border-2 border-neutral-800 hover:border-white text-neutral-400 hover:text-white rounded-xl transition cursor-pointer flex items-center justify-center shadow-lg"
                title="Close Zoom"
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* Centered Image display with drag to pan */}
          <div className="relative max-w-5xl max-h-[75vh] w-full flex items-center justify-center p-2 overflow-hidden bg-black/40 rounded-3xl border-2 border-neutral-900" onClick={(e) => e.stopPropagation()}>
            <img
              src={resolvedZoomUrl}
              alt="High resolution zoom view"
              draggable={false}
              className={`max-w-full max-h-[70vh] object-contain rounded-2xl shadow-2xl select-none origin-center ${
                zoomScale > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
              }`}
              style={{
                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale})`,
                transition: isDraggingPan ? 'none' : 'transform 0.15s ease-out'
              }}
              referrerPolicy="no-referrer"
              onError={(e) => handleImageElementError(e)}
              onMouseDown={handleZoomMouseDown}
              onMouseMove={handleZoomMouseMove}
              onMouseUp={handleZoomMouseUp}
              onMouseLeave={handleZoomMouseUp}
              onTouchStart={handleZoomTouchStart}
              onTouchMove={handleZoomTouchMove}
              onTouchEnd={handleZoomTouchEnd}
            />

            {/* Gallery Navigation Arrows inside Zoom Lightbox */}
            {zoomScale <= 1 && (() => {
              const activeProduct = products.find(p => p.image === zoomImageUrl || (p.images && p.images.includes(zoomImageUrl)));
              const activeImages = activeProduct ? getProductImages(activeProduct) : [];
              if (activeImages.length <= 1) return null;
              const currentIndex = activeImages.indexOf(zoomImageUrl);
              return (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const prevIdx = currentIndex > 0 ? currentIndex - 1 : activeImages.length - 1;
                      setZoomImageUrl(activeImages[prevIdx]);
                    }}
                    className="absolute left-4 z-[130] p-3 bg-black/60 hover:bg-black/90 text-white rounded-full border border-neutral-800 hover:border-white transition-all cursor-pointer flex items-center justify-center shadow-lg hover:scale-110"
                    title="Previous Image"
                  >
                    <ChevronLeft size={24} strokeWidth={2.5} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const nextIdx = currentIndex < activeImages.length - 1 ? currentIndex + 1 : 0;
                      setZoomImageUrl(activeImages[nextIdx]);
                    }}
                    className="absolute right-4 z-[130] p-3 bg-black/60 hover:bg-black/90 text-white rounded-full border border-neutral-800 hover:border-white transition-all cursor-pointer flex items-center justify-center shadow-lg hover:scale-110"
                    title="Next Image"
                  >
                    <ChevronRight size={24} strokeWidth={2.5} />
                  </button>
                </>
              );
            })()}
          </div>
          
          {/* ZOOM CONTROL DECK */}
          <div 
            className="flex flex-col sm:flex-row items-center gap-3 bg-black border-2 border-neutral-800 p-2.5 rounded-2xl shadow-2xl z-[130] mt-5 select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <button
                onClick={handleZoomOut}
                disabled={zoomScale <= 1}
                className="p-2.5 bg-neutral-900 text-neutral-300 hover:text-white hover:bg-neutral-800 disabled:opacity-20 disabled:hover:text-neutral-400 disabled:hover:bg-neutral-900 rounded-xl transition-all cursor-pointer border border-neutral-800"
                title="Zoom Out"
              >
                <Minus size={15} strokeWidth={3} />
              </button>
              
              <div 
                onClick={handleResetZoom}
                className="px-4 py-2 font-mono text-xs font-black tracking-widest text-white bg-black rounded-xl border-2 border-neutral-700 cursor-pointer hover:border-white transition-all select-none text-center min-w-[80px]"
                title="Click to reset view scale"
              >
                {Math.round(zoomScale * 100)}%
              </div>

              <button
                onClick={handleZoomIn}
                disabled={zoomScale >= 4}
                className="p-2.5 bg-neutral-900 text-neutral-300 hover:text-white hover:bg-neutral-800 disabled:opacity-20 disabled:hover:text-neutral-400 disabled:hover:bg-neutral-900 rounded-xl transition-all cursor-pointer border border-neutral-800"
                title="Zoom In"
              >
                <Plus size={15} strokeWidth={3} />
              </button>
            </div>

            <div className="hidden sm:block h-6 w-px bg-neutral-800" />

            <div className="flex items-center gap-2">
              <button
                onClick={handleResetZoom}
                disabled={zoomScale === 1 && panOffset.x === 0 && panOffset.y === 0}
                className="px-4 py-2 bg-neutral-900 text-xs font-black uppercase tracking-widest text-neutral-300 hover:text-white hover:bg-neutral-800 disabled:opacity-20 rounded-xl transition-all flex items-center gap-2 cursor-pointer border border-neutral-800"
                title="Reset Scale and Pan"
              >
                <RotateCcw size={13} strokeWidth={2.5} />
                Reset Fit
              </button>

              {zoomScale > 1 && (
                <span className="text-[10px] font-mono font-black uppercase text-orange-500 bg-orange-550/10 px-3 py-2 rounded-xl border border-orange-500/20 animate-pulse flex items-center gap-1">
                  <Move size={11} className="animate-bounce" /> Drag Left/Right or Up/Down
                </span>
              )}
            </div>
          </div>

          <div className="text-center mt-3 text-neutral-500 text-[10px] uppercase font-bold tracking-widest leading-none select-none">
            Use standard mouse scroll/drag actions to investigate mechanical welds & CE finishes
          </div>
        </div>
      )}





    </div>
    </div>
  );
}
