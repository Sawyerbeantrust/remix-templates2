import { useState, useEffect } from 'react';

const CATEGORY_PLACEHOLDER = '/assets/images/spray_booth_1.jpg';

function normalizeImageKey(urlOrKey: string): string {
  if (!urlOrKey) return urlOrKey;
  if (urlOrKey.startsWith('http://') || urlOrKey.startsWith('https://') || urlOrKey.startsWith('data:') || urlOrKey.startsWith('blob:')) {
    return urlOrKey;
  }
  if (urlOrKey.startsWith('/images/') || urlOrKey.startsWith('/src/assets/images/') || urlOrKey.startsWith('images/') || urlOrKey.startsWith('/src/assets/') || urlOrKey.startsWith('/assets/images/')) {
    const filename = urlOrKey.split('?')[0].split('#')[0].split('/').filter(Boolean).pop();
    if (filename) return `/assets/images/${filename}`;
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
