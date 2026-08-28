import { Product } from '../../types/index.js';
import { formatCategoryLabel } from '../categoryUtils.js';

export const formatZarPrice = (price: number): string => {
  return `R ${Number(price || 0).toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

export const formatTimestamp = (date: Date | string = new Date()): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

export const getCategoryCountText = (catSlug: string, products: Product[]): string => {
  const count = products.filter(p => p.category === catSlug).length;
  return `${count} ${count === 1 ? 'Product' : 'Products'}`;
};

export const deriveCategoriesFromProducts = (products: Product[]): string[] => {
  const set = new Set<string>();
  products.forEach(p => {
    if (p.category) set.add(p.category);
  });
  return Array.from(set);
};
