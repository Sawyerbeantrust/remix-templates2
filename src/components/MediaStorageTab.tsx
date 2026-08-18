import React, { useState, useEffect, useMemo } from 'react';
import { 
  ImageIcon, Trash2, Upload, Search, RefreshCw, CheckCircle2, 
  AlertTriangle, HardDrive, Filter, ExternalLink, ShieldAlert,
  Info, Sparkles, Check, X, FileImage, Database, Link, Tag, Package, Layers
} from 'lucide-react';
import { Product, FeaturedCategory } from '../types';
import { imageStore } from '../utils/imageStore';
import { useResolvedImage } from '../hooks/useResolvedImage';
import { handleImageElementError } from '../utils/imageFallback';

function MediaThumbnail({ url, alt, className }: { url: string; alt: string; className?: string }) {
  const resolved = useResolvedImage(url, '/placeholder.jpg');
  return (
    <img
      src={resolved}
      alt={alt}
      className={className}
      referrerPolicy="no-referrer"
      onError={(e) => handleImageElementError(e, '/placeholder.jpg')}
    />
  );
}

interface MediaStorageTabProps {
  products: Product[];
  onProductsChange: (newProducts: Product[]) => void;
  featuredCategories: FeaturedCategory[];
  onFeaturedCategoriesChange: (newCats: FeaturedCategory[]) => void;
  addLog: (msg: string) => void;
  isInospace?: boolean;
  onFixLegacyImages?: () => void;
  isMigratingImages?: boolean;
  onMigrateDefaultImagesToBlob?: () => void;
  isMigratingDefaultImages?: boolean;
}

interface MediaAssetItem {
  id: string;
  url: string;
  filename: string;
  sourceType: 'Server Disk' | 'Base64 Local' | 'Remote CDN' | 'Static Asset';
  fileSize?: number; // in bytes
  mtime?: string;
  usedInProducts: { id: string; name: string; sku: string }[];
  usedInCategories: { id: string; name: string }[];
}

export default function MediaStorageTab({
  products,
  onProductsChange,
  featuredCategories,
  onFeaturedCategoriesChange,
  addLog,
  isInospace = false,
  onFixLegacyImages,
  isMigratingImages = false,
  onMigrateDefaultImagesToBlob,
  isMigratingDefaultImages = false,
}: MediaStorageTabProps) {
  const [serverImages, setServerImages] = useState<Array<{ filename: string; relativePath: string; size: number; mtime: string; location: 'root' | 'imported' }>>([]);
  const [loadingServerImages, setLoadingServerImages] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'used' | 'unused' | 'base64' | 'disk'>('all');
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{ isOpen: boolean; assets: MediaAssetItem[] }>({ isOpen: false, assets: [] });

  // Assignment Modal State
  const [assignModal, setAssignModal] = useState<{
    isOpen: boolean;
    asset: MediaAssetItem | null;
  }>({ isOpen: false, asset: null });

  const [assignTargetType, setAssignTargetType] = useState<'product' | 'category'>('product');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [productImageType, setProductImageType] = useState<'primary' | 'gallery'>('primary');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [quickUploadAssignTarget, setQuickUploadAssignTarget] = useState<string>('library_only'); // 'library_only' | product_id | category_id

  // Fetch server disk images from API
  const fetchServerImages = async () => {
    setLoadingServerImages(true);
    try {
      const res = await fetch('/api/list-images');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.images)) {
          setServerImages(data.images);
        }
      }
    } catch (err) {
      console.warn('[MediaStorageTab] Could not fetch server image list:', err);
    } finally {
      setLoadingServerImages(false);
    }
  };

  useEffect(() => {
    fetchServerImages();
  }, []);

  // Aggregate all unique media assets from products, categories, and server disk
  const mediaAssets = useMemo(() => {
    const assetMap = new Map<string, MediaAssetItem>();

    // Helper to get or create asset entry
    const getOrCreateAsset = (url: string): MediaAssetItem => {
      const cleanUrl = url.trim();
      let id = cleanUrl;
      let filename = cleanUrl.split('/').pop() || cleanUrl;

      if (cleanUrl.startsWith('data:image')) {
        filename = `Uploaded_Base64_Image_${cleanUrl.substring(20, 32)}.png`;
        id = cleanUrl.substring(0, 60);
      } else if (filename.includes('?')) {
        filename = filename.split('?')[0];
      }

      if (!assetMap.has(id)) {
        let sourceType: MediaAssetItem['sourceType'] = 'Remote CDN';
        if (cleanUrl.startsWith('data:image')) {
          sourceType = 'Base64 Local';
        } else if (cleanUrl.startsWith('/src/assets/images/') || cleanUrl.startsWith('/src/assets/')) {
          sourceType = 'Server Disk';
        } else if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
          sourceType = 'Remote CDN';
        } else {
          sourceType = 'Static Asset';
        }

        // Check matching server disk image stats if available
        const matchedServer = serverImages.find(s => s.relativePath === cleanUrl || s.filename === filename);

        assetMap.set(id, {
          id,
          url: cleanUrl,
          filename,
          sourceType,
          fileSize: matchedServer ? matchedServer.size : undefined,
          mtime: matchedServer ? matchedServer.mtime : undefined,
          usedInProducts: [],
          usedInCategories: [],
        });
      }

      return assetMap.get(id)!;
    };

    // 1. Scan Products
    products.forEach(p => {
      if (p.image) {
        const item = getOrCreateAsset(p.image);
        if (!item.usedInProducts.some(x => x.id === p.id)) {
          item.usedInProducts.push({ id: p.id, name: p.name, sku: p.modelCode || p.id });
        }
      }
      if (Array.isArray(p.images)) {
        p.images.forEach(imgUrl => {
          if (imgUrl && imgUrl !== p.image) {
            const item = getOrCreateAsset(imgUrl);
            if (!item.usedInProducts.some(x => x.id === p.id)) {
              item.usedInProducts.push({ id: p.id, name: p.name, sku: p.modelCode || p.id });
            }
          }
        });
      }
    });

    // 2. Scan Categories
    featuredCategories.forEach(cat => {
      if (cat.img) {
        const item = getOrCreateAsset(cat.img);
        if (!item.usedInCategories.some(x => x.id === cat.id)) {
          item.usedInCategories.push({ id: cat.id, name: cat.name });
        }
      }
    });

    // 3. Scan Server Disk Images
    serverImages.forEach(s => {
      const relPath = s.relativePath;
      if (!assetMap.has(relPath)) {
        assetMap.set(relPath, {
          id: relPath,
          url: relPath,
          filename: s.filename,
          sourceType: 'Server Disk',
          fileSize: s.size,
          mtime: s.mtime,
          usedInProducts: [],
          usedInCategories: [],
        });
      }
    });

    return Array.from(assetMap.values());
  }, [products, featuredCategories, serverImages]);

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    return mediaAssets.filter(asset => {
      const matchesSearch = asset.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.usedInProducts.some(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchesSearch) return false;

      if (filterType === 'used') return asset.usedInProducts.length > 0 || asset.usedInCategories.length > 0;
      if (filterType === 'unused') return asset.usedInProducts.length === 0 && asset.usedInCategories.length === 0;
      if (filterType === 'base64') return asset.sourceType === 'Base64 Local';
      if (filterType === 'disk') return asset.sourceType === 'Server Disk';

      return true;
    });
  }, [mediaAssets, searchTerm, filterType]);

  // Format size helper
  const formatBytes = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  // Assign image handler
  const handleAssignImage = (asset: MediaAssetItem) => {
    setAssignModal({ isOpen: true, asset });
    setAssignTargetType('product');
    if (products.length > 0) {
      setSelectedProductId(products[0].id);
    }
    if (featuredCategories.length > 0) {
      setSelectedCategoryId(featuredCategories[0].id);
    }
  };

  const executeAssign = () => {
    if (!assignModal.asset) return;

    const imageUrl = assignModal.asset.url;

    if (assignTargetType === 'product') {
      if (!selectedProductId) return;
      const targetProd = products.find(p => p.id === selectedProductId);
      if (!targetProd) return;

      const updatedProducts = products.map(p => {
        if (p.id === selectedProductId) {
          if (productImageType === 'primary') {
            const currentGallery = Array.isArray(p.images) ? p.images : [p.image];
            return {
              ...p,
              image: imageUrl,
              images: Array.from(new Set([imageUrl, ...currentGallery]))
            };
          } else {
            const currentGallery = Array.isArray(p.images) ? p.images : [p.image];
            return {
              ...p,
              images: Array.from(new Set([...currentGallery, imageUrl]))
            };
          }
        }
        return p;
      });

      onProductsChange(updatedProducts);
      addLog(`[Media Assignment] Set image '${assignModal.asset.filename}' as ${productImageType} image for product: ${targetProd.name}`);
      setUploadStatus(`Assigned image to '${targetProd.name}' successfully!`);
    } else {
      if (!selectedCategoryId) return;
      const targetCat = featuredCategories.find(c => c.id === selectedCategoryId);
      if (!targetCat) return;

      const updatedCats = featuredCategories.map(c => {
        if (c.id === selectedCategoryId) {
          return { ...c, img: imageUrl };
        }
        return c;
      });

      onFeaturedCategoriesChange(updatedCats);
      addLog(`[Media Assignment] Set image '${assignModal.asset.filename}' for category: ${targetCat.name}`);
      setUploadStatus(`Assigned image to category '${targetCat.name}' successfully!`);
    }

    setAssignModal({ isOpen: false, asset: null });
    setTimeout(() => setUploadStatus(null), 3500);
  };

  // Upload new image handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadStatus('Uploading file to permanent storage...');

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();

        await new Promise<void>((resolve, reject) => {
          reader.onload = async () => {
            try {
              const base64Data = reader.result as string;
              let finalPath = base64Data;

              // Send to server upload endpoint
              const res = await fetch('/api/upload-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name: file.name,
                  data: base64Data
                })
              });

              if (res.ok) {
                const data = await res.json();
                if (data.path) {
                  finalPath = data.path;
                }
                addLog(`[Media Storage] Successfully saved permanent upload: ${file.name} -> ${finalPath}`);
              } else {
                addLog(`[Media Storage] Storing ${file.name} in durable IndexedDB persistent memory.`);
              }

              // If it's a base64 blob, store it in IndexedDB
              if (finalPath.startsWith('data:image')) {
                const uniqueKey = `media_asset_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
                const savedOk = await imageStore.setItem(uniqueKey, base64Data);
                if (!savedOk) {
                  alert(`Failed to save uploaded image '${file.name}' to persistent IndexedDB storage!`);
                  reject(new Error("IndexedDB image store setItem failed"));
                  return;
                }
                finalPath = uniqueKey;
              }

              // Check if quick upload target assignment was selected
              if (quickUploadAssignTarget.startsWith('prod_')) {
                const prodId = quickUploadAssignTarget.replace('prod_', '');
                const targetProd = products.find(p => p.id === prodId);
                if (targetProd) {
                  const updatedProducts = products.map(p => {
                    if (p.id === prodId) {
                      const currentGallery = Array.isArray(p.images) ? p.images : [p.image];
                      return {
                        ...p,
                        image: finalPath,
                        images: Array.from(new Set([finalPath, ...currentGallery]))
                      };
                    }
                    return p;
                  });
                  onProductsChange(updatedProducts);
                  addLog(`[Media Auto-Attach] Uploaded '${file.name}' and attached as primary image for product: ${targetProd.name}`);
                }
              } else if (quickUploadAssignTarget.startsWith('cat_')) {
                const catId = quickUploadAssignTarget.replace('cat_', '');
                const targetCat = featuredCategories.find(c => c.id === catId);
                if (targetCat) {
                  const updatedCats = featuredCategories.map(c => {
                    if (c.id === catId) {
                      return { ...c, img: finalPath };
                    }
                    return c;
                  });
                  onFeaturedCategoriesChange(updatedCats);
                  addLog(`[Media Auto-Attach] Uploaded '${file.name}' and attached to category: ${targetCat.name}`);
                }
              }

              resolve();
            } catch (err) {
              reject(err);
            }
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      setUploadStatus('Image(s) uploaded successfully!');
      await fetchServerImages();
      setTimeout(() => setUploadStatus(null), 3500);
    } catch (err) {
      console.error('[MediaStorageTab] Upload failed:', err);
      setUploadStatus('Error uploading image.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // Permanent Delete Function
  const executePermanentDelete = async (assetsToDelete: MediaAssetItem[]) => {
    if (assetsToDelete.length === 0) return;

    const urlsToRemove = new Set(assetsToDelete.map(a => a.url));

    addLog(`[Media Delete] Starting permanent deletion of ${assetsToDelete.length} media asset(s)...`);

    // 1. Send delete API request for server disk files
    for (const asset of assetsToDelete) {
      if (asset.sourceType === 'Server Disk' || asset.url.startsWith('/src/assets/')) {
        try {
          await fetch('/api/delete-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: asset.url })
          });
        } catch (e) {
          console.warn('[MediaStorageTab] Error deleting server image:', e);
        }
      }
    }

    // 2. Unlink/Replace images in Products Database
    const updatedProducts = products.map(prod => {
      let mainImg = prod.image;
      let gallery = Array.isArray(prod.images) ? [...prod.images] : [prod.image];

      if (urlsToRemove.has(mainImg)) {
        const remainingGallery = gallery.filter(img => !urlsToRemove.has(img));
        mainImg = remainingGallery.length > 0 ? remainingGallery[0] : '/placeholder.jpg';
      }

      gallery = gallery.filter(img => !urlsToRemove.has(img));
      if (gallery.length === 0) {
        gallery = [mainImg];
      }

      return {
        ...prod,
        image: mainImg,
        images: gallery,
      };
    });

    onProductsChange(updatedProducts);

    // 3. Unlink/Replace images in Featured Categories
    const updatedCategories = featuredCategories.map(cat => {
      if (urlsToRemove.has(cat.img)) {
        return {
          ...cat,
          img: '/images/car_lift_1.jpg'
        };
      }
      return cat;
    });

    onFeaturedCategoriesChange(updatedCategories);

    // 4. Refresh server images list
    await fetchServerImages();

    // 5. Clear selection and modal
    setSelectedImageIds(prev => prev.filter(id => !assetsToDelete.some(a => a.id === id)));
    setConfirmDeleteModal({ isOpen: false, assets: [] });

    addLog(`[Media Delete] Completed permanent deletion of ${assetsToDelete.length} image(s). Products & catalogue updated.`);
  };

  // Total stats
  const totalAssetsCount = mediaAssets.length;
  const unusedAssetsCount = mediaAssets.filter(a => a.usedInProducts.length === 0 && a.usedInCategories.length === 0).length;
  const totalCalculatedBytes = mediaAssets.reduce((acc, a) => acc + (a.fileSize || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats */}
      <div className={`p-6 rounded-xl border ${isInospace ? 'bg-white border-neutral-200 shadow-sm' : 'bg-[#111111] border-neutral-800'}`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${isInospace ? 'bg-[#e31b23]/10 text-[#e31b23]' : 'bg-[#ff0000]/10 text-[#ff0000]'}`}>
                <Database size={24} />
              </div>
              <div>
                <h2 className={`text-xl font-bold ${isInospace ? 'text-neutral-900' : 'text-white'}`}>
                  Permanent Image Storage & Catalogue Media Manager
                </h2>
                <p className={`text-xs mt-0.5 ${isInospace ? 'text-neutral-500' : 'text-neutral-400'}`}>
                  Upload from device, store permanently on disk, assign to product or catalogue items, and permanently delete images.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Action Upload & Assign options */}
          <div className="flex flex-wrap items-center gap-3">
            {onMigrateDefaultImagesToBlob && (
              <button
                type="button"
                onClick={onMigrateDefaultImagesToBlob}
                disabled={isMigratingDefaultImages}
                className={`px-3 py-2 rounded-lg border text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-sm ${
                  isInospace
                    ? 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100'
                    : 'border-blue-500/40 bg-blue-950/60 text-blue-300 hover:bg-blue-900/60'
                } disabled:opacity-50`}
                title="POST /api/migrate-default-images-to-blob: Upload all default images to Vercel Blob and update data/catalog.json"
              >
                <Upload size={14} className={isMigratingDefaultImages ? 'animate-spin text-blue-400' : 'text-blue-400'} />
                <span>{isMigratingDefaultImages ? 'Migrating to Blob...' : 'Migrate Default Images to Blob'}</span>
              </button>
            )}

            {onFixLegacyImages && (
              <button
                type="button"
                onClick={onFixLegacyImages}
                disabled={isMigratingImages}
                className={`px-3 py-2 rounded-lg border text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-sm ${
                  isInospace
                    ? 'border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100'
                    : 'border-purple-500/40 bg-purple-950/60 text-purple-300 hover:bg-purple-900/60'
                } disabled:opacity-50`}
                title="Convert local assets to base64, upload to Vercel Blob via /api/upload-image, and update catalog URLs"
              >
                <Database size={14} className={isMigratingImages ? 'animate-spin text-purple-400' : 'text-purple-400'} />
                <span>{isMigratingImages ? 'Migrating to Blob...' : 'Migrate Images to Blob'}</span>
              </button>
            )}

            <button
              onClick={fetchServerImages}
              disabled={loadingServerImages}
              className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                isInospace 
                  ? 'border-neutral-300 text-neutral-700 hover:bg-neutral-100' 
                  : 'border-neutral-700 text-neutral-300 hover:bg-neutral-800'
              }`}
            >
              <RefreshCw size={14} className={loadingServerImages ? 'animate-spin' : ''} />
              Sync Media
            </button>

            {/* Quick Assign Dropdown for Device Upload */}
            <select
              value={quickUploadAssignTarget}
              onChange={(e) => setQuickUploadAssignTarget(e.target.value)}
              className={`text-xs px-2.5 py-2 rounded-lg border focus:outline-none max-w-[200px] truncate ${
                isInospace 
                  ? 'bg-neutral-50 border-neutral-300 text-neutral-800' 
                  : 'bg-[#181818] border-neutral-700 text-neutral-200'
              }`}
            >
              <option value="library_only">📂 Upload to Library Only</option>
              <optgroup label="Attach to Product">
                {products.map(p => (
                  <option key={p.id} value={`prod_${p.id}`}>
                    📦 {p.name} ({p.modelCode})
                  </option>
                ))}
              </optgroup>
              <optgroup label="Attach to Category">
                {featuredCategories.map(c => (
                  <option key={c.id} value={`cat_${c.id}`}>
                    🏷️ {c.name}
                  </option>
                ))}
              </optgroup>
            </select>

            <label className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all shadow-md ${
              isInospace 
                ? 'bg-[#e31b23] text-white hover:bg-[#c3151c]' 
                : 'bg-[#ff0000] text-white hover:bg-[#cc0000]'
            }`}>
              <Upload size={14} />
              {isUploading ? 'Uploading...' : 'Upload From Device'}
              <input 
                type="file" 
                accept="image/*" 
                multiple 
                onChange={handleFileUpload} 
                className="hidden" 
                disabled={isUploading}
              />
            </label>
          </div>
        </div>

        {uploadStatus && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{uploadStatus}</span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-neutral-800">
          <div className={`p-3 rounded-lg ${isInospace ? 'bg-neutral-50' : 'bg-[#181818]'}`}>
            <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Total Media Files</span>
            <span className={`text-lg font-black ${isInospace ? 'text-neutral-900' : 'text-white'}`}>{totalAssetsCount}</span>
          </div>
          <div className={`p-3 rounded-lg ${isInospace ? 'bg-neutral-50' : 'bg-[#181818]'}`}>
            <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Known Storage Used</span>
            <span className={`text-lg font-black ${isInospace ? 'text-neutral-900' : 'text-white'}`}>{formatBytes(totalCalculatedBytes)}</span>
          </div>
          <div className={`p-3 rounded-lg ${isInospace ? 'bg-neutral-50' : 'bg-[#181818]'}`}>
            <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Active Linked Images</span>
            <span className="text-lg font-black text-emerald-400">{totalAssetsCount - unusedAssetsCount}</span>
          </div>
          <div className={`p-3 rounded-lg ${isInospace ? 'bg-neutral-50' : 'bg-[#181818]'}`}>
            <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Unused / Orphaned</span>
            <span className={`text-lg font-black ${unusedAssetsCount > 0 ? 'text-amber-400' : 'text-neutral-400'}`}>
              {unusedAssetsCount}
            </span>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
        isInospace ? 'bg-white border-neutral-200' : 'bg-[#111111] border-neutral-800'
      }`}>
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search image name, SKU, or product..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-9 pr-4 py-2 text-xs rounded-lg border focus:outline-none ${
              isInospace 
                ? 'bg-neutral-50 border-neutral-300 text-neutral-900 focus:border-[#e31b23]' 
                : 'bg-[#181818] border-neutral-700 text-white focus:border-[#ff0000]'
            }`}
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              filterType === 'all' 
                ? (isInospace ? 'bg-[#e31b23] text-white' : 'bg-[#ff0000] text-white') 
                : (isInospace ? 'bg-neutral-100 text-neutral-600' : 'bg-[#1a1a1a] text-neutral-400')
            }`}
          >
            All ({mediaAssets.length})
          </button>
          <button
            onClick={() => setFilterType('used')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              filterType === 'used' 
                ? 'bg-emerald-600 text-white' 
                : (isInospace ? 'bg-neutral-100 text-neutral-600' : 'bg-[#1a1a1a] text-neutral-400')
            }`}
          >
            Linked
          </button>
          <button
            onClick={() => setFilterType('unused')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              filterType === 'unused' 
                ? 'bg-amber-600 text-white' 
                : (isInospace ? 'bg-neutral-100 text-neutral-600' : 'bg-[#1a1a1a] text-neutral-400')
            }`}
          >
            Unused ({unusedAssetsCount})
          </button>
          <button
            onClick={() => setFilterType('disk')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              filterType === 'disk' 
                ? 'bg-blue-600 text-white' 
                : (isInospace ? 'bg-neutral-100 text-neutral-600' : 'bg-[#1a1a1a] text-neutral-400')
            }`}
          >
            Server Disk
          </button>
        </div>

        {/* Bulk Action Button */}
        {selectedImageIds.length > 0 && (
          <button
            onClick={() => {
              const assets = mediaAssets.filter(a => selectedImageIds.includes(a.id));
              setConfirmDeleteModal({ isOpen: true, assets });
            }}
            className="px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md transition-colors"
          >
            <Trash2 size={14} />
            Delete Selected ({selectedImageIds.length})
          </button>
        )}
      </div>

      {/* Image Gallery Grid */}
      {filteredAssets.length === 0 ? (
        <div className={`p-12 text-center rounded-xl border ${isInospace ? 'bg-white border-neutral-200' : 'bg-[#111111] border-neutral-800'}`}>
          <ImageIcon size={48} className="mx-auto text-neutral-500 mb-3" />
          <h3 className={`text-base font-bold ${isInospace ? 'text-neutral-800' : 'text-white'}`}>No matching media assets found</h3>
          <p className="text-xs text-neutral-400 mt-1">Try resetting your search query or uploading a new image from device.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAssets.map(asset => {
            const isSelected = selectedImageIds.includes(asset.id);
            const isUnused = asset.usedInProducts.length === 0 && asset.usedInCategories.length === 0;

            return (
              <div
                key={asset.id}
                className={`relative group rounded-xl border overflow-hidden flex flex-col transition-all duration-200 ${
                  isSelected 
                    ? 'border-red-500 ring-2 ring-red-500/30' 
                    : (isInospace ? 'bg-white border-neutral-200 hover:border-neutral-300' : 'bg-[#141414] border-neutral-800 hover:border-neutral-700')
                }`}
              >
                {/* Selection Checkbox */}
                <div className="absolute top-2 left-2 z-10">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedImageIds(prev => [...prev, asset.id]);
                      } else {
                        setSelectedImageIds(prev => prev.filter(id => id !== asset.id));
                      }
                    }}
                    className="w-4 h-4 rounded border-neutral-700 text-red-600 focus:ring-red-500 cursor-pointer"
                  />
                </div>

                {/* Source Tag Badge */}
                <div className="absolute top-2 right-2 z-10 flex gap-1">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase backdrop-blur-md shadow ${
                    asset.sourceType === 'Server Disk'
                      ? 'bg-blue-600/90 text-white'
                      : asset.sourceType === 'Base64 Local'
                      ? 'bg-purple-600/90 text-white'
                      : 'bg-neutral-800/90 text-neutral-300'
                  }`}>
                    {asset.sourceType}
                  </span>
                  {isUnused ? (
                    <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-amber-500/90 text-white backdrop-blur-md">
                      Unused
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-emerald-600/90 text-white backdrop-blur-md">
                      In Use ({asset.usedInProducts.length + asset.usedInCategories.length})
                    </span>
                  )}
                </div>

                {/* Image Preview Thumbnail */}
                <div className="w-full h-44 bg-neutral-900/50 flex items-center justify-center overflow-hidden relative group/img">
                  <MediaThumbnail
                    url={asset.url}
                    alt={asset.filename}
                    className="w-full h-full object-contain p-2 group-hover/img:scale-105 transition-transform duration-300"
                  />
                </div>

                {/* Image Details */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h4 className={`text-xs font-bold line-clamp-1 truncate ${isInospace ? 'text-neutral-900' : 'text-white'}`} title={asset.filename}>
                      {asset.filename}
                    </h4>
                    <p className="text-[10px] text-neutral-400 font-mono mt-0.5 truncate" title={asset.url}>
                      {asset.url}
                    </p>
                    
                    {asset.fileSize && (
                      <p className="text-[10px] text-neutral-400 mt-1 flex items-center gap-1 font-mono">
                        <HardDrive size={10} />
                        <span>Size: {formatBytes(asset.fileSize)}</span>
                      </p>
                    )}
                  </div>

                  {/* Usage Summary */}
                  <div className={`p-2 rounded text-[10px] space-y-1 ${isInospace ? 'bg-neutral-100' : 'bg-[#1e1e1e]'}`}>
                    {asset.usedInProducts.length > 0 && (
                      <p className="text-neutral-300 font-medium truncate">
                        <strong className="text-emerald-400">Products:</strong> {asset.usedInProducts.map(p => p.name).join(', ')}
                      </p>
                    )}
                    {asset.usedInCategories.length > 0 && (
                      <p className="text-neutral-300 font-medium truncate">
                        <strong className="text-blue-400">Categories:</strong> {asset.usedInCategories.map(c => c.name).join(', ')}
                      </p>
                    )}
                    {isUnused && (
                      <p className="text-amber-400 italic">Not assigned to any product or category.</p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-neutral-800">
                    <button
                      onClick={() => handleAssignImage(asset)}
                      className={`w-full py-1.5 rounded text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow ${
                        isInospace
                          ? 'bg-neutral-900 text-white hover:bg-neutral-800'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      }`}
                    >
                      <Link size={12} />
                      Assign to Product / Catalogue
                    </button>

                    <div className="flex items-center justify-between">
                      <a
                        href={asset.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-neutral-400 hover:text-white flex items-center gap-1 transition-colors"
                      >
                        <ExternalLink size={10} />
                        View Full
                      </a>

                      <button
                        onClick={() => setConfirmDeleteModal({ isOpen: true, assets: [asset] })}
                        className="px-2 py-1 rounded bg-red-600/10 border border-red-500/30 text-red-400 hover:bg-red-600 hover:text-white transition-all text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 size={11} />
                        Delete Permanently
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Assign Image Modal */}
      {assignModal.isOpen && assignModal.asset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className={`max-w-md w-full p-6 rounded-xl border shadow-2xl space-y-5 ${
            isInospace ? 'bg-white border-neutral-300 text-neutral-900' : 'bg-[#181818] border-neutral-800 text-white'
          }`}>
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <Link size={20} className="text-emerald-400" />
                <h3 className="text-base font-bold">Assign Image to Catalogue</h3>
              </div>
              <button 
                onClick={() => setAssignModal({ isOpen: false, asset: null })}
                className="text-neutral-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Selected Image Preview */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-neutral-900/80 border border-neutral-800">
              <MediaThumbnail 
                url={assignModal.asset.url} 
                alt={assignModal.asset.filename} 
                className="w-14 h-14 object-contain rounded bg-black/50 border border-neutral-800 p-1"
              />
              <div className="overflow-hidden text-xs">
                <p className="font-bold truncate text-white">{assignModal.asset.filename}</p>
                <p className="text-[10px] text-neutral-400 font-mono truncate">{assignModal.asset.url}</p>
              </div>
            </div>

            {/* Target Selector Tabs */}
            <div className="flex gap-2 p-1 rounded-lg bg-neutral-900 border border-neutral-800 text-xs">
              <button
                onClick={() => setAssignTargetType('product')}
                className={`flex-1 py-1.5 rounded font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  assignTargetType === 'product' ? 'bg-emerald-600 text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Package size={14} />
                Product
              </button>
              <button
                onClick={() => setAssignTargetType('category')}
                className={`flex-1 py-1.5 rounded font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  assignTargetType === 'category' ? 'bg-blue-600 text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Layers size={14} />
                Featured Category
              </button>
            </div>

            {/* Options for Product */}
            {assignTargetType === 'product' ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1">Select Target Product:</label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className={`w-full p-2.5 text-xs rounded-lg border focus:outline-none ${
                      isInospace 
                        ? 'bg-neutral-50 border-neutral-300 text-neutral-900' 
                        : 'bg-[#111111] border-neutral-700 text-white'
                    }`}
                  >
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.modelCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1">Image Role:</label>
                  <div className="flex gap-3 text-xs">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input 
                        type="radio" 
                        name="productImageType" 
                        checked={productImageType === 'primary'} 
                        onChange={() => setProductImageType('primary')} 
                        className="text-emerald-500 focus:ring-emerald-500"
                      />
                      <span>Primary Cover Image</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input 
                        type="radio" 
                        name="productImageType" 
                        checked={productImageType === 'gallery'} 
                        onChange={() => setProductImageType('gallery')} 
                        className="text-emerald-500 focus:ring-emerald-500"
                      />
                      <span>Add to Gallery</span>
                    </label>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1">Select Featured Category:</label>
                  <select
                    value={selectedCategoryId}
                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                    className={`w-full p-2.5 text-xs rounded-lg border focus:outline-none ${
                      isInospace 
                        ? 'bg-neutral-50 border-neutral-300 text-neutral-900' 
                        : 'bg-[#111111] border-neutral-700 text-white'
                    }`}
                  >
                    {featuredCategories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
              <button
                onClick={() => setAssignModal({ isOpen: false, asset: null })}
                className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                  isInospace ? 'bg-neutral-100 text-neutral-800 hover:bg-neutral-200' : 'bg-neutral-800 text-white hover:bg-neutral-700'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={executeAssign}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider cursor-pointer shadow-lg flex items-center gap-1.5"
              >
                <Check size={14} />
                Apply & Save to Catalogue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Deletion Modal */}
      {confirmDeleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className={`max-w-md w-full p-6 rounded-xl border shadow-2xl space-y-5 ${
            isInospace ? 'bg-white border-neutral-300' : 'bg-[#181818] border-neutral-800 text-white'
          }`}>
            <div className="flex items-center gap-3 text-red-500">
              <div className="p-3 rounded-full bg-red-500/10 border border-red-500/30">
                <ShieldAlert size={28} />
              </div>
              <div>
                <h3 className="text-lg font-bold">Permanently Delete Image(s)?</h3>
                <p className="text-xs text-neutral-400">This action cannot be undone.</p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs space-y-2">
              <p className="text-red-300 font-medium">
                You are about to permanently wipe <strong>{confirmDeleteModal.assets.length}</strong> image file(s) from server storage and remove them from all product catalogues.
              </p>
              <ul className="max-h-28 overflow-y-auto font-mono text-[11px] text-neutral-300 space-y-1 list-disc pl-4">
                {confirmDeleteModal.assets.map(a => (
                  <li key={a.id} className="truncate">{a.filename}</li>
                ))}
              </ul>
            </div>

            <p className="text-xs text-neutral-400">
              If any products currently use these images, they will automatically fall back to clean standard default placeholders.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
              <button
                onClick={() => setConfirmDeleteModal({ isOpen: false, assets: [] })}
                className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                  isInospace ? 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800' : 'bg-neutral-800 hover:bg-neutral-700 text-white'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={() => executePermanentDelete(confirmDeleteModal.assets)}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider cursor-pointer shadow-lg flex items-center gap-1.5"
              >
                <Trash2 size={14} />
                Confirm Permanent Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

