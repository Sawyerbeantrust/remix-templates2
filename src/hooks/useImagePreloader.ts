import { useEffect, useState, useRef, useCallback } from 'react';
import { Product } from '../types';
import { normalizeImageKey } from './useResolvedImage';

// Module-level cache to track already preloaded URLs across component re-renders
const globalPreloadCache = new Set<string>();
const inFlightRequests = new Map<string, Promise<boolean>>();

/**
 * Imperatively preloads and decodes an image in the browser off-screen memory.
 */
export function preloadImage(urlOrKey: string): Promise<boolean> {
  if (!urlOrKey || typeof urlOrKey !== 'string') {
    return Promise.resolve(false);
  }

  const normalizedUrl = normalizeImageKey(urlOrKey);
  if (!normalizedUrl) {
    return Promise.resolve(false);
  }

  if (globalPreloadCache.has(normalizedUrl)) {
    return Promise.resolve(true);
  }

  if (inFlightRequests.has(normalizedUrl)) {
    return inFlightRequests.get(normalizedUrl)!;
  }

  const preloadPromise = new Promise<boolean>((resolve) => {
    const img = new Image();
    
    // Assign source to begin network fetch
    img.src = normalizedUrl;

    // Use browser asynchronous decoding API when available for stutter-free paint
    if ('decode' in img && typeof img.decode === 'function') {
      img.decode()
        .then(() => {
          globalPreloadCache.add(normalizedUrl);
          inFlightRequests.delete(normalizedUrl);
          resolve(true);
        })
        .catch(() => {
          // If decode fails or image errored, mark completed to avoid blocking queues
          globalPreloadCache.add(normalizedUrl);
          inFlightRequests.delete(normalizedUrl);
          resolve(false);
        });
    } else {
      img.onload = () => {
        globalPreloadCache.add(normalizedUrl);
        inFlightRequests.delete(normalizedUrl);
        resolve(true);
      };
      img.onerror = () => {
        globalPreloadCache.add(normalizedUrl);
        inFlightRequests.delete(normalizedUrl);
        resolve(false);
      };
    }
  });

  inFlightRequests.set(normalizedUrl, preloadPromise);
  return preloadPromise;
}

export interface UseImagePreloaderOptions {
  /** Number of leading images to fetch immediately in parallel (default: 8) */
  priorityCount?: number;
  /** Whether to also preload secondary/gallery images for products (default: false) */
  includeSecondaryImages?: boolean;
  /** Whether preloading is currently active (default: true) */
  enabled?: boolean;
  /** Callback triggered once all visible target images have finished preloading */
  onAllPreloaded?: () => void;
}

export interface UseImagePreloaderReturn {
  /** Total number of images extracted from the provided products/URLs */
  totalCount: number;
  /** Number of images successfully preloaded into memory cache */
  preloadedCount: number;
  /** True if images are currently being actively fetched */
  isPreloading: boolean;
  /** Helper to pre-fetch a single image on demand */
  preloadSingle: (url: string) => Promise<boolean>;
}

/**
 * Custom hook to preload images for visible products or URLs in a grid/list,
 * eliminating visual pop-in, layout shifts, and network latency during user browsing.
 */
export function useImagePreloader(
  itemsOrUrls: Array<Product | string | undefined | null>,
  options: UseImagePreloaderOptions = {}
): UseImagePreloaderReturn {
  const {
    priorityCount = 8,
    includeSecondaryImages = false,
    enabled = true,
    onAllPreloaded
  } = options;

  const [preloadedCount, setPreloadedCount] = useState<number>(0);
  const [isPreloading, setIsPreloading] = useState<boolean>(false);
  const isCancelledRef = useRef<boolean>(false);

  // Extract all candidate image URLs
  const imageUrls: string[] = [];
  for (const item of itemsOrUrls) {
    if (!item) continue;
    if (typeof item === 'string') {
      const norm = normalizeImageKey(item);
      if (norm && !imageUrls.includes(norm)) imageUrls.push(norm);
    } else if (typeof item === 'object') {
      if (item.image) {
        const norm = normalizeImageKey(item.image);
        if (norm && !imageUrls.includes(norm)) imageUrls.push(norm);
      }
      if (includeSecondaryImages && Array.isArray(item.images)) {
        for (const sec of item.images) {
          if (sec) {
            const normSec = normalizeImageKey(sec);
            if (normSec && !imageUrls.includes(normSec)) imageUrls.push(normSec);
          }
        }
      }
    }
  }

  const totalCount = imageUrls.length;

  useEffect(() => {
    if (!enabled || totalCount === 0) {
      setIsPreloading(false);
      return;
    }

    isCancelledRef.current = false;
    setIsPreloading(true);
    let loadedCounter = 0;

    const urlsToLoad = imageUrls.filter((url) => !globalPreloadCache.has(url));
    const alreadyCachedCount = totalCount - urlsToLoad.length;
    loadedCounter = alreadyCachedCount;
    setPreloadedCount(alreadyCachedCount);

    if (urlsToLoad.length === 0) {
      setIsPreloading(false);
      onAllPreloaded?.();
      return;
    }

    // Split into priority images (e.g. above-the-fold visible grid) and remaining background images
    const priorityUrls = urlsToLoad.slice(0, priorityCount);
    const deferredUrls = urlsToLoad.slice(priorityCount);

    let activeWorkers = 0;
    const maxConcurrency = 4;

    const handleImageLoaded = () => {
      if (isCancelledRef.current) return;
      loadedCounter++;
      setPreloadedCount(loadedCounter);

      if (loadedCounter >= totalCount) {
        setIsPreloading(false);
        onAllPreloaded?.();
      }
    };

    // 1. Immediately fetch high-priority visible images
    Promise.all(
      priorityUrls.map(async (url) => {
        await preloadImage(url);
        handleImageLoaded();
      })
    ).then(() => {
      if (isCancelledRef.current || deferredUrls.length === 0) return;

      // 2. Queue deferred images using requestIdleCallback or cooperative concurrency chunking
      const processDeferredQueue = () => {
        let index = 0;

        const next = () => {
          if (isCancelledRef.current || index >= deferredUrls.length) return;

          while (activeWorkers < maxConcurrency && index < deferredUrls.length) {
            const currentUrl = deferredUrls[index++];
            activeWorkers++;

            preloadImage(currentUrl).finally(() => {
              activeWorkers--;
              handleImageLoaded();
              next();
            });
          }
        };

        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
          (window as any).requestIdleCallback(() => next());
        } else {
          setTimeout(next, 50);
        }
      };

      processDeferredQueue();
    });

    return () => {
      isCancelledRef.current = true;
    };
  }, [JSON.stringify(imageUrls), enabled, priorityCount, totalCount]);

  const preloadSingle = useCallback((url: string) => {
    return preloadImage(url);
  }, []);

  return {
    totalCount,
    preloadedCount,
    isPreloading,
    preloadSingle
  };
}

export default useImagePreloader;
