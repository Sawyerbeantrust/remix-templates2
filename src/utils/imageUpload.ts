import { Product, FeaturedCategory } from '../types';

/**
 * Shared helper to upload an image file from a user device directly to WordPress Media Library.
 * 1. Reads the file as a data URI using FileReader.
 * 2. POSTs JSON { name: file.name, data: <dataUri> } to /api/upload-image.
 * 3. Validates that the returned URL is a permanent WordPress URL (http:// or https://).
 * 4. Throws an Error if WordPress upload fails or returns any local/data URI.
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
    throw new Error(`Upload failed: WordPress Media Library did not accept the image. Check WP_AUTH_TOKEN/Application Password and Cloudflare WAF. (${netErr?.message || 'Network error'})`);
  });

  const text = await response.text().catch(() => '');
  let data: any = {};
  try {
    if (text) data = JSON.parse(text);
  } catch {
    throw new Error('Upload failed: WordPress Media Library did not accept the image. Check WP_AUTH_TOKEN/Application Password and Cloudflare WAF.');
  }

  if (!response.ok || !data || data.success !== true) {
    const detailMsg = data?.details || data?.error || `HTTP ${response.status}`;
    throw new Error(`Upload failed: WordPress Media Library did not accept the image. Check WP_AUTH_TOKEN/Application Password and Cloudflare WAF. (${detailMsg})`);
  }

  const finalUrl = data.url || data.path;
  if (
    !finalUrl ||
    typeof finalUrl !== 'string' ||
    !(finalUrl.startsWith('http://') || finalUrl.startsWith('https://')) ||
    finalUrl.startsWith('data:image') ||
    finalUrl.startsWith('/assets/images') ||
    finalUrl.startsWith('/src/assets') ||
    finalUrl.startsWith('/images') ||
    finalUrl.startsWith('blob:')
  ) {
    throw new Error('Upload failed: WordPress Media Library did not accept the image. Check WP_AUTH_TOKEN/Application Password and Cloudflare WAF.');
  }

  console.log('[Upload Image] Uploaded to WordPress Media:', finalUrl);
  return finalUrl;
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
    throw new Error(`Upload failed: WordPress Media Library did not accept the image. Check WP_AUTH_TOKEN/Application Password and Cloudflare WAF. (${netErr?.message || 'Network error'})`);
  });

  const text = await response.text().catch(() => '');
  let data: any = {};
  try {
    if (text) data = JSON.parse(text);
  } catch {
    throw new Error('Upload failed: WordPress Media Library did not accept the image. Check WP_AUTH_TOKEN/Application Password and Cloudflare WAF.');
  }

  if (!response.ok || !data || data.success !== true) {
    const detailMsg = data?.details || data?.error || `HTTP ${response.status}`;
    throw new Error(`Upload failed: WordPress Media Library did not accept the image. Check WP_AUTH_TOKEN/Application Password and Cloudflare WAF. (${detailMsg})`);
  }

  const finalUrl = data.url || data.path;
  if (
    !finalUrl ||
    typeof finalUrl !== 'string' ||
    !(finalUrl.startsWith('http://') || finalUrl.startsWith('https://')) ||
    finalUrl.startsWith('data:image') ||
    finalUrl.startsWith('/assets/images') ||
    finalUrl.startsWith('/src/assets') ||
    finalUrl.startsWith('/images') ||
    finalUrl.startsWith('blob:')
  ) {
    throw new Error('Upload failed: WordPress Media Library did not accept the image. Check WP_AUTH_TOKEN/Application Password and Cloudflare WAF.');
  }

  console.log('[Upload Image] Uploaded to WordPress Media:', finalUrl);
  return finalUrl;
}

/**
 * Scans all products, product galleries, and featured categories for any "data:image" or "blob:" URIs,
 * uploads them to the WordPress Media Library, replaces the data URIs with WordPress URLs.
 * If any upload fails, aborts the catalog save by throwing an error.
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

  // Collect all unique base64 / data:image / blob: strings
  const unpersistedSet = new Set<string>();
  for (const p of products) {
    if (p.image && typeof p.image === 'string' && (p.image.startsWith('data:image') || p.image.startsWith('blob:'))) {
      unpersistedSet.add(p.image);
    }
    if (Array.isArray(p.images)) {
      for (const img of p.images) {
        if (img && typeof img === 'string' && (img.startsWith('data:image') || img.startsWith('blob:'))) {
          unpersistedSet.add(img);
        }
      }
    }
  }
  for (const c of featuredCategories) {
    if (c.img && typeof c.img === 'string' && (c.img.startsWith('data:image') || c.img.startsWith('blob:'))) {
      unpersistedSet.add(c.img);
    }
  }

  // Upload each unpersisted image URI to WordPress Media - throw on failure to abort save
  for (const dataUri of unpersistedSet) {
    const wpUrl = await uploadDataUriToWordPress(dataUri);
    base64ToWpUrlMap.set(dataUri, wpUrl);
    replacedCount++;
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

  // Verify no data:image or blob: strings remain
  for (const p of sanitizedProducts) {
    if (p.image && (p.image.startsWith('data:image') || p.image.startsWith('blob:'))) {
      throw new Error('Upload failed: WordPress Media Library did not accept the image. Check WP_AUTH_TOKEN/Application Password and Cloudflare WAF.');
    }
    if (p.image && p.image.startsWith('/assets/images')) {
      console.warn('[Catalog Save] Warning: local asset image path detected on product SKU', p.modelCode, p.image);
    }
    if (Array.isArray(p.images)) {
      for (const img of p.images) {
        if (img && (img.startsWith('data:image') || img.startsWith('blob:'))) {
          throw new Error('Upload failed: WordPress Media Library did not accept the image. Check WP_AUTH_TOKEN/Application Password and Cloudflare WAF.');
        }
        if (img && img.startsWith('/assets/images')) {
          console.warn('[Catalog Save] Warning: local asset image path detected in gallery on product SKU', p.modelCode, img);
        }
      }
    }
  }
  for (const c of sanitizedCategories) {
    if (c.img && (c.img.startsWith('data:image') || c.img.startsWith('blob:'))) {
      throw new Error('Upload failed: WordPress Media Library did not accept the image. Check WP_AUTH_TOKEN/Application Password and Cloudflare WAF.');
    }
    if (c.img && c.img.startsWith('/assets/images')) {
      console.warn('[Catalog Save] Warning: local asset image path detected on category', c.name, c.img);
    }
  }

  console.log('[Catalog Save] All images normalized to WordPress URLs before save.');

  return { sanitizedProducts, sanitizedCategories, replacedCount };
}
