import { Product, FeaturedCategory } from '../types';

/**
 * Shared helper to upload an image file from a user device directly to WordPress Media Library.
 * 1. Reads the file as a data URI using FileReader.
 * 2. POSTs JSON { name: file.name, data: <dataUri> } to /api/upload-image.
 * 3. Returns the WordPress Media URL on success.
 * 4. Throws an Error with server message on failure.
 */
export async function uploadImageToWordPress(file: File): Promise<string> {
  const dataUri = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read image file as data URL.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read local image file from device.'));
    reader.readAsDataURL(file);
  });

  const response = await fetch('/api/upload-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: file.name, data: dataUri }),
  }).catch((netErr) => {
    throw new Error(`Network error communicating with WordPress: ${netErr?.message || netErr}`);
  });

  const text = await response.text().catch(() => '');
  let data: any = {};
  try {
    if (text) data = JSON.parse(text);
  } catch {
    throw new Error(`Server returned status ${response.status} with non-JSON response: ${text.substring(0, 120)}`);
  }

  if (!response.ok || !data.success) {
    const serverErr = data?.error || `Upload failed with HTTP ${response.status}`;
    throw new Error(serverErr);
  }

  const wpUrl = data.url || data.path;
  if (!wpUrl) {
    throw new Error('WordPress did not return a valid media URL in response.');
  }

  return wpUrl;
}

/**
 * Helper to upload a base64 / data:image string to WordPress Media Library.
 */
export async function uploadDataUriToWordPress(dataUri: string, filename?: string): Promise<string> {
  const fn = filename || `wp_asset_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.jpg`;
  const response = await fetch('/api/upload-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: fn, data: dataUri }),
  }).catch((netErr) => {
    throw new Error(`Network error uploading to WordPress: ${netErr?.message || netErr}`);
  });

  const text = await response.text().catch(() => '');
  let data: any = {};
  try {
    if (text) data = JSON.parse(text);
  } catch {
    throw new Error(`Server returned status ${response.status} with non-JSON response`);
  }

  if (!response.ok || !data.success) {
    const serverErr = data?.error || `Upload failed with HTTP ${response.status}`;
    throw new Error(serverErr);
  }

  const wpUrl = data.url || data.path;
  if (!wpUrl) {
    throw new Error('WordPress did not return a valid media URL in response.');
  }

  return wpUrl;
}

/**
 * Scans all products, product galleries, and featured categories for any "data:image" URIs,
 * uploads them to the WordPress Media Library, replaces the data URIs with WordPress URLs,
 * and logs each replacement as "[Auto-Sync] base64 image uploaded to WordPress Media".
 */
export async function autoSyncCatalogImages(
  products: Product[],
  featuredCategories: FeaturedCategory[]
): Promise<{
  sanitizedProducts: Product[];
  sanitizedCategories: FeaturedCategory[];
  replacedCount: number;
}> {
  let replacedCount = 0;
  const base64ToWpUrlMap = new Map<string, string>();

  // Collect all unique base64 / data:image strings
  const base64Set = new Set<string>();
  for (const p of products) {
    if (p.image && typeof p.image === 'string' && p.image.startsWith('data:image')) {
      base64Set.add(p.image);
    }
    if (Array.isArray(p.images)) {
      for (const img of p.images) {
        if (img && typeof img === 'string' && img.startsWith('data:image')) {
          base64Set.add(img);
        }
      }
    }
  }
  for (const c of featuredCategories) {
    if (c.img && typeof c.img === 'string' && c.img.startsWith('data:image')) {
      base64Set.add(c.img);
    }
  }

  // Upload each base64 data URI to WordPress Media
  for (const dataUri of base64Set) {
    try {
      const wpUrl = await uploadDataUriToWordPress(dataUri);
      base64ToWpUrlMap.set(dataUri, wpUrl);
      replacedCount++;
      console.log(`[Auto-Sync] base64 image uploaded to WordPress Media: ${wpUrl}`);
    } catch (err: any) {
      console.warn(`[Auto-Sync] Failed to upload base64 image to WordPress:`, err?.message || err);
    }
  }

  const sanitizedProducts = products.map((p) => {
    let mainImg = p.image;
    if (mainImg && base64ToWpUrlMap.has(mainImg)) {
      mainImg = base64ToWpUrlMap.get(mainImg)!;
    }
    let gallery = p.images;
    if (Array.isArray(gallery)) {
      gallery = gallery.map((img) => (img && base64ToWpUrlMap.has(img) ? base64ToWpUrlMap.get(img)! : img));
    }
    return { ...p, image: mainImg, images: gallery };
  });

  const sanitizedCategories = featuredCategories.map((c) => {
    let catImg = c.img;
    if (catImg && base64ToWpUrlMap.has(catImg)) {
      catImg = base64ToWpUrlMap.get(catImg)!;
    }
    return { ...c, img: catImg };
  });

  return { sanitizedProducts, sanitizedCategories, replacedCount };
}
