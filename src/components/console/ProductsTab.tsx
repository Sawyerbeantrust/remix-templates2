import React, { useState } from 'react';
import {
  Package, Plus, Search, Filter, Edit, Trash2, CheckCircle2,
  ChevronUp, ChevronDown, Sparkles, ImageIcon, Upload, Save,
  X, AlertCircle, FileText, Check, Loader2, CloudUpload, HardDrive
} from 'lucide-react';
import { Product } from '../../types/index.js';
import { formatZarPrice } from '../../utils/console/formatters.js';
import { calculateSeoScore } from '../../utils/console/seoGenerators.js';
import { ConfirmationDialog } from './ConfirmationDialog.js';
import { handleImageElementError, DEFAULT_FALLBACK_IMAGE } from '../../utils/imageFallback.js';

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
}) => {
  const [activeEditorTab, setActiveEditorTab] = useState<'basic' | 'specs' | 'features' | 'images' | 'seo'>('basic');

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
          <div className="p-4 bg-neutral-900/80 border border-neutral-800 rounded-xl flex flex-wrap items-center justify-between gap-3">
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

          {/* Product Items Table / Cards */}
          <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
            {filteredProducts.map((p) => {
              const isSelected = editedProduct?.id === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setEditedProduct(p)}
                  className={`p-3 rounded-xl border transition-all duration-150 cursor-pointer flex items-center gap-3.5 ${
                    isSelected
                      ? 'bg-indigo-950/40 border-indigo-500 shadow-md'
                      : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900/90'
                  }`}
                >
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
            <div className="flex border-b border-neutral-800 bg-neutral-900/60 px-4 gap-2 pt-2">
              {[
                { id: 'basic', label: 'Basic Info' },
                { id: 'specs', label: 'Specifications' },
                { id: 'features', label: 'Features' },
                { id: 'images', label: 'Images & Media' },
                { id: 'seo', label: 'SEO & Meta' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveEditorTab(tab.id as any)}
                  className={`px-3 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
                    activeEditorTab === tab.id
                      ? 'border-indigo-500 text-white'
                      : 'border-transparent text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
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

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                      Full Long Description / Technical Specs HTML
                    </label>
                    <textarea
                      rows={5}
                      value={editedProduct.longDescription || ''}
                      onChange={(e) => setEditedProduct({ ...editedProduct, longDescription: e.target.value })}
                      placeholder="Enter detailed technical narrative, warranty terms, and maintenance instructions..."
                      className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
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
                  <div className="p-3 bg-neutral-950 border border-neutral-850 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">SEO Health Score</p>
                      <p className="text-lg font-bold text-white mt-0.5">{currentSeoScore} / 100</p>
                    </div>
                    <div className="w-24 h-2 bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
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

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                      Target Focus Keyword
                    </label>
                    <input
                      type="text"
                      value={editedProduct.seoFocusKeyword || ''}
                      onChange={(e) => setEditedProduct({ ...editedProduct, seoFocusKeyword: e.target.value })}
                      placeholder="e.g. 2 post car lift south africa"
                      className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                      Meta Title (Title Tag)
                    </label>
                    <input
                      type="text"
                      value={editedProduct.seoTitle || ''}
                      onChange={(e) => setEditedProduct({ ...editedProduct, seoTitle: e.target.value })}
                      className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                      Meta Description
                    </label>
                    <textarea
                      rows={3}
                      value={editedProduct.seoDescription || ''}
                      onChange={(e) => setEditedProduct({ ...editedProduct, seoDescription: e.target.value })}
                      className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
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
