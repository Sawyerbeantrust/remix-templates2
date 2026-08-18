// IndexedDB storage utility for large image blobs (base64 or binary data)
// Prevents localStorage QuotaExceededError when uploading custom product or category images.

const DB_NAME = 'triton_image_store';
const STORE_NAME = 'images';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

export async function getItem(key: string): Promise<string | null> {
  try {
    if (!key) return null;
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        console.error(`[imageStore] Failed to get item with key ${key}:`, request.error);
        resolve(null);
      };
    });
  } catch (err) {
    console.error(`[imageStore] Error opening IndexedDB for getItem (${key}):`, err);
    return null;
  }
}

export async function setItem(key: string, value: string): Promise<boolean> {
  try {
    if (!key || !value) return false;
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(value, key);

      request.onsuccess = () => {
        resolve(true);
      };

      request.onerror = () => {
        console.error(`[imageStore] Failed to set item with key ${key}:`, request.error);
        resolve(false);
      };

      transaction.onerror = () => {
        console.error(`[imageStore] Transaction error setting key ${key}:`, transaction.error);
        resolve(false);
      };
    });
  } catch (err) {
    console.error(`[imageStore] Error opening IndexedDB for setItem (${key}):`, err);
    return false;
  }
}

export async function removeItem(key: string): Promise<boolean> {
  try {
    if (!key) return false;
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(key);

      request.onsuccess = () => {
        resolve(true);
      };

      request.onerror = () => {
        console.error(`[imageStore] Failed to remove item with key ${key}:`, request.error);
        resolve(false);
      };
    });
  } catch (err) {
    console.error(`[imageStore] Error opening IndexedDB for removeItem (${key}):`, err);
    return false;
  }
}

export async function getAllKeys(): Promise<string[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAllKeys();

      request.onsuccess = () => {
        resolve((request.result as string[]) || []);
      };

      request.onerror = () => {
        console.error('[imageStore] Failed to get all keys:', request.error);
        resolve([]);
      };
    });
  } catch (err) {
    console.error('[imageStore] Error opening IndexedDB for getAllKeys:', err);
    return [];
  }
}

// In-memory runtime cache for rapid key -> dataUrl lookups without repeated IDB queries
const runtimeImageCache = new Map<string, string>();

/**
 * Helper function to save a base64 image into IndexedDB and return an image key reference.
 * If the input is already a file path or URL (not base64 data), returns the url as is.
 */
export async function saveImageBlob(imageInput: string, prefix = 'img_store'): Promise<string> {
  if (!imageInput) return imageInput;
  if (!imageInput.startsWith('data:image')) {
    return imageInput; // Already a URL or file path
  }

  const key = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const success = await setItem(key, imageInput);
  if (success) {
    runtimeImageCache.set(key, imageInput);
    return key;
  } else {
    throw new Error('Failed to save image to IndexedDB persistent storage');
  }
}

/**
 * Resolves an image URL or key. If it's a key in IndexedDB (e.g. starts with img_store_ or category_image_),
 * fetches the actual base64 string from IndexedDB or memory cache.
 */
export async function resolveImageUrl(urlOrKey: string): Promise<string> {
  if (!urlOrKey) return '/placeholder.jpg';
  if (urlOrKey.startsWith('data:image') || urlOrKey.startsWith('/') || urlOrKey.startsWith('http://') || urlOrKey.startsWith('https://')) {
    return urlOrKey;
  }

  // Check runtime cache
  if (runtimeImageCache.has(urlOrKey)) {
    return runtimeImageCache.get(urlOrKey)!;
  }

  // Fetch from IndexedDB
  const storedData = await getItem(urlOrKey);
  if (storedData) {
    runtimeImageCache.set(urlOrKey, storedData);
    return storedData;
  }

  // Fallback if not found
  return urlOrKey;
}

export async function getAllEntries(): Promise<Record<string, string>> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.openCursor();
      const result: Record<string, string> = {};

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          result[cursor.key as string] = cursor.value as string;
          cursor.continue();
        } else {
          resolve(result);
        }
      };

      request.onerror = () => {
        console.error('[imageStore] Failed to get all entries:', request.error);
        resolve(result);
      };
    });
  } catch (err) {
    console.error('[imageStore] Error opening IndexedDB for getAllEntries:', err);
    return {};
  }
}

export async function setAllEntries(entries: Record<string, string>): Promise<boolean> {
  try {
    if (!entries || typeof entries !== 'object') return false;
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const keys = Object.keys(entries);
      if (keys.length === 0) {
        resolve(true);
        return;
      }

      for (const key of keys) {
        if (key && entries[key]) {
          store.put(entries[key], key);
          runtimeImageCache.set(key, entries[key]);
        }
      }

      transaction.oncomplete = () => {
        resolve(true);
      };

      transaction.onerror = () => {
        console.error('[imageStore] Failed to set all entries:', transaction.error);
        resolve(false);
      };
    });
  } catch (err) {
    console.error('[imageStore] Error opening IndexedDB for setAllEntries:', err);
    return false;
  }
}

export const imageStore = {
  getItem,
  setItem,
  removeItem,
  getAllKeys,
  getAllEntries,
  setAllEntries,
  saveImageBlob,
  resolveImageUrl,
  runtimeImageCache
};

export default imageStore;
