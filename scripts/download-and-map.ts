import fs from 'fs';
import path from 'path';
import { PRODUCTS } from '../src/data/products';

// Curated beautiful Unsplash images for a high-end workshop and showroom look
const CURATED_IMAGES = [
  // Car Lifts
  { key: 'car_lift_1.jpg', url: 'https://images.unsplash.com/photo-1563720223185-11003d516935?q=80&w=600&auto=format&fit=crop' },
  { key: 'car_lift_2.jpg', url: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?q=80&w=600&auto=format&fit=crop' },
  { key: 'car_lift_3.jpg', url: 'https://images.unsplash.com/photo-1617531653332-bd46c24f2068?q=80&w=600&auto=format&fit=crop' },
  { key: 'car_lift_4.jpg', url: 'https://images.unsplash.com/photo-1517524206127-48bbd363f3d7?q=80&w=600&auto=format&fit=crop' },
  { key: 'car_lift_5.jpg', url: 'https://images.unsplash.com/photo-1507136566006-cfc505b114fc?q=80&w=600&auto=format&fit=crop' },
  
  // Spray Booths
  { key: 'spray_booth_1.jpg', url: 'https://images.unsplash.com/photo-1616788494707-ec28f08d05a1?q=80&w=600&auto=format&fit=crop' },
  { key: 'spray_booth_2.jpg', url: 'https://images.unsplash.com/photo-1616788494707-ec28f08d05a1?q=80&w=600&auto=format&fit=crop' },
  { key: 'spray_booth_3.jpg', url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=600&auto=format&fit=crop' },
  { key: 'spray_booth_4.jpg', url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=600&auto=format&fit=crop' },
  
  // Welding
  { key: 'welding_1.jpg', url: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?q=80&w=600&auto=format&fit=crop' },
  { key: 'welding_2.jpg', url: 'https://images.unsplash.com/photo-1516937941344-00b4e0337589?q=80&w=600&auto=format&fit=crop' },
  { key: 'welding_3.jpg', url: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?q=80&w=600&auto=format&fit=crop' },
  { key: 'welding_helmet.jpg', url: 'https://images.unsplash.com/photo-1581092162384-8987c1d64718?q=80&w=600&auto=format&fit=crop' },

  // Ladders
  { key: 'ladder_1.jpg', url: 'https://images.unsplash.com/photo-1585713181935-d5f622cc2415?q=80&w=600&auto=format&fit=crop' },
  
  // Filters & Rolls
  { key: 'filters_1.jpg', url: 'https://images.unsplash.com/photo-1540221652346-e5dd6b50f3e7?q=80&w=600&auto=format&fit=crop' },
  { key: 'protective_clothing.jpg', url: 'https://images.unsplash.com/photo-1605810230434-7631ac76ec81?q=80&w=600&auto=format&fit=crop' },
  
  // Wheel Care / Alignment
  { key: 'wheel_care_1.jpg', url: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?q=80&w=600&auto=format&fit=crop' },
  { key: 'wheel_care_2.jpg', url: 'https://images.unsplash.com/photo-1578844251758-2f71da64c96f?q=80&w=600&auto=format&fit=crop' },
  
  // General Workshop Tools
  { key: 'workshop_tools_1.jpg', url: 'https://images.unsplash.com/photo-1508962914676-134849a727f0?q=80&w=600&auto=format&fit=crop' },
  { key: 'workshop_tools_2.jpg', url: 'https://images.unsplash.com/photo-1540221652346-e5dd6b50f3e7?q=80&w=600&auto=format&fit=crop' }
];

async function downloadImage(url: string, destPath: string): Promise<boolean> {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(url, { headers, signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`[Error] Failed to fetch ${url} - Status: ${response.status}`);
      return false;
    }

    const arrayBuffer = await response.arrayBuffer();
    fs.writeFileSync(destPath, Buffer.from(arrayBuffer));
    return true;
  } catch (err: any) {
    console.error(`[Error] Exception downloading ${url}:`, err.message);
    return false;
  }
}

// Map each product to the best corresponding curated image based on keywords and metadata
function getBestImageForKey(category: string, name: string, id: string, index: number = 0): string {
  const cleanName = name.toLowerCase();
  const cleanCat = (category || '').toLowerCase();

  if (cleanCat === 'car-lift') {
    if (cleanName.includes('2-post') || cleanName.includes('2 post')) {
      const options = ['car_lift_1.jpg', 'car_lift_2.jpg', 'car_lift_4.jpg'];
      return options[(index + id.charCodeAt(0)) % options.length];
    }
    if (cleanName.includes('4-post') || cleanName.includes('4 post')) {
      return 'car_lift_3.jpg';
    }
    if (cleanName.includes('scissor') || cleanName.includes('low-rise') || cleanName.includes('mid-rise')) {
      return 'car_lift_5.jpg';
    }
    const allLifts = ['car_lift_1.jpg', 'car_lift_2.jpg', 'car_lift_3.jpg', 'car_lift_4.jpg', 'car_lift_5.jpg'];
    return allLifts[(index + id.charCodeAt(0)) % allLifts.length];
  }

  if (cleanCat === 'spray-booth') {
    if (cleanName.includes('down-draft') || cleanName.includes('downdraft')) {
      return 'spray_booth_1.jpg';
    }
    if (cleanName.includes('semi')) {
      return 'spray_booth_2.jpg';
    }
    const allBooths = ['spray_booth_1.jpg', 'spray_booth_2.jpg', 'spray_booth_3.jpg', 'spray_booth_4.jpg'];
    return allBooths[(index + id.charCodeAt(0)) % allBooths.length];
  }

  if (cleanCat === 'wheel-care') {
    const options = ['wheel_care_1.jpg', 'wheel_care_2.jpg'];
    return options[(index + id.charCodeAt(0)) % options.length];
  }

  // Workshop Equipment & general
  if (cleanName.includes('helmet') || cleanName.includes('mask') || cleanName.includes('goggles')) {
    return 'welding_helmet.jpg';
  }
  if (cleanName.includes('welder') || cleanName.includes('welding') || cleanName.includes('mig') || cleanName.includes('tig') || cleanName.includes('torch')) {
    const options = ['welding_1.jpg', 'welding_2.jpg', 'welding_3.jpg'];
    return options[(index + id.charCodeAt(0)) % options.length];
  }
  if (cleanName.includes('ladder')) {
    return 'ladder_1.jpg';
  }
  if (cleanName.includes('filter') || cleanName.includes('arrestor') || cleanName.includes('polyester')) {
    return 'filters_1.jpg';
  }
  if (cleanName.includes('overall') || cleanName.includes('clothing') || cleanName.includes('suit')) {
    return 'protective_clothing.jpg';
  }

  const generalOptions = ['workshop_tools_1.jpg', 'workshop_tools_2.jpg'];
  return generalOptions[(index + id.charCodeAt(0)) % generalOptions.length];
}

async function main() {
  console.log('[Downloader] Initializing curated high-quality image download...');

  const imagesDir = path.join(process.cwd(), 'src', 'assets', 'images');
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  // Download all curated images
  for (let i = 0; i < CURATED_IMAGES.length; i++) {
    const item = CURATED_IMAGES[i];
    const destPath = path.join(imagesDir, item.key);
    
    if (fs.existsSync(destPath) && fs.statSync(destPath).size > 100) {
      console.log(`[${i + 1}/${CURATED_IMAGES.length}] ${item.key} already exists.`);
    } else {
      console.log(`[${i + 1}/${CURATED_IMAGES.length}] Downloading ${item.key}...`);
      await downloadImage(item.url, destPath);
    }
  }

  console.log('\n[Downloader] Finished downloading curated base assets.');

  // Now perform precise replacements in products.ts
  const productsPath = path.join(process.cwd(), 'src', 'data', 'products.ts');
  if (!fs.existsSync(productsPath)) {
    console.error(`[Error] File not found: ${productsPath}`);
    return;
  }

  console.log(`[Downloader] Loading products and mapping to local paths...`);
  let productsContent = fs.readFileSync(productsPath, 'utf8');

  // Let's create an exhaustive replacement map of exactly what remote URLs are referenced in products.ts
  // We'll map them using our smart matching logic per product
  let replacementsCount = 0;

  for (const product of PRODUCTS) {
    // 1. Single main image
    if (product.image && product.image.startsWith('http')) {
      const localFilename = getBestImageForKey(product.category || '', product.name, product.id, 0);
      const localPath = `/src/assets/images/${localFilename}`;
      
      // We will perform exact search-and-replace on this URL string
      if (productsContent.includes(product.image)) {
        productsContent = productsContent.split(product.image).join(localPath);
        replacementsCount++;
      }
    }

    // 2. Images array
    if (product.images && Array.isArray(product.images)) {
      product.images.forEach((img, idx) => {
        if (img && img.startsWith('http')) {
          const localFilename = getBestImageForKey(product.category || '', product.name, product.id, idx + 1);
          const localPath = `/src/assets/images/${localFilename}`;
          
          if (productsContent.includes(img)) {
            productsContent = productsContent.split(img).join(localPath);
            replacementsCount++;
          }
        }
      });
    }
  }

  fs.writeFileSync(productsPath, productsContent, 'utf8');
  console.log(`\n[Downloader] Successfully completed products.ts mapping!`);
  console.log(`[Downloader] Replaced ${replacementsCount} image links with premium localized assets.`);
}

main().catch(err => {
  console.error('[Error] Execution failed:', err);
});
