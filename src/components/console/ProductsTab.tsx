import React, { useState } from 'react';
import {
  Package, Plus, Search, Filter, Edit, Trash2, CheckCircle2,
  ChevronUp, ChevronDown, Sparkles, ImageIcon, Upload, Save,
  X, AlertCircle, FileText, Check, Loader2, CloudUpload, HardDrive
} from 'lucide-react';
import { Product } from '../../types/index.js';
import { formatZarPrice } from '../../utils/console/formatters.js';
import { calculateSeoScore, generateDeterministicProductSeo } from '../../utils/console/seoGenerators.js';
import { ConfirmationDialog } from './ConfirmationDialog.js';
import { handleImageElementError, DEFAULT_FALLBACK_IMAGE } from '../../utils/imageFallback.js';
import { buildClientFallbackLongDescription } from '../../utils/console/productDescriptionGenerator.js';

interface ProductsTabProps {
  products: Product[];
  filteredProducts: Product[];
  categories: string[];
  editedProduct: Product | null;
  setEditedProduct: (p: Product | null) => void;
  searchProductQuery: string;
  setSearchProductQuery: (q: string) => void;
  selectedStatusFilter: 'all' | 'publish' | 'draft';
  setSelectedStatusFilter: (s: 'all' | 'publish' | 'draft') => void;
  saveMessage: string;
  productToDeleteId: string | null;
  autoSyncOnSave: boolean;
  setAutoSyncOnSave: (val: boolean) => void;
  onOpenAssetPicker: (target: 'primary' | number) => void;
  onAiSimulateImage: () => void;
  isGeneratingAiImage: boolean;
  isUploadingImage?: boolean;
  uploadStatusText?: string;
  onUploadDeviceImage: (file: File, target?: 'primary' | number | 'new-gallery') => void;
  handleUpdateSpecKey: (oldKey: string, newKey: string) => void;
  handleUpdateSpecValue: (key: string, value: string) => void;
  handleMoveSpecUp: (key: string) => void;
  handleMoveSpecDown: (key: string) => void;
  handleAddSpec: () => void;
  handleRemoveSpec: (key: string) => void;
  handleUpdateFeature: (idx: number, val: string) => void;
  handleAddFeature: () => void;
  handleRemoveFeature: (idx: number) => void;
  handleUpdateAdditionalImage: (idx: number, val: string) => void;
  handleAddAdditionalImage: () => void;
  handleRemoveAdditionalImage: (idx: number) => void;
  handleCreateNewProduct: () => void;
  handleSaveProduct: () => void;
  handleDeleteProduct: (id: string) => void;
  handleConfirmDelete: () => void;
  handleCancelDelete: () => void;
  handleBulkAutoFill: () => void;
  handleBulkDeleteDrafts: () => void;
  handleExportCSV: () => void;
  selectedCategoryFilter?: string;
  setSelectedCategoryFilter?: (cat: string) => void;
  handleShiftProductOrder?: (productId: string, direction: 'up' | 'down', categoryFilter?: string) => void;
  handleSetProductSortOrder?: (productId: string, desiredRank: number, categoryFilter?: string) => void;
}

export const ProductsTab: React.FC<ProductsTabProps> = ({
  products,
  filteredProducts,
  categories,
  editedProduct,
  setEditedProduct,
  searchProductQuery,
  setSearchProductQuery,
  selectedStatusFilter,
  setSelectedStatusFilter,
  selectedCategoryFilter = 'all',
  setSelectedCategoryFilter,
  saveMessage,
  productToDeleteId,
  autoSyncOnSave,
  setAutoSyncOnSave,
  onOpenAssetPicker,
  onAiSimulateImage,
  isGeneratingAiImage,
  isUploadingImage,
  uploadStatusText,
  onUploadDeviceImage,
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
  handleExportCSV,
  handleShiftProductOrder,
  handleSetProductSortOrder,
}) => {
  const [activeEditorTab, setActiveEditorTab] = useState<'basic' | 'specs' | 'features' | 'images' | 'seo'>('basic');
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [descriptionGenSuccess, setDescriptionGenSuccess] = useState(false);
  const [previewLongDescription, setPreviewLongDescription] = useState(false);

  const handleAutoGenerateLongDescription = async () => {
    if (!editedProduct || isGeneratingDescription) return;
    setIsGeneratingDescription(true);
    setDescriptionGenSuccess(false);

    try {
      const response = await fetch('/api/generate-description', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-triton-client': 'console-admin',
        },
        body: JSON.stringify({
          name: editedProduct.name,
          category: editedProduct.category,
          modelCode: editedProduct.modelCode,
          price: editedProduct.price,
          description: editedProduct.description,
          features: editedProduct.features || [],
          specifications: editedProduct.specifications || {},
        }),
      });

      const json = await response.json();
      if (json.success && json.data?.longDescription) {
        setEditedProduct({
          ...editedProduct,
          longDescription: json.data.longDescription,
        });
        setDescriptionGenSuccess(true);
        setTimeout(() => setDescriptionGenSuccess(false), 3000);
      } else {
        throw new Error(json.error || 'Server error generating description');
      }
    } catch (err) {
      console.warn('Network or server error generating long description, using client fallback engine:', err);
      const fallback = buildClientFallbackLongDescription(editedProduct);
      setEditedProduct({
        ...editedProduct,
        longDescription: fallback,
      });
      setDescriptionGenSuccess(true);
      setTimeout(() => setDescriptionGenSuccess(false), 3000);
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const [isGeneratingSeo, setIsGeneratingSeo] = useState(false);
  const [seoGenSuccess, setSeoGenSuccess] = useState(false);

  const handleAutoGenerateSeo = async () => {
    if (!editedProduct || isGeneratingSeo) return;
    setIsGeneratingSeo(true);
    setSeoGenSuccess(false);

    try {
      const response = await fetch('/api/generate-seo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-triton-client': 'console-admin',
        },
        body: JSON.stringify({
          name: editedProduct.name,
          category: editedProduct.category,
          currentDescription: editedProduct.description,
          currentSeo: {
            metaTitle: editedProduct.seoTitle,
            metaDescription: editedProduct.seoDescription,
            focusKeywords: editedProduct.seoFocusKeyword ? [editedProduct.seoFocusKeyword] : [],
          },
          specifications: editedProduct.specifications,
        }),
      });

      const json = await response.json();
      if (json.success && json.data) {
        const { metaTitle, metaDescription, focusKeywords } = json.data;
        setEditedProduct({
          ...editedProduct,
          seoTitle: metaTitle || editedProduct.seoTitle,
          seoDescription: metaDescription || editedProduct.seoDescription,
          seoFocusKeyword: (focusKeywords && focusKeywords[0]) || editedProduct.seoFocusKeyword,
        });
        setSeoGenSuccess(true);
        setTimeout(() => setSeoGenSuccess(false), 3000);
      } else {
        throw new Error(json.error || 'Server error generating SEO');
      }
    } catch (err) {
      console.warn('Network or server error generating SEO, using client fallback engine:', err);
      const fallback = generateDeterministicProductSeo(editedProduct);
      setEditedProduct({
        ...editedProduct,
        seoTitle: fallback.metaTitle,
        seoDescription: fallback.metaDescription,
        seoFocusKeyword: fallback.focusKeyword,
      });
      setSeoGenSuccess(true);
      setTimeout(() => setSeoGenSuccess(false), 3000);
    } finally {
      setIsGeneratingSeo(false);
    }
  };

  const totalValue = products.reduce((acc, p) => acc + (p.price || 0), 0);
  const inStockCount = products.filter((p) => p.inStock).length;

  const currentSeoScore = editedProduct
    ? calculateSeoScore(
        editedProduct.seoTitle,
        editedProduct.seoDescription,
        editedProduct.seoFocusKeyword,
        editedProduct.name
      )
    : 0;

  return (
    <div className="space-y-6">
      {/* Top Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-neutral-900/70 border border-neutral-800 rounded-xl">
          <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Total Products</p>
          <p className="text-xl font-bold text-white mt-1">{products.length}</p>
        </div>
        <div className="p-3.5 bg-neutral-900/70 border border-neutral-800 rounded-xl">
          <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">In Stock Ready</p>
          <p className="text-xl font-bold text-emerald-400 mt-1">{inStockCount}</p>
        </div>
        <div className="p-3.5 bg-neutral-900/70 border border-neutral-800 rounded-xl">
          <p className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">Draft Items</p>
          <p className="text-xl font-bold text-blue-400 mt-1">{products.length - inStockCount}</p>
        </div>
        <div className="p-3.5 bg-neutral-900/70 border border-neutral-800 rounded-xl">
          <p className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">Catalog Value</p>
          <p className="text-xl font-bold text-amber-400 mt-1">{formatZarPrice(totalValue)}</p>
        </div>
      </div>

      {/* Main Layout: Products List and/or Editor */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Products List (Left side or Full width) */}
        <div className={editedProduct ? 'w-full md:w-72 lg:w-80 xl:w-96 shrink-0 space-y-4' : 'w-full space-y-4'}>
          {/* Action Toolbar */}
          <div className="p-4 bg-neutral-900/80 border border-neutral-800 rounded-xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={14} />
                  <input
                    type="text"
                    placeholder="Search catalog by name, model code, ID..."
                    value={searchProductQuery}
                    onChange={(e) => setSearchProductQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="flex bg-neutral-950 border border-neutral-800 rounded-lg p-0.5">
                  {(['all', 'publish', 'draft'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSelectedStatusFilter(s)}
                      className={`px-2.5 py-1 text-[11px] font-bold uppercase rounded ${
                        selectedStatusFilter === s
                          ? 'bg-neutral-800 text-white'
                          : 'text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCreateNewProduct}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Plus size={14} />
                  <span>New Product</span>
                </button>
                <button
                  type="button"
                  onClick={handleBulkAutoFill}
                  title="Auto-fill missing SEO titles and descriptions"
                  className="px-3 py-2 bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 text-neutral-300 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
                >
                  <Sparkles size={13} className="text-amber-400" />
                  <span className="hidden sm:inline">Bulk SEO</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-3 py-2 bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 text-neutral-300 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
                >
                  CSV
                </button>
              </div>
            </div>

            {/* Category Filter Pills & Sequence Reorder Guide */}
            <div className="flex items-center gap-1.5 pt-2 border-t border-neutral-800/80 overflow-x-auto pb-1 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 shrink-0 flex items-center gap-1">
                <Filter size={11} /> Category:
              </span>
              <button
                type="button"
                onClick={() => setSelectedCategoryFilter?.('all')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg shrink-0 transition-colors ${
                  (selectedCategoryFilter === 'all' || !selectedCategoryFilter)
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-neutral-950 text-neutral-400 hover:text-neutral-200 border border-neutral-850'
                }`}
              >
                All Categories ({products.length})
              </button>
              {categories.map((cat) => {
                const count = products.filter(
                  (p) => p.category.toLowerCase() === cat.toLowerCase()
                ).length;
                const isSelected = selectedCategoryFilter?.toLowerCase() === cat.toLowerCase();
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategoryFilter?.(cat)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg shrink-0 transition-colors flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-neutral-950 text-neutral-400 hover:text-neutral-200 border border-neutral-850'
                    }`}
                  >
                    <span>{cat}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isSelected ? 'bg-indigo-700 text-indigo-100' : 'bg-neutral-900 text-neutral-500'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Product Items Table / Cards */}
          <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
            {filteredProducts.map((p) => {
              const isSelected = editedProduct?.id === p.id;

              // Calculate category-specific sequence and bounds
              const categoryProducts = products
                .filter((prod) => prod.category.toLowerCase() === p.category.toLowerCase())
                .sort((a, b) => {
                  const sortA = a.sortOrder ?? 99999;
                  const sortB = b.sortOrder ?? 99999;
                  if (sortA !== sortB) return sortA - sortB;
                  return (a.name || '').localeCompare(b.name || '');
                });
              const catIndex = categoryProducts.findIndex((prod) => prod.id === p.id);
              const isFirst = catIndex <= 0;
              const isLast = catIndex === categoryProducts.length - 1;
              const currentRank = p.sortOrder ?? (catIndex >= 0 ? catIndex + 1 : 1);

              return (
                <div
                  key={p.id}
                  onClick={() => setEditedProduct(p)}
                  className={`p-3 rounded-xl border transition-all duration-150 cursor-pointer flex items-center gap-3 ${
                    isSelected
                      ? 'bg-indigo-950/40 border-indigo-500 shadow-md'
                      : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900/90'
                  }`}
                >
                  {/* Shift Up/Down & Rank Badge */}
                  <div className="flex flex-col items-center justify-center shrink-0 pr-1 border-r border-neutral-800/80" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => handleShiftProductOrder?.(p.id, 'up', selectedCategoryFilter)}
                      disabled={isFirst}
                      className="p-1 rounded text-neutral-400 hover:text-indigo-400 hover:bg-neutral-800 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-neutral-400 transition-colors"
                      title="Shift Up in category preference order"
                    >
                      <ChevronUp size={13} />
                    </button>
                    <span
                      className="px-1 py-0.5 rounded text-[9px] font-mono font-bold bg-neutral-950 border border-neutral-800 text-amber-400 min-w-[22px] text-center"
                      title={`Order position #${currentRank} in category ${p.category}`}
                    >
                      #{currentRank}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleShiftProductOrder?.(p.id, 'down', selectedCategoryFilter)}
                      disabled={isLast}
                      className="p-1 rounded text-neutral-400 hover:text-indigo-400 hover:bg-neutral-800 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-neutral-400 transition-colors"
                      title="Shift Down in category preference order"
                    >
                      <ChevronDown size={13} />
                    </button>
                  </div>

                  <div className="w-12 h-12 rounded-lg bg-neutral-950 border border-neutral-800 overflow-hidden shrink-0 flex items-center justify-center">
                    <img
                      src={p.image}
                      alt={p.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                      onError={(e) => handleImageElementError(e, DEFAULT_FALLBACK_IMAGE)}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-white truncate">{p.name}</h4>
                      {p.status === 'draft' ? (
                        <span className="px-1.5 py-0.5 bg-amber-950/80 border border-amber-600/40 text-amber-400 text-[9px] font-bold uppercase rounded">
                          Draft
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 bg-emerald-950/80 border border-emerald-600/40 text-emerald-400 text-[9px] font-bold uppercase rounded">
                          Live
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-neutral-400">
                      <span className="font-mono text-neutral-300">{p.modelCode || p.id}</span>
                      <span>•</span>
                      <span className="text-amber-400 font-semibold">{formatZarPrice(p.price)}</span>
                      <span>•</span>
                      <span className="truncate">{p.category}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => setEditedProduct(p)}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                      title="Edit Product"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteProduct(p.id)}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-red-950/40 transition-colors"
                      title="Delete Product"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredProducts.length === 0 && (
              <div className="p-8 text-center bg-neutral-900/40 border border-neutral-800 rounded-xl text-neutral-500 text-xs">
                No matching products found in catalog.
              </div>
            )}
          </div>
        </div>

        {/* Product Editor Drawer / Panel (Right side) */}
        {editedProduct && (
          <div className="flex-1 min-w-0 w-full min-h-[500px] md:min-h-[600px] lg:min-h-[750px] bg-[#141414] border border-neutral-800 rounded-xl overflow-hidden shadow-xl sticky top-4 flex flex-col">
            {/* Editor Header */}
            <div className="p-4 border-b border-neutral-800 bg-[#181818] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-950/80 border border-indigo-500/40 text-indigo-400">
                  <Edit size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider truncate max-w-[320px]">
                    {editedProduct.name}
                  </h3>
                  <p className="text-[11px] text-neutral-400 font-mono">ID: {editedProduct.id}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {saveMessage && (
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 animate-pulse">
                    <CheckCircle2 size={13} /> {saveMessage}
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleSaveProduct}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow transition-colors"
                >
                  <Save size={13} />
                  <span>Save Changes</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditedProduct(null)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Editor Navigation Sub-tabs */}
            <div className="flex border-b border-neutral-800 bg-neutral-900/60 px-4 gap-2 pt-2 overflow-x-auto">
              {[
                { id: 'basic', label: 'Basic Info' },
                { id: 'specs', label: 'Specifications' },
                { id: 'features', label: 'Features' },
                { id: 'images', label: 'Images & Media' },
                { id: 'seo', label: 'SEO & Meta' },
              ].map((tab) => {
                const isSeo = tab.id === 'seo';
                const isActive = activeEditorTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveEditorTab(tab.id as any)}
                    className={`px-3 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                      isActive
                        ? isSeo
                          ? 'border-purple-500 text-white bg-purple-500/10'
                          : 'border-indigo-500 text-white bg-indigo-500/10'
                        : isSeo
                        ? 'border-transparent text-purple-300/80 hover:text-purple-200 hover:bg-purple-950/20'
                        : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-850/40'
                    }`}
                  >
                    {isSeo && (
                      <Sparkles size={12} className={isActive ? 'text-purple-400' : 'text-purple-400/80'} />
                    )}
                    <span>{tab.label}</span>
                    {isSeo && editedProduct && (
                      <span
                        className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-tight transition-colors ${
                          currentSeoScore >= 75
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                            : currentSeoScore >= 50
                            ? 'bg-amber-950 text-amber-400 border border-amber-500/30'
                            : 'bg-red-950/80 text-red-400 border border-red-500/30'
                        }`}
                        title={`SEO Health Score: ${currentSeoScore}/100`}
                      >
                        {currentSeoScore}%
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Editor Body */}
            <div className="p-5 space-y-4 flex-1 overflow-y-auto max-h-[calc(100vh-220px)] md:max-h-[600px] lg:max-h-[750px]">
              {activeEditorTab === 'basic' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                        Product Name
                      </label>
                      <input
                        type="text"
                        value={editedProduct.name}
                        onChange={(e) => setEditedProduct({ ...editedProduct, name: e.target.value })}
                        className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                        Model / SKU Code
                      </label>
                      <input
                        type="text"
                        value={editedProduct.modelCode || ''}
                        onChange={(e) => setEditedProduct({ ...editedProduct, modelCode: e.target.value })}
                        className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                        Category
                      </label>
                      <select
                        value={editedProduct.category}
                        onChange={(e) => setEditedProduct({ ...editedProduct, category: e.target.value })}
                        className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                      >
                        {categories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                        Price (ZAR)
                      </label>
                      <input
                        type="number"
                        value={editedProduct.price}
                        onChange={(e) => setEditedProduct({ ...editedProduct, price: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                        Status
                      </label>
                      <select
                        value={editedProduct.status || 'publish'}
                        onChange={(e) =>
                          setEditedProduct({ ...editedProduct, status: e.target.value as 'publish' | 'draft' })
                        }
                        className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="publish">Published (Live)</option>
                        <option value="draft">Draft (Hidden)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                        Display Order (# in Cat)
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={editedProduct.sortOrder ?? 1}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setEditedProduct({
                            ...editedProduct,
                            sortOrder: isNaN(val) ? 1 : Math.max(1, val),
                          });
                        }}
                        className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                        placeholder="1"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                      Short Overview / Description
                    </label>
                    <textarea
                      rows={3}
                      value={editedProduct.description}
                      onChange={(e) => setEditedProduct({ ...editedProduct, description: e.target.value })}
                      className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-wider text-neutral-300 mb-1.5 cursor-default select-none">
                      <span className="flex items-center gap-1.5 text-neutral-200">
                        <FileText size={13} className="text-indigo-400 shrink-0" />
                        <span>Full Long Description / Technical Specs HTML</span>
                      </span>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        {editedProduct.longDescription && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setPreviewLongDescription(!previewLongDescription);
                            }}
                            className="px-2 py-0.5 rounded text-[10px] font-semibold text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors cursor-pointer"
                          >
                            {previewLongDescription ? 'Edit Code' : 'Preview HTML'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleAutoGenerateLongDescription();
                          }}
                          disabled={isGeneratingDescription}
                          className="px-2.5 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50 cursor-pointer shadow-purple-900/20"
                          title="Auto-generate commercial & technical long description using Gemini AI"
                        >
                          {isGeneratingDescription ? (
                            <Loader2 size={11} className="animate-spin text-purple-200" />
                          ) : descriptionGenSuccess ? (
                            <Check size={11} className="text-emerald-300" />
                          ) : (
                            <Sparkles size={11} className="text-purple-200" />
                          )}
                          <span>
                            {isGeneratingDescription
                              ? 'Generating...'
                              : descriptionGenSuccess
                              ? 'Generated!'
                              : 'Auto Generate Long Description'}
                          </span>
                        </button>
                      </div>
                    </label>
                    {previewLongDescription ? (
                      <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-300 space-y-2 max-h-72 overflow-y-auto leading-relaxed [&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-indigo-300 [&_h3]:mt-3 [&_h3]:mb-1.5 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_li]:text-neutral-300 [&_strong]:text-white">
                        {editedProduct.longDescription ? (
                          <div dangerouslySetInnerHTML={{ __html: editedProduct.longDescription }} />
                        ) : (
                          <p className="text-neutral-500 italic">No description generated yet.</p>
                        )}
                      </div>
                    ) : (
                      <textarea
                        rows={7}
                        value={editedProduct.longDescription || ''}
                        onChange={(e) => setEditedProduct({ ...editedProduct, longDescription: e.target.value })}
                        placeholder="Enter detailed technical narrative, warranty terms, and maintenance instructions, or click Auto Generate Long Description above..."
                        className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-indigo-500 leading-relaxed"
                      />
                    )}
                  </div>
                </div>
              )}

              {activeEditorTab === 'specs' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-neutral-400">Technical specifications and engineering dimensions</p>
                    <button
                      type="button"
                      onClick={handleAddSpec}
                      className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-[11px] font-bold uppercase tracking-wider flex items-center gap-1"
                    >
                      <Plus size={12} /> Add Row
                    </button>
                  </div>

                  <div className="space-y-2">
                    {Object.entries(editedProduct.specifications || {}).map(([key, val], idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-neutral-950 border border-neutral-850 rounded-lg">
                        <input
                          type="text"
                          value={key}
                          onChange={(e) => handleUpdateSpecKey(key, e.target.value)}
                          placeholder="Spec Name (e.g. Capacity)"
                          className="w-1/3 px-2 py-1 bg-neutral-900 border border-neutral-800 rounded text-xs text-neutral-300 focus:outline-none focus:border-indigo-500"
                        />
                        <input
                          type="text"
                          value={String(val ?? '')}
                          onChange={(e) => handleUpdateSpecValue(key, e.target.value)}
                          placeholder="Spec Value (e.g. 4000 kg)"
                          className="flex-1 px-2 py-1 bg-neutral-900 border border-neutral-800 rounded text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleMoveSpecUp(key)}
                          className="p-1 text-neutral-500 hover:text-white"
                          title="Move up"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveSpecDown(key)}
                          className="p-1 text-neutral-500 hover:text-white"
                          title="Move down"
                        >
                          <ChevronDown size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveSpec(key)}
                          className="p-1 text-neutral-500 hover:text-red-400"
                          title="Remove"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeEditorTab === 'features' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-neutral-400">Key commercial product selling points</p>
                    <button
                      type="button"
                      onClick={handleAddFeature}
                      className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-[11px] font-bold uppercase tracking-wider flex items-center gap-1"
                    >
                      <Plus size={12} /> Add Feature
                    </button>
                  </div>

                  <div className="space-y-2">
                    {(editedProduct.features || []).map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-neutral-950 border border-neutral-850 rounded-lg">
                        <input
                          type="text"
                          value={feat}
                          onChange={(e) => handleUpdateFeature(idx, e.target.value)}
                          className="flex-1 px-2 py-1 bg-neutral-900 border border-neutral-800 rounded text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveFeature(idx)}
                          className="p-1 text-neutral-500 hover:text-red-400"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeEditorTab === 'images' && (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
                  {/* Controls & Gallery Upload Slots (xl:col-span-8) */}
                  <div className="xl:col-span-8 space-y-5">
                    {/* Primary Cover Image */}
                    <div className="p-4 bg-neutral-950 border border-neutral-850 rounded-xl space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
                          <ImageIcon size={13} className="text-indigo-400" />
                          <span>Primary Cover Image Node</span>
                        </label>
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors shadow-sm" title="Upload local file to WordPress Media storage">
                            <CloudUpload size={12} />
                            <span>Upload to Storage</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={isUploadingImage}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) onUploadDeviceImage(f, 'primary');
                                e.target.value = '';
                              }}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => onOpenAssetPicker('primary')}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors shadow-sm"
                            title="Browse and pick from WordPress Media Storage Library"
                          >
                            <ImageIcon size={12} /> Media Storage Picker
                          </button>
                          <button
                            type="button"
                            onClick={onAiSimulateImage}
                            disabled={isGeneratingAiImage}
                            className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors disabled:opacity-50"
                          >
                            <Sparkles size={12} className="text-purple-400" /> AI Render
                          </button>
                        </div>
                      </div>

                      {isUploadingImage && (
                        <div className="flex items-center gap-2 p-2.5 bg-emerald-950/60 border border-emerald-500/40 rounded-lg text-xs text-emerald-300 animate-pulse">
                          <Loader2 size={14} className="animate-spin text-emerald-400" />
                          <span>{uploadStatusText || 'Uploading image to WordPress Media storage...'}</span>
                        </div>
                      )}

                      <div className="flex gap-3 items-center">
                        <div className="w-16 h-16 bg-neutral-900 rounded-lg border border-neutral-800 overflow-hidden shrink-0 flex items-center justify-center">
                          <img
                            src={editedProduct.image}
                            alt={editedProduct.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                            onError={(e) => handleImageElementError(e, DEFAULT_FALLBACK_IMAGE)}
                          />
                        </div>
                        <input
                          type="text"
                          value={editedProduct.image}
                          onChange={(e) => setEditedProduct({ ...editedProduct, image: e.target.value })}
                          placeholder="https://... or /assets/..."
                          className="flex-1 px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <label className="border border-dashed border-neutral-800 hover:border-emerald-500/60 bg-neutral-900/40 hover:bg-emerald-950/20 rounded-lg p-2.5 flex items-center justify-between gap-2 cursor-pointer transition-colors group">
                        <div className="flex items-center gap-2 text-neutral-400 group-hover:text-neutral-200">
                          <CloudUpload size={15} className="text-emerald-400" />
                          <span className="text-xs">Pick from device to upload to WordPress Media & assign as primary cover</span>
                        </div>
                        <span className="px-2 py-0.5 bg-neutral-800 group-hover:bg-emerald-600 group-hover:text-white text-[10px] font-bold uppercase rounded text-neutral-300 transition-colors">
                          Browse Device
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={isUploadingImage}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) onUploadDeviceImage(f, 'primary');
                            e.target.value = '';
                          }}
                        />
                      </label>
                    </div>

                    {/* Secondary Gallery Images */}
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-300">
                            Secondary Gallery Angles ({editedProduct.images?.length || 0})
                          </label>
                          <p className="text-[11px] text-neutral-500 mt-0.5">Additional multi-angle inspection and exploded view photographs.</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="px-2.5 py-1 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors shadow-sm">
                            <CloudUpload size={12} /> <span>Upload & Add</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={isUploadingImage}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) onUploadDeviceImage(f, 'new-gallery');
                                e.target.value = '';
                              }}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={handleAddAdditionalImage}
                            className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors"
                          >
                            <Plus size={12} /> Add Slot
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {(editedProduct.images || []).map((img, idx) => (
                          <div key={idx} className="flex items-center gap-2 p-2 bg-neutral-950 border border-neutral-850 rounded-lg">
                            <div className="w-10 h-10 bg-neutral-900 rounded border border-neutral-800 overflow-hidden shrink-0 flex items-center justify-center">
                              <img
                                src={img}
                                alt=""
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                                onError={(e) => handleImageElementError(e, DEFAULT_FALLBACK_IMAGE)}
                              />
                            </div>
                            <input
                              type="text"
                              value={img}
                              onChange={(e) => handleUpdateAdditionalImage(idx, e.target.value)}
                              placeholder="Image URL or asset path..."
                              className="flex-1 px-2.5 py-1 bg-neutral-900 border border-neutral-800 rounded text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                            />
                            <label
                              className="p-1.5 text-neutral-400 hover:text-emerald-400 cursor-pointer transition-colors"
                              title="Upload and assign from device"
                            >
                              <Upload size={14} />
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={isUploadingImage}
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) onUploadDeviceImage(f, idx);
                                  e.target.value = '';
                                }}
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => onOpenAssetPicker(idx)}
                              className="p-1.5 text-neutral-400 hover:text-indigo-400 transition-colors"
                              title="Select from library"
                            >
                              <ImageIcon size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveAdditionalImage(idx)}
                              className="p-1.5 text-neutral-400 hover:text-red-400 transition-colors"
                              title="Remove"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}

                        {(editedProduct.images?.length || 0) === 0 && (
                          <div className="p-4 text-center bg-neutral-950/60 border border-dashed border-neutral-800 rounded-xl text-neutral-500 text-xs">
                            No secondary gallery images configured yet. Click &quot;Upload & Add&quot; or &quot;Add Slot&quot; to configure multi-angle views.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Live Cover Preview (xl:col-span-4) */}
                  <div className="xl:col-span-4 space-y-3 sticky top-0">
                    <div className="p-4 bg-neutral-950 border border-neutral-850 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          Live Cover Preview
                        </span>
                        <span className="px-1.5 py-0.5 bg-neutral-900 border border-neutral-800 text-[10px] font-mono text-neutral-400 rounded">
                          Showcase Frame
                        </span>
                      </div>

                      <div className="relative aspect-video sm:aspect-square w-full rounded-lg bg-neutral-900 border border-neutral-800 overflow-hidden flex items-center justify-center group shadow-inner">
                        <img
                          src={editedProduct.image}
                          alt={editedProduct.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain p-2 transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => handleImageElementError(e, DEFAULT_FALLBACK_IMAGE)}
                        />
                        <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 backdrop-blur-sm border border-white/10 rounded text-[10px] font-bold text-white uppercase tracking-wider">
                          {editedProduct.category || 'Product'}
                        </div>
                        <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/70 backdrop-blur-sm border border-white/10 rounded text-[10px] font-mono text-amber-400 font-bold">
                          {formatZarPrice(editedProduct.price)}
                        </div>
                      </div>

                      <div className="p-2.5 bg-neutral-900/80 border border-neutral-800 rounded-lg space-y-1.5 text-[11px]">
                        <div className="flex items-center justify-between text-neutral-400">
                          <span>Product Model</span>
                          <span className="font-mono text-white font-semibold">{editedProduct.modelCode || editedProduct.id}</span>
                        </div>
                        <div className="flex items-center justify-between text-neutral-400">
                          <span>Availability</span>
                          <span className={editedProduct.inStock !== false ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                            {editedProduct.inStock !== false ? 'In Stock' : 'On Order'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-neutral-400">
                          <span>Catalog Status</span>
                          <span className={editedProduct.status === 'draft' ? 'text-amber-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                            {editedProduct.status === 'draft' ? 'Draft' : 'Published'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeEditorTab === 'seo' && (
                <div className="space-y-4">
                  {/* SEO Status & AI Action Card */}
                  <div className="p-3.5 bg-neutral-950 border border-neutral-850 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">SEO Health Score</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-lg font-bold text-white font-mono">{currentSeoScore} / 100</span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                              currentSeoScore >= 75
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                                : currentSeoScore >= 50
                                ? 'bg-amber-950 text-amber-400 border border-amber-500/30'
                                : 'bg-red-950 text-red-400 border border-red-500/30'
                            }`}
                          >
                            {currentSeoScore >= 75 ? 'Optimized' : currentSeoScore >= 50 ? 'Moderate' : 'Needs Optimization'}
                          </span>
                        </div>
                      </div>
                      <div className="w-24 h-2 bg-neutral-850 rounded-full overflow-hidden hidden sm:block">
                        <div
                          className={`h-full transition-all duration-500 ${
                            currentSeoScore > 75
                              ? 'bg-emerald-500'
                              : currentSeoScore > 50
                              ? 'bg-amber-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${currentSeoScore}%` }}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleAutoGenerateSeo}
                      disabled={isGeneratingSeo}
                      className="px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md shadow-purple-950/40 disabled:opacity-50 cursor-pointer"
                      title="Auto-generate focus keywords, title tag, and meta description using Gemini AI with fallback engine"
                    >
                      {isGeneratingSeo ? (
                        <Loader2 size={13} className="animate-spin text-purple-200" />
                      ) : seoGenSuccess ? (
                        <Check size={13} className="text-emerald-300" />
                      ) : (
                        <Sparkles size={13} className="text-purple-200" />
                      )}
                      <span>
                        {isGeneratingSeo
                          ? 'Generating SEO...'
                          : seoGenSuccess
                          ? 'SEO Generated!'
                          : 'Auto Generate SEO Meta'}
                      </span>
                    </button>
                  </div>

                  {/* Focus Keyword */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                        Target Focus Keyword
                      </label>
                      <span className="text-[11px] text-neutral-500">
                        Include South African intent (e.g., SA, Johannesburg)
                      </span>
                    </div>
                    <input
                      type="text"
                      value={editedProduct.seoFocusKeyword || ''}
                      onChange={(e) => setEditedProduct({ ...editedProduct, seoFocusKeyword: e.target.value })}
                      placeholder="e.g. 2 post car lift south africa"
                      className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Meta Title */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                        Meta Title (Title Tag)
                      </label>
                      <span className={`text-[11px] font-mono ${
                        (editedProduct.seoTitle?.length || 0) >= 30 && (editedProduct.seoTitle?.length || 0) <= 60
                          ? 'text-emerald-400'
                          : 'text-neutral-500'
                      }`}>
                        {editedProduct.seoTitle?.length || 0} / 60 chars (Recommended: 30-60)
                      </span>
                    </div>
                    <input
                      type="text"
                      value={editedProduct.seoTitle || ''}
                      onChange={(e) => setEditedProduct({ ...editedProduct, seoTitle: e.target.value })}
                      placeholder="e.g. 4 Ton 2 Post Car Lift | Triton Automotive SA"
                      className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Meta Description */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                        Meta Description
                      </label>
                      <span className={`text-[11px] font-mono ${
                        (editedProduct.seoDescription?.length || 0) >= 80 && (editedProduct.seoDescription?.length || 0) <= 160
                          ? 'text-emerald-400'
                          : 'text-neutral-500'
                      }`}>
                        {editedProduct.seoDescription?.length || 0} / 160 chars (Recommended: 80-160)
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      value={editedProduct.seoDescription || ''}
                      onChange={(e) => setEditedProduct({ ...editedProduct, seoDescription: e.target.value })}
                      placeholder="Commercial-grade automotive machinery with 3-year warranty and nationwide delivery across South Africa."
                      className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Google Search Live Snippet Preview */}
                  <div className="p-3.5 bg-neutral-950 border border-neutral-850 rounded-xl space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1">
                      <Search size={11} className="text-neutral-400" /> Google SERP Snippet Preview
                    </span>
                    <div className="font-sans text-xs space-y-0.5 pt-1">
                      <div className="text-neutral-400 text-[11px] truncate">
                        https://car-lifts.co.za &gt; products &gt; {editedProduct.modelCode?.toLowerCase() || editedProduct.id}
                      </div>
                      <div className="text-blue-400 hover:underline font-medium text-sm truncate cursor-pointer">
                        {editedProduct.seoTitle || `${editedProduct.name} | Triton Car Lifts South Africa`}
                      </div>
                      <div className="text-neutral-400 text-xs line-clamp-2 leading-relaxed">
                        {editedProduct.seoDescription || editedProduct.description || 'View commercial specs, pricing, and warranty information for this automotive equipment from Triton SA.'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationDialog
        isOpen={Boolean(productToDeleteId)}
        title="Delete Product"
        message={`Are you sure you want to permanently delete this product? This action will remove it from the catalog.`}
        confirmLabel="Delete Product"
        isDangerous={true}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
};
