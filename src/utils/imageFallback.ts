import type React from 'react';

export const DEFAULT_FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&q=80&w=800&h=600';

/**
 * Extract clean filename from a path or URL (e.g. '/images/car_lift_1.jpg' -> 'car_lift_1.jpg')
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
 * Chain: /assets/images/{file} -> /images/{file} -> fallbackSrc
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
}
