import { Product, FeaturedCategory } from '../types';

/**
 * Formats and cleans image URLs returned from WordPress / backend uploads,
 * ensuring trailing query parameters (e.g. ?resize=..., ?v=..., etc.) are stripped so image resolution is not broken.
 */
export function cleanImageUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    return url;
  }
  // Leave base64 data and blob URIs intact
  if (url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }

  try {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const parsed = new URL(url);
      return `${parsed.origin}${parsed.pathname}`;
    }
    const qIdx = url.indexOf('?');
    if (qIdx !== -1) {
      return url.substring(0, qIdx);
    }
  } catch {
    const qIdx = url.indexOf('?');
    if (qIdx !== -1) {
      return url.substring(0, qIdx);
    }
  }

  return url;
}

/**
 * Helper function to compress and resize images (base64 or data URLs) before uploading to /api/upload-image.
 * Resizes large dimensions to fit within maxWidth/maxHeight and encodes to compressed JPEG.
 */
export async function compressAndResizeBase64Image(
  base64Str: string,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.8
): Promise<string> {
  if (!base64Str || typeof window === 'undefined') {
    return base64Str;
  }

  const formattedInput = base64Str.startsWith('data:')
    ? base64Str
    : `data:image/jpeg;base64,${base64Str}`;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        let width = img.width;
        let height = img.height;

        // Calculate aspect ratio resizing if dimensions exceed maximums
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(base64Str);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);

        if (compressedDataUrl) {
          resolve(compressedDataUrl);
        } else {
          resolve(base64Str);
        }
      } catch (err) {
        console.warn('[Image Compress Warning] Canvas compression failed, using original image:', err);
        resolve(base64Str);
      }
    };

    img.onerror = (err) => {
      console.warn('[Image Compress Warning] Image load failed, using original image:', err);
      resolve(base64Str);
    };

    img.src = formattedInput;
  });
}

export async function processCategoryForStorage(category: FeaturedCategory): Promise<FeaturedCategory> {
  if (!category.img || !category.img.startsWith('data:image')) {
    return category;
  }
  const uniqueKey = `category_image_${category.id || 'cat'}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const compressedImg = await compressAndResizeBase64Image(category.img);
  
  const response = await fetch('/api/upload-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: `${uniqueKey}.jpg`, data: compressedImg })
  });
  const result = await response.json();
  if (!result || !result.success) {
    throw new Error(`Failed to upload category image for '${category.name}'`);
  }

  const rawUrl = result.url || result.path;
  return {
    ...category,
    img: cleanImageUrl(rawUrl)
  };
}

export async function processCategoriesForStorage(categories: FeaturedCategory[]): Promise<FeaturedCategory[]> {
  const processed = await Promise.all(
    categories.map(cat => processCategoryForStorage(cat))
  );
  return processed;
}

export async function processProductForStorage(product: Product): Promise<Product> {
  let updatedProd = { ...product };
  
  if (updatedProd.image && updatedProd.image.startsWith('data:image')) {
    const uniqueKey = `product_cover_${updatedProd.id || 'prod'}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const compressedImg = await compressAndResizeBase64Image(updatedProd.image);
    const response = await fetch('/api/upload-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: `${uniqueKey}.jpg`, data: compressedImg })
    });
    const result = await response.json();
    if (!result || !result.success) {
      throw new Error(`Failed to upload cover image for '${updatedProd.name}'`);
    }
    const rawUrl = result.url || result.path;
    updatedProd.image = cleanImageUrl(rawUrl);
  }

  if (Array.isArray(updatedProd.images)) {
    const newImages = await Promise.all(
      updatedProd.images.map(async (img, idx) => {
        if (img && img.startsWith('data:image')) {
          const uniqueKey = `product_gallery_${updatedProd.id || 'prod'}_${idx}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          const compressedImg = await compressAndResizeBase64Image(img);
          const response = await fetch('/api/upload-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: `${uniqueKey}.jpg`, data: compressedImg })
          });
          const result = await response.json();
          if (!result || !result.success) {
            throw new Error(`Failed to upload gallery image for '${updatedProd.name}'`);
          }
          const rawUrl = result.url || result.path;
          return cleanImageUrl(rawUrl);
        }
        return img;
      })
    );
    updatedProd.images = newImages;
  }

  return updatedProd;
}

export async function processProductsForStorage(products: Product[]): Promise<Product[]> {
  const processed = await Promise.all(
    products.map(prod => processProductForStorage(prod))
  );
  return processed;
}



