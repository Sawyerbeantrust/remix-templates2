import { useState, useCallback } from 'react';
import { Product } from '../../types/index.js';
import {
  parseCsvToProducts,
  exportProductsToCsv,
  generateSampleCsv,
  exportErrorsToCsv,
} from '../../utils/console/csvParser.js';

interface UseCSVImportExportOptions {
  products: Product[];
  onProductsChange?: (newProducts: Product[]) => void;
  addLog: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export function useCSVImportExport({
  products,
  onProductsChange,
  addLog,
}: UseCSVImportExportOptions) {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedCsvProducts, setParsedCsvProducts] = useState<Product[]>([]);
  const [csvParseErrors, setCsvParseErrors] = useState<string[]>([]);
  const [isProcessingCsv, setIsProcessingCsv] = useState(false);
  const [importMessage, setImportMessage] = useState('');

  const handleCsvFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setCsvFile(file);
      setIsProcessingCsv(true);

      const reader = new FileReader();
      reader.onload = (event) => {
        const text = (event.target?.result as string) || '';
        const { products: parsed, errors } = parseCsvToProducts(text);
        setParsedCsvProducts(parsed);
        setCsvParseErrors(errors);
        setIsProcessingCsv(false);
        if (errors.length > 0) {
          addLog(`Parsed ${parsed.length} items from CSV with ${errors.length} notices.`, 'warning');
        } else {
          addLog(`Successfully parsed ${parsed.length} products from CSV.`, 'success');
        }
      };
      reader.readAsText(file);
    },
    [addLog]
  );

  const handleImportReplace = useCallback(() => {
    if (parsedCsvProducts.length === 0 || !onProductsChange) return;
    onProductsChange(parsedCsvProducts);
    setImportMessage(`Successfully replaced catalog with ${parsedCsvProducts.length} items.`);
    addLog(`Replaced catalog with ${parsedCsvProducts.length} products from CSV.`, 'success');
    setCsvFile(null);
    setParsedCsvProducts([]);
  }, [parsedCsvProducts, onProductsChange, addLog]);

  const handleImportAppend = useCallback(() => {
    if (parsedCsvProducts.length === 0 || !onProductsChange) return;
    const existingIds = new Set(products.map((p) => p.id));
    const newItems = parsedCsvProducts.filter((p) => !existingIds.has(p.id));
    const combined = [...products, ...newItems];
    onProductsChange(combined);
    setImportMessage(`Appended ${newItems.length} new items to catalog.`);
    addLog(`Appended ${newItems.length} products from CSV.`, 'success');
    setCsvFile(null);
    setParsedCsvProducts([]);
  }, [parsedCsvProducts, products, onProductsChange, addLog]);

  const handleExportCSV = useCallback(() => {
    const csvContent = exportProductsToCsv(products);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `triton-products-catalog-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addLog(`Exported ${products.length} products to CSV`, 'info');
  }, [products, addLog]);

  const handleDownloadSampleCsv = useCallback(() => {
    const sample = generateSampleCsv();
    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sample-triton-product-import.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addLog(`Downloaded sample CSV template`, 'info');
  }, [addLog]);

  const handleDownloadErrorLogJson = useCallback(
    (errors: any[]) => {
      const blob = new Blob([JSON.stringify(errors, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `triton-system-errors-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addLog(`Downloaded error logs as JSON`, 'info');
    },
    [addLog]
  );

  const handleDownloadErrorLogCsv = useCallback(
    (errors: any[]) => {
      const csv = exportErrorsToCsv(errors);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `triton-system-errors-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addLog(`Downloaded error logs as CSV`, 'info');
    },
    [addLog]
  );

  return {
    csvFile,
    parsedCsvProducts,
    csvParseErrors,
    isProcessingCsv,
    importMessage,
    handleCsvFileUpload,
    handleImportReplace,
    handleImportAppend,
    handleExportCSV,
    handleDownloadSampleCsv,
    handleDownloadErrorLogJson,
    handleDownloadErrorLogCsv,
  };
}
