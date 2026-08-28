import { useState, useCallback } from 'react';
import { Product, FeaturedCategory } from '../../types/index.js';
import { validateBackupPayload } from '../../utils/console/validators.js';

interface UseBackupRestoreOptions {
  products: Product[];
  onProductsChange?: (newProducts: Product[]) => void;
  featuredCategories: FeaturedCategory[];
  onFeaturedCategoriesChange?: (newCats: FeaturedCategory[]) => void;
  globalSeoTitle?: string;
  globalSeoDescription?: string;
  theme?: string;
  addLog: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export function useBackupRestore({
  products,
  onProductsChange,
  featuredCategories,
  onFeaturedCategoriesChange,
  globalSeoTitle,
  globalSeoDescription,
  theme,
  addLog,
}: UseBackupRestoreOptions) {
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [backupPreview, setBackupPreview] = useState<any | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState('');

  const handleExportFullBackup = useCallback(() => {
    const backupData = {
      version: '3.0.0',
      timestamp: new Date().toISOString(),
      appName: 'Triton Car Lifts & Workshop Equipment Console',
      products,
      featuredCategories,
      seo: {
        globalSeoTitle,
        globalSeoDescription,
      },
      theme: theme || 'triton',
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `triton-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addLog(`Exported full system backup (${products.length} products, ${featuredCategories.length} categories)`, 'success');
  }, [products, featuredCategories, globalSeoTitle, globalSeoDescription, theme, addLog]);

  const handleBackupFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setBackupFile(file);

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (validateBackupPayload(parsed)) {
            setBackupPreview(parsed);
            addLog(`Validated backup package: ${file.name} (Contains ${parsed.products?.length || 0} products)`, 'info');
          } else {
            addLog(`Invalid backup package structure in ${file.name}`, 'error');
            setBackupPreview(null);
          }
        } catch (err: any) {
          addLog(`Failed to parse backup JSON: ${err?.message}`, 'error');
          setBackupPreview(null);
        }
      };
      reader.readAsText(file);
    },
    [addLog]
  );

  const handleExecuteBackupRestore = useCallback(async () => {
    if (!backupPreview) return;
    setIsRestoring(true);
    addLog('Executing full system restore from backup...', 'info');

    try {
      if (Array.isArray(backupPreview.products) && onProductsChange) {
        onProductsChange(backupPreview.products);
      }
      if (Array.isArray(backupPreview.featuredCategories) && onFeaturedCategoriesChange) {
        onFeaturedCategoriesChange(backupPreview.featuredCategories);
      }

      setRestoreMessage('System successfully restored!');
      addLog('Full system restore completed successfully.', 'success');
      setTimeout(() => {
        setRestoreMessage('');
        setBackupFile(null);
        setBackupPreview(null);
      }, 3000);
    } catch (err: any) {
      addLog(`Restore error: ${err?.message}`, 'error');
    } finally {
      setIsRestoring(false);
    }
  }, [backupPreview, onProductsChange, onFeaturedCategoriesChange, addLog]);

  return {
    backupFile,
    backupPreview,
    isRestoring,
    restoreMessage,
    handleExportFullBackup,
    handleBackupFileSelect,
    handleExecuteBackupRestore,
  };
}
