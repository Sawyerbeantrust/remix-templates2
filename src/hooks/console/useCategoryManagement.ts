import { useState, useCallback } from 'react';
import { FeaturedCategory, Product } from '../../types/index.js';
import { DEFAULT_FEATURED_CATEGORIES, normalizeCategoryImagePath } from '../../utils/console/productNormalization.js';
import { safeLocalStorage } from '../../utils/safeStorage.js';
import { uploadImageToWordPress } from '../../utils/imageUpload.js';
import { normalizeCategorySlug, formatCategoryLabel } from '../../utils/categoryUtils.js';

interface UseCategoryManagementOptions {
  featuredCategories?: FeaturedCategory[];
  onFeaturedCategoriesChange?: (newCats: FeaturedCategory[]) => void;
  products: Product[];
  onProductsChange?: (newProducts: Product[]) => void;
  addLog: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export function useCategoryManagement({
  featuredCategories: featuredCategoriesProp,
  onFeaturedCategoriesChange,
  products,
  onProductsChange,
  addLog,
}: UseCategoryManagementOptions) {
  // Categories slug list
  const [categories, setCategories] = useState<string[]>(() => {
    const saved = safeLocalStorage.getItem('triton_categories_list_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return DEFAULT_FEATURED_CATEGORIES.map((c) => c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
  });

  const [featuredCategories, setFeaturedCategories] = useState<FeaturedCategory[]>(() => {
    if (featuredCategoriesProp && featuredCategoriesProp.length > 0) return featuredCategoriesProp;
    const saved = safeLocalStorage.getItem('triton_featured_categories_db_v3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return DEFAULT_FEATURED_CATEGORIES;
  });

  const [selectedCatId, setSelectedCatId] = useState<string>('cat-auto-spray');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isRenamingCategory, setIsRenamingCategory] = useState(false);
  const [categoryInputVal, setCategoryInputVal] = useState('');
  const [catSaveMessage, setCatSaveMessage] = useState('');

  // AI Category generation
  const [catAiPrompt, setCatAiPrompt] = useState('');
  const [isGeneratingCatImage, setIsGeneratingCatImage] = useState(false);
  const [catStyle, setCatStyle] = useState('Sleek Industrial');
  const [catAccentColor, setCatAccentColor] = useState('Triton Red');
  const [catEnvironment, setCatEnvironment] = useState('Modern Garage');
  const [catLighting, setCatLighting] = useState('High-Contrast Spotlights');
  const [catAspect, setCatAspect] = useState('Square (1:1)');

  const updateFeaturedCategoriesList = useCallback(
    (newList: FeaturedCategory[]) => {
      setFeaturedCategories(newList);
      if (onFeaturedCategoriesChange) {
        onFeaturedCategoriesChange(newList);
      }
      safeLocalStorage.setItem('triton_featured_categories_db_v3', JSON.stringify(newList));
    },
    [onFeaturedCategoriesChange]
  );

  const updateCategoriesList = useCallback((newList: string[]) => {
    setCategories(newList);
    safeLocalStorage.setItem('triton_categories_list_v2', JSON.stringify(newList));
  }, []);

  const handleStartAddCategory = useCallback(() => {
    setCategoryInputVal('');
    setIsAddingCategory(true);
    setIsRenamingCategory(false);
  }, []);

  const handleStartRenameCategory = useCallback((catSlug: string) => {
    setCategoryInputVal(formatCategoryLabel(catSlug));
    setIsRenamingCategory(true);
    setIsAddingCategory(false);
  }, []);

  const handleSaveNewCategory = useCallback(() => {
    const raw = categoryInputVal.trim();
    if (!raw) return;
    const slug = normalizeCategorySlug(raw);
    if (!categories.includes(slug)) {
      const updated = [...categories, slug];
      updateCategoriesList(updated);

      const newFeatured: FeaturedCategory = {
        id: `cat-${slug}`,
        name: raw.toUpperCase(),
        count: '0 Products',
        img: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&q=80&w=800&h=600',
        status: 'publish',
      };
      updateFeaturedCategoriesList([...featuredCategories, newFeatured]);
      addLog(`Added category [${raw}] (slug: ${slug})`, 'success');
    }
    setIsAddingCategory(false);
    setCategoryInputVal('');
  }, [categoryInputVal, categories, updateCategoriesList, featuredCategories, updateFeaturedCategoriesList, addLog]);

  const handleSaveRenamedCategory = useCallback(
    (oldSlug: string) => {
      const raw = categoryInputVal.trim();
      if (!raw) return;
      const newSlug = normalizeCategorySlug(raw);

      const updatedCategories = categories.map((c) => (c === oldSlug ? newSlug : c));
      updateCategoriesList(updatedCategories);

      const updatedFeatured = featuredCategories.map((fc) => {
        if (fc.id === `cat-${oldSlug}` || fc.name.toLowerCase() === formatCategoryLabel(oldSlug).toLowerCase()) {
          return { ...fc, id: `cat-${newSlug}`, name: raw.toUpperCase() };
        }
        return fc;
      });
      updateFeaturedCategoriesList(updatedFeatured);

      // Update matching products
      if (onProductsChange) {
        const updatedProducts = products.map((p) => (p.category === oldSlug ? { ...p, category: newSlug } : p));
        onProductsChange(updatedProducts);
      }

      addLog(`Renamed category [${oldSlug}] -> [${newSlug}]`, 'info');
      setIsRenamingCategory(false);
      setCategoryInputVal('');
    },
    [categoryInputVal, categories, updateCategoriesList, featuredCategories, updateFeaturedCategoriesList, products, onProductsChange, addLog]
  );

  const handleDeleteCategory = useCallback(
    (catSlug: string) => {
      const updatedCategories = categories.filter((c) => c !== catSlug);
      updateCategoriesList(updatedCategories);

      const updatedFeatured = featuredCategories.filter((fc) => fc.id !== `cat-${catSlug}` && fc.id !== catSlug);
      updateFeaturedCategoriesList(updatedFeatured);

      addLog(`Deleted category [${catSlug}]`, 'warning');
    },
    [categories, updateCategoriesList, featuredCategories, updateFeaturedCategoriesList, addLog]
  );

  const handleCategoryImgUpload = useCallback(
    async (file: File, catId: string) => {
      try {
        addLog(`Uploading category image for [${catId}] to WordPress Media...`, 'info');
        const uploadedUrl = await uploadImageToWordPress(file);
        if (uploadedUrl) {
          const updated = featuredCategories.map((fc) => (fc.id === catId ? { ...fc, img: uploadedUrl } : fc));
          updateFeaturedCategoriesList(updated);
          addLog(`Category image updated to WordPress URL: ${uploadedUrl}`, 'success');
        }
      } catch (err: any) {
        addLog(`Category upload failed: ${err?.message || 'Error'}`, 'error');
      }
    },
    [featuredCategories, updateFeaturedCategoriesList, addLog]
  );

  const handleAiCategoryImgGenerate = useCallback(
    async (catId: string, catName: string) => {
      setIsGeneratingCatImage(true);
      addLog(`Generating AI visual synthesis for [${catName}]...`, 'info');
      try {
        const res = await fetch('/api/simulate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: catName,
            category: catId,
            description: `Commercial showroom hero visual for ${catName}. Style: ${catStyle}, Lighting: ${catLighting}, Palette: ${catAccentColor}.`,
          }),
        });
        const data = await res.json();
        if (data.success && data.imageUrl) {
          const updated = featuredCategories.map((fc) => (fc.id === catId ? { ...fc, img: data.imageUrl } : fc));
          updateFeaturedCategoriesList(updated);
          addLog(`Applied generated visual for category [${catName}]`, 'success');
        }
      } catch (err: any) {
        addLog(`Category visual generation warning: ${err?.message}`, 'warning');
      } finally {
        setIsGeneratingCatImage(false);
      }
    },
    [catStyle, catLighting, catAccentColor, featuredCategories, updateFeaturedCategoriesList, addLog]
  );

  return {
    categories,
    featuredCategories,
    selectedCatId,
    setSelectedCatId,
    isAddingCategory,
    isRenamingCategory,
    categoryInputVal,
    setCategoryInputVal,
    catSaveMessage,
    setCatSaveMessage,
    catAiPrompt,
    setCatAiPrompt,
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
    handleStartAddCategory,
    handleStartRenameCategory,
    handleSaveNewCategory,
    handleSaveRenamedCategory,
    handleDeleteCategory,
    handleCategoryImgUpload,
    handleAiCategoryImgGenerate,
    updateFeaturedCategoriesList,
    updateCategoriesList,
  };
}
