import React, { useState } from 'react';
import {
  Wrench, CheckCircle2, AlertTriangle, RefreshCw, Trash2,
  Database, Image, ShieldCheck, Zap
} from 'lucide-react';
import { Product, FeaturedCategory } from '../../types/index.js';

interface ToolsTabProps {
  products: Product[];
  onProductsChange?: (newProducts: Product[]) => void;
  featuredCategories: FeaturedCategory[];
  onFeaturedCategoriesChange?: (newCats: FeaturedCategory[]) => void;
  addLog: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const ToolsTab: React.FC<ToolsTabProps> = ({
  products,
  onProductsChange,
  featuredCategories,
  onFeaturedCategoriesChange,
  addLog,
}) => {
  const [toolResult, setToolResult] = useState<string>('');

  const handleFixCategoryCounts = () => {
    if (!onFeaturedCategoriesChange) return;
    const updated = featuredCategories.map((fc) => {
      const slug = fc.id.replace('cat-', '');
      const count = products.filter((p) => p.category === slug || p.category === fc.name.toLowerCase()).length;
      return { ...fc, count: `${count} ${count === 1 ? 'Product' : 'Products'}` };
    });
    onFeaturedCategoriesChange(updated);
    addLog('Synchronized all category item counts with active catalog.', 'success');
    setToolResult('Category counts successfully recalculated and saved.');
  };

  const handleAuditBrokenImages = () => {
    const broken = products.filter((p) => !p.image || p.image.trim() === '' || p.image.includes('placeholder'));
    addLog(`Audit found ${broken.length} products with placeholder or missing images.`, broken.length > 0 ? 'warning' : 'success');
    setToolResult(`Image audit complete: ${broken.length} items require image updates.`);
  };

  const handleStandardizeSlugs = () => {
    if (!onProductsChange) return;
    const updated = products.map((p) => {
      const cleanSlug = (p.category || 'workshop-equipment')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      return { ...p, category: cleanSlug };
    });
    onProductsChange(updated);
    addLog('Standardized all product category slugs to kebab-case.', 'success');
    setToolResult('All category slugs standardized across catalog.');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 bg-neutral-900/80 border border-neutral-800 rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-950/80 border border-indigo-500/40 text-indigo-400">
            <Wrench size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Diagnostic Tools & Data Maintenance Utilities
            </h3>
            <p className="text-xs text-neutral-400">Automated repair scripts, slug standardizers, and audit engines</p>
          </div>
        </div>
      </div>

      {toolResult && (
        <div className="p-3.5 bg-indigo-950/40 border border-indigo-500/40 text-indigo-300 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span>{toolResult}</span>
        </div>
      )}

      {/* Grid of Tools */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-[#141414] border border-neutral-800 rounded-xl space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 mb-1">
              <RefreshCw size={16} />
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">Recalculate Category Counts</h4>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Scans all active products and aligns category badge numbers with current inventory.
            </p>
          </div>
          <button
            type="button"
            onClick={handleFixCategoryCounts}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shadow-sm"
          >
            Run Count Fixer
          </button>
        </div>

        <div className="p-5 bg-[#141414] border border-neutral-800 rounded-xl space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-amber-400 mb-1">
              <Image size={16} />
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">Audit Missing Images</h4>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Identifies empty or broken image URLs in your catalog for quick replacement.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAuditBrokenImages}
            className="w-full py-2 bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 text-neutral-200 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
          >
            Run Image Audit
          </button>
        </div>

        <div className="p-5 bg-[#141414] border border-neutral-800 rounded-xl space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 mb-1">
              <Zap size={16} />
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">Standardize Slugs</h4>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Cleans and normalizes all category slugs into clean SEO-compliant kebab-case formatting.
            </p>
          </div>
          <button
            type="button"
            onClick={handleStandardizeSlugs}
            className="w-full py-2 bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 text-neutral-200 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
          >
            Clean All Slugs
          </button>
        </div>
      </div>
    </div>
  );
};
