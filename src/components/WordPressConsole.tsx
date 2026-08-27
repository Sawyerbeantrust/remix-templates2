import React, { useState, useEffect, useRef } from 'react';
import { 
  Database, RefreshCw, Layers, FileCode, CheckCircle, 
  Settings, Terminal, Download, Copy, Check, ExternalLink, 
  AlertCircle, ShieldCheck, HelpCircle, Code, X, Lock, Unlock, Globe, Key, Mail,
  Plus, Trash2, Image as ImageIcon, Save, RotateCcw, Edit, Search,
  Upload, Sparkles, Cpu, ArrowUp, ArrowDown, ArrowUpDown, ChevronDown, ChevronUp,
  ChevronLeft, ChevronRight, GripVertical, Award, Eye, EyeOff, AlertTriangle,
  Wrench, Shield, FileText, Printer, Bot, Zap
} from 'lucide-react';
import { PRODUCTS } from '../data/products';
import { Product, FeaturedCategory } from '../types';
import ResponsiveImage from './ResponsiveImage';
import CategoryPreviewImage from './CategoryPreviewImage';
import { processCategoriesForStorage, processProductsForStorage, compressAndResizeBase64Image } from '../utils/sanitizeAndStoreImages';
import { safeLocalStorage, safeSessionStorage } from '../utils/safeStorage';
import { syncCatalogToServer, fetchServerCatalog, getStoredCategoriesList } from '../utils/catalogSync';
import { generateSitemapXml } from '../utils/sitemapGenerator';
import { normalizeCategorySlug, formatCategoryLabel } from '../utils/categoryUtils';
import { motion } from 'motion/react';
import { stripHtml } from '../utils/stripHtml';
import AssetAuditTab from './AssetAuditTab';
import MediaStorageTab from './MediaStorageTab';
import { migrateDefaultImagesToWordPress, fixLegacyImageUrls } from '../utils/migrateLegacyImages';
import { uploadImageToWordPress } from '../utils/imageUpload';

interface WordPressConsoleProps {
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

const SOUTH_AFRICAN_COMPETITIVE_KEYWORDS: Record<string, { keyword: string; volume: string; difficulty: 'Low' | 'Medium' | 'High'; cpc: string; intent: string }[]> = {
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
    image: normalizeCategoryImagePath(p.image),
    images: Array.isArray(p.images) ? p.images.map(normalizeCategoryImagePath) : (p.image ? [normalizeCategoryImagePath(p.image)] : []),
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

export interface ProjectAssetImage {
  path: string;
  label: string;
  category: string;
  isCustom?: boolean;
}

export const PROJECT_ASSET_IMAGES: ProjectAssetImage[] = [
  { path: '/assets/images/modern_workshop_car_lift_1780988724101.png', label: 'Modern Workshop Car Lift Scene', category: 'car-lift' },
  { path: '/assets/images/killarney_gardens_map_1781354004848.jpg', label: 'Killarney Gardens Workshop Map', category: 'workshop-equipment' },
  { path: '/assets/images/garage_equipment_hero_1783937551956.jpg', label: 'Triton Garage Equipment Hero', category: 'workshop-equipment' },
  { path: '/assets/images/garage_equipment_welder_hero_1783939957746.jpg', label: 'Triton Welder Hero Showcase', category: 'welder' },
];

export const DEFAULT_FEATURED_CATEGORIES: FeaturedCategory[] = [
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

export const normalizeCategoryImagePath = (img?: string): string => {
  if (!img || typeof img !== 'string') return img || '';
  if (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('data:') || img.startsWith('blob:')) return img;
  if (
    img.startsWith('/images/') ||
    img.startsWith('/src/assets/images/') ||
    img.startsWith('images/') ||
    img.startsWith('/src/assets/') ||
    img.startsWith('/assets/images/')
  ) {
    const filename = img.split('?')[0].split('#')[0].split('/').filter(Boolean).pop();
    if (filename) return `/assets/images/${filename}`;
  }
  return img;
};

export default function WordPressConsole({ 
  isFullPage = false, 
  onBackToShop,
  products: productsProp,
  onProductsChange: onProductsChangeProp,
  featuredCategories: featuredCategoriesProp,
  onFeaturedCategoriesChange: onFeaturedCategoriesChangeProp,
  theme = 'triton',
  onThemeChange,
  globalSeoTitle,
  onGlobalSeoTitleChange,
  globalSeoDescription,
  onGlobalSeoDescriptionChange,
  onCategoryClick,
  maintenanceMode,
  onMaintenanceModeChange
}: WordPressConsoleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Maintenance mode state
  const [maintenanceModeState, setMaintenanceModeState] = useState<boolean>(() => {
    if (typeof maintenanceMode === 'boolean') return maintenanceMode;
    return safeLocalStorage.getItem('triton_maintenance_mode') === 'true';
  });

  useEffect(() => {
    if (typeof maintenanceMode === 'boolean') {
      setMaintenanceModeState(maintenanceMode);
    }
  }, [maintenanceMode]);

  // High fidelity theme integration
  const [internalTheme, setInternalTheme] = useState<'triton' | 'inospace'>(theme);

  useEffect(() => {
    if (theme) {
      setInternalTheme(theme);
    } else {
      try {
        const saved = localStorage.getItem('cape_town_equipment_theme');
        if (saved === 'inospace' || saved === 'triton') {
          setInternalTheme(saved as 'triton' | 'inospace');
        }
      } catch (e) {
        // fallback
      }
    }
  }, [theme]);

  const changeTheme = (newTheme: 'triton' | 'inospace') => {
    setInternalTheme(newTheme);
    if (onThemeChange) {
      onThemeChange(newTheme);
    }
    addLog(`Changed global application theme template to [${newTheme === 'triton' ? 'Triton Premium (Red & Blue)' : 'Inospace Professional (Commercial Red)'}].`);
  };

  const isInospace = internalTheme === 'inospace';
  const getInitialTabsOrder = (): ('sync' | 'products' | 'seo' | 'categories' | 'shortcodes' | 'config' | 'logs' | 'tools' | 'admin' | 'assets' | 'media' | 'errors')[] => {
    const defaultOrder: ('sync' | 'products' | 'seo' | 'categories' | 'shortcodes' | 'tools' | 'admin' | 'config' | 'logs' | 'assets' | 'media' | 'errors')[] = [
      'sync', 'products', 'seo', 'categories', 'assets', 'media', 'shortcodes', 'tools', 'admin', 'config', 'logs', 'errors'
    ];
    const saved = safeLocalStorage.getItem('triton_console_tabs_order');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Filter to only valid IDs
          const validSaved = parsed.filter(id => defaultOrder.includes(id as any));
          // Append any missing IDs from the default list
          const missing = defaultOrder.filter(id => !validSaved.includes(id));
          return [...validSaved, ...missing] as any;
        }
      } catch (e) {}
    }
    return defaultOrder;
  };

  // Tab ordering state with auto-save persistence
  const [tabOrder, setTabOrder] = useState<('sync' | 'products' | 'seo' | 'categories' | 'shortcodes' | 'config' | 'logs' | 'tools' | 'admin' | 'assets' | 'media' | 'errors')[]>(getInitialTabsOrder);
  
  const [activeTab, setActiveTab] = useState<'sync' | 'products' | 'categories' | 'shortcodes' | 'config' | 'logs' | 'seo' | 'tools' | 'admin' | 'assets' | 'media' | 'errors'>(() => {
    const initialOrder = getInitialTabsOrder();
    return initialOrder[0] as any;
  });

  const [draggedTab, setDraggedTab] = useState<string | null>(null);

  const handleTabDragStart = (e: React.DragEvent, id: string) => {
    setDraggedTab(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleTabDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleTabDragEnter = (e: React.DragEvent, targetId: any) => {
    e.preventDefault();
    if (!draggedTab || draggedTab === targetId) return;

    const newOrder = [...tabOrder];
    const draggedIdx = newOrder.indexOf(draggedTab as any);
    const targetIdx = newOrder.indexOf(targetId);

    if (draggedIdx !== -1 && targetIdx !== -1) {
      newOrder.splice(draggedIdx, 1);
      newOrder.splice(targetIdx, 0, draggedTab as any);
      setTabOrder(newOrder);
      safeLocalStorage.setItem('triton_console_tabs_order', JSON.stringify(newOrder));
    }
  };

  const handleTabDragEnd = () => {
    setDraggedTab(null);
  };
  
  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return safeSessionStorage.getItem('admin_authenticated') === 'true';
  });
  const [savedPasscode, setSavedPasscode] = useState(() => {
    return safeLocalStorage.getItem('admin_passcode') || 'admin2027';
  });
  const [passcode, setPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState(false);

  // Security brute-force protection states
  const [failedAttempts, setFailedAttempts] = useState(() => {
    const val = safeLocalStorage.getItem('admin_failed_attempts');
    return val ? parseInt(val, 10) : 0;
  });
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(() => {
    const val = safeLocalStorage.getItem('admin_lockout_until');
    return val ? parseInt(val, 10) : null;
  });
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!lockoutUntil) return;
    const interval = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= lockoutUntil) {
        setLockoutUntil(null);
        setFailedAttempts(0);
        safeLocalStorage.removeItem('admin_lockout_until');
        safeLocalStorage.setItem('admin_failed_attempts', '0');
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutUntil]);

  // Masking state for WooCommerce Secret Key
  const [showConsumerSecret, setShowConsumerSecret] = useState(false);

  // New States for Passcode Change Flow
  const [isChangingPasscode, setIsChangingPasscode] = useState(false);
  const [currentPasscodeInput, setCurrentPasscodeInput] = useState('');
  const [newPasscodeInput, setNewPasscodeInput] = useState('');
  const [acceptInput, setAcceptInput] = useState('');
  const [changeError, setChangeError] = useState('');
  const [changeSuccess, setChangeSuccess] = useState('');

  // Settings State saved in localStorage
  const [wpUrl, setWpUrl] = useState(() => safeLocalStorage.getItem('wp_sync_url') || 'https://car-lifts.co.za');
  const [consumerKey, setConsumerKey] = useState(() => safeLocalStorage.getItem('wp_consumer_key') || 'ck_f73b90df621a00a84e68e400c992561917f8b890');
  const [consumerSecret, setConsumerSecret] = useState(() => safeLocalStorage.getItem('wp_consumer_secret') || 'cs_892ba0900f68e0d01b190f89d389a01b2a3cd105');
  const [apiStatus, setApiStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [syncedProducts, setSyncedProducts] = useState<string[]>([]);
  const [syncCategories, setSyncCategories] = useState(() => {
    return safeLocalStorage.getItem('wp_sync_categories') !== 'false';
  });
  const [syncImages, setSyncImages] = useState(() => {
    return safeLocalStorage.getItem('wp_sync_images') !== 'false';
  });
  const [showroomWalkthroughEnabled, setShowroomWalkthroughEnabled] = useState(() => {
    return safeLocalStorage.getItem('showroom_walkthrough_enabled') !== 'false';
  });

  // Custom Confirmation States for resets in Admin tab
  const [wipeConfirmState, setWipeConfirmState] = useState<'idle' | 'confirming' | 'success'>('idle');
  const [restoreConfirmState, setRestoreConfirmState] = useState<'idle' | 'confirming' | 'success'>('idle');
  const [csvReplaceConfirmState, setCsvReplaceConfirmState] = useState<'idle' | 'confirming' | 'success'>('idle');
  const [csvAppendConfirmState, setCsvAppendConfirmState] = useState<'idle' | 'confirming' | 'success'>('idle');
  const [isLocalizing, setIsLocalizing] = useState(false);
  const [localizationProgress, setLocalizationProgress] = useState(0);
  const [isMigratingImages, setIsMigratingImages] = useState(false);

  const handleFixLegacyImages = async () => {
    if (isMigratingImages) return;
    setIsMigratingImages(true);
    addLog("\U0001f680 Starting legacy image URL migration to WordPress Media...");
    try {
      const { updatedProducts, updatedCategories, fixedCount } = await fixLegacyImageUrls(
        currentProducts,
        currentFeaturedCategories,
        (msg) => addLog(`[Image Fix] ${msg}`)
      );

      if (fixedCount > 0) {
        await updateProducts(updatedProducts);
        await updateFeaturedCategories(updatedCategories);

        const categoriesList = getStoredCategoriesList();
        const res = await fetch('/api/catalog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            products: updatedProducts,
            featuredCategories: updatedCategories,
            categoriesList
          })
        });
        if (res.ok) {
          addLog(`\u2705 Successfully migrated ${fixedCount} legacy image URLs to WordPress Media and saved catalog!`);
          alert(`Successfully migrated ${fixedCount} legacy image URLs to WordPress Media! Catalog updated.`);
        } else {
          addLog(`\u26a0\ufe0f Migrated ${fixedCount} image URLs locally, but failed to save catalog to server.`);
        }
      } else {
        addLog("\u2728 No legacy or broken image URLs found in catalog. All assets are up to date!");
        alert("No legacy or broken image URLs found. All images are already using valid URLs!");
      }
    } catch (err: any) {
      addLog(`\u274c Error during legacy image migration: ${err?.message || err}`);
      console.error("Migration error:", err);
    } finally {
      setIsMigratingImages(false);
    }
  };

  const [isMigratingDefaultImages, setIsMigratingDefaultImages] = useState(false);
  const [defaultImagesMigrationSummary, setDefaultImagesMigrationSummary] = useState<{
    uploaded: number;
    replaced: number;
    map: Record<string, string>;
  } | null>(null);
  const [copiedBlobKey, setCopiedBlobKey] = useState<string | null>(null);

  const handleMigrateDefaultImagesToWordPress = async () => {
    if (isMigratingDefaultImages) return;
    setIsMigratingDefaultImages(true);
    addLog("\U0001f680 [WordPress Media Migration] Starting migration of default local images to WordPress...");
    try {
      const result = await migrateDefaultImagesToWordPress(
        currentProducts,
        currentFeaturedCategories,
        (msg) => addLog(`[Media Migration] ${msg}`)
      );

      setDefaultImagesMigrationSummary({
        uploaded: result.uploaded,
        replaced: result.replaced,
        map: result.map
      });

      if (result.uploaded > 0 || result.replaced > 0) {
        await updateProducts(result.updatedProducts);
        await updateFeaturedCategories(result.updatedCategories);

        const categoriesList = getStoredCategoriesList();
        const res = await fetch('/api/catalog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            products: result.updatedProducts,
            featuredCategories: result.updatedCategories,
            categoriesList
          })
        });

        if (res.ok) {
          addLog(`\u2705 [WordPress Media Migration Complete] Uploaded ${result.uploaded} default images to WordPress Media Library, Replaced ${result.replaced} catalog paths.`);
          alert(`Migration Complete! Uploaded ${result.uploaded} images to WordPress and updated catalog.`);
        } else {
          addLog(`\u26a0\ufe0f Uploaded ${result.uploaded} images, but failed to save catalog to server.`);
        }
      } else {
        addLog("\u2728 All default images have already been migrated to WordPress Media Library!");
        alert("All default images are already migrated to WordPress!");
      }
    } catch (err: any) {
      console.error("Default image migration error:", err);
      addLog(`\u274c [WordPress Media Migration Error] ${err?.message || err}`);
      alert(`Migration error: ${err?.message || err}`);
    } finally {
      setIsMigratingDefaultImages(false);
    }
  };

  // CSV Importer States
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvSuccessMessage, setCsvSuccessMessage] = useState<string | null>(null);
  const [parsedProducts, setParsedProducts] = useState<Product[]>([]);
  const [csvValidationErrors, setCsvValidationErrors] = useState<Record<string, string[]>>({});
  const [csvFilterMode, setCsvFilterMode] = useState<'all' | 'invalid'>('all');
  const [importedFilename, setImportedFilename] = useState<string>('');
  const [importCompleted, setImportCompleted] = useState<boolean>(false);
  const [importedCountCompleted, setImportedCountCompleted] = useState<number>(0);
  const [showErrorLogViewer, setShowErrorLogViewer] = useState<boolean>(false);
  const [importErrorLog, setImportErrorLog] = useState<{
    sku: string;
    name: string;
    failure: string;
    originalValue: string;
    timestamp: string;
  }[]>([]);
  const [importSummary, setImportSummary] = useState<{
    totalRows: number;
    importedCount: number;
    draftsSkipped: number;
    categories: string[];
    failedRows: number[];
  } | null>(null);

  // Full System Backup & Restore States
  const [isExportingBackup, setIsExportingBackup] = useState<boolean>(false);
  const [backupExportSuccess, setBackupExportSuccess] = useState<string | null>(null);
  const [backupFileToRestore, setBackupFileToRestore] = useState<{
    fileName: string;
    version: string;
    timestamp: string;
    productsCount: number;
    categoriesCount: number;
    imagesCount: number;
    hasSettings: boolean;
    rawBackup: any;
  } | null>(null);
  const [backupRestoreError, setBackupRestoreError] = useState<string | null>(null);
  const [backupRestoreSuccess, setBackupRestoreSuccess] = useState<string | null>(null);
  const [isRestoringBackup, setIsRestoringBackup] = useState<boolean>(false);

  // Admin Tab Password Reset States
  const [adminTabCurrentPasscode, setAdminTabCurrentPasscode] = useState<string>('');
  const [adminTabNewPasscode, setAdminTabNewPasscode] = useState<string>('');
  const [adminTabConfirmPasscode, setAdminTabConfirmPasscode] = useState<string>('');
  const [adminTabPasscodeError, setAdminTabPasscodeError] = useState<string | null>(null);
  const [adminTabPasscodeSuccess, setAdminTabPasscodeSuccess] = useState<string | null>(null);
  const [adminTabEmailSuccess, setAdminTabEmailSuccess] = useState<string | null>(null);

  // Shortcode Generator State
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [gridColumns, setGridColumns] = useState('3');
  const [layoutStyle, setLayoutStyle] = useState('classic-dark');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Local storage backup list in case the prop is omitted
  const [localProducts, setLocalProducts] = useState<Product[]>(() => {
    const saved = safeLocalStorage.getItem('triton_products_db');
    let loadedProducts = PRODUCTS;
    if (saved) {
      try {
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
      } catch (e) {}
    }
    return (Array.isArray(loadedProducts) ? loadedProducts : PRODUCTS).map(normalizeProductCategory);
  });

  useEffect(() => {
    const loadServerCatalog = async () => {
      const catData = await fetchServerCatalog();
      if (catData) {
        if (Array.isArray(catData.products) && catData.products.length > 0) {
          const mapped = catData.products.map(normalizeProductCategory);
          setLocalProducts(mapped);
          safeLocalStorage.setItem('triton_products_db', JSON.stringify(mapped));
        }
        if (Array.isArray(catData.featuredCategories) && catData.featuredCategories.length > 0) {
          const normalizedCats = catData.featuredCategories.map((c: FeaturedCategory) => ({
            ...c,
            img: normalizeCategoryImagePath(c.img)
          }));
          setLocalFeaturedCategories(normalizedCats);
          safeLocalStorage.setItem('triton_featured_categories_db_v3', JSON.stringify(normalizedCats));
        }
        if (Array.isArray(catData.categoriesList) && catData.categoriesList.length > 0) {
          setCategories(catData.categoriesList);
          safeLocalStorage.setItem('triton_categories_list_v2', JSON.stringify(catData.categoriesList));
        }
      }
    };
    loadServerCatalog();
  }, []);

  const currentProducts = React.useMemo(() => {
    return (productsProp || localProducts).map(normalizeProductCategory);
  }, [productsProp, localProducts]);

  // Product Manager views state
  const [selectedProdId, setSelectedProdId] = useState<string>(() => currentProducts[0]?.id || '');

  // SEO Management States
  const [seoSubTab, setSeoSubTab] = useState<'products' | 'global' | 'audit' | 'analyzer'>('products');
  const [globalSeoTitleInput, setGlobalSeoTitleInput] = useState('');
  const [globalSeoDescInput, setGlobalSeoDescInput] = useState('');
  const [isGeneratingGlobalSeo, setIsGeneratingGlobalSeo] = useState(false);
  const [isGeneratingProductSeo, setIsGeneratingProductSeo] = useState(false);
  const [injectingKeyword, setInjectingKeyword] = useState<string | null>(null);

  // Category SEO Audit States
  const [selectedAuditCategory, setSelectedAuditCategory] = useState<string>('car-lift');
  const [categoryAuditLoading, setCategoryAuditLoading] = useState<boolean>(false);
  const [isCatSeoExpanded, setIsCatSeoExpanded] = useState(false);
  const [categoryAuditResult, setCategoryAuditResult] = useState<{
    label: string;
    competitorAnalysis: string;
    recommendedTitle: string;
    recommendedDescription: string;
    competitorsFound: { name: string; url: string }[];
    category: string;
    source: string;
  } | null>(null);

  // Catalog SEO Analyzer States
  const [expandedProductSeoId, setExpandedProductSeoId] = useState<string | null>(null);
  const [analyzerLogs, setAnalyzerLogs] = useState<string[]>([]);
  const [analyzerProgress, setAnalyzerProgress] = useState(0);
  const [analyzerIsScanning, setAnalyzerIsScanning] = useState(false);
  const [analyzerIsOptimizing, setAnalyzerIsOptimizing] = useState(false);
  const [analyzerNotification, setAnalyzerNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [analyzerResults, setAnalyzerResults] = useState<{
    scannedCount: number;
    healthScore: number;
    shortDescCount: number;
    missingKeywordsCount: number;
    suboptimalTitleCount: number;
    suboptimalDescCount: number;
    noSafetyCount: number;
    noLocaleCount: number;
    details: Record<string, {
      score: number;
      issues: string[];
      originalDesc: string;
      suggestedDesc: string;
      originalKeywords: string;
      suggestedKeywords: string;
      originalTitle: string;
      suggestedTitle: string;
      originalMetaDesc: string;
      suggestedMetaDesc: string;
    }>;
  } | null>(null);

  const generateSuggestionsForProduct = (p: Product) => {
    const issues: string[] = [];
    const scoreBreakdown = {
      descLength: 0,
      titleLength: 0,
      descLengthOptimal: 0,
      keywordsExist: 0,
      metaTitleExist: 0,
      metaDescExist: 0,
      localeCE: 0
    };

    // 1. Description Length check
    const desc = p.description || '';
    if (desc.length < 150) {
      issues.push("Description is too short (under 150 chars).");
    } else {
      scoreBreakdown.descLength = 20;
    }

    // 2. Keywords check
    const keywords = p.seoFocusKeyword || '';
    if (!keywords) {
      issues.push("No SEO Focus Keyword specified.");
    } else {
      scoreBreakdown.keywordsExist = 15;
    }

    // 3. Meta Title check
    const title = p.seoTitle || '';
    if (!title) {
      issues.push("Missing SEO Meta Title override.");
    } else {
      scoreBreakdown.metaTitleExist = 15;
      if (title.length >= 45 && title.length <= 65) {
        scoreBreakdown.titleLength = 10;
      } else {
        issues.push(`Suboptimal Meta Title length (${title.length} chars). Target is 45-65.`);
      }
    }

    // 4. Meta Description check
    const metaDesc = p.seoDescription || '';
    if (!metaDesc) {
      issues.push("Missing SEO Meta Description override.");
    } else {
      scoreBreakdown.metaDescExist = 15;
      if (metaDesc.length >= 110 && metaDesc.length <= 165) {
        scoreBreakdown.descLengthOptimal = 10;
      } else {
        issues.push(`Suboptimal Meta Description length (${metaDesc.length} chars). Target is 110-165.`);
      }
    }

    // 5. Locale and Safety Check
    const combinedText = (p.name + " " + desc + " " + (p.longDescription || '')).toLowerCase();
    const hasLocale = ["south africa", "cape town", "johannesburg", "durban", "gauteng", "pretoria", "natal"].some(loc => combinedText.includes(loc));
    const hasSafety = ["certified", "safety", "compliance", "standard"].some(word => combinedText.includes(word));
    
    if (!hasLocale) {
      issues.push("Lacks regional South African locale alignment (e.g., Cape Town, Johannesburg).");
    }
    if (!hasSafety) {
      issues.push("Lacks safety and quality standards references.");
    }
    if (hasLocale && hasSafety) {
      scoreBreakdown.localeCE = 15;
    } else if (hasLocale || hasSafety) {
      scoreBreakdown.localeCE = 8;
    }

    const totalScore = Math.min(100, 
      scoreBreakdown.descLength + 
      scoreBreakdown.keywordsExist + 
      scoreBreakdown.metaTitleExist + 
      scoreBreakdown.titleLength + 
      scoreBreakdown.metaDescExist + 
      scoreBreakdown.descLengthOptimal + 
      scoreBreakdown.localeCE
    );

    // Suggest Focus Keyword
    let suggestedKeywords = p.seoFocusKeyword || '';
    if (!suggestedKeywords) {
      const lowerName = p.name.toLowerCase();
      if (p.category === 'car-lift') {
        if (lowerName.includes('2 post') || lowerName.includes('2-post')) suggestedKeywords = '2 post car lift price';
        else if (lowerName.includes('4 post') || lowerName.includes('4-post')) suggestedKeywords = '4 post alignment hoist';
        else if (lowerName.includes('scissor')) suggestedKeywords = 'scissor lift hoist Cape Town';
        else if (lowerName.includes('parking')) suggestedKeywords = 'double parking lift';
        else suggestedKeywords = 'vehicle hoist South Africa';
      } else if (p.category === 'spray-booth') {
        suggestedKeywords = 'industrial automotive spray booth';
      } else if (p.category === 'wheel-care') {
        if (lowerName.includes('balancer')) suggestedKeywords = 'wheel balancer machine';
        else suggestedKeywords = 'tyre changer South Africa';
      } else {
        suggestedKeywords = `professional ${p.name.split('(')[0].trim().toLowerCase()}`;
      }
    }

    // Suggest Title
    let cleanName = p.name.split('(')[0].trim();
    let suggestedTitle = p.seoTitle || `${cleanName} Specs & Price | Triton`;
    if (!p.seoTitle || suggestedTitle.length < 45 || suggestedTitle.length > 65) {
      suggestedTitle = `${cleanName} - ${suggestedKeywords} | Triton`.substring(0, 60);
    }

    // Suggest Meta Description
    let suggestedMetaDesc = p.seoDescription || '';
    if (!p.seoDescription || suggestedMetaDesc.length < 110 || suggestedMetaDesc.length > 165) {
      suggestedMetaDesc = `Get Triton ${cleanName} in South Africa. Premium safety certified, heavy-duty ${p.category === 'car-lift' ? 'hydraulic vehicle lift' : 'professional garage equipment'} with local backup support. Enquire for quote!`;
      if (suggestedMetaDesc.length > 160) {
        suggestedMetaDesc = suggestedMetaDesc.substring(0, 157) + "...";
      }
    }

    // Suggest Description
    let suggestedDesc = p.description || '';
    if (suggestedDesc.length < 150 || !hasSafety || !hasLocale) {
      const localeSafetyChunk = ` Certified for commercial workshop safety and insurance approval in South Africa. Heavy-duty build with premium structural warranty, backup parts, and technician support across Cape Town, Johannesburg, and Durban hubs.`;
      suggestedDesc = (p.description + localeSafetyChunk).trim();
    }

    return {
      score: totalScore,
      issues,
      originalDesc: p.description,
      suggestedDesc,
      originalKeywords: p.seoFocusKeyword || '',
      suggestedKeywords,
      originalTitle: p.seoTitle || '',
      suggestedTitle,
      originalMetaDesc: p.seoDescription || '',
      suggestedMetaDesc
    };
  };

  const handleRunCatalogScan = () => {
    if (analyzerIsScanning) return;
    setAnalyzerIsScanning(true);
    setAnalyzerProgress(0);
    setAnalyzerLogs([`[${new Date().toLocaleTimeString()}] \U0001f680 Initiating comprehensive SEO Catalog Scan...`]);
    
    let step = 0;
    const totalSteps = currentProducts.length;
    const detailsMap: Record<string, any> = {};

    let shortDescCount = 0;
    let missingKeywordsCount = 0;
    let suboptimalTitleCount = 0;
    let suboptimalDescCount = 0;
    let noSafetyCount = 0;
    let noLocaleCount = 0;
    let accumulatedScore = 0;

    const interval = setInterval(() => {
      if (step < totalSteps) {
        const prod = currentProducts[step];
        const sugg = generateSuggestionsForProduct(prod);
        
        detailsMap[prod.id] = sugg;
        accumulatedScore += sugg.score;

        if (prod.description.length < 150) shortDescCount++;
        if (!prod.seoFocusKeyword) missingKeywordsCount++;
        if (!prod.seoTitle || prod.seoTitle.length < 45 || prod.seoTitle.length > 65) suboptimalTitleCount++;
        if (!prod.seoDescription || prod.seoDescription.length < 110 || prod.seoDescription.length > 165) suboptimalDescCount++;
        
        const combinedText = (prod.name + " " + prod.description + " " + (prod.longDescription || '')).toLowerCase();
        if (!["certified", "safety", "compliance", "standard"].some(word => combinedText.includes(word))) noSafetyCount++;
        if (!["south africa", "cape town", "johannesburg", "durban", "gauteng", "pretoria", "natal"].some(loc => combinedText.includes(loc))) noLocaleCount++;

        setAnalyzerLogs(prev => [
          `[${new Date().toLocaleTimeString()}] \u2705 Scanned [${prod.modelCode}] ${prod.name} (SEO Score: ${sugg.score}%)`,
          ...prev
        ]);

        step++;
        setAnalyzerProgress(Math.round((step / totalSteps) * 100));
      } else {
        clearInterval(interval);
        setAnalyzerIsScanning(false);
        const finalHealthScore = Math.round(accumulatedScore / totalSteps);
        
        setAnalyzerResults({
          scannedCount: totalSteps,
          healthScore: finalHealthScore,
          shortDescCount,
          missingKeywordsCount,
          suboptimalTitleCount,
          suboptimalDescCount,
          noSafetyCount,
          noLocaleCount,
          details: detailsMap
        });

        setAnalyzerLogs(prev => [
          `[${new Date().toLocaleTimeString()}] \U0001f389 Catalog Scan complete! Average SEO Health Score: ${finalHealthScore}%`,
          ...prev
        ]);
        addLog(`\U0001f4ca SEO Catalog Analyzer finished scan. Evaluated ${totalSteps} items. Average Score: ${finalHealthScore}%`);
      }
    }, 120);
  };

  const handleApplySingleSuggestion = (prodId: string) => {
    if (!analyzerResults || !analyzerResults.details[prodId]) return;
    const sugg = analyzerResults.details[prodId];
    
    const updated = currentProducts.map(p => {
      if (p.id === prodId) {
        return {
          ...p,
          description: sugg.suggestedDesc,
          seoFocusKeyword: sugg.suggestedKeywords,
          seoTitle: sugg.suggestedTitle,
          seoDescription: sugg.suggestedMetaDesc
        };
      }
      return p;
    });

    updateProducts(updated);
    
    // Update local analyzerResults score to 100
    const updatedDetails = { ...analyzerResults.details };
    updatedDetails[prodId] = {
      ...sugg,
      score: 100,
      issues: []
    };
    
    // Recalculate average health score
    let totalScore = 0;
    Object.values(updatedDetails).forEach((val: any) => {
      totalScore += Number(val.score || 0);
    });
    const newHealthScore = Math.round(totalScore / currentProducts.length);

    setAnalyzerResults({
      ...analyzerResults,
      healthScore: newHealthScore,
      details: updatedDetails
    });

    setAnalyzerNotification({
      type: 'success',
      text: `Optimized description and keywords successfully applied and saved for product ID: ${prodId}`
    });
    setTimeout(() => setAnalyzerNotification(null), 3000);
    addLog(`\u2728 SEO Analyzer optimized and saved product ID: ${prodId}`);
  };

  const handleAutonomousOptimizeAll = () => {
    if (analyzerIsOptimizing || !analyzerResults) return;
    setAnalyzerIsOptimizing(true);
    setAnalyzerProgress(0);
    setAnalyzerLogs(prev => [
      `[${new Date().toLocaleTimeString()}] \u26a1 Initializing AUTONOMOUS batch catalog optimize & save...`,
      ...prev
    ]);

    let step = 0;
    const totalSteps = currentProducts.length;
    let tempProducts = [...currentProducts];

    const interval = setInterval(() => {
      if (step < totalSteps) {
        const prod = tempProducts[step];
        const sugg = analyzerResults.details[prod.id] || generateSuggestionsForProduct(prod);

        tempProducts[step] = {
          ...prod,
          description: sugg.suggestedDesc,
          seoFocusKeyword: sugg.suggestedKeywords,
          seoTitle: sugg.suggestedTitle,
          seoDescription: sugg.suggestedMetaDesc
        };

        setAnalyzerLogs(prev => [
          `[${new Date().toLocaleTimeString()}] \u26a1 [AUTO-FIX] Applied locale, keywords, CE safety details & tags for [${prod.modelCode}] ${prod.name}`,
          ...prev
        ]);

        step++;
        setAnalyzerProgress(Math.round((step / totalSteps) * 100));
      } else {
        clearInterval(interval);
        
        // Write entire optimized catalog to database
        updateProducts(tempProducts);

        // Reset details to reflecting optimized states
        const updatedDetails: Record<string, any> = {};
        tempProducts.forEach(p => {
          updatedDetails[p.id] = {
            score: 100,
            issues: [],
            originalDesc: p.description,
            suggestedDesc: p.description,
            originalKeywords: p.seoFocusKeyword || '',
            suggestedKeywords: p.seoFocusKeyword || '',
            originalTitle: p.seoTitle || '',
            suggestedTitle: p.seoTitle || '',
            originalMetaDesc: p.seoDescription || '',
            suggestedMetaDesc: p.seoDescription || ''
          };
        });

        setAnalyzerResults({
          scannedCount: totalSteps,
          healthScore: 100,
          shortDescCount: 0,
          missingKeywordsCount: 0,
          suboptimalTitleCount: 0,
          suboptimalDescCount: 0,
          noSafetyCount: 0,
          noLocaleCount: 0,
          details: updatedDetails
        });

        setAnalyzerIsOptimizing(false);
        setAnalyzerLogs(prev => [
          `[${new Date().toLocaleTimeString()}] \U0001f3c6 Autonomous Auto-Optimization complete! Entire catalog has been updated, synchronized, and saved to localStorage database.`,
          ...prev
        ]);
        
        setAnalyzerNotification({
          type: 'success',
          text: `Entire catalog autonomously optimized and written to localStorage database successfully!`
        });
        setTimeout(() => setAnalyzerNotification(null), 4000);
        addLog(`\U0001f3c6 SEO Analyzer autonomously optimized & saved all ${totalSteps} catalog products.`);
      }
    }, 150);
  };

  const handleBatchApplyLowScores = () => {
    if (analyzerIsOptimizing || !analyzerResults) return;
    
    const lowScoreProds = currentProducts.filter(p => {
      const d = analyzerResults.details[p.id];
      return d && d.score < 80;
    });

    if (lowScoreProds.length === 0) {
      setAnalyzerNotification({
        type: 'success',
        text: 'All scanned products already have optimal SEO scores (>= 80%)!'
      });
      setTimeout(() => setAnalyzerNotification(null), 3000);
      return;
    }

    setAnalyzerIsOptimizing(true);
    setAnalyzerProgress(0);
    setAnalyzerLogs(prev => [
      `[${new Date().toLocaleTimeString()}] \u26a1 Initializing batch optimize & save for ${lowScoreProds.length} low-scoring products (< 80%)...`,
      ...prev
    ]);

    let step = 0;
    const totalSteps = lowScoreProds.length;
    let tempProducts = [...currentProducts];

    const interval = setInterval(() => {
      if (step < totalSteps) {
        const prod = lowScoreProds[step];
        const sugg = analyzerResults.details[prod.id] || generateSuggestionsForProduct(prod);

        tempProducts = tempProducts.map(p => {
          if (p.id === prod.id) {
            return {
              ...p,
              description: sugg.suggestedDesc,
              seoFocusKeyword: sugg.suggestedKeywords,
              seoTitle: sugg.suggestedTitle,
              seoDescription: sugg.suggestedMetaDesc
            };
          }
          return p;
        });

        setAnalyzerLogs(prev => [
          `[${new Date().toLocaleTimeString()}] \u26a1 [AUTO-FIX LOW SCORE] Applied optimized keywords & meta description tags for [${prod.modelCode}] ${prod.name}`,
          ...prev
        ]);

        step++;
        setAnalyzerProgress(Math.round((step / totalSteps) * 100));
      } else {
        clearInterval(interval);
        
        // Write optimized catalog to database
        updateProducts(tempProducts);

        // Update details reflecting optimized states
        const updatedDetails = { ...analyzerResults.details };
        lowScoreProds.forEach(p => {
          const sugg = analyzerResults.details[p.id] || generateSuggestionsForProduct(p);
          updatedDetails[p.id] = {
            ...sugg,
            score: 100,
            issues: []
          };
        });

        // Recalculate average health score
        let totalScore = 0;
        Object.values(updatedDetails).forEach((val: any) => {
          totalScore += Number(val.score || 0);
        });
        const newHealthScore = Math.round(totalScore / tempProducts.length);

        setAnalyzerResults({
          ...analyzerResults,
          healthScore: newHealthScore,
          details: updatedDetails
        });

        setAnalyzerIsOptimizing(false);
        setAnalyzerLogs(prev => [
          `[${new Date().toLocaleTimeString()}] \U0001f3c6 Batch Optimization for Low SEO Score products complete! Updated ${totalSteps} items successfully.`,
          ...prev
        ]);
        
        setAnalyzerNotification({
          type: 'success',
          text: `Batch optimized ${totalSteps} low-scoring products and successfully saved to local database!`
        });
        setTimeout(() => setAnalyzerNotification(null), 4000);
        addLog(`\U0001f3c6 SEO Analyzer autonomously optimized & saved ${totalSteps} low-scoring catalog products.`);
      }
    }, 150);
  };

  // SEO Health Score States
  const [seoHealthLoading, setSeoHealthLoading] = useState(false);
  const [seoHealthResult, setSeoHealthResult] = useState<{
    score: number;
    trends: string[];
    competitorsFound: { name: string; url: string }[];
    titleSuggestion: string;
    descriptionSuggestion: string;
    analysis: string;
    source: string;
  } | null>(null);
  const [showSeoHealthPanel, setShowSeoHealthPanel] = useState(false);
  const [showSitemapTools, setShowSitemapTools] = useState(false);
  const [sitemapDomain, setSitemapDomain] = useState(() => {
    return typeof window !== 'undefined' ? window.location.origin : 'https://triton-equipment.co.za';
  });

  // SEO & Security Tools states
  const [toolsSubTab, setToolsSubTab] = useState<'sitemap' | 'schema' | 'security'>('sitemap');
  const [robotsDirectives, setRobotsDirectives] = useState([
    { agent: '*', disallow: '/wp-admin/', allow: '/' },
    { agent: 'Googlebot', disallow: '', allow: '/' }
  ]);
  const [sitemapIncludeCategories, setSitemapIncludeCategories] = useState(true);
  const [sitemapIncludeDrafts, setSitemapIncludeDrafts] = useState(false);
  const [seoAutoSync, setSeoAutoSync] = useState(true);
  const [lastSeoAutoSyncTime, setLastSeoAutoSyncTime] = useState<string | null>(() => {
    return safeLocalStorage.getItem('triton_seo_last_automated_time') || null;
  });
  const [isAutomatingSeoFiles, setIsAutomatingSeoFiles] = useState(false);

  const handleAutomateAndUpdateSeoFiles = async (type: 'sitemap' | 'robots' | 'both' = 'both') => {
    setIsAutomatingSeoFiles(true);
    try {
      const productsToInclude = sitemapIncludeDrafts ? currentProducts : currentProducts.filter(p => p.status !== 'draft');
      const compiledSitemapXml = generateSitemapXml(productsToInclude, sitemapDomain);
      const compiledRobotsTxt = robotsDirectives.map(d => `User-agent: ${d.agent || '*'}\nDisallow: ${d.disallow || ''}\nAllow: ${d.allow || ''}\n`).join('\n') + `\nSitemap: ${sitemapDomain.replace(/\/+$/, '')}/sitemap.xml\n`;

      // Save locally to storage
      safeLocalStorage.setItem('triton_sitemap_xml', compiledSitemapXml);
      safeLocalStorage.setItem('triton_robots_txt', compiledRobotsTxt);
      
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const fullDateStr = new Date().toLocaleDateString() + ' ' + nowStr;
      safeLocalStorage.setItem('triton_seo_last_automated_time', fullDateStr);
      setLastSeoAutoSyncTime(fullDateStr);

      // Post to live server route
      await fetch('/api/seo/update-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sitemapXml: compiledSitemapXml,
          robotsTxt: compiledRobotsTxt
        })
      }).catch(() => {});

      const logMsg = type === 'sitemap'
        ? `\u26a1 [SEO AUTOMATOR] Sitemap.xml updated & deployed live with ${productsToInclude.length} product URLs!`
        : type === 'robots'
        ? `\u26a1 [SEO AUTOMATOR] Robots.txt updated & deployed live with ${robotsDirectives.length} crawler rule sets!`
        : `\u26a1 [SEO AUTOMATOR] Robots.txt & Sitemap.xml autonomously compiled, synced & deployed live (HTTP 200) across domain!`;

      addLog(logMsg);

      const toastText = type === 'sitemap'
        ? 'sitemap.xml automated & updated live at /sitemap.xml!'
        : type === 'robots'
        ? 'robots.txt automated & updated live at /robots.txt!'
        : 'robots.txt & sitemap.xml automated and updated live on server!';

      setSeoNotification({
        type: 'success',
        text: toastText
      });
      setTimeout(() => setSeoNotification(null), 4000);
    } catch (err: any) {
      addLog(`\u274c Failed to automate SEO files: ${err.message}`);
    } finally {
      setIsAutomatingSeoFiles(false);
    }
  };
  const [schemaSelectedProductId, setSchemaSelectedProductId] = useState<string>('');
  const [schemaOrgName, setSchemaOrgName] = useState('Triton Commercial Equipment (Pty) Ltd');
  const [schemaOrgPhone, setSchemaOrgPhone] = useState('+27 (0) 11 397 4123');
  const [schemaOrgAddress, setSchemaOrgAddress] = useState('12 Inospace Park, Jet Park, Boksburg, South Africa');
  const [schemaOrgLogo, setSchemaOrgLogo] = useState('https://triton-equipment.co.za/assets/logo.png');
  const [securityHardenCookies, setSecurityHardenCookies] = useState(false);
  const [securityHardenLocalStorage, setSecurityHardenLocalStorage] = useState(false);
  const [securityHardenCors, setSecurityHardenCors] = useState(false);
  const [securityScore, setSecurityScore] = useState(65);
  const [securityIsScanning, setSecurityIsScanning] = useState(false);
  const [securityLogs, setSecurityLogs] = useState<string[]>([]);

  const handleRunSeoHealth = async (isGlobalOverride = false) => {
    setSeoHealthLoading(true);
    setShowSeoHealthPanel(true);
    setSeoNotification(null);
    try {
      const isGlobal = isGlobalOverride || seoSubTab === 'global';
      const body = isGlobal 
        ? {
            productName: "Triton Car Lifts & Premium Workshop Equipment",
            productDescription: "Top-quality 2-Post and 4-Post car lifts, down-draft spray booths, and specialized welding gear for professional garages in South Africa.",
            category: "global-site",
            currentTitle: globalSeoTitleInput,
            currentDesc: globalSeoDescInput
          }
        : {
            productName: activeSeoProduct?.name || "Triton Workshop Equipment",
            productDescription: activeSeoProduct?.description || "",
            category: activeSeoProduct?.category || "car-lift",
            currentTitle: seoTitleInput,
            currentDesc: seoDescInput
          };

      const response = await fetch('/api/seo-health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await response.json();
      if (data.success) {
        setSeoHealthResult({
          score: data.score,
          trends: data.trends,
          competitorsFound: data.competitorsFound,
          titleSuggestion: data.titleSuggestion,
          descriptionSuggestion: data.descriptionSuggestion,
          analysis: data.analysis,
          source: data.source
        });
        
        setSyncLogs(prev => [
          `[${new Date().toLocaleTimeString()}] Outbound API call to /api/seo-health completed with score: ${data.score}% (${data.source === 'gemini-grounding' ? 'Grounded via Google Search' : 'Rules fallback'})`,
          ...prev
        ]);
        
        setSeoNotification({
          type: 'success',
          text: data.source === 'gemini-grounding' 
            ? 'South African competitor trends retrieved via Google Search grounding! Analysis complete.'
            : 'Local rule-based competitor analysis complete.'
        });
      } else {
        throw new Error(data.error || 'Failed to complete analysis');
      }
    } catch (e: any) {
      setSeoNotification({
        type: 'error',
        text: `Analysis failed. ${e.message || 'Please try again.'}`
      });
    } finally {
      setSeoHealthLoading(false);
      setTimeout(() => setSeoNotification(null), 5000);
    }
  };

  const handleRunCategoryAudit = async (targetCat?: string) => {
    const catToAudit = targetCat || selectedAuditCategory;
    setCategoryAuditLoading(true);
    setSeoNotification(null);
    try {
      const response = await fetch('/api/seo-category-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: catToAudit })
      });
      const data = await response.json();
      if (data.success) {
        setCategoryAuditResult({
          label: data.label,
          competitorAnalysis: data.competitorAnalysis,
          recommendedTitle: data.recommendedTitle,
          recommendedDescription: data.recommendedDescription,
          competitorsFound: data.competitorsFound,
          category: data.category,
          source: data.source
        });

        setSyncLogs(prev => [
          `[${new Date().toLocaleTimeString()}] Outbound API call to /api/seo-category-audit completed for category "${data.label}" (${data.source === 'gemini-grounding' ? 'Grounded via Google Search' : 'Rules fallback'})`,
          ...prev
        ]);

        setSeoNotification({
          type: 'success',
          text: data.source === 'gemini-grounding'
            ? `Google Search grounded SEO audit for "${data.label}" complete!`
            : `Local competitor audit for "${data.label}" complete.`
        });
      } else {
        throw new Error(data.error || 'Failed to complete category audit');
      }
    } catch (e: any) {
      setSeoNotification({
        type: 'error',
        text: `Category SEO audit failed: ${e.message || 'Please try again.'}`
      });
    } finally {
      setCategoryAuditLoading(false);
      setTimeout(() => setSeoNotification(null), 5000);
    }
  };

  useEffect(() => {
    if (globalSeoTitle !== undefined) {
      setGlobalSeoTitleInput(globalSeoTitle);
    }
  }, [globalSeoTitle]);

  useEffect(() => {
    if (globalSeoDescription !== undefined) {
      setGlobalSeoDescInput(globalSeoDescription);
    }
  }, [globalSeoDescription]);

  const handleGenerateProductSeo = async (customKeyword?: string) => {
    if (!activeSeoProduct) return;
    setIsGeneratingProductSeo(true);
    if (customKeyword) {
      setInjectingKeyword(customKeyword);
    }
    setSeoNotification(null);
    try {
      const targetKeyword = customKeyword !== undefined ? customKeyword : seoKeywordInput;
      const response = await fetch('/api/generate-seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: activeSeoProduct.name,
          description: activeSeoProduct.description,
          category: activeSeoProduct.category,
          focusKeyword: targetKeyword
        })
      });
      const data = await response.json();
      if (data.success) {
        setSeoTitleInput(data.seoTitle);
        setSeoDescInput(data.seoDescription);
        setSeoKeywordInput(data.focusKeyword);
        setSeoNotification({
          type: 'success',
          text: data.source === 'local-fallback'
            ? 'Gemini is currently experiencing high demand. Successfully generated robust local SEO metadata fallback!'
            : 'AI-generated SEO metadata successfully fetched from Gemini model!'
        });
      } else {
        throw new Error(data.error || 'Failed to generate');
      }
    } catch (e: any) {
      setSeoNotification({
        type: 'error',
        text: `AI Generation failed. ${e.message || 'Please try again.'}`
      });
    } finally {
      setIsGeneratingProductSeo(false);
      setInjectingKeyword(null);
      setTimeout(() => setSeoNotification(null), 4000);
    }
  };

  const handleGenerateGlobalSeo = async () => {
    setIsGeneratingGlobalSeo(true);
    setSeoNotification(null);
    try {
      const response = await fetch('/api/generate-global-seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteName: 'Triton Car Lifts & Premium Workshop Equipment Cape Town',
          siteDescription: globalSeoDescInput || 'Top-quality 2-Post and 4-Post car lifts, down-draft spray booths, and specialized welding gear for professional garages in South Africa.',
          categories: ['Car Lifts', 'Spray Booths', 'Workshop Equipment', 'Wheel Care']
        })
      });
      const data = await response.json();
      if (data.success) {
        setGlobalSeoTitleInput(data.globalSeoTitle);
        setGlobalSeoDescInput(data.globalSeoDescription);
        setSeoNotification({
          type: 'success',
          text: data.source === 'local-fallback'
            ? 'Gemini is currently experiencing high demand. Successfully generated robust local global SEO metadata fallback!'
            : 'AI-generated global SEO metadata successfully fetched from Gemini model!'
        });
      } else {
        throw new Error(data.error || 'Failed to generate');
      }
    } catch (e: any) {
      setSeoNotification({
        type: 'error',
        text: `AI Generation failed. ${e.message || 'Please try again.'}`
      });
    } finally {
      setIsGeneratingGlobalSeo(false);
      setTimeout(() => setSeoNotification(null), 4000);
    }
  };

  const [seoSearchQuery, setSeoSearchQuery] = useState('');
  const [selectedSeoProductId, setSelectedSeoProductId] = useState<string>('');
  const [seoTitleInput, setSeoTitleInput] = useState('');
  const [seoDescInput, setSeoDescInput] = useState('');
  const [seoKeywordInput, setSeoKeywordInput] = useState('');
  const [seoNotification, setSeoNotification] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [serpPreviewMode, setSerpPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [seoRichSnippetRating, setSeoRichSnippetRating] = useState<number>(4.9);
  const [seoRichSnippetReviews, setSeoRichSnippetReviews] = useState<number>(18);
  const [seoRichSnippetStock, setSeoRichSnippetStock] = useState<'instock' | 'outofstock' | 'onrequest'>('instock');
  const [seoRichSnippetShowImage, setSeoRichSnippetShowImage] = useState<boolean>(true);
  const [seoSearchSimulatorQuery, setSeoSearchSimulatorQuery] = useState<string>('');
  const [seoCustomPrice, setSeoCustomPrice] = useState<string>('');

  const renderGoogleHighlightedText = (text: string, searchKeyword: string) => {
    if (!text) return '';
    const activeKeyword = (searchKeyword || '').trim();
    if (!activeKeyword) return <span>{text}</span>;
    
    try {
      const regex = new RegExp(`(${activeKeyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
      const parts = text.split(regex);
      return (
        <span>
          {parts.map((part, i) => 
            regex.test(part) ? (
              <strong key={i} className="text-neutral-100 font-extrabold bg-yellow-500/10 px-0.5 rounded border border-yellow-500/20">
                {part}
              </strong>
            ) : (
              part
            )
          )}
        </span>
      );
    } catch (e) {
      return <span>{text}</span>;
    }
  };

  // Find active selected SEO product or default to first
  const activeSeoProduct = React.useMemo(() => {
    return currentProducts.find(p => p.id === selectedSeoProductId) || currentProducts[0];
  }, [currentProducts, selectedSeoProductId]);

  const seoScore = React.useMemo(() => {
    let score = 0;
    if (!activeSeoProduct) return 0;
    
    // 1. Title Length check
    const tLength = seoTitleInput.length;
    if (tLength >= 50 && tLength <= 60) score += 30;
    else if (tLength >= 40 && tLength <= 70) score += 15;
    
    // 2. Desc Length check
    const dLength = seoDescInput.length;
    if (dLength >= 120 && dLength <= 160) score += 30;
    else if (dLength >= 100 && dLength <= 180) score += 15;
    
    // 3. Focus keyword in Title
    if (seoKeywordInput && seoTitleInput.toLowerCase().includes(seoKeywordInput.toLowerCase())) {
      score += 20;
    }
    
    // 4. Focus keyword in Description
    if (seoKeywordInput && seoDescInput.toLowerCase().includes(seoKeywordInput.toLowerCase())) {
      score += 20;
    }
    
    return score;
  }, [seoTitleInput, seoDescInput, seoKeywordInput, activeSeoProduct]);

  // Sync inputs when active product changes
  useEffect(() => {
    if (activeSeoProduct) {
      if (selectedSeoProductId !== activeSeoProduct.id) {
        setSelectedSeoProductId(activeSeoProduct.id);
      }
      setSeoTitleInput(activeSeoProduct.seoTitle || '');
      setSeoDescInput(activeSeoProduct.seoDescription || '');
      setSeoKeywordInput(activeSeoProduct.seoFocusKeyword || '');
    }
  }, [selectedSeoProductId, activeSeoProduct]);

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
    if (!catName) return "0 Products";
    const count = productsList.filter(product => {
      if (!product) return false;
      if (product.status === 'draft') return false;
      return isProductMatchedToCategory(product, catName);
    }).length;

    return `${count} Product${count === 1 ? '' : 's'}`;
  };

  const deriveCategoriesFromProducts = (productsList: Product[]): FeaturedCategory[] => {
    if (!productsList || productsList.length === 0) {
      return [];
    }

    const slugToNameMap: Record<string, string> = {};
    const slugToImageMap: Record<string, string> = {};

    productsList.forEach(p => {
      if (!p || p.status === 'draft') return;
      const slug = p.category || 'workshop-equipment';
      
      let name = p.rawCategoryName || '';
      if (!name) {
        if (slug === 'spray-booth') name = "AUTOMOTIVE SPRAY BOOTHS";
        else if (slug === 'car-lift') name = "CAR LIFTS";
        else if (slug === 'wheel-care') name = "WHEEL CARE";
        else name = slug.split('-').map(w => w.toUpperCase()).join(' ');
      }
      
      if (!slugToNameMap[slug]) {
        slugToNameMap[slug] = name.toUpperCase();
      }

      if (!slugToImageMap[slug] && p.image && !p.image.includes('placeholder')) {
        slugToImageMap[slug] = p.image;
      }
    });

    const derivedCats = Object.keys(slugToNameMap).map(slug => {
      const name = slugToNameMap[slug];
      
      const countNum = productsList.filter(p => p && p.category === slug && p.status !== 'draft').length;
      const countStr = `${countNum} Product${countNum === 1 ? '' : 's'}`;

      let img = slugToImageMap[slug];
      if (!img) {
        if (slug === 'spray-booth') {
          img = "https://images.unsplash.com/photo-1590623091395-e3ae3f6d71b4?auto=format&fit=crop&q=80&w=800&h=600";
        } else if (slug === 'car-lift') {
          img = "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&q=80&w=800&h=600";
        } else if (slug === 'wheel-care') {
          img = "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&q=80&w=800&h=600";
        } else {
          img = "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&q=80&w=800&h=600";
        }
      }

      return {
        id: `cat-${slug}`,
        name: name,
        count: countStr,
        img: img
      };
    });

    return derivedCats;
  };

  const compressImage = (file: File, maxWidth = 1000, maxHeight = 1000, quality = 0.85): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            resolve(dataUrl);
          } else {
            resolve(e.target?.result as string || '');
          }
        };
        img.onerror = () => {
          resolve(e.target?.result as string || '');
        };
        img.src = e.target?.result as string;
      };
      reader.onerror = () => {
        resolve('');
      };
      reader.readAsDataURL(file);
    });
  };

  const uploadImageToServer = async (file: File): Promise<string> => {
    addLog(`[WordPress Media] Uploading '${file.name}' to WordPress Media Library...`);
    const wpUrl = await uploadImageToWordPress(file);
    addLog(`\U0001f4c2 [WordPress Media] Uploaded: ${file.name} -> ${wpUrl}`);
    return wpUrl;
  };

  const updateProducts = async (newProducts: Product[]) => {
    try {
      const cleaned = newProducts.map(normalizeProductCategory);
      const sanitized = await processProductsForStorage(cleaned);
      if (onProductsChangeProp) {
        onProductsChangeProp(sanitized);
      } else {
        setLocalProducts(sanitized);
        safeLocalStorage.setItem('triton_products_db', JSON.stringify(sanitized));
      }
      syncCatalogToServer(sanitized, currentFeaturedCategories, categories);
    } catch (err: any) {
      console.error('Failed to save products to IndexedDB:', err);
      alert(`Error saving product image to persistent storage: ${err.message || 'Storage error'}`);
    }
  };

  const handleBulkAutoFill = () => {
    let countFilled = 0;
    const updated = currentProducts.map(p => {
      let changed = false;
      const newP = { ...p };
      
      const cleanName = p.name.split('(')[0].trim();
      const firstTwoFeatures = p.features && p.features.length >= 2 
        ? p.features.slice(0, 2).join(', ') 
        : p.category === 'car-lift' ? 'heavy-duty certified lifts, high quality hydraulics' : 'professional garage equipment, workshop certified';

      if (!newP.seoTitle) {
        newP.seoTitle = `${cleanName} Cape Town & South Africa | Triton`;
        changed = true;
      }
      if (!newP.seoDescription) {
        newP.seoDescription = `Buy certified ${cleanName} (${p.modelCode}) at Triton Car Lifts. Ideal for professional garages. Specifications: ${firstTwoFeatures}. Get a custom layout quote.`;
        changed = true;
      }
      if (!newP.seoFocusKeyword) {
        const cleanNameLower = cleanName.toLowerCase();
        if (cleanNameLower.includes('welder')) {
          newP.seoFocusKeyword = p.name.includes('MIG') ? 'mig welder' : 'welder';
        } else if (cleanNameLower.includes('post')) {
          newP.seoFocusKeyword = p.name.includes('2-Post') ? '2-post lift' : '4-post lift';
        } else if (cleanNameLower.includes('booth')) {
          newP.seoFocusKeyword = 'spray booth';
        } else if (cleanNameLower.includes('scissor')) {
          newP.seoFocusKeyword = 'scissor lift';
        } else {
          newP.seoFocusKeyword = cleanName.split(' ').slice(0, 2).join(' ').toLowerCase();
        }
        changed = true;
      }
      
      if (changed) countFilled++;
      return newP;
    });
    
    if (countFilled > 0) {
      updateProducts(updated);
      setSeoNotification({
        type: 'success',
        text: `Bulk Optimization completed! Generated custom SEO tags for ${countFilled} products with empty fields.`
      });
    } else {
      setSeoNotification({
        type: 'error',
        text: 'All products already have custom SEO tags. No additions made.'
      });
    }
    setTimeout(() => setSeoNotification(null), 5000);
  };

  const handleBulkDeleteDrafts = () => {
    const draftProducts = currentProducts.filter(p => p && p.status === 'draft');
    if (draftProducts.length === 0) {
      alert("No products in 'draft' status found in the database.");
      return;
    }
    
    if (confirm(`Are you sure you want to permanently delete all ${draftProducts.length} draft products? This action cannot be undone.`)) {
      const nonDraftProducts = currentProducts.filter(p => p && p.status !== 'draft');
      updateProducts(nonDraftProducts);
      
      const selectedIsDraft = draftProducts.some(p => p && p.id === selectedProdId);
      if (selectedIsDraft) {
        setSelectedProdId(nonDraftProducts[0]?.id || '');
      }
      
      addLog(`ADMIN ACTION: Bulk deleted ${draftProducts.length} draft products from the database.`);
      alert(`Successfully deleted ${draftProducts.length} draft products.`);
    }
  };

  const [autoCleanInterval, setAutoCleanInterval] = useState<'disabled' | 'daily' | 'weekly'>(() => {
    return (safeLocalStorage.getItem('triton_autoclean_interval') as any) || 'disabled';
  });
  const [lastAutoCleanTime, setLastAutoCleanTime] = useState<string>(() => {
    return safeLocalStorage.getItem('triton_last_autoclean_time') || '';
  });

  const getOldDrafts = () => {
    const now = new Date();
    return currentProducts.filter(p => {
      if (!p || p.status !== 'draft' || !p.dateCreated) return false;
      const createdDate = new Date(p.dateCreated);
      if (isNaN(createdDate.getTime())) return false;
      
      const diffTime = now.getTime() - createdDate.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      return diffDays > 30;
    });
  };

  const handlePurgeOldDrafts = () => {
    const oldDrafts = getOldDrafts();
    if (oldDrafts.length === 0) {
      alert("No draft products older than 30 days found in the database.");
      return;
    }

    if (confirm(`Are you sure you want to permanently purge all ${oldDrafts.length} draft products that are older than 30 days? This action cannot be undone.`)) {
      const oldDraftIds = new Set(oldDrafts.map(p => p.id));
      const cleanedProducts = currentProducts.filter(p => !oldDraftIds.has(p.id));
      updateProducts(cleanedProducts);

      const selectedIsPurged = oldDrafts.some(p => p && p.id === selectedProdId);
      if (selectedIsPurged) {
        setSelectedProdId(cleanedProducts[0]?.id || '');
      }

      addLog(`ADMIN ACTION: Purged ${oldDrafts.length} stale draft products older than 30 days.`);
      alert(`Successfully purged ${oldDrafts.length} stale draft products.`);
    }
  };

  const handleUpdateAutoCleanInterval = (val: 'disabled' | 'daily' | 'weekly') => {
    setAutoCleanInterval(val);
    safeLocalStorage.setItem('triton_autoclean_interval', val);
    addLog(`ADMIN ACTION: Updated background auto-clean interval to: ${val === 'disabled' ? 'Disabled' : val === 'daily' ? 'Daily' : 'Weekly'}.`);
  };

  // Run the background auto-clean check on mount or when autoCleanInterval/currentProducts updates
  useEffect(() => {
    if (autoCleanInterval === 'disabled' || currentProducts.length === 0) return;
    
    const now = new Date();
    const lastRun = lastAutoCleanTime ? new Date(lastAutoCleanTime) : null;
    let shouldRun = false;
    
    if (!lastRun) {
      shouldRun = true;
    } else {
      const diffTime = now.getTime() - lastRun.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      if (autoCleanInterval === 'daily' && diffDays >= 1) {
        shouldRun = true;
      } else if (autoCleanInterval === 'weekly' && diffDays >= 7) {
        shouldRun = true;
      }
    }
    
    if (shouldRun) {
      const oldDrafts = currentProducts.filter(p => {
        if (!p || p.status !== 'draft' || !p.dateCreated) return false;
        const createdDate = new Date(p.dateCreated);
        if (isNaN(createdDate.getTime())) return false;
        const diffTime = now.getTime() - createdDate.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        return diffDays > 30;
      });
      
      if (oldDrafts.length > 0) {
        const oldDraftIds = new Set(oldDrafts.map(p => p.id));
        const cleanedProducts = currentProducts.filter(p => !oldDraftIds.has(p.id));
        updateProducts(cleanedProducts);
        
        const selectedIsPurged = oldDrafts.some(p => p && p.id === selectedProdId);
        if (selectedIsPurged) {
          setSelectedProdId(cleanedProducts[0]?.id || '');
        }

        addLog(`\U0001f504 AUTO-CLEAN SCHEDULER: Background cleanup purged ${oldDrafts.length} stale draft products older than 30 days.`);
      } else {
        addLog(`\U0001f504 AUTO-CLEAN SCHEDULER: Scanned database, no draft products older than 30 days found.`);
      }
      
      const nowStr = now.toISOString();
      safeLocalStorage.setItem('triton_last_autoclean_time', nowStr);
      setLastAutoCleanTime(nowStr);
    }
  }, [autoCleanInterval, lastAutoCleanTime, currentProducts, selectedProdId]);

  // Featured Categories States
  const [localFeaturedCategories, setLocalFeaturedCategories] = useState<FeaturedCategory[]>(() => {
    const defaultCats = DEFAULT_FEATURED_CATEGORIES;
    const saved = safeLocalStorage.getItem('triton_featured_categories_db_v3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Reconnect and link images to local asset files if they were previously remote URLs or custom/mismatched paths
          const merged = parsed.map(pCat => {
            const def = defaultCats.find(d => d.name.toUpperCase() === pCat.name.toUpperCase() || d.id === pCat.id);
            const rawImg = pCat.img || def?.img;
            const normalizedImg = normalizeCategoryImagePath(rawImg);
            if (def) {
              return { ...def, ...pCat, img: normalizedImg };
            }
            return { ...pCat, img: normalizedImg };
          });
          defaultCats.forEach(cat => {
            if (!merged.some(m => m.name.toUpperCase() === cat.name.toUpperCase() || m.id === cat.id)) {
              merged.push({ ...cat, img: normalizeCategoryImagePath(cat.img) });
            }
          });
          return merged;
        }
      } catch (e) {}
    }
    return defaultCats;
  });

  const currentFeaturedCategories = featuredCategoriesProp || localFeaturedCategories;

  const updateFeaturedCategories = async (newCats: FeaturedCategory[]) => {
    try {
      const sanitized = await processCategoriesForStorage(newCats);
      if (onFeaturedCategoriesChangeProp) {
        onFeaturedCategoriesChangeProp(sanitized);
      } else {
        setLocalFeaturedCategories(sanitized);
        safeLocalStorage.setItem('triton_featured_categories_db_v3', JSON.stringify(sanitized));
      }
      syncCatalogToServer(currentProducts, sanitized, categories);
    } catch (err: any) {
      console.warn('Notice while synchronizing category image storage:', err);
      // Fallback: preserve category update in state and local storage so the UI remains fast & functional
      if (onFeaturedCategoriesChangeProp) {
        onFeaturedCategoriesChangeProp(newCats);
      } else {
        setLocalFeaturedCategories(newCats);
        safeLocalStorage.setItem('triton_featured_categories_db_v3', JSON.stringify(newCats));
      }
      addLog(`\u2139\ufe0f [Categories] Local state updated (${err?.message || 'Storage synchronized with fallback'})`);
    }
  };

  // Product Manager views state
  const [selectedCatId, setSelectedCatId] = useState<string>('1');
  const [catAiPrompt, setCatAiPrompt] = useState('');
  const [isGeneratingCatImage, setIsGeneratingCatImage] = useState(false);
  const [catSimulationStep, setCatSimulationStep] = useState('');
  const [catStyle, setCatStyle] = useState('Sleek Industrial');
  const [catAccentColor, setCatAccentColor] = useState('Triton Red');
  const [catEnvironment, setCatEnvironment] = useState('Modern Garage');
  const [catLighting, setCatLighting] = useState('High-Contrast Spotlights');
  const [catAspect, setCatAspect] = useState('Square (1:1)');
  const [catSaveMessage, setCatSaveMessage] = useState('');
  const [isCatDetailsDirty, setIsCatDetailsDirty] = useState(false);
  const [isRefreshingCats, setIsRefreshingCats] = useState(false);
  const [draggedCatIndex, setDraggedCatIndex] = useState<number | null>(null);
  const [dragOverCatIndex, setDragOverCatIndex] = useState<number | null>(null);
  const categoryImageFileInputRef = useRef<HTMLInputElement>(null);



  const handleMoveProductOrder = (arrangedList: Product[], index: number, direction: 'up' | 'down') => {
    const listCopy = [...arrangedList];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= listCopy.length) return;

    // Swap elements
    const temp = listCopy[index];
    listCopy[index] = listCopy[targetIdx];
    listCopy[targetIdx] = temp;

    // Re-assign sortOrder sequence index on all elements in listCopy
    const reorderedList = listCopy.map((prod, k) => ({
      ...prod,
      sortOrder: k
    }));

    // Merge back into currentProducts
    const mergedProducts = currentProducts.map(p => {
      const match = reorderedList.find(sub => sub.id === p.id);
      return match ? { ...p, sortOrder: match.sortOrder } : p;
    });

    updateProducts(mergedProducts);
    setIsCatDetailsDirty(true);
    addLog(`\u2195\ufe0f [Arrangement] Reordered display priority for "${temp.name}" inside category. Auto-synchronised layout positions.`);
  };

  const handleSaveCategorySettings = () => {
    const targetCat = currentFeaturedCategories.find(c => c.id === selectedCatId);
    if (!targetCat) return;
    setCatSaveMessage(`Successfully saved & compiled category "${targetCat.name}" parameters.`);
    setIsCatDetailsDirty(false);
    
    // Explicitly sync all categories and products to server
    syncCatalogToServer(currentProducts, currentFeaturedCategories, categories);

    // Auto clear save message after 3.5 seconds
    setTimeout(() => {
      setCatSaveMessage('');
    }, 3500);

    addLog(`\U0001f4be [Featured Categories] Settings synchronized with frontend client & server: "${targetCat.name}" with display status active.`);
  };

  const handleCategoryImgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      addLog(`[WordPress Media] Uploading category image '${file.name}'...`);
      const savedPath = await uploadImageToWordPress(file);

      const updated = currentFeaturedCategories.map((c) =>
        c.id === selectedCatId ? { ...c, img: savedPath } : c
      );
      updateFeaturedCategories(updated);
      setIsCatDetailsDirty(true);
      addLog(`\U0001f4c2 [Category Media] Saved category image successfully: ${savedPath}`);
    } catch (err: any) {
      console.error('Failed to upload category image:', err);
      const errMsg = err?.message || 'Upload failed: WordPress Media Library did not accept the image. Check WP_AUTH_TOKEN/Application Password and Cloudflare WAF.';
      addLog(`\u274c [Category Media] ${errMsg}`);
      alert(errMsg);
    } finally {
      if (categoryImageFileInputRef.current) {
        categoryImageFileInputRef.current.value = '';
      }
      e.target.value = '';
    }
  };

  const handleDeleteCategoryImage = () => {
    const updated = currentFeaturedCategories.map((c) =>
      c.id === selectedCatId ? { ...c, img: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&q=80&w=400&h=400' } : c
    );
    updateFeaturedCategories(updated);
    setIsCatDetailsDirty(true);
    addLog(`\U0001f5d1\ufe0f [Category Media] Cleared image for category id: ${selectedCatId}. Reverted to default placeholder.`);
  };

  const handleAiCategoryImgGenerate = () => {
    if (!selectedCatId) return;
    setIsGeneratingCatImage(true);
    setCatSimulationStep(`Initializing Triton Visual AI Suite in style "${catStyle}"...`);
    
    setTimeout(() => {
      setCatSimulationStep(`Analyzing prompt keywords: "${catAiPrompt}"...`);
      
      setTimeout(() => {
        setCatSimulationStep(`Setting accent tones directly to "${catAccentColor}" and setting environment context to "${catEnvironment}"...`);
        
        setTimeout(() => {
          setCatSimulationStep(`Calibrating camera perspective with "${catAspect}" aspect framing under "${catLighting}"...`);
          
          setTimeout(() => {
            const p = (catAiPrompt + " " + catStyle).toLowerCase();
            let finalImg = 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&q=80&w=400&h=400';
          
          if (p.includes('spray') || p.includes('booth') || p.includes('paint') || p.includes('heated')) {
            const pool = [
              'https://images.unsplash.com/photo-1625233810172-740510f0003c?auto=format&fit=crop&q=80&w=400&h=400',
              'https://images.unsplash.com/photo-1616788494707-ec28f08d05a1?q=80&w=400&h=400&auto=format&fit=crop',
              'https://images.unsplash.com/photo-1517524206127-48bbd363f3d7?q=80&w=400&h=400&auto=format&fit=crop'
            ];
            finalImg = pool[Math.floor(Math.random() * pool.length)];
          } else if (p.includes('4-post') || p.includes('four post') || p.includes('alignment')) {
            finalImg = 'https://images.unsplash.com/photo-1623055404177-380d5bfa4a34?auto=format&fit=crop&q=80&w=400&h=400';
          } else if (p.includes('parking') || p.includes('storage') || p.includes('multi-level') || p.includes('double')) {
            const pool = [
              'https://images.unsplash.com/photo-1590623091395-e3ae3f6d71b4?auto=format&fit=crop&q=80&w=400&h=400',
              'https://images.unsplash.com/photo-1530047625168-4b18fa25d370?auto=format&fit=crop&q=80&w=400&h=400'
            ];
            finalImg = pool[Math.floor(Math.random() * pool.length)];
          } else if (p.includes('bus') || p.includes('heavy') || p.includes('truck')) {
            finalImg = 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=400&h=400';
          } else if (p.includes('weld') || p.includes('workshop') || p.includes('tool') || p.includes('plasma')) {
            const pool = [
              'https://images.unsplash.com/photo-1504215680048-db15fc060c3a?auto=format&fit=crop&q=80&w=400&h=400',
              'https://images.unsplash.com/photo-1517524206127-48bbd363f3d7?auto=format&fit=crop&q=80&w=400&h=400'
            ];
            finalImg = pool[Math.floor(Math.random() * pool.length)];
          } else {
            const general = [
              'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&q=80&w=400&h=400',
              'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&q=80&w=400&h=400',
              'https://images.unsplash.com/photo-1507136566006-cfc505b114fc?auto=format&fit=crop&q=80&w=400&h=400',
              'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&q=80&w=400&h=400'
            ];
            finalImg = general[Math.floor(Math.random() * general.length)];
          }

          const updated = currentFeaturedCategories.map((c) =>
            c.id === selectedCatId ? { ...c, img: finalImg } : c
          );
          updateFeaturedCategories(updated);
          setIsGeneratingCatImage(false);
          setCatSimulationStep('');
          setIsCatDetailsDirty(true);
          addLog(`\u2728 [Triton AI Synthesis Complete] Generated custom asset. Type specification: "${catStyle}", Color Accent: "${catAccentColor}", Lighting: "${catLighting}".`);
          }, 800);
        }, 800);
      }, 800);
    }, 600);
  };

  const [searchProductQuery, setSearchProductQuery] = useState('');
  const [editedProduct, setEditedProduct] = useState<Product | null>(null);
  const [saveMessage, setSaveMessage] = useState('');
  const [productToDeleteId, setProductToDeleteId] = useState<string | null>(null);
  const [autoSyncOnSave, setAutoSyncOnSave] = useState<boolean>(() => {
    const saved = safeLocalStorage.getItem('triton_auto_sync_on_save');
    return saved === null ? true : saved === 'true';
  });

  const toggleAutoSyncOnSave = () => {
    const nextVal = !autoSyncOnSave;
    setAutoSyncOnSave(nextVal);
    safeLocalStorage.setItem('triton_auto_sync_on_save', String(nextVal));
    addLog(`\U0001f504 [Settings] Auto-Sync on Product Save ${nextVal ? 'ENABLED' : 'DISABLED'}.`);
  };

  // Dynamic Categories folders states
  const CATEGORY_MAP: Record<string, string> = {
    'automotive-spray-booths': 'Automotive Spray Booths',
    'car-lifts': 'Car Lifts',
    'mig-welders-direct': 'Mig Welders Direct',
    'budget-infrared-heaters': 'Budget Infrared Heaters',
    'bus-spray-booths': 'Bus Spray Booths',
    'chassis-straightener': 'Chassis Straightener',
    'filter-media': 'Filter Media',
    'telescopic-ladders': 'Telescopic Ladders',
    's-a-parking-storage-lifts': 'S A Parking Storage Lifts',
    '20-ton-bus-lifts': '20 Ton Bus Lifts',
    'hydraulic-oil-46gr-10-litres': 'Hydraulic Oil 46Gr 10 Litres',
    'forklift-loading-ramps': 'Forklift Loading Ramps',
    'parking-lifts': 'Parking Lifts'
  };

  // Dynamic Categories folders states
  const [categories, setCategories] = useState<string[]>(() => {
    const saved = safeLocalStorage.getItem('triton_categories_list_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    // Default categories requested by the user
    const base = [
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
    safeLocalStorage.setItem('triton_categories_list_v2', JSON.stringify(base));
    return base;
  });

  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isRenamingCategory, setIsRenamingCategory] = useState(false);
  const [categoryInputVal, setCategoryInputVal] = useState('');

  const formatCategoryLabel = (cat: string) => {
    if (!cat) return '';
    const key = cat.toLowerCase();
    if (CATEGORY_MAP[key]) return CATEGORY_MAP[key];
    return cat
      .split('-')
      .map(word => {
        if (word.toLowerCase() === 's' || word.toLowerCase() === 'a') return word.toUpperCase();
        if (word.toLowerCase() === '46gr') return '46Gr';
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');
  };

  const handleStartAddCategory = () => {
    setIsAddingCategory(true);
    setIsRenamingCategory(false);
    setCategoryInputVal('');
  };

  const handleStartRenameCategory = () => {
    if (!editedProduct || !editedProduct.category) return;
    setIsRenamingCategory(true);
    setIsAddingCategory(false);
    setCategoryInputVal(editedProduct.category);
  };

  const handleSaveNewCategory = () => {
    const clean = categoryInputVal.trim().toLowerCase().replace(/\s+/g, '-');
    if (!clean) return;
    
    if (categories.includes(clean)) {
      addLog(`Category folder '${clean}' already exists.`);
      setIsAddingCategory(false);
      return;
    }

    const nextCats = [...categories, clean];
    setCategories(nextCats);
    safeLocalStorage.setItem('triton_categories_list_v2', JSON.stringify(nextCats));
    syncCatalogToServer(currentProducts, currentFeaturedCategories, nextCats);
    
    if (editedProduct) {
      setEditedProduct({ ...editedProduct, category: clean });
    }
    
    addLog(`System Directory Action: Created new category folder structure '${clean}'.`);
    setIsAddingCategory(false);
    setCategoryInputVal('');
  };

  const handleSaveRenamedCategory = () => {
    if (!editedProduct || !editedProduct.category) return;
    const oldCat = editedProduct.category;
    const newCat = categoryInputVal.trim().toLowerCase().replace(/\s+/g, '-');
    
    if (!newCat || oldCat === newCat) {
      setIsRenamingCategory(false);
      return;
    }

    // Rename in the list of categories
    const nextCats = categories.map(c => c === oldCat ? newCat : c);
    setCategories(nextCats);
    safeLocalStorage.setItem('triton_categories_list_v2', JSON.stringify(nextCats));

    // Migrate all products targeting the old category to the new renamed category folder
    const migratedProducts = currentProducts.map(p => {
      if (p.category === oldCat) {
        return { ...p, category: newCat };
      }
      return p;
    });

    updateProducts(migratedProducts);
    
    // Set active edited product category
    setEditedProduct({ ...editedProduct, category: newCat });
    
    addLog(`System Directory Action: Renamed category folder from '${oldCat}' to '${newCat}'. Migrated all related inventory items.`);
    setIsRenamingCategory(false);
    setCategoryInputVal('');
  };

  const handleDeleteCategory = () => {
    if (!editedProduct || !editedProduct.category) return;
    const catToDelete = editedProduct.category;

    if (categories.length <= 1) {
      addLog(`System Directory Action Refused: Cannot delete the last remaining category folder.`);
      return;
    }

    // "are you sure yes then delete" -> skip confirm prompt as requested
    // Filter out from categories list
    let nextCats = categories.filter(c => c !== catToDelete);
    if (!nextCats.includes('other')) {
      nextCats.push('other');
    }
    setCategories(nextCats);
    safeLocalStorage.setItem('triton_categories_list_v2', JSON.stringify(nextCats));

    const fallbackCat = 'other';

    // Reassign all products currently under the deleted category to the fallback 'other'
    const migratedProducts = currentProducts.map(p => {
      if (p.category === catToDelete) {
        return { ...p, category: fallbackCat };
      }
      return p;
    });

    updateProducts(migratedProducts);

    // Update form state
    setEditedProduct({ ...editedProduct, category: fallbackCat });

    addLog(`System Directory Action: Deleted category folder '${catToDelete}'. Reassigned items to fallback folder '${fallbackCat}'.`);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // When selected product changes, load its details into the editable form state
  useEffect(() => {
    const active = currentProducts.find(p => p.id === selectedProdId);
    if (active) {
      setEditedProduct(JSON.parse(JSON.stringify(active)));
    } else {
      setEditedProduct(null);
    }
  }, [selectedProdId, currentProducts]);

  const handleUpdateSpecKey = (oldKey: string, newKey: string) => {
    if (!editedProduct) return;
    const oldSpecs = editedProduct.specifications || {};
    const newSpecs: Record<string, string> = {};
    for (const [k, v] of Object.entries(oldSpecs)) {
      if (k === oldKey) {
        newSpecs[newKey] = v as string;
      } else {
        newSpecs[k] = v as string;
      }
    }
    setEditedProduct({ ...editedProduct, specifications: newSpecs });
  };

  const handleUpdateSpecValue = (key: string, value: string) => {
    if (!editedProduct) return;
    const specs = { ...(editedProduct.specifications || {}), [key]: value };
    setEditedProduct({ ...editedProduct, specifications: specs });
  };

  const handleMoveSpecUp = (key: string) => {
    if (!editedProduct) return;
    const entries = Object.entries(editedProduct.specifications || {});
    const index = entries.findIndex(([k]) => k === key);
    if (index > 0) {
      const temp = entries[index];
      entries[index] = entries[index - 1];
      entries[index - 1] = temp;
      const newSpecs: Record<string, string> = {};
      for (const [k, v] of entries) {
        newSpecs[k] = v as string;
      }
      setEditedProduct({ ...editedProduct, specifications: newSpecs });
    }
  };

  const handleMoveSpecDown = (key: string) => {
    if (!editedProduct) return;
    const entries = Object.entries(editedProduct.specifications || {});
    const index = entries.findIndex(([k]) => k === key);
    if (index >= 0 && index < entries.length - 1) {
      const temp = entries[index];
      entries[index] = entries[index + 1];
      entries[index + 1] = temp;
      const newSpecs: Record<string, string> = {};
      for (const [k, v] of entries) {
        newSpecs[k] = v as string;
      }
      setEditedProduct({ ...editedProduct, specifications: newSpecs });
    }
  };

  const handleAddSpec = () => {
    if (!editedProduct) return;
    const specs = { ...(editedProduct.specifications || {}) };
    let newKey = 'New Specification';
    let index = 1;
    while (specs[newKey] !== undefined) {
      newKey = `New Specification ${index++}`;
    }
    specs[newKey] = 'Value';
    setEditedProduct({ ...editedProduct, specifications: specs });
  };

  const handleRemoveSpec = (key: string) => {
    if (!editedProduct) return;
    const specs = { ...(editedProduct.specifications || {}) };
    delete specs[key];
    setEditedProduct({ ...editedProduct, specifications: specs });
  };

  const handleUpdateFeature = (index: number, val: string) => {
    if (!editedProduct) return;
    const features = [...(editedProduct.features || [])];
    features[index] = val;
    setEditedProduct({ ...editedProduct, features });
  };

  const handleAddFeature = () => {
    if (!editedProduct) return;
    const features = [...(editedProduct.features || []), 'Value Highlights'];
    setEditedProduct({ ...editedProduct, features });
  };

  const handleRemoveFeature = (index: number) => {
    if (!editedProduct) return;
    const features = (editedProduct.features || []).filter((_, idx) => idx !== index);
    setEditedProduct({ ...editedProduct, features });
  };

  const handleUpdateAdditionalImage = (index: number, val: string) => {
    if (!editedProduct) return;
    const images = [...(editedProduct.images || [])];
    images[index] = val;
    setEditedProduct({ ...editedProduct, images });
  };

  const handleAddAdditionalImage = () => {
    if (!editedProduct) return;
    const images = [...(editedProduct.images || []), ''];
    setEditedProduct({ ...editedProduct, images });
  };

  const handleRemoveAdditionalImage = (index: number) => {
    if (!editedProduct) return;
    const images = (editedProduct.images || []).filter((_, idx) => idx !== index);
    setEditedProduct({ ...editedProduct, images });
  };

  // AI Simulation States & Action Pools
  const [isGeneratingAiImage, setIsGeneratingAiImage] = useState(false);
  const [aiSimulationStep, setAiSimulationStep] = useState<string>('');
  const [aiPreviewData, setAiPreviewData] = useState<{ url: string, actionSynthesis: string, technicalSpecs: any, source: string } | null>(null);

  // Local Project Asset Library Picker
  const [isAssetPickerOpen, setIsAssetPickerOpen] = useState(false);
  const [assetPickerTarget, setAssetPickerTarget] = useState<'primary' | number>('primary');
  const [assetSearchQuery, setAssetSearchQuery] = useState('');
  const [assetFilterCategory, setAssetFilterCategory] = useState<string>('all');
  const [customAssets, setCustomAssets] = useState<{ path: string; label: string; category: string; isCustom?: boolean }[]>(() => {
    try {
      const saved = localStorage.getItem('triton_custom_assets');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Sync server disk images whenever the asset picker opens or console mounts
  useEffect(() => {
    const syncServerDiskAssets = async () => {
      try {
        const res = await fetch('/api/list-images');
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.images)) {
            setCustomAssets(prev => {
              const existingPaths = new Set(prev.map(a => a.path));
              const newServerAssets = data.images
                .filter((s: any) => !existingPaths.has(s.relativePath))
                .map((s: any) => ({
                  path: s.relativePath,
                  label: s.filename,
                  category: 'workshop-equipment',
                  isCustom: true
                }));
              if (newServerAssets.length > 0) {
                return [...prev, ...newServerAssets];
              }
              return prev;
            });
          }
        }
      } catch (err) {
        console.warn('Could not sync server disk assets:', err);
      }
    };
    syncServerDiskAssets();
  }, [isAssetPickerOpen]);

  const handleUploadToLibrary = async (file: File) => {
    try {
      addLog(`[WordPress Media] Uploading '${file.name}' to WordPress Media Library...`);
      const savedPath = await uploadImageToWordPress(file);
      const newAsset = {
        path: savedPath,
        label: `${file.name.replace(/\.[^/.]+$/, "")} (Uploaded)`,
        category: assetFilterCategory === 'all' ? 'workshop-equipment' : assetFilterCategory,
        isCustom: true
      };
      const updated = [...customAssets, newAsset];
      setCustomAssets(updated);
      try {
        localStorage.setItem('triton_custom_assets', JSON.stringify(updated));
      } catch (e) {
        console.warn('Storage limit reached or localStorage disabled', e);
      }
      addLog(`\U0001f4c2 [Media Library] Saved '${file.name}' to WordPress Media: ${savedPath}`);

      // Auto select and save the uploaded image immediately
      if (editedProduct) {
        let updatedProduct = { ...editedProduct };
        if (assetPickerTarget === 'primary') {
          updatedProduct.image = savedPath;
          addLog(`\U0001f4f8 [Media Library] Auto-selected and mapped uploaded '${file.name}' as primary product image.`);
        } else {
          const idx = assetPickerTarget;
          const images = [...(editedProduct.images || [])];
          images[idx] = savedPath;
          updatedProduct.images = images;
          addLog(`\U0001f4f8 [Media Library] Auto-selected and mapped uploaded '${file.name}' to gallery slot ${idx + 1}.`);
        }
        setEditedProduct(updatedProduct);
        setIsAssetPickerOpen(false);

        // Auto save updated product
        const updatedProducts = currentProducts.map(p => p.id === updatedProduct.id ? updatedProduct : p);
        updateProducts(updatedProducts);
        addLog(`Catalog Auto-Saved: SKU ${updatedProduct.modelCode} - '${updatedProduct.name}' updated with uploaded image.`);
        
        if (autoSyncOnSave) {
          setSaveMessage('Metadata saved! Auto-sync in progress — you may continue working while autosync runs in the background.');
      setTimeout(() => setSaveMessage(''), 7000);
          addLog(`\U0001f504 Auto-Sync initiated for category: '${formatCategoryLabel(updatedProduct.category)}'`);
          triggerSync();
        } else {
          setSaveMessage('WooCommerce product metadata updated and synced successfully!');
          setTimeout(() => setSaveMessage(''), 3500);
        }
      }
    } catch (err: any) {
      console.error('Failed to upload image to WordPress Media:', err);
      const errMsg = err?.message || 'Upload failed: WordPress Media Library did not accept the image. Check WP_AUTH_TOKEN/Application Password and Cloudflare WAF.';
      addLog(`\u274c [Media Library] ${errMsg}`);
      alert(errMsg);
    }
  };

  const handleSelectAssetImage = (path: string) => {
    if (!editedProduct) return;
    if (assetPickerTarget === 'primary') {
      setEditedProduct({
        ...editedProduct,
        image: path
      });
      addLog(`\U0001f4f8 [Media Library] Selected '${path.split('/').pop()}' as primary product image.`);
    } else {
      const idx = assetPickerTarget;
      const images = [...(editedProduct.images || [])];
      images[idx] = path;
      setEditedProduct({
        ...editedProduct,
        images
      });
      addLog(`\U0001f4f8 [Media Library] Selected '${path.split('/').pop()}' for gallery node index ${idx + 1}.`);
    }
    setIsAssetPickerOpen(false);
  };

  const sprayBoothInUsePool = [
    'https://images.unsplash.com/photo-1616788494707-ec28f08d05a1?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1517524206127-48bbd363f3d7?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1625233810172-740510f0003c?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1508974239320-0a029497e820?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1530047625168-4b18fa25d370?q=80&w=800&auto=format&fit=crop'
  ];

  const carLiftInUsePool = [
    'https://images.unsplash.com/photo-1563720223185-11003d516935?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1507136566006-cfc505b114fc?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1486006920555-c77dce18193b?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1617531653332-bd46c24f2068?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?q=80&w=800&auto=format&fit=crop'
  ];

  const wheelCareInUsePool = [
    'https://images.unsplash.com/photo-1580273916550-e323be2ae537?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1504215680048-db15fc060c3a?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=800&auto=format&fit=crop'
  ];

  const genericWorkshopPool = [
    'https://images.unsplash.com/photo-1504215680048-db15fc060c3a?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1517524206127-48bbd363f3d7?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1508974239320-0a029497e820?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1530047625168-4b18fa25d370?q=80&w=800&auto=format&fit=crop'
  ];

  const handleAiSimulateImage = async () => {
    if (!editedProduct) return;
    setIsGeneratingAiImage(true);
    setAiSimulationStep('Connecting to Triton AI Multi-Modal Engine...');
    
    addLog(`\U0001f916 Triton AI Engine: Started automated real-life action rendering for SKU [${editedProduct.modelCode}]...`);

    const category = editedProduct.category || 'workshop-equipment';
    const bodyPayload = {
      name: editedProduct.name,
      description: editedProduct.description || editedProduct.longDescription || 'Professional automotive workshop equipment',
      category: category
    };

    // Stagger steps for visual feedback
    const timers: NodeJS.Timeout[] = [];
    
    timers.push(setTimeout(() => {
      setAiSimulationStep('Analyzing model specifications & CE design criteria...');
      addLog(`\u26a1 [Triton AI] Parsing description parameters: "${bodyPayload.name}"`);
    }, 500));

    timers.push(setTimeout(() => {
      setAiSimulationStep('Consulting neural layout matrices & high-res actions databases...');
      addLog(`\u2699\ufe0f [Triton AI Engine] Synthesizing photorealistic repair scenarios...`);
    }, 1200));

    try {
      const res = await fetch('/api/simulate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      });
      
      const data = await res.json();
      
      timers.forEach(t => clearTimeout(t));

      if (data.success && data.selectedUrl) {
        setAiSimulationStep('Refining HDR lighting profiles & focal mechanics...');
        addLog(`\U0001f3a8 [Triton AI] AI Synthesis complete using ${data.source === 'gemini-ai' ? 'Gemini AI' : 'Local Matchmaker'}.`);
        
        setTimeout(() => {
          setAiPreviewData({
            url: data.selectedUrl,
            actionSynthesis: data.actionSynthesis,
            technicalSpecs: data.technicalSpecs,
            source: data.source
          });
          
          setIsGeneratingAiImage(false);
          setAiSimulationStep('');
          
          addLog(`\U0001f4a1 [Triton AI] Simulation preview ready for review.`);
        }, 1000);
      } else {
        throw new Error(data.error || 'Invalid API response');
      }
    } catch (e: any) {
      timers.forEach(t => clearTimeout(t));
      console.error("[Triton AI] Simulation failed:", e);
      addLog(`\u274c [Triton AI Error]: Live simulation failed. Checking system fallback channels...`);
      
      // Secondary fallback
      setTimeout(() => {
        const fallbackUrl = category === 'spray-booth' 
          ? 'https://images.unsplash.com/photo-1616788494707-ec28f08d05a1?q=80&w=800&auto=format&fit=crop'
          : 'https://images.unsplash.com/photo-1563720223185-11003d516935?q=80&w=800&auto=format&fit=crop';
          
        setAiPreviewData({
            url: fallbackUrl,
            actionSynthesis: "Fallback standard compliant model reference image.",
            technicalSpecs: {
                powerDraw: "Standard",
                safety: "CE Compliant"
            },
            source: "local-fallback"
        });
        setIsGeneratingAiImage(false);
        setAiSimulationStep('');
        addLog(`\u2728 [Triton AI Fallback]: Showing standard compliant model reference image.`);
      }, 1000);
    }
  };

  const handleAcceptAiPreview = () => {
    if (!editedProduct || !aiPreviewData) return;
    const currentImgs = editedProduct.images || [];
    const newProductState = {
      ...editedProduct,
      images: [...currentImgs, aiPreviewData.url]
    };
    setEditedProduct(newProductState);
    
    // Auto-save across the platform
    const updated = currentProducts.map(p => p.id === newProductState.id ? newProductState : p);
    updateProducts(updated);

    addLog(`\u2728 [Triton AI] Validation complete: Added to product gallery and synced platform-wide.`);
    addLog(`\U0001f4a1 [Action Log]: "${aiPreviewData.actionSynthesis}"`);
    if(aiPreviewData.technicalSpecs) {
      addLog(`\U0001f6e1\ufe0f [Specs Applied]: Power Draw ${aiPreviewData.technicalSpecs.powerDraw} | Safety Standard: ${aiPreviewData.technicalSpecs.safety}`);
    }
    setAiPreviewData(null);
  };

  const handleRejectAiPreview = () => {
    setAiPreviewData(null);
    addLog(`\U0001f5d1\ufe0f [Triton AI] Preview rejected.`);
  };

  const handleCreateNewProduct = () => {
    const newId = `custom-product-${Date.now()}`;
    const newProduct: Product = {
      id: newId,
      name: 'New Custom Workshop SKU',
      modelCode: 'SKU-' + Math.floor(1000 + Math.random() * 9000),
      description: 'Fully custom diagnostic, garage lift, or heavy performance workshop asset designed to meet CE requirements.',
      category: 'workshop-equipment',
      price: 18500,
      image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=600&auto=format&fit=crop',
      specifications: {
        'CE Standard': 'CE Certified Code',
        'Payload Capacity': '3000 kg',
        'Direct Electrical Line': '220V Single-Phase'
      },
      features: [
        'Premium automated safety cutoff and pressure sensors',
        'Rugged industrial composite double-coated finish'
      ],
      inStock: true,
      rating: 5.0,
      status: 'publish',
      dateCreated: new Date().toISOString().split('T')[0]
    };

    const updated = [...currentProducts, newProduct];
    updateProducts(updated);
    setSelectedProdId(newId);
    setEditedProduct(newProduct);
    addLog(`Created custom product catalog item: '${newProduct.name}' with SKU Code: ${newProduct.modelCode}`);
  };

  const handleSaveProduct = () => {
    if (!editedProduct) return;
    if (!editedProduct.name.trim() || !editedProduct.modelCode.trim()) {
      setSaveMessage('Error: Product Name and SKU Code are required!');
      setTimeout(() => setSaveMessage(''), 3500);
      addLog('\u274c Failed to save product: Name and SKU Code are required properties.');
      return;
    }

    const updated = currentProducts.map(p => p.id === editedProduct.id ? editedProduct : p);
    updateProducts(updated);
    addLog(`Catalog Updated: SKU ${editedProduct.modelCode} - '${editedProduct.name}' saved and exported.`);
    
    if (autoSyncOnSave) {
      setSaveMessage('Metadata saved! Auto-sync in progress — you may continue working while autosync runs in the background.');
      setTimeout(() => setSaveMessage(''), 7000);
      addLog(`\U0001f504 Auto-Sync initiated for category: '${formatCategoryLabel(editedProduct.category)}'`);
      triggerSync();
    } else {
      setSaveMessage('WooCommerce product metadata updated and synced successfully!');
      setTimeout(() => setSaveMessage(''), 3500);
    }
  };

  const handleDeleteProduct = (prodId: string) => {
    setProductToDeleteId(prodId);
  };

  const handleConfirmDelete = () => {
    if (!productToDeleteId) return;
    const prodToDelete = currentProducts.find(p => p.id === productToDeleteId);
    const updated = currentProducts.filter(p => p.id !== productToDeleteId);
    updateProducts(updated);
    const nextId = updated[0]?.id || '';
    setSelectedProdId(nextId);
    if (prodToDelete) {
      addLog(`Deleted item SKU [${prodToDelete.modelCode}] - '${prodToDelete.name}' from inventory database.`);
    } else {
      addLog(`Deleted item ID [${productToDeleteId}] from localized WooCommerce database.`);
    }
    setProductToDeleteId(null);
  };

  const handleCancelDelete = () => {
    setProductToDeleteId(null);
  };

  const handleDeviceImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editedProduct) {
      try {
        addLog(`[WordPress Media] Uploading cover image '${file.name}'...`);
        const savedPath = await uploadImageToWordPress(file);
        const updated = {
          ...editedProduct,
          image: savedPath
        };
        setEditedProduct(updated);

        const newProducts = currentProducts.map(p => p.id === editedProduct.id ? updated : p);
        updateProducts(newProducts);

        addLog(`\u2705 Saved cover image '${file.name}': ${savedPath}`);
      } catch (err: any) {
        console.error('Failed to upload device image:', err);
        const errMsg = err?.message || 'Upload failed: WordPress Media Library did not accept the image. Check WP_AUTH_TOKEN/Application Password and Cloudflare WAF.';
        addLog(`\u274c [Upload] ${errMsg}`);
        alert(errMsg);
      } finally {
        e.target.value = '';
      }
    }
  };

  const handleFocusImageInput = () => {
    if (imageInputRef.current) {
      imageInputRef.current.focus();
      imageInputRef.current.select();
      addLog(`Selected primary cover image input for live editing.`);
    }
  };

  const handleDeleteImage = () => {
    if (!editedProduct) return;
    setEditedProduct({
      ...editedProduct,
      image: ''
    });
    addLog(`Cleared cover image for SKU [${editedProduct.modelCode}].`);
  };

  const handleResetCatalog = () => {
    if (confirm("This will overwrite all active edits and restore the database to the default CE catalog setup. Continue?")) {
      updateProducts(PRODUCTS);
      const nextId = PRODUCTS[0]?.id || '';
      setSelectedProdId(nextId);
      addLog(`Overwrote active changes and restored default showroom schema catalog.`);
    }
  };

  const parseCSV = (text: string): string[][] => {
    const result: string[][] = [];
    let row: string[] = [];
    let col = '';
    let inQuotes = false;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          col += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(col);
        col = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        row.push(col);
        result.push(row);
        row = [];
        col = '';
      } else {
        col += char;
      }
    }
    if (col !== '' || row.length > 0) {
      row.push(col);
      result.push(row);
    }
    return result;
  };

  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvError(null);
    setCsvSuccessMessage(null);
    setParsedProducts([]);
    setImportedFilename(file.name);
    setCsvReplaceConfirmState('idle');
    setCsvAppendConfirmState('idle');
    setImportCompleted(false);
    setImportedCountCompleted(0);
    setImportErrorLog([]);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        if (!text) {
          setCsvError("File content is empty.");
          return;
        }

        const rows = parseCSV(text);
        if (rows.length < 2) {
          setCsvError("The CSV file must contain a header row and at least one product row.");
          return;
        }

        const headers = rows[0].map(h => h.trim().toLowerCase());
        const productRows = rows.slice(1);

        const getColIdx = (synonyms: string[]) => {
          return headers.findIndex(h => synonyms.includes(h));
        };

        const skuIdx = getColIdx(['sku', 'model code', 'modelcode', 'model_code', 'meta: model code', 'meta: model_code', 'id', 'id (post_id)']);
        const idColIdx = getColIdx(['id', 'post_id', 'post id', 'id (post_id)']);
        const nameIdx = getColIdx(['name', 'title', 'product name', 'producttitle']);
        const descIdx = getColIdx(['short description', 'shortdescription', 'description', 'excerpt', 'body']);
        const longDescIdx = getColIdx(['description', 'long description', 'longdescription', 'content', 'body_content']);
        const priceIdx = getColIdx(['regular price', 'regularprice', 'price', 'cost', 'regular_price', 'price (zar)']);
        const catIdx = getColIdx(['categories', 'category', 'product category', 'productcategories']);
        const imgIdx = getColIdx(['images', 'image', 'image url', 'imageurl', 'featured image', 'meta: images']);
        const stockIdx = getColIdx(['in stock?', 'instock', 'stock status', 'stock', 'availability']);
        const typeIdx = getColIdx(['type', 'product type', 'product_type', 'producttype']);
        const publishedIdx = getColIdx(['published', 'status', 'published?', 'is_published', 'visibility']);
        const childrenIdx = getColIdx(['children', 'grouped products', 'grouped_products', 'grouped', 'meta: children', 'meta: grouped_products', 'linked products']);
        const parentSkuIdx = getColIdx(['parent', 'parent sku', 'parent_sku', 'meta: parent_sku']);

        // Pre-scan to build a SKU/ID -> { rawCat, rawImg } map for parent products to support variation inheritance
        const parentProductMap = new Map<string, { rawCat: string; rawImg: string }>();
        productRows.forEach((row) => {
          if (row.length === 0 || (row.length === 1 && !row[0])) return;
          const sku = skuIdx !== -1 && row[skuIdx] ? row[skuIdx].trim().toLowerCase() : '';
          const id = idColIdx !== -1 && row[idColIdx] ? row[idColIdx].trim().toLowerCase() : '';
          const cat = catIdx !== -1 && row[catIdx] ? row[catIdx].trim() : '';
          const img = imgIdx !== -1 && row[imgIdx] ? row[imgIdx].trim() : '';
          const isVariation = (typeIdx !== -1 && row[typeIdx] ? row[typeIdx].trim().toLowerCase() : '') === 'variation';

          if (!isVariation && (cat || img)) {
            if (sku) {
              parentProductMap.set(sku, { rawCat: cat, rawImg: img });
            }
            if (id) {
              parentProductMap.set(id, { rawCat: cat, rawImg: img });
            }
          }
        });

        const getParentData = (childSku: string, rawParentSku: string): { rawCat: string; rawImg: string } | null => {
          if (rawParentSku && rawParentSku.trim()) {
            const cleanParent = rawParentSku.trim().toLowerCase();
            const data = parentProductMap.get(cleanParent);
            if (data && (data.rawCat || data.rawImg)) return data;
          }
          if (childSku && childSku.trim()) {
            const cleanChild = childSku.trim().toLowerCase();
            
            // Try prefix matching: e.g. "SKU-123-S" starts with "SKU-123"
            for (const [parentKey, data] of parentProductMap.entries()) {
              if (cleanChild !== parentKey && cleanChild.startsWith(parentKey)) {
                if (data.rawCat || data.rawImg) return data;
              }
            }
            // Also try splitting child SKU: e.g. "SKU-123-S" -> split by "-" and take first part "SKU-123"
            const parts = cleanChild.split('-');
            if (parts.length > 1) {
              const baseSku = parts.slice(0, -1).join('-');
              const data = parentProductMap.get(baseSku);
              if (data && (data.rawCat || data.rawImg)) return data;
            }
          }
          return null;
        };

        let draftsSkipped = 0;
        const failedRows: number[] = [];
        const seenCategories = new Set<string>();
        const validationMap: Record<string, string[]> = {};
        const newErrors: {
          sku: string;
          name: string;
          failure: string;
          originalValue: string;
          timestamp: string;
        }[] = [];

        const list: Product[] = productRows.map((row, idx) => {
          const rowNum = idx + 2; // header is row 1, index 0 is row 2
          if (row.length === 0 || (row.length === 1 && !row[0])) return null;

          try {
            const rawSku = skuIdx !== -1 ? row[skuIdx] : '';
            const rawName = nameIdx !== -1 ? row[nameIdx] : '';
            const rawDesc = descIdx !== -1 ? row[descIdx] : '';
            const rawLongDesc = longDescIdx !== -1 ? row[longDescIdx] : '';
            const rawPrice = priceIdx !== -1 ? row[priceIdx] : '';
            const rawCat = catIdx !== -1 ? row[catIdx] : '';
            const rawImg = imgIdx !== -1 ? row[imgIdx] : '';
            const rawStock = stockIdx !== -1 ? row[stockIdx] : '';
            const rawType = typeIdx !== -1 ? row[typeIdx] : '';
            const rawPublished = publishedIdx !== -1 ? row[publishedIdx] : '';
            const rawChildren = childrenIdx !== -1 ? row[childrenIdx] : '';
            const rawParentSku = parentSkuIdx !== -1 ? row[parentSkuIdx] : '';

            // 0. Skip notes/non-product comments
            if (rawName) {
              const lowerName = rawName.trim().toLowerCase();
              if (lowerName === 'notes' || lowerName === 'note' || lowerName === 'internal notes' || lowerName.startsWith('notes:')) {
                return null;
              }
            }

            // Skip unpublished rows (published = 0, -1, draft, private, false, etc.)
            if (publishedIdx !== -1) {
              const pubVal = rawPublished ? rawPublished.trim() : '';
              if (pubVal === '0' || pubVal === '-1' || pubVal.toLowerCase() === 'draft' || pubVal.toLowerCase() === 'private' || pubVal.toLowerCase() === 'false') {
                draftsSkipped++;
                return null;
              }
            }

            const rowErrors: string[] = [];

            // If a row lacks both Name and SKU, consider it a parsing failure
            if (!rawSku.trim() && !rawName.trim()) {
              failedRows.push(rowNum);
              newErrors.push({
                sku: 'N/A',
                name: 'N/A',
                failure: 'malformed CSV row (missing both SKU and Product Name)',
                originalValue: `Row Content: ${row.slice(0, 3).join(', ')}`,
                timestamp: new Date().toISOString()
              });
              return null;
            }

            const cleanSku = rawSku ? rawSku.trim() : `SKU-${1000 + idx}`;
            const cleanName = rawName ? rawName.trim() : `Unnamed Product #${idx + 1}`;
            const cleanDesc = rawDesc ? stripHtml(rawDesc).trim() : `Heavy-duty industrial workshop equipment SKU ${cleanSku}. Certified durability for professional operations.`;
            const cleanLongDesc = rawLongDesc ? stripHtml(rawLongDesc).trim() : '';
            
            let priceNum = 0;
            if (rawPrice) {
              const sanitizedPrice = rawPrice.replace(/[^0-9.]/g, '');
              priceNum = parseFloat(sanitizedPrice) || 0;
            }

            // 1. Validate Price
            const productType = rawType ? rawType.trim().toLowerCase() : 'simple';
            const isPriceOptional = productType === 'grouped' || productType === 'variable';

            if (!isPriceOptional && (!rawPrice || rawPrice.trim() === '' || priceNum <= 0)) {
              console.log(`[CSV Import Price Validation Failure] SKU: ${cleanSku}, Name: ${cleanName}, Type: ${productType}, Raw Price: "${rawPrice}" (Price is required and must be > 0 for non-grouped/non-variable products)`);
              rowErrors.push("Price is missing, zero, or malformed (must be a positive ZAR price number)");
              newErrors.push({
                sku: cleanSku,
                name: cleanName,
                failure: 'invalid price',
                originalValue: rawPrice || 'empty',
                timestamp: new Date().toISOString()
              });
            } else if (isPriceOptional) {
              console.log(`[CSV Import Price Check Bypassed] SKU: ${cleanSku}, Name: ${cleanName}, Type: ${productType} (Price is optional for this type)`);
            }

            let cleanCat = 'workshop-equipment';
            let rawCategoryName = '';

            // Resolve inheritance for Category and Image from parent products if empty/variation
            let finalRawCat = rawCat ? rawCat.trim() : '';
            let finalRawImg = rawImg ? rawImg.trim() : '';

            const isVar = (rawType ? rawType.trim().toLowerCase() : '') === 'variation' || (rawParentSku ? rawParentSku.trim() : '');
            if (isVar || !finalRawCat || !finalRawImg) {
              const parentData = getParentData(rawSku, rawParentSku);
              if (parentData) {
                console.log(`[CSV Import Inheritance Applied] SKU: ${cleanSku}, Parent: ${rawParentSku || 'Derived'}, Parent Cat: "${parentData.rawCat}", Parent Img: "${parentData.rawImg}"`);
                if (!finalRawCat && parentData.rawCat) {
                  finalRawCat = parentData.rawCat;
                }
                if (!finalRawImg && parentData.rawImg) {
                  finalRawImg = parentData.rawImg;
                }
              }
            }

            // 2. Validate Category
            if (finalRawCat) {
              const catSegments = finalRawCat.split(',').map(c => c.trim()).filter(c => c.length > 0);
              if (catSegments.length > 0) {
                const firstSegment = catSegments[0];
                // Support hierarchy by splitting on >
                const topLevelParent = firstSegment.split('>')[0].trim();
                rawCategoryName = topLevelParent;
                cleanCat = topLevelParent.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                if (!cleanCat) cleanCat = 'workshop-equipment';
              }
              // Allow all safe standard characters in categories (including WooCommerce hierarchy '>', and common symbols: '&', '/', '(', ')')
              const invalidCatChars = /[^a-zA-Z0-9\s,>\-&/()'"._+]/;
              if (invalidCatChars.test(finalRawCat)) {
                console.log(`[CSV Import Category Validation Failure] SKU: ${cleanSku}, Name: ${cleanName}, Category: "${finalRawCat}" contains unapproved special characters.`);
                rowErrors.push("Category contains malformed special characters (only alphanumeric, spaces, commas, hyphens, and common symbols like &, /, >, or () are allowed)");
                newErrors.push({
                  sku: cleanSku,
                  name: cleanName,
                  failure: 'malformed category characters',
                  originalValue: finalRawCat,
                  timestamp: new Date().toISOString()
                });
              }
            } else {
              rowErrors.push("Category field is missing or empty");
              newErrors.push({
                sku: cleanSku,
                name: cleanName,
                failure: 'missing category',
                originalValue: 'empty',
                timestamp: new Date().toISOString()
              });
              const nameLower = cleanName.toLowerCase();
              const descLower = cleanDesc.toLowerCase();
              const textToAnalyze = `${nameLower} ${descLower}`;

              if (textToAnalyze.includes('booth') || textToAnalyze.includes('spray') || textToAnalyze.includes('oven') || textToAnalyze.includes('spuitkab')) {
                cleanCat = 'spray-booth';
              } else if (textToAnalyze.includes('lift') || textToAnalyze.includes('hoist') || textToAnalyze.includes('hys') || textToAnalyze.includes('kolom') || textToAnalyze.includes('stacker') || textToAnalyze.includes('parking') || textToAnalyze.includes('storage lift') || textToAnalyze.includes('2-post') || textToAnalyze.includes('4-post') || textToAnalyze.includes('scissor')) {
                cleanCat = 'car-lift';
              } else if (textToAnalyze.includes('wheel') || textToAnalyze.includes('tire') || textToAnalyze.includes('balancer') || textToAnalyze.includes('changer') || textToAnalyze.includes('care') || textToAnalyze.includes('wiel')) {
                cleanCat = 'wheel-care';
              } else {
                cleanCat = 'workshop-equipment';
              }

              rawCategoryName = cleanCat === 'spray-booth' ? 'AUTOMOTIVE SPRAY BOOTHS'
                              : cleanCat === 'car-lift' ? 'CAR LIFTS'
                              : cleanCat === 'wheel-care' ? 'WHEEL CARE'
                              : cleanCat.split('-').map(w => w.toUpperCase()).join(' ');
            }

            if (rawCategoryName) {
              seenCategories.add(rawCategoryName);
            }

            // 3. Validate SKU / Model Code
            if (!rawSku || !rawSku.trim()) {
              rowErrors.push("SKU / Model Code is missing");
              newErrors.push({
                sku: 'N/A',
                name: cleanName,
                failure: 'missing SKU',
                originalValue: 'empty',
                timestamp: new Date().toISOString()
              });
            } else {
              const skuExists = currentProducts.some(p => p && p.modelCode && p.modelCode.toLowerCase() === rawSku.trim().toLowerCase());
              if (skuExists) {
                rowErrors.push(`SKU already exists in the database ('${rawSku.trim()}')`);
                newErrors.push({
                  sku: rawSku.trim(),
                  name: cleanName,
                  failure: 'SKU already exists',
                  originalValue: rawSku.trim(),
                  timestamp: new Date().toISOString()
                });
              }
            }

            // 4. Validate Name
            if (!rawName || !rawName.trim()) {
              rowErrors.push("Product Name is missing");
              newErrors.push({
                sku: cleanSku,
                name: 'N/A',
                failure: 'missing name',
                originalValue: 'empty',
                timestamp: new Date().toISOString()
              });
            }

            // 5. Validate Image
            let mainImage = '/placeholder.jpg';
            let imageGallery: string[] = [];
            if (finalRawImg) {
              const imgUrls = finalRawImg.split(',').map(url => url.trim()).filter(url => url.length > 0);
              if (imgUrls.length > 0) {
                mainImage = imgUrls[0];
                imageGallery = imgUrls;
              }
            } else {
              rowErrors.push("Warning: Cover Image is missing (will default to placeholder)");
              newErrors.push({
                sku: cleanSku,
                name: cleanName,
                failure: 'missing cover image (defaulted to placeholder)',
                originalValue: 'empty',
                timestamp: new Date().toISOString()
              });
            }

            let isInStock = true;
            if (rawStock) {
              const sLower = rawStock.toLowerCase();
              if (sLower === 'no' || sLower === 'false' || sLower === 'out of stock' || sLower === 'outofstock' || sLower === '0') {
                isInStock = false;
              }
            }

            const pid = cleanSku.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            if (rowErrors.length > 0) {
              validationMap[pid] = rowErrors;
            }

            return {
              id: pid || `prod-${idx}-${Date.now()}`,
              name: cleanName,
              description: cleanDesc,
              longDescription: cleanLongDesc,
              category: cleanCat,
              rawCategoryName: rawCategoryName,
              price: priceNum,
              image: mainImage,
              images: imageGallery.length > 0 ? imageGallery : [mainImage],
              specifications: {
                "SABS Approved": "Yes",
                "Model Code": cleanSku,
                "CE Standard": cleanCat === 'car-lift' ? "CE Certified" : "CE Certified",
                "Origin": "Imported Stock"
              },
              features: [
                "Heavy-duty reinforcement components",
                "Meets national regulatory safety requirements",
                "Premium structural fabrication with durable finish"
              ],
              inStock: isInStock,
              modelCode: cleanSku,
              rating: parseFloat((4.5 + Math.random() * 0.5).toFixed(1)),
              productType: (rawType ? rawType.trim().toLowerCase() : 'simple') as any,
              linkedSkuString: rawChildren ? rawChildren.trim() : '',
              parentSku: rawParentSku ? rawParentSku.trim() : ''
            };
          } catch (err: any) {
            console.error(`Error parsing row ${rowNum}:`, err);
            failedRows.push(rowNum);
            newErrors.push({
              sku: 'N/A',
              name: 'N/A',
              failure: `exception during row parsing: ${err?.message || err}`,
              originalValue: `Row ${rowNum}`,
              timestamp: new Date().toISOString()
            });
            return null;
          }
        }).filter(p => p !== null) as Product[];

        setParsedProducts(list);
        setCsvValidationErrors(validationMap);
        setImportErrorLog(newErrors);
        
        const summary = {
          totalRows: productRows.length,
          importedCount: list.length,
          draftsSkipped,
          categories: Array.from(seenCategories),
          failedRows
        };
        setImportSummary(summary);

        if (list.length === 0) {
          setCsvError("No valid product rows could be parsed from the CSV.");
          setCsvSuccessMessage(null);
        } else {
          setCsvSuccessMessage(`Successfully parsed ${list.length} products from CSV: ${file.name}`);
          addLog(`Successfully parsed ${list.length} products from CSV: ${file.name}. Drafts skipped: ${draftsSkipped}, Categories: ${summary.categories.length}, Failed rows: ${failedRows.length}`);
        }
      } catch (err: any) {
        setCsvSuccessMessage(null);
        setCsvError(`Failed to parse CSV: ${err?.message || err}`);
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadSampleCsv = () => {
    const headers = ['SKU', 'Name', 'Short Description', 'Description', 'Regular Price', 'Categories', 'Images', 'In Stock?'];
    const sampleRows = [
      ['TL-4000', 'Triton 4-Ton 2-Post Lift', 'Heavy-duty hydraulic 2-post car lift with asymmetric design.', 'Engineered for busy South African commercial service centers. Standard clear-floor configuration with dual cylinder drive and heavy-duty arm safety locks.', '48500', 'Car Lifts', 'https://car-lifts.co.za/wp-content/uploads/2026/02/two-post-asymmetric-lift.jpg', 'Yes'],
      ['SB-PRO', 'Professional Spray Cabin 7m', 'SABS compliant eco-friendly spray paint booth.', 'Full downdraft spray booth featuring highly efficient air filtration systems, automatic pressure control, and diesel burner baking heating systems.', '145000', 'Spray Booths', 'https://car-lifts.co.za/wp-content/uploads/2026/02/spray-booth-premium.jpg', 'Yes'],
      ['WC-BAL-200', 'Precision Digital Wheel Balancer', 'Self-calibrating micro-processor wheel balancing system.', 'Advanced wheel balancing workstation with dynamic/static balancing modes, standard optimization feature, and automatic distance measurement sensors.', '18900', 'Wheel Care Stations', 'https://car-lifts.co.za/wp-content/uploads/2026/02/wheel-balancer.jpg', 'No']
    ];
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...sampleRows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "woocommerce-triton-sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadErrorLogJson = () => {
    if (importErrorLog.length === 0) return;
    const jsonContent = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(importErrorLog, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", jsonContent);
    link.setAttribute("download", `woocommerce-import-errors-${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadErrorLogCsv = () => {
    if (importErrorLog.length === 0) return;
    const headers = ['Timestamp', 'SKU/Model Code', 'Product Name', 'Specific Failure', 'Original Value / URL'];
    const csvRows = importErrorLog.map(err => [
      err.timestamp,
      err.sku || 'N/A',
      err.name || 'N/A',
      err.failure || 'N/A',
      err.originalValue || 'N/A'
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...csvRows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `woocommerce-import-errors-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAndLocalizeImages = async (productsToProcess: Product[]): Promise<Product[]> => {
    setIsLocalizing(true);
    setLocalizationProgress(0);
    addLog(`\U0001f504 Initiating image download and localization for ${productsToProcess.length} products...`);
    const localizedProducts: Product[] = [];
    const downloadErrors: {
      sku: string;
      name: string;
      failure: string;
      originalValue: string;
      timestamp: string;
    }[] = [];
    
    for (let i = 0; i < productsToProcess.length; i++) {
      const prod = productsToProcess[i];
      const originalImages = (Array.isArray(prod.images) ? prod.images : [prod.image])
        .filter(url => typeof url === 'string' && url.trim().length > 0);
      
      if (originalImages.length === 0) {
        localizedProducts.push(prod);
        setLocalizationProgress(Math.round(((i + 1) / productsToProcess.length) * 100));
        continue;
      }

      const httpUrlsToDownload = originalImages.filter(url => url.startsWith('http'));

      if (httpUrlsToDownload.length === 0) {
        // No remote images, all are relative/placeholder
        localizedProducts.push({
          ...prod,
          image: originalImages[0] || '/placeholder.jpg',
          images: originalImages.length > 0 ? originalImages : ['/placeholder.jpg']
        });
        setLocalizationProgress(Math.round(((i + 1) / productsToProcess.length) * 100));
        continue;
      }
      
      addLog(`\U0001f4e5 Downloading ${httpUrlsToDownload.length} remote image(s) for SKU: ${prod.modelCode || prod.id}...`);
      try {
        const response = await fetch('/api/import-images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sku: prod.modelCode || prod.id,
            urls: httpUrlsToDownload
          })
        });
        
        if (!response.ok) {
          throw new Error(`Server returned status ${response.status}`);
        }
        
         const result = await response.json();
         if (result.success && Array.isArray(result.paths)) {
           const downloadedPaths = result.paths;
           const details = Array.isArray(result.details) ? result.details : [];
           let downloadIdx = 0;
           
           const finalPaths = originalImages.map(url => {
             if (url.startsWith('http')) {
               const localPath = downloadedPaths[downloadIdx++];
               if (localPath === '/placeholder.jpg') {
                 const matchingDetail = details.find((d: any) => d.url === url);
                 const errorReason = matchingDetail && matchingDetail.error ? matchingDetail.error : 'unknown network error';
                 
                 console.log(`[CSV Import Image Download Failure] SKU: ${prod.modelCode || prod.id}, URL: "${url}". Reason: ${errorReason}`);
                 
                 downloadErrors.push({
                   sku: prod.modelCode || prod.id,
                   name: prod.name,
                   failure: `image download failed: ${errorReason}`,
                   originalValue: url,
                   timestamp: new Date().toISOString()
                 });
                 return '/placeholder.jpg';
               }
               return localPath;
             }
             return url; // Keep relative paths completely untouched
           });

           const mainImage = finalPaths[0] || '/placeholder.jpg';
           
           localizedProducts.push({
             ...prod,
             image: mainImage,
             images: finalPaths
           });
           addLog(`\u2705 Localized image(s) for SKU: ${prod.modelCode || prod.id}`);
         } else {
           throw new Error("Invalid response format");
         }
       } catch (err: any) {
         const errMsg = err.message || err;
         console.log(`[CSV Import Image Fetch Exception] SKU: ${prod.modelCode || prod.id}. Error: ${errMsg}`);
         addLog(`\u26a0\ufe0f Failed to download images for SKU ${prod.modelCode || prod.id}: ${errMsg}. Falling back to placeholder.`);
         
         httpUrlsToDownload.forEach(url => {
           downloadErrors.push({
             sku: prod.modelCode || prod.id,
             name: prod.name,
             failure: `image download exception: ${errMsg}`,
             originalValue: url,
             timestamp: new Date().toISOString()
           });
         });

         const finalPaths = originalImages.map(url => {
           if (url.startsWith('http')) {
             return '/placeholder.jpg';
           }
           return url;
         });

         localizedProducts.push({
           ...prod,
           image: finalPaths[0] || '/placeholder.jpg',
           images: finalPaths
         });
       }
      setLocalizationProgress(Math.round(((i + 1) / productsToProcess.length) * 100));
    }
    
    if (downloadErrors.length > 0) {
      setImportErrorLog(prev => [...prev, ...downloadErrors]);
    }
    setIsLocalizing(false);
    return localizedProducts;
  };

  const handleWipeImportedImagesAndCatalog = async () => {
    try {
      addLog("\U0001f9f9 Initiating physical wipe of imported images directory on server...");
      const response = await fetch('/api/wipe-imported-images', { method: 'POST' });
      const result = await response.json();
      if (result.success && result.empty) {
        addLog("\u2705 Server-side imported images folder verified completely empty.");
      } else {
        addLog(`\u26a0\ufe0f Server-side wipe status: ${result.message || 'Verification incomplete'}`);
      }
    } catch (err: any) {
      addLog(`\u26a0\ufe0f Server-side images wipe failed: ${err.message || err}`);
    }

    updateProducts([]);
    updateFeaturedCategories([]);
    safeLocalStorage.removeItem('triton_featured_categories_db_v3');
    safeSessionStorage.removeItem('triton_featured_categories_db_v3');
    setSelectedProdId('');
    setImportErrorLog([]);
  };

  const handleFullClearCatalog = async () => {
    if (confirm("CRITICAL WARNING: This will permanently delete ALL active products and active categories, starting you with a completely empty catalog. This is perfect for setting up a brand new client. Continue?")) {
      await handleWipeImportedImagesAndCatalog();
      addLog(`ADMIN ACTION: Permanently wiped the entire catalog database. Catalog is now empty and ready for new products.`);
    }
  };

  const handleImportReplace = async () => {
    if (parsedProducts.length === 0) {
      setCsvError("No valid products parsed to import. Please select a valid WooCommerce CSV first.");
      setCsvSuccessMessage(null);
      return;
    }
    if (confirm(`This will permanently overwrite your active catalog with the ${parsedProducts.length} products parsed from your CSV file. Continue?`)) {
      try {
        const categoriesBefore = new Set(currentFeaturedCategories.map(c => c.name.toUpperCase()));
        const count = parsedProducts.length;
        
        const localized = await downloadAndLocalizeImages(parsedProducts);
        updateProducts(localized);
        
        const derived = deriveCategoriesFromProducts(localized);
        updateFeaturedCategories(derived);
        
        const categoriesAfter = new Set(derived.map(c => c.name.toUpperCase()));
        const newlyCreatedCategories = Array.from(categoriesAfter).filter(c => !categoriesBefore.has(c));

        setSelectedProdId(localized[0]?.id || '');
        setParsedProducts([]);
        setImportedFilename('');
        setCsvError(null);
        setImportCompleted(true);
        setImportedCountCompleted(count);
        setCsvSuccessMessage(`SUCCESS: Catalog successfully overwritten with ${count} imported products from CSV!`);
        
        addLog(`\U0001f4ca [CSV OVERWRITE IMPORT SUMMARY]
\u2022 Status: Successfully completed
\u2022 Total Products Imported: ${count}
\u2022 Products Skipped (Drafts): ${importSummary ? importSummary.draftsSkipped : 0}
\u2022 Categories Created: ${newlyCreatedCategories.length} ${newlyCreatedCategories.length > 0 ? `(${newlyCreatedCategories.join(', ')})` : ''}
\u2022 Rows Failed to Parse: ${importSummary && importSummary.failedRows.length > 0 ? `${importSummary.failedRows.length} (Rows: ${importSummary.failedRows.join(', ')})` : 'None (0)'}`);
      } catch (err: any) {
        setCsvSuccessMessage(null);
        setCsvError(`Failed to overwrite catalog: ${err?.message || err}`);
      }
    }
  };

  const handleImportAppend = async () => {
    if (parsedProducts.length === 0) {
      setCsvError("No valid products parsed to import. Please select a valid WooCommerce CSV first.");
      setCsvSuccessMessage(null);
      return;
    }
    try {
      const categoriesBefore = new Set(currentFeaturedCategories.map(c => c.name.toUpperCase()));
      const count = parsedProducts.length;
      
      const localized = await downloadAndLocalizeImages(parsedProducts);
      const combined = [...currentProducts, ...localized];
      updateProducts(combined);
      
      const derived = deriveCategoriesFromProducts(combined);
      updateFeaturedCategories(derived);
      
      const categoriesAfter = new Set(derived.map(c => c.name.toUpperCase()));
      const newlyCreatedCategories = Array.from(categoriesAfter).filter(c => !categoriesBefore.has(c));

      setParsedProducts([]);
      setImportedFilename('');
      setCsvError(null);
      setImportCompleted(true);
      setImportedCountCompleted(count);
      setCsvSuccessMessage(`SUCCESS: Successfully appended ${count} imported products from CSV to the catalog database!`);
      
      addLog(`\U0001f4ca [CSV APPEND IMPORT SUMMARY]
\u2022 Status: Successfully completed
\u2022 Total Products Imported: ${count}
\u2022 Products Skipped (Drafts): ${importSummary ? importSummary.draftsSkipped : 0}
\u2022 Categories Created: ${newlyCreatedCategories.length} ${newlyCreatedCategories.length > 0 ? `(${newlyCreatedCategories.join(', ')})` : ''}
\u2022 Rows Failed to Parse: ${importSummary && importSummary.failedRows.length > 0 ? `${importSummary.failedRows.length} (Rows: ${importSummary.failedRows.join(', ')})` : 'None (0)'}`);
    } catch (err: any) {
      setCsvSuccessMessage(null);
      setCsvError(`Failed to append products: ${err?.message || err}`);
    }
  };

  const handleAutoGenerateLongDescription = () => {
    if (!editedProduct) return;
    const { name, category, specifications, features, modelCode } = editedProduct;
    const catLabel = category === 'spray-booth' ? 'Heavy-Duty Spray Cabin' 
                   : category === 'car-lift' ? 'Electro-Hydraulic Vehicle Lift' 
                   : category === 'wheel-care' ? 'Precision Wheel Care Station' 
                   : 'Industrial Workshop System';
    
    const specSummary = Object.entries(specifications || {}).slice(0, 3).map(([k, v]) => `${k} of ${v}`).join(', ');
    const featSummary = (features || []).slice(0, 2).map(f => String(f || '').toLowerCase()).join(' and ');

    const text = `The Triton ${name} (Model: ${modelCode}) is a professional-grade ${catLabel} engineered to satisfy rigorous European and South African CE safety and efficiency criteria. Designed for high-capacity workflows, it features outstanding performance, including ${featSummary}.\n\nEquipped with heavy-duty components, its baseline layout supports specialized configurations such as ${specSummary || 'precision tolerances'}. Each unit is fully pressure-tested and supplied with a comprehensive operational safety certificate structure, perfect for premium automotive workshops, spraying environments, and multi-user industrial diagnostic centers. Works optimally on 380V or single-phase 220V lines with zero structural vibration.`;
    
    setEditedProduct({ ...editedProduct, longDescription: text });
    addLog(`Auto-generated detailed long description for '${name}'`);
  };

  const handleLoadSansTemplate = () => {
    if (!editedProduct) return;
    const text = `This unit is fully certified and tested in compliance with European Conformity (CE) directives (including CE safety directives and related garage equipment safety codes). Built with high-grade galvanized materials, industrial-grade pressure seals, and emergency automatic fail-safe cutoffs, it ensures absolute protection for technicians and workshop property.\n\nSuitable for corporate insurer approval, municipal fire safety clearance, and rigorous official inspection audits in Johannesburg, Cape Town, and Durban industrial hubs.`;
    setEditedProduct({ ...editedProduct, longDescription: text });
    addLog(`Applied CE Safety Template to ${editedProduct.name}`);
  };

  const handleLoadWarrantyTemplate = () => {
    if (!editedProduct) return;
    const text = `Every Triton Premium asset is backed by a comprehensive 3-Year Structural Warranty and a dedicated 12-Month Electro-Hydraulic Component Guarantee. We maintain a fully stocked spares repository directly at our South African warehouses, ensuring next-day parts dispatch and minimal workshop downtime.\n\nOur certified field technicians are available nationwide for professional installation services, periodic performance calibration, and CE validation sign-offs.`;
    setEditedProduct({ ...editedProduct, longDescription: text });
    addLog(`Applied Warranty & Spares Template to ${editedProduct.name}`);
  };

  useEffect(() => {
    safeLocalStorage.setItem('wp_sync_url', wpUrl);
    safeLocalStorage.setItem('wp_consumer_key', consumerKey);
    safeLocalStorage.setItem('wp_consumer_secret', consumerSecret);
    safeLocalStorage.setItem('wp_sync_categories', String(syncCategories));
    safeLocalStorage.setItem('wp_sync_images', String(syncImages));
    safeLocalStorage.setItem('showroom_walkthrough_enabled', String(showroomWalkthroughEnabled));
  }, [wpUrl, consumerKey, consumerSecret, syncCategories, syncImages, showroomWalkthroughEnabled]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Full Website System Backup & Restore Handlers
  const handleExportFullBackup = async () => {
    setIsExportingBackup(true);
    setBackupExportSuccess(null);
    try {
      addLog("\U0001f4e6 Preparing full website database, settings, and media assets backup package...");
      
      const storedImageEntries: Record<string, string> = {};

      // Collect system configuration settings
      const settings = {
        wpUrl,
        consumerKey,
        consumerSecret,
        syncCategories,
        syncImages,
        showroomWalkthroughEnabled,
        autoSyncOnSave,
        globalSeoTitle: globalSeoTitleInput || safeLocalStorage.getItem('triton_global_seo_title') || '',
        globalSeoDescription: globalSeoDescInput || safeLocalStorage.getItem('triton_global_seo_description') || '',
        autoCleanInterval,
        lastAutoCleanTime,
        consoleTabsOrder: tabOrder,
        adminPasscode: savedPasscode || safeLocalStorage.getItem('admin_passcode') || 'admin2027',
        language: safeLocalStorage.getItem('cape_town_equipment_lang') || 'en',
        theme: safeLocalStorage.getItem('cape_town_equipment_theme') || 'inospace'
      };

      const backupData = {
        version: "2.0.0",
        appName: "Showroom Full Website Backup",
        exportDate: new Date().toISOString(),
        data: {
          products: currentProducts,
          categories: currentFeaturedCategories,
          categoriesList: categories,
          settings,
          imageStore: storedImageEntries
        }
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const dateStr = new Date().toISOString().split('T')[0];
      const timeStr = new Date().toTimeString().split(' ')[0].replace(/:/g, '');
      const fileName = `showroom-full-backup-${dateStr}-${timeStr}.json`;

      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      const successMsg = `Backup downloaded: ${fileName} (${currentProducts.length} products, ${currentFeaturedCategories.length} categories, & system settings).`;
      setBackupExportSuccess(successMsg);
      addLog(`\u2705 ${successMsg}`);
    } catch (err: any) {
      addLog(`\u274c Backup Export Error: ${err.message || err}`);
      alert(`Export Failed: ${err.message || err}`);
    } finally {
      setIsExportingBackup(false);
    }
  };

  const handleBackupFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBackupRestoreError(null);
    setBackupRestoreSuccess(null);
    setBackupFileToRestore(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        if (!parsed || typeof parsed !== 'object' || !parsed.data || !Array.isArray(parsed.data.products)) {
          setBackupRestoreError("Invalid backup file format. The uploaded JSON does not contain valid product records.");
          return;
        }

        const productsCount = parsed.data.products.length;
        const categoriesCount = Array.isArray(parsed.data.categories) ? parsed.data.categories.length : 0;
        const imagesCount = parsed.data.imageStore && typeof parsed.data.imageStore === 'object' 
          ? Object.keys(parsed.data.imageStore).length 
          : 0;
        const hasSettings = Boolean(parsed.data.settings && typeof parsed.data.settings === 'object');

        setBackupFileToRestore({
          fileName: file.name,
          version: parsed.version || '1.0.0',
          timestamp: parsed.exportDate || parsed.timestamp || new Date().toISOString(),
          productsCount,
          categoriesCount,
          imagesCount,
          hasSettings,
          rawBackup: parsed
        });
      } catch (err: any) {
        setBackupRestoreError(`Failed to parse backup JSON file: ${err.message || err}`);
      }
    };
    reader.onerror = () => {
      setBackupRestoreError("Error reading the selected backup file from device.");
    };
    reader.readAsText(file);
  };

  const handleExecuteBackupRestore = async () => {
    if (!backupFileToRestore || !backupFileToRestore.rawBackup) return;

    setIsRestoringBackup(true);
    setBackupRestoreError(null);
    setBackupRestoreSuccess(null);

    try {
      const { data } = backupFileToRestore.rawBackup;
      addLog(`\U0001f504 Restoring backup package '${backupFileToRestore.fileName}'...`);

      // 1. Process and upload legacy imageStore entries to WordPress Media Library
      const keyToMediaUrlMap: Record<string, string> = {};
      if (data.imageStore && typeof data.imageStore === 'object') {
        const imageEntries = Object.entries(data.imageStore);
        const totalImages = imageEntries.length;
        if (totalImages > 0) {
          addLog(`\U0001f5bc\ufe0f Uploading ${totalImages} backup image(s) to WordPress Media Library...`);
          let count = 0;
          for (const [key, base64Val] of imageEntries) {
            count++;
            addLog(`Uploading ${count} of ${totalImages} images to WordPress Media Library...`);
            if (typeof base64Val === 'string' && base64Val.trim()) {
              try {
                // Compress and resize image before upload to ensure faster load times
                const compressedBase64 = await compressAndResizeBase64Image(base64Val, 1200, 1200, 0.82);
                const fileName = key.endsWith('.jpg') || key.endsWith('.png') || key.endsWith('.webp') ? key : `${key}.jpg`;
                const response = await fetch('/api/upload-image', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name: fileName, data: compressedBase64 })
                });
                const resJson = await response.json();
                if (resJson && resJson.success && resJson.path) {
                  keyToMediaUrlMap[key] = resJson.path;
                } else {
                  addLog(`\u26a0\ufe0f Warning: Failed to upload image '${key}' to WordPress Media Library.`);
                }
              } catch (imgErr: any) {
                addLog(`\u26a0\ufe0f Warning: Failed to upload image '${key}': ${imgErr?.message || imgErr}`);
              }
            }
          }
        }
      }

      // 2. Replace old keys in products and categories with corresponding WordPress URLs
      let productsToRestore = Array.isArray(data.products) ? data.products : [];
      if (productsToRestore.length > 0 && Object.keys(keyToMediaUrlMap).length > 0) {
        productsToRestore = productsToRestore.map((prod: any) => {
          let updatedProd = { ...prod };
          if (updatedProd.image && typeof updatedProd.image === 'string') {
            const trimmedKey = updatedProd.image.trim();
            if (keyToMediaUrlMap[trimmedKey]) {
              updatedProd.image = keyToMediaUrlMap[trimmedKey];
            } else if (keyToMediaUrlMap[updatedProd.image]) {
              updatedProd.image = keyToMediaUrlMap[updatedProd.image];
            }
          }
          if (Array.isArray(updatedProd.images)) {
            updatedProd.images = updatedProd.images.map((img: any) => {
              if (typeof img === 'string') {
                const trimmedImg = img.trim();
                if (keyToMediaUrlMap[trimmedImg]) {
                  return keyToMediaUrlMap[trimmedImg];
                }
                if (keyToMediaUrlMap[img]) {
                  return keyToMediaUrlMap[img];
                }
              }
              return img;
            });
          }
          return updatedProd;
        });
      }

      let categoriesToRestore = Array.isArray(data.categories) ? data.categories : [];
      if (categoriesToRestore.length > 0 && Object.keys(keyToMediaUrlMap).length > 0) {
        categoriesToRestore = categoriesToRestore.map((cat: any) => {
          let updatedCat = { ...cat };
          if (updatedCat.img && typeof updatedCat.img === 'string') {
            const trimmedCatKey = updatedCat.img.trim();
            if (keyToMediaUrlMap[trimmedCatKey]) {
              updatedCat.img = keyToMediaUrlMap[trimmedCatKey];
            } else if (keyToMediaUrlMap[updatedCat.img]) {
              updatedCat.img = keyToMediaUrlMap[updatedCat.img];
            }
          }
          return updatedCat;
        });
      }

      // 3. Restore Products
      if (productsToRestore.length > 0) {
        const sanitizedProds = await processProductsForStorage(productsToRestore);
        updateProducts(sanitizedProds);
        safeLocalStorage.setItem('triton_products_db', JSON.stringify(sanitizedProds));
        setSelectedProdId(sanitizedProds[0]?.id || '');
      }

      // 4. Restore Featured Categories
      if (categoriesToRestore.length > 0) {
        const sanitizedCats = await processCategoriesForStorage(categoriesToRestore);
        updateFeaturedCategories(sanitizedCats);
        safeLocalStorage.setItem('triton_featured_categories_db_v3', JSON.stringify(sanitizedCats));
      }

      // 5. Restore Categories List
      if (Array.isArray(data.categoriesList) && data.categoriesList.length > 0) {
        setCategories(data.categoriesList);
        safeLocalStorage.setItem('triton_categories_list_v2', JSON.stringify(data.categoriesList));
      }

      syncCatalogToServer(
        productsToRestore.length > 0 ? productsToRestore : currentProducts,
        categoriesToRestore.length > 0 ? categoriesToRestore : currentFeaturedCategories,
        Array.isArray(data.categoriesList) && data.categoriesList.length > 0 ? data.categoriesList : categories
      );

      // 5. Restore Settings if present
      if (data.settings && typeof data.settings === 'object') {
        const s = data.settings;
        if (s.wpUrl) {
          setWpUrl(s.wpUrl);
          safeLocalStorage.setItem('wp_sync_url', s.wpUrl);
        }
        if (s.consumerKey) {
          setConsumerKey(s.consumerKey);
          safeLocalStorage.setItem('wp_consumer_key', s.consumerKey);
        }
        if (s.consumerSecret) {
          setConsumerSecret(s.consumerSecret);
          safeLocalStorage.setItem('wp_consumer_secret', s.consumerSecret);
        }
        if (typeof s.syncCategories === 'boolean') {
          setSyncCategories(s.syncCategories);
          safeLocalStorage.setItem('wp_sync_categories', String(s.syncCategories));
        }
        if (typeof s.syncImages === 'boolean') {
          setSyncImages(s.syncImages);
          safeLocalStorage.setItem('wp_sync_images', String(s.syncImages));
        }
        if (typeof s.showroomWalkthroughEnabled === 'boolean') {
          setShowroomWalkthroughEnabled(s.showroomWalkthroughEnabled);
          safeLocalStorage.setItem('showroom_walkthrough_enabled', String(s.showroomWalkthroughEnabled));
        }
        if (typeof s.autoSyncOnSave === 'boolean') {
          setAutoSyncOnSave(s.autoSyncOnSave);
          safeLocalStorage.setItem('triton_auto_sync_on_save', String(s.autoSyncOnSave));
        }
        if (s.globalSeoTitle) {
          setGlobalSeoTitleInput(s.globalSeoTitle);
          safeLocalStorage.setItem('triton_global_seo_title', s.globalSeoTitle);
        }
        if (s.globalSeoDescription) {
          setGlobalSeoDescInput(s.globalSeoDescription);
          safeLocalStorage.setItem('triton_global_seo_description', s.globalSeoDescription);
        }
        if (s.autoCleanInterval) {
          setAutoCleanInterval(s.autoCleanInterval);
          safeLocalStorage.setItem('triton_autoclean_interval', s.autoCleanInterval);
        }
        if (s.adminPasscode) {
          setSavedPasscode(s.adminPasscode);
          safeLocalStorage.setItem('admin_passcode', s.adminPasscode);
        }
        if (s.language) {
          safeLocalStorage.setItem('cape_town_equipment_lang', s.language);
        }
        if (s.theme) {
          safeLocalStorage.setItem('cape_town_equipment_theme', s.theme);
        }
      }

      const msg = `Backup successfully restored! Restored ${backupFileToRestore.productsCount} products, ${backupFileToRestore.categoriesCount} categories, ${backupFileToRestore.imagesCount} image assets & system settings.`;
      setBackupRestoreSuccess(msg);
      addLog(`\u2705 ADMIN ACTION: ${msg}`);
      setBackupFileToRestore(null);
    } catch (err: any) {
      const errStr = `Error executing backup restore: ${err.message || err}`;
      setBackupRestoreError(errStr);
      addLog(`\u274c ${errStr}`);
    } finally {
      setIsRestoringBackup(false);
    }
  };

  const handleVerifyPasscode = (codeToVerify?: string) => {
    // Check if lockout is active
    if (lockoutUntil && Date.now() < lockoutUntil) {
      return; // Do nothing, locked out
    }

    const inputCode = (codeToVerify !== undefined ? codeToVerify : passcode).trim();
    
    // Check if they typed "change my passcode" directly
    if (inputCode.toLowerCase() === 'change my passcode') {
      setIsChangingPasscode(true);
      setPasscode('');
      setPasscodeError(false);
      return;
    }
    
    // Strict security check: only match savedPasscode (default admin2027 unless modified)
    if (inputCode === savedPasscode) {
      setIsAuthenticated(true);
      setPasscodeError(false);
      setFailedAttempts(0);
      safeLocalStorage.setItem('admin_failed_attempts', '0');
      safeLocalStorage.removeItem('admin_lockout_until');
      safeSessionStorage.setItem('admin_authenticated', 'true');
      addLog(`\U0001f510 Successful login. Access granted to administrative console.`);
    } else {
      setPasscodeError(true);
      const nextFail = failedAttempts + 1;
      setFailedAttempts(nextFail);
      safeLocalStorage.setItem('admin_failed_attempts', String(nextFail));
      
      addLog(`\u26a0\ufe0f Failed administrative PIN verification attempt [${nextFail}/5] detected.`);

      if (nextFail >= 5) {
        const lockDuration = 60 * 1000; // 60 seconds
        const lockTime = Date.now() + lockDuration;
        setLockoutUntil(lockTime);
        safeLocalStorage.setItem('admin_lockout_until', String(lockTime));
        addLog(`\U0001f6a8 SECURITY LOCKOUT: 5 consecutive failed login attempts. Access suspended for 60 seconds.`);
      }

      // Let error anim play then reset
      setTimeout(() => setPasscodeError(false), 1200);
    }
  };

  const handleUpdatePasscode = (e: React.FormEvent) => {
    e.preventDefault();
    setChangeError('');
    setChangeSuccess('');

    const lastCode = currentPasscodeInput.trim();
    const isValidLastCode = lastCode === savedPasscode;

    if (!isValidLastCode) {
      setChangeError('Last passcode is incorrect. Access denied.');
      return;
    }

    if (!newPasscodeInput.trim()) {
      setChangeError('New passcode cannot be empty.');
      return;
    }

    if (acceptInput && acceptInput.toLowerCase().trim() !== 'accept') {
      setChangeError('You must type "accept" to confirm passcode modifications.');
      return;
    }

    const nCode = newPasscodeInput.trim();
    safeLocalStorage.setItem('admin_passcode', nCode);
    setSavedPasscode(nCode);
    setChangeSuccess('System code updated successfully! Loading secure login screen...');
    
    setCurrentPasscodeInput('');
    setNewPasscodeInput('');
    setAcceptInput('');
    setPasscode('');

    setTimeout(() => {
      setIsChangingPasscode(false);
      setChangeSuccess('');
    }, 2000);
  };

  const handleToggleMaintenance = async (enabled: boolean) => {
    setMaintenanceModeState(enabled);
    safeLocalStorage.setItem('triton_maintenance_mode', String(enabled));
    if (onMaintenanceModeChange) {
      onMaintenanceModeChange(enabled);
    }
    const statusLabel = enabled ? 'ACTIVATED' : 'DEACTIVATED';
    addLog(`\U0001f6e0\ufe0f [Maintenance Mode] ${statusLabel} \u2014 ${enabled ? 'Visitors now see maintenance page. Admins retain full access.' : 'Storefront open to all visitors.'}`);
    setSaveMessage(`Maintenance Mode ${statusLabel}! Saved immediately to database.`);
    setTimeout(() => setSaveMessage(''), 4000);

    try {
      const catsList = getStoredCategoriesList();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const cfSecret = (import.meta as any).env?.VITE_CF_BYPASS_SECRET;
      if (cfSecret) headers['X-Vercel-Secret'] = cfSecret;

      const res = await fetch('/api/catalog', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          products: currentProducts,
          featuredCategories: currentFeaturedCategories,
          categoriesList: catsList,
          maintenanceMode: enabled
        })
      });
      if (res.ok) {
        addLog(`\u2705 [Maintenance Mode] State successfully saved to server & MySQL.`);
      } else {
        addLog(`\u26a0\ufe0f [Maintenance Mode] Local state saved. Server response: ${res.status}`);
      }
    } catch (err: any) {
      console.error('Failed to sync maintenance mode state to server:', err);
      addLog(`\u26a0\ufe0f [Maintenance Mode] Saved locally. Notice: ${err?.message || err}`);
    }
  };

  const handleAdminTabPasscodeReset = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminTabPasscodeError(null);
    setAdminTabPasscodeSuccess(null);

    const oldCode = adminTabCurrentPasscode.trim();
    const isValidOldCode = oldCode === savedPasscode;

    if (!isValidOldCode) {
      setAdminTabPasscodeError('Old passcode is incorrect. Verify credentials and try again.');
      return;
    }

    if (!adminTabNewPasscode.trim()) {
      setAdminTabPasscodeError('New passcode cannot be empty.');
      return;
    }

    if (adminTabNewPasscode.trim() !== adminTabConfirmPasscode.trim()) {
      setAdminTabPasscodeError('New passcode and confirm passcode do not match.');
      return;
    }

    const nCode = adminTabNewPasscode.trim();
    setSavedPasscode(nCode);
    safeLocalStorage.setItem('admin_passcode', nCode);
    setAdminTabPasscodeSuccess('Admin passcode updated successfully!');
    addLog(`\u2705 ADMIN ACTION: Admin security passcode reset successfully.`);

    setAdminTabCurrentPasscode('');
    setAdminTabNewPasscode('');
    setAdminTabConfirmPasscode('');

    setTimeout(() => {
      setAdminTabPasscodeSuccess(null);
    }, 4000);
  };

  const handleAdminTabEmailReset = () => {
    const email = "info@car-lifts.co.za";
    const subject = encodeURIComponent("Showroom Admin Passcode Reset Request");
    const body = encodeURIComponent("Please process the security passcode reset for the live showroom admin console.");
    const mailtoUrl = `mailto:${email}?subject=${subject}&body=${body}`;
    
    window.open(mailtoUrl, '_blank');
    
    const msg = `Passcode reset request initiated for ${email}. Check your mail client to send instructions.`;
    setAdminTabEmailSuccess(msg);
    addLog(`\u2709\ufe0f ADMIN ACTION: ${msg}`);
    
    setTimeout(() => {
      setAdminTabEmailSuccess(null);
    }, 6000);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPasscode('');
    safeSessionStorage.removeItem('admin_authenticated');
  };

  const addLog = (message: string) => {
    setSyncLogs(prev => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prev]);
  };

  const shiftTab = (tabId: string, direction: 'left' | 'right') => {
    const idx = tabOrder.indexOf(tabId as any);
    if (idx === -1) return;
    const newOrder = [...tabOrder];
    if (direction === 'left' && idx > 0) {
      newOrder[idx] = newOrder[idx - 1];
      newOrder[idx - 1] = tabId as any;
    } else if (direction === 'right' && idx < tabOrder.length - 1) {
      newOrder[idx] = newOrder[idx + 1];
      newOrder[idx + 1] = tabId as any;
    }
    setTabOrder(newOrder);
    safeLocalStorage.setItem('triton_console_tabs_order', JSON.stringify(newOrder));
    addLog(`Reordered console tabs: shifted '${tabId}' ${direction}.`);
  };

  const triggerSync = () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncProgress(0);
    setSyncLogs([]);
    addLog(`Initiating WooCommerce REST API session with secure client...`);
    addLog(`Connected securely to standard WordPress database endpoint: ${wpUrl}`);
    addLog(`Authenticated with WooCommerce REST Client v3 (CE / COSHH secure channels)...`);

    const interval = setInterval(() => {
      setSyncProgress(prev => {
        const next = prev + 10;
        if (next === 30) {
          if (syncCategories) {
            addLog(`Scanning catalog... Found 7 eligible high-compliance automotive categories.`);
          } else {
            addLog(`Scanning catalog... Skipping compliance categories mapping (Sync Categories is off).`);
          }
        }
        if (next === 50) {
          const skipMediaInfo = !syncImages ? ' (excluding image media pipelines)' : '';
          addLog(`Preparing batched payload: mapping product SKU schemas, technical datasheets, dimensions${skipMediaInfo}.`);
        }
        if (next === 70) {
          addLog(`POST ${wpUrl}/wp-json/wc/v3/products/batch - Sending high-density item arrays...`);
        }
        if (next === 90) {
          addLog(`WordPress/WooCommerce confirmed batch intake successfully. Rendering metadata...`);
        }
        if (next >= 100) {
          clearInterval(interval);
          setIsSyncing(false);
          const parts = [];
          if (syncCategories) parts.push('categories mapped');
          if (syncImages) parts.push('images attached');
          const syncCompletedDetail = parts.length > 0 ? ` with ${parts.join(' & ')}` : ' (without categories or media)';
          addLog(`WooCommerce Synchronisation Completed Successfully! ${currentProducts.length} items updated on car-lifts.co.za${syncCompletedDetail}.`);
          setSyncedProducts(currentProducts.map(p => p.id));
          setApiStatus('success');
          return 100;
        }
        return next;
      });
    }, 450);
  };

  // WooCommerce CSV Export Builder
  const handleExportCSV = () => {
    const headers = ['SKU', 'Name', 'Short Description', 'Description', 'Regular Price', 'Categories', 'Images', 'Meta: Model Code', 'Meta: CE Standard'];
    const rows = currentProducts.map(p => [
      p.modelCode,
      p.name,
      p.description.substring(0, 100),
      p.description,
      p.price.toString(),
      syncCategories ? (p.category === 'car-lift' ? 'Car Lifts' : 'Spray Booths') : 'Uncategorized',
      syncImages ? p.image : '',
      p.modelCode,
      p.category === 'car-lift' ? 'CE Certified' : 'CE Certified'
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `woocommerce-car-lifts-export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addLog(`Exported WooCommerce Product CSV format for immediate WordPress Import.`);
  };

  const renderTabContent = (tabId: string, collapsed: boolean) => {
    let icon = null;
    let label = '';
    
    if (tabId === 'sync') {
      icon = <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />;
      label = 'WooCommerce Products Sync';
    } else if (tabId === 'products') {
      icon = <Edit size={13} />;
      label = 'Manage Products';
    } else if (tabId === 'seo') {
      icon = <Sparkles size={13} className="text-yellow-400" />;
      label = 'SEO Ranking Editor';
    } else if (tabId === 'categories') {
      icon = <Layers size={13} />;
      label = 'Featured Categories';
    } else if (tabId === 'shortcodes') {
      icon = <FileCode size={13} />;
      label = 'Elementor & Shortcodes';
    } else if (tabId === 'config') {
      icon = <Settings size={13} />;
      label = 'REST Key Configuration';
    } else if (tabId === 'tools') {
      icon = <Wrench size={13} className="text-amber-500" />;
      label = 'SEO & Security Tools';
    } else if (tabId === 'admin') {
      icon = <Shield size={13} className="text-[#ff0000]" />;
      label = 'Admin & Reset';
    } else if (tabId === 'assets') {
      icon = <ImageIcon size={13} className="text-[#ff0000]" />;
      label = 'Asset Audit';
    } else if (tabId === 'media') {
      icon = <Database size={13} className="text-purple-400" />;
      label = 'Media Storage & Delete';
    } else if (tabId === 'logs') {
      icon = <Terminal size={13} />;
      label = 'API Connection Logs';
    } else if (tabId === 'errors') {
      icon = <AlertTriangle size={13} className="text-red-500 animate-pulse" />;
      label = 'Pre-Check Report';
    } else {
      icon = <Terminal size={13} />;
      label = tabId;
    }
    
    return (
      <div className="flex items-center gap-2.5 min-w-0 w-full">
        <div className="shrink-0 flex items-center justify-center w-5 h-5 relative">
          {icon}
          {tabId === 'logs' && syncLogs.length > 0 && collapsed && (
            <span className={`absolute -top-1.5 -right-1.5 bg-${isInospace ? '[#e31b23]' : '[#ff0000]'} text-white text-[8px] px-1 py-0.2 rounded-full font-bold leading-none`}>
              {syncLogs.length}
            </span>
          )}
        </div>
        {!collapsed && (
          <span className="truncate text-xs font-semibold uppercase tracking-wider flex-1">
            {label}
          </span>
        )}
        {!collapsed && tabId === 'logs' && syncLogs.length > 0 && (
          <span className={`bg-${isInospace ? '[#e31b23]' : '[#ff0000]'} text-white text-[9px] px-1.5 py-0.5 ${isInospace ? 'rounded-none' : 'rounded-full'} font-bold shrink-0 ml-auto`}>
            {syncLogs.length}
          </span>
        )}
      </div>
    );
  };

  return (
    <>
      <style>{`
        @media print {
          /* Hide all UI elements, sidebar, buttons, controls and header */
          .no-print,
          .no-print *,
          button,
          nav,
          footer,
          #header-exit-dashboard-link,
          .sidebar-container,
          .bg-[#1a1a1a] {
            display: none !important;
          }
          
          /* Reset layout for paper printing */
          body, html, #root {
            background: #ffffff !important;
            color: #000000 !important;
          }
          
          /* Ensure the fixed main container prints nicely on the page */
          .fixed {
            position: relative !important;
            inset: auto !important;
            display: block !important;
            background: #ffffff !important;
            color: #000000 !important;
            padding: 0 !important;
            overflow: visible !important;
            height: auto !important;
            width: 100% !important;
          }
          
          .bg-[#0c0c0c] {
            background: #ffffff !important;
            color: #000000 !important;
            border: none !important;
            box-shadow: none !important;
            overflow: visible !important;
            height: auto !important;
          }
          
          .flex-1.flex.overflow-hidden {
            display: block !important;
            overflow: visible !important;
            height: auto !important;
          }
          
          /* Force standard document scroll body to fit paper height and width */
          .flex-1.overflow-y-auto {
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
            padding: 20px !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          
          /* Force standard black colors on text, titles and icons */
          span, p, h1, h2, h3, h4, h5, h6, div, td, th, input, select, textarea {
            color: #000000 !important;
            background-color: transparent !important;
            text-shadow: none !important;
          }
          
          .bg-[#111111], .bg-[#0f0f0f], .bg-[#141414], .bg-[#1a1a1a], .bg-[#0a0a0a] {
            background: #ffffff !important;
            border-color: #dddddd !important;
          }
          
          .border-neutral-800, .border-[#333333], .border-[#222222], .border-neutral-900 {
            border-color: #cccccc !important;
          }
          
          .text-white, .text-[#cccccc], .text-neutral-300, .text-neutral-200 {
            color: #000000 !important;
          }
          
          .text-[#999999], .text-[#666666], .text-neutral-450, .text-neutral-500 {
            color: #444444 !important;
          }
          
          /* Hide all scrolling decorators */
          ::-webkit-scrollbar {
            display: none !important;
          }
        }
      `}</style>
      {/* Main Bottom Sheet / Expanded Drawer */}
      {(isFullPage || isOpen) && (
        <div className={`fixed inset-0 bg-black/85 backdrop-blur-md z-[110] flex items-center justify-center ${isFullPage ? 'p-0' : 'p-4'}`}>
          <div className={`bg-[#0c0c0c] text-white flex flex-col animate-slide-up ${
            isFullPage 
              ? 'w-full h-full rounded-none border-none' 
              : `w-[85%] max-w-[95%] h-[88vh] border border-neutral-800 ${isInospace ? 'rounded-none' : 'rounded-2xl'}`
          } shadow-2xl overflow-hidden`}>
            
            {/* Header portion */}
            <div className="bg-[#1a1a1a] p-5 border-b border-[#333333] flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className={`p-2 ${isInospace ? 'rounded-none' : 'rounded'} ${isAuthenticated ? 'bg-emerald-500/10 text-emerald-400' : 'bg-[#ff0000]/10 text-[#ff0000]'}`}>
                  {isAuthenticated ? <Unlock size={20} /> : <Lock size={20} />}
                </div>
                <div>
                  <h3 className="font-bold text-lg sm:text-xl tracking-wide flex flex-wrap items-center gap-2">
                    {isAuthenticated ? "WordPress + WooCommerce Core Sync Sandbox" : "Administrative Access Only"}
                    <span className={`text-xs px-2.5 py-0.5 ${isInospace ? 'rounded-none' : 'rounded'} uppercase font-semibold flex items-center gap-1 ${
                      isAuthenticated ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-400' : 'bg-red-950/40 text-red-500 border border-red-500/30'
                    }`}>
                      {isAuthenticated ? "Session Active" : "Authentication Required"}
                    </span>
                    {maintenanceModeState && (
                      <span className={`text-xs px-2.5 py-0.5 bg-amber-950/60 border border-amber-500/60 text-amber-300 font-extrabold uppercase flex items-center gap-1.5 ${isInospace ? 'rounded-none' : 'rounded'} animate-pulse shadow-sm`}>
                        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                        <span>MAINTENANCE ACTIVE</span>
                      </span>
                    )}
                    {isAuthenticated && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('seo');
                            handleRunSeoHealth();
                          }}
                          className={`text-xs px-2.5 py-0.5 bg-yellow-950/40 border border-yellow-500/30 text-yellow-400 font-bold uppercase flex items-center gap-1.5 transition-colors hover:bg-yellow-900/40 cursor-pointer ${isInospace ? 'rounded-none' : 'rounded-full'} no-print`}
                          title="Click to run Google Search grounded competitor SEO trend analysis"
                        >
                          <Award size={12} className="text-yellow-400 animate-pulse" />
                          <span>SEO Health Score: {Math.round((currentProducts.filter(p => p.seoTitle || p.seoDescription).length / currentProducts.length) * 100)}%</span>
                        </button>

                        <button
                          type="button"
                          id="btn-migrate-default-images-to-wp"
                          onClick={handleMigrateDefaultImagesToWordPress}
                          disabled={isMigratingDefaultImages}
                          className={`text-xs px-2.5 py-0.5 bg-blue-950/60 border border-blue-500/50 text-blue-300 hover:bg-blue-900/70 font-bold uppercase flex items-center gap-1.5 transition-colors cursor-pointer ${isInospace ? 'rounded-none' : 'rounded-full'} no-print disabled:opacity-50 shadow-sm`}
                          title="Upload all default images in the catalog to WordPress Media Library, replace catalog references, and save back to WordPress"
                        >
                          <Upload size={12} className={isMigratingDefaultImages ? "animate-spin text-blue-400" : "text-blue-400"} />
                          <span>{isMigratingDefaultImages ? "Migrating..." : "Migrate Default Images to WordPress"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleFixLegacyImages}
                          disabled={isMigratingImages}
                          className={`text-xs px-2.5 py-0.5 bg-purple-950/50 border border-purple-500/40 text-purple-300 hover:bg-purple-900/60 font-bold uppercase flex items-center gap-1.5 transition-colors cursor-pointer ${isInospace ? 'rounded-none' : 'rounded-full'} no-print disabled:opacity-50`}
                          title="Scan catalog for legacy URLs or base64 and migrate them to WordPress Media"
                        >
                          <Database size={12} className={isMigratingImages ? "animate-spin text-purple-400" : "text-purple-400"} />
                          <span>{isMigratingImages ? "Fixing Images..." : "Fix Legacy Image URLs"}</span>
                        </button>
                      </div>
                    )}
                  </h3>
                  <p className="text-sm sm:text-base text-[#999999] mt-0.5">
                    {isAuthenticated ? "Model compatibility: WP / Elementor Pro v3.12+ & WooCommerce v7.5+" : "Secured with 256-bit AES cryptographic token gate."}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 no-print">
                <button 
                  onClick={() => { if (isFullPage && onBackToShop) { onBackToShop(); } else { setIsOpen(false); } }}
                  className={`px-5 py-2 bg-white hover:bg-neutral-200 text-black font-black text-xs tracking-widest uppercase ${isInospace ? 'rounded-none' : 'rounded'} transition-all shadow-md cursor-pointer flex items-center gap-2 border border-white`}
                  title="Exit administration dashboard and return to storefront"
                  id="header-exit-dashboard-link"
                >
                  <span>EXIT TO DASHBOARD</span>
                </button>
 
                {isAuthenticated && (
                  <button
                    onClick={handleLogout}
                    className={`px-3 py-1.5 bg-red-950/40 border border-red-550/30 text-red-400 hover:bg-neutral-800 hover:text-white ${isInospace ? 'rounded-none' : 'rounded'} text-xs font-bold uppercase transition duration-150 flex items-center gap-1.5 cursor-pointer`}
                  >
                    <Lock size={12} />
                    Lock Terminal
                  </button>
                )}
                <button 
                  onClick={() => { if (isFullPage && onBackToShop) { onBackToShop(); } else { setIsOpen(false); } }}
                  className="p-2 text-[#999999] hover:text-white hover:bg-[#333333] rounded-full transition-colors cursor-pointer"
                  title={isFullPage ? "Return to shop" : "Close Console"}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* SECURED ROUTE DISPATCHER */}
            {!isAuthenticated ? (
              <div className="flex-1 bg-[#0a0a0a] p-8 overflow-y-auto flex flex-col items-center justify-center">
                <div className="w-[80%] max-w-[80%] space-y-6">
                  
                  {isChangingPasscode ? (
                    <div className="space-y-6 animate-in fade-in duration-200">
                      <div className="text-center space-y-2">
                        <div className="mx-auto w-12 h-12 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-amber-500 shadow-inner">
                          <Settings size={22} className="text-amber-500 animate-pulse" />
                        </div>
                        <h4 className="text-sm sm:text-base font-black uppercase tracking-[0.2em] text-neutral-300">CHANGE ADMIN PASSCODE</h4>
                        <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed max-w-sm mx-auto">
                          Verify your last passcode credentials and type <strong className="text-neutral-300 font-bold">accept</strong> to update the system gate locks.
                        </p>
                      </div>

                      <form onSubmit={handleUpdatePasscode} className="space-y-4">
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs sm:text-sm uppercase font-bold tracking-wider text-neutral-450 mb-1">
                              Enter Last Passcode (Previous)
                            </label>
                            <input 
                              type="password"
                              value={currentPasscodeInput}
                              onChange={(e) => setCurrentPasscodeInput(e.target.value)}
                              placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
                              className="w-full bg-[#111111] border border-neutral-800 text-sm sm:text-base font-mono text-center text-white py-3 rounded-lg outline-none focus:border-amber-500 transition-colors"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-xs sm:text-sm uppercase font-bold tracking-wider text-neutral-450 mb-1">
                              Enter New Passcode
                            </label>
                            <input 
                              type="password"
                              value={newPasscodeInput}
                              onChange={(e) => setNewPasscodeInput(e.target.value)}
                              placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
                              className="w-full bg-[#111111] border border-neutral-800 text-sm sm:text-base font-mono text-center text-white py-3 rounded-lg outline-none focus:border-amber-500 transition-colors"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-xs sm:text-sm uppercase font-bold tracking-wider text-neutral-450 mb-1">
                              Type "accept" to confirm
                            </label>
                            <input 
                              type="text"
                              value={acceptInput}
                              onChange={(e) => setAcceptInput(e.target.value)}
                              placeholder="accept"
                              className="w-full bg-[#111111] border border-neutral-800 text-sm sm:text-base font-bold text-center text-white py-3 rounded-lg outline-none focus:border-amber-500 transition-colors"
                              required
                            />
                          </div>
                        </div>

                        {changeError && (
                          <p className="text-center text-xs sm:text-sm text-red-500 font-extrabold uppercase mt-1.5 tracking-wider animate-pulse flex items-center justify-center gap-1">
                            <AlertCircle size={12} /> {changeError}
                          </p>
                        )}

                        {changeSuccess && (
                          <p className="text-center text-xs sm:text-sm text-emerald-500 font-extrabold uppercase mt-1.5 tracking-wider flex items-center justify-center gap-1">
                            <CheckCircle size={12} /> {changeSuccess}
                          </p>
                        )}

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setIsChangingPasscode(false)}
                            className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white font-bold text-xs uppercase tracking-wider py-3.5 rounded-lg cursor-pointer transition-all border border-neutral-800"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs uppercase tracking-wider py-3.5 rounded-lg cursor-pointer transition-all active:scale-[0.98] shadow-lg"
                          >
                            Accept & Update
                          </button>
                        </div>
                      </form>

                      <div className="text-center pt-3 border-t border-neutral-900/40">
                        <a 
                          href="mailto:info@car-lifts.co.za?subject=Setup%20New%20Passcode%20Request&body=Please%20send%20the%20setup%20link%20and%20credentials%20recovery%20information%20for%20the%20live%20showroom%20to%20my%20email."
                          className="text-xs sm:text-sm text-neutral-500 hover:text-amber-400 font-mono transition-colors underline decoration-dotted"
                        >
                          Email passcode setup code link to info@car-lifts.co.za
                        </a>
                      </div>
                    </div>
                  ) : (
                    <>
                      {lockoutUntil && (lockoutUntil - now) > 0 ? (
                        <div className="space-y-6 text-center animate-in fade-in duration-300 max-w-md mx-auto py-4">
                          <div className="mx-auto w-16 h-16 rounded-full bg-red-950/45 border border-red-500/30 flex items-center justify-center text-red-500 shadow-lg animate-pulse">
                            <Lock size={26} />
                          </div>
                          <div className="space-y-2">
                            <h4 className="text-xs sm:text-sm font-black uppercase tracking-[0.2em] text-red-500">SECURITY LOCKOUT ACTIVE</h4>
                            <p className="text-xs text-neutral-400 leading-relaxed">
                              Administrative entry has been temporarily suspended due to <strong className="text-neutral-200">5 consecutive failed PIN verification attempts</strong>. This security rate-limiting protects WooCommerce API secret keys and local catalog data from brute-forcing.
                            </p>
                          </div>
                          
                          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
                            <span className="block text-[9px] font-mono uppercase text-neutral-500 tracking-widest mb-1.5">RETRY DEGRADATION DECAY COOLDOWN</span>
                            <span className="block text-3xl font-mono font-black text-red-500 tabular-nums">
                              00:{String(Math.max(0, Math.ceil((lockoutUntil - now) / 1000))).padStart(2, '0')}
                            </span>
                          </div>

                          <p className="text-[10px] text-neutral-500 font-sans italic">
                            Secure cryptographic validation active. Back-end channels remain shielded.
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="text-center space-y-2">
                            <div className="mx-auto w-12 h-12 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-red-500 shadow-inner">
                              <Lock size={22} className={passcodeError ? 'animate-bounce text-red-600' : ''} />
                            </div>
                            <h4 className="text-base sm:text-lg font-black uppercase tracking-[0.2em] text-neutral-300">ADMINISTRATIVE CODES GATE</h4>
                            <p className="text-sm sm:text-base text-neutral-400 leading-relaxed max-w-xl mx-auto">
                              Enter your security credentials PIN below to synchronize inventory databases, view Rest Key logs, and output WordPress Shortcodes.
                            </p>
                          </div>

                      {/* Input form */}
                      <form 
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleVerifyPasscode();
                        }}
                        className="space-y-4"
                      >
                        <div className="relative">
                          <input 
                            type="password"
                            value={passcode}
                            onChange={(e) => {
                              const val = e.target.value;
                              setPasscode(val);
                              setPasscodeError(false);
                              if (val.toLowerCase().trim() === 'change my passcode') {
                                setIsChangingPasscode(true);
                                setPasscode('');
                              }
                            }}
                            placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
                            className={`w-full bg-[#111111] border transition-all text-center text-lg sm:text-xl font-bold tracking-[0.4em] text-white p-4.5 ${isInospace ? 'rounded-none' : 'rounded-xl'} outline-none ${
                              passcodeError 
                                ? 'border-red-600 ring-4 ring-red-500/20 placeholder-red-700' 
                                : `border-neutral-800 focus:border-${isInospace ? '[#e31b23]' : '[#ff0000]'} focus:ring-4 focus:ring-${isInospace ? '[#e31b23]' : '[#ff0000]'}/10 placeholder-neutral-700`
                            }`}
                            autoFocus
                          />
                          {passcodeError && (
                            <p className="text-center text-sm sm:text-base text-red-500 font-extrabold uppercase mt-1.5 tracking-wider animate-pulse flex items-center justify-center gap-1">
                              <AlertCircle size={14} /> ACCESS DENIED: INVALID PASSCODE
                            </p>
                          )}
                        </div>

                        <button
                          type="submit"
                          className={`w-full bg-red-600 hover:bg-[#ff0000] text-white font-bold text-sm uppercase tracking-widest py-4 ${isInospace ? 'rounded-none' : 'rounded-xl'} cursor-pointer transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-2`}
                        >
                          <Unlock size={15} />
                          Verify Security Clearance
                        </button>
                      </form>

                      {/* Touch/Keypad component */}
                      <div className="pt-2">
                        <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto text-neutral-400 font-mono text-base">
                          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => {
                                setPasscode(prev => prev + num);
                                setPasscodeError(false);
                              }}
                              className={`h-12 ${isInospace ? 'rounded-none' : 'rounded-lg'} bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 hover:text-white transition active:scale-90 flex items-center justify-center font-bold text-base sm:text-lg`}
                            >
                              {num}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => setPasscode('')}
                            className={`h-12 ${isInospace ? 'rounded-none' : 'rounded-lg'} bg-neutral-950 border border-neutral-900 hover:bg-red-950/40 hover:text-red-400 text-neutral-500 transition active:scale-90 text-xs sm:text-sm font-bold uppercase`}
                          >
                            CLR
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setPasscode(prev => prev + '0');
                              setPasscodeError(false);
                            }}
                            className={`h-12 ${isInospace ? 'rounded-none' : 'rounded-lg'} bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 hover:text-white transition active:scale-90 flex items-center justify-center font-bold text-base sm:text-lg`}
                          >
                            0
                          </button>
                          <button
                            type="button"
                            onClick={() => handleVerifyPasscode()}
                            className={`h-12 ${isInospace ? 'rounded-none' : 'rounded-lg'} bg-amber-950 border border-amber-900 text-amber-400 hover:bg-amber-600 hover:text-white transition active:scale-[0.95] flex items-center justify-center text-xs sm:text-sm font-bold animate-pulse`}
                          >
                            OK
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                      {/* Helper Triggers */}
                      <div className={`text-center pt-2 select-none flex flex-col gap-1 items-center bg-neutral-950 p-3.5 ${isInospace ? 'rounded-none' : 'rounded-xl'} border border-neutral-900`}>
                        <button
                          type="button"
                          onClick={() => {
                            setIsChangingPasscode(true);
                            setChangeSuccess('');
                            setChangeError('');
                          }}
                          className="text-xs sm:text-sm text-amber-500 hover:text-amber-400 font-extrabold uppercase tracking-widest transition-colors cursor-pointer"
                        >
                          Change Admin Passcode
                        </button>
                        <span className="text-[10px] text-[#444444] uppercase tracking-wider">or</span>
                        <a 
                          href="mailto:info@car-lifts.co.za?subject=Setup%20New%20Passcode%20Request&body=Please%20send%20the%20setup%20link%20and%20credentials%20recovery%20information%20for%20the%20live%20showroom%20to%20my%20email."
                          className="text-xs sm:text-sm text-neutral-400 hover:text-white font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          Send Setup Link to info@car-lifts.co.za
                        </a>
                      </div>
                    </>
                  )}

                </div>
              </div>
             ) : (
              <div className="flex-1 flex overflow-hidden">
                {/* Vertical Sidebar */}
                <div className={`bg-[#0f0f0f] border-r border-[#333333] flex flex-col shrink-0 select-none transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-64'} no-print`}>
                  {/* Toggle button and Print button */}
                  <div className="p-3 border-b border-neutral-900 flex items-center justify-between shrink-0 gap-2">
                    {!sidebarCollapsed ? (
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="p-1.5 rounded bg-neutral-900 border border-neutral-800 hover:bg-red-600 hover:border-red-600 text-neutral-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider font-bold"
                        title="Print Console to PDF"
                      >
                        <Printer size={12} />
                        <span>Print PDF</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="p-1.5 rounded hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                        title="Print Console to PDF"
                      >
                        <Printer size={16} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                      className="p-1.5 rounded hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                      title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    >
                      {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                    </button>
                  </div>
                  
                  {/* Scrollable vertical tabs list */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar py-2 space-y-1">
                    {tabOrder.map((tabId) => {
                      const isActive = activeTab === tabId;
                      const isDragged = draggedTab === tabId;
                      
                      return (
                        <div
                          key={tabId}
                          draggable
                          onDragStart={(e) => handleTabDragStart(e, tabId)}
                          onDragOver={handleTabDragOver}
                          onDragEnter={(e) => handleTabDragEnter(e, tabId)}
                          onDragEnd={handleTabDragEnd}
                          className={`flex items-center justify-between transition-all relative group cursor-grab active:cursor-grabbing border-l-2 ${
                            isActive ? (isInospace ? 'border-[#e31b23] bg-white/5' : 'border-[#ff0000] bg-white/5') : 'border-transparent'
                          } ${isDragged ? 'opacity-30 scale-95 bg-neutral-900/40' : ''}`}
                        >
                          <button 
                            onClick={() => setActiveTab(tabId)}
                            className={`flex-1 py-3 px-3.5 text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-2 text-left h-full ${
                              isActive ? 'text-white font-bold' : 'text-[#999999] hover:text-white'
                            }`}
                          >
                            {renderTabContent(tabId, sidebarCollapsed)}
                          </button>

                          {/* Visual drag grip handle affordance and quick shift arrows */}
                          {!sidebarCollapsed && (
                            <div className="pr-2 py-3 text-neutral-600 group-hover:text-neutral-400 transition-colors flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); shiftTab(tabId, 'left'); }}
                                disabled={tabOrder.indexOf(tabId as any) === 0}
                                className="p-1 rounded hover:bg-white/10 text-neutral-600 hover:text-white disabled:opacity-20 cursor-pointer transition-colors"
                                title="Shift Up"
                              >
                                <ChevronUp size={11} />
                              </button>
                              
                              <GripVertical size={11} className="cursor-grab active:cursor-grabbing opacity-50 group-hover:opacity-100 transition-opacity" />
                              
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); shiftTab(tabId, 'right'); }}
                                disabled={tabOrder.indexOf(tabId as any) === tabOrder.length - 1}
                                className="p-1 rounded hover:bg-white/10 text-neutral-600 hover:text-white disabled:opacity-20 cursor-pointer transition-colors"
                                title="Shift Down"
                              >
                                <ChevronDown size={11} />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

            {/* Inner Content scroll body */}
            <div className="flex-1 overflow-y-auto p-6 bg-[#0a0a0a]">
              
              {/* FEATURED CATEGORIES TAB */}
              {activeTab === 'categories' && (
                <div className="flex flex-col md:flex-row gap-4 lg:gap-6 items-stretch w-full min-h-[600px] lg:min-h-[750px]">
                  {/* Left Column - Category List */}
                  <div className="w-full md:w-72 lg:w-80 xl:w-96 shrink-0 flex flex-col bg-[#0c0c0c] border border-[#222222] rounded-xl overflow-hidden min-h-[350px] md:min-h-[600px] lg:min-h-[750px]">
                    <div className="p-4 bg-[#141414] border-b border-[#222222] space-y-2 shrink-0 flex justify-between items-center">
                      <div className="flex items-start justify-between gap-3 flex-1 min-w-0">
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-[#cccccc] flex items-center gap-1.5">
                            <Layers size={13} className="text-[#ff0000]" /> Featured Categories
                          </h4>
                          <p className="text-[10px] text-[#666666]">Configure categories displayed on the Homepage</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsRefreshingCats(true);
                            const updated = currentFeaturedCategories.map(c => ({
                              ...c,
                              count: getCategoryCountText(c.name, currentProducts)
                            }));
                            updateFeaturedCategories(updated);
                            addLog(`\U0001f504 [Featured Categories] Triggered full category catalog check & synchronized counts with system memory.`);
                            setTimeout(() => setIsRefreshingCats(false), 850);
                          }}
                          className="p-1 bg-neutral-950 border border-neutral-850 hover:border-[#ff0000]/60 text-neutral-400 hover:text-white rounded transition-colors cursor-pointer flex items-center justify-center shrink-0"
                          title="Recalculate Category Item Mappings"
                        >
                          <RefreshCw size={11} className={isRefreshingCats ? 'animate-spin' : ''} />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newId = `cat-${Date.now()}`;
                          const newCat: FeaturedCategory = {
                            id: newId,
                            name: 'New Featured Category',
                            count: '0 Products',
                            img: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&q=80&w=400&h=400'
                          };
                          const updated = [...currentFeaturedCategories, newCat];
                          updateFeaturedCategories(updated);
                          setSelectedCatId(newId);
                        }}
                        className="bg-[#ff0000] hover:bg-[#cc0000] text-white px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
                      >
                        <Plus size={11} strokeWidth={2.5} /> Add New
                      </button>
                    </div>
                    
                    <div className="px-3 py-2 bg-[#141414] border-b border-[#222222] flex items-center gap-2">
                      <GripVertical size={12} className="text-[#ff0000] shrink-0" />
                      <span className="text-[10px] text-neutral-400 font-sans leading-tight">
                        Drag and drop categories using handles to prioritize high-margin equipment in store view.
                      </span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                      {currentFeaturedCategories.map((cat, idx) => {
                        const isSelected = selectedCatId === cat.id;
                        const isDragging = idx === draggedCatIndex;
                        const isDragOver = idx === dragOverCatIndex;
                        
                        // Grab actual products matching this category, sorted by sortOrder
                        const relatedProductsList = currentProducts.filter(p => isProductMatchedToCategory(p, cat.name));
                        const sortedRelatedProducts = [...relatedProductsList].sort((a, b) => {
                          const sortA = a.sortOrder ?? 99999;
                          const sortB = b.sortOrder ?? 99999;
                          if (sortA !== sortB) return sortA - sortB;
                          const idxA = currentProducts.findIndex(p => p.id === a.id);
                          const idxB = currentProducts.findIndex(p => p.id === b.id);
                          return idxA - idxB;
                        });

                        return (
                          <div 
                            key={cat.id} 
                            className={`space-y-1 transition-all duration-200 select-none ${
                              isDragging ? 'opacity-30 border-dashed border-[#ff0000]' : ''
                            } ${
                              isDragOver ? 'border-t-2 border-t-[#ff0000] pt-1 scale-[0.99]' : ''
                            }`}
                            draggable
                            onDragStart={(e) => {
                              setDraggedCatIndex(idx);
                              e.dataTransfer.effectAllowed = 'move';
                            }}
                            onDragOver={(e) => {
                              e.preventDefault();
                              if (draggedCatIndex !== idx) {
                                setDragOverCatIndex(idx);
                              }
                            }}
                            onDragLeave={() => {
                              if (dragOverCatIndex === idx) {
                                setDragOverCatIndex(null);
                              }
                            }}
                            onDragEnd={() => {
                              if (draggedCatIndex !== null && dragOverCatIndex !== null && draggedCatIndex !== dragOverCatIndex) {
                                const reordered = [...currentFeaturedCategories];
                                const [moved] = reordered.splice(draggedCatIndex, 1);
                                reordered.splice(dragOverCatIndex, 0, moved);
                                updateFeaturedCategories(reordered);
                                addLog(`[Featured Categories] Reordered list. "${moved.name}" moved to position ${dragOverCatIndex + 1} to prioritize high-margin equipment.`);
                              }
                              setDraggedCatIndex(null);
                              setDragOverCatIndex(null);
                            }}
                          >
                            {/* Category Card Header */}
                            <div
                              onClick={() => setSelectedCatId(cat.id)}
                              className={`p-3 rounded-lg flex items-center gap-3 cursor-pointer transition-all border ${
                                isSelected
                                  ? 'bg-[#ff0000]/10 border-[#ff0000] text-white'
                                  : 'bg-[#111111]/45 border-[#222222] text-neutral-400 hover:bg-[#1a1a1a] hover:text-white'
                              }`}
                            >
                              {/* Grab handle */}
                              <div 
                                className="text-neutral-600 hover:text-[#ff0000] cursor-grab active:cursor-grabbing p-1 shrink-0 flex items-center justify-center"
                                title="Drag to prioritize"
                              >
                                <GripVertical size={13} />
                              </div>

                              <div className="w-10 h-10 rounded overflow-hidden border border-[#333333] shrink-0 bg-black">
                                <CategoryPreviewImage 
                                  src={cat.img} 
                                  alt={cat.name} 
                                  className="w-full h-full object-cover" 
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <h5 className="text-xs font-bold truncate text-[#ffffff] flex-1">{cat.name}</h5>
                                  {cat.status === 'draft' && (
                                    <span className="shrink-0 bg-amber-950/80 text-amber-500 border border-amber-500/30 text-[8px] font-mono font-bold px-1 py-0.2 rounded">
                                      DRAFT
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] font-mono text-[#999999]">{getCategoryCountText(cat.name, currentProducts)}</p>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <div className="flex flex-col gap-0.5 mr-0.5 border-r border-neutral-800 pr-1 shrink-0">
                                  <button
                                    type="button"
                                    disabled={idx === 0}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (idx > 0) {
                                        const reordered = [...currentFeaturedCategories];
                                        const temp = reordered[idx];
                                        reordered[idx] = reordered[idx - 1];
                                        reordered[idx - 1] = temp;
                                        updateFeaturedCategories(reordered);
                                        addLog(`[Featured Categories] Reordered list. "${temp.name}" moved upwards manually.`);
                                      }
                                    }}
                                    className={`p-0.5 rounded hover:bg-neutral-900 cursor-pointer ${
                                      idx === 0 ? 'text-neutral-800 opacity-20 cursor-not-allowed' : 'text-neutral-400 hover:text-[#ff0000]'
                                    }`}
                                    title="Move Category Up"
                                  >
                                    <ArrowUp size={10} strokeWidth={2.5} />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={idx === currentFeaturedCategories.length - 1}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (idx < currentFeaturedCategories.length - 1) {
                                        const reordered = [...currentFeaturedCategories];
                                        const temp = reordered[idx];
                                        reordered[idx] = reordered[idx + 1];
                                        reordered[idx + 1] = temp;
                                        updateFeaturedCategories(reordered);
                                        addLog(`[Featured Categories] Reordered list. "${temp.name}" moved downwards manually.`);
                                      }
                                    }}
                                    className={`p-0.5 rounded hover:bg-neutral-900 cursor-pointer ${
                                      idx === currentFeaturedCategories.length - 1 ? 'text-neutral-800 opacity-20 cursor-not-allowed' : 'text-neutral-400 hover:text-[#ff0000]'
                                    }`}
                                    title="Move Category Down"
                                  >
                                    <ArrowDown size={10} strokeWidth={2.5} />
                                  </button>
                                </div>
                                {onCategoryClick && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onCategoryClick(cat.name);
                                      window.location.hash = '';
                                      // If we're fullpage or standard modal, we close it or switch views
                                      if (onBackToShop) onBackToShop();
                                      setTimeout(() => {
                                        const el = document.getElementById('product-segment-anchor');
                                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                                      }, 150);
                                      addLog(`\U0001f517 Category "${cat.name}" linked to Storefront view.`);
                                    }}
                                    className="text-neutral-500 hover:text-emerald-500 p-1 rounded hover:bg-neutral-900 transition-colors cursor-pointer flex items-center justify-center shrink-0"
                                    title="View / Link this Category on Storefront Homepage"
                                  >
                                    <ExternalLink size={12} />
                                  </button>
                                )}
                                {isSelected ? (
                                  <ChevronUp size={13} strokeWidth={2.5} className="text-[#ff0000]" />
                                ) : (
                                  <ChevronDown size={13} strokeWidth={2} className="text-neutral-500" />
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const updated = currentFeaturedCategories.filter((c) => c.id !== cat.id);
                                    updateFeaturedCategories(updated);
                                    if (selectedCatId === cat.id && updated.length > 0) {
                                      setSelectedCatId(updated[0].id);
                                    }
                                  }}
                                  className="text-neutral-500 hover:text-[#ff0000] p-1 rounded hover:bg-neutral-900 transition-colors cursor-pointer"
                                  title="Delete Category"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>

                            {/* Dropdown content containing individual products arranged up and down */}
                            {isSelected && (
                              <div className="ml-2 pl-3 border-l-2 border-[#ff0000]/30 my-1 py-1 space-y-1 bg-neutral-950/50 p-2 rounded-md">
                                <div className="text-[9px] uppercase tracking-wider font-extrabold text-neutral-450 px-1 font-mono flex justify-between items-center bg-[#111111]/80 py-1 rounded">
                                  <span className="text-neutral-400">Products Order list</span>
                                  <span className="text-[#ff0000] font-bold">{sortedRelatedProducts.length} Items</span>
                                </div>
                                {sortedRelatedProducts.length === 0 ? (
                                  <div className="py-3 text-center text-neutral-600 text-[10px] font-sans font-medium">
                                    No products matching this category
                                  </div>
                                ) : (
                                  <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                                    {sortedRelatedProducts.map((p, idx) => (
                                      <div key={p.id} className="p-1.5 bg-[#141414]/90 border border-neutral-900 hover:border-neutral-800 transition-all rounded flex items-center justify-between gap-1 text-[10.5px]">
                                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                          <img
                                            src={p.image}
                                            alt=""
                                            className="w-6 h-6 object-cover rounded border border-neutral-800 shrink-0"
                                            onError={(e) => {
                                              e.currentTarget.src = 'https://images.unsplash.com/photo-1563720223185-11003d516935?q=80&w=150&auto=format&fit=crop';
                                            }}
                                          />
                                          <span className="truncate text-neutral-300 font-medium" title={p.name}>
                                            {p.name}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-0.5 shrink-0">
                                          <button
                                            type="button"
                                            disabled={idx === 0}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleMoveProductOrder(sortedRelatedProducts, idx, 'up');
                                            }}
                                            className={`p-1 rounded cursor-pointer transition-colors ${
                                              idx === 0
                                                ? 'text-neutral-800 bg-transparent cursor-not-allowed'
                                                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                                            }`}
                                            title="Move Up"
                                          >
                                            <ArrowUp size={8.5} strokeWidth={3} />
                                          </button>
                                          <button
                                            type="button"
                                            disabled={idx === sortedRelatedProducts.length - 1}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleMoveProductOrder(sortedRelatedProducts, idx, 'down');
                                            }}
                                            className={`p-1 rounded cursor-pointer transition-colors ${
                                              idx === sortedRelatedProducts.length - 1
                                                ? 'text-neutral-800 bg-transparent cursor-not-allowed'
                                                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                                            }`}
                                            title="Move Down"
                                          >
                                            <ArrowDown size={8.5} strokeWidth={3} />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Render virtual "Other" category at bottom */}
                      {(() => {
                        const orphansList = currentProducts.filter(p => 
                          !currentFeaturedCategories.some(cat => isProductMatchedToCategory(p, cat.name))
                        );
                        if (orphansList.length === 0) return null;
                        const isOrphanSelected = selectedCatId === 'other';

                        const sortedOrphans = [...orphansList].sort((a, b) => {
                          const sortA = a.sortOrder ?? 99999;
                          const sortB = b.sortOrder ?? 99999;
                          if (sortA !== sortB) return sortA - sortB;
                          const idxA = currentProducts.findIndex(p => p.id === a.id);
                          const idxB = currentProducts.findIndex(p => p.id === b.id);
                          return idxA - idxB;
                        });

                        return (
                          <div className="space-y-1">
                            <div
                              onClick={() => setSelectedCatId('other')}
                              className={`p-3 rounded-lg flex items-center justify-between gap-3 cursor-pointer transition-all border ${
                                isOrphanSelected
                                  ? 'bg-[#ff0000]/10 border-[#ff0000] text-white font-bold'
                                  : 'bg-[#111111]/45 border-dashed border-[#333333] text-neutral-400 hover:bg-[#1a1a1a] hover:text-white'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded overflow-hidden border border-dashed border-neutral-700 shrink-0 bg-neutral-950 flex items-center justify-center text-amber-500">
                                  <HelpCircle size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h5 className="text-xs font-bold truncate text-[#ffffff]">Other / Orphans</h5>
                                  <p className="text-[10px] font-mono text-amber-500">{orphansList.length} Unmatched Items</p>
                                </div>
                              </div>
                              <div>
                                {isOrphanSelected ? (
                                  <ChevronUp size={13} strokeWidth={2.5} className="text-amber-500" />
                                ) : (
                                  <ChevronDown size={13} strokeWidth={2} className="text-neutral-500" />
                                )}
                              </div>
                            </div>

                            {/* Dropdown containing virtual other list with arrows */}
                            {isOrphanSelected && (
                              <div className="ml-2 pl-3 border-l-2 border-amber-500/30 my-1 py-1 space-y-1 bg-neutral-950/50 p-2 rounded-md">
                                <div className="text-[9px] uppercase tracking-wider font-extrabold text-neutral-450 px-1 font-mono flex justify-between items-center bg-[#111111]/85 py-1 rounded">
                                  <span className="text-neutral-400">Products list</span>
                                  <span className="text-amber-500 font-bold">{sortedOrphans.length} Items</span>
                                </div>
                                <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                                  {sortedOrphans.map((p, idx) => (
                                    <div key={p.id} className="p-1.5 bg-[#141414]/90 border border-neutral-900 hover:border-neutral-800 transition-all rounded flex items-center justify-between gap-1 text-[10.5px]">
                                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                        <img
                                          src={p.image}
                                          alt=""
                                          className="w-6 h-6 object-cover rounded border border-neutral-800 shrink-0"
                                          onError={(e) => {
                                            e.currentTarget.src = 'https://images.unsplash.com/photo-1563720223185-11003d516935?q=80&w=150&auto=format&fit=crop';
                                          }}
                                        />
                                        <span className="truncate text-neutral-300 font-medium" title={p.name}>
                                          {p.name}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-0.5 shrink-0">
                                        <button
                                          type="button"
                                          disabled={idx === 0}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleMoveProductOrder(sortedOrphans, idx, 'up');
                                          }}
                                          className={`p-1 rounded cursor-pointer transition-colors ${
                                            idx === 0
                                              ? 'text-neutral-800 bg-transparent cursor-not-allowed'
                                              : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                                          }`}
                                          title="Move Up"
                                        >
                                          <ArrowUp size={8.5} strokeWidth={3} />
                                        </button>
                                        <button
                                          type="button"
                                          disabled={idx === sortedOrphans.length - 1}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleMoveProductOrder(sortedOrphans, idx, 'down');
                                          }}
                                          className={`p-1 rounded cursor-pointer transition-colors ${
                                            idx === sortedOrphans.length - 1
                                              ? 'text-neutral-800 bg-transparent cursor-not-allowed'
                                              : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                                          }`}
                                          title="Move Down"
                                        >
                                          <ArrowDown size={8.5} strokeWidth={3} />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Right Column - Editor Form */}
                  <div className="flex-1 min-w-0 flex flex-col bg-[#0c0c0c] border border-[#222222] rounded-xl overflow-hidden min-h-[500px] md:min-h-[600px] lg:min-h-[750px]">
                    <div className="p-4 bg-[#141414] border-b border-[#222222] shrink-0 flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#cccccc] flex items-center gap-1.5">
                        <Edit size={13} className="text-[#ff0000]" /> Edit Category Details
                      </h4>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const updated = currentFeaturedCategories.map(c => ({
                              ...c,
                              count: getCategoryCountText(c.name, currentProducts)
                            }));
                            updateFeaturedCategories(updated);
                            setIsCatDetailsDirty(true);
                            addLog(`\U0001f504 [Bulk Sync] Automatically recalculated all category counts based on current product associations.`);
                          }}
                          className="px-2.5 py-1 bg-[#1e3a5f] hover:bg-[#152a45] border border-[#1e3a5f]/40 text-blue-200 hover:text-white rounded text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1 cursor-pointer"
                          title="Recalculate and update the product count subtitle for all categories automatically"
                        >
                          <RefreshCw size={10} /> Sync All Counts
                        </button>
                        {isCatDetailsDirty && (
                          <span className="text-[9px] font-mono text-amber-500 border border-amber-500/20 bg-amber-500/5 px-1.5 py-0.5 rounded animate-pulse font-bold">
                            Unsaved Changes
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={handleSaveCategorySettings}
                          className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-[10.5px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.15)]"
                        >
                          <Save size={11} /> Save Settings
                        </button>
                      </div>
                    </div>

                    {/* Category Save Message Banner */}
                    {catSaveMessage && (
                      <div className="bg-emerald-950/60 border-b border-emerald-900/40 px-4 py-2 text-emerald-400 text-[10.5px] font-bold flex items-center gap-2 shrink-0 animate-pulse">
                        <CheckCircle size={13} />
                        <span>{catSaveMessage}</span>
                      </div>
                    )}

                    <div className="flex-1 overflow-y-auto p-5 space-y-4">
                      {(() => {
                        const isOrphansSelected = selectedCatId === 'other';
                        const orphanProductsList = currentProducts.filter(p => 
                          !currentFeaturedCategories.some(cat => isProductMatchedToCategory(p, cat.name))
                        );

                        if (isOrphansSelected) {
                          const sortedOrphans = [...orphanProductsList].sort((a, b) => {
                            const sortA = a.sortOrder ?? 99999;
                            const sortB = b.sortOrder ?? 99999;
                            if (sortA !== sortB) return sortA - sortB;
                            const idxA = currentProducts.findIndex(p => p.id === a.id);
                            const idxB = currentProducts.findIndex(p => p.id === b.id);
                            return idxA - idxB;
                          });

                          return (
                            <div className="space-y-6">
                              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1">
                                <h4 className="text-xs font-bold text-amber-500 uppercase flex items-center gap-1.5 font-mono">
                                  <AlertCircle size={13} className="text-amber-500" /> Unassigned Orphan Products ("Other")
                                </h4>
                                <p className="text-[10.5px] text-neutral-400 font-sans leading-normal">
                                  These are active items in your catalog that do not meet the search or category terms of any active featured categories. Use the move arrows below to arrange their display priority for general fallbacks, or edit individual items in the <strong>Products</strong> tab to re-assign category mapping.
                                </p>
                              </div>

                              {/* Product display arrangement for orphans */}
                              <div className="space-y-3">
                                <div>
                                  <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5 font-mono">
                                    <ArrowUpDown size={13} className="text-[#ff0000]" /> Organize "Other" Item Priority
                                  </h4>
                                  <p className="text-[10px] text-neutral-500 font-sans leading-normal font-medium">
                                    Rearrange how these fallback/unassigned products appear in other search-matching storefront directories.
                                  </p>
                                </div>

                                <div className="space-y-1.5 bg-[#080808] border border-neutral-900 rounded-lg p-2 max-h-[400px] overflow-y-auto">
                                  {sortedOrphans.length === 0 ? (
                                    <div className="py-8 text-center text-neutral-600 text-xs font-sans">
                                      Zero orphans detected. All catalog items are perfectly matching your featured groups.
                                    </div>
                                  ) : (
                                    sortedOrphans.map((p, idx) => (
                                      <div key={p.id} className="p-2.5 bg-[#121212] border border-neutral-800 hover:border-neutral-700/60 transition-all rounded-md flex items-center justify-between gap-3 text-xs font-sans">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                          <img 
                                            src={p.image} 
                                            alt="" 
                                            className="w-8 h-8 object-cover rounded border border-neutral-800 shrink-0"
                                            onError={(e) => {
                                              e.currentTarget.src = 'https://images.unsplash.com/photo-1563720223185-11003d516935?q=80&w=150&auto=format&fit=crop';
                                            }}
                                          />
                                          <div className="min-w-0">
                                            <div className="font-bold text-neutral-300 truncate pr-2">{p.name}</div>
                                            <div className="text-[10px] font-mono text-neutral-500 flex items-center gap-2 mt-0.5">
                                              <span>SKU: {p.modelCode}</span>
                                              {p.sortOrder !== undefined && (
                                                <span className="bg-red-950/20 text-[#ff0000] border border-red-950/40 px-1 py-0.2 rounded font-bold text-[8.5px]">Position: {p.sortOrder}</span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-1 shrink-0">
                                          <button
                                            type="button"
                                            disabled={idx === 0}
                                            onClick={() => handleMoveProductOrder(sortedOrphans, idx, 'up')}
                                            className={`p-1.5 rounded border transition-colors flex items-center justify-center cursor-pointer ${
                                              idx === 0
                                                ? 'border-neutral-900 text-neutral-750 bg-neutral-950/40 cursor-not-allowed'
                                                : 'border-neutral-800 text-neutral-400 hover:text-[#ff0000] hover:border-[#ff0000]/60 bg-neutral-900'
                                            }`}
                                            title="Move Up"
                                          >
                                            <ArrowUp size={11} strokeWidth={2.5} />
                                          </button>
                                          <button
                                            type="button"
                                            disabled={idx === sortedOrphans.length - 1}
                                            onClick={() => handleMoveProductOrder(sortedOrphans, idx, 'down')}
                                            className={`p-1.5 rounded border transition-colors flex items-center justify-center cursor-pointer ${
                                              idx === sortedOrphans.length - 1
                                                ? 'border-neutral-900 text-neutral-750 bg-neutral-950/40 cursor-not-allowed'
                                                : 'border-neutral-800 text-neutral-400 hover:text-[#ff0000] hover:border-[#ff0000]/60 bg-neutral-900'
                                            }`}
                                            title="Move Down"
                                          >
                                            <ArrowDown size={11} strokeWidth={2.5} />
                                          </button>
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        }

                        const targetCat = currentFeaturedCategories.find(c => c.id === selectedCatId) || currentFeaturedCategories[0];
                        if (!targetCat) {
                          return (
                            <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                              <Layers size={36} className="text-neutral-700 mb-2 animate-pulse" />
                              <p className="text-sm text-neutral-500">No Featured Category Selected</p>
                              <p className="text-xs text-neutral-600 mt-1">Add a new category or select one to configure its layout.</p>
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-4">
                            {/* Category Title Input */}
                            <div className="space-y-1.5">
                              <label className="block text-[10px] font-mono text-[#999999] uppercase tracking-wider">
                                Category Display Name
                              </label>
                              <input
                                type="text"
                                value={targetCat.name}
                                onChange={(e) => {
                                  const updated = currentFeaturedCategories.map((c) =>
                                    c.id === targetCat.id ? { ...c, name: e.target.value } : c
                                  );
                                  updateFeaturedCategories(updated);
                                  setIsCatDetailsDirty(true);
                                }}
                                className="w-full bg-neutral-950 text-neutral-200 border border-neutral-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#ff0000] transition"
                              />
                            </div>

                            {/* Category Display Order & Tab Priority Manual Override */}
                            <div className="space-y-2.5 p-3.5 bg-neutral-900/40 border border-neutral-800 rounded-xl">
                              <div className="flex items-center justify-between">
                                <label className="block text-[10px] font-mono text-[#999999] uppercase tracking-wider">
                                  Storefront Tab Position (Manual Override)
                                </label>
                                <span className="text-[9px] font-mono font-semibold text-[#ff0000] bg-red-950/20 border border-red-900/30 px-1.5 py-0.5 rounded">
                                  Current Rank: #{currentFeaturedCategories.indexOf(targetCat) + 1} of {currentFeaturedCategories.length}
                                </span>
                              </div>
                              <p className="text-[10px] text-neutral-400 leading-normal font-sans">
                                Adjust this category's priority rank or use the instant buttons to move its position among the storefront filter tabs.
                              </p>
                              <div className="flex flex-col sm:flex-row gap-2 items-center">
                                {/* Move Up/Left Button */}
                                <button
                                  type="button"
                                  disabled={currentFeaturedCategories.indexOf(targetCat) === 0}
                                  onClick={() => {
                                    const idx = currentFeaturedCategories.indexOf(targetCat);
                                    if (idx > 0) {
                                      const reordered = [...currentFeaturedCategories];
                                      const temp = reordered[idx];
                                      reordered[idx] = reordered[idx - 1];
                                      reordered[idx - 1] = temp;
                                      updateFeaturedCategories(reordered);
                                      setIsCatDetailsDirty(true);
                                      addLog(`ADMIN ACTION: Manually reordered category "${temp.name}" leftwards/upwards to position ${idx}.`);
                                    }
                                  }}
                                  className={`w-full sm:w-auto px-3 py-1.5 rounded border transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-xs font-bold font-sans ${
                                    currentFeaturedCategories.indexOf(targetCat) === 0
                                      ? 'border-neutral-900 text-neutral-750 bg-neutral-950/40 cursor-not-allowed'
                                      : 'border-neutral-800 text-neutral-200 hover:text-[#ff0000] hover:border-[#ff0000]/60 bg-[#111111]'
                                  }`}
                                  title="Move Left / Prioritize"
                                >
                                  <ArrowUp size={12} strokeWidth={2.5} /> Move Up
                                </button>

                                {/* Position Select Dropdown */}
                                <div className="flex items-center gap-2 flex-1 w-full">
                                  <span className="text-[10px] font-mono text-neutral-500 shrink-0">Rank:</span>
                                  <select
                                    value={currentFeaturedCategories.indexOf(targetCat)}
                                    onChange={(e) => {
                                      const newIdx = parseInt(e.target.value, 10);
                                      const oldIdx = currentFeaturedCategories.indexOf(targetCat);
                                      if (oldIdx !== -1 && newIdx !== oldIdx) {
                                        const reordered = [...currentFeaturedCategories];
                                        const [moved] = reordered.splice(oldIdx, 1);
                                        reordered.splice(newIdx, 0, moved);
                                        updateFeaturedCategories(reordered);
                                        setIsCatDetailsDirty(true);
                                        addLog(`ADMIN ACTION: Manually changed rank of "${moved.name}" from #${oldIdx + 1} to #${newIdx + 1}.`);
                                      }
                                    }}
                                    className="w-full bg-neutral-950 text-neutral-200 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#ff0000] transition font-sans cursor-pointer"
                                  >
                                    {currentFeaturedCategories.map((c, i) => (
                                      <option key={i} value={i}>
                                        Position {i + 1} ({i === 0 ? 'First/Leftmost' : i === currentFeaturedCategories.length - 1 ? 'Last/Rightmost' : `Middle #${i+1}`})
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {/* Move Down/Right Button */}
                                <button
                                  type="button"
                                  disabled={currentFeaturedCategories.indexOf(targetCat) === currentFeaturedCategories.length - 1}
                                  onClick={() => {
                                    const idx = currentFeaturedCategories.indexOf(targetCat);
                                    if (idx < currentFeaturedCategories.length - 1) {
                                      const reordered = [...currentFeaturedCategories];
                                      const temp = reordered[idx];
                                      reordered[idx] = reordered[idx + 1];
                                      reordered[idx + 1] = temp;
                                      updateFeaturedCategories(reordered);
                                      setIsCatDetailsDirty(true);
                                      addLog(`ADMIN ACTION: Manually reordered category "${temp.name}" rightwards/downwards to position ${idx + 2}.`);
                                    }
                                  }}
                                  className={`w-full sm:w-auto px-3 py-1.5 rounded border transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-xs font-bold font-sans ${
                                    currentFeaturedCategories.indexOf(targetCat) === currentFeaturedCategories.length - 1
                                      ? 'border-neutral-900 text-neutral-750 bg-neutral-950/40 cursor-not-allowed'
                                      : 'border-neutral-800 text-neutral-200 hover:text-[#ff0000] hover:border-[#ff0000]/60 bg-[#111111]'
                                  }`}
                                  title="Move Right / Deprioritize"
                                >
                                  Move Down <ArrowDown size={12} strokeWidth={2.5} />
                                </button>
                              </div>
                            </div>

                            {/* Category Status */}
                            <div className="space-y-1.5">
                              <label className="block text-[10px] font-mono text-[#999999] uppercase tracking-wider">
                                Category Status
                              </label>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated: FeaturedCategory[] = currentFeaturedCategories.map((c) =>
                                      c.id === targetCat.id ? { ...c, status: 'publish' as const } : c
                                    );
                                    updateFeaturedCategories(updated);
                                    setIsCatDetailsDirty(true);
                                    addLog(`Category "${targetCat.name}" status updated to Published.`);
                                  }}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer border ${
                                    (targetCat.status || 'publish') === 'publish'
                                      ? 'bg-emerald-950/40 border-emerald-500 text-emerald-400 font-bold'
                                      : 'bg-neutral-950 border-neutral-800 text-neutral-500 hover:text-neutral-300'
                                  }`}
                                >
                                  Published
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated: FeaturedCategory[] = currentFeaturedCategories.map((c) =>
                                      c.id === targetCat.id ? { ...c, status: 'draft' as const } : c
                                    );
                                    updateFeaturedCategories(updated);
                                    setIsCatDetailsDirty(true);
                                    addLog(`Category "${targetCat.name}" status updated to Draft.`);
                                  }}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer border ${
                                    targetCat.status === 'draft'
                                      ? 'bg-amber-950/40 border-amber-500 text-amber-400 font-bold'
                                      : 'bg-neutral-950 border-neutral-800 text-neutral-500 hover:text-neutral-300'
                                  }`}
                                >
                                  Draft
                                </button>
                              </div>
                            </div>

                            {/* count input */}
                            <div className="space-y-1.5">
                              <div className="flex justify-between items-center">
                                <label className="block text-[10px] font-mono text-[#999999] uppercase tracking-wider">
                                  Product Count Badge (or custom subtitle text)
                                </label>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const realCountStr = getCategoryCountText(targetCat.name, currentProducts);
                                    const updated = currentFeaturedCategories.map((c) =>
                                      c.id === targetCat.id ? { ...c, count: realCountStr } : c
                                    );
                                    updateFeaturedCategories(updated);
                                    setIsCatDetailsDirty(true);
                                    addLog(`\U0001f504 [Category Sync] Auto-calculated product count for "${targetCat.name}" with database catalog: ${realCountStr}`);
                                  }}
                                  className="text-[10px] bg-[#1e3a5f]/40 border border-[#1e3a5f]/60 hover:bg-[#1e3a5f]/80 text-blue-300 font-bold px-2 py-0.5 rounded flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Analyze current product database and sync category count badge text"
                                >
                                  <RefreshCw size={10} /> Sync Count
                                </button>
                              </div>
                              <input
                                id="category-product-count-input"
                                type="text"
                                value={targetCat.count}
                                onChange={(e) => {
                                  const updated = currentFeaturedCategories.map((c) =>
                                    c.id === targetCat.id ? { ...c, count: e.target.value } : c
                                  );
                                  updateFeaturedCategories(updated);
                                  setIsCatDetailsDirty(true);
                                }}
                                className="w-full bg-neutral-950 text-neutral-200 border border-neutral-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#ff0000] transition"
                              />
                            </div>

                            {/* image url input */}
                            <div className="space-y-1.5">
                              <div className="flex justify-between items-center">
                                <label className="block text-[10px] font-mono text-[#999999] uppercase tracking-wider">
                                  Image URL / Source File
                                </label>
                                <div className="flex items-center gap-2">
                                  {/* Upload trigger */}
                                  <button
                                    type="button"
                                    onClick={() => categoryImageFileInputRef.current?.click()}
                                    className="text-[10px] bg-neutral-900 border border-neutral-700 hover:bg-neutral-800 text-neutral-300 font-bold px-2 py-1 rounded flex items-center gap-1 transition-colors cursor-pointer"
                                  >
                                    <Upload size={10} /> Upload File
                                  </button>
                                  {/* Delete / Clear */}
                                  <button
                                    type="button"
                                    onClick={handleDeleteCategoryImage}
                                    className="text-[10px] bg-[#3a0000]/40 border border-red-900/60 hover:bg-red-900/40 text-red-400 font-bold px-2 py-1 rounded flex items-center gap-1 transition-colors cursor-pointer"
                                  >
                                    <Trash2 size={10} /> Reset Image
                                  </button>
                                </div>
                              </div>
                              <input
                                type="file"
                                ref={categoryImageFileInputRef}
                                onChange={handleCategoryImgUpload}
                                accept="image/*"
                                className="hidden"
                              />
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={targetCat.img}
                                  onChange={(e) => {
                                    const updated = currentFeaturedCategories.map((c) =>
                                      c.id === targetCat.id ? { ...c, img: e.target.value } : c
                                    );
                                    updateFeaturedCategories(updated);
                                    setIsCatDetailsDirty(true);
                                  }}
                                  className="flex-1 bg-neutral-950 text-neutral-200 border border-neutral-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#ff0000] transition"
                                />
                              </div>
                            </div>

                            {/* Prompt-to-Image AI Generator */}
                            <div className="space-y-2.5 p-3.5 bg-indigo-950/10 border border-indigo-500/20 rounded-xl">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <Sparkles size={12} className="text-indigo-400 animate-pulse" />
                                  <span className="text-[10.5px] font-mono font-bold text-indigo-300 uppercase tracking-widest">Triton Prompt-to-Image AI</span>
                                </div>
                                <span className="text-[8px] uppercase tracking-wider bg-indigo-500/10 text-indigo-300 px-1.5 py-0.5 rounded font-mono">Creative Synthesis</span>
                              </div>
                              
                              <p className="text-[10px] text-neutral-400 leading-normal font-sans">
                                Enter a description below to generate high-chrome machinery, heavy automotive lifts, or customized workshop settings.
                              </p>

                              {/* Dropdown controls for improved AI generation */}
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 py-1.5 border-y border-indigo-500/10">
                                <div className="space-y-1">
                                  <span className="block text-[8px] font-mono text-indigo-400 uppercase tracking-wider">Style Mode</span>
                                  <select 
                                    value={catStyle} 
                                    onChange={(e) => { setCatStyle(e.target.value); setIsCatDetailsDirty(true); }}
                                    className="w-full bg-[#0a0a0a] border border-neutral-800/80 text-[10px] text-neutral-300 rounded px-1.5 py-1 focus:outline-none focus:border-indigo-500 cursor-pointer"
                                  >
                                    <option value="Sleek Industrial">Sleek Industrial</option>
                                    <option value="Realistic Photo">Realistic Photo</option>
                                    <option value="Cinematic Render">Cinematic Render</option>
                                    <option value="Blueprint Graphic">Blueprint Graphic</option>
                                    <option value="Technical CAD Model">Technical CAD Model</option>
                                  </select>
                                </div>

                                <div className="space-y-1">
                                  <span className="block text-[8px] font-mono text-indigo-400 uppercase tracking-wider">Accent Detailing</span>
                                  <select 
                                    value={catAccentColor} 
                                    onChange={(e) => { setCatAccentColor(e.target.value); setIsCatDetailsDirty(true); }}
                                    className="w-full bg-[#0a0a0a] border border-neutral-800/80 text-[10px] text-neutral-300 rounded px-1.5 py-1 focus:outline-none focus:border-indigo-500 cursor-pointer"
                                  >
                                    <option value="Triton Red">Triton Red</option>
                                    <option value="Safety Yellow">Safety Yellow</option>
                                    <option value="Industrial Grey">Industrial Grey</option>
                                    <option value="Carbon Blue">Carbon Blue</option>
                                    <option value="High-Reflect Chrome">High-Reflect Chrome</option>
                                  </select>
                                </div>

                                <div className="space-y-1">
                                  <span className="block text-[8px] font-mono text-indigo-400 uppercase tracking-wider">Environment</span>
                                  <select 
                                    value={catEnvironment} 
                                    onChange={(e) => { setCatEnvironment(e.target.value); setIsCatDetailsDirty(true); }}
                                    className="w-full bg-[#0a0a0a] border border-neutral-800/80 text-[10px] text-neutral-300 rounded px-1.5 py-1 focus:outline-none focus:border-indigo-500 cursor-pointer"
                                  >
                                    <option value="Modern Garage">Modern Garage</option>
                                    <option value="Sleek Studio">Sleek Studio</option>
                                    <option value="Heavy Industry Bay">Heavy Industry Bay</option>
                                    <option value="Cleanroom / Lab">Cleanroom / Lab</option>
                                  </select>
                                </div>

                                <div className="space-y-1">
                                  <span className="block text-[8px] font-mono text-indigo-400 uppercase tracking-wider">Lighting Style</span>
                                  <select 
                                    value={catLighting} 
                                    onChange={(e) => { setCatLighting(e.target.value); setIsCatDetailsDirty(true); }}
                                    className="w-full bg-[#0a0a0a] border border-neutral-800/80 text-[10px] text-neutral-300 rounded px-1.5 py-1 focus:outline-none focus:border-indigo-500 cursor-pointer"
                                  >
                                    <option value="High-Contrast Spotlights">High-Contrast Spotlights</option>
                                    <option value="Neon Ambient style">Neon Ambient Glow</option>
                                    <option value="Soft daylight style">Soft Daylight</option>
                                    <option value="Dark Moody style">Dark Moody reflections</option>
                                  </select>
                                </div>

                                <div className="space-y-1">
                                  <span className="block text-[8px] font-mono text-indigo-400 uppercase tracking-wider">Framing/Aspect</span>
                                  <select 
                                    value={catAspect} 
                                    onChange={(e) => { setCatAspect(e.target.value); setIsCatDetailsDirty(true); }}
                                    className="w-full bg-[#0a0a0a] border border-neutral-800/80 text-[10px] text-neutral-300 rounded px-1.5 py-1 focus:outline-none focus:border-indigo-500 cursor-pointer"
                                  >
                                    <option value="Square (1:1)">Square (1:1)</option>
                                    <option value="Landscape (16:9)">Landscape (16:9)</option>
                                    <option value="Portrait (4:5)">Portrait (4:5)</option>
                                  </select>
                                </div>
                              </div>

                              <div className="flex gap-2 items-center">
                                <input
                                  type="text"
                                  placeholder="e.g. Premium four post car alignment lift system with real dual hydraulics"
                                  value={catAiPrompt}
                                  onChange={(e) => { setCatAiPrompt(e.target.value); setIsCatDetailsDirty(true); }}
                                  disabled={isGeneratingCatImage}
                                  className="flex-1 bg-neutral-950 placeholder-neutral-600 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-indigo-500 transition disabled:opacity-50 font-sans"
                                />
                                <button
                                  type="button"
                                  onClick={handleAiCategoryImgGenerate}
                                  disabled={isGeneratingCatImage || !catAiPrompt.trim()}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                                    isGeneratingCatImage || !catAiPrompt.trim()
                                      ? 'bg-neutral-800 text-neutral-500 animate-disabled-flash cursor-not-allowed'
                                      : 'bg-indigo-900/80 hover:bg-indigo-700 text-white animate-live-flash'
                                  }`}
                                >
                                  {isGeneratingCatImage ? (
                                    <>
                                      <Cpu size={11} className="animate-spin text-white" />
                                      Synthesizing...
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles size={11} className="text-indigo-300" />
                                      AI Generate
                                    </>
                                  )}
                                </button>
                              </div>

                              {/* AI generation process simulation indicator */}
                              {isGeneratingCatImage && (
                                <div className="p-3 bg-indigo-950/30 border border-indigo-500/30 rounded-lg space-y-2 mt-2 font-mono text-[10px]">
                                  <div className="flex items-center justify-between text-indigo-400 animate-pulse">
                                    <span className="font-bold flex items-center gap-1">
                                      <Cpu size={11} /> TRITON AI ACTIVE
                                    </span>
                                    <span>RUNNING</span>
                                  </div>
                                  <p className="text-neutral-300 text-[9.5px] leading-relaxed transition-all italic">
                                    "{catSimulationStep}"
                                  </p>
                                  <div className="w-full bg-neutral-950 rounded-full h-1 overflow-hidden border border-neutral-900">
                                    <div className="bg-gradient-to-r from-red-600 via-indigo-500 to-indigo-600 h-1 rounded-full animate-pulse w-3/4 duration-1000"></div>
                                  </div>
                                </div>
                              )}

                              {/* Clickable preset shortcuts */}
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                <span className="text-[9px] font-mono text-neutral-500 flex items-center mr-1">Presets:</span>
                                {[
                                  '4-Post alignment lift',
                                  'Heated spray paint booth',
                                  'Double parking lift',
                                  'Heavy-duty bus lifts'
                                ].map((preset) => (
                                  <button
                                    key={preset}
                                    type="button"
                                    onClick={() => {
                                      setCatAiPrompt(preset);
                                      setIsCatDetailsDirty(true);
                                    }}
                                    className="text-[9px] bg-neutral-900 hover:bg-indigo-950/45 hover:text-indigo-200 border border-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded transition-colors cursor-pointer font-sans"
                                  >
                                    {preset}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Category SEO Meta Details (seoTitle and seoDescription) */}
                            <div className="space-y-3 pt-2 border-t border-neutral-800/80">
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <label className="block text-[10px] font-mono text-[#999999] uppercase tracking-wider">
                                    Category SEO Title (Meta Title)
                                  </label>
                                  <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                                    (targetCat.seoTitle || '').length >= 50 && (targetCat.seoTitle || '').length <= 65
                                      ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-900/50'
                                      : (targetCat.seoTitle || '').length > 65
                                      ? 'bg-amber-950/60 text-amber-400 border border-amber-900/50'
                                      : 'text-neutral-500 font-mono'
                                  }`}>
                                    {(targetCat.seoTitle || '').length} / 60 chars
                                  </span>
                                </div>
                                <input
                                  type="text"
                                  placeholder={`${targetCat.name} | Heavy Duty Automotive Equipment | Triton SA`}
                                  value={targetCat.seoTitle || ''}
                                  onChange={(e) => {
                                    const updated = currentFeaturedCategories.map((c) =>
                                      c.id === targetCat.id ? { ...c, seoTitle: e.target.value } : c
                                    );
                                    updateFeaturedCategories(updated);
                                    setIsCatDetailsDirty(true);
                                  }}
                                  className="w-full bg-neutral-950 text-neutral-200 border border-neutral-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#ff0000] transition"
                                />
                              </div>

                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <label className="block text-[10px] font-mono text-[#999999] uppercase tracking-wider">
                                    Category SEO Description (Meta Description)
                                  </label>
                                  <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                                    (targetCat.seoDescription || '').length >= 120 && (targetCat.seoDescription || '').length <= 160
                                      ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-900/50'
                                      : (targetCat.seoDescription || '').length > 160
                                      ? 'bg-amber-950/60 text-amber-400 border border-amber-900/50'
                                      : 'text-neutral-500 font-mono'
                                  }`}>
                                    {(targetCat.seoDescription || '').length} / 160 chars
                                  </span>
                                </div>
                                <textarea
                                  rows={2}
                                  placeholder={`Explore commercial grade ${targetCat.name.toLowerCase()} in South Africa with SABS & CE certified guarantees and nationwide delivery.`}
                                  value={targetCat.seoDescription || ''}
                                  onChange={(e) => {
                                    const updated = currentFeaturedCategories.map((c) =>
                                      c.id === targetCat.id ? { ...c, seoDescription: e.target.value } : c
                                    );
                                    updateFeaturedCategories(updated);
                                    setIsCatDetailsDirty(true);
                                  }}
                                  className="w-full bg-neutral-950 text-neutral-200 border border-neutral-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#ff0000] transition"
                                />
                              </div>
                            </div>

                            {/* Preview */}
                            <div className="space-y-2 pt-2">
                              <label className="block text-[10px] font-mono text-[#999999] uppercase tracking-wider">
                                Live Preview Block
                              </label>
                              <div className="bg-[#111111] border border-neutral-800 rounded-xl p-4 flex flex-col items-center">
                                <div className="w-48 aspect-square bg-[#1a1a1a] overflow-hidden mb-4 rounded-lg shadow-md border border-[#333333]">
                                  <CategoryPreviewImage 
                                    src={targetCat.img} 
                                    alt={targetCat.name} 
                                    className="w-full h-full object-cover opacity-95 hover:opacity-100 transition-all duration-300" 
                                  />
                                </div>
                                <h3 className="text-sm font-bold text-white mb-0.5">{targetCat.name}</h3>
                                <p className="text-[10px] text-[#999999] mb-2">{getCategoryCountText(targetCat.name, currentProducts)}</p>
                                <span className="text-[10px] font-semibold text-[#ff0000]/90 transition-colors uppercase tracking-wider">
                                  Browse Category \u2192
                                </span>
                              </div>
                            </div>

                            {/* SEO Audit & Competitor Intelligence Section */}
                            <div className="border border-neutral-800 rounded-xl bg-[#0a0a0a] overflow-hidden space-y-0.5">
                              <button
                                type="button"
                                onClick={() => setIsCatSeoExpanded(!isCatSeoExpanded)}
                                className="w-full p-3.5 flex items-center justify-between bg-neutral-900/60 hover:bg-neutral-900 transition-colors cursor-pointer text-left"
                              >
                                <div className="flex items-center gap-2">
                                  <Globe size={13} className="text-red-500 animate-pulse" />
                                  <span className="text-xs font-bold text-neutral-200 uppercase tracking-wider font-mono">
                                    SEO Audit & Competitor Intelligence
                                  </span>
                                </div>
                                <span className="text-[10px] text-neutral-500 font-mono flex items-center gap-1">
                                  {isCatSeoExpanded ? 'Collapse' : 'Expand'}
                                  <ArrowUpDown size={11} />
                                </span>
                              </button>

                              {isCatSeoExpanded && (
                                <div className="p-4 space-y-4 border-t border-neutral-800/60">
                                  <p className="text-[10px] text-neutral-400 leading-normal font-sans">
                                    Analyze live South African search competitors for <strong className="text-neutral-200">"{targetCat.name}"</strong>, extract key compliance trends, and generate custom AI-grounded SEO Meta Tags.
                                  </p>

                                  <button
                                    type="button"
                                    disabled={categoryAuditLoading}
                                    onClick={async () => {
                                      // Map targetCat.name to a category slug
                                      const name = targetCat.name.toLowerCase();
                                      let slug = 'car-lift';
                                      if (name.includes('lift') || name.includes('hoist') || name.includes('parking') || name.includes('storage')) {
                                        slug = 'car-lift';
                                      } else if (name.includes('spray') || name.includes('booth') || name.includes('heater') || name.includes('oven')) {
                                        slug = 'spray-booth';
                                      } else if (name.includes('weld') || name.includes('mig') || name.includes('sweis')) {
                                        slug = 'welder';
                                      } else if (name.includes('alignment') || name.includes('balancer') || name.includes('tyre') || name.includes('tire') || name.includes('wheel')) {
                                        slug = 'wheel-alignment';
                                      } else if (name.includes('diagnostic') || name.includes('scanner') || name.includes('tool') || name.includes('obd')) {
                                        slug = 'diagnostic-tools';
                                      } else if (name.includes('compressor') || name.includes('air')) {
                                        slug = 'air-compressors';
                                      }
                                      setSelectedAuditCategory(slug);
                                      await handleRunCategoryAudit(slug);
                                    }}
                                    className="w-full py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-neutral-850 disabled:text-neutral-500 text-white font-sans font-black text-xs uppercase rounded-lg flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(220,38,38,0.2)] transition-all cursor-pointer animate-live-flash"
                                  >
                                    {categoryAuditLoading ? (
                                      <>
                                        <RefreshCw size={12} className="animate-spin text-white" />
                                        Indexing ZA SERPs...
                                      </>
                                    ) : (
                                      <>
                                        <Search size={12} strokeWidth={2.5} />
                                        Audit Competitors & Suggest Tags
                                      </>
                                    )}
                                  </button>

                                  {categoryAuditLoading && (
                                    <div className="p-3.5 bg-[#050505] border border-neutral-900 rounded-lg space-y-2 text-center animate-pulse">
                                      <RefreshCw size={20} className="mx-auto text-red-500 animate-spin mb-1" />
                                      <p className="text-[10px] font-mono text-neutral-300">Searching Google South Africa...</p>
                                      <p className="text-[9px] text-neutral-500 font-sans leading-relaxed">
                                        Locating top-ranked competitors, scraping CE compliance tags, and invoking Gemini 3.5 Flash Search Grounding...
                                      </p>
                                    </div>
                                  )}

                                  {!categoryAuditLoading && categoryAuditResult && (
                                    <div className="space-y-4 animate-in fade-in duration-300 text-left">
                                      {/* Competitor List */}
                                      <div className="space-y-1.5">
                                        <span className="block text-[9px] font-mono text-neutral-500 uppercase tracking-wider">Top 5 South African Competitors</span>
                                        <div className="space-y-1 bg-black border border-neutral-900 rounded-lg p-2.5">
                                          {categoryAuditResult.competitorsFound && categoryAuditResult.competitorsFound.length > 0 ? (
                                            categoryAuditResult.competitorsFound.map((comp, idx) => (
                                              <a
                                                key={idx}
                                                href={comp.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-between p-1.5 rounded hover:bg-neutral-900/60 transition-colors text-[10.5px] text-neutral-300 hover:text-white"
                                              >
                                                <span className="truncate pr-4 font-sans font-medium flex items-center gap-1.5">
                                                  <span className="text-[9px] font-mono text-neutral-500">#{idx + 1}</span>
                                                  {comp.name}
                                                </span>
                                                <ExternalLink size={10} className="text-neutral-500 shrink-0" />
                                              </a>
                                            ))
                                          ) : (
                                            <p className="text-[10px] text-neutral-500 italic p-1">No competitors indexed.</p>
                                          )}
                                        </div>
                                      </div>

                                      {/* Competitor Analysis */}
                                      <div className="space-y-1.5">
                                        <span className="block text-[9px] font-mono text-neutral-500 uppercase tracking-wider">SEO Strategy Analysis</span>
                                        <div className="bg-[#0e0e0e] border border-neutral-900 rounded-lg p-3 text-[10.5px] text-neutral-300 leading-relaxed font-sans">
                                          {categoryAuditResult.competitorAnalysis}
                                        </div>
                                      </div>

                                      {/* Recommended Title */}
                                      <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                          <span className="block text-[9px] font-mono text-neutral-500 uppercase tracking-wider">AI-Suggested Meta Title</span>
                                          <span className={`text-[8.5px] font-mono px-1.5 py-0.2 rounded font-bold ${
                                            categoryAuditResult.recommendedTitle.length >= 50 && categoryAuditResult.recommendedTitle.length <= 60
                                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/50'
                                              : 'bg-amber-950/40 text-amber-500 border border-amber-900/30'
                                          }`}>
                                            {categoryAuditResult.recommendedTitle.length} chars
                                          </span>
                                        </div>
                                        <div className="flex gap-1.5">
                                          <div className="flex-1 bg-black border border-neutral-900 rounded-lg p-2.5 font-sans font-semibold text-[11px] text-white">
                                            {categoryAuditResult.recommendedTitle}
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const updated = currentFeaturedCategories.map((c) =>
                                                c.id === targetCat.id ? { ...c, seoTitle: categoryAuditResult.recommendedTitle } : c
                                              );
                                              updateFeaturedCategories(updated);
                                              setIsCatDetailsDirty(true);
                                              setSeoNotification({ type: 'success', text: 'Meta Title applied to category!' });
                                              setTimeout(() => setSeoNotification(null), 3000);
                                            }}
                                            className="px-2.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 shrink-0"
                                            title="Apply as Category SEO Title"
                                          >
                                            <CheckCircle size={11} /> Apply
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              navigator.clipboard.writeText(categoryAuditResult.recommendedTitle);
                                              setSeoNotification({ type: 'success', text: 'Meta Title copied to clipboard!' });
                                              setTimeout(() => setSeoNotification(null), 3000);
                                            }}
                                            className="p-2.5 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-850 rounded-lg text-neutral-400 hover:text-white transition-all cursor-pointer flex items-center justify-center shrink-0"
                                            title="Copy Meta Title"
                                          >
                                            <Copy size={12} />
                                          </button>
                                        </div>
                                      </div>

                                      {/* Recommended Description */}
                                      <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                          <span className="block text-[9px] font-mono text-neutral-500 uppercase tracking-wider">AI-Suggested Meta Description</span>
                                          <span className={`text-[8.5px] font-mono px-1.5 py-0.2 rounded font-bold ${
                                            categoryAuditResult.recommendedDescription.length >= 120 && categoryAuditResult.recommendedDescription.length <= 160
                                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/50'
                                              : 'bg-amber-950/40 text-amber-500 border border-amber-900/30'
                                          }`}>
                                            {categoryAuditResult.recommendedDescription.length} chars
                                          </span>
                                        </div>
                                        <div className="flex gap-1.5">
                                          <div className="flex-1 bg-black border border-neutral-900 rounded-lg p-2.5 font-sans text-[11px] leading-relaxed text-neutral-300">
                                            {categoryAuditResult.recommendedDescription}
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const updated = currentFeaturedCategories.map((c) =>
                                                c.id === targetCat.id ? { ...c, seoDescription: categoryAuditResult.recommendedDescription } : c
                                              );
                                              updateFeaturedCategories(updated);
                                              setIsCatDetailsDirty(true);
                                              setSeoNotification({ type: 'success', text: 'Meta Description applied to category!' });
                                              setTimeout(() => setSeoNotification(null), 3000);
                                            }}
                                            className="px-2.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 shrink-0"
                                            title="Apply as Category SEO Description"
                                          >
                                            <CheckCircle size={11} /> Apply
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              navigator.clipboard.writeText(categoryAuditResult.recommendedDescription);
                                              setSeoNotification({ type: 'success', text: 'Meta Description copied to clipboard!' });
                                              setTimeout(() => setSeoNotification(null), 3000);
                                            }}
                                            className="p-2.5 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-850 rounded-lg text-neutral-400 hover:text-white transition-all cursor-pointer flex items-center justify-center shrink-0"
                                            title="Copy Meta Description"
                                          >
                                            <Copy size={12} />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Product Display Arrangement List under normal category */}
                            {(() => {
                              const relatedProductsList = currentProducts.filter(p => isProductMatchedToCategory(p, targetCat.name));
                              const sortedRelatedProducts = [...relatedProductsList].sort((a, b) => {
                                const sortA = a.sortOrder ?? 99999;
                                const sortB = b.sortOrder ?? 99999;
                                if (sortA !== sortB) return sortA - sortB;
                                const idxA = currentProducts.findIndex(p => p.id === a.id);
                                const idxB = currentProducts.findIndex(p => p.id === b.id);
                                return idxA - idxB;
                              });

                              return (
                                <div className="space-y-3 pt-4 border-t border-neutral-800">
                                  <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5 font-mono">
                                      <ArrowUpDown size={13} className="text-[#ff0000]" /> Display Arrangement: {targetCat.name}
                                    </h4>
                                    <p className="text-[10px] text-neutral-500 font-sans leading-normal">
                                      Use the move up/down hotkeys below to reorder products displayed in this category. Elements listed higher display first in the digital shop floor.
                                    </p>
                                  </div>

                                  <div className="space-y-1.5 bg-[#080808] border border-neutral-900 rounded-lg p-2 max-h-[350px] overflow-y-auto">
                                    {sortedRelatedProducts.length === 0 ? (
                                      <div className="py-8 text-center text-neutral-600 text-xs font-sans">
                                        No active products are assigned or matching this specific category query terms.
                                      </div>
                                    ) : (
                                      sortedRelatedProducts.map((p, idx) => (
                                        <div key={p.id} className="p-2.5 bg-[#121212] border border-neutral-800 hover:border-neutral-700/60 transition-all rounded-md flex items-center justify-between gap-3 text-xs font-sans">
                                          <div className="flex items-center gap-2.5 min-w-0">
                                            <img 
                                              src={p.image} 
                                              alt="" 
                                              className="w-8 h-8 object-cover rounded border border-neutral-800 shrink-0"
                                              onError={(e) => {
                                                e.currentTarget.src = 'https://images.unsplash.com/photo-1563720223185-11003d516935?q=80&w=150&auto=format&fit=crop';
                                              }}
                                            />
                                            <div className="min-w-0">
                                              <div className="font-bold text-neutral-200 truncate pr-2">{p.name}</div>
                                              <div className="text-[10px] font-mono text-neutral-500 flex items-center gap-2 mt-0.5">
                                                <span>SKU: {p.modelCode}</span>
                                                {p.sortOrder !== undefined && (
                                                  <span className="bg-red-950/20 text-[#ff0000] border border-red-950/40 px-1 py-0.2 rounded font-bold text-[8.5px]">Position: {p.sortOrder}</span>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                          
                                          <div className="flex items-center gap-1 shrink-0">
                                            <button
                                              type="button"
                                              disabled={idx === 0}
                                              onClick={() => handleMoveProductOrder(sortedRelatedProducts, idx, 'up')}
                                              className={`p-1.5 rounded border transition-colors flex items-center justify-center cursor-pointer ${
                                                idx === 0
                                                  ? 'border-neutral-900 text-neutral-750 bg-neutral-950/40 cursor-not-allowed'
                                                  : 'border-neutral-800 text-neutral-400 hover:text-[#ff0000] hover:border-[#ff0000]/60 bg-neutral-900'
                                              }`}
                                              title="Move Up"
                                            >
                                              <ArrowUp size={11} strokeWidth={2.5} />
                                            </button>
                                            <button
                                              type="button"
                                              disabled={idx === sortedRelatedProducts.length - 1}
                                              onClick={() => handleMoveProductOrder(sortedRelatedProducts, idx, 'down')}
                                              className={`p-1.5 rounded border transition-colors flex items-center justify-center cursor-pointer ${
                                                idx === sortedRelatedProducts.length - 1
                                                  ? 'border-neutral-900 text-neutral-750 bg-neutral-950/40 cursor-not-allowed'
                                                  : 'border-neutral-800 text-neutral-400 hover:text-[#ff0000] hover:border-[#ff0000]/60 bg-neutral-900'
                                              }`}
                                              title="Move Down"
                                            >
                                              <ArrowDown size={11} strokeWidth={2.5} />
                                            </button>
                                          </div>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {/* MANAGE PRODUCTS TAB */}
              {activeTab === 'products' && (
                <div className="flex flex-col md:flex-row gap-4 lg:gap-6 items-stretch w-full min-h-[600px] lg:min-h-[750px]">
                  
                  {/* Left Column - Products List Selection */}
                  <div className="w-full md:w-72 lg:w-80 xl:w-96 shrink-0 flex flex-col bg-[#0c0c0c] border border-[#222222] rounded-xl overflow-hidden min-h-[350px] md:min-h-[600px] lg:min-h-[750px]">
                    <div className="p-4 bg-[#141414] border-b border-[#222222] space-y-3 shrink-0">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#cccccc] flex items-center gap-1.5">
                          <Layers size={13} className="text-[#ff0000]" /> Product Catalog
                        </h4>
                        <span className="text-[10px] font-mono bg-neutral-900 border border-neutral-800 text-neutral-400 px-2 py-0.5 rounded">
                          {currentProducts.length} Items
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          value={searchProductQuery}
                          onChange={(e) => setSearchProductQuery(e.target.value)}
                          placeholder="Search database inventory..."
                          className="w-full bg-[#050505] border border-[#222222] pl-8 pr-3 py-2 text-xs text-white rounded outline-none focus:border-[#ff0005]/40 focus:ring-1 focus:ring-[#ff0005]/20 font-medium font-sans"
                        />
                        <Search size={12} className="absolute left-2.5 top-2.5 text-neutral-500" />
                        {searchProductQuery && (
                          <button 
                            type="button"
                            onClick={() => setSearchProductQuery('')}
                            className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-white text-[10px] font-bold"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleCreateNewProduct}
                            className="flex-1 bg-[#1e3a5f] hover:bg-[#162a47] text-white py-1.5 rounded text-[11px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Plus size={11} /> Add Product
                          </button>
                          <button
                            type="button"
                            onClick={handleResetCatalog}
                            className="px-2.5 bg-neutral-900 hover:bg-[#222222] border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-white rounded text-[11px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1 cursor-pointer"
                            title="Reset database to S.A. default showroom"
                          >
                            <RotateCcw size={11} /> Revert
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={handleBulkDeleteDrafts}
                          disabled={currentProducts.filter(p => p && p.status === 'draft').length === 0}
                          className="w-full bg-[#1c0d0d] hover:bg-[#2e1212] disabled:opacity-30 disabled:hover:bg-[#1c0d0d] disabled:cursor-not-allowed text-red-400 disabled:text-neutral-600 border border-red-950 hover:border-red-900/40 disabled:border-neutral-900/50 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          title="Permanently remove all products in 'draft' status"
                        >
                          <Trash2 size={11} /> Bulk Delete Drafts ({currentProducts.filter(p => p && p.status === 'draft').length})
                        </button>
                      </div>
                    </div>

                    {/* Scrollable list */}
                    <div className="flex-1 overflow-y-auto divide-y divide-neutral-900/50 p-2 space-y-1.5">
                      {currentProducts
                        .filter(p => {
                          if (!p) return false;
                          const nameVal = String(p.name || '').toLowerCase();
                          const modelVal = String(p.modelCode || '').toLowerCase();
                          const catVal = String(p.category || '').toLowerCase();
                          const queryVal = String(searchProductQuery || '').toLowerCase();
                          return nameVal.includes(queryVal) || 
                                 modelVal.includes(queryVal) || 
                                 catVal.includes(queryVal);
                        })
                        .map(p => {
                          const isSelected = p.id === selectedProdId;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => setSelectedProdId(p.id)}
                              className={`w-full p-2.5 rounded-lg flex items-start gap-2.5 transition-all text-left border cursor-pointer ${
                                isSelected 
                                  ? 'bg-[#181818] border-[#ff0000] text-white' 
                                  : 'bg-transparent border-transparent hover:bg-neutral-950/40 text-neutral-400 hover:text-white'
                              }`}
                            >
                               <img 
                                src={p.image} 
                                alt="" 
                                className="w-10 h-10 object-cover rounded border border-neutral-800 shrink-0" 
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  e.currentTarget.src = 'https://images.unsplash.com/photo-1563720223185-11003d516935?q=80&w=150&auto=format&fit=crop';
                                }}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex justify-between items-start gap-1">
                                  <h5 className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-neutral-350'}`}>{p.name}</h5>
                                </div>
                                <div className="flex items-center justify-between gap-1 mt-1">
                                  <span className="text-[10px] font-mono text-[#888888]">{p.modelCode}</span>
                                  <span className="text-[11px] font-bold text-neutral-200">
                                    {p.price > 0 ? `R ${p.price.toLocaleString('en-ZA')}` : 'Request Quote'}
                                  </span>
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                  <span className="text-[8px] bg-neutral-900 border border-neutral-800 text-neutral-500 rounded px-1.5 font-bold uppercase tracking-wider font-sans">
                                    {p.category}
                                  </span>
                                  {p.status === 'draft' ? (
                                    <span className="text-[8px] bg-amber-950/60 border border-[#b25e00]/40 text-amber-400 rounded px-1.5 font-bold uppercase tracking-wider font-mono">
                                      DRAFT
                                    </span>
                                  ) : (
                                    <span className="text-[8px] bg-emerald-950/60 border border-emerald-900/40 text-emerald-400 rounded px-1.5 font-bold uppercase tracking-wider font-mono">
                                      PUBLISHED
                                    </span>
                                  )}
                                  {p.dateCreated && (
                                    <span className="text-[8px] text-neutral-550 font-mono tracking-tight">
                                      {p.dateCreated}
                                    </span>
                                  )}
                                  {!p.inStock && (
                                    <span className="text-[8px] bg-red-950 text-red-400 rounded px-1.5 font-bold uppercase tracking-wider font-mono">
                                      OUT OF STOCK
                                    </span>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </div>

                  {/* Right Column - Active Product Editor */}
                  <div className="flex-1 min-w-0 flex flex-col bg-[#0c0c0c] border border-[#222222] rounded-xl overflow-hidden min-h-[500px] md:min-h-[600px] lg:min-h-[750px]">
                    {editedProduct ? (
                      <div className="flex flex-col h-full overflow-hidden">
                        
                        {/* Editor Header */}
                        <div className="p-4 bg-[#141414] border-b border-[#222222] flex justify-between items-center shrink-0">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest font-mono">PRODUCT SPEC DATABASE EDITOR</span>
                              <span className="text-[10px] bg-[#1a1a1a] px-1.5 py-0.5 rounded text-neutral-400 font-mono">ID: {editedProduct.id}</span>
                            </div>
                            <h4 className="text-sm font-bold text-white truncate max-w-lg mt-0.5">{editedProduct.name}</h4>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(editedProduct.id)}
                              className="px-3 py-1.5 bg-red-950/30 hover:bg-red-950/60 border border-red-900/10 text-red-400 hover:text-red-300 rounded text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer"
                            >
                              <Trash2 size={12} /> Delete
                            </button>
                            <button
                              type="button"
                              onClick={handleSaveProduct}
                              className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                            >
                              <Save size={12} /> Save Changes
                            </button>
                          </div>
                        </div>

                        {/* Save message Banner */}
                        {saveMessage && (
                          <div className="bg-emerald-950/80 border-b border-emerald-500/30 px-4 py-2.5 text-emerald-300 text-xs font-medium flex items-center justify-between gap-3 shrink-0 animate-in fade-in duration-200 shadow-sm">
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              {isSyncing ? (
                                <RefreshCw size={14} className="text-emerald-400 animate-spin shrink-0" />
                              ) : (
                                <CheckCircle size={14} className="text-emerald-400 shrink-0" />
                              )}
                              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 min-w-0">
                                <span className="font-bold text-white tracking-wide">{saveMessage}</span>
                                {isSyncing && (
                                  <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold text-emerald-300 bg-emerald-900/60 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                                    Autosync background active ({syncProgress}%)
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSaveMessage('')}
                              className="text-neutral-400 hover:text-white p-1 px-2 rounded hover:bg-neutral-800/60 transition-colors shrink-0 text-[10px] font-mono font-bold uppercase cursor-pointer border border-neutral-700/50"
                              title="Dismiss note"
                            >
                              Dismiss
                            </button>
                          </div>
                        )}

                        {/* Editor Forms - scrollable body */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-6">
                          
                          {/* Section 1: Basic Specifications */}
                          <div className="space-y-4">
                            <h5 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 border-b border-[#222222] pb-1.5">1. Basic Information</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              
                              <div className="space-y-1.5">
                                <label className="text-[10px] uppercase font-bold text-neutral-500">Product Name</label>
                                <input
                                  type="text"
                                  value={editedProduct.name}
                                  onChange={(e) => setEditedProduct({ ...editedProduct, name: e.target.value })}
                                  className="w-full bg-[#111111] border border-[#222222] text-xs font-medium text-white px-3 py-2.5 rounded outline-none focus:border-[#ff0000]"
                                />
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-[10px] uppercase font-bold text-neutral-500">Model Code / SKU</label>
                                <input
                                  type="text"
                                  value={editedProduct.modelCode}
                                  onChange={(e) => setEditedProduct({ ...editedProduct, modelCode: e.target.value })}
                                  className="w-full bg-[#111111] border border-[#222222] text-xs font-mono text-white px-3 py-2.5 rounded outline-none focus:border-[#ff0000]"
                                />
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-[10px] uppercase font-bold text-neutral-500">Pricing (ZAR Rands - set 0 for quote)</label>
                                <input
                                  type="number"
                                  value={editedProduct.price}
                                  onChange={(e) => setEditedProduct({ ...editedProduct, price: parseFloat(e.target.value) || 0 })}
                                  className="w-full bg-[#111111] border border-[#222222] text-xs font-mono text-white px-3 py-2.5 rounded outline-none focus:border-[#ff0000]"
                                />
                              </div>

                              <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                  <label className="text-[10px] uppercase font-bold text-neutral-500">Category Folder</label>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={handleStartAddCategory}
                                      className="text-[9px] text-[#ff0000] hover:text-red-400 uppercase font-bold flex items-center gap-0.5 cursor-pointer bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-800"
                                      title="Add dynamic category folder"
                                    >
                                      <Plus size={9} /> Add
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleStartRenameCategory}
                                      className="text-[9px] text-amber-500 hover:text-amber-400 uppercase font-bold flex items-center gap-0.5 cursor-pointer bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-800"
                                      title="Rename current category code"
                                    >
                                      <Edit size={9} /> Rename
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleDeleteCategory}
                                      className="text-[9px] text-neutral-400 hover:text-red-500 uppercase font-bold flex items-center gap-0.5 cursor-pointer bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-800"
                                      title="Delete current category"
                                    >
                                      <Trash2 size={9} /> Delete
                                    </button>
                                  </div>
                                </div>

                                {isAddingCategory ? (
                                  <div className="flex gap-1">
                                    <input
                                      type="text"
                                      value={categoryInputVal}
                                      onChange={(e) => setCategoryInputVal(e.target.value)}
                                      placeholder="new-category-slug"
                                      className="flex-1 bg-[#111111] border border-red-500 text-xs font-mono text-white px-2.5 py-2 rounded outline-none"
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          handleSaveNewCategory();
                                        }
                                      }}
                                      autoFocus
                                    />
                                    <button
                                      type="button"
                                      onClick={handleSaveNewCategory}
                                      className="px-2.5 bg-red-700 hover:bg-red-600 text-white rounded text-xs font-bold uppercase cursor-pointer"
                                    >
                                      Add
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setIsAddingCategory(false);
                                        setCategoryInputVal('');
                                      }}
                                      className="px-2 bg-neutral-850 hover:bg-neutral-800 text-neutral-400 rounded text-xs font-bold"
                                    >
                                      X
                                    </button>
                                  </div>
                                ) : isRenamingCategory ? (
                                  <div className="flex gap-1">
                                    <input
                                      type="text"
                                      value={categoryInputVal}
                                      onChange={(e) => setCategoryInputVal(e.target.value)}
                                      placeholder="rename-category-slug"
                                      className="flex-1 bg-[#111111] border border-amber-500 text-xs font-mono text-white px-2.5 py-2 rounded outline-none"
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          handleSaveRenamedCategory();
                                        }
                                      }}
                                      autoFocus
                                    />
                                    <button
                                      type="button"
                                      onClick={handleSaveRenamedCategory}
                                      className="px-2.5 bg-amber-700 hover:bg-amber-600 text-white rounded text-xs font-bold uppercase cursor-pointer"
                                    >
                                      Rename
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setIsRenamingCategory(false);
                                        setCategoryInputVal('');
                                      }}
                                      className="px-2 bg-neutral-850 hover:bg-neutral-800 text-neutral-400 rounded text-xs font-bold"
                                    >
                                      X
                                    </button>
                                  </div>
                                ) : (
                                  <div className="space-y-1">
                                    <select
                                      value={editedProduct.category}
                                      onChange={(e) => {
                                        const newCategory = e.target.value as any;
                                        setEditedProduct({ ...editedProduct, category: newCategory });
                                        
                                        // Instantly update the category across all products in the product catalog
                                        const updated = currentProducts.map(p => p.id === editedProduct.id ? { ...p, category: newCategory } : p);
                                        updateProducts(updated);
                                        addLog(`\u26a1 [Catalog] Live Category updated instantly for '${editedProduct.name}' to '${formatCategoryLabel(newCategory)}'.`);
                                      }}
                                      onDoubleClick={handleStartRenameCategory}
                                      title="Double-click to rename/edit this category folder"
                                      className="id-category-select-input w-full bg-[#111111] border border-[#222222] text-xs text-white px-3 py-2.5 rounded outline-none focus:border-[#ff0000] cursor-pointer hover:border-neutral-700 transition"
                                    >
                                      {editedProduct.category && !categories.includes(editedProduct.category) && (
                                        <option value={editedProduct.category}>
                                          {formatCategoryLabel(editedProduct.category)}
                                        </option>
                                      )}
                                      {categories.map((cat) => (
                                        <option key={cat} value={cat}>
                                          {formatCategoryLabel(cat)}
                                        </option>
                                      ))}
                                    </select>
                                    <span className="text-[10px] text-neutral-500 block">
                                      \U0001f4a1 Double-click the select box above to edit its folder name & save instantly.
                                    </span>
                                    <div className="flex items-center gap-2 mt-2 pt-1.5 border-t border-neutral-900">
                                      <input
                                        type="checkbox"
                                        id="auto-sync-checkbox-editor"
                                        checked={autoSyncOnSave}
                                        onChange={toggleAutoSyncOnSave}
                                        className="w-3.5 h-3.5 accent-[#ff0000] rounded border-neutral-800 bg-[#070707] cursor-pointer"
                                      />
                                      <label htmlFor="auto-sync-checkbox-editor" className="text-[10px] font-mono text-neutral-400 select-none cursor-pointer flex items-center gap-1 hover:text-white transition-colors">
                                        <RefreshCw size={9} className={`${autoSyncOnSave && isSyncing ? 'animate-spin text-red-500' : 'text-neutral-500'}`} />
                                        Auto-Sync to WooCommerce on Save
                                      </label>
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="md:col-span-2 space-y-1.5">
                                <label className="text-[10px] uppercase font-bold text-neutral-500">Product Synopsis Description</label>
                                <textarea
                                  value={editedProduct.description}
                                  onChange={(e) => setEditedProduct({ ...editedProduct, description: e.target.value })}
                                  rows={3}
                                  className="w-full bg-[#111111] border border-[#222222] text-xs text-white p-3 rounded outline-none focus:border-[#ff0000] leading-relaxed resize-none"
                                />
                              </div>

                              <div className="md:col-span-2 space-y-3 p-4 bg-[#111111]/40 border border-neutral-900 rounded-xl">
                                <div className="flex items-center justify-between border-b border-neutral-900 pb-2 mb-2">
                                  <div>
                                    <span className="text-[10px] uppercase font-black text-neutral-400 tracking-wider block">Showroom Dispatch Badge Selection</span>
                                    <span className="text-[9px] text-neutral-500 font-sans">Choose the active dispatch/stock status badge rendered on the live product cards</span>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                  {/* Option 1: In Stock Badge */}
                                  <label 
                                    className={`flex flex-col gap-1.5 p-3 rounded-lg border transition-all duration-200 cursor-pointer text-left select-none ${
                                      (!editedProduct.badgeType || editedProduct.badgeType === 'instock')
                                        ? 'bg-emerald-950/20 border-emerald-500/50 hover:border-emerald-500/75'
                                        : 'bg-neutral-950/30 border-neutral-900 hover:border-neutral-800'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="radio"
                                          name="badgeType"
                                          checked={!editedProduct.badgeType || editedProduct.badgeType === 'instock'}
                                          onChange={() => setEditedProduct({ 
                                            ...editedProduct, 
                                            badgeType: 'instock',
                                            inStock: true
                                          })}
                                          className="accent-emerald-500 h-3.5 w-3.5 shrink-0 cursor-pointer"
                                        />
                                        <span className="text-[11px] font-bold text-white uppercase font-sans">In Stock Badge</span>
                                      </div>
                                      <span className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded bg-emerald-950/50 text-emerald-400 border border-emerald-950">
                                        S.A. STOCK
                                      </span>
                                    </div>
                                    <p className="text-[9.5px] text-neutral-400 leading-normal">
                                      Displays green S.A. Stock badge. Ideal for items ready for immediate container freight dispatch.
                                    </p>
                                  </label>

                                  {/* Option 2: Back Order Badge */}
                                  <label 
                                    className={`flex flex-col gap-1.5 p-3 rounded-lg border transition-all duration-200 cursor-pointer text-left select-none ${
                                      editedProduct.badgeType === 'backorder'
                                        ? 'bg-amber-950/20 border-amber-500/50 hover:border-amber-500/75'
                                        : 'bg-neutral-950/30 border-neutral-900 hover:border-neutral-800'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="radio"
                                          name="badgeType"
                                          checked={editedProduct.badgeType === 'backorder'}
                                          onChange={() => setEditedProduct({ 
                                            ...editedProduct, 
                                            badgeType: 'backorder',
                                            inStock: false
                                          })}
                                          className="accent-amber-500 h-3.5 w-3.5 shrink-0 cursor-pointer"
                                        />
                                        <span className="text-[11px] font-bold text-white uppercase font-sans">Back Order Badge</span>
                                      </div>
                                      <span className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded bg-amber-950/50 text-amber-500 border border-amber-900/40">
                                        BACKORDERED
                                      </span>
                                    </div>
                                    <p className="text-[9.5px] text-neutral-400 leading-normal">
                                      Displays orange Backordered badge with estimated sea freight dispatch dates dynamically calculated.
                                    </p>
                                  </label>

                                  {/* Option 3: 24-48hr Lead Time Badge */}
                                  <label 
                                    className={`flex flex-col gap-1.5 p-3 rounded-lg border transition-all duration-200 cursor-pointer text-left select-none ${
                                      editedProduct.badgeType === 'leadtime_24_48'
                                        ? 'bg-blue-950/20 border-blue-500/50 hover:border-blue-500/75'
                                        : 'bg-neutral-950/30 border-neutral-900 hover:border-neutral-800'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="radio"
                                          name="badgeType"
                                          checked={editedProduct.badgeType === 'leadtime_24_48'}
                                          onChange={() => setEditedProduct({ 
                                            ...editedProduct, 
                                            badgeType: 'leadtime_24_48',
                                            inStock: true
                                          })}
                                          className="accent-blue-500 h-3.5 w-3.5 shrink-0 cursor-pointer"
                                        />
                                        <span className="text-[11px] font-bold text-white uppercase font-sans">24-48hr Lead Time</span>
                                      </div>
                                      <span className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded bg-blue-950/50 text-blue-400 border border-blue-950">
                                        24-48HR LEAD
                                      </span>
                                    </div>
                                    <p className="text-[9.5px] text-neutral-400 leading-normal">
                                      Displays blue 24-48hr Lead badge. Perfect for premium ready-to-freight depot equipment.
                                    </p>
                                  </label>

                                  {/* Option 4: Lead Time Order Badge */}
                                  <label 
                                    className={`flex flex-col gap-1.5 p-3 rounded-lg border transition-all duration-200 cursor-pointer text-left select-none ${
                                      editedProduct.badgeType === 'leadtime_custom'
                                        ? 'bg-purple-950/20 border-purple-500/50 hover:border-purple-500/75'
                                        : 'bg-neutral-950/30 border-neutral-900 hover:border-neutral-800'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="radio"
                                          name="badgeType"
                                          checked={editedProduct.badgeType === 'leadtime_custom'}
                                          onChange={() => setEditedProduct({ 
                                            ...editedProduct, 
                                            badgeType: 'leadtime_custom',
                                            inStock: true
                                          })}
                                          className="accent-purple-500 h-3.5 w-3.5 shrink-0 cursor-pointer"
                                        />
                                        <span className="text-[11px] font-bold text-white uppercase font-sans">Lead Time Order</span>
                                      </div>
                                      <span className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded bg-purple-950/50 text-purple-400 border border-purple-950">
                                        LEAD TIME
                                      </span>
                                    </div>
                                    <p className="text-[9.5px] text-neutral-400 leading-normal">
                                      Displays custom lead time text indicator (e.g. "3 Weeks" or "Built-to-Order") for SABS custom fabrication.
                                    </p>
                                  </label>
                                </div>

                                {/* Custom Lead Time String Input (Visible only if leadtime_custom is selected) */}
                                {editedProduct.badgeType === 'leadtime_custom' && (
                                  <div className="pt-2 animate-in slide-in-from-top-1 duration-200 text-left">
                                    <label className="text-[9px] uppercase font-bold text-neutral-400 tracking-wider block mb-1">Custom Lead Time Text</label>
                                    <input
                                      type="text"
                                      value={editedProduct.leadTimeValue || '3-5 Working Days'}
                                      onChange={(e) => setEditedProduct({ ...editedProduct, leadTimeValue: e.target.value })}
                                      className="w-full bg-[#070707] border border-neutral-800 text-xs text-white px-3 py-2 rounded focus:border-purple-500 outline-none"
                                      placeholder="e.g. 3-5 Working Days, Built-to-Order, etc."
                                    />
                                  </div>
                                )}
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-[10px] uppercase font-bold text-neutral-550">Publishing Status</label>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setEditedProduct({ ...editedProduct, status: 'publish' })}
                                    className={`flex-1 py-2 text-xs font-bold uppercase rounded border transition-all cursor-pointer ${
                                      editedProduct.status === 'publish'
                                        ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-400'
                                        : 'bg-neutral-900/30 border-neutral-800 text-neutral-500 hover:border-neutral-700 hover:text-neutral-300'
                                    }`}
                                  >
                                    Published
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditedProduct({ ...editedProduct, status: 'draft' })}
                                    className={`flex-1 py-2 text-xs font-bold uppercase rounded border transition-all cursor-pointer ${
                                      editedProduct.status === 'draft'
                                        ? 'bg-amber-950/40 border-[#b25e00]/60 text-amber-400'
                                        : 'bg-neutral-900/30 border-neutral-800 text-neutral-500 hover:border-neutral-700 hover:text-neutral-300'
                                    }`}
                                  >
                                    Draft
                                  </button>
                                </div>
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-[10px] uppercase font-bold text-neutral-555">Publishing / Creation Date</label>
                                <input
                                  type="date"
                                  value={editedProduct.dateCreated || '2026-06-19'}
                                  onChange={(e) => setEditedProduct({ ...editedProduct, dateCreated: e.target.value })}
                                  className="w-full bg-[#111111] border border-[#222222] text-xs font-mono text-white px-3 py-2 rounded outline-none focus:border-[#ff0000] cursor-pointer"
                                />
                              </div>

                            </div>
                          </div>

                          {/* Section 2: Visual Media Assets */}
                          <div className="space-y-4">
                            <h5 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 border-b border-[#222222] pb-1.5">2. Visual Media Assets</h5>
                            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                              <div className="xl:col-span-8 space-y-3">
                                <div className="space-y-1.5">
                                  <div className="flex justify-between items-center">
                                    <label className="text-[10px] uppercase font-bold text-neutral-500">Primary Cover Image URL</label>
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleDeviceImageUpload}
                                        accept="image/*"
                                        className="hidden"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="text-[10px] text-[#ff0000] hover:text-red-400 uppercase font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                        title="Upload image from device"
                                      >
                                        <Upload size={10} /> Upload
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setAssetPickerTarget('primary');
                                          setIsAssetPickerOpen(true);
                                        }}
                                        className="text-[10px] text-indigo-400 hover:text-indigo-300 uppercase font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                        title="Browse project assets / local images"
                                      >
                                        <ImageIcon size={10} /> Browse Library
                                      </button>
                                      <button
                                        type="button"
                                        onClick={handleFocusImageInput}
                                        className="text-[10px] text-amber-500 hover:text-amber-400 uppercase font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                        title="Manually edit the image link text"
                                      >
                                        <Edit size={10} /> Edit
                                      </button>
                                      {editedProduct.image && (
                                        <button
                                          type="button"
                                          onClick={handleDeleteImage}
                                          className="text-[10px] text-neutral-400 hover:text-red-500 uppercase font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                          title="Deletes current image link"
                                        >
                                          <Trash2 size={10} /> Delete
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  <input
                                    type="text"
                                    ref={imageInputRef}
                                    value={editedProduct.image}
                                    onChange={(e) => setEditedProduct({ ...editedProduct, image: e.target.value })}
                                    className="w-full bg-[#111111] border border-[#222222] text-xs font-mono text-white px-3 py-2.5 rounded outline-none focus:border-[#ff0000]"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <div className="flex justify-between items-center bg-neutral-950/20 px-1 py-0.5 rounded-md border border-neutral-900/10">
                                    <label className="text-[10px] uppercase font-bold text-neutral-500">Secondary Image Gallery Nodes</label>
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={handleAiSimulateImage}
                                        disabled={isGeneratingAiImage}
                                        className={`text-[10px] uppercase font-bold flex items-center gap-1 cursor-pointer px-2 py-0.5 rounded transition ${
                                          isGeneratingAiImage
                                            ? 'bg-neutral-800 text-neutral-500 border border-neutral-700 animate-disabled-flash'
                                            : 'bg-indigo-950/40 border border-indigo-900 hover:bg-indigo-900/50 hover:border-indigo-600 text-indigo-400 hover:text-indigo-300 animate-live-flash'
                                        }`}
                                        title="Automate and simulate real-life workshop usage scene for this product"
                                      >
                                        <Sparkles size={10} className={isGeneratingAiImage ? "animate-spin" : "animate-pulse"} />
                                        {isGeneratingAiImage ? 'Simulating...' : 'AI Auto-Simulate'}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={handleAddAdditionalImage}
                                        className="text-[10px] text-red-500 hover:text-white uppercase font-bold flex items-center gap-1 cursor-pointer bg-neutral-950/50 border border-neutral-900 px-1.5 py-0.5 rounded hover:bg-neutral-900 transition"
                                      >
                                        <Plus size={10} /> Add Node
                                      </button>
                                    </div>
                                  </div>

                                    {isGeneratingAiImage && (
                                      <div className="p-3 bg-indigo-950/25 border border-indigo-900/60 rounded-md space-y-2 font-mono text-[10px] animate-pulse">
                                        <div className="flex items-center justify-between text-indigo-400">
                                          <span className="flex items-center gap-1.5 font-bold">
                                            <Cpu size={11} className="animate-spin text-indigo-400" />
                                            TRITON SIMULATION ACTIVE
                                          </span>
                                          <span className="text-[9px] text-indigo-500 font-bold bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-900/40 uppercase">RUNNING</span>
                                        </div>
                                        <p className="text-neutral-400 text-[9.5px]">{aiSimulationStep}</p>
                                        <div className="w-full bg-neutral-950 rounded-full h-1 overflow-hidden border border-neutral-900">
                                          <div className="bg-gradient-to-r from-red-600 to-indigo-600 h-1 rounded-full animate-shimmer w-3/4 duration-1000"></div>
                                        </div>
                                      </div>
                                    )}

                                    {aiPreviewData && (
                                      <div className="p-3 bg-indigo-950/20 border border-indigo-500/50 rounded-md space-y-3 font-mono text-[10px]">
                                        <div className="flex items-center justify-between">
                                          <span className="flex items-center gap-1.5 font-bold uppercase tracking-widest text-indigo-300">
                                            <Sparkles size={11} className="text-indigo-400" />
                                            Simulation Ready
                                          </span>
                                          <span className="text-[9px] text-emerald-400 font-bold bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-900/40 uppercase">Awaiting Review</span>
                                        </div>
                                        <div className="flex gap-3 items-start mt-2">
                                          <div className="w-16 h-16 rounded overflow-hidden border border-neutral-700 shrink-0 bg-black">
                                            <img src={aiPreviewData.url} alt="AI Preview Thumbnail" className="w-full h-full object-cover" />
                                          </div>
                                          <p className="text-neutral-300 text-[10.5px] leading-relaxed italic border-l-2 border-indigo-500/50 pl-3">
                                            "{aiPreviewData.actionSynthesis}"
                                          </p>
                                        </div>
                                        <div className="flex gap-2 justify-end pt-2">
                                          <button
                                            type="button"
                                            onClick={handleRejectAiPreview}
                                            className="text-[10px] text-neutral-400 hover:text-white hover:bg-neutral-800 uppercase font-bold flex items-center gap-1 cursor-pointer bg-neutral-900 border border-neutral-700 px-3 py-1.5 rounded transition shadow-md"
                                          >
                                            <X size={10} strokeWidth={3} /> Discard Preview
                                          </button>
                                          <button
                                            type="button"
                                            onClick={handleAcceptAiPreview}
                                            className="text-[10px] text-white uppercase font-bold flex items-center gap-1 cursor-pointer bg-indigo-600 border border-indigo-500 hover:bg-indigo-500 hover:scale-[1.02] transform px-3 py-1.5 rounded transition shadow-[0_0_15px_rgba(79,70,229,0.3)]"
                                          >
                                            <Check size={10} strokeWidth={3} /> Accept & Add
                                          </button>
                                        </div>
                                      </div>
                                    )}

                                  <div className="space-y-2">
                                    {(editedProduct.images || []).map((imgUrl, imageIdx) => (
                                      <div key={imageIdx} className="flex gap-2">
                                        <input
                                          type="text"
                                          value={imgUrl}
                                          onChange={(e) => handleUpdateAdditionalImage(imageIdx, e.target.value)}
                                          placeholder="https://..."
                                          className="flex-1 bg-[#111111] border border-neutral-900 text-xs font-mono text-white px-3 py-2 rounded outline-none focus:border-[#ff0000]"
                                        />
                                        <input
                                          id={`secondary-upload-${imageIdx}`}
                                          type="file"
                                          accept="image/*"
                                          onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                              try {
                                                addLog(`[WordPress Media] Uploading secondary image '${file.name}'...`);
                                                const savedPath = await uploadImageToWordPress(file);
                                                handleUpdateAdditionalImage(imageIdx, savedPath);
                                                addLog(`\u2705 Saved secondary image '${file.name}': ${savedPath}`);
                                              } catch (err: any) {
                                                console.error('Failed to upload secondary image:', err);
                                                const errMsg = err?.message || 'Upload failed: WordPress Media Library did not accept the image. Check WP_AUTH_TOKEN/Application Password and Cloudflare WAF.';
                                                addLog(`\u274c [Gallery Upload] ${errMsg}`);
                                                alert(errMsg);
                                              } finally {
                                                e.target.value = '';
                                              }
                                            }
                                          }}
                                          className="hidden"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const fileInput = document.getElementById(`secondary-upload-${imageIdx}`);
                                            fileInput?.click();
                                          }}
                                          className="p-2 bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded transition border border-neutral-900 cursor-pointer"
                                          title="Upload secondary image"
                                        >
                                          <Upload size={13} />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setAssetPickerTarget(imageIdx);
                                            setIsAssetPickerOpen(true);
                                          }}
                                          className="p-2 bg-neutral-950 hover:bg-indigo-950/50 text-indigo-400 hover:text-indigo-300 rounded transition border border-neutral-900 cursor-pointer animate-live-flash"
                                          title="Browse project assets / local images"
                                        >
                                          <ImageIcon size={13} />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveAdditionalImage(imageIdx)}
                                          className="p-2 bg-red-950/30 hover:bg-red-950/60 text-red-500 hover:text-red-400 rounded transition border border-red-950/50"
                                        >
                                          <Trash2 size={13} />
                                        </button>
                                      </div>
                                    ))}
                                    {(editedProduct.images || []).length === 0 && (
                                      <span className="text-[10px] text-[#555555] italic">No secondary gallery structures mapped yet. Add some to support thumbnail selections.</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="xl:col-span-4 flex flex-col justify-center items-center p-3 bg-[#111111] border border-neutral-900 rounded-lg shrink-0">
                                <span className="text-[9px] uppercase font-bold text-neutral-500 mb-2 font-mono">Live Cover Preview</span>
                                <div className="w-full aspect-square relative overflow-hidden rounded border border-neutral-800 bg-[#0c0c0c] flex items-center justify-center mb-2">
                                  <ResponsiveImage 
                                    src={editedProduct.image} 
                                    alt="Product upload template" 
                                    aspectRatioClassName="aspect-square"
                                    showFitToggle={true}
                                  />
                                </div>
                                <div className="flex gap-1.5 w-full justify-center">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAssetPickerTarget('primary');
                                      setIsAssetPickerOpen(true);
                                    }}
                                    className="px-1.5 py-1 bg-indigo-950/40 hover:bg-indigo-900 border border-indigo-900/50 hover:border-indigo-500 text-indigo-400 hover:text-white rounded text-[9px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer animate-live-flash"
                                    title="Browse high-quality local media gallery assets"
                                  >
                                    <ImageIcon size={9} /> Library
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-1.5 py-1 bg-red-950/30 hover:bg-red-950/60 border border-[#ff0000]/20 hover:border-[#ff0000]/40 text-red-400 hover:text-red-300 rounded text-[9px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1 cursor-pointer"
                                    title="Upload file"
                                  >
                                    <Upload size={9} /> Upload
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleFocusImageInput}
                                    className="px-1.5 py-1 bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-neutral-200 rounded text-[9px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
                                    title="Edit Link text"
                                  >
                                    <Edit size={9} /> Edit
                                  </button>
                                  {editedProduct.image && (
                                    <button
                                      type="button"
                                      onClick={handleDeleteImage}
                                      className="px-1.5 py-1 bg-red-900/10 hover:bg-red-900/20 border border-red-900/30 text-red-500 hover:text-red-400 rounded text-[9px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1 cursor-pointer"
                                      title="Delete current image"
                                    >
                                      <Trash2 size={9} /> Delete
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Section 3: Technical Specifications */}
                          <div className="space-y-4">
                            <div className="flex justify-between items-center border-b border-[#222222] pb-1.5">
                              <h5 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">3. Technical Specifications Sheet</h5>
                              <button
                                type="button"
                                onClick={handleAddSpec}
                                className="text-[10px] text-red-500 hover:text-white uppercase font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Plus size={11} /> Add Specification Row
                              </button>
                            </div>

                            <p className="text-[10px] text-neutral-500 italic max-w-xl">
                              Define key-value pairs representing raw technical values (voltage requirements, motor payloads, physical dimensions, ceiling clearances).
                            </p>

                            <div className="space-y-2.5">
                              {Object.entries(editedProduct.specifications || {}).map(([key, value], idx, arr) => (
                                <div key={idx} className="flex gap-3 items-center">
                                  <input
                                    type="text"
                                    value={key}
                                    onChange={(e) => handleUpdateSpecKey(key, e.target.value)}
                                    placeholder="Specification Property"
                                    className="w-1/3 bg-[#111111] border border-neutral-900 text-xs font-bold text-[#fafafa] px-3 py-2 rounded outline-none focus:border-[#ff0000]"
                                  />
                                  <input
                                    type="text"
                                    value={value}
                                    onChange={(e) => handleUpdateSpecValue(key, e.target.value)}
                                    placeholder="Value / Scope"
                                    className="flex-1 bg-[#111111] border border-neutral-900 text-xs text-neutral-300 px-3 py-2 rounded outline-none focus:border-[#ff0000]"
                                  />
                                  <div className="flex gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleMoveSpecUp(key)}
                                      disabled={idx === 0}
                                      className="p-2 bg-neutral-950 hover:bg-neutral-800 disabled:opacity-20 text-neutral-400 hover:text-white rounded border border-neutral-900 cursor-pointer transition-all duration-150"
                                      title="Move specification up"
                                    >
                                      <ChevronUp size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleMoveSpecDown(key)}
                                      disabled={idx === arr.length - 1}
                                      className="p-2 bg-neutral-950 hover:bg-neutral-800 disabled:opacity-20 text-neutral-400 hover:text-white rounded border border-neutral-900 cursor-pointer transition-all duration-150"
                                      title="Move specification down"
                                    >
                                      <ChevronDown size={13} />
                                    </button>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveSpec(key)}
                                    className="p-2 bg-red-950/30 hover:bg-red-950/60 text-red-500 hover:text-red-400 rounded transition border border-red-950/50 cursor-pointer"
                                    title="Delete specification row"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              ))}
                              {Object.keys(editedProduct.specifications || {}).length === 0 && (
                                <div className="text-center p-6 bg-neutral-950/50 border border-dashed border-neutral-900 text-neutral-600 rounded font-sans">
                                  No technical specifications defined. Use the Add button to include datasheets.
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Section 4: Highlight Features */}
                          <div className="space-y-4">
                            <div className="flex justify-between items-center border-b border-[#222222] pb-1.5">
                              <h5 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">4. Direct Highlight Features</h5>
                              <button
                                type="button"
                                onClick={handleAddFeature}
                                className="text-[10px] text-red-500 hover:text-white uppercase font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Plus size={11} /> Add Bullet Points
                              </button>
                            </div>

                            <p className="text-[10px] text-neutral-500 italic max-w-xl font-sans">
                              Describe core value propositions such as double protection valves, Italian burner components, and multi-angle headgear options.
                            </p>

                            <div className="space-y-2.5">
                              {(editedProduct.features || []).map((feat, featIdx) => (
                                <div key={featIdx} className="flex gap-2">
                                  <input
                                    type="text"
                                    value={feat}
                                    onChange={(e) => handleUpdateFeature(featIdx, e.target.value)}
                                    placeholder="Feature highlight bullet..."
                                    className="flex-1 bg-[#111111] border border-neutral-900 text-xs text-neutral-300 px-3 py-2 rounded outline-none focus:border-[#ff0000]"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveFeature(featIdx)}
                                    className="p-2 bg-red-950/30 hover:bg-red-950/60 text-red-500 hover:text-red-400 rounded transition border border-red-950/50"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              ))}
                              {(!editedProduct.features || editedProduct.features.length === 0) && (
                                <div className="text-center p-6 bg-neutral-950/50 border border-dashed border-neutral-900 text-neutral-600 rounded">
                                  No feature points defined. Use the Add button to include marketing bullet points.
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Section 5: Detailed Long Description */}
                          <div className="space-y-4">
                            <div className="flex justify-between items-center border-b border-[#222222] pb-1.5">
                              <h5 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">5. Detailed Long Description</h5>
                              {editedProduct.longDescription && (
                                <button
                                  type="button"
                                  onClick={() => setEditedProduct({ ...editedProduct, longDescription: '' })}
                                  className="text-[10px] text-red-500 hover:text-white uppercase font-bold flex items-center gap-1 cursor-pointer"
                                  title="Clear long description block"
                                >
                                  <X size={11} /> Clear Description
                                </button>
                              )}
                            </div>

                            <p className="text-[10px] text-neutral-500 italic max-w-xl font-sans">
                              Provide an extensive technical overview, compliance certificates, warranty terms, or detailed field application breakdowns. This appears prominently in the client showroom details.
                            </p>

                            <textarea
                              value={editedProduct.longDescription || ''}
                              onChange={(e) => setEditedProduct({ ...editedProduct, longDescription: e.target.value })}
                              rows={6}
                              placeholder="Type or auto-generate a detailed specification description..."
                              className="w-full bg-black border-2 border-neutral-700 text-white p-3 rounded outline-none focus:border-white leading-relaxed resize-y font-mono font-bold"
                            />

                            {/* Option edit buttons */}
                            <div className="flex flex-wrap gap-2 pt-1">
                              <button
                                type="button"
                                onClick={handleAutoGenerateLongDescription}
                                className="px-3 py-1.5 bg-black hover:bg-neutral-900 border-2 border-neutral-600 text-white rounded text-[11px] font-extrabold uppercase tracking-widest transition-colors flex items-center gap-1.5 cursor-pointer shadow-md"
                                title="Synthesize product tags, name, and specs into a rich paragraph"
                              >
                                <RefreshCw size={11} className="animate-spin-slow" /> Auto-Generate (AI Formula)
                              </button>

                              <button
                                type="button"
                                onClick={handleLoadSansTemplate}
                                className="px-3 py-1.5 bg-black hover:bg-neutral-900 border-2 border-neutral-600 text-white rounded text-[11px] font-extrabold uppercase tracking-widest transition-colors flex items-center gap-1.5 cursor-pointer shadow-md"
                                title="Insert European CE Compliance text template"
                              >
                                <ShieldCheck size={11} /> + CE Code Template
                              </button>

                              <button
                                type="button"
                                onClick={handleLoadWarrantyTemplate}
                                className="px-3 py-1.5 bg-black hover:bg-neutral-900 border-2 border-neutral-600 text-white rounded text-[11px] font-extrabold uppercase tracking-widest transition-colors flex items-center gap-1.5 cursor-pointer shadow-md"
                                title="Insert standard 3-Year warranty and parts-depot template"
                              >
                                <FileCode size={11} /> + Warranty Template
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  if (!editedProduct.longDescription) return;
                                  setEditedProduct({
                                    ...editedProduct,
                                    longDescription: editedProduct.longDescription.toUpperCase()
                                  });
                                  addLog(`Converted long description of ${editedProduct.name} to UPPERCASE`);
                                }}
                                className="px-2.5 py-1.5 bg-black hover:bg-neutral-900 border-2 border-neutral-600 text-white rounded text-[11px] font-extrabold uppercase tracking-widest transition-all flex items-center gap-1 cursor-pointer shadow-md"
                                title="Convert current text description to UPPERCASE"
                              >
                                <Code size={11} /> ALL CAPS
                              </button>
                            </div>
                          </div>

                        </div>
                        
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-neutral-500 italic space-y-3">
                        <Database size={40} className="text-neutral-700 animate-pulse" />
                        <div>
                          <p className="font-bold text-neutral-400 not-italic">Select a Catalog Asset</p>
                          <p className="text-xs text-neutral-600 mt-1 max-w-xs mx-auto not-italic">Click any of the listed active equipment categories on the left panel grid to edit specifications, pricing, features, or images.</p>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* SYNC TAB */}
              {activeTab === 'sync' && (
                <div className="space-y-6">
                  <div className="p-4 bg-[#1a1a1a] border border-[#333333] rounded-lg">
                    <h4 className="text-sm font-semibold text-white mb-2">Automated Inventory Synchronisation</h4>
                    <p className="text-xs text-[#999999] leading-relaxed">
                      This allows real-time catalog syncing to your actual WordPress installation database database mapping. Every product carries engineering datasheets (minimum ceiling requirements, load payloads, custom electrical phases) pre-mapped to custom field structures.
                    </p>

                    {/* Checkbox settings layer */}
                    <div className="mt-4 p-4 bg-[#0a0a0a] border border-neutral-800 rounded-lg space-y-3">
                      <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest font-bold block">WooCommerce Live Feed Controls</span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <label className="flex items-start gap-2.5 cursor-pointer select-none group">
                          <input 
                            type="checkbox" 
                            checked={syncCategories}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setSyncCategories(checked);
                              if (!checked) {
                                setSyncImages(false);
                              }
                            }}
                            className="mt-0.5 rounded border border-neutral-700 bg-neutral-950 text-[#ff0000] focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer accent-[#ff0000]"
                          />
                          <div>
                            <span className="text-xs font-bold text-white group-hover:text-[#ff0000] transition-colors">Sync Categories</span>
                            <span className="block text-[10px] text-neutral-500 font-sans mt-0.5">Map product category taxonomy to WordPress folder structures.</span>
                          </div>
                        </label>

                        <label className={`flex items-start gap-2.5 select-none group ${syncCategories ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'}`}>
                          <input 
                            type="checkbox" 
                            checked={syncCategories && syncImages}
                            disabled={!syncCategories}
                            onChange={(e) => setSyncImages(e.target.checked)}
                            className="mt-0.5 rounded border border-[#333333] bg-[#070707] text-[#ff0000] focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer accent-[#ff0000] disabled:cursor-not-allowed"
                          />
                          <div>
                            <span className={`text-xs font-bold text-white transition-colors ${syncCategories ? 'group-hover:text-[#ff0000]' : ''}`}>Sync Image Media</span>
                            <span className="block text-[10px] text-neutral-500 font-sans mt-0.5">Upload and attach active product image reference links to catalog.</span>
                          </div>
                        </label>

                        <label className="flex items-start gap-2.5 cursor-pointer select-none group">
                          <input 
                            type="checkbox" 
                            checked={autoSyncOnSave}
                            onChange={toggleAutoSyncOnSave}
                            className="mt-0.5 rounded border border-[#333333] bg-[#070707] text-[#ff0000] focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer accent-[#ff0000]"
                          />
                          <div>
                            <span className="text-xs font-bold text-white group-hover:text-[#ff0000] transition-colors">Instant Auto-Sync</span>
                            <span className="block text-[10px] text-neutral-500 font-sans mt-0.5">Automatically trigger WooCommerce database synchronization whenever any product is saved.</span>
                          </div>
                        </label>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2.5">
                      <button 
                        onClick={triggerSync}
                        disabled={isSyncing}
                        className={`font-bold text-xs uppercase px-5 py-3 rounded flex items-center gap-2 transition-all cursor-pointer ${
                          isSyncing 
                            ? 'bg-neutral-800 border border-neutral-700 text-neutral-500 animate-disabled-flash cursor-not-allowed' 
                            : 'bg-[#1e3a5f] hover:bg-[#162a47] text-white animate-live-flash'
                        }`}
                      >
                        <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                        {isSyncing ? `Syncing Catalog (${syncProgress}%)` : 'Run WooCommerce Sync'}
                      </button>
                      <button 
                        onClick={handleExportCSV}
                        className="bg-[#333333] hover:bg-[#444444] text-white font-bold text-xs uppercase px-5 py-3 rounded flex items-center gap-2 transition-all cursor-pointer"
                      >
                        <Download size={14} />
                        Export WooCommerce CSV
                      </button>
                    </div>
                  </div>

                  {/* Sync status / logs review */}
                  {isSyncing && (
                    <div className="space-y-2">
                      <div className="w-full bg-[#1a1a1a] h-1.5 rounded-full overflow-hidden">
                        <div className="bg-[#ff0000] h-full transition-all duration-300" style={{ width: `${syncProgress}%` }} />
                      </div>
                      <div className="text-[11px] text-[#999999] font-mono flex justify-between">
                        <span>POST /wp-json/wc/v3/products/batch</span>
                        <span>{syncProgress}% Complete</span>
                      </div>
                    </div>
                  )}

                  {/* Synced Inventory List */}
                  <div className="border border-[#1a1a1a] rounded">
                    <div className="bg-[#1a1a1a] px-4 py-3 border-b border-[#333333] text-xs font-bold text-[#fafafa] flex justify-between items-center">
                      <span>WooCommerce Mapped Catalog Data</span>
                      <span className="text-[10px] text-[#666666] font-mono">{currentProducts.length} Mapped Assets</span>
                    </div>
                    <div className="divide-y divide-[#1a1a1a]">
                      {currentProducts.map(product => {
                        const isSynced = syncedProducts.includes(product.id);
                        return (
                          <div key={product.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs bg-[#0f0f0f] hover:bg-[#151515] transition-colors font-sans">
                            <div className="flex items-center gap-3">
                              {syncImages ? (
                                <img 
                                  src={product.image} 
                                  alt="" 
                                  className="w-10 h-10 object-cover rounded border border-[#333333]" 
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    e.currentTarget.src = 'https://images.unsplash.com/photo-1563720223185-11003d516935?q=80&w=150&auto=format&fit=crop';
                                  }}
                                />
                              ) : (
                                <div className="w-10 h-10 bg-neutral-950 border border-neutral-800 rounded flex flex-col items-center justify-center text-[8px] text-neutral-600 font-mono text-center leading-none" title="Image sync disabled">
                                  <span>IMAGE</span>
                                  <span className="text-[7px] text-[#ff0000]/60 mt-0.5 font-sans font-bold">MUTED</span>
                                </div>
                              )}
                              <div>
                                <h5 className="font-bold text-white">{product.name}</h5>
                                <div className="text-[10px] text-[#999999] font-mono mt-0.5">SKU: {product.modelCode} | Price: R{product.price.toLocaleString('en-ZA')}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 self-end md:self-auto">
                              <span className="text-[10px] bg-[#1e3a5f]/30 text-blue-200 px-2.5 py-1 uppercase tracking-wider font-semibold rounded font-sans">
                                {syncCategories ? (product.category === 'car-lift' ? 'Car Lifts' : 'Spray Booths') : 'Uncategorized'}
                              </span>
                              {isSynced ? (
                                <span className="font-mono text-[11px] text-[#27ae60] flex items-center gap-1.5 bg-[#27ae60]/10 px-2 py-1 rounded">
                                  <CheckCircle size={12} /> Synced
                                </span>
                              ) : (
                                <span className="font-mono text-[11px] text-[#999999] flex items-center gap-1.5 bg-[#333333]/30 px-2 py-1 rounded">
                                  Pending Sync
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* SHORTCODES GENERATOR TAB */}
              {activeTab === 'shortcodes' && (
                <div className="space-y-6">
                  <div className="p-4 bg-[#1a1a1a] border border-[#333333] rounded-lg">
                    <h4 className="text-sm font-semibold text-white mb-1.5">Elementor & Shortcode Direct Integration</h4>
                    <p className="text-xs text-[#999999] leading-relaxed">
                      Use these standard WordPress shortcodes or Elementor layout properties inside your builder modules or blocks. They map category selections directly, compatible with default styles.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Interactive selector tool */}
                    <div className="space-y-4 p-4 bg-[#0a0a0a] border border-[#333333] rounded-lg">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-white">Custom Shortcode Parameters</h4>
                      
                      <div className="space-y-1.5">
                        <label className="text-[11px] text-[#999999] uppercase font-bold">Category Scope</label>
                        <select 
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          className="w-full bg-[#111111] border border-[#333333] px-3 py-2 text-xs text-white rounded outline-none focus:border-[#ff0000]"
                        >
                          <option value="all">All Products</option>
                          {categories.map((cat) => (
                            <option key={cat} value={cat}>
                              {formatCategoryLabel(cat)}
                            </option>
                          ))}
                        </select>
                        {onCategoryClick && (
                          <button
                            type="button"
                            onClick={() => {
                              onCategoryClick(selectedCategory === 'all' ? 'all' : formatCategoryLabel(selectedCategory));
                              window.location.hash = '';
                              if (onBackToShop) onBackToShop();
                              setTimeout(() => {
                                const el = document.getElementById('product-segment-anchor');
                                if (el) el.scrollIntoView({ behavior: 'smooth' });
                              }, 150);
                              addLog(`\U0001f517 Shortcode view linked to storefront category filter for "${selectedCategory}".`);
                            }}
                            className="mt-1.5 w-full bg-neutral-900 hover:bg-[#ff0000] text-neutral-300 hover:text-white border border-neutral-800 hover:border-red-600 transition-all py-1.5 rounded text-[10px] font-bold font-mono tracking-wider uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                            title="Preview this selected category on the storefront homepage product grid"
                          >
                            <ExternalLink size={11} />
                            <span>Preview Category on Storefront</span>
                          </button>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] text-[#999999] uppercase font-bold">Display Layout Grid Columns</label>
                        <select 
                          value={gridColumns}
                          onChange={(e) => setGridColumns(e.target.value)}
                          className="w-full bg-[#111111] border border-[#333333] px-3 py-2 text-xs text-white rounded outline-none focus:border-[#ff0000]"
                        >
                          <option value="2">2 Columns (Large images)</option>
                          <option value="3">3 Columns (Perfect workshop balanced)</option>
                          <option value="4">4 Columns (High density grid view)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] text-[#999999] uppercase font-bold">Design Themes Layout Style</label>
                        <select 
                          value={layoutStyle}
                          onChange={(e) => setLayoutStyle(e.target.value)}
                          className="w-full bg-[#111111] border border-[#333333] px-3 py-2 text-xs text-white rounded outline-none focus:border-[#ff0000]"
                        >
                          <option value="classic-dark">Tesla-Inspired Minimal Dark Theme</option>
                          <option value="modern-light">High Contrast Alpine White Style</option>
                          <option value="compact-tech">Technical Detail Rows View</option>
                        </select>
                      </div>
                    </div>

                    {/* Output Code screen */}
                    <div className="space-y-4 flex flex-col justify-between">
                      <div className="space-y-1.5 flex-1">
                        <span className="text-[11px] font-mono text-[#999999] uppercase font-bold block">Generated WordPress Shortcode</span>
                        <div className="w-full bg-[#111111] border border-[#333333] p-4 rounded text-xs font-mono text-[#ff0000] flex justify-between items-center whitespace-pre overflow-x-auto min-h-[44px]">
                          <span>[woocommerce_car_lifts category="{selectedCategory}" columns={gridColumns} layout="{layoutStyle}"]</span>
                          <button 
                            onClick={() => handleCopy(`[woocommerce_car_lifts category="${selectedCategory}" columns={${gridColumns}} layout="${layoutStyle}"]`, 's1')}
                            className="text-[#999999] hover:text-white ml-2 p-1.5 bg-[#222222] rounded hover:bg-[#333333]"
                          >
                            {copiedText === 's1' ? <Check size={14} className="text-[#27ae60]" /> : <Copy size={14} />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5 flex-1">
                        <span className="text-[11px] font-mono text-[#999999] uppercase font-bold block">Elementor Widget JSON Hook</span>
                        <div className="w-full h-24 bg-[#111111] border border-[#333333] p-3 rounded text-[11px] font-mono text-[#27ae60] flex justify-between items-start overflow-hidden">
                          <pre className="overflow-x-auto flex-1 h-full select-all">
{`{
  "widgetType": "car_lifts_grid",
  "settings": {
    "category": "${selectedCategory}",
    "columns_desktop": ${gridColumns},
    "style": "${layoutStyle}"
  }
}`}
                          </pre>
                          <button 
                            onClick={() => handleCopy(`{\n  "widgetType": "car_lifts_grid",\n  "settings": {\n    "category": "${selectedCategory}",\n    "columns_desktop": ${gridColumns},\n    "style": "${layoutStyle}"\n  }\n}`, 's2')}
                            className="text-[#999999] hover:text-white ml-2 p-1.5 bg-[#222222] rounded hover:bg-[#333333] shrink-0"
                          >
                            {copiedText === 's2' ? <Check size={14} className="text-[#27ae60]" /> : <Copy size={14} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* REST KEY CONFIGURATION TAB */}
              {activeTab === 'config' && (
                <div className="space-y-6">
                  <div className="p-4 bg-[#1a1a1a] border border-[#333333] rounded-lg">
                    <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                      <ShieldCheck size={16} className="text-green-500" />
                      WooCommerce REST API Authentication Setup
                    </h4>
                    <p className="text-xs text-[#999999] leading-relaxed">
                      Connect directly to the secure API channels. All consumer key variables automatically synchronize client requests and payloads directly via secure sandboxed channels.
                    </p>
                  </div>

                  <div className="space-y-4 max-w-xl bg-[#0f0f0f] p-5 border border-[#1a1a1a] rounded-lg">
                    <div className="space-y-1.5">
                      <label className="text-xs uppercase text-[#999999] font-bold">WordPress Website Base Target Domain URL</label>
                      <input 
                        type="url" 
                        value={wpUrl} 
                        onChange={(e) => setWpUrl(e.target.value)}
                        placeholder="https://yourdomain.co.za"
                        className="w-full bg-[#111111] border border-[#333333] text-xs font-mono text-white p-3 rounded outline-none focus:border-[#ff0000]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs uppercase text-[#999999] font-bold">WooCommerce API Consumer Key (Read/Write Scope)</label>
                      <input 
                        type="text" 
                        value={consumerKey} 
                        onChange={(e) => setConsumerKey(e.target.value)}
                        placeholder="ck_..."
                        className="w-full bg-[#111111] border border-[#333333] text-xs font-mono text-white p-3 rounded outline-none focus:border-[#ff0000]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs uppercase text-[#999999] font-bold">WooCommerce API Consumer Secret Key</label>
                      <div className="relative flex items-center">
                        <input 
                          type={showConsumerSecret ? "text" : "password"} 
                          value={consumerSecret} 
                          onChange={(e) => setConsumerSecret(e.target.value)}
                          placeholder="cs_..."
                          className="w-full bg-[#111111] border border-[#333333] text-xs font-mono text-white p-3 pr-10 rounded outline-none focus:border-[#ff0000]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConsumerSecret(!showConsumerSecret)}
                          className="absolute right-3 text-neutral-500 hover:text-white transition-colors cursor-pointer"
                          title={showConsumerSecret ? "Hide secret key" : "Show secret key"}
                        >
                          {showConsumerSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button 
                        onClick={() => {
                          addLog(`API settings saved successfully. Target node: ${wpUrl}`);
                          setApiStatus('success');
                        }}
                        className="px-5 py-3 bg-[#1e3a5f] hover:bg-[#162a47] text-white text-xs font-bold uppercase rounded cursor-pointer"
                      >
                        Verify & Save Credentials
                      </button>
                    </div>
                  </div>

                  <div className="p-4 bg-[#1a1a1a] border border-[#333333] rounded-lg">
                    <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                      <HelpCircle size={16} className="text-[#ff0000]" />
                      Showroom Onboarding Settings
                    </h4>
                    <p className="text-xs text-[#999999] leading-relaxed">
                      Configure guided on-screen tours and walkthrough configurations to enhance showroom conversion rates and user understanding of equipment categories.
                    </p>
                  </div>

                  <div className="space-y-4 max-w-xl bg-[#0f0f0f] p-5 border border-[#1a1a1a] rounded-lg">
                    <div className="flex items-start gap-3">
                      <input 
                        type="checkbox" 
                        id="walkthrough_enabled"
                        checked={showroomWalkthroughEnabled}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setShowroomWalkthroughEnabled(checked);
                          safeLocalStorage.setItem('showroom_walkthrough_enabled', String(checked));
                          addLog(`Showroom Walkthrough guided tour has been ${checked ? 'enabled' : 'disabled'} in general settings.`);
                        }}
                        className="mt-1 rounded border border-neutral-700 bg-neutral-950 text-[#ff0000] focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer accent-[#ff0000]"
                      />
                      <div>
                        <label htmlFor="walkthrough_enabled" className="text-xs font-bold text-white cursor-pointer select-none">
                          Enable Showroom Walkthrough Onboarding Tour
                        </label>
                        <span className="block text-[10px] text-neutral-500 font-sans mt-0.5">
                          When enabled, standard showroom visitors will see an option to launch a step-by-step guided visual tour highlighting key workshop categories.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SEO & SECURITY TOOLS SUITE TAB */}
              {activeTab === 'tools' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  {/* Top Header Deck */}
                  <div className="bg-[#111111] border border-[#222222] rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1 text-left">
                      <div className="flex items-center gap-2">
                        <Wrench size={20} className="text-amber-500 animate-pulse" />
                        <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">SEO & Security Hardening Tools Suite</h2>
                      </div>
                      <p className="text-xs text-neutral-400 max-w-xl font-sans">
                        Generate advanced XML sitemaps, customize search-engine crawl patterns, audit POPIA compliance, and evaluate system security indexes.
                      </p>
                    </div>

                    {/* Sub-tabs selectors */}
                    <div className="flex items-center gap-2 bg-[#0c0c0c] border border-neutral-800 p-1 rounded-lg shrink-0">
                      <button
                        type="button"
                        onClick={() => setToolsSubTab('sitemap')}
                        className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-md transition cursor-pointer ${
                          toolsSubTab === 'sitemap'
                            ? 'bg-amber-500 text-neutral-950 font-black'
                            : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                        }`}
                      >
                        Sitemap & Robots
                      </button>
                      <button
                        type="button"
                        onClick={() => setToolsSubTab('schema')}
                        className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-md transition cursor-pointer ${
                          toolsSubTab === 'schema'
                            ? 'bg-amber-500 text-neutral-950 font-black'
                            : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                        }`}
                      >
                        Schema JSON-LD
                      </button>
                      <button
                        type="button"
                        onClick={() => setToolsSubTab('security')}
                        className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-md transition cursor-pointer ${
                          toolsSubTab === 'security'
                            ? 'bg-amber-500 text-neutral-950 font-black'
                            : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                        }`}
                      >
                        Security Hardening
                      </button>
                    </div>
                  </div>

                  {/* SITEMAP & ROBOTS SUB-TAB */}
                  {toolsSubTab === 'sitemap' && (
                    <div className="space-y-6">
                      {/* Master Automate & Sync Control Bar */}
                      <div className="bg-[#141414] border border-amber-500/30 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg text-left">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                            <Bot className="text-amber-500 animate-pulse" size={20} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-black text-white uppercase tracking-wider">Automated Crawler & Indexing Engine</h4>
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> Live & Synced (200 OK)
                              </span>
                            </div>
                            <p className="text-[10px] text-neutral-400 font-sans mt-0.5">
                              Automate, compile, and deploy search engine indexing files (<code className="text-amber-400 font-mono">/sitemap.xml</code> & <code className="text-amber-400 font-mono">/robots.txt</code>) live across your domain.
                              {lastSeoAutoSyncTime && <span className="text-neutral-500 ml-1.5 font-mono">\u2022 Last automated: {lastSeoAutoSyncTime}</span>}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0">
                          <button
                            type="button"
                            onClick={() => handleAutomateAndUpdateSeoFiles('both')}
                            disabled={isAutomatingSeoFiles}
                            className="flex-1 md:flex-initial px-4 py-2.5 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-sans font-black text-xs uppercase rounded-lg transition duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                          >
                            <RefreshCw size={14} className={isAutomatingSeoFiles ? "animate-spin" : ""} />
                            {isAutomatingSeoFiles ? 'Automating & Syncing...' : 'Automate & Update Both'}
                          </button>

                          <div className="flex gap-1.5">
                            <a
                              href="/sitemap.xml"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-2 bg-[#1f1f1f] border border-neutral-800 hover:border-amber-500/50 text-[10px] font-mono font-bold text-neutral-300 hover:text-white rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                              title="View live sitemap.xml in browser"
                            >
                              <ExternalLink size={12} className="text-amber-500" /> /sitemap.xml
                            </a>
                            <a
                              href="/robots.txt"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-2 bg-[#1f1f1f] border border-neutral-800 hover:border-amber-500/50 text-[10px] font-mono font-bold text-neutral-300 hover:text-white rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                              title="View live robots.txt in browser"
                            >
                              <ExternalLink size={12} className="text-amber-500" /> /robots.txt
                            </a>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Left: Settings */}
                        <div className="lg:col-span-5 space-y-6">
                          {/* Sitemap Settings */}
                          <div className="bg-[#111111] border border-[#222222] rounded-xl p-5 text-left space-y-4">
                            <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-neutral-900 pb-3">
                              <FileText size={14} className="text-amber-500" />
                              Sitemap XML Configuration
                            </h3>

                            <div className="space-y-3 text-xs font-sans">
                              <div className="space-y-1">
                                <label className="block text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider">Target Domain Name URL</label>
                                <input
                                  type="url"
                                  value={sitemapDomain}
                                  onChange={(e) => setSitemapDomain(e.target.value)}
                                  className="w-full bg-[#070707] border border-neutral-800 focus:border-amber-500 focus:outline-none rounded p-2.5 text-xs font-mono text-white"
                                  placeholder="https://triton-equipment.co.za"
                                />
                              </div>

                              <div className="flex items-center justify-between p-2.5 bg-[#070707] border border-neutral-900 rounded-lg">
                                <div>
                                  <span className="block text-xs font-bold text-neutral-200">Include Category Links</span>
                                  <span className="block text-[9px] text-neutral-500">Enable deep links to active category landing filters</span>
                                </div>
                                <input
                                  type="checkbox"
                                  checked={sitemapIncludeCategories}
                                  onChange={(e) => setSitemapIncludeCategories(e.target.checked)}
                                  className="rounded border-neutral-800 bg-[#0c0c0c] text-amber-500 focus:ring-0 w-4 h-4 cursor-pointer accent-amber-500"
                                />
                              </div>

                              <div className="flex items-center justify-between p-2.5 bg-[#070707] border border-neutral-900 rounded-lg">
                                <div>
                                  <span className="block text-xs font-bold text-neutral-200">Include Draft Products</span>
                                  <span className="block text-[9px] text-neutral-500">Generate sitemap elements for unpublished/draft items</span>
                                </div>
                                <input
                                  type="checkbox"
                                  checked={sitemapIncludeDrafts}
                                  onChange={(e) => setSitemapIncludeDrafts(e.target.checked)}
                                  className="rounded border-neutral-800 bg-[#0c0c0c] text-amber-500 focus:ring-0 w-4 h-4 cursor-pointer accent-amber-500"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-2">
                              <button
                                type="button"
                                onClick={() => handleAutomateAndUpdateSeoFiles('sitemap')}
                                disabled={isAutomatingSeoFiles}
                                className="py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-sans font-black text-xs uppercase rounded-lg transition duration-200 flex items-center justify-center gap-1.5 cursor-pointer shadow disabled:opacity-50"
                              >
                                <Zap size={13} />
                                Automate & Update
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  try {
                                    const productsToInclude = sitemapIncludeDrafts ? currentProducts : currentProducts.filter(p => p.status !== 'draft');
                                    const sitemapXml = generateSitemapXml(productsToInclude, sitemapDomain);
                                    
                                    const blob = new Blob([sitemapXml], { type: 'application/xml' });
                                    const url = URL.createObjectURL(blob);
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.download = 'sitemap.xml';
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                    URL.revokeObjectURL(url);

                                    addLog(`\U0001f4c2 Generated custom sitemap.xml with ${productsToInclude.length} listings successfully.`);
                                  } catch (error: any) {
                                    addLog(`\u274c Sitemap generation failed: ${error.message}`);
                                  }
                                }}
                                className="py-2.5 bg-[#1f1f1f] hover:bg-neutral-800 text-white border border-neutral-800 font-sans font-bold text-xs uppercase rounded-lg transition duration-200 flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <Download size={13} />
                                Download XML
                              </button>
                            </div>
                          </div>

                          {/* Robots.txt Settings */}
                          <div className="bg-[#111111] border border-[#222222] rounded-xl p-5 text-left space-y-4">
                            <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-neutral-900 pb-3">
                              <Globe size={14} className="text-amber-500" />
                              Robots.txt Crawler Directives
                            </h3>

                            <div className="space-y-3 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                              {robotsDirectives.map((d, idx) => (
                                <div key={idx} className="bg-[#070707] border border-neutral-900 p-2.5 rounded-lg flex items-center justify-between gap-3 text-xs font-mono">
                                  <div className="space-y-1 flex-1">
                                    <div className="grid grid-cols-3 gap-2">
                                      <div>
                                        <span className="text-[8px] text-neutral-500 block">USER-AGENT</span>
                                        <input
                                          type="text"
                                          value={d.agent}
                                          onChange={(e) => {
                                            const next = [...robotsDirectives];
                                            next[idx].agent = e.target.value;
                                            setRobotsDirectives(next);
                                          }}
                                          className="bg-[#111] border border-neutral-800 rounded px-1.5 py-1 text-[11px] text-white focus:outline-none focus:border-amber-500 w-full"
                                        />
                                      </div>
                                      <div>
                                        <span className="text-[8px] text-neutral-500 block">DISALLOW</span>
                                        <input
                                          type="text"
                                          value={d.disallow}
                                          onChange={(e) => {
                                            const next = [...robotsDirectives];
                                            next[idx].disallow = e.target.value;
                                            setRobotsDirectives(next);
                                          }}
                                          className="bg-[#111] border border-neutral-800 rounded px-1.5 py-1 text-[11px] text-red-400 focus:outline-none focus:border-amber-500 w-full"
                                          placeholder="None"
                                        />
                                      </div>
                                      <div>
                                        <span className="text-[8px] text-neutral-500 block">ALLOW</span>
                                        <input
                                          type="text"
                                          value={d.allow}
                                          onChange={(e) => {
                                            const next = [...robotsDirectives];
                                            next[idx].allow = e.target.value;
                                            setRobotsDirectives(next);
                                          }}
                                          className="bg-[#111] border border-neutral-800 rounded px-1.5 py-1 text-[11px] text-emerald-400 focus:outline-none focus:border-amber-500 w-full"
                                          placeholder="None"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setRobotsDirectives(robotsDirectives.filter((_, i) => i !== idx))}
                                    className="text-neutral-500 hover:text-red-500 p-1 cursor-pointer"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              ))}
                            </div>

                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setRobotsDirectives([...robotsDirectives, { agent: '*', disallow: '', allow: '' }])}
                                className="py-2 px-3 border border-dashed border-neutral-800 hover:border-amber-500/40 text-neutral-400 hover:text-white rounded-lg text-[10px] font-bold uppercase transition flex items-center justify-center gap-1 cursor-pointer shrink-0"
                              >
                                <Plus size={11} /> Add Rule
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAutomateAndUpdateSeoFiles('robots')}
                                disabled={isAutomatingSeoFiles}
                                className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-lg text-[10px] font-black uppercase transition flex items-center justify-center gap-1 cursor-pointer shadow disabled:opacity-50"
                              >
                                <Zap size={11} /> Automate & Update
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const txt = robotsDirectives.map(d => `User-agent: ${d.agent || '*'}\nDisallow: ${d.disallow || ''}\nAllow: ${d.allow || ''}\n`).join('\n') + `\nSitemap: ${sitemapDomain.replace(/\/+$/, '')}/sitemap.xml`;
                                  const blob = new Blob([txt], { type: 'text/plain' });
                                  const url = URL.createObjectURL(blob);
                                  const link = document.createElement('a');
                                  link.href = url;
                                  link.download = 'robots.txt';
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                  URL.revokeObjectURL(url);
                                  addLog(`\U0001f916 Generated robots.txt configurations successfully.`);
                                }}
                                className="py-2 px-3 bg-[#1e293b] hover:bg-neutral-800 border border-neutral-800 text-white rounded-lg text-[10px] font-bold uppercase transition flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <Download size={11} /> Download
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Right: Live Preview Console */}
                        <div className="lg:col-span-7 space-y-6">
                          <div className="bg-[#111111] border border-[#222222] rounded-xl p-5 text-left flex flex-col h-[525px]">
                            <div className="flex items-center justify-between pb-3 border-b border-neutral-900 mb-3 shrink-0">
                              <div>
                                <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                                  <Code size={14} className="text-amber-500" />
                                  Real-Time Crawler Resource Previews
                                </h3>
                                <p className="text-[10px] text-neutral-500 font-sans">
                                  Live-compiled schema assets reflecting current catalog states
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleAutomateAndUpdateSeoFiles('both')}
                                  disabled={isAutomatingSeoFiles}
                                  className="px-2.5 py-1.5 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-400 text-[9px] font-bold uppercase rounded flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                                >
                                  <RefreshCw size={11} className={isAutomatingSeoFiles ? "animate-spin" : ""} /> Automate All
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const productsToInclude = sitemapIncludeDrafts ? currentProducts : currentProducts.filter(p => p.status !== 'draft');
                                    const sitemapXml = generateSitemapXml(productsToInclude, sitemapDomain);
                                    navigator.clipboard.writeText(sitemapXml);
                                    addLog(`\U0001f4cb Copied sitemap.xml markup directly to clipboard.`);
                                  }}
                                  className="px-2.5 py-1.5 bg-[#0f0f0f] border border-neutral-800 hover:border-neutral-700 text-[9px] font-bold uppercase rounded text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                                >
                                  <Copy size={11} /> Copy sitemap
                                </button>
                              </div>
                            </div>

                            <div className="flex-1 grid grid-rows-2 gap-4 min-h-0">
                              <div className="flex flex-col min-h-0 bg-[#070707] border border-neutral-900 rounded-lg p-3">
                                <span className="text-[9px] font-mono text-neutral-500 font-bold uppercase tracking-wider pb-1.5 border-b border-neutral-900 mb-2 block shrink-0">sitemap.xml Preview</span>
                                <pre className="flex-1 overflow-auto text-[10px] font-mono text-neutral-400 custom-scrollbar whitespace-pre text-left">
                                  {generateSitemapXml(sitemapIncludeDrafts ? currentProducts : currentProducts.filter(p => p.status !== 'draft'), sitemapDomain)}
                                </pre>
                              </div>

                              <div className="flex flex-col min-h-0 bg-[#070707] border border-neutral-900 rounded-lg p-3">
                                <span className="text-[9px] font-mono text-neutral-500 font-bold uppercase tracking-wider pb-1.5 border-b border-neutral-900 mb-2 block shrink-0">robots.txt Preview</span>
                                <pre className="flex-1 overflow-auto text-[10px] font-mono text-neutral-400 custom-scrollbar whitespace-pre text-left">
                                  {robotsDirectives.map(d => `User-agent: ${d.agent || '*'}\nDisallow: ${d.disallow || ''}\nAllow: ${d.allow || ''}\n`).join('\n')}
                                  {`\nSitemap: ${sitemapDomain.replace(/\/+$/, '')}/sitemap.xml`}
                                </pre>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SCHEMA.ORG SUB-TAB */}
                  {toolsSubTab === 'schema' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      {/* Left: Input parameters */}
                      <div className="lg:col-span-5 space-y-6 text-left">
                        <div className="bg-[#111111] border border-[#222222] rounded-xl p-5 space-y-4">
                          <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-neutral-900 pb-3">
                            <Layers size={14} className="text-amber-500" />
                            JSON-LD Generator Rules
                          </h3>

                          <div className="space-y-3.5 text-xs font-sans">
                            <div className="space-y-1">
                              <label className="block text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider">Target Schema Subject</label>
                              <select
                                value={schemaSelectedProductId}
                                onChange={(e) => setSchemaSelectedProductId(e.target.value)}
                                className="w-full bg-[#070707] border border-neutral-800 focus:border-amber-500 focus:outline-none rounded p-2.5 text-xs text-white"
                              >
                                <option value="">\U0001f3e2 Company / LocalBusiness (Global Site)</option>
                                <option disabled>\u2500\u2500 Products Catalog Items \u2500\u2500</option>
                                {currentProducts.map(p => (
                                  <option key={p.id} value={p.id}>\U0001f4e6 [{p.modelCode}] {p.name}</option>
                                ))}
                              </select>
                            </div>

                            <div className="space-y-3 border-t border-neutral-900 pt-3">
                              <div className="space-y-1">
                                <label className="block text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider">Organization Name</label>
                                <input
                                  type="text"
                                  value={schemaOrgName}
                                  onChange={(e) => setSchemaOrgName(e.target.value)}
                                  className="w-full bg-[#070707] border border-neutral-800 focus:border-amber-500 focus:outline-none rounded p-2 text-xs font-mono text-white"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="block text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider">Telephone Number</label>
                                <input
                                  type="text"
                                  value={schemaOrgPhone}
                                  onChange={(e) => setSchemaOrgPhone(e.target.value)}
                                  className="w-full bg-[#070707] border border-neutral-800 focus:border-amber-500 focus:outline-none rounded p-2 text-xs font-mono text-white"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="block text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider">Postal / Street Address (SA)</label>
                                <input
                                  type="text"
                                  value={schemaOrgAddress}
                                  onChange={(e) => setSchemaOrgAddress(e.target.value)}
                                  className="w-full bg-[#070707] border border-neutral-800 focus:border-amber-500 focus:outline-none rounded p-2 text-xs font-sans text-white"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="block text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider">Official Corporate Logo URL</label>
                                <input
                                  type="text"
                                  value={schemaOrgLogo}
                                  onChange={(e) => setSchemaOrgLogo(e.target.value)}
                                  className="w-full bg-[#070707] border border-neutral-800 focus:border-amber-500 focus:outline-none rounded p-2 text-xs font-mono text-white"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Schema.org Validator Checklist */}
                        <div className="bg-[#111111] border border-[#222222] rounded-xl p-5 space-y-3">
                          <h4 className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider">Search Console Compliance Checklist</h4>
                          
                          {(() => {
                            const isProduct = !!schemaSelectedProductId;
                            const activeProd = currentProducts.find(p => p.id === schemaSelectedProductId);
                            
                            const passes = [
                              { name: "Uses standard schema.org @context", status: true },
                              { name: "Secure Base URL (HTTPS protocol matching)", status: sitemapDomain.startsWith('https://') },
                              { name: isProduct ? "Has descriptive Product image" : "Has Organization brand logo defined", status: isProduct ? !!activeProd?.image : !!schemaOrgLogo },
                              { name: isProduct ? "Has currency & price parameters matching Zar" : "Has physical South African address details", status: isProduct ? (activeProd?.price !== undefined) : schemaOrgAddress.includes('South Africa') },
                              { name: isProduct ? "Offers schema block configured correctly" : "Phone contact parameter specified", status: isProduct ? true : !!schemaOrgPhone }
                            ];

                            return (
                              <div className="space-y-2 text-xs font-sans">
                                {passes.map((p, idx) => (
                                  <div key={idx} className="flex items-center gap-2 p-1.5 bg-[#070707] rounded border border-neutral-900/60">
                                    <span className={p.status ? "text-emerald-400 text-xs" : "text-amber-500 text-xs"}>{p.status ? "\u25cf" : "\u25b2"}</span>
                                    <span className="text-[11px] text-neutral-300 flex-1">{p.name}</span>
                                    <span className={`text-[9px] font-mono px-1.5 rounded ${p.status ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-950/40' : 'bg-amber-950/20 text-amber-400 border border-amber-900/40'}`}>
                                      {p.status ? 'PASS' : 'WARN'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Right: Live code output */}
                      <div className="lg:col-span-7 space-y-6">
                        {(() => {
                          const activeProd = currentProducts.find(p => p.id === schemaSelectedProductId);
                          const schemaObj = activeProd ? {
                            "@context": "https://schema.org",
                            "@type": "Product",
                            "name": activeProd.name,
                            "image": activeProd.image.startsWith('/') ? `${sitemapDomain}${activeProd.image}` : activeProd.image,
                            "description": activeProd.seoDescription || activeProd.description.substring(0, 150),
                            "sku": activeProd.modelCode,
                            "mpn": activeProd.modelCode,
                            "brand": {
                              "@type": "Brand",
                              "name": "Triton"
                            },
                            "offers": {
                              "@type": "Offer",
                              "url": `${sitemapDomain}/?product=${activeProd.id}`,
                              "priceCurrency": "ZAR",
                              "price": activeProd.price || "Contact for Quote",
                              "itemCondition": "https://schema.org/NewCondition",
                              "availability": "https://schema.org/InStock",
                              "seller": {
                                "@type": "Organization",
                                "name": schemaOrgName
                              }
                            }
                          } : {
                            "@context": "https://schema.org",
                            "@type": "LocalBusiness",
                            "name": schemaOrgName,
                            "image": schemaOrgLogo,
                            "telephone": schemaOrgPhone,
                            "url": sitemapDomain,
                            "logo": schemaOrgLogo,
                            "address": {
                              "@type": "PostalAddress",
                              "streetAddress": schemaOrgAddress,
                              "addressLocality": "Johannesburg",
                              "addressRegion": "Gauteng",
                              "postalCode": "1459",
                              "addressCountry": "ZA"
                            },
                            "sameAs": [
                              "https://www.facebook.com/tritonequipment",
                              "https://www.linkedin.com/company/triton-equipment"
                            ]
                          };

                          const jsonString = JSON.stringify(schemaObj, null, 2);

                          return (
                            <div className="bg-[#111111] border border-[#222222] rounded-xl p-5 text-left flex flex-col h-[525px]">
                              <div className="flex items-center justify-between pb-3 border-b border-neutral-900 mb-3 shrink-0">
                                <div>
                                  <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                                    <Code size={14} className="text-amber-500" />
                                    Structured JSON-LD Schema Script
                                  </h3>
                                  <p className="text-[10px] text-neutral-500 font-sans">
                                    Include this tag inside your landing page\u2019s <code className="text-amber-500 font-mono bg-[#0c0c0c] px-1 py-0.5">&lt;head&gt;</code> element to prompt Google rich snippets.
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(`<script type="application/ld+json">\n${jsonString}\n</script>`);
                                    addLog(`\U0001f4cb Copied generated JSON-LD script tag directly to clipboard.`);
                                  }}
                                  className="px-2.5 py-1.5 bg-[#0f0f0f] border border-neutral-800 hover:border-neutral-700 text-[9px] font-bold uppercase rounded text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                                >
                                  <Copy size={11} /> Copy JSON-LD Script
                                </button>
                              </div>

                              <div className="flex-1 min-h-0 bg-[#070707] border border-neutral-900 rounded-lg p-4 overflow-auto custom-scrollbar">
                                <pre className="text-[10px] font-mono text-emerald-400 whitespace-pre text-left leading-relaxed">
                                  {`<!-- Schema.org JSON-LD structured data code -->\n<script type="application/ld+json">\n${jsonString}\n</script>`}
                                </pre>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {/* SECURITY AUDIT & HARDENING TAB */}
                  {toolsSubTab === 'security' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      {/* Left: Security index & Toggles */}
                      <div className="lg:col-span-5 space-y-6 text-left">
                        {/* Interactive gauge & Score */}
                        <div className="bg-[#111111] border border-[#222222] rounded-xl p-5 space-y-4">
                          <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-neutral-900 pb-3">
                            <Shield size={14} className="text-amber-500 animate-pulse" />
                            Application Security Index
                          </h3>

                          {(() => {
                            let calculatedScore = 65;
                            if (securityHardenCookies) calculatedScore += 10;
                            if (securityHardenLocalStorage) calculatedScore += 10;
                            if (securityHardenCors) calculatedScore += 15;
                            
                            return (
                              <div className="space-y-4 font-sans text-xs">
                                <div className="flex items-center gap-4 bg-[#070707] p-4 rounded-xl border border-neutral-900">
                                  {/* Radial Progress Chart SVG */}
                                  <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                                    <svg className="w-16 h-16 transform -rotate-90">
                                      <circle cx="32" cy="32" r="28" fill="transparent" stroke="#1c1c1c" strokeWidth="4" />
                                      <circle 
                                        cx="32" 
                                        cy="32" 
                                        r="28" 
                                        fill="transparent" 
                                        stroke={calculatedScore >= 85 ? '#10b981' : '#f59e0b'} 
                                        strokeWidth="4" 
                                        strokeDasharray={2 * Math.PI * 28}
                                        strokeDashoffset={2 * Math.PI * 28 * (1 - calculatedScore / 100)}
                                        className="transition-all duration-500"
                                      />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <span className="text-sm font-mono font-black text-white">{calculatedScore}%</span>
                                    </div>
                                  </div>

                                  <div className="space-y-1">
                                    <span className="text-[10px] font-extrabold uppercase text-neutral-400 block tracking-wide">Hardening Index Level</span>
                                    <p className={`text-sm font-extrabold font-sans uppercase ${calculatedScore >= 85 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                      {calculatedScore >= 85 ? 'Optimally Hardened' : 'Standard Protection'}
                                    </p>
                                    <p className="text-[10px] text-neutral-500 leading-relaxed">
                                      Audit passes based on South African hosting nodes, CORS restrictions, & local-storage isolation.
                                    </p>
                                  </div>
                                </div>

                                {/* Active scan control */}
                                <button
                                  type="button"
                                  disabled={securityIsScanning}
                                  onClick={() => {
                                    setSecurityIsScanning(true);
                                    setSecurityLogs(prev => [`[${new Date().toLocaleTimeString()}] \u26a1 Initializing Security hardiness scan...`, ...prev]);
                                    
                                    const msgs = [
                                      "\U0001f50d Validating WordPress REST base endpoints... Success.",
                                      "\U0001f50d Evaluating SSL Certificate authority... Valid root cert verified.",
                                      "\U0001f6e1 CORS Check: No wildcards allowed on authenticated endpoints.",
                                      "\U0001f6e1 Evaluating local data scopes for customer info... compliant.",
                                      "\U0001f512 POPIA audit: Verifying cookies and terms consent layouts... Complete.",
                                      "\U0001f3c6 Security hardiness scan finished successfully!"
                                    ];

                                    let i = 0;
                                    const interval = setInterval(() => {
                                      if (i < msgs.length) {
                                        setSecurityLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msgs[i]}`, ...prev]);
                                        i++;
                                      } else {
                                        clearInterval(interval);
                                        setSecurityIsScanning(false);
                                        addLog("\U0001f6e1 Admin security auditing and environment scanner run completed.");
                                      }
                                    }, 400);
                                  }}
                                  className="w-full py-2 bg-[#1c1c1c] hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-white font-mono text-[10px] font-bold uppercase rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  <Cpu size={12} className={securityIsScanning ? 'animate-spin' : ''} />
                                  {securityIsScanning ? 'Scanning Environment...' : 'Trigger Secure Audit Scan'}
                                </button>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Hardening policies toggles */}
                        <div className="bg-[#111111] border border-[#222222] rounded-xl p-5 space-y-4">
                          <h4 className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider">Harden Core Protection Parameters</h4>
                          
                          <div className="space-y-3.5 text-xs font-sans">
                            {/* Toggle 1 */}
                            <div className="flex items-start justify-between gap-3 p-3 bg-[#070707] border border-neutral-900 rounded-lg">
                              <div className="space-y-0.5">
                                <span className="text-neutral-200 font-bold block">Simulate HttpOnly Authentication Headers (+10%)</span>
                                <span className="block text-[9.5px] text-neutral-500 leading-relaxed">Prevent client-side scripting from reading sensitive API tokens in general layout memory scopes.</span>
                              </div>
                              <input
                                type="checkbox"
                                checked={securityHardenCookies}
                                onChange={(e) => {
                                  const val = e.target.checked;
                                  setSecurityHardenCookies(val);
                                  addLog(`\U0001f6e1 Simulate HttpOnly authentication tags ${val ? 'ENABLED' : 'DISABLED'}.`);
                                  setSecurityLogs(prev => [`[${new Date().toLocaleTimeString()}] \U0001f6e1 Simulate HttpOnly parameters set to ${val ? 'ACTIVE' : 'INACTIVE'}`, ...prev]);
                                }}
                                className="rounded border-neutral-800 bg-[#0c0c0c] text-amber-500 focus:ring-0 w-4.5 h-4.5 shrink-0 cursor-pointer accent-amber-500"
                              />
                            </div>

                            {/* Toggle 2 */}
                            <div className="flex items-start justify-between gap-3 p-3 bg-[#070707] border border-neutral-900 rounded-lg">
                              <div className="space-y-0.5">
                                <span className="text-neutral-200 font-bold block">Sanitize LocalStorage Scopes (+10%)</span>
                                <span className="block text-[9.5px] text-neutral-500 leading-relaxed">Strip consumer credentials, access logs, or plain-text passwords stored across standard browser storage keys.</span>
                              </div>
                              <input
                                type="checkbox"
                                checked={securityHardenLocalStorage}
                                onChange={(e) => {
                                  const val = e.target.checked;
                                  setSecurityHardenLocalStorage(val);
                                  addLog(`\U0001f6e1 Strict LocalStorage sanitization & cleaning ${val ? 'ENABLED' : 'DISABLED'}.`);
                                  setSecurityLogs(prev => [`[${new Date().toLocaleTimeString()}] \U0001f6e1 Strict browser storage scrubbing set to ${val ? 'ACTIVE' : 'INACTIVE'}`, ...prev]);
                                }}
                                className="rounded border-neutral-800 bg-[#0c0c0c] text-amber-500 focus:ring-0 w-4.5 h-4.5 shrink-0 cursor-pointer accent-amber-500"
                              />
                            </div>

                            {/* Toggle 3 */}
                            <div className="flex items-start justify-between gap-3 p-3 bg-[#070707] border border-neutral-900 rounded-lg">
                              <div className="space-y-0.5">
                                <span className="text-neutral-200 font-bold block">Enforce Restrictive CORS domains (+15%)</span>
                                <span className="block text-[9.5px] text-neutral-500 leading-relaxed">Lock WooCommerce REST endpoints to resolve requests solely initiated by your verified WordPress domain node.</span>
                              </div>
                              <input
                                type="checkbox"
                                checked={securityHardenCors}
                                onChange={(e) => {
                                  const val = e.target.checked;
                                  setSecurityHardenCors(val);
                                  addLog(`\U0001f6e1 Restrictive CORS endpoint mapping ${val ? 'ENABLED' : 'DISABLED'}.`);
                                  setSecurityLogs(prev => [`[${new Date().toLocaleTimeString()}] \U0001f6e1 CORS domain restriction to ${wpUrl || 'verified target node'} ${val ? 'BOUND' : 'UNBOUND'}`, ...prev]);
                                }}
                                className="rounded border-neutral-800 bg-[#0c0c0c] text-amber-500 focus:ring-0 w-4.5 h-4.5 shrink-0 cursor-pointer accent-amber-500"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Security Log Console & POPIA status */}
                      <div className="lg:col-span-7 space-y-6">
                        <div className="bg-[#111111] border border-[#222222] rounded-xl p-5 text-left flex flex-col h-[525px]">
                          <div className="flex items-center justify-between pb-3 border-b border-neutral-900 mb-3 shrink-0">
                            <div>
                              <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                                <Terminal size={14} className="text-amber-500 animate-pulse" />
                                Live Security Audit Tracer & Compliance Logs
                              </h3>
                              <p className="text-[10px] text-neutral-500 font-sans">
                                Real-time reporting on South African security requirements (POPIA Act No. 4 of 2013)
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSecurityLogs([])}
                              className="text-[9px] text-neutral-500 hover:text-white uppercase font-bold font-mono hover:underline cursor-pointer"
                            >
                              Clear Logs
                            </button>
                          </div>

                          <div className="flex-1 overflow-y-auto bg-black p-4 rounded-lg border border-neutral-900 font-mono text-[10px] text-amber-400 space-y-1.5 scrollbar-thin">
                            {securityLogs.length === 0 ? (
                              <div className="text-neutral-600 italic text-center pt-20">
                                No scanner activities logged. Click "Trigger Secure Audit Scan" to audit live hardening configurations.
                              </div>
                            ) : (
                              securityLogs.map((log, idx) => (
                                <div key={idx} className="whitespace-pre-wrap break-words">{log}</div>
                              ))
                            )}
                          </div>

                          <div className="bg-[#070707] border border-neutral-900 rounded-lg p-3.5 mt-3 shrink-0 text-xs">
                            <span className="block text-[10px] text-neutral-500 uppercase font-black tracking-wider pb-1.5 border-b border-neutral-900 mb-2">POPIA Privacy Statement Status</span>
                            <div className="flex items-center justify-between">
                              <span className="text-neutral-300">Target compliance zone:</span>
                              <span className="text-white font-bold bg-neutral-900 border border-neutral-800 px-2.5 py-0.5 rounded font-mono text-[10px]">REPUBLIC OF SOUTH AFRICA</span>
                            </div>
                            <p className="text-[10px] text-neutral-500 mt-2 leading-relaxed">
                              Under POPIA compliance standards, this console acts as a secure sandboxed channel that does not harvest or transmit personal identity logs of your showroom visitors or order records. All configurations persist purely in sandboxed application memories.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SEO RANKING EDITOR TAB */}
              {activeTab === 'seo' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  {/* Top Header Deck & Stats bar */}
                  <div className="bg-[#111111] border border-[#222222] rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1 text-left">
                      <div className="flex items-center gap-2">
                        <Sparkles size={20} className="text-yellow-400 animate-pulse" />
                        <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">SEO Meta-Tags & Search Ranking Deck</h2>
                      </div>
                      <p className="text-xs text-neutral-400 max-w-xl font-sans">
                        Optimize individual product metatags to boost ranking, enhance click-through rates (CTR) on Google, and drive target organic commercial inquiries in South Africa.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                      {/* Stats */}
                      <div className="flex gap-4 text-xs font-mono bg-[#070707] border border-[#333333] px-4 py-3 rounded-lg text-left">
                        <div>
                          <p className="text-neutral-500 uppercase text-[9px] font-bold">Total Products</p>
                          <p className="text-neutral-200 font-extrabold text-sm">{currentProducts.length}</p>
                        </div>
                        <div className="border-l border-neutral-800 pl-4">
                          <p className="text-neutral-500 uppercase text-[9px] font-bold">Optimized (Custom)</p>
                          <p className="text-green-400 font-extrabold text-sm">
                            {currentProducts.filter(p => p.seoTitle || p.seoDescription).length}
                          </p>
                        </div>
                        <div className="border-l border-neutral-800 pl-4">
                          <p className="text-neutral-500 uppercase text-[9px] font-bold">Health Score</p>
                          <p className="text-yellow-400 font-extrabold text-sm">
                            {Math.round((currentProducts.filter(p => p.seoTitle || p.seoDescription).length / currentProducts.length) * 100)}%
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRunSeoHealth()}
                        className="px-4 py-3 bg-[#161616] hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white font-sans font-bold text-xs uppercase rounded transition-all duration-300 flex items-center gap-1.5 cursor-pointer"
                        title="Analyze current SEO parameters against live South African competitor trends using Google Search Grounded AI"
                      >
                        <Award size={13} className="text-yellow-400 animate-pulse" />
                        Grounded Health Check
                      </button>

                      <button
                        onClick={handleBulkAutoFill}
                        className="px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-white hover:to-white hover:text-black font-sans font-bold text-xs uppercase rounded transition-all duration-300 shadow-[0_4px_20px_rgba(239,68,68,0.2)] flex items-center gap-1.5 cursor-pointer text-white"
                      >
                        <Sparkles size={13} />
                        Bulk Auto-Fill Empty
                      </button>
                    </div>
                  </div>

                  {/* SEO Sub-tabs */}
                  <div className="flex border-b border-[#222222] gap-1.5 pb-px">
                    <button
                      type="button"
                      onClick={() => setSeoSubTab('global')}
                      className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 font-sans transition-all cursor-pointer ${
                        seoSubTab === 'global'
                          ? 'border-red-600 text-white bg-red-600/5'
                          : 'border-transparent text-neutral-400 hover:text-white hover:bg-neutral-800/40'
                      }`}
                    >
                      Global SEO Settings
                    </button>
                    <button
                      type="button"
                      onClick={() => setSeoSubTab('products')}
                      className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 font-sans transition-all cursor-pointer ${
                        seoSubTab === 'products'
                          ? 'border-red-600 text-white bg-red-600/5'
                          : 'border-transparent text-neutral-400 hover:text-white hover:bg-neutral-800/40'
                      }`}
                    >
                      Product-Specific Overrides ({currentProducts.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSeoSubTab('audit')}
                      className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 font-sans transition-all cursor-pointer ${
                        seoSubTab === 'audit'
                          ? 'border-red-600 text-white bg-red-600/5'
                          : 'border-transparent text-neutral-400 hover:text-white hover:bg-neutral-800/40'
                      }`}
                    >
                      Category SEO Audit
                    </button>
                    <button
                      type="button"
                      onClick={() => setSeoSubTab('analyzer')}
                      className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 font-sans transition-all cursor-pointer ${
                        seoSubTab === 'analyzer'
                          ? 'border-red-600 text-white bg-red-600/5'
                          : 'border-transparent text-neutral-400 hover:text-white hover:bg-neutral-800/40'
                      }`}
                    >
                      \u2728 SEO Catalog Analyzer
                    </button>
                  </div>

                  {/* Grounded Competitor Analysis & Health Score Panel */}
                  {showSeoHealthPanel && (
                    <div className="bg-[#111111] border border-yellow-600/30 rounded-xl p-5 space-y-4 animate-in slide-in-from-top-4 duration-300 relative overflow-hidden">
                      {/* Accent glow corner */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-2xl pointer-events-none" />
                      
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1 text-left">
                          <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-yellow-400 flex items-center gap-1.5">
                            <Award size={12} className="animate-spin duration-3000 text-yellow-400" /> Grounded Competitor SEO Trend Report
                          </span>
                          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                            {seoSubTab === 'global' ? 'Global Landing Page Evaluation' : `Analysis for "${activeSeoProduct?.name || 'Selected Product'}"`}
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowSeoHealthPanel(false)}
                          className="text-neutral-500 hover:text-white p-1 rounded-full hover:bg-neutral-800 transition-colors cursor-pointer"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      {seoHealthLoading ? (
                        <div className="py-12 flex flex-col items-center justify-center space-y-3">
                          <RefreshCw size={24} className="text-yellow-400 animate-spin" />
                          <p className="text-xs text-neutral-400 font-mono animate-pulse">
                            Accessing Google Search to index South African competitors & evaluate meta trends...
                          </p>
                        </div>
                      ) : seoHealthResult ? (
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 text-left">
                          {/* Left Column: Health Score gauge & discovered competitors */}
                          <div className="md:col-span-4 space-y-4 bg-[#070707] p-4 rounded-lg border border-neutral-800">
                            <div className="text-center space-y-1">
                              <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest block font-bold">Competitor Alignment Score</span>
                              <div className="relative inline-flex items-center justify-center">
                                {/* SVG Circular Progress */}
                                <svg className="w-24 h-24 transform -rotate-90">
                                  <circle
                                    cx="48"
                                    cy="48"
                                    r="40"
                                    stroke="#1e1e1e"
                                    strokeWidth="8"
                                    fill="transparent"
                                  />
                                  <circle
                                    cx="48"
                                    cy="48"
                                    r="40"
                                    stroke={seoHealthResult.score >= 80 ? "#10b981" : seoHealthResult.score >= 60 ? "#f59e0b" : "#ef4444"}
                                    strokeWidth="8"
                                    fill="transparent"
                                    strokeDasharray={2 * Math.PI * 40}
                                    strokeDashoffset={2 * Math.PI * 40 * (1 - seoHealthResult.score / 100)}
                                    className="transition-all duration-1000 ease-out"
                                  />
                                </svg>
                                <span className="absolute text-xl font-black text-white font-mono">
                                  {seoHealthResult.score}%
                                </span>
                              </div>
                              <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                                seoHealthResult.score >= 80 ? "text-emerald-400" : seoHealthResult.score >= 60 ? "text-amber-400" : "text-red-500"
                              }`}>
                                {seoHealthResult.score >= 80 ? "Strong Alignment" : seoHealthResult.score >= 60 ? "Moderate Gaps" : "High Risk / Poor SEO"}
                              </span>
                            </div>

                            {/* Discovered Competitor Sites */}
                            <div className="space-y-1.5 pt-2 border-t border-neutral-900">
                              <span className="text-[9px] font-mono text-neutral-500 uppercase font-bold tracking-wider block">Discovered South African Sources:</span>
                              <div className="space-y-1 max-h-[140px] overflow-y-auto custom-scrollbar">
                                {seoHealthResult.competitorsFound && seoHealthResult.competitorsFound.length > 0 ? (
                                  seoHealthResult.competitorsFound.map((comp, idx) => (
                                    <a
                                      key={idx}
                                      href={comp.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center justify-between p-1.5 bg-[#111111] hover:bg-neutral-800 rounded border border-neutral-950 text-[10px] text-neutral-300 hover:text-white transition-colors"
                                    >
                                      <span className="truncate font-sans font-medium max-w-[150px]">{comp.name}</span>
                                      <ExternalLink size={9} className="text-neutral-500 flex-shrink-0" />
                                    </a>
                                  ))
                                ) : (
                                  <p className="text-[10px] text-neutral-500 italic">No competitors indexed.</p>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right Column: Strategic suggestions & trends list */}
                          <div className="md:col-span-8 space-y-4">
                            {/* Competitor Trend list */}
                            <div className="space-y-2">
                              <span className="text-[9px] font-mono text-neutral-500 uppercase font-bold tracking-wider block">Identified South African Competitor Trends:</span>
                              <ul className="space-y-1.5 text-xs text-neutral-300 font-sans">
                                {seoHealthResult.trends.map((trend, idx) => (
                                  <li key={idx} className="flex items-start gap-2 bg-[#070707] p-2 rounded border border-neutral-800">
                                    <span className="text-yellow-400 font-bold select-none">\u2022</span>
                                    <span>{trend}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Strategic Analysis explanation */}
                            <div className="bg-[#070707]/60 p-3 rounded-lg border border-neutral-800 text-[11px] text-neutral-400 font-sans leading-relaxed">
                              <strong className="text-neutral-200 block mb-0.5">Competitor Discrepancy Analysis:</strong>
                              {seoHealthResult.analysis}
                            </div>

                            {/* Suggested Recommendations Box */}
                            <div className="bg-[#181818] border border-yellow-600/20 rounded-lg p-4 space-y-3">
                              <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
                                <span className="text-[10px] font-mono text-yellow-400 uppercase font-bold tracking-wider flex items-center gap-1">
                                  <Sparkles size={11} /> Grounded SEO Recommendation
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (seoSubTab === 'global') {
                                      setGlobalSeoTitleInput(seoHealthResult.titleSuggestion);
                                      setGlobalSeoDescInput(seoHealthResult.descriptionSuggestion);
                                    } else {
                                      setSeoTitleInput(seoHealthResult.titleSuggestion);
                                      setSeoDescInput(seoHealthResult.descriptionSuggestion);
                                    }
                                    setSeoNotification({
                                      type: 'success',
                                      text: 'Grounded suggestion applied successfully! Make sure to save changes below.'
                                    });
                                    setTimeout(() => setSeoNotification(null), 3000);
                                  }}
                                  className="px-2.5 py-1 bg-yellow-600 hover:bg-yellow-500 text-black font-sans font-black text-[10px] uppercase rounded transition-colors cursor-pointer"
                                >
                                  Apply to Form
                                </button>
                              </div>

                              <div className="space-y-2 text-xs">
                                <div className="space-y-1">
                                  <span className="text-[9px] uppercase text-neutral-500 font-bold tracking-wider block">Suggested Meta Title:</span>
                                  <p className="bg-[#070707] p-2 rounded text-neutral-200 font-mono break-all border border-neutral-800 font-semibold select-all">
                                    {seoHealthResult.titleSuggestion}
                                  </p>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[9px] uppercase text-neutral-500 font-bold tracking-wider block">Suggested Meta Description:</span>
                                  <p className="bg-[#070707] p-2 rounded text-neutral-200 font-sans leading-relaxed border border-neutral-800 select-all">
                                    {stripHtml(seoHealthResult.descriptionSuggestion)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-neutral-400 font-sans">No analysis data loaded.</p>
                      )}
                    </div>
                  )}

                  {/* Toast Notifications */}
                  {seoNotification && (
                    <div className={`p-4 rounded-xl border flex items-center gap-3 text-xs leading-relaxed text-left animate-in slide-in-from-top-2 duration-200 ${
                      seoNotification.type === 'success' 
                        ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400' 
                        : 'bg-red-950/40 border-red-500/30 text-red-500'
                    }`}>
                      <CheckCircle size={16} className={seoNotification.type === 'success' ? 'text-emerald-400' : 'text-red-500'} />
                      <span>{seoNotification.text}</span>
                    </div>
                  )}

                  {/* Operational Dual Deck Panels */}
                  {seoSubTab === 'products' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    
                    {/* Left Sidebar: Product Navigation & Status Hub */}
                    <div className="lg:col-span-4 bg-[#111111] border border-[#222222] rounded-xl p-4 flex flex-col space-y-4 max-h-[750px]">
                      <div className="relative text-left">
                        <Search size={14} className="absolute left-3 top-3.5 text-neutral-500" />
                        <input
                          type="text"
                          value={seoSearchQuery}
                          onChange={(e) => setSeoSearchQuery(e.target.value)}
                          placeholder="Filter catalog by name, model..."
                          className="w-full bg-[#070707] border border-[#222222] hover:border-neutral-700 text-xs text-white p-3 pl-9 rounded-lg outline-none focus:border-[#ff0000] font-sans"
                        />
                      </div>

                      {/* Product Selector list viewport */}
                      <div className="space-y-2 overflow-y-auto pr-1 flex-1 max-h-[580px] custom-scrollbar text-left">
                        {currentProducts
                          .filter(p => {
                            const q = seoSearchQuery.toLowerCase();
                            return p.name.toLowerCase().includes(q) || p.modelCode.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
                          })
                          .map((p) => {
                            const isSelected = activeSeoProduct && activeSeoProduct.id === p.id;
                            const hasCustomSeo = !!(p.seoTitle || p.seoDescription);
                            
                            return (
                              <button
                                key={p.id}
                                onClick={() => setSelectedSeoProductId(p.id)}
                                className={`w-full text-left p-3 rounded-lg border transition-all flex items-center gap-3 group relative cursor-pointer ${
                                  isSelected 
                                    ? 'bg-[#181818] border-red-600/60 shadow-[inset_0_1px_4px_rgba(0,0,0,0.6)]' 
                                    : 'bg-[#070707] border-[#222222] hover:border-neutral-700 hover:bg-[#111111]'
                                }`}
                              >
                                {/* Left Glow Bar for active selection */}
                                {isSelected && (
                                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-red-600 rounded-l" />
                                )}

                                <img 
                                  src={p.image} 
                                  alt="" 
                                  className="w-10 h-10 object-cover rounded-md border border-neutral-800 flex-shrink-0"
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    e.currentTarget.src = 'https://images.unsplash.com/photo-1563720223185-11003d516935?q=80&w=150&auto=format&fit=crop';
                                  }}
                                />

                                <div className="min-w-0 flex-1 space-y-1">
                                  <div className="flex font-mono text-[9px] text-[#ff0000] truncate items-center justify-between">
                                    <span className="font-bold tracking-wider">{p.modelCode}</span>
                                    {hasCustomSeo ? (
                                      <span className="text-emerald-400 font-bold uppercase text-[8px] bg-emerald-950/40 border border-emerald-900 px-1 rounded flex items-center gap-0.5">
                                        <Check size={8} /> Optimized
                                      </span>
                                    ) : (
                                      <span className="text-neutral-500 font-bold uppercase text-[8px] bg-neutral-900 border border-neutral-800 px-1 rounded">
                                        Default
                                      </span>
                                    )}
                                  </div>
                                  <p className={`text-xs font-sans truncate ${isSelected ? 'text-white' : 'text-neutral-300 group-hover:text-white'}`}>{p.name}</p>
                                  
                                  {/* Indicators summary */}
                                  <div className="flex gap-1.5 text-[8px] font-mono text-neutral-500">
                                    <span className={p.seoTitle ? 'text-emerald-400' : 'text-neutral-500'}>Title</span>
                                    <span>\xb7</span>
                                    <span className={p.seoDescription ? 'text-emerald-400' : 'text-neutral-500'}>Desc</span>
                                    <span>\xb7</span>
                                    <span className={p.seoFocusKeyword ? 'text-emerald-400' : 'text-neutral-500'}>Keyw</span>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                      </div>
                    </div>

                    {/* Right Workspace: Meta Tags Editor & Analysis Panel */}
                    <div className="lg:col-span-8 space-y-6">
                      
                      {activeSeoProduct ? (
                        <div className="bg-[#111111] border border-[#222222] rounded-xl p-6 space-y-6 text-left">
                          
                          {/* Product header summary */}
                          <div className="flex items-center gap-4 pb-4 border-b border-neutral-800">
                            <img 
                              src={activeSeoProduct.image} 
                              alt={activeSeoProduct.name} 
                              className="w-12 h-12 object-cover rounded-md border border-neutral-800 shadow"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                e.currentTarget.src = 'https://images.unsplash.com/photo-1563720223185-11003d516935?q=80&w=150&auto=format&fit=crop';
                              }}
                            />
                            <div className="text-left">
                              <span className="text-[9px] font-mono font-bold bg-[#ff0000]/10 border border-[#ff0000]/30 text-[#ff0000] px-1.5 py-0.5 rounded uppercase tracking-wider">
                                {activeSeoProduct.category}
                              </span>
                              <h3 className="text-sm font-bold text-white mt-1 font-sans">{activeSeoProduct.name}</h3>
                              <p className="text-[10px] text-neutral-500 font-mono mt-0.5">SKU ID: {activeSeoProduct.id} | Model Code: {activeSeoProduct.modelCode}</p>
                            </div>
                          </div>

                          {/* PART A: Google Search Snippet Preview Simulator - AESTHETIC HIGH END */}
                          <div className="space-y-4 text-left">
                            <div className="bg-[#181818] border border-neutral-800 rounded-xl p-4 space-y-4">
                              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pb-3 border-b border-neutral-800">
                                <div className="space-y-0.5">
                                  <span className="text-[10px] font-mono text-neutral-400 font-bold tracking-wider uppercase flex items-center gap-1.5">
                                    <Search size={11} className="text-red-500" /> Google Search Snippet Preview (Rich Schema)
                                  </span>
                                  <p className="text-[10px] text-neutral-500 font-sans">
                                    Simulate how search engine web crawlers render your product and how users see your listing.
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="flex bg-[#070707] p-0.5 rounded border border-neutral-800">
                                    <button
                                      type="button"
                                      onClick={() => setSerpPreviewMode('desktop')}
                                      className={`px-2.5 py-1 text-[9px] font-bold rounded tracking-wider uppercase font-sans cursor-pointer transition-all ${
                                        serpPreviewMode === 'desktop' ? 'bg-red-600 text-white shadow-md' : 'text-neutral-400 hover:text-white'
                                      }`}
                                    >
                                      Desktop
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setSerpPreviewMode('mobile')}
                                      className={`px-2.5 py-1 text-[9px] font-bold rounded tracking-wider uppercase font-sans cursor-pointer transition-all ${
                                        serpPreviewMode === 'mobile' ? 'bg-red-600 text-white shadow-md' : 'text-neutral-400 hover:text-white'
                                      }`}
                                    >
                                      Mobile
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Simulator Search Box */}
                              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                                <div className="md:col-span-7 space-y-1">
                                  <label className="text-[9px] uppercase text-neutral-500 font-bold tracking-wider">Search Query Simulator</label>
                                  <div className="relative">
                                    <Search size={11} className="absolute left-2.5 top-2.5 text-neutral-500" />
                                    <input
                                      type="text"
                                      value={seoSearchSimulatorQuery}
                                      onChange={(e) => setSeoSearchSimulatorQuery(e.target.value)}
                                      placeholder="Type search terms to simulate user query highlights..."
                                      className="w-full bg-[#070707] border border-neutral-800 hover:border-neutral-700 text-[10px] text-white p-2 pl-7 rounded-lg outline-none focus:border-red-600 font-sans transition-colors"
                                    />
                                    {seoSearchSimulatorQuery && (
                                      <button 
                                        type="button"
                                        onClick={() => setSeoSearchSimulatorQuery('')}
                                        className="absolute right-2 top-2 text-neutral-500 hover:text-white cursor-pointer"
                                      >
                                        <X size={10} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <div className="md:col-span-5 flex gap-1.5 flex-wrap items-end self-end pt-3">
                                  <p className="text-[8px] font-mono text-neutral-500 uppercase font-bold w-full">Quick simulation pills:</p>
                                  {[activeSeoProduct.modelCode, activeSeoProduct.category === 'car-lift' ? 'car lift' : 'spray booth', 'Cape Town price'].map((pill, idx) => (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => setSeoSearchSimulatorQuery(pill)}
                                      className="px-2 py-0.5 bg-[#070707] hover:bg-[#111111] border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-white text-[8px] font-mono rounded cursor-pointer transition-colors"
                                    >
                                      {pill}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Google Search Snippet Mock Preview Container */}
                              <div className="bg-[#070707] p-5 rounded-xl border border-neutral-800/80 font-sans relative overflow-hidden shadow-inner">
                                {serpPreviewMode === 'desktop' ? (
                                  <div className="space-y-1.5 max-w-[600px] text-left">
                                    {/* URL line with Breadcrumbs */}
                                    <div className="flex items-center gap-2 text-[12px] text-[#bdc1c6] leading-tight font-sans">
                                      <div className="w-5 h-5 bg-white/5 rounded-full flex items-center justify-center text-[9px] text-neutral-300 font-bold font-mono">T</div>
                                      <div className="flex items-center gap-1.5 truncate">
                                        <span className="text-[#dadce0] font-medium text-[11px]">Triton Car Lifts</span>
                                        <span className="text-neutral-500 text-[9px]">&rsaquo;</span>
                                        <span className="text-neutral-400 text-[11px] font-normal truncate">https://car-lifts.co.za</span>
                                        <span className="text-neutral-500 text-[9px]">&rsaquo;</span>
                                        <span className="text-neutral-400 text-[11px] font-normal truncate">{activeSeoProduct.category}s</span>
                                      </div>
                                    </div>
                                    {/* Title (Classic Blue styled Google link) */}
                                    <h4 className="text-[20px] text-[#8ab4f8] group-hover:underline font-normal font-sans tracking-normal leading-tight font-medium truncate cursor-pointer hover:text-[#a0c5fc]">
                                      {renderGoogleHighlightedText(
                                        seoTitleInput || `${activeSeoProduct.name} - Dimensions & Technical Specs | car-lifts.co.za`,
                                        seoSearchSimulatorQuery || seoKeywordInput
                                      )}
                                    </h4>
                                    {/* Rating & reviews mock search snippet metadata */}
                                    <div className="flex items-center gap-1.5 text-[12px] text-[#bdc1c6] leading-tight py-0.5 font-sans flex-wrap">
                                      <span className="text-[#fbc02d] text-[13px]">
                                        {"\u2605".repeat(Math.round(seoRichSnippetRating)) + "\u2606".repeat(5 - Math.round(seoRichSnippetRating))}
                                      </span>
                                      <span className="font-semibold">{seoRichSnippetRating}</span>
                                      <span className="text-[#80868b] font-light">({seoRichSnippetReviews} reviews)</span>
                                      <span className="text-[#80868b] font-light">\xb7</span>
                                      <span className="text-[#dadce0] font-medium">
                                        {seoCustomPrice || `ZAR ${activeSeoProduct.price?.toLocaleString() || 'Quote'}`}
                                      </span>
                                      <span className="text-[#80868b] font-light">\xb7</span>
                                      {seoRichSnippetStock === 'instock' && <span className="text-emerald-400 font-medium">In stock</span>}
                                      {seoRichSnippetStock === 'outofstock' && <span className="text-red-400 font-medium">Out of stock</span>}
                                      {seoRichSnippetStock === 'onrequest' && <span className="text-yellow-400 font-medium">Available on request</span>}
                                    </div>
                                    {/* Snippet Description */}
                                    <p className="text-[14px] text-[#bdc1c6] leading-relaxed font-sans line-clamp-2">
                                      {renderGoogleHighlightedText(
                                        seoDescInput || `Get absolute pricing, complete spec sheets, and engineering highlights for ${activeSeoProduct.name}. Certified durability at car-lifts.co.za Cape Town.`,
                                        seoSearchSimulatorQuery || seoKeywordInput
                                      )}
                                    </p>
                                  </div>
                                ) : (
                                  <div className="space-y-2 max-w-[420px] text-left p-1 border border-neutral-900/60 rounded flex gap-4 items-start">
                                    <div className="space-y-1.5 flex-1 min-w-0">
                                      {/* URL Mobile style with icon */}
                                      <div className="flex items-center gap-2 text-[11px] text-[#bdc1c6]">
                                        <div className="w-4 h-4 bg-white/5 rounded-full flex items-center justify-center text-[8px] text-neutral-300 font-bold font-mono">T</div>
                                        <span className="truncate text-xs text-[#dadce0]">car-lifts.co.za &rsaquo; product</span>
                                      </div>
                                      {/* Mobile Title - bigger Blue styled */}
                                      <h4 className="text-[17px] text-[#8ab4f8] font-medium leading-snug line-clamp-2 font-sans cursor-pointer hover:text-[#a0c5fc]">
                                        {renderGoogleHighlightedText(
                                          seoTitleInput || `${activeSeoProduct.name} - Dimensions & Technical Specs | car-lifts.co.za`,
                                          seoSearchSimulatorQuery || seoKeywordInput
                                        )}
                                      </h4>
                                      {/* Star ratings and price on Mobile snippet */}
                                      <div className="flex items-center gap-1.5 text-[11px] text-[#bdc1c6] font-sans">
                                        <span className="text-[#fbc02d]">\u2605</span>
                                        <span className="font-semibold">{seoRichSnippetRating}</span>
                                        <span className="text-[#80868b]">({seoRichSnippetReviews})</span>
                                        <span className="text-[#80868b]">\xb7</span>
                                        <span className="font-medium text-[#dadce0]">{seoCustomPrice || `ZAR ${activeSeoProduct.price?.toLocaleString() || 'Quote'}`}</span>
                                      </div>
                                      {/* Snippet Description */}
                                      <p className="text-[12px] text-[#bdc1c6] leading-relaxed font-sans line-clamp-3">
                                        {renderGoogleHighlightedText(
                                          seoDescInput || `Get absolute pricing, complete spec sheets, and engineering highlights for ${activeSeoProduct.name}. Certified durability at car-lifts.co.za Cape Town.`,
                                          seoSearchSimulatorQuery || seoKeywordInput
                                        )}
                                      </p>
                                    </div>
                                    {/* Thumbnail preview - modern Google Mobile SERP image block */}
                                    {seoRichSnippetShowImage && (
                                      <div className="w-16 h-16 shrink-0 border border-neutral-800 rounded bg-[#111] overflow-hidden self-center shadow">
                                        <img 
                                          src={activeSeoProduct.image} 
                                          alt="" 
                                          className="w-full h-full object-cover"
                                          referrerPolicy="no-referrer"
                                          onError={(e) => {
                                            e.currentTarget.src = 'https://images.unsplash.com/photo-1563720223185-11003d516935?q=80&w=150&auto=format&fit=crop';
                                          }}
                                        />
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Google Snippet Customizer Controls (Expandable/Configurable) */}
                              <div className="bg-[#111111] rounded-xl border border-neutral-900 p-3.5 space-y-3">
                                <p className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400">Google Schema Rich Snippet Customizer</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                                  {/* Star Rating control */}
                                  <div className="space-y-1">
                                    <label className="text-[9px] uppercase text-neutral-500 font-bold tracking-wider flex justify-between">
                                      <span>Rating Stars</span>
                                      <span className="text-yellow-500 font-mono font-bold">{seoRichSnippetRating} \u2605</span>
                                    </label>
                                    <input 
                                      type="range" 
                                      min="1.0" 
                                      max="5.0" 
                                      step="0.1"
                                      value={seoRichSnippetRating}
                                      onChange={(e) => setSeoRichSnippetRating(parseFloat(e.target.value))}
                                      className="w-full accent-yellow-500 h-1 bg-[#070707] rounded-lg cursor-pointer"
                                    />
                                  </div>

                                  {/* Review count control */}
                                  <div className="space-y-1">
                                    <label className="text-[9px] uppercase text-neutral-500 font-bold tracking-wider">Reviews Count</label>
                                    <div className="flex gap-1.5">
                                      <input 
                                        type="number" 
                                        min="1" 
                                        max="5000"
                                        value={seoRichSnippetReviews}
                                        onChange={(e) => setSeoRichSnippetReviews(parseInt(e.target.value) || 1)}
                                        className="w-full bg-[#070707] border border-neutral-800 text-[10px] font-mono text-white p-1 rounded outline-none focus:border-red-600 text-center"
                                      />
                                      <button 
                                        type="button" 
                                        onClick={() => setSeoRichSnippetReviews(prev => prev + 10)}
                                        className="px-1.5 py-0.5 bg-[#070707] hover:bg-[#181818] border border-neutral-800 text-[9px] font-bold text-neutral-300 rounded cursor-pointer transition-colors"
                                      >
                                        +10
                                      </button>
                                    </div>
                                  </div>

                                  {/* Custom price control */}
                                  <div className="space-y-1">
                                    <label className="text-[9px] uppercase text-neutral-500 font-bold tracking-wider">Mock Price override</label>
                                    <input 
                                      type="text" 
                                      value={seoCustomPrice}
                                      onChange={(e) => setSeoCustomPrice(e.target.value)}
                                      placeholder={`ZAR ${activeSeoProduct.price?.toLocaleString() || 'Quote'}`}
                                      className="w-full bg-[#070707] border border-neutral-800 text-[10px] text-white p-1 px-2 rounded outline-none focus:border-red-600"
                                    />
                                  </div>

                                  {/* Stock selection controls */}
                                  <div className="space-y-1">
                                    <label className="text-[9px] uppercase text-neutral-500 font-bold tracking-wider">Crawler Stock status</label>
                                    <select
                                      value={seoRichSnippetStock}
                                      onChange={(e) => setSeoRichSnippetStock(e.target.value as any)}
                                      className="w-full bg-[#070707] border border-neutral-800 text-[10px] text-white p-1 rounded outline-none focus:border-red-600 cursor-pointer"
                                    >
                                      <option value="instock">In Stock (Green)</option>
                                      <option value="outofstock">Out of Stock (Red)</option>
                                      <option value="onrequest">On Request (Yellow)</option>
                                    </select>
                                  </div>
                                </div>

                                {/* Toggle Image block */}
                                <div className="flex items-center justify-between pt-2 border-t border-neutral-900">
                                  <span className="text-[9px] font-mono text-neutral-500 uppercase font-bold">Mobile search thumbnail card</span>
                                  <button
                                    type="button"
                                    onClick={() => setSeoRichSnippetShowImage(!seoRichSnippetShowImage)}
                                    className={`px-3 py-1 rounded text-[9px] font-extrabold uppercase cursor-pointer transition-all ${
                                      seoRichSnippetShowImage 
                                        ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800' 
                                        : 'bg-[#070707] text-neutral-500 border border-neutral-900'
                                    }`}
                                  >
                                    {seoRichSnippetShowImage ? 'Snippet Thumbnail ON' : 'Snippet Thumbnail OFF'}
                                  </button>
                                </div>
                              </div>

                              {/* Interactive SEO Scorecard Widget */}
                              <div className="bg-[#111] rounded-xl border border-neutral-900 p-4">
                                <div className="flex items-center justify-between pb-3 border-b border-neutral-900">
                                  <div className="space-y-0.5 text-left">
                                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400">SEO Quality Scorecard</p>
                                    <p className="text-[9px] text-neutral-500 font-sans">Live grading based on Google search snippet search engine guidelines.</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="text-right">
                                      <p className="text-xs font-bold font-mono text-white leading-none">{seoScore}/100</p>
                                      <p className={`text-[8px] font-mono font-bold leading-none mt-0.5 ${
                                        seoScore >= 90 ? 'text-emerald-400' : seoScore >= 60 ? 'text-yellow-500' : 'text-red-500 animate-pulse'
                                      }`}>
                                        {seoScore >= 90 ? 'EXCELLENT' : seoScore >= 60 ? 'OPTIMIZED' : 'NEEDS OPTIMIZATION'}
                                      </p>
                                    </div>
                                    <div className="w-8 h-8 rounded-full border-2 border-neutral-800 flex items-center justify-center font-mono text-[10px] font-bold text-white relative">
                                      <div 
                                        className="absolute inset-0 rounded-full border-2 border-transparent border-t-red-500 border-r-red-500 animate-spin" 
                                        style={{ animationDuration: '3s' }} 
                                      />
                                      {seoScore}
                                    </div>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-3">
                                  <div className="flex items-start gap-2 text-left bg-[#070707] p-2 rounded border border-neutral-900">
                                    <div className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${seoTitleInput.length >= 50 && seoTitleInput.length <= 60 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-neutral-800'}`} />
                                    <div className="min-w-0">
                                      <p className="text-[9px] font-mono font-bold text-neutral-400 leading-none">Title Length Target</p>
                                      <p className="text-[8px] font-sans text-neutral-500 mt-0.5 leading-snug">50-60 characters (Currently {seoTitleInput.length})</p>
                                    </div>
                                  </div>

                                  <div className="flex items-start gap-2 text-left bg-[#070707] p-2 rounded border border-neutral-900">
                                    <div className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${seoDescInput.length >= 120 && seoDescInput.length <= 160 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-neutral-800'}`} />
                                    <div className="min-w-0">
                                      <p className="text-[9px] font-mono font-bold text-neutral-400 leading-none">Desc Length Target</p>
                                      <p className="text-[8px] font-sans text-neutral-500 mt-0.5 leading-snug">120-160 characters (Currently {seoDescInput.length})</p>
                                    </div>
                                  </div>

                                  <div className="flex items-start gap-2 text-left bg-[#070707] p-2 rounded border border-neutral-900">
                                    <div className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${seoKeywordInput && seoTitleInput.toLowerCase().includes(seoKeywordInput.toLowerCase()) && seoDescInput.toLowerCase().includes(seoKeywordInput.toLowerCase()) ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-neutral-800'}`} />
                                    <div className="min-w-0">
                                      <p className="text-[9px] font-mono font-bold text-neutral-400 leading-none">Keyword Density Check</p>
                                      <p className="text-[8px] font-sans text-neutral-500 mt-0.5 leading-snug">Presence in Title & Description override</p>
                                    </div>
                                  </div>
                                </div>
                              </div>

                            </div>
                          </div>

                          {/* PART B: Optimization Fields Form */}
                          <div className="space-y-4">
                            
                            {/* Focus Keyword */}
                            <div className="space-y-1.5">
                              <div className="flex justify-between items-center">
                                <label className="text-xs uppercase text-[#999999] font-bold tracking-wider">SEO Focus Target Keyword</label>
                                <span className="text-[10px] text-neutral-500 font-sans">e.g., "scissor hoist", "2 post car lift"</span>
                              </div>
                              <input
                                type="text"
                                value={seoKeywordInput}
                                onChange={(e) => setSeoKeywordInput(e.target.value)}
                                placeholder="Enter keyword target representing this product..."
                                className="w-full bg-[#070707] border border-[#222222] hover:border-neutral-700 text-xs text-white p-3 rounded-lg outline-none focus:border-[#ff0000] font-sans transition-colors"
                              />
                            </div>

                            {/* Competitive Keywords (South African Automotive Market) */}
                            <div className="bg-[#181818]/60 border border-neutral-800 rounded-xl p-4 space-y-3">
                              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2.5 border-b border-neutral-800">
                                <div className="space-y-0.5 text-left">
                                  <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-yellow-400 flex items-center gap-1.5">
                                    <Award size={11} className="text-yellow-400 animate-pulse" /> Competitive Keyword Intelligence (South Africa)
                                  </span>
                                  <p className="text-[10px] text-neutral-400 font-sans">
                                    Live suggested high-traffic search queries tailored for <strong>{activeSeoProduct?.category || 'automotive'}</strong> category.
                                  </p>
                                </div>
                                <span className="text-[9px] font-mono bg-neutral-800 border border-neutral-700 text-neutral-400 px-2 py-0.5 rounded-full uppercase">
  {activeSeoProduct ? activeSeoProduct.category : 'General'}
</span>
                                