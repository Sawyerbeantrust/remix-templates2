import { useState, useEffect } from 'react';
import { imageStore } from '../utils/imageStore';

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
    const normalized = normalizeImageKey(urlOrKey);
    if (normalized.startsWith('data:') || normalized.startsWith('/') || normalized.startsWith('http://') || normalized.startsWith('https://') || normalized.startsWith('blob:')) {
      return normalized;
    }
    if (imageStore.runtimeImageCache.has(urlOrKey)) {
      return imageStore.runtimeImageCache.get(urlOrKey)!;
    }
    return effectiveFallback;
  });

  useEffect(() => {
    let isMounted = true;

    if (!urlOrKey) {
      setResolved(effectiveFallback);
      return;
    }

    const normalized = normalizeImageKey(urlOrKey);
    if (normalized.startsWith('data:') || normalized.startsWith('/') || normalized.startsWith('http://') || normalized.startsWith('https://') || normalized.startsWith('blob:')) {
      setResolved(normalized);
      return;
    }

    if (imageStore.runtimeImageCache.has(urlOrKey)) {
      setResolved(imageStore.runtimeImageCache.get(urlOrKey)!);
      return;
    }

    imageStore.resolveImageUrl(urlOrKey).then((dataUrl) => {
      if (isMounted) {
        if (dataUrl && typeof dataUrl === 'string' && dataUrl.trim() !== '') {
          setResolved(dataUrl);
        } else {
          setResolved(effectiveFallback);
        }
      }
    }).catch(() => {
      if (isMounted) {
        setResolved(effectiveFallback);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [urlOrKey, effectiveFallback]);

  return resolved;
}

export default useResolvedImage;
