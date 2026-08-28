import { Product } from '../../types/index.js';
import { normalizeProductCategory } from './productNormalization.js';

export const parseCsvToProducts = (csvText: string): { products: Product[]; errors: string[] } => {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  const products: Product[] = [];
  const errors: string[] = [];

  if (lines.length < 2) {
    return { products: [], errors: ['CSV must have at least a header row and one data row.'] };
  }

  // Parse header
  const headerRow = parseCsvLine(lines[0]).map(h => h.trim().toLowerCase());
  const colMap: Record<string, number> = {};
  headerRow.forEach((col, idx) => {
    colMap[col] = idx;
  });

  const getCol = (row: string[], name: string, fallbackIdx?: number): string => {
    if (colMap[name] !== undefined && row[colMap[name]] !== undefined) {
      return row[colMap[name]];
    }
    if (fallbackIdx !== undefined && row[fallbackIdx] !== undefined) {
      return row[fallbackIdx];
    }
    return '';
  };

  for (let i = 1; i < lines.length; i++) {
    try {
      const row = parseCsvLine(lines[i]);
      if (row.length === 0 || (row.length === 1 && !row[0])) continue;

      const id = getCol(row, 'id', 0) || `prod_${Date.now()}_${i}`;
      const name = getCol(row, 'name', 1) || 'Untitled Product';
      const category = getCol(row, 'category', 2) || 'workshop-equipment';
      const rawPrice = getCol(row, 'price', 3);
      const price = parseFloat(rawPrice.replace(/[^0-9.]/g, '')) || 0;
      const image = getCol(row, 'image', 4) || 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&q=80&w=800&h=600';
      const description = getCol(row, 'description', 5) || `${name} - Heavy duty automotive workshop equipment.`;
      const modelCode = getCol(row, 'modelcode') || getCol(row, 'model_code') || getCol(row, 'sku') || `TR-${id.slice(0, 6).toUpperCase()}`;

      // Additional fields
      const seoTitle = getCol(row, 'seotitle') || getCol(row, 'seo_title') || `${name} | Triton Automotive Equipment SA`;
      const seoDescription = getCol(row, 'seodescription') || getCol(row, 'seo_description') || description.slice(0, 160);
      const statusRaw = getCol(row, 'status').toLowerCase();
      const status: 'publish' | 'draft' = statusRaw === 'draft' ? 'draft' : 'publish';

      const prod: Product = {
        id,
        name,
        category,
        price,
        image,
        description,
        modelCode,
        specifications: { 'Category': category, 'Origin': 'South Africa' },
        features: ['Heavy Duty Design', 'Standard 3-Year Warranty'],
        inStock: true,
        rating: 4.8,
        status,
        seoTitle,
        seoDescription,
        dateCreated: new Date().toISOString().split('T')[0]
      };

      products.push(normalizeProductCategory(prod));
    } catch (err: any) {
      errors.push(`Row ${i + 1}: ${err?.message || 'Invalid row syntax'}`);
    }
  }

  return { products, errors };
};

export const parseCsvLine = (text: string): string[] => {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur.trim());
  return result;
};

export const exportProductsToCsv = (products: Product[]): string => {
  const headers = ['id', 'name', 'modelCode', 'category', 'price', 'status', 'image', 'description', 'seoTitle', 'seoDescription', 'inStock'];
  const rows = products.map(p => [
    escapeCsv(p.id),
    escapeCsv(p.name),
    escapeCsv(p.modelCode || ''),
    escapeCsv(p.category || ''),
    p.price.toString(),
    p.status || 'publish',
    escapeCsv(p.image || ''),
    escapeCsv(p.description || ''),
    escapeCsv(p.seoTitle || ''),
    escapeCsv(p.seoDescription || ''),
    p.inStock ? 'true' : 'false'
  ].join(','));

  return [headers.join(','), ...rows].join('\n');
};

const escapeCsv = (val: string): string => {
  if (val.includes(',') || val.includes('"') || val.includes('\n') || val.includes('\r')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
};

export const generateSampleCsv = (): string => {
  return `id,name,modelCode,category,price,status,image,description,seoTitle,seoDescription,inStock
4-ton-2-post-lift,4-Ton Two Post Clear Floor Car Lift,TR-2P400,car-lifts,45990,publish,https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&q=80&w=800&h=600,"Heavy-duty 4-Ton hydraulic clear floor vehicle hoist with dual cylinders.","4-Ton 2-Post Car Lift South Africa | Triton","Commercial 4-Ton two post vehicle lift with 3-year warranty.",true
auto-spray-booth-7m,Automotive Down-Draft Spray Booth 7m,TR-SB700,automotive-spray-booths,189000,publish,https://images.unsplash.com/photo-1590623091395-e3ae3f6d71b4?auto=format&fit=crop&q=80&w=800&h=600,"Standard 7m enclosed automotive spray booth with diesel burner and down-draft filtration.","Automotive Spray Booth 7m | Triton Cape Town","Full downdraft commercial automotive spray painting booth.",true`;
};

export const exportErrorsToCsv = (errors: any[]): string => {
  const headers = ['timestamp', 'category', 'error', 'context'];
  const rows = errors.map(e => [
    escapeCsv(e.timestamp || new Date().toISOString()),
    escapeCsv(e.category || 'General'),
    escapeCsv(e.error || e.message || String(e)),
    escapeCsv(e.context || '')
  ].join(','));
  return [headers.join(','), ...rows].join('\n');
};
