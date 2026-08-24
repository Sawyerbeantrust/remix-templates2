import type React from 'react';

export const DEFAULT_FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&q=80&w=800&h=600';

/**
 * Fallback mapping for missing or legacy filenames to visually-similar existing image assets
 */
export const IMAGE_MAP: Record<string, string> = {
  'car_lift_1.jpg': '/assets/images/car_lift_1.jpg',
  'car_lift_2.jpg': '/assets/images/car_lift_2.jpg',
  'car_lift_3.jpg': '/assets/images/car_lift_3.jpg',
  'car_lift_4.jpg': '/assets/images/car_lift_4.jpg',
  'car_lift_5.jpg': '/assets/images/car_lift_5.jpg',
  'two_post_car_lift_1781792717809.jpg': '/assets/images/two_post_car_lift_1781792717809.jpg',
  'two_post_car_lift.jpg': '/assets/images/car_lift_1.jpg',
  'four_post_car_lift.jpg': '/assets/images/car_lift_3.jpg',
  'scissor_lift.jpg': '/assets/images/car_lift_2.jpg',
  'parking_lift.jpg': '/assets/images/car_lift_3.jpg',
  'spray_booth_1.jpg': '/assets/images/spray_booth_1.jpg',
  'spray_booth_2.jpg': '/assets/images/spray_booth_2.jpg',
  'spray_booth_3.jpg': '/assets/images/spray_booth_3.jpg',
  'spray_booth_4.jpg': '/assets/images/spray_booth_4.jpg',
  'welding_1.jpg': '/assets/images/welding_1.jpg',
  'welding_2.jpg': '/assets/images/welding_2.jpg',
  'welding_3.jpg': '/assets/images/welding_3.jpg',
  'welding_helmet.jpg': '/assets/images/welding_helmet.jpg',
  'workshop_tools_1.jpg': '/assets/images/workshop_tools_1.jpg',
  'workshop_tools_2.jpg': '/assets/images/workshop_tools_2.jpg',
  'filters_1.jpg': '/assets/images/filters_1.jpg',
  'ladder_1.jpg': '/assets/images/ladder_1.jpg',
  'wheel_care_1.jpg': '/assets/images/wheel_care_1.jpg',
  'wheel_care_2.jpg': '/assets/images/wheel_care_2.jpg',
  'protective_clothing.jpg': '/assets/images/protective_clothing.jpg',
  'garage_equipment_hero_1783937551956.jpg': '/assets/images/garage_equipment_hero_1783937551956.jpg',
  'garage_equipment_welder_hero_1783939957746.jpg': '/assets/images/garage_equipment_welder_hero_1783939957746.jpg',
  'killarney_gardens_map_1781354004848.jpg': '/assets/images/killarney_gardens_map_1781354004848.jpg',
  'modern_workshop_car_lift_1780988724101.png': '/assets/images/modern_workshop_car_lift_1780988724101.png',
  'banner_test.jpg': '/assets/images/garage_equipment_hero_1783937551956.jpg',
  'test.jpg': '/assets/images/workshop_tools_1.jpg',
  'test_cat.png': '/assets/images/car_lift_1.jpg'
};

/**
 * Extract clean filename from a path or URL (e.g. '/images/car_lift_1.jpg' -> 'car_lift_1.jpg')
 */
export function getFilenameFromPath(urlOrPath: string): string {
  if (!urlOrPath || typeof urlOrPath !== 'string') return '';
  const clean = urlOrPath.split('?')[0].split('#')[0];
  const lastSlash = clean.lastIndexOf('/');
  return lastSlash !== -1 ? clean.substring(lastSlash + 1) : clean;
}

/**
 * Normalize image paths to the client‑expected format
 */
export function normalizeImgPath(path: string): string {
  if (!path) return path;
  // Strip leading '/src/assets/images/' if present
  return path.replace(/^\/src\/assets\/images\//, '/images/');
}

/**
 * Generates the sequence of retry fallback URLs for a given image source.
 * Chain: /assets/images/{file} -> /images/{file} -> IMAGE_MAP -> fallbackSrc
 */
export function getNextImageFallbackUrl(currentSrc: string, currentStep: number, fallbackSrc: string = DEFAULT_FALLBACK_IMAGE): { nextUrl: string; nextStep: number } {
  if (!currentSrc || typeof currentSrc !== 'string') {
    return { nextUrl: fallbackSrc, nextStep: 99 };
  }

  // If it's a data URI, blob URI, or /uploads/ path, fallback directly to the default image without asset cycling
  if (currentSrc.startsWith('data:') || currentSrc.startsWith('blob:') || currentSrc.includes('/uploads/')) {
    return { nextUrl: fallbackSrc, nextStep: 99 };
  }

  const isLocalAsset = currentSrc.startsWith('/images/') || 
    currentSrc.startsWith('/assets/images/') || 
    currentSrc.startsWith('/src/assets/images/') ||
    currentSrc.startsWith('images/');

  const filename = getFilenameFromPath(currentSrc);
  
  if (!isLocalAsset || !filename || !filename.match(/\.(jpe?g|png|webp|gif|svg)$/i)) {
    return { nextUrl: fallbackSrc, nextStep: 99 };
  }

  switch (currentStep) {
    case 0:
      // Retry 1: /assets/images/{filename}
      return { nextUrl: `/assets/images/${filename}`, nextStep: 1 };
    case 1:
      // Retry 2: /images/{filename}
      return { nextUrl: `/images/${filename}`, nextStep: 2 };
    case 2: {
      // Retry 3: IMAGE_MAP lookup
      const mapped = IMAGE_MAP[filename];
      if (mapped && mapped !== currentSrc) {
        return { nextUrl: mapped, nextStep: 3 };
      }
      return { nextUrl: fallbackSrc, nextStep: 99 };
    }
    default:
      // Ultimate fallback - never render a blank img
      return { nextUrl: fallbackSrc, nextStep: 99 };
  }
}

/**
 * Standard DOM onError event handler with automatic fallback chain
 */
export function handleImageElementError(
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  fallbackSrc: string = DEFAULT_FALLBACK_IMAGE
) {
  const target = e.currentTarget;
  const currentSrc = target.src || '';
  const step = parseInt(target.dataset.fallbackStep || '0', 10);

  if (step >= 99) {
    return;
  }

  const { nextUrl, nextStep } = getNextImageFallbackUrl(currentSrc, step, fallbackSrc);
  target.dataset.fallbackStep = String(nextStep);
  target.src = nextUrl;
}
