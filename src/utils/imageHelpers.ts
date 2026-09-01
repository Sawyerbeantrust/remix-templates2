/**
 * Frontend image URL utilities for Triton Car Lifts
 */

export type ThumbnailSize = 'small' | 'medium' | 'large' | 'original';

export interface ThumbnailVariants {
  small: string;
  medium: string;
  large: string;
  original: string;
}

/**
 * Checks if a given image URL points to the WordPress media library
 */
export function isWordPressImage(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const s = url.toLowerCase();
  return (
    s.includes('store.car-lifts.co.za') ||
    s.includes('/wp-content/uploads/') ||
    (!s.startsWith('http://') && !s.startsWith('https://') && !s.startsWith('/assets/'))
  );
}

/**
 * Normalizes any image URL to an absolute HTTPS URL on the WordPress domain or local path
 */
export function normalizeImageUrl(url?: string | null): string {
  if (!url) return '';
  let s = String(url).trim();
  if (s.startsWith('http://')) s = s.replace('http://', 'https://');
  if (s.startsWith('//')) s = 'https:' + s;
  if (s.startsWith('/assets/')) return s;
  if (s.startsWith('/')) s = 'https://store.car-lifts.co.za' + s;
  if (!s.startsWith('http://') && !s.startsWith('https://') && !s.startsWith('/')) {
    s = 'https://store.car-lifts.co.za/wp-content/uploads/' + s;
  }
  return s;
}

/**
 * Returns the proxy thumbnail URL for remote images (e.g. WordPress media)
 */
export function getThumbnailUrl(rawUrl?: string | null, size: ThumbnailSize = 'medium'): string {
  if (!rawUrl) return '';
  const normalized = normalizeImageUrl(rawUrl);
  if (!normalized) return '';

  // Local assets can be served directly unless proxying is explicitly desired
  if (normalized.startsWith('/assets/')) {
    return normalized;
  }

  return `/api/media-thumb?url=${encodeURIComponent(normalized)}&size=${size}`;
}

/**
 * Generates all thumbnail size variants for a given image URL
 */
export function getThumbnailVariants(rawUrl?: string | null): ThumbnailVariants {
  return {
    small: getThumbnailUrl(rawUrl, 'small'),
    medium: getThumbnailUrl(rawUrl, 'medium'),
    large: getThumbnailUrl(rawUrl, 'large'),
    original: getThumbnailUrl(rawUrl, 'original'),
  };
}
