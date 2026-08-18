import fs from 'fs';
import path from 'path';

const TARGET_HOST = process.env.MIGRATION_HOST || 'https://car-lifts.co.za';
const IMAGES_DIR = path.join(process.cwd(), 'src', 'assets', 'images');

const MIME_MAP = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
};

async function uploadFileWithRetry(filePath, fileName, baseUrl) {
  const ext = path.extname(fileName).toLowerCase();
  const mimeType = MIME_MAP[ext] || 'image/jpeg';
  const fileBuffer = fs.readFileSync(filePath);
  const base64Data = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;

  const payload = {
    name: fileName,
    data: base64Data,
  };

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      console.log(`[Upload] (${attempt}/2) Uploading ${fileName} to ${baseUrl}/api/upload-image...`);
      const res = await fetch(`${baseUrl}/api/upload-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }

      const json = await res.json();
      const blobUrl = json.path || json.url;
      if (blobUrl) {
        return blobUrl;
      }
      throw new Error(`Response missing path/url: ${JSON.stringify(json)}`);
    } catch (err) {
      console.warn(`[Upload Error] Attempt ${attempt} failed for ${fileName}:`, err.message);
      if (attempt === 2) {
        throw err;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

async function runMigration() {
  console.log('====================================================');
  console.log(`Starting Image Migration to Blob on: ${TARGET_HOST}`);
  console.log(`Reading local files from: ${IMAGES_DIR}`);
  console.log('====================================================\n');

  if (!fs.existsSync(IMAGES_DIR)) {
    console.error(`Error: Directory ${IMAGES_DIR} not found.`);
    process.exit(1);
  }

  const files = fs.readdirSync(IMAGES_DIR).filter((f) => {
    const ext = path.extname(f).toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.webp', '.svg', '.gif'].includes(ext);
  });

  console.log(`Found ${files.length} images to migrate from src/assets/images/:\n`);

  const fileToBlobUrlMap = new Map();
  let uploadedCount = 0;
  const failedFiles = [];

  for (const file of files) {
    const filePath = path.join(IMAGES_DIR, file);
    try {
      const blobUrl = await uploadFileWithRetry(filePath, file, TARGET_HOST);
      fileToBlobUrlMap.set(file, blobUrl);
      uploadedCount++;
      console.log(`  ✓ Uploaded ${file} -> ${blobUrl}`);
    } catch (err) {
      console.error(`  ✗ Failed to upload ${file} to ${TARGET_HOST}: ${err.message}`);
      failedFiles.push({ file, error: err.message });
    }
  }

  console.log(`\n====================================================`);
  console.log(`Uploaded ${uploadedCount} / ${files.length} images.`);
  console.log(`====================================================\n`);

  // Step 4: GET https://car-lifts.co.za/api/catalog
  const catalogUrl = `${TARGET_HOST}/api/catalog`;
  let catalogData = null;

  try {
    console.log(`Fetching catalog from ${catalogUrl}...`);
    const catRes = await fetch(catalogUrl, { signal: AbortSignal.timeout(10000) });
    if (!catRes.ok) throw new Error(`HTTP ${catRes.status} ${catRes.statusText}`);
    catalogData = await catRes.json();
  } catch (e) {
    console.error(`Failed to fetch catalog from ${catalogUrl}: ${e.message}`);
  }

  if (!catalogData) {
    console.error('Could not obtain catalog data from remote host.');
  } else {
    console.log(`Catalog loaded: ${catalogData.products?.length || 0} products, ${catalogData.featuredCategories?.length || 0} categories.`);

    let replacedCount = 0;
    const unmatchedFiles = new Set();

    function replacePath(val) {
      if (!val || typeof val !== 'string') return val;
      if (val.startsWith('http://') || val.startsWith('https://')) {
        if (val.includes('public.blob.vercel-storage.com')) {
          return val;
        }
      }

      const filename = val.split('?')[0].split('#')[0].split('/').filter(Boolean).pop();
      if (!filename) return val;

      if (fileToBlobUrlMap.has(filename)) {
        replacedCount++;
        return fileToBlobUrlMap.get(filename);
      } else {
        if (val.startsWith('/images/') || val.startsWith('/src/assets/images/') || val.startsWith('/assets/images/')) {
          unmatchedFiles.add(val);
        }
        return val;
      }
    }

    if (Array.isArray(catalogData.products)) {
      for (const p of catalogData.products) {
        if (p.image) {
          p.image = replacePath(p.image);
        }
        if (Array.isArray(p.images)) {
          p.images = p.images.map((img) => replacePath(img));
        }
      }
    }

    if (Array.isArray(catalogData.featuredCategories)) {
      for (const c of catalogData.featuredCategories) {
        if (c.img) {
          c.img = replacePath(c.img);
        }
      }
    }

    // Step 5: POST corrected catalog back to https://car-lifts.co.za/api/catalog
    console.log(`\nPOSTing corrected catalog to ${TARGET_HOST}/api/catalog...`);
    try {
      const postRes = await fetch(`${TARGET_HOST}/api/catalog`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: catalogData.products,
          featuredCategories: catalogData.featuredCategories,
          categoriesList: catalogData.categoriesList,
        }),
      });
      const postJson = await postRes.json();
      console.log(`Catalog POST response status: ${postRes.status}`, postJson);
    } catch (postErr) {
      console.error(`Failed to post updated catalog to ${TARGET_HOST}:`, postErr.message);
    }

    // Step 6: Print summary
    console.log('\n====================================================');
    console.log('MIGRATION SUMMARY:');
    console.log(`- Images Uploaded to Blob: ${uploadedCount} / ${files.length}`);
    console.log(`- Paths Replaced in Catalog: ${replacedCount}`);
    if (unmatchedFiles.size > 0) {
      console.log(`- Unmatched path values (${unmatchedFiles.size}):`);
      for (const u of unmatchedFiles) {
        console.log(`    ${u}`);
      }
    } else {
      console.log('- Unmatched path values: None (All matched)');
    }
    if (failedFiles.length > 0) {
      console.log(`- Failed uploads (${failedFiles.length}):`);
      for (const f of failedFiles) {
        console.log(`    ${f.file}: ${f.error}`);
      }
    }
    console.log('====================================================\n');
  }
}

runMigration().catch(console.error);

