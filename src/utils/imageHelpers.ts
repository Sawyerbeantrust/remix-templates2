/**
 * Frontend image URL utilities for Triton Car Lifts
 */

export type ThumbnailSize = 'small' | 'medium' | 'large' | 'original';

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
