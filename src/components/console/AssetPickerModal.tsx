import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ImageIcon, X, Plus, Search, HardDrive, Sparkles, CheckCircle2, RefreshCw } from 'lucide-react';
import { ProjectAssetImage } from '../../types/console.js';
import { normalizeImageKey } from '../../hooks/useResolvedImage.js';
import {
  subscribeToMediaStorage,
  fetchWordPressMediaAssets,
  notifyMediaStorageChanged,
} from '../../utils/mediaSync.js';
import { safeLocalStorage } from '../../utils/safeStorage.js';

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
  onOpenMediaStorageTab?: () => void;
}

interface AssetCardItemProps {
  item: ProjectAssetImage;
  onSelect: (path: string) => void;
}

const AssetCardItem: React.FC<AssetCardItemProps> = ({ item, onSelect }) => {
  const rawUrl = (item.url || item.thumbnail || item.originalUrl || item.path || '').trim();
  const resolvedUrl = normalizeImageKey(rawUrl);

  const [hasError, setHasError] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // Sync if item changes
  useEffect(() => {
    setHasError(false);
    setIsLoaded(false);
  }, [rawUrl]);

  const selectPath = item.path || item.url || item.originalUrl || item.thumbnail || resolvedUrl;

  return (
    <div
      onClick={() => onSelect(selectPath)}
      className="group relative bg-[#181818] hover:bg-[#202020] border border-neutral-800 hover:border-indigo-500/80 hover:ring-1 hover:ring-indigo-500/50 rounded-xl overflow-hidden cursor-pointer transition-all duration-200 flex flex-col min-h-[190px] h-full shadow-md hover:shadow-indigo-950/30"
    >
      {/* Thumbnail Container */}
      <div className="h-32 w-full bg-neutral-950 relative overflow-hidden flex items-center justify-center shrink-0 border-b border-neutral-800/80">
        {!hasError && resolvedUrl ? (
          <img
            src={resolvedUrl}
            alt={item.label || 'Asset Preview'}
            loading="eager"
            decoding="async"
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
            onLoad={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
            className={`w-full h-full object-cover transition-all duration-300 group-hover:scale-105 ${
              isLoaded ? 'opacity-100' : 'opacity-90'
            }`}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-gradient-to-br from-neutral-900 to-neutral-950 text-neutral-400">
            <ImageIcon size={28} className="text-neutral-600 mb-1.5 group-hover:text-indigo-400 transition-colors" />
            <span className="text-[10px] font-mono text-neutral-400 line-clamp-1 max-w-[90%] font-medium">
              {item.label}
            </span>
          </div>
        )}

        {/* Hover Overlay with Action Button */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2 backdrop-blur-[1px]">
          <span className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase rounded-lg shadow-lg flex items-center gap-1.5 transform group-hover:scale-100 scale-95 transition-all">
            <Sparkles size={13} className="text-indigo-200" />
            <span>Select Asset</span>
          </span>
        </div>

        {/* Badge in top right corner */}
        <div className="absolute top-2 right-2">
          {item.isCustom ? (
            <span className="px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-bold text-[9px] uppercase tracking-wider backdrop-blur-sm">
              Storage
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded bg-neutral-900/80 border border-neutral-700/60 text-neutral-300 font-mono text-[9px] uppercase backdrop-blur-sm">
              Catalog
            </span>
          )}
        </div>
      </div>

      {/* Info & Footer */}
      <div className="p-3 flex-1 flex flex-col justify-between gap-2 bg-[#181818]">
        <div>
          <p className="text-xs font-semibold text-neutral-200 line-clamp-2 group-hover:text-indigo-300 transition-colors">
            {item.label || 'Unnamed Asset'}
          </p>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-neutral-800/60 text-[10px] text-neutral-400">
          <span className="uppercase font-mono text-[9px] px-1.5 py-0.5 bg-neutral-900 rounded border border-neutral-800 text-neutral-300">
            {item.category || 'general'}
          </span>
          <span className="text-[10px] text-indigo-400 font-medium group-hover:underline flex items-center gap-0.5">
            <CheckCircle2 size={11} />
            <span>Assign</span>
          </span>
        </div>
      </div>
    </div>
  );
};

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
  onOpenMediaStorageTab,
}) => {
  const [liveWpAssets, setLiveWpAssets] = useState<ProjectAssetImage[]>([]);
  const [liveCustomAssets, setLiveCustomAssets] = useState<ProjectAssetImage[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const refreshLiveAssets = useCallback(async () => {
    setIsSyncing(true);
    try {
      const fetched = await fetchWordPressMediaAssets();
      if (fetched && fetched.length > 0) {
        setLiveWpAssets(fetched);
      }

      const saved = safeLocalStorage.getItem('triton_custom_assets');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setLiveCustomAssets(parsed);
          }
        } catch (e) {}
      }
    } catch (e) {
      console.warn('[AssetPickerModal] Sync error:', e);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Sync whenever modal opens or when external media mutations occur
  useEffect(() => {
    if (!isOpen) return;

    refreshLiveAssets();
    const unsubscribe = subscribeToMediaStorage(() => {
      refreshLiveAssets();
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen, refreshLiveAssets]);

  // Merge external assets prop with live WP items and custom uploads
  const unifiedAssets = useMemo(() => {
    const combined = [...liveCustomAssets, ...liveWpAssets, ...assets];
    const seen = new Set<string>();
    const result: ProjectAssetImage[] = [];

    for (const a of combined) {
      const rawUrl = (a.url || a.thumbnail || a.originalUrl || a.path || '').trim();
      if (!rawUrl) continue;
      const normalizedPath = normalizeImageKey(rawUrl);
      const key = String(a.id || normalizedPath || a.label || '').toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      result.push({
        ...a,
        path: normalizedPath,
        url: a.url ? normalizeImageKey(a.url) : normalizedPath,
        thumbnail: a.thumbnail ? normalizeImageKey(a.thumbnail) : normalizedPath,
        originalUrl: a.originalUrl ? normalizeImageKey(a.originalUrl) : normalizedPath,
      });
    }

    return result;
  }, [liveCustomAssets, liveWpAssets, assets]);

  if (!isOpen) return null;

  const categories = Array.from(new Set(unifiedAssets.map((a) => a.category).filter(Boolean)));

  const filtered = unifiedAssets.filter((a) => {
    const searchTarget = `${a.label || ''} ${a.path || ''} ${a.url || ''} ${a.category || ''}`.toLowerCase();
    const matchesSearch = !searchQuery || searchTarget.includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || a.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const handleModalUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadFile(file);
      notifyMediaStorageChanged('upload');
      setTimeout(() => {
        refreshLiveAssets();
      }, 800);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121212] border border-neutral-800 rounded-xl shadow-2xl w-full max-w-5xl max-h-[88vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-neutral-800 bg-[#181818] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-indigo-950/80 border border-indigo-500/40 text-indigo-400">
              <ImageIcon size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>Media Storage Asset Picker</span>
                <span className="px-2 py-0.5 rounded bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-[10px] normal-case font-semibold">
                  Target: {target === 'primary' ? 'Primary Cover Image' : `Gallery Slot #${target + 1}`}
                </span>
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Pick from WordPress Media Storage ({unifiedAssets.length} total items) or catalog assets to assign directly to this product.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-3 border-b border-neutral-800 bg-neutral-900/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[260px]">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={14} />
              <input
                type="text"
                placeholder="Search storage assets by filename or keyword..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <select
              value={filterCategory}
              onChange={(e) => onFilterChange(e.target.value)}
              className="px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-300 focus:outline-none focus:border-indigo-500 font-mono"
            >
              <option value="all">All Assets ({unifiedAssets.length})</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c.toUpperCase()} ({unifiedAssets.filter((a) => a.category === c).length})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={refreshLiveAssets}
              disabled={isSyncing}
              className={`p-1.5 rounded-lg border border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white hover:border-neutral-700 transition-colors ${
                isSyncing ? 'animate-spin text-indigo-400' : ''
              }`}
              title="Sync & refresh media items"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors shadow-sm">
              <Plus size={14} />
              <span>Upload to Storage</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleModalUpload}
              />
            </label>
            {onOpenMediaStorageTab && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenMediaStorageTab();
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-semibold transition-colors"
                title="Open full Media Storage tab"
              >
                <HardDrive size={13} />
                <span>Media Tab</span>
              </button>
            )}
          </div>
        </div>

        {/* Asset Grid Container with explicit styling */}
        <div className="p-4 overflow-y-auto flex-1 min-h-[360px] max-h-[62vh] grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 bg-black/40">
          {filtered.map((item, idx) => (
            <AssetCardItem
              key={item.id ? `asset-${item.id}-${idx}` : `asset-${item.path || item.url || idx}`}
              item={item}
              onSelect={onSelectImage}
            />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full py-16 flex flex-col items-center justify-center text-center text-neutral-500 text-xs">
              <ImageIcon size={32} className="text-neutral-600 mb-2" />
              <p className="font-semibold text-neutral-400">No matching assets found</p>
              <p className="text-neutral-500 text-[11px] mt-1 max-w-sm">
                No items matched &ldquo;{searchQuery}&rdquo;. Try clearing your search or uploading a new image.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-neutral-800 bg-[#181818] flex items-center justify-between">
          <span className="text-xs text-neutral-400">
            Showing <strong className="text-white">{filtered.length}</strong> of {unifiedAssets.length} storage images
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
