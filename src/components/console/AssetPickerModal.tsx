import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ImageIcon,
  X,
  Plus,
  Search,
  HardDrive,
  CheckCircle2,
  RefreshCw,
  Upload,
  AlertTriangle,
  Loader2,
  Check,
  Globe,
  FolderArchive,
} from 'lucide-react';
import { ProjectAssetImage } from '../../types/console.js';
import { normalizeImageKey } from '../../hooks/useResolvedImage.js';
import {
  subscribeToMediaStorage,
  notifyMediaStorageChanged,
} from '../../utils/mediaSync.js';

export interface AssetPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: 'primary' | number | string;
  assets: ProjectAssetImage[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  filterCategory: string;
  onFilterChange: (cat: string) => void;
  onSelectImage: (path: string) => void;
  onUploadFile?: (file: File) => void;
  onOpenMediaStorageTab?: () => void;
}

export interface MergedAssetItem {
  id: string | number;
  filename: string;
  url: string;
  size?: number; // Size in bytes
  date?: string;
  source: 'wordpress' | 'catalog';
  category?: string;
  label?: string;
}

interface ToastNotice {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

/**
 * Compresses an image file from the client device to a JPEG Data URI (max 1600px on either side, quality 0.8)
 */
function compressImageFileToJpeg(
  file: File,
  maxDimension = 1600,
  quality = 0.8
): Promise<{ dataUri: string; filename: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Failed to create canvas 2D rendering context'));
        }

        // Fill white background for transparent images converted to JPEG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const dataUri = canvas.toDataURL('image/jpeg', quality);
        const rawBase = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
        const filename = `${rawBase || 'asset'}.jpg`;
        resolve({ dataUri, filename });
      };
      img.onerror = () => reject(new Error(`Could not decode image: ${file.name}`));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error(`Could not read file: ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

interface AssetCardProps {
  item: MergedAssetItem;
  onSelect: (url: string) => void;
}

const AssetCard: React.FC<AssetCardProps> = ({ item, onSelect }) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const displayUrl = item.source === 'wordpress' ? item.url : normalizeImageKey(item.url);

  useEffect(() => {
    setHasError(false);
    setIsLoaded(false);
  }, [item.url]);

  return (
    <div
      onClick={() => onSelect(item.url)}
      className="group relative bg-[#181818] hover:bg-[#202020] border border-neutral-800 hover:border-indigo-500/80 hover:ring-1 hover:ring-indigo-500/50 rounded-xl overflow-hidden cursor-pointer transition-all duration-200 flex flex-col min-h-[220px] h-full shadow-md hover:shadow-indigo-950/30"
    >
      {/* Thumbnail Container */}
      <div className="h-32 w-full bg-neutral-950 relative overflow-hidden flex items-center justify-center shrink-0 border-b border-neutral-800/80">
        {!hasError && displayUrl ? (
          <img
            src={displayUrl}
            alt={item.filename || item.label || 'Media Asset'}
            loading="lazy"
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
            <ImageIcon size={26} className="text-neutral-600 mb-1.5 group-hover:text-indigo-400 transition-colors" />
            <span className="text-[10px] font-mono text-neutral-400 line-clamp-1 max-w-[90%] font-medium">
              {item.filename || item.label}
            </span>
          </div>
        )}

        {/* Source Badge in Top-Right Corner */}
        <div className="absolute top-2 right-2 z-10">
          {item.source === 'wordpress' ? (
            <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-black text-[9px] uppercase tracking-wider shadow-md flex items-center gap-1 border border-blue-400/40">
              <Globe size={10} />
              WORDPRESS MEDIA
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 font-bold text-[9px] uppercase tracking-wider shadow border border-neutral-700 flex items-center gap-1">
              <FolderArchive size={10} />
              CATALOG
            </span>
          )}
        </div>
      </div>

      {/* Info & Footer */}
      <div className="p-3 flex-1 flex flex-col justify-between gap-2 bg-[#181818]">
        <div>
          <p
            className="text-xs font-semibold text-neutral-200 line-clamp-2 group-hover:text-indigo-300 transition-colors"
            title={item.filename || item.label}
          >
            {item.filename || item.label || 'Unnamed Asset'}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-neutral-400 font-mono">
              {formatBytes(item.size)}
            </span>
            {item.date && (
              <span className="text-[10px] text-neutral-500">
                • {new Date(item.date).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-neutral-800/60 mt-1">
          <span className="uppercase font-mono text-[9px] px-1.5 py-0.5 bg-neutral-900 rounded border border-neutral-800 text-neutral-400 truncate max-w-[90px]">
            {item.category || (item.source === 'wordpress' ? 'wp-media' : 'catalog')}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(item.url);
            }}
            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[11px] font-bold flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
          >
            <Check size={12} />
            <span>Assign</span>
          </button>
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
  onOpenMediaStorageTab,
}) => {
  const [wpImages, setWpImages] = useState<MergedAssetItem[]>([]);
  const [isLoadingWp, setIsLoadingWp] = useState<boolean>(false);

  // Bulk upload state
  const [isBulkUploading, setIsBulkUploading] = useState<boolean>(false);
  const [uploadProgressText, setUploadProgressText] = useState<string>('');
  const [uploadPercent, setUploadPercent] = useState<number>(0);
  const [toasts, setToasts] = useState<ToastNotice[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addToast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-3), { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Fetch live WordPress Media Library items
  const fetchWpMedia = useCallback(async () => {
    setIsLoadingWp(true);
    try {
      const res = await fetch('/api/list-images');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.images)) {
          const mapped: MergedAssetItem[] = data.images.map((img: any) => {
            const url = img.url || '';
            const filename = img.filename || url.split('/').pop() || 'wp_media_asset.jpg';
            const label = filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
            return {
              id: img.id || url,
              filename: filename,
              url: url,
              size: typeof img.size === 'number' ? img.size : 0,
              date: img.date,
              source: 'wordpress' as const,
              category: 'wp-media',
              label: label.charAt(0).toUpperCase() + label.slice(1),
            };
          });
          setWpImages(mapped);
        }
      }
    } catch (err: any) {
      console.warn('[AssetPickerModal] Failed to fetch WordPress media list:', err);
    } finally {
      setIsLoadingWp(false);
    }
  }, []);

  // Live sync on modal open and subscription to media mutations
  useEffect(() => {
    if (!isOpen) return;

    fetchWpMedia();
    const unsubscribe = subscribeToMediaStorage(() => {
      fetchWpMedia();
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen, fetchWpMedia]);

  // Transform catalog assets from props
  const catalogItems = useMemo<MergedAssetItem[]>(() => {
    if (!assets || !Array.isArray(assets)) return [];
    const list: MergedAssetItem[] = [];
    const seen = new Set<string>();

    for (const a of assets) {
      const rawUrl = (a.url || a.thumbnail || a.originalUrl || a.path || '').trim();
      if (!rawUrl) continue;
      const key = rawUrl.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      const isWpUrl =
        rawUrl.includes('store.car-lifts.co.za') ||
        rawUrl.includes('/wp-content/uploads/') ||
        a.category === 'wp-media';

      const filename = rawUrl.split('/').filter(Boolean).pop() || a.label || 'Asset';

      list.push({
        id: a.id || rawUrl,
        filename: filename,
        url: rawUrl,
        size: 0,
        source: isWpUrl ? 'wordpress' : 'catalog',
        category: a.category || 'catalog',
        label: a.label || filename,
      });
    }

    return list;
  }, [assets]);

  // Merged live grid of WordPress Media + Local Catalog Assets
  const mergedAssets = useMemo<MergedAssetItem[]>(() => {
    const list: MergedAssetItem[] = [];
    const seenUrls = new Set<string>();

    // 1. WordPress media items from live API
    for (const wp of wpImages) {
      if (!wp.url) continue;
      const key = wp.url.toLowerCase();
      if (!seenUrls.has(key)) {
        seenUrls.add(key);
        list.push(wp);
      }
    }

    // 2. Local catalog assets
    for (const cat of catalogItems) {
      if (!cat.url) continue;
      const key = cat.url.toLowerCase();
      if (!seenUrls.has(key)) {
        seenUrls.add(key);
        list.push(cat);
      }
    }

    return list;
  }, [wpImages, catalogItems]);

  const wpCount = useMemo(() => mergedAssets.filter((a) => a.source === 'wordpress').length, [mergedAssets]);
  const catalogCount = useMemo(() => mergedAssets.filter((a) => a.source === 'catalog').length, [mergedAssets]);

  // Filter and search
  const filteredAssets = useMemo(() => {
    return mergedAssets.filter((item) => {
      // Source / Category filter
      if (filterCategory === 'wordpress' && item.source !== 'wordpress') return false;
      if (filterCategory === 'catalog' && item.source !== 'catalog') return false;
      if (filterCategory !== 'all' && filterCategory !== 'wordpress' && filterCategory !== 'catalog') {
        if (item.category !== filterCategory) return false;
      }

      // Search query filter across filename, label, url
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = item.filename.toLowerCase().includes(q);
        const matchLabel = (item.label || '').toLowerCase().includes(q);
        const matchUrl = item.url.toLowerCase().includes(q);
        if (!matchName && !matchLabel && !matchUrl) return false;
      }

      return true;
    });
  }, [mergedAssets, filterCategory, searchQuery]);

  // Bulk Upload Handler
  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    e.target.value = ''; // Reset input to allow selecting the same files again

    setIsBulkUploading(true);
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const progressMessage = `Uploading ${i + 1} of ${fileList.length}: ${file.name}`;
      setUploadProgressText(progressMessage);
      setUploadPercent(Math.round(((i) / fileList.length) * 100));

      try {
        // 1. Client-side JPEG compression (max 1600px, quality 0.8)
        const { dataUri, filename } = await compressImageFileToJpeg(file, 1600, 0.8);

        // 2. Upload to WordPress Media via /api/upload-image
        const res = await fetch('/api/upload-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: filename, data: dataUri }),
        });

        const resData = await res.json().catch(() => ({}));

        if (!res.ok || !resData || resData.success !== true) {
          const detailMsg = resData?.details || resData?.error || `HTTP ${res.status}`;
          addToast('error', `Failed "${file.name}": ${detailMsg}`);
          failCount++;
        } else {
          addToast('success', `Uploaded "${file.name}" to WordPress Media`);
          successCount++;
        }
      } catch (err: any) {
        addToast('error', `Failed "${file.name}": ${err?.message || 'Upload error'}`);
        failCount++;
      }
    }

    setUploadPercent(100);
    setUploadProgressText(
      `Finished upload: ${successCount} succeeded${failCount > 0 ? `, ${failCount} failed` : ''}`
    );

    // Re-fetch media library from server so new assets appear with blue WORDPRESS MEDIA badges
    await fetchWpMedia();
    notifyMediaStorageChanged('upload');

    setTimeout(() => {
      setIsBulkUploading(false);
      setUploadProgressText('');
      setUploadPercent(0);
    }, 2500);
  };

  const handleCardAssign = (url: string) => {
    onSelectImage(url);
    onClose();
  };

  if (!isOpen) return null;

  const targetLabel =
    target === 'primary'
      ? 'Primary Cover Image'
      : typeof target === 'number'
      ? `Gallery Slot #${target + 1}`
      : String(target);

  return (
    <div className="fixed inset-0 z-[10000] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121212] border border-neutral-800 rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-neutral-800 bg-[#181818] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-indigo-950/80 border border-indigo-500/40 text-indigo-400">
              <ImageIcon size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>Media Storage Asset Picker</span>
                <span className="px-2 py-0.5 rounded bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-[10px] normal-case font-semibold">
                  Target: {targetLabel}
                </span>
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Live merged view of WordPress Media Storage ({wpCount} items) and Catalog assets ({catalogCount} items).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-3 border-b border-neutral-800 bg-neutral-900/70 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-[280px]">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={14} />
              <input
                type="text"
                placeholder="Search assets by filename across WordPress and catalog..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 font-sans"
              />
            </div>

            {/* Source & Category Filter Dropdown */}
            <select
              value={filterCategory}
              onChange={(e) => onFilterChange(e.target.value)}
              className="px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-300 focus:outline-none focus:border-indigo-500 font-medium"
            >
              <option value="all">All Assets ({mergedAssets.length})</option>
              <option value="wordpress">WordPress Media ({wpCount})</option>
              <option value="catalog">Catalog ({catalogCount})</option>
            </select>

            <button
              type="button"
              onClick={fetchWpMedia}
              disabled={isLoadingWp}
              className={`p-1.5 rounded-lg border border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white hover:border-neutral-700 transition-colors cursor-pointer ${
                isLoadingWp ? 'animate-spin text-indigo-400' : ''
              }`}
              title="Sync & refresh WordPress media"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Green UPLOAD TO STORAGE with multiple file support */}
            <label
              className={`flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors shadow-sm ${
                isBulkUploading ? 'opacity-70 pointer-events-none' : ''
              }`}
            >
              {isBulkUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              <span>{isBulkUploading ? 'Uploading...' : 'Upload to Storage'}</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                disabled={isBulkUploading}
                onChange={handleBulkUpload}
              />
            </label>

            {onOpenMediaStorageTab && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenMediaStorageTab();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                title="Open full Media Storage tab"
              >
                <HardDrive size={13} />
                <span>Media Tab</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Upload Progress Banner */}
        {isBulkUploading && (
          <div className="px-4 py-2.5 bg-neutral-900 border-b border-neutral-800 flex flex-col gap-1.5 shrink-0 animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                <Loader2 size={13} className="animate-spin" />
                {uploadProgressText}
              </span>
              <span className="font-mono text-neutral-400 text-[11px]">{uploadPercent}%</span>
            </div>
            <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300 ease-out"
                style={{ width: `${uploadPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Floating / Stacked Toast Notifications */}
        {toasts.length > 0 && (
          <div className="px-4 py-2 bg-neutral-950/90 border-b border-neutral-800/80 flex flex-col gap-1.5 shrink-0">
            {toasts.map((t) => (
              <div
                key={t.id}
                className={`px-3 py-1.5 rounded-lg text-xs flex items-center justify-between gap-2 border animate-in slide-in-from-top-1 duration-150 ${
                  t.type === 'success'
                    ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
                    : t.type === 'error'
                    ? 'bg-red-950/70 border-red-500/40 text-red-300'
                    : 'bg-indigo-950/70 border-indigo-500/40 text-indigo-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  {t.type === 'success' ? (
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                  ) : t.type === 'error' ? (
                    <AlertTriangle size={14} className="text-red-400 shrink-0" />
                  ) : (
                    <Loader2 size={14} className="animate-spin text-indigo-400 shrink-0" />
                  )}
                  <span className="font-medium">{t.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeToast(t.id)}
                  className="opacity-70 hover:opacity-100 text-neutral-400 hover:text-white"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Merged Grid View */}
        <div className="p-4 overflow-y-auto flex-1 min-h-[380px] max-h-[64vh] grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 bg-black/40">
          {filteredAssets.map((item, idx) => (
            <AssetCard
              key={`${item.source}-${item.id}-${idx}`}
              item={item}
              onSelect={handleCardAssign}
            />
          ))}

          {filteredAssets.length === 0 && (
            <div className="col-span-full py-16 flex flex-col items-center justify-center text-center text-neutral-500 text-xs">
              <ImageIcon size={36} className="text-neutral-600 mb-2" />
              <p className="font-bold text-neutral-300 text-sm">No matching assets found</p>
              <p className="text-neutral-500 text-xs mt-1 max-w-md">
                {searchQuery
                  ? `No media assets matched "${searchQuery}". Try changing your search query or switching filters.`
                  : 'No assets available in this view. Use "Upload to Storage" to add new images to WordPress Media.'}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-neutral-800 bg-[#181818] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 text-xs text-neutral-400">
            <span>
              Showing <strong className="text-white">{filteredAssets.length}</strong> of {mergedAssets.length} assets
            </span>
            <span className="text-neutral-600">•</span>
            <span className="flex items-center gap-1 text-blue-400 font-medium">
              <Globe size={11} /> {wpCount} WordPress
            </span>
            <span className="text-neutral-600">•</span>
            <span className="flex items-center gap-1 text-neutral-400">
              <FolderArchive size={11} /> {catalogCount} Catalog
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
