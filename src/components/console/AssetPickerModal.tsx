import React from 'react';
import { ImageIcon, X, Plus, Search, Filter, HardDrive } from 'lucide-react';
import { ProjectAssetImage } from '../../types/console.js';
import { handleImageElementError, DEFAULT_FALLBACK_IMAGE } from '../../utils/imageFallback.js';

interface AssetPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: 'primary' | number;
  assets: ProjectAssetImage[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  filterCategory: string;
  onFilterChange: (cat: string) => void;
  onSelectImage: (path: string) => void;
  onUploadFile: (file: File) => void;
}

export const AssetPickerModal: React.FC<AssetPickerModalProps> = ({
  isOpen,
  onClose,
  target,
  assets,
  searchQuery,
  onSearchChange,
  filterCategory,
  onFilterChange,
  onSelectImage,
  onUploadFile,
}) => {
  if (!isOpen) return null;

  const categories = Array.from(new Set(assets.map((a) => a.category)));

  const filtered = assets.filter((a) => {
    const matchesSearch = !searchQuery || a.label.toLowerCase().includes(searchQuery.toLowerCase()) || a.path.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || a.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="fixed inset-0 z-[10000] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121212] border border-neutral-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-neutral-800 bg-[#181818] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-950/80 border border-indigo-500/40 text-indigo-400">
              <ImageIcon size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Select Equipment Asset — {target === 'primary' ? 'Primary Cover' : `Gallery Slot ${target + 1}`}
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Choose an optimized high-resolution asset or upload directly to WordPress Media
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-3 border-b border-neutral-800 bg-neutral-900/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={14} />
              <input
                type="text"
                placeholder="Search assets by name or keyword..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <select
              value={filterCategory}
              onChange={(e) => onFilterChange(e.target.value)}
              className="px-2.5 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Categories ({assets.length})</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors shadow-sm">
            <Plus size={14} />
            <span>Upload New Asset</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUploadFile(file);
              }}
            />
          </label>
        </div>

        {/* Asset Grid */}
        <div className="p-4 overflow-y-auto flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 bg-black/40">
          {filtered.map((item, idx) => (
            <div
              key={idx}
              onClick={() => onSelectImage(item.path)}
              className="group relative bg-[#181818] border border-neutral-800 hover:border-indigo-500 rounded-lg overflow-hidden cursor-pointer transition-all duration-150 hover:shadow-lg flex flex-col"
            >
              <div className="aspect-[4/3] bg-neutral-950 relative overflow-hidden flex items-center justify-center">
                <img
                  src={item.path}
                  alt={item.label}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  onError={(e) => handleImageElementError(e, DEFAULT_FALLBACK_IMAGE)}
                />
                <div className="absolute inset-0 bg-indigo-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="px-2 py-1 bg-indigo-600 text-white text-[10px] font-bold uppercase rounded shadow">
                    Select Image
                  </span>
                </div>
              </div>
              <div className="p-2 flex-1 flex flex-col justify-between">
                <p className="text-[11px] font-semibold text-neutral-200 line-clamp-1 group-hover:text-indigo-400">
                  {item.label}
                </p>
                <div className="flex items-center justify-between mt-1 text-[10px] text-neutral-500">
                  <span className="uppercase font-mono">{item.category}</span>
                  {item.isCustom && <span className="text-emerald-400 font-bold">Custom</span>}
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full py-12 text-center text-neutral-500 text-xs">
              No matching images found for &ldquo;{searchQuery}&rdquo;.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-neutral-800 bg-[#181818] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-850 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
