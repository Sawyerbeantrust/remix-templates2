import { useState, useCallback, useMemo } from 'react';
import { Product } from '../../types/index.js';
import { PRODUCTS } from '../../data/products.js';
import { safeLocalStorage } from '../../utils/safeStorage.js';
import { normalizeProductCategory } from '../../utils/console/productNormalization.js';
import { syncCatalogToServer } from '../../utils/catalogSync.js';

interface UseProductManagementOptions {
  products: Product[];
  onProductsChange?: (newProducts: Product[]) => void;
  addLog: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  categories: string[];
}

export function useProductManagement({
  products,
  onProductsChange,
  addLog,
  categories,
}: UseProductManagementOptions) {
  const [editedProduct, setEditedProduct] = useState<Product | null>(null);
  const [searchProductQuery, setSearchProductQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'publish' | 'draft'>('all');
  const [saveMessage, setSaveMessage] = useState('');
  const [productToDeleteId, setProductToDeleteId] = useState<string | null>(null);
  const [autoSyncOnSave, setAutoSyncOnSave] = useState<boolean>(() => {
    return safeLocalStorage.getItem('triton_auto_sync_on_save') === 'true';
  });

  const [autoCleanInterval, setAutoCleanInterval] = useState<'disabled' | 'daily' | 'weekly'>(() => {
    return (safeLocalStorage.getItem('triton_auto_clean_interval') as any) || 'disabled';
  });

  // Filtered and searched product list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesQuery =
        !searchProductQuery ||
        p.name.toLowerCase().includes(searchProductQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchProductQuery.toLowerCase()) ||
        (p.modelCode && p.modelCode.toLowerCase().includes(searchProductQuery.toLowerCase())) ||
        p.id.toLowerCase().includes(searchProductQuery.toLowerCase());

      const matchesStatus =
        selectedStatusFilter === 'all' ||
        (selectedStatusFilter === 'draft' && p.status === 'draft') ||
        (selectedStatusFilter === 'publish' && p.status !== 'draft');

      return matchesQuery && matchesStatus;
    });
  }, [products, searchProductQuery, selectedStatusFilter]);

  const updateProductList = useCallback(
    (newList: Product[]) => {
      if (onProductsChange) {
        onProductsChange(newList);
      }
      safeLocalStorage.setItem('triton_products_db_v3', JSON.stringify(newList));
    },
    [onProductsChange]
  );

  // Specifications field manager
  const handleUpdateSpecKey = useCallback((oldKey: string, newKey: string) => {
    setEditedProduct((prev) => {
      if (!prev) return null;
      const specs = { ...prev.specifications };
      const val = specs[oldKey];
      delete specs[oldKey];
      specs[newKey] = val;
      return { ...prev, specifications: specs };
    });
  }, []);

  const handleUpdateSpecValue = useCallback((key: string, value: string) => {
    setEditedProduct((prev) => {
      if (!prev) return null;
      return { ...prev, specifications: { ...prev.specifications, [key]: value } };
    });
  }, []);

  const handleMoveSpecUp = useCallback((key: string) => {
    setEditedProduct((prev) => {
      if (!prev) return null;
      const entries = Object.entries(prev.specifications || {});
      const index = entries.findIndex(([k]) => k === key);
      if (index <= 0) return prev;
      const temp = entries[index];
      entries[index] = entries[index - 1];
      entries[index - 1] = temp;
      const newSpecs: Record<string, string> = {};
      entries.forEach(([k, v]) => {
        newSpecs[k] = String(v ?? '');
      });
      return { ...prev, specifications: newSpecs };
    });
  }, []);

  const handleMoveSpecDown = useCallback((key: string) => {
    setEditedProduct((prev) => {
      if (!prev) return null;
      const entries = Object.entries(prev.specifications || {});
      const index = entries.findIndex(([k]) => k === key);
      if (index === -1 || index >= entries.length - 1) return prev;
      const temp = entries[index];
      entries[index] = entries[index + 1];
      entries[index + 1] = temp;
      const newSpecs: Record<string, string> = {};
      entries.forEach(([k, v]) => {
        newSpecs[k] = String(v ?? '');
      });
      return { ...prev, specifications: newSpecs };
    });
  }, []);

  const handleAddSpec = useCallback(() => {
    setEditedProduct((prev) => {
      if (!prev) return null;
      const count = Object.keys(prev.specifications || {}).length + 1;
      return {
        ...prev,
        specifications: { ...prev.specifications, [`Specification ${count}`]: 'Standard' },
      };
    });
  }, []);

  const handleRemoveSpec = useCallback((key: string) => {
    setEditedProduct((prev) => {
      if (!prev) return null;
      const specs = { ...prev.specifications };
      delete specs[key];
      return { ...prev, specifications: specs };
    });
  }, []);

  // Features manager
  const handleUpdateFeature = useCallback((index: number, val: string) => {
    setEditedProduct((prev) => {
      if (!prev) return null;
      const feats = [...(prev.features || [])];
      feats[index] = val;
      return { ...prev, features: feats };
    });
  }, []);

  const handleAddFeature = useCallback(() => {
    setEditedProduct((prev) => {
      if (!prev) return null;
      return { ...prev, features: [...(prev.features || []), 'New Commercial Feature'] };
    });
  }, []);

  const handleRemoveFeature = useCallback((index: number) => {
    setEditedProduct((prev) => {
      if (!prev) return null;
      const feats = [...(prev.features || [])];
      feats.splice(index, 1);
      return { ...prev, features: feats };
    });
  }, []);

  // Additional images manager
  const handleUpdateAdditionalImage = useCallback((index: number, val: string) => {
    setEditedProduct((prev) => {
      if (!prev) return null;
      const imgs = [...(prev.images || [])];
      imgs[index] = val;
      return { ...prev, images: imgs };
    });
  }, []);

  const handleAddAdditionalImage = useCallback(() => {
    setEditedProduct((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        images: [...(prev.images || []), 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&q=80&w=800&h=600'],
      };
    });
  }, []);

  const handleRemoveAdditionalImage = useCallback((index: number) => {
    setEditedProduct((prev) => {
      if (!prev) return null;
      const imgs = [...(prev.images || [])];
      imgs.splice(index, 1);
      return { ...prev, images: imgs };
    });
  }, []);

  const handleCreateNewProduct = useCallback(() => {
    const id = `triton-custom-${Date.now().toString(36)}`;
    const newProd: Product = {
      id,
      name: 'New Commercial Workshop Product',
      category: categories[0] || 'car-lifts',
      price: 18500,
      image: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&q=80&w=800&h=600',
      images: [],
      description: 'Heavy duty automotive machinery built for commercial workshops in South Africa.',
      modelCode: `TR-${id.slice(-4).toUpperCase()}`,
      specifications: {
        'Lifting Capacity': '4000 kg',
        'Power Supply': '380V (Three-Phase)',
        'Warranty': '3-Year Structural Warranty',
      },
      features: ['High-tensile steel construction', 'Electro-hydraulic dual cylinder system'],
      inStock: true,
      rating: 5.0,
      status: 'publish',
      dateCreated: new Date().toISOString().split('T')[0],
    };
    setEditedProduct(newProd);
    addLog(`Created draft product template [${newProd.name}]`);
  }, [categories, addLog]);

  const handleSaveProduct = useCallback(async () => {
    if (!editedProduct) return;
    const normalized = normalizeProductCategory(editedProduct);
    const existingIndex = products.findIndex((p) => p.id === normalized.id);

    let updatedList: Product[];
    if (existingIndex >= 0) {
      updatedList = [...products];
      updatedList[existingIndex] = normalized;
      addLog(`Updated product [${normalized.name}] (SKU: ${normalized.modelCode})`);
    } else {
      updatedList = [normalized, ...products];
      addLog(`Added new product [${normalized.name}]`);
    }

    updateProductList(updatedList);
    setSaveMessage('Product saved successfully!');
    setTimeout(() => setSaveMessage(''), 3000);

    if (autoSyncOnSave) {
      try {
        await syncCatalogToServer(updatedList, []);
        addLog(`Auto-synced updated catalog with server`);
      } catch (err: any) {
        addLog(`Auto-sync warning: ${err?.message || 'Server sync error'}`, 'warning');
      }
    }
  }, [editedProduct, products, updateProductList, addLog, autoSyncOnSave]);

  const handleDeleteProduct = useCallback((prodId: string) => {
    setProductToDeleteId(prodId);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!productToDeleteId) return;
    const prod = products.find((p) => p.id === productToDeleteId);
    const updated = products.filter((p) => p.id !== productToDeleteId);
    updateProductList(updated);
    if (editedProduct?.id === productToDeleteId) {
      setEditedProduct(null);
    }
    addLog(`Deleted product [${prod?.name || productToDeleteId}]`, 'warning');
    setProductToDeleteId(null);
  }, [productToDeleteId, products, updateProductList, editedProduct, addLog]);

  const handleCancelDelete = useCallback(() => {
    setProductToDeleteId(null);
  }, []);

  const handleBulkAutoFill = useCallback(() => {
    let count = 0;
    const updated = products.map((p) => {
      let changed = false;
      let title = p.seoTitle;
      let desc = p.seoDescription;

      if (!title || title.trim().length === 0) {
        title = `${p.name} | Triton Automotive Equipment SA`;
        changed = true;
      }
      if (!desc || desc.trim().length === 0) {
        desc = `Buy ${p.name} with 3-year warranty and nationwide delivery in South Africa. Request a quotation today.`;
        changed = true;
      }

      if (changed) {
        count++;
        return { ...p, seoTitle: title, seoDescription: desc };
      }
      return p;
    });

    if (count > 0) {
      updateProductList(updated);
      addLog(`Auto-filled SEO titles and descriptions for ${count} products.`, 'success');
    } else {
      addLog(`All products already have SEO metadata configured.`, 'info');
    }
  }, [products, updateProductList, addLog]);

  const handleBulkDeleteDrafts = useCallback(() => {
    const draftCount = products.filter((p) => p.status === 'draft').length;
    if (draftCount === 0) {
      addLog('No draft products found to delete.', 'info');
      return;
    }
    const nonDrafts = products.filter((p) => p.status !== 'draft');
    updateProductList(nonDrafts);
    addLog(`Deleted ${draftCount} draft products from catalog.`, 'warning');
  }, [products, updateProductList, addLog]);

  const handleResetCatalog = useCallback(() => {
    const normalized = PRODUCTS.map(normalizeProductCategory);
    updateProductList(normalized);
    setEditedProduct(null);
    addLog('Catalog reset to default master stock.', 'info');
  }, [updateProductList, addLog]);

  return {
    products,
    filteredProducts,
    editedProduct,
    setEditedProduct,
    searchProductQuery,
    setSearchProductQuery,
    selectedStatusFilter,
    setSelectedStatusFilter,
    saveMessage,
    productToDeleteId,
    autoSyncOnSave,
    setAutoSyncOnSave: (val: boolean) => {
      setAutoSyncOnSave(val);
      safeLocalStorage.setItem('triton_auto_sync_on_save', val ? 'true' : 'false');
    },
    autoCleanInterval,
    setAutoCleanInterval: (val: 'disabled' | 'daily' | 'weekly') => {
      setAutoCleanInterval(val);
      safeLocalStorage.setItem('triton_auto_clean_interval', val);
    },
    updateProductList,
    handleUpdateSpecKey,
    handleUpdateSpecValue,
    handleMoveSpecUp,
    handleMoveSpecDown,
    handleAddSpec,
    handleRemoveSpec,
    handleUpdateFeature,
    handleAddFeature,
    handleRemoveFeature,
    handleUpdateAdditionalImage,
    handleAddAdditionalImage,
    handleRemoveAdditionalImage,
    handleCreateNewProduct,
    handleSaveProduct,
    handleDeleteProduct,
    handleConfirmDelete,
    handleCancelDelete,
    handleBulkAutoFill,
    handleBulkDeleteDrafts,
    handleResetCatalog,
  };
}
