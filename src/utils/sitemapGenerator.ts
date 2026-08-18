import { Product } from '../types';

/**
 * Escapes characters that are reserved in XML.
 */
function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

/**
 * Generates a sitemap.xml string based on products and current domain.
 * @param products List of active products in the system
 * @param domain Base domain (e.g., https://example.com)
 */
export function generateSitemapXml(products: Product[], domain: string): string {
  // Normalize domain: trim trailing slashes, spaces, and make sure it has protocol
  let baseDomain = domain.trim();
  if (!baseDomain) {
    baseDomain = typeof window !== 'undefined' ? window.location.origin : 'https://triton-equipment.co.za';
  }
  
  // Remove any trailing slashes to keep URL joins clean
  baseDomain = baseDomain.replace(/\/+$/, '');

  const today = new Date().toISOString().split('T')[0];

  const urls: string[] = [];

  // 1. Homepage URL
  urls.push(`  <url>
    <loc>${escapeXml(`${baseDomain}/`)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`);

  // 2. Main category-specific logic can also be part of sitemap or represented beautifully
  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
  categories.forEach(cat => {
    // If we support category filtering/selection as key landing points, include them
    urls.push(`  <url>
    <loc>${escapeXml(`${baseDomain}/?category=${cat}`)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`);
  });

  // 3. Product-specific page deep links (only published products)
  products.forEach(product => {
    if (product.status === 'draft') return; // Skip draft products
    
    const productUrl = `${baseDomain}/?product=${product.id}`;
    
    urls.push(`  <url>
    <loc>${escapeXml(productUrl)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`);
  });

  // Combine into standard sitemap structure
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
}
