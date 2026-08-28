import { useState, useCallback, useEffect } from 'react';
import { Product } from '../../types/index.js';
import { ProjectAssetImage } from '../../types/console.js';
import { PROJECT_ASSET_IMAGES, normalizeCategoryImagePath } from '../../utils/console/productNormalization.js';
import { uploadImageToWordPress } from '../../utils/imageUpload.js';
import { safeLocalStorage } from '../../utils/safeStorage.js';

interface UseImageHandlingOptions {
  editedProduct: Product | null;
  setEditedProduct: React.Dispatch<React.SetStateAction<Product | null>>;
  addLog: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export function useImageHandling({
  editedProduct,
  setEditedProduct,
  addLog,
}: UseImageHandlingOptions) {
  const [isGeneratingAiImage, setIsGeneratingAiImage] = useState(false);
  const [aiSimulationStep, setAiSimulationStep] = useState<string>('');
  const [aiPreviewData, setAiPreviewData] = useState<{ url: string; prompt: string } | null>(null);

  // Asset picker modal state
  const [isAssetPickerOpen, setIsAssetPickerOpen] = useState(false);
  const [assetPickerTarget, setAssetPickerTarget] = useState<'primary' | number>('primary');
  const [assetSearchQuery, setAssetSearchQuery] = useState('');
  const [assetFilterCategory, setAssetFilterCategory] = useState<string>('all');

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

  const allAssets = [...PROJECT_ASSET_IMAGES, ...customAssets];

  const handleUploadToLibrary = useCallback(
    async (file: File) => {
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
        }
      } catch (err: any) {
        addLog(`Image upload failed: ${err?.message || 'Upload error'}`, 'error');
      }
    },
    [customAssets, addLog]
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
    async (file: File) => {
      if (!editedProduct) return;
      try {
        addLog(`Uploading [${file.name}] from local storage to WordPress...`, 'info');
        const url = await uploadImageToWordPress(file);
        if (url) {
          setEditedProduct({ ...editedProduct, image: url });
          addLog(`Assigned WordPress Media URL: ${url}`, 'success');
        }
      } catch (err: any) {
        addLog(`Upload failed: ${err?.message}`, 'error');
      }
    },
    [editedProduct, setEditedProduct, addLog]
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
