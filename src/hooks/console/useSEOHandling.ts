import { useState, useCallback } from 'react';
import { Product } from '../../types/index.js';
import { SeoHealthResult, CategoryAuditResult } from '../../types/console.js';
import { calculateSeoScore } from '../../utils/console/seoGenerators.js';
import { safeLocalStorage } from '../../utils/safeStorage.js';

interface UseSEOHandlingOptions {
  globalSeoTitle?: string;
  onGlobalSeoTitleChange?: (val: string) => void;
  globalSeoDescription?: string;
  onGlobalSeoDescriptionChange?: (val: string) => void;
  products: Product[];
  onProductsChange?: (newProducts: Product[]) => void;
  addLog: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export function useSEOHandling({
  globalSeoTitle,
  onGlobalSeoTitleChange,
  globalSeoDescription,
  onGlobalSeoDescriptionChange,
  products,
  onProductsChange,
  addLog,
}: UseSEOHandlingOptions) {
  const [internalGlobalTitle, setInternalGlobalTitle] = useState<string>(() => {
    return (
      globalSeoTitle ||
      safeLocalStorage.getItem('triton_global_seo_title') ||
      'Triton Car Lifts & Heavy-Duty Garage Equipment South Africa'
    );
  });

  const [internalGlobalDesc, setInternalGlobalDesc] = useState<string>(() => {
    return (
      globalSeoDescription ||
      safeLocalStorage.getItem('triton_global_seo_desc') ||
      "South Africa's premier supplier of 2-post and 4-post car lifts, automotive spray booths, and tyre equipment. 3-Year Warranty & nationwide delivery."
    );
  });

  const [selectedSeoProductId, setSelectedSeoProductId] = useState<string>(products[0]?.id || '');
  const [seoRichSnippetReviews, setSeoRichSnippetReviews] = useState<number>(18);
  const [seoRichSnippetStock, setSeoRichSnippetStock] = useState<'instock' | 'outofstock'>('instock');
  const [seoRichSnippetShowImage, setSeoRichSnippetShowImage] = useState<boolean>(true);
  const [seoSearchSimulatorQuery, setSeoSearchSimulatorQuery] = useState<string>('car lifts south africa');

  // AI Generation states
  const [isGeneratingAiSeo, setIsGeneratingAiSeo] = useState(false);
  const [isGeneratingGlobalSeo, setIsGeneratingGlobalSeo] = useState(false);
  const [isAuditingHealth, setIsAuditingHealth] = useState(false);
  const [isAuditingCategory, setIsAuditingCategory] = useState(false);

  const [seoHealthData, setSeoHealthData] = useState<SeoHealthResult | null>(null);
  const [categoryAuditData, setCategoryAuditData] = useState<CategoryAuditResult | null>(null);

  const handleUpdateGlobalTitle = useCallback(
    (val: string) => {
      setInternalGlobalTitle(val);
      if (onGlobalSeoTitleChange) onGlobalSeoTitleChange(val);
      safeLocalStorage.setItem('triton_global_seo_title', val);
    },
    [onGlobalSeoTitleChange]
  );

  const handleUpdateGlobalDesc = useCallback(
    (val: string) => {
      setInternalGlobalDesc(val);
      if (onGlobalSeoDescriptionChange) onGlobalSeoDescriptionChange(val);
      safeLocalStorage.setItem('triton_global_seo_desc', val);
    },
    [onGlobalSeoDescriptionChange]
  );

  const selectedSeoProduct = products.find((p) => p.id === selectedSeoProductId) || products[0];

  const handleGenerateProductSeo = useCallback(
    async (product: Product) => {
      setIsGeneratingAiSeo(true);
      addLog(`Generating Gemini SEO metadata for [${product.name}]...`, 'info');
      try {
        const res = await fetch('/api/generate-seo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: product.name,
            category: product.category,
            currentDescription: product.description,
            specifications: product.specifications,
          }),
        });
        const json = await res.json();
        if (json.success && json.data) {
          const { metaTitle, metaDescription, focusKeywords } = json.data;
          const updated = products.map((p) =>
            p.id === product.id
              ? {
                  ...p,
                  seoTitle: metaTitle || p.seoTitle,
                  seoDescription: metaDescription || p.seoDescription,
                  seoFocusKeyword: focusKeywords?.[0] || p.seoFocusKeyword,
                }
              : p
          );
          if (onProductsChange) onProductsChange(updated);
          addLog(`Generated optimized SEO for [${product.name}] (Source: ${json.source})`, 'success');
        }
      } catch (err: any) {
        addLog(`AI SEO error: ${err?.message || 'Failed to generate SEO'}`, 'warning');
      } finally {
        setIsGeneratingAiSeo(false);
      }
    },
    [products, onProductsChange, addLog]
  );

  const handleGenerateGlobalSeo = useCallback(async () => {
    setIsGeneratingGlobalSeo(true);
    addLog(`Synthesizing Global SEO Strategy with Gemini AI...`, 'info');
    try {
      const res = await fetch('/api/generate-global-seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeName: 'Triton Car Lifts & Workshop Equipment',
          targetAudience: 'Automotive workshops, panel beaters, and commercial fleets in South Africa',
          primaryKeywords: ['2 post car lifts', 'spray booths', 'tyre changers', 'workshop hydraulic equipment'],
          location: 'Cape Town & Johannesburg, South Africa',
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        if (json.data.globalTitle) handleUpdateGlobalTitle(json.data.globalTitle);
        if (json.data.globalMetaDescription) handleUpdateGlobalDesc(json.data.globalMetaDescription);
        addLog(`Global SEO metadata updated from AI synthesis`, 'success');
      }
    } catch (err: any) {
      addLog(`Global SEO generation warning: ${err?.message}`, 'warning');
    } finally {
      setIsGeneratingGlobalSeo(false);
    }
  }, [handleUpdateGlobalTitle, handleUpdateGlobalDesc, addLog]);

  const handleRunSeoHealth = useCallback(async () => {
    setIsAuditingHealth(true);
    addLog(`Running comprehensive SEO Health Audit...`, 'info');
    try {
      const res = await fetch('/api/seo-health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteUrl: 'car-lifts.co.za',
          pageTitle: internalGlobalTitle,
          metaDescription: internalGlobalDesc,
          productsCount: products.length,
          sampleProducts: products.slice(0, 5).map((p) => p.name),
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setSeoHealthData(json.data);
        addLog(`SEO Health Audit completed. Health Score: ${json.data.score}/100`, 'success');
      }
    } catch (err: any) {
      addLog(`SEO Health Audit error: ${err?.message}`, 'warning');
    } finally {
      setIsAuditingHealth(false);
    }
  }, [internalGlobalTitle, internalGlobalDesc, products, addLog]);

  const handleRunCategoryAudit = useCallback(
    async (catSlug: string) => {
      setIsAuditingCategory(true);
      addLog(`Auditing commercial search intent for category [${catSlug}]...`, 'info');
      try {
        const catProducts = products.filter((p) => p.category === catSlug);
        const res = await fetch('/api/seo-category-audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            categoryName: catSlug,
            productCount: catProducts.length,
            sampleProducts: catProducts.slice(0, 4).map((p) => p.name),
          }),
        });
        const json = await res.json();
        if (json.success && json.data) {
          setCategoryAuditData(json.data);
          addLog(`Category audit completed for [${catSlug}]`, 'success');
        }
      } catch (err: any) {
        addLog(`Category audit warning: ${err?.message}`, 'warning');
      } finally {
        setIsAuditingCategory(false);
      }
    },
    [products, addLog]
  );

  return {
    globalSeoTitle: internalGlobalTitle,
    setGlobalSeoTitle: handleUpdateGlobalTitle,
    globalSeoDescription: internalGlobalDesc,
    setGlobalSeoDescription: handleUpdateGlobalDesc,
    selectedSeoProductId,
    setSelectedSeoProductId,
    selectedSeoProduct,
    seoRichSnippetReviews,
    setSeoRichSnippetReviews,
    seoRichSnippetStock,
    setSeoRichSnippetStock,
    seoRichSnippetShowImage,
    setSeoRichSnippetShowImage,
    seoSearchSimulatorQuery,
    setSeoSearchSimulatorQuery,
    isGeneratingAiSeo,
    isGeneratingGlobalSeo,
    isAuditingHealth,
    isAuditingCategory,
    seoHealthData,
    categoryAuditData,
    handleGenerateProductSeo,
    handleGenerateGlobalSeo,
    handleRunSeoHealth,
    handleRunCategoryAudit,
  };
}
