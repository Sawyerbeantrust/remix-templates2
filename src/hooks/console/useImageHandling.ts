import { useState, useCallback, useEffect, useMemo } from 'react';
import { Product } from '../../types/index.js';
import { ProjectAssetImage } from '../../types/console.js';
import { PROJECT_ASSET_IMAGES, normalizeCategoryImagePath } from '../../utils/console/productNormalization.js';
import { uploadImageToWordPress } from '../../utils/imageUpload.js';
import { safeLocalStorage } from '../../utils/safeStorage.js';
import { PRODUCTS } from '../../data/products.js';

interface UseImageHandlingOptions {
  editedProduct: Product | null;
  setEditedProduct: React.Dispatch<React.SetStateAction<Product | null>>;
  addLog: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  products?: Product[];
}

export function useImageHandling({
  editedProduct,
  setEditedProduct,
  addLog,
  products,
}: UseImageHandlingOptions) {
  const [isGeneratingAiImage, setIsGeneratingAiImage] = useState(false);
  const [aiSimulationStep, setAiSimulationStep] = useState<string>('');
  const [aiPreviewData, setAiPreviewData] = useState<{ url: string; prompt: string } | null>(null);

  // Asset picker modal state
  const [isAssetPickerOpen, setIsAssetPickerOpen] = useState(false);
  const [assetPickerTarget, setAssetPickerTarget] = useState<'primary' | number>('primary');
  const [assetSearchQuery, setAssetSearchQuery] = useState('');
  const [assetFilterCategory, setAssetFilterCategory] = useState<string>('all');

  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState<string>('');

  const [customAssets, setCustomAssets] = useState<ProjectAssetImage[]>(() => {
    const saved = safeLocalStorage.getItem('triton_custom_assets');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  });

  // Automatically fetch all WordPress Media items from /api/list-images to populate media storage options
  useEffect(() => {
    let isMounted = true;
    const fetchWpMedia = async () => {
      try {
        const res = await fetch('/api/list-images');
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.images)) {
            const fetchedAssets: ProjectAssetImage[] = data.images.map((img: any) => ({
              path: img.url,
              label: img.filename || img.url.split('/').pop() || 'Media Asset',
              category: 'wp-media',
              isCustom: true,
            }));
            if (isMounted && fetchedAssets.length > 0) {
              setCustomAssets((prev) => {
                const existingPaths = new Set(prev.map((a) => a.path));
                const uniqueNew = fetchedAssets.filter((a) => !existingPaths.has(a.path));
                if (uniqueNew.length === 0) return prev;
                const merged = [...uniqueNew, ...prev];
                safeLocalStorage.setItem('triton_custom_assets', JSON.stringify(merged));
                return merged;
              });
            }
          }
        }
      } catch (e) {
        // silent fail on network retry
      }
    };
    fetchWpMedia();
    return () => {
      isMounted = false;
    };
  }, []);

  const productAssets = useMemo<ProjectAssetImage[]>(() => {
    const list = products && products.length > 0 ? products : PRODUCTS;
    const seen = new Set<string>();
    const res: ProjectAssetImage[] = [];

    list.forEach((p) => {
      if (p.image && !seen.has(p.image)) {
        seen.add(p.image);
        res.push({
          path: p.image,
          url: p.image,
          thumbnail: p.image,
          originalUrl: p.image,
          label: p.name,
          category: p.category || 'products',
          isCustom: false,
        });
      }
      if (Array.isArray(p.images)) {
        p.images.forEach((img, idx) => {
          if (img && !seen.has(img)) {
            seen.add(img);
            res.push({
              path: img,
              url: img,
              thumbnail: img,
              originalUrl: img,
              label: `${p.name} (Gallery #${idx + 1})`,
              category: p.category || 'products',
              isCustom: false,
            });
          }
        });
      }
    });

    return res;
  }, [products]);

  const allAssets = useMemo(() => {
    const combined = [...customAssets, ...PROJECT_ASSET_IMAGES, ...productAssets];
    const seenPaths = new Set<string>();
    return combined.filter((a) => {
      const key = a.path || a.url || a.thumbnail || a.originalUrl || a.label;
      if (!key || seenPaths.has(key)) return false;
      seenPaths.add(key);
      return true;
    });
  }, [customAssets, productAssets]);

  const handleUploadToLibrary = useCallback(
    async (file: File) => {
      setIsUploadingImage(true);
      setUploadStatusText(`Uploading ${file.name}...`);
      try {
        addLog(`Uploading image [${file.name}] to WordPress Media...`, 'info');
        const savedPath = await uploadImageToWordPress(file);
        if (savedPath) {
          const newAsset: ProjectAssetImage = {
            path: savedPath,
            label: file.name.replace(/\.[^/.]+$/, ''),
            category: 'custom',
            isCustom: true,
          };
          const updated = [newAsset, ...customAssets];
          setCustomAssets(updated);
          safeLocalStorage.setItem('triton_custom_assets', JSON.stringify(updated));
          addLog(`Asset [${file.name}] mapped to ${savedPath}`, 'success');

          if (editedProduct) {
            if (assetPickerTarget === 'primary') {
              setEditedProduct({ ...editedProduct, image: savedPath });
              addLog(`Assigned uploaded asset as Primary Cover: ${savedPath}`, 'success');
            } else if (typeof assetPickerTarget === 'number') {
              const currentImages = [...(editedProduct.images || [])];
              currentImages[assetPickerTarget] = savedPath;
              setEditedProduct({ ...editedProduct, images: currentImages });
              addLog(`Assigned uploaded asset to Gallery slot ${assetPickerTarget + 1}: ${savedPath}`, 'success');
            }
            setIsAssetPickerOpen(false);
          }
        }
      } catch (err: any) {
        addLog(`Image upload failed: ${err?.message || 'Upload error'}`, 'error');
      } finally {
        setIsUploadingImage(false);
        setUploadStatusText('');
      }
    },
    [customAssets, editedProduct, assetPickerTarget, setEditedProduct, addLog]
  );

  const handleSelectAssetImage = useCallback(
    (path: string) => {
      if (!editedProduct) return;
      const normalizedPath = normalizeCategoryImagePath(path);
      if (assetPickerTarget === 'primary') {
        setEditedProduct({ ...editedProduct, image: normalizedPath });
      } else if (typeof assetPickerTarget === 'number') {
        const currentImages = [...(editedProduct.images || [])];
        currentImages[assetPickerTarget] = normalizedPath;
        setEditedProduct({ ...editedProduct, images: currentImages });
      }
      setIsAssetPickerOpen(false);
      addLog(`Assigned image path [${normalizedPath}] to product [${editedProduct.name}]`, 'info');
    },
    [editedProduct, assetPickerTarget, setEditedProduct, addLog]
  );

  const handleAiSimulateImage = useCallback(async () => {
    if (!editedProduct) return;
    setIsGeneratingAiImage(true);
    setAiSimulationStep('Analyzing product specifications...');
    addLog(`Synthesizing photorealistic equipment rendering for [${editedProduct.name}]...`, 'info');
    try {
      const res = await fetch('/api/simulate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editedProduct.name,
          category: editedProduct.category,
          description: editedProduct.description,
          specifications: editedProduct.specifications,
        }),
      });
      const data = await res.json();
      if (data.success && data.imageUrl) {
        setAiPreviewData({ url: data.imageUrl, prompt: data.promptUsed || editedProduct.name });
        addLog(`Image rendering synthesized successfully`, 'success');
      }
    } catch (err: any) {
      addLog(`Image generation warning: ${err?.message}`, 'warning');
    } finally {
      setIsGeneratingAiImage(false);
      setAiSimulationStep('');
    }
  }, [editedProduct, addLog]);

  const handleAcceptAiPreview = useCallback(() => {
    if (!aiPreviewData || !editedProduct) return;
    setEditedProduct({ ...editedProduct, image: aiPreviewData.url });
    setAiPreviewData(null);
    addLog(`Accepted and applied AI generated image to product [${editedProduct.name}]`, 'success');
  }, [aiPreviewData, editedProduct, setEditedProduct, addLog]);

  const handleRejectAiPreview = useCallback(() => {
    setAiPreviewData(null);
    addLog('Discarded AI generated image preview', 'info');
  }, [addLog]);

  const handleDeviceImageUpload = useCallback(
    async (file: File, target: 'primary' | number | 'new-gallery' = 'primary') => {
      if (!editedProduct) return;
      setIsUploadingImage(true);
      setUploadStatusText(`Uploading ${file.name} to WordPress Media...`);
      try {
        addLog(`Uploading [${file.name}] to WordPress Media storage...`, 'info');
        const url = await uploadImageToWordPress(file);
        if (url) {
          // Register in library for reuse
          const newAsset: ProjectAssetImage = {
            path: url,
            label: file.name.replace(/\.[^/.]+$/, ''),
            category: 'custom',
            isCustom: true,
          };
          const updated = [newAsset, ...customAssets.filter((a) => a.path !== url)];
          setCustomAssets(updated);
          safeLocalStorage.setItem('triton_custom_assets', JSON.stringify(updated));

          // Assign to product
          if (target === 'primary') {
            setEditedProduct({ ...editedProduct, image: url });
            addLog(`Uploaded and assigned Primary Cover image: ${url}`, 'success');
          } else if (target === 'new-gallery') {
            const currentImages = [...(editedProduct.images || []), url];
            setEditedProduct({ ...editedProduct, images: currentImages });
            addLog(`Uploaded and added new Gallery image: ${url}`, 'success');
          } else if (typeof target === 'number') {
            const currentImages = [...(editedProduct.images || [])];
            currentImages[target] = url;
            setEditedProduct({ ...editedProduct, images: currentImages });
            addLog(`Uploaded and assigned to Gallery slot ${target + 1}: ${url}`, 'success');
          }
        }
      } catch (err: any) {
        addLog(`Upload failed: ${err?.message}`, 'error');
      } finally {
        setIsUploadingImage(false);
        setUploadStatusText('');
      }
    },
    [editedProduct, customAssets, setEditedProduct, addLog]
  );

  return {
    allAssets,
    customAssets,
    isAssetPickerOpen,
    setIsAssetPickerOpen,
    assetPickerTarget,
    setAssetPickerTarget,
    assetSearchQuery,
    setAssetSearchQuery,
    assetFilterCategory,
    setAssetFilterCategory,
    isGeneratingAiImage,
    isUploadingImage,
    uploadStatusText,
    aiSimulationStep,
    aiPreviewData,
    handleUploadToLibrary,
    handleSelectAssetImage,
    handleAiSimulateImage,
    handleAcceptAiPreview,
    handleRejectAiPreview,
    handleDeviceImageUpload,
  };
}
