import { useState, useEffect } from 'react';

const CATEGORY_PLACEHOLDER = 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&q=80&w=800&h=600';

export function normalizeImageKey(urlOrKey: string): string {
  if (!urlOrKey || typeof urlOrKey !== 'string') return urlOrKey;

  // Base64 and Blob URLs
  if (urlOrKey.startsWith('data:') || urlOrKey.startsWith('blob:')) {
    return urlOrKey;
  }

  // Absolute URLs that already contain http:// or https://
  if (urlOrKey.startsWith('http://') || urlOrKey.startsWith('https://')) {
    return urlOrKey;
  }

  // Local assets in static directories
  if (
    urlOrKey.startsWith('/assets/images/') ||
    urlOrKey.startsWith('/images/') ||
    urlOrKey.startsWith('/src/assets/images/') ||
    urlOrKey.startsWith('images/') ||
    urlOrKey.startsWith('/src/assets/')
  ) {
    const filename = urlOrKey.split('?')[0].split('#')[0].split('/').filter(Boolean).pop();
    if (filename) return `/assets/images/${filename}`;
    return urlOrKey;
  }

  // Local uploads
  if (urlOrKey.startsWith('/uploads/') || urlOrKey.startsWith('uploads/')) {
    return urlOrKey.startsWith('/') ? urlOrKey : `/${urlOrKey}`;
  }

  // If URL is missing WordPress protocol/domain, explicitly prefix with process.env.WP_BASE_URL
  const wpBase = (typeof process !== 'undefined' && process.env && process.env.WP_BASE_URL)
    ? process.env.WP_BASE_URL.replace(/\/+$/, '')
    : '';

  if (wpBase) {
    // Avoid double prefixing if URL already starts with base URL
    const baseWithoutProtocol = wpBase.replace(/^https?:\/\//, '');
    if (urlOrKey.startsWith(wpBase)) {
      return urlOrKey;
    }
    if (urlOrKey.startsWith(baseWithoutProtocol)) {
      return `https://${urlOrKey}`;
    }

    const cleanPath = urlOrKey.startsWith('/') ? urlOrKey : `/${urlOrKey}`;
    return `${wpBase}${cleanPath}`;
  }

  return urlOrKey;
}

export function useResolvedImage(urlOrKey: string | undefined | null, fallback = CATEGORY_PLACEHOLDER): string {
  const effectiveFallback = fallback || CATEGORY_PLACEHOLDER;

  const [resolved, setResolved] = useState<string>(() => {
    if (!urlOrKey) return effectiveFallback;
    return normalizeImageKey(urlOrKey);
  });

  useEffect(() => {
    if (!urlOrKey) {
      setResolved(effectiveFallback);
      return;
    }
    setResolved(normalizeImageKey(urlOrKey));
  }, [urlOrKey, effectiveFallback]);

  return resolved;
}

export default useResolvedImage;
