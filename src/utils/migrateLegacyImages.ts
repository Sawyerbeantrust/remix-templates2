import { Product, FeaturedCategory } from '../types';

export function isLocalOrLegacyPath(pathStr?: string): boolean {
  if (!pathStr || typeof pathStr !== 'string') return false;
  if (pathStr.startsWith('http://') || pathStr.startsWith('https://') || pathStr.startsWith('data:') || pathStr.startsWith('blob:')) {
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
  if (!isLocalOrLegacyPath(imagePath)) return imagePath;

  const fileName = getFilename(imagePath);
  if (!fileName) return imagePath;

  // Try candidate URLs in order to fetch the local binary
  const candidateUrls = [
    imagePath,
    `/assets/images/${fileName}`,
    `/images/${fileName}`,
    `/src/assets/images/${fileName}`,
    `/src/assets/${fileName}`,
  ];

  let base64Data: string | null = null;
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

  if (!base64Data) {
    if (onStatus) onStatus(`⚠️ Could not read local file for ${fileName}`);
    return imagePath;
  }

  try {
    if (onStatus) onStatus(`Uploading ${fileName} to /api/upload-image...`);
    const res = await fetch('/api/upload-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: fileName, data: base64Data }),
    });

    if (res.ok) {
      const json = await res.json();
      const newPath = json.path || json.url;
      if (newPath && typeof newPath === 'string') {
        if (onStatus) onStatus(`✓ ${fileName} -> ${newPath.substring(0, 45)}...`);
        return newPath;
      }
    }
  } catch (err: any) {
    if (onStatus) onStatus(`✗ Upload failed for ${fileName}: ${err?.message || err}`);
  }
  return imagePath;
}

export async function migrateLegacyAssetsToBlob(
  products: Product[],
  featuredCategories: FeaturedCategory[],
  onProgress?: (msg: string) => void
): Promise<{
  updatedProducts: Product[];
  updatedCategories: FeaturedCategory[];
  migratedCount: number;
  unmatchedCount: number;
}> {
  let count = 0;
  let unmatched = 0;

  // Cache to avoid re-uploading the same file multiple times
  const uploadCache = new Map<string, string>();

  async function resolveAndUpload(originalPath: string): Promise<string> {
    if (!isLocalOrLegacyPath(originalPath)) return originalPath;
    const fn = getFilename(originalPath);
    if (!fn) return originalPath;

    if (uploadCache.has(fn)) {
      const cached = uploadCache.get(fn)!;
      if (cached !== originalPath) count++;
      return cached;
    }

    const newUrl = await uploadLegacyAsset(originalPath, onProgress);
    uploadCache.set(fn, newUrl);
    if (newUrl !== originalPath) {
      count++;
      return newUrl;
    } else {
      unmatched++;
      return originalPath;
    }
  }

  const updatedProducts: Product[] = [];
  for (const p of products) {
    let mainImg = p.image;
    if (isLocalOrLegacyPath(mainImg)) {
      if (onProgress) onProgress(`Processing product: ${p.name}`);
      mainImg = await resolveAndUpload(mainImg);
    }

    let galleryImgs = p.images;
    if (Array.isArray(galleryImgs)) {
      const newGallery: string[] = [];
      for (const gImg of galleryImgs) {
        if (isLocalOrLegacyPath(gImg)) {
          newGallery.push(await resolveAndUpload(gImg));
        } else {
          newGallery.push(gImg);
        }
      }
      galleryImgs = newGallery;
    }

    updatedProducts.push({
      ...p,
      image: mainImg,
      images: galleryImgs,
    });
  }

  const updatedCategories: FeaturedCategory[] = [];
  for (const c of featuredCategories) {
    let cImg = c.img;
    if (isLocalOrLegacyPath(cImg)) {
      if (onProgress) onProgress(`Processing category: ${c.name}`);
      cImg = await resolveAndUpload(cImg);
    }
    updatedCategories.push({
      ...c,
      img: cImg,
    });
  }

  return {
    updatedProducts,
    updatedCategories,
    migratedCount: count,
    unmatchedCount: unmatched,
  };
}

