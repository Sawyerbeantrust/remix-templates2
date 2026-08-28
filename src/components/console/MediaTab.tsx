import React from 'react';
import { Product, FeaturedCategory } from '../../types/index.js';
import MediaStorageTab from '../MediaStorageTab.js';

interface MediaTabProps {
  products: Product[];
  onProductsChange?: (newProducts: Product[]) => void;
  featuredCategories: FeaturedCategory[];
  onFeaturedCategoriesChange?: (newCats: FeaturedCategory[]) => void;
  addLog: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  isInospace?: boolean;
}

export const MediaTab: React.FC<MediaTabProps> = ({
  products,
  onProductsChange,
  featuredCategories,
  onFeaturedCategoriesChange,
  addLog,
  isInospace,
}) => {
  return (
    <div className="space-y-4">
      <MediaStorageTab
        products={products}
        onProductsChange={onProductsChange || (() => {})}
        featuredCategories={featuredCategories}
        onFeaturedCategoriesChange={onFeaturedCategoriesChange || (() => {})}
        addLog={addLog}
        isInospace={isInospace}
      />
    </div>
  );
};
