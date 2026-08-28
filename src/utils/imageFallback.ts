import type React from 'react';
import { logSystemError } from './errorLogger.js';

export const DEFAULT_FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&q=80&w=800&h=600';

/**
 * Fallback mapping for missing or legacy filenames to visually-similar existing image assets
 */
export const IMAGE_MAP: Record<string, string> = {
  'placeholder.jpg': '/placeholder.jpg',
  'garage_equipment_hero_1783937551956.jpg': '/assets/images/garage_equipment_hero_1783937551956.jpg',
  'garage_equipment_welder_hero_1783939957746.jpg': '/assets/images/garage_equipment_welder_hero_1783939957746.jpg',
  'killarney_gardens_map_1781354004848.jpg': '/assets/images/killarney_gardens_map_1781354004848.jpg',
  'modern_workshop_car_lift_1780988724101.png': '/assets/images/modern_workshop_car_lift_1780988724101.png',
  'banner_test.jpg': '/assets/images/garage_equipment_hero_1783937551956.jpg',
  'test.jpg': DEFAULT_FALLBACK_IMAGE,
  'test_cat.png': DEFAULT_FALLBACK_IMAGE
};

/**
 * Extract clean filename from a path or URL (e.g. '/images/workshop_sample.jpg' -> 'workshop_sample.jpg')
 */
export function getFilenameFromPath(urlOrPath: string): string {
  if (!urlOrPath || typeof urlOrPath !== 'string') return '';
  const clean = urlOrPath.split('?')[0].split('#')[0];
  const lastSlash = clean.lastIndexOf('/');
  return lastSlash !== -1 ? clean.substring(lastSlash + 1) : clean;
}

/**
 * Normalize image paths to the client‑expected format
 */
export function normalizeImgPath(path: string): string {
  if (!path) return path;
  // Strip leading '/src/assets/images/' if present
  return path.replace(/^\/src\/assets\/images\//, '/images/');
}

/**
 * Generates the sequence of retry fallback URLs for a given image source.
 * Chain: /assets/images/{file} -> /images/{file} -> IMAGE_MAP -> fallbackSrc
 */
export function getNextImageFallbackUrl(currentSrc: string, currentStep: number, fallbackSrc: string = DEFAULT_FALLBACK_IMAGE): { nextUrl: string; nextStep: number } {
  if (!currentSrc || typeof currentSrc !== 'string') {
    return { nextUrl: fallbackSrc, nextStep: 99 };
  }

  // If it's a data URI, blob URI, or /uploads/ path, fallback directly to the default image without asset cycling
  if (currentSrc.startsWith('data:') || currentSrc.startsWith('blob:') || currentSrc.includes('/uploads/')) {
    return { nextUrl: fallbackSrc, nextStep: 99 };
  }

  const isLocalAsset = currentSrc.startsWith('/images/') || 
    currentSrc.startsWith('/assets/images/') || 
    currentSrc.startsWith('/src/assets/images/') ||
    currentSrc.startsWith('images/');

  const filename = getFilenameFromPath(currentSrc);
  
  if (!isLocalAsset || !filename || !filename.match(/\.(jpe?g|png|webp|gif|svg)$/i)) {
    return { nextUrl: fallbackSrc, nextStep: 99 };
  }

  switch (currentStep) {
    case 0:
      // Retry 1: /assets/images/{filename}
      return { nextUrl: `/assets/images/${filename}`, nextStep: 1 };
    case 1:
      // Retry 2: /images/{filename}
      return { nextUrl: `/images/${filename}`, nextStep: 2 };
    case 2: {
      // Retry 3: IMAGE_MAP lookup
      const mapped = IMAGE_MAP[filename];
      if (mapped && mapped !== currentSrc) {
        return { nextUrl: mapped, nextStep: 3 };
      }
      return { nextUrl: fallbackSrc, nextStep: 99 };
    }
    default:
      // Ultimate fallback - never render a blank img
      return { nextUrl: fallbackSrc, nextStep: 99 };
  }
}

/**
 * Standard DOM onError event handler with automatic fallback chain
 */
export function handleImageElementError(
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  fallbackSrc: string = DEFAULT_FALLBACK_IMAGE
) {
  const target = e.currentTarget;
  const currentSrc = target.src || '';
  const step = parseInt(target.dataset.fallbackStep || '0', 10);

  if (step >= 99) {
    return;
  }

  const { nextUrl, nextStep } = getNextImageFallbackUrl(currentSrc, step, fallbackSrc);
  target.dataset.fallbackStep = String(nextStep);
  target.src = nextUrl;

  if (nextStep >= 99 && currentSrc && !currentSrc.includes('unsplash.com')) {
    logSystemError(
      `Image asset missing or 404: ${getFilenameFromPath(currentSrc)}`,
      `Attempted URL: ${currentSrc} -> Switched to fallback placeholder`,
      'Media'
    );
  }
}
