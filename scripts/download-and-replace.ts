import fs from 'fs';
import path from 'path';
import { PRODUCTS } from '../src/data/products';

function sanitizeFilename(url: string, index: number): string {
  try {
    const parsed = new URL(url);
    let pathname = parsed.pathname;
    let base = pathname.substring(pathname.lastIndexOf('/') + 1);
    base = base.split('?')[0];
    base = decodeURIComponent(base);
    
    let ext = '.jpg';
    const matchExt = base.match(/\.(jpeg|jpg|png|webp|gif|svg|jfif)/i);
    if (matchExt) {
      ext = matchExt[0].toLowerCase();
      base = base.substring(0, base.length - ext.length);
    }
    
    // Clean base name
    base = base.replace(/[^a-zA-Z0-9_\-]/g, '_').replace(/_+/g, '_').toLowerCase();
    // Trim trailing/leading dashes or underscores
    base = base.replace(/^[_|-]+|[_|-]+$/g, '');
    
    if (!base) {
      base = `img_${index}`;
    }
    return `${base}${ext}`;
  } catch (e) {
    return `image_${index}.jpg`;
  }
}

async function downloadImage(url: string, destPath: string): Promise<boolean> {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://car-lifts.co.za/'
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    const response = await fetch(url, { 
      headers,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`[Error] Failed to fetch ${url} - Status: ${response.status} ${response.statusText}`);
      return false;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Ensure size is sane (e.g. not a tiny error page)
    if (buffer.length < 100) {
      console.warn(`[Warning] Downloaded file too small (${buffer.length} bytes) for ${url}`);
    }

    fs.writeFileSync(destPath, buffer);
    return true;
  } catch (err: any) {
    console.error(`[Error] Exception downloading ${url}:`, err.message || err);
    return false;
  }
}

async function main() {
  console.log('[Downloader] Scanning product images...');

  const uniqueUrls = new Set<string>();
  PRODUCTS.forEach(p => {
    if (p.image) uniqueUrls.add(p.image);
    if (p.images && Array.isArray(p.images)) {
      p.images.forEach(img => {
        if (img) uniqueUrls.add(img);
      });
    }
  });

  const urlList = Array.from(uniqueUrls);
  console.log(`[Downloader] Found ${urlList.length} unique remote image URLs.`);

  const imagesDir = path.join(process.cwd(), 'src', 'assets', 'images');
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
    console.log(`[Downloader] Created directory ${imagesDir}`);
  }

  const urlMap: Record<string, string> = {};
  let successCount = 0;
  let failCount = 0;

  // Let's download them sequentially or in small chunks to avoid overwhelming any server
  for (let i = 0; i < urlList.length; i++) {
    const url = urlList[i];
    const filename = sanitizeFilename(url, i);
    const destPath = path.join(imagesDir, filename);
    const localPath = `/src/assets/images/${filename}`;

    console.log(`[${i + 1}/${urlList.length}] Downloading: ${url} -> ${filename}`);
    
    let downloaded = false;
    // Check if file already exists first to save bandwidth and avoid rate limits/timeouts!
    if (fs.existsSync(destPath) && fs.statSync(destPath).size > 100) {
      console.log(`  -> File already exists locally. Skipping download.`);
      downloaded = true;
    } else {
      // Retry up to 2 times
      for (let attempt = 1; attempt <= 2; attempt++) {
        downloaded = await downloadImage(url, destPath);
        if (downloaded) break;
        console.log(`  -> Attempt ${attempt} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (downloaded) {
      urlMap[url] = localPath;
      successCount++;
    } else {
      console.error(`  -> [FAILED] Could not download ${url}`);
      failCount++;
    }
  }

  console.log(`\n[Downloader] Download process finished.`);
  console.log(`[Downloader] Success: ${successCount}, Failed: ${failCount}`);

  // Now, rewrite src/data/products.ts by replacing the URLs
  const productsFilePath = path.join(process.cwd(), 'src', 'data', 'products.ts');
  if (!fs.existsSync(productsFilePath)) {
    console.error(`[Error] Products file not found at ${productsFilePath}`);
    return;
  }

  console.log(`[Downloader] Reading ${productsFilePath} to perform replacements...`);
  let productsContent = fs.readFileSync(productsFilePath, 'utf8');

  let replacementsCount = 0;
  // Replace each mapped remote URL with the new local path
  // Order by length descending so that we don't partially match sub-URLs if any exist
  const sortedUrls = Object.keys(urlMap).sort((a, b) => b.length - a.length);

  for (const remoteUrl of sortedUrls) {
    const localPath = urlMap[remoteUrl];
    
    // We want to handle different quotes and potential escaping.
    // Replace exact occurrences of the URL string.
    if (productsContent.includes(remoteUrl)) {
      // We can do a global split-join replacement
      productsContent = productsContent.split(remoteUrl).join(localPath);
      replacementsCount++;
    }
  }

  fs.writeFileSync(productsFilePath, productsContent, 'utf8');
  console.log(`[Downloader] Successfully completed replacements in products.ts!`);
  console.log(`[Downloader] Replaced ${replacementsCount} unique URL references.`);
}

main().catch(err => {
  console.error('[Error] Main download process crashed:', err);
});
