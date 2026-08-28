import React, { useState } from 'react';
import {
  FileCode, Upload, Download, CheckCircle2, AlertTriangle,
  FileSpreadsheet, Trash2, ArrowRight, RefreshCw
} from 'lucide-react';
import { Product } from '../../types/index.js';
import { ConfirmationDialog } from './ConfirmationDialog.js';

interface ImportExportTabProps {
  products: Product[];
  csvFile: File | null;
  parsedCsvProducts: Product[];
  csvParseErrors: string[];
  isProcessingCsv: boolean;
  importMessage: string;
  handleCsvFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleImportReplace: () => void;
  handleImportAppend: () => void;
  handleExportCSV: () => void;
  handleDownloadSampleCsv: () => void;
  handleDownloadErrorLogJson: (errors: any[]) => void;
  handleDownloadErrorLogCsv: (errors: any[]) => void;
  addLog: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const ImportExportTab: React.FC<ImportExportTabProps> = ({
  products,
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
  addLog,
}) => {
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-4 bg-neutral-900/80 border border-neutral-800 rounded-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-950/80 border border-indigo-500/40 text-indigo-400">
            <FileSpreadsheet size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Bulk CSV Import & Catalog Export Engine
            </h3>
            <p className="text-xs text-neutral-400">
              Easily migrate, backup, or batch update your entire product inventory with standard spreadsheet formats
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadSampleCsv}
            className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 text-neutral-200 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
          >
            <Download size={14} />
            <span>Sample CSV</span>
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Download size={14} />
            <span>Export Catalog CSV</span>
          </button>
        </div>
      </div>

      {/* Grid: Upload Box & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Upload Zone */}
        <div className="lg:col-span-6 bg-[#141414] border border-neutral-800 rounded-xl p-6 space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300">Upload Product Spreadsheet</h4>

          <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-neutral-750 hover:border-indigo-500 rounded-xl cursor-pointer bg-neutral-950/40 hover:bg-neutral-900/40 transition-colors">
            <Upload size={32} className="text-neutral-400 mb-2" />
            <span className="text-xs font-bold text-neutral-200">Click or drag & drop CSV file here</span>
            <span className="text-[11px] text-neutral-500 mt-1">Supports UTF-8 CSV with standard header columns</span>
            <input type="file" accept=".csv" onChange={handleCsvFileUpload} className="hidden" />
          </label>

          {importMessage && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 text-xs rounded-lg flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span>{importMessage}</span>
            </div>
          )}
        </div>

        {/* Instructions & Summary */}
        <div className="lg:col-span-6 bg-[#141414] border border-neutral-800 rounded-xl p-6 space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300">Format Guidelines</h4>
          <ul className="space-y-2 text-xs text-neutral-400">
            <li className="flex items-start gap-2">
              <span className="text-indigo-400 font-bold">•</span>
              <span>
                <strong>id:</strong> Unique slug or SKU identifier (e.g. <code className="text-neutral-300 font-mono">4-ton-2-post-lift</code>).
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-400 font-bold">•</span>
              <span>
                <strong>name:</strong> Full commercial product name.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-400 font-bold">•</span>
              <span>
                <strong>price:</strong> Numeric Rand value without currency symbols (e.g. <code className="text-neutral-300 font-mono">45990</code>).
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-400 font-bold">•</span>
              <span>
                <strong>category:</strong> Target category slug matching existing taxonomies.
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* CSV Preview Section */}
      {parsedCsvProducts.length > 0 && (
        <div className="bg-[#141414] border border-neutral-800 rounded-xl overflow-hidden space-y-4 p-5 animate-in fade-in duration-200">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-3">
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                CSV Parsed Preview ({parsedCsvProducts.length} Items Found)
              </h4>
              <p className="text-xs text-neutral-400">Review products before applying to live catalog</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleImportAppend}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
              >
                <span>Append to Catalog</span>
              </button>
              <button
                type="button"
                onClick={() => setShowReplaceConfirm(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <span>Replace Entire Catalog</span>
              </button>
            </div>
          </div>

          {/* Table Preview */}
          <div className="border border-neutral-800 rounded-lg overflow-x-auto max-h-72 bg-neutral-950">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-900 text-neutral-400 font-bold uppercase sticky top-0">
                <tr>
                  <th className="p-2.5">ID</th>
                  <th className="p-2.5">Name</th>
                  <th className="p-2.5">Category</th>
                  <th className="p-2.5">Price</th>
                  <th className="p-2.5">Model Code</th>
                  <th className="p-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-850 text-neutral-300">
                {parsedCsvProducts.slice(0, 50).map((p, idx) => (
                  <tr key={idx} className="hover:bg-neutral-900/50">
                    <td className="p-2.5 font-mono text-neutral-400">{p.id}</td>
                    <td className="p-2.5 font-semibold text-white truncate max-w-xs">{p.name}</td>
                    <td className="p-2.5">{p.category}</td>
                    <td className="p-2.5 font-mono text-emerald-400">R {p.price.toLocaleString()}</td>
                    <td className="p-2.5 font-mono">{p.modelCode}</td>
                    <td className="p-2.5">
                      <span className="px-1.5 py-0.5 bg-neutral-800 rounded text-[10px] uppercase font-bold">
                        {p.status || 'publish'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Replace */}
      <ConfirmationDialog
        isOpen={showReplaceConfirm}
        title="Replace Entire Catalog"
        message={`This will overwrite the current ${products.length} products with ${parsedCsvProducts.length} items from your CSV. Continue?`}
        confirmLabel="Replace Catalog"
        isDangerous={true}
        onConfirm={() => {
          handleImportReplace();
          setShowReplaceConfirm(false);
        }}
        onCancel={() => setShowReplaceConfirm(false)}
      />
    </div>
  );
};
