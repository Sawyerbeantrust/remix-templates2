import React, { useState } from 'react';
import {
  Layers, Plus, Edit, Trash2, CheckCircle2, Upload, Sparkles,
  ImageIcon, RefreshCw, AlertCircle, Save, Check, ChevronRight, X
} from 'lucide-react';
import { FeaturedCategory, Product } from '../../types/index.js';
import { formatCategoryLabel, normalizeCategorySlug } from '../../utils/categoryUtils.js';
import { ConfirmationDialog } from './ConfirmationDialog.js';
import { handleImageElementError, DEFAULT_FALLBACK_IMAGE } from '../../utils/imageFallback.js';

interface CategoriesTabProps {
  categories: string[];
  featuredCategories: FeaturedCategory[];
  products: Product[];
  selectedCatId: string;
  setSelectedCatId: (id: string) => void;
  isAddingCategory: boolean;
  isRenamingCategory: boolean;
  categoryInputVal: string;
  setCategoryInputVal: (val: string) => void;
  handleStartAddCategory: () => void;
  handleStartRenameCategory: (slug: string) => void;
  handleSaveNewCategory: () => void;
  handleSaveRenamedCategory: (oldSlug: string) => void;
  handleDeleteCategory: (slug: string) => void;
  handleCategoryImgUpload: (file: File, catId: string) => void;
  handleAiCategoryImgGenerate: (catId: string, catName: string) => void;
  isGeneratingCatImage: boolean;
  catStyle: string;
  setCatStyle: (val: string) => void;
  catAccentColor: string;
  setCatAccentColor: (val: string) => void;
  catEnvironment: string;
  setCatEnvironment: (val: string) => void;
  catLighting: string;
  setCatLighting: (val: string) => void;
  catAspect: string;
  setCatAspect: (val: string) => void;
  onProductsChange?: (newProducts: Product[]) => void;
  addLog: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const CategoriesTab: React.FC<CategoriesTabProps> = ({
  categories,
  featuredCategories,
  products,
  selectedCatId,
  setSelectedCatId,
  isAddingCategory,
  isRenamingCategory,
  categoryInputVal,
  setCategoryInputVal,
  handleStartAddCategory,
  handleStartRenameCategory,
  handleSaveNewCategory,
  handleSaveRenamedCategory,
  handleDeleteCategory,
  handleCategoryImgUpload,
  handleAiCategoryImgGenerate,
  isGeneratingCatImage,
  catStyle,
  setCatStyle,
  catAccentColor,
  setCatAccentColor,
  catEnvironment,
  setCatEnvironment,
  catLighting,
  setCatLighting,
  catAspect,
  setCatAspect,
  onProductsChange,
  addLog,
}) => {
  const [renamingSlug, setRenamingSlug] = useState<string | null>(null);
  const [catToDelete, setCatToDelete] = useState<string | null>(null);
  const [showAutoAssignConfirm, setShowAutoAssignConfirm] = useState(false);

  const selectedCategory = featuredCategories.find((c) => c.id === selectedCatId) || featuredCategories[0];

  const handleAutoAssignCategoryMedia = () => {
    // Only fill slots that are completely empty or broken, never overwrite working paths
    if (!onProductsChange) return;

    let filledCount = 0;
    const updated = products.map((p) => {
      const isWorkingUrl =
        p.image &&
        (p.image.startsWith('/assets/images/') ||
          p.image.startsWith('https://car-lifts.co.za/') ||
          p.image.startsWith('https://images.unsplash.com/'));

      if (isWorkingUrl) {
        return p; // Preserve existing working image
      }

      // Find matching featured category image
      const matchedCat = featuredCategories.find((c) => c.name.toLowerCase() === p.category?.toLowerCase() || c.id === `cat-${p.category}`);
      if (matchedCat && matchedCat.img) {
        filledCount++;
        return { ...p, image: matchedCat.img };
      }
      return p;
    });

    onProductsChange(updated);
    addLog(`Auto-assigned category media for ${filledCount} empty product slots. Existing valid images were preserved.`, 'success');
    setShowAutoAssignConfirm(false);
  };

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="p-4 bg-neutral-900/80 border border-neutral-800 rounded-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-950/80 border border-indigo-500/40 text-indigo-400">
            <Layers size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Category Hierarchy & Featured Showcases
            </h3>
            <p className="text-xs text-neutral-400">
              Manage product taxonomies, hero showroom imagery, and WooCommerce category structures
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleStartAddCategory}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus size={14} /> Add Category
          </button>
          <button
            type="button"
            onClick={() => setShowAutoAssignConfirm(true)}
            className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 text-neutral-200 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
          >
            <Sparkles size={14} className="text-amber-400" />
            <span>Auto-Assign WP Media by Category</span>
          </button>
        </div>
      </div>

      {/* Inline Add / Rename Category Form */}
      {(isAddingCategory || isRenamingCategory) && (
        <div className="p-4 bg-indigo-950/30 border border-indigo-500/40 rounded-xl flex items-center gap-3 animate-in fade-in duration-150">
          <input
            type="text"
            placeholder="Category Name (e.g. 4-Post Parking Lifts)"
            value={categoryInputVal}
            onChange={(e) => setCategoryInputVal(e.target.value)}
            className="flex-1 px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
            autoFocus
          />
          <button
            type="button"
            onClick={() => {
              if (isRenamingCategory && renamingSlug) {
                handleSaveRenamedCategory(renamingSlug);
              } else {
                handleSaveNewCategory();
              }
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1"
          >
            <Save size={14} /> Save
          </button>
          <button
            type="button"
            onClick={() => {
              setRenamingSlug(null);
              setCategoryInputVal('');
            }}
            className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white rounded-lg text-xs"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Main Grid: Categories List & Category Customizer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Category Cards List */}
        <div className="lg:col-span-6 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
            Featured Categories ({featuredCategories.length})
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {featuredCategories.map((cat) => {
              const isSelected = selectedCategory?.id === cat.id;
              const productCount = products.filter(
                (p) => p.category === normalizeCategorySlug(cat.name) || p.category === cat.id.replace('cat-', '')
              ).length;

              return (
                <div
                  key={cat.id}
                  onClick={() => setSelectedCatId(cat.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-indigo-950/40 border-indigo-500 shadow-md'
                      : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <div className="aspect-[16/9] rounded-lg overflow-hidden bg-neutral-950 relative mb-2.5">
                    <img
                      src={cat.img}
                      alt={cat.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                      onError={(e) => handleImageElementError(e, DEFAULT_FALLBACK_IMAGE)}
                    />
                    <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/80 backdrop-blur rounded text-[10px] font-mono text-emerald-400">
                      {productCount} items
                    </div>
                  </div>

                  <div>
                    <h5 className="text-xs font-bold text-white uppercase tracking-wider line-clamp-1">{cat.name}</h5>
                    <p className="text-[10px] text-neutral-400 font-mono mt-0.5">Slug: {cat.id.replace('cat-', '')}</p>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-neutral-800/80">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenamingSlug(cat.id.replace('cat-', ''));
                        handleStartRenameCategory(cat.id.replace('cat-', ''));
                      }}
                      className="text-[11px] text-neutral-400 hover:text-indigo-400 flex items-center gap-1"
                    >
                      <Edit size={12} /> Rename
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCatToDelete(cat.id.replace('cat-', ''));
                      }}
                      className="text-[11px] text-neutral-500 hover:text-red-400 flex items-center gap-1"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Category Customizer Panel */}
        {selectedCategory && (
          <div className="lg:col-span-6 bg-[#141414] border border-neutral-800 rounded-xl overflow-hidden shadow-xl sticky top-4 space-y-4 p-5">
            <div className="border-b border-neutral-800 pb-3 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">{selectedCategory.name}</h4>
                <p className="text-xs text-neutral-400">Configure hero visuals, media uploads, and AI prompts</p>
              </div>
              <span className="px-2.5 py-1 bg-indigo-950/80 border border-indigo-500/40 text-indigo-400 rounded text-xs font-mono">
                {selectedCategory.id}
              </span>
            </div>

            {/* Current Image Preview & Upload */}
            <div className="space-y-3">
              <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-300 block">
                Showroom Hero Visual
              </label>
              <div className="aspect-[16/9] rounded-xl overflow-hidden bg-neutral-950 border border-neutral-800 relative">
                <img
                  src={selectedCategory.img}
                  alt={selectedCategory.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                  onError={(e) => handleImageElementError(e, DEFAULT_FALLBACK_IMAGE)}
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="flex-1 flex items-center justify-center gap-2 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors shadow-sm">
                  <Upload size={14} /> Upload Custom Image
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleCategoryImgUpload(file, selectedCategory.id);
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => handleAiCategoryImgGenerate(selectedCategory.id, selectedCategory.name)}
                  disabled={isGeneratingCatImage}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 text-neutral-200 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Sparkles size={14} className="text-purple-400" />
                  <span>{isGeneratingCatImage ? 'Synthesizing...' : 'Generate with AI'}</span>
                </button>
              </div>
            </div>

            {/* AI Generator Settings */}
            <div className="p-4 bg-neutral-950 border border-neutral-850 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-300">
                <Sparkles size={13} className="text-purple-400" />
                <span>AI Visual Generator Parameters</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">Visual Style</label>
                  <select
                    value={catStyle}
                    onChange={(e) => setCatStyle(e.target.value)}
                    className="w-full px-2 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-xs text-white"
                  >
                    <option>Sleek Industrial</option>
                    <option>Photorealistic Workshop</option>
                    <option>Commercial Showroom</option>
                    <option>Clean Studio 3D</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">Lighting</label>
                  <select
                    value={catLighting}
                    onChange={(e) => setCatLighting(e.target.value)}
                    className="w-full px-2 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-xs text-white"
                  >
                    <option>High-Contrast Spotlights</option>
                    <option>Bright Daylight Showroom</option>
                    <option>Dramatic Studio Neon</option>
                    <option>Commercial Workshop Diffuse</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Category Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={Boolean(catToDelete)}
        title="Delete Category"
        message={`Are you sure you want to delete category "${catToDelete}"? Associated products will remain in the catalog.`}
        confirmLabel="Delete Category"
        isDangerous={true}
        onConfirm={() => {
          if (catToDelete) handleDeleteCategory(catToDelete);
          setCatToDelete(null);
        }}
        onCancel={() => setCatToDelete(null)}
      />

      {/* Auto-Assign Media Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showAutoAssignConfirm}
        title="Auto-Assign WP Media by Category"
        message="This will only fill EMPTY image slots. Working images will never be overwritten. Continue?"
        confirmLabel="Proceed"
        isDangerous={false}
        onConfirm={handleAutoAssignCategoryMedia}
        onCancel={() => setShowAutoAssignConfirm(false)}
      />
    </div>
  );
};
