import { Product, FeaturedCategory } from '../../types/index.js';
import { normalizeCategorySlug } from '../categoryUtils.js';
import { ProjectAssetImage } from '../../types/console.js';

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
  if (img.startsWith('http://store.car-lifts.co.za')) {
    return img.replace(/^http:\/\/store\.car-lifts\.co\.za/i, 'https://store.car-lifts.co.za');
  }
  if (img.startsWith('http://car-lifts.co.za')) {
    return img.replace(/^http:\/\/car-lifts\.co\.za/i, 'https://car-lifts.co.za');
  }
  if (img.startsWith('http://')) {
    return img.replace(/^http:\/\//i, 'https://');
  }
  if (img.startsWith('https://') || img.startsWith('data:') || img.startsWith('blob:')) return img;
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

export const normalizeProductCategory = (p: Product): Product => {
  let nameStr = p.name || '';
  let descStr = p.description || '';
  let seoTitleStr = p.seoTitle || '';
  let seoDescStr = p.seoDescription || '';

  const safeRotaryRegex = /\bRotary\b(?!\s+(?:screw|safety|valve))/gi;

  if (safeRotaryRegex.test(nameStr)) {
    if (nameStr.trim().toLowerCase() === 'rotary') {
      nameStr = 'Triton Lift';
    } else {
      nameStr = nameStr.replace(safeRotaryRegex, 'Triton');
    }
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
