import { ProjectAssetImage } from '../types/console.js';
import { safeLocalStorage } from './safeStorage.js';

export const TRITON_MEDIA_SYNC_EVENT = 'triton:media-storage-sync';

export interface MediaSyncPayload {
  action: 'upload' | 'delete' | 'assign' | 'migrate' | 'refresh';
  url?: string;
  id?: string | number;
  timestamp: number;
}

/**
 * Dispatches a global event and updates local storage to notify all components
 * (MediaStorageTab, AssetPickerModal, ProductsTab, etc.) of media mutations in real time.
 */
export function notifyMediaStorageChanged(action: MediaSyncPayload['action'] = 'refresh', extra?: Partial<MediaSyncPayload>) {
  const payload: MediaSyncPayload = {
    action,
    timestamp: Date.now(),
    ...extra,
  };

  try {
    // Notify same-window listeners
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(TRITON_MEDIA_SYNC_EVENT, { detail: payload }));
    }
  } catch (err) {
    console.warn('[mediaSync] Error dispatching custom event:', err);
  }

  try {
    // Update local storage key to trigger cross-tab / storage listeners
    safeLocalStorage.setItem('triton_media_last_sync', String(Date.now()));
  } catch (err) {
    // silent fallback
  }
}

/**
 * Subscribes a callback to media storage changes (both in-app custom events and localStorage storage events)
 */
export function subscribeToMediaStorage(callback: (payload?: MediaSyncPayload) => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleCustomEvent = (event: Event) => {
    const customEv = event as CustomEvent<MediaSyncPayload>;
    callback(customEv.detail);
  };

  const handleStorageEvent = (event: StorageEvent) => {
    if (event.key === 'triton_media_last_sync' || event.key === 'triton_custom_assets') {
      callback({ action: 'refresh', timestamp: Date.now() });
    }
  };

  window.addEventListener(TRITON_MEDIA_SYNC_EVENT, handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);

  return () => {
    window.removeEventListener(TRITON_MEDIA_SYNC_EVENT, handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
  };
}

/**
 * Fetches the latest WordPress Media list from /api/list-images and formats them as ProjectAssetImages
 */
export async function fetchWordPressMediaAssets(): Promise<ProjectAssetImage[]> {
  try {
    const res = await fetch('/api/list-images');
    if (!res.ok) return [];

    const data = await res.json();
    if (data.success && Array.isArray(data.images)) {
      return data.images.map((img: any) => {
        const url = img.url || '';
        const filename = img.filename || url.split('/').pop() || 'Media Asset';
        const label = filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

        return {
          id: img.id || url,
          path: url,
          url: url,
          thumbnail: url,
          originalUrl: url,
          label: label.charAt(0).toUpperCase() + label.slice(1),
          category: 'wp-media',
          isCustom: true,
        };
      });
    }
  } catch (err) {
    console.warn('[mediaSync] Failed to fetch WordPress media assets:', err);
  }
  return [];
}
