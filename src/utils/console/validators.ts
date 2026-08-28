import { Product } from '../../types/index.js';

export const validateProduct = (p: Partial<Product>): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!p.id || p.id.trim().length === 0) {
    errors.push('Product ID is required.');
  }
  if (!p.name || p.name.trim().length === 0) {
    errors.push('Product Name is required.');
  }
  if (!p.category || p.category.trim().length === 0) {
    errors.push('Category is required.');
  }
  if (p.price === undefined || isNaN(Number(p.price)) || Number(p.price) < 0) {
    errors.push('Price must be a valid positive number.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validatePasscode = (code: string, currentPasscode: string = '5252'): boolean => {
  return (code || '').trim() === currentPasscode.trim();
};

export const validateBackupPayload = (payload: any): boolean => {
  if (!payload || typeof payload !== 'object') return false;
  if (!Array.isArray(payload.products)) return false;
  return true;
};
