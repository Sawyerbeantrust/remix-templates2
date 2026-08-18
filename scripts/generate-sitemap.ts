import fs from 'fs';
import path from 'path';
import { PRODUCTS } from '../src/data/products';

function generateSitemap() {
  console.log('[Sitemap Generator] Initializing static sitemap generation...');
  
  const baseUrl = 'https://car-lifts.co.za';
  const currentDate = new Date().toISOString().split('T')[0];
  
  // Define main static routes
  const staticRoutes = [
    { path: '', priority: '1.0', changefreq: 'daily' },
    { path: '?view=about', priority: '0.8', changefreq: 'weekly' },
    { path: '?view=contact', priority: '0.8', changefreq: 'weekly' },
    { path: '?view=faq', priority: '0.7', changefreq: 'weekly' }
  ];

  const xmlUrls: string[] = [];

  // Add static routes
  staticRoutes.forEach(route => {
    xmlUrls.push(`  <url>
    <loc>${baseUrl}${route.path ? '/' + route.path : ''}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`);
  });

  // Add dynamic product routes
  PRODUCTS.forEach(product => {
    // Generate clean query param URL or SEO path fallback
    const loc = `${baseUrl}?product=${product.id}`;
    xmlUrls.push(`  <url>
    <loc>${loc}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`);
  });

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${xmlUrls.join('\n')}
</urlset>`;

  // Ensure public directory exists
  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
    console.log('[Sitemap Generator] Created public/ directory.');
  }

  const sitemapPath = path.join(publicDir, 'sitemap.xml');
  fs.writeFileSync(sitemapPath, sitemapXml, 'utf8');
  
  console.log(`[Sitemap Generator] Successfully generated sitemap.xml at ${sitemapPath} containing ${xmlUrls.length} entries!`);
}

generateSitemap();
