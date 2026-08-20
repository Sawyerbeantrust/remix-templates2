import { Product, FeaturedCategory } from '../types';

export function isLocalOrLegacyPath(pathStr?: string): boolean {
  if (!pathStr || typeof pathStr !== 'string') return false;
  if (pathStr.startsWith('http://') || pathStr.startsWith('https://') || pathStr.startsWith('blob:')) {
    return false;
  }
  return true;
}

export function getFilename(pathStr: string): string {
  if (!pathStr) return '';
  return pathStr.split('?')[0].split('#')[0].split('/').filter(Boolean).pop() || '';
}

export async function fetchAndConvertToBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          resolve(null);
        }
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    return null;
  }
}

export async function uploadLegacyAsset(imagePath: string, onStatus?: (msg: string) => void): Promise<string> {
  if (!isLocalOrLegacyPath(imagePath) && !imagePath.startsWith('data:image')) return imagePath;

  const fileName = getFilename(imagePath) || `image_${Date.now()}.jpg`;

  let base64Data: string | null = null;
  if (imagePath.startsWith('data:image')) {
    base64Data = imagePath;
  } else {
    // Try candidate URLs in order to fetch the local binary
    const candidateUrls = [
      imagePath,
      `/assets/images/${fileName}`,
      `/images/${fileName}`,
      `/src/assets/images/${fileName}`,
      `/src/assets/${fileName}`,
    ];

    for (const testUrl of candidateUrls) {
      try {
        base64Data = await fetchAndConvertToBase64(testUrl);
        if (base64Data && base64Data.length > 50) {
          break;
        }
      } catch {
        // Continue to next candidate
      }
    }
  }

  if (!base64Data) {
    if (onStatus) onStatus(`⚠️ Could not read local asset for ${fileName}`);
    return imagePath;
  }

  try {
    if (onStatus) onStatus(`Uploading ${fileName} to WordPress Media...`);
    const res = await fetch('/api/upload-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: fileName, data: base64Data }),
    });

    if (res.ok) {
      const json = await res.json();
      const newPath = json.path || json.url;
      if (newPath && typeof newPath === 'string') {
        if (onStatus) onStatus(`✓ ${fileName} -> ${newPath.substring(0, 50)}...`);
        return newPath;
      }
    }
  } catch (err: any) {
    if (onStatus) onStatus(`✗ Upload failed for ${fileName}: ${err?.message || err}`);
  }
  return imagePath;
}

/**
 * Migrates all default local images in the catalog to WordPress media library.
 */
export async function migrateDefaultImagesToWordPress(
  products: Product[],
  featuredCategories: FeaturedCategory[],
  onProgress?: (msg: string) => void
): Promise<{
  updatedProducts: Product[];
  updatedCategories: FeaturedCategory[];
  uploaded: number;
  replaced: number;
  map: Record<string, string>;
}> {
  let uploadedCount = 0;
  let replacedCount = 0;
  const urlMap: Record<string, string> = {};

  // Step 1: Collect unique default image paths
  const uniquePaths = new Set<string>();
  products.forEach(p => {
    if (p.image && isLocalOrLegacyPath(p.image)) uniquePaths.add(p.image);
    if (Array.isArray(p.images)) {
      p.images.forEach(img => {
        if (img && isLocalOrLegacyPath(img)) uniquePaths.add(img);
      });
    }
  });
  featuredCategories.forEach(c => {
    if (c.img && isLocalOrLegacyPath(c.img)) uniquePaths.add(c.img);
  });

  if (onProgress) onProgress(`Found ${uniquePaths.size} unique local image assets to migrate to WordPress.`);

  // Step 2: Upload each unique local image
  for (const originalPath of uniquePaths) {
    const fn = getFilename(originalPath);
    if (onProgress) onProgress(`Processing asset: ${fn || originalPath}`);
    const newUrl = await uploadLegacyAsset(originalPath, onProgress);
    if (newUrl && newUrl !== originalPath) {
      urlMap[originalPath] = newUrl;
      uploadedCount++;
    }
  }

  // Step 3: Replace in products and categories
  const updatedProducts = products.map(p => {
    let mainImg = p.image;
    if (mainImg && urlMap[mainImg]) {
      mainImg = urlMap[mainImg];
      replacedCount++;
    }

    let gallery = p.images;
    if (Array.isArray(gallery)) {
      gallery = gallery.map(img => {
        if (img && urlMap[img]) {
          replacedCount++;
          return urlMap[img];
        }
        return img;
      });
    }

    return { ...p, image: mainImg, images: gallery };
  });

  const updatedCategories = featuredCategories.map(c => {
    let catImg = c.img;
    if (catImg && urlMap[catImg]) {
      catImg = urlMap[catImg];
      replacedCount++;
    }
    return { ...c, img: catImg };
  });

  return {
    updatedProducts,
    updatedCategories,
    uploaded: uploadedCount,
    replaced: replacedCount,
    map: urlMap,
  };
}

/**
 * Scans catalog for legacy Vercel Blob URLs or raw base64 data URIs and rewrites/migrates them to WordPress.
 */
export async function fixLegacyImageUrls(
  products: Product[],
  featuredCategories: FeaturedCategory[],
  onProgress?: (msg: string) => void
): Promise<{
  updatedProducts: Product[];
  updatedCategories: FeaturedCategory[];
  fixedCount: number;
  map: Record<string, string>;
}> {
  let fixed = 0;
  const urlMap: Record<string, string> = {};

  const isLegacy = (url?: string) => {
    if (!url || typeof url !== 'string') return false;
    return url.includes('blob.vercel-storage.com') || url.startsWith('data:image');
  };

  const uniqueLegacyUrls = new Set<string>();
  products.forEach(p => {
    if (isLegacy(p.image)) uniqueLegacyUrls.add(p.image);
    if (Array.isArray(p.images)) {
      p.images.forEach(img => {
        if (isLegacy(img)) uniqueLegacyUrls.add(img);
      });
    }
  });
  featuredCategories.forEach(c => {
    if (isLegacy(c.img)) uniqueLegacyUrls.add(c.img);
  });

  if (onProgress) onProgress(`Found ${uniqueLegacyUrls.size} legacy URLs/base64 to process.`);

  for (const legUrl of uniqueLegacyUrls) {
    if (legUrl.startsWith('data:image')) {
      const fn = `data_image_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.jpg`;
      try {
        if (onProgress) onProgress(`Uploading embedded data URI to WordPress Media...`);
        const res = await fetch('/api/upload-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: fn, data: legUrl }),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.path) {
            urlMap[legUrl] = json.path;
            fixed++;
          }
        }
      } catch (err) {
        if (onProgress) onProgress(`⚠️ Could not upload data URI: ${err}`);
      }
    } else if (legUrl.includes('blob.vercel-storage.com')) {
      // Try to fetch it; if frozen/403/404, gracefully skip
      try {
        if (onProgress) onProgress(`Attempting to retrieve ${legUrl.substring(0, 50)}...`);
        const base64 = await fetchAndConvertToBase64(legUrl);
        if (base64) {
          const fn = getFilename(legUrl) || `legacy_asset_${Date.now()}.jpg`;
          const res = await fetch('/api/upload-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: fn, data: base64 }),
          });
          if (res.ok) {
            const json = await res.json();
            if (json.path) {
              urlMap[legUrl] = json.path;
              fixed++;
              if (onProgress) onProgress(`✓ Migrated to ${json.path}`);
            }
          }
        } else {
          if (onProgress) onProgress(`⚠️ Note: Legacy Vercel Blob URL was unreachable/frozen. Skipping without error.`);
        }
      } catch (err) {
        if (onProgress) onProgress(`⚠️ Note: Legacy Vercel Blob URL unreachable. Skipping.`);
      }
    }
  }

  const updatedProducts = products.map(p => {
    let mainImg = p.image;
    if (mainImg && urlMap[mainImg]) {
      mainImg = urlMap[mainImg];
    }
    let gallery = p.images;
    if (Array.isArray(gallery)) {
      gallery = gallery.map(img => (img && urlMap[img] ? urlMap[img] : img));
    }
    return { ...p, image: mainImg, images: gallery };
  });

  const updatedCategories = featuredCategories.map(c => {
    let catImg = c.img;
    if (catImg && urlMap[catImg]) {
      catImg = urlMap[catImg];
    }
    return { ...c, img: catImg };
  });

  return {
    updatedProducts,
    updatedCategories,
    fixedCount: fixed,
    map: urlMap,
  };
}

// Backward compatibility export alias
export async function migrateLegacyAssetsToBlob(
  products: Product[],
  featuredCategories: FeaturedCategory[],
  onProgress?: (msg: string) => void
) {
  const res = await migrateDefaultImagesToWordPress(products, featuredCategories, onProgress);
  return {
    updatedProducts: res.updatedProducts,
    updatedCategories: res.updatedCategories,
    migratedCount: res.uploaded,
    unmatchedCount: 0,
  };
}
