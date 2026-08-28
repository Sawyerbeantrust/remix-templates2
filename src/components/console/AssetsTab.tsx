import React from 'react';
import { Product } from '../../types/index.js';
import AssetAuditTab from '../AssetAuditTab.js';

interface AssetsTabProps {
  products: Product[];
  onProductsChange?: (newProducts: Product[]) => void;
  addLog: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  isInospace?: boolean;
}

export const AssetsTab: React.FC<AssetsTabProps> = ({
  products,
  onProductsChange,
  addLog,
  isInospace,
}) => {
  return (
    <div className="space-y-4">
      <AssetAuditTab
        products={products}
        onProductsChange={onProductsChange || (() => {})}
        addLog={addLog}
        isInospace={isInospace}
      />
    </div>
  );
};
