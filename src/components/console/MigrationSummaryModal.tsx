import React, { useState } from 'react';
import { CheckCircle, X, Copy, Check, ExternalLink } from 'lucide-react';
import { MigrationSummaryData } from '../../types/console.js';

interface MigrationSummaryModalProps {
  summary: MigrationSummaryData | null;
  onClose: () => void;
}

export const MigrationSummaryModal: React.FC<MigrationSummaryModalProps> = ({ summary, onClose }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!summary) return null;

  const entries = Object.entries(summary.map || {}) as [string, string][];

  return (
    <div className="fixed inset-0 z-[10000] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121212] border border-neutral-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-neutral-800 bg-[#181818] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-400">
              <CheckCircle size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white uppercase tracking-wider">
                Default Images to WordPress Migration Summary
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">WordPress Media Library upload summary</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Metric Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-lg bg-neutral-900/90 border border-neutral-800 text-center">
              <span className="text-2xl font-black text-emerald-400 font-mono">{summary.uploaded}</span>
              <p className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider mt-1">Images Uploaded</p>
            </div>
            <div className="p-4 rounded-lg bg-neutral-900/90 border border-neutral-800 text-center">
              <span className="text-2xl font-black text-blue-400 font-mono">{summary.replaced}</span>
              <p className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider mt-1">
                Catalog Paths Replaced
              </p>
            </div>
            <div className="p-4 rounded-lg bg-neutral-900/90 border border-neutral-800 text-center">
              <span className="text-2xl font-black text-purple-400 font-mono">{entries.length}</span>
              <p className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider mt-1">Total Mapped Files</p>
            </div>
          </div>

          {/* Mapped Files Details */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                Filename → Returned WordPress URL Map ({entries.length})
              </h4>
              <span className="text-[10px] text-neutral-500 font-mono">Saved in WordPress Catalog</span>
            </div>
            <div className="border border-neutral-800 rounded-lg overflow-hidden bg-black/60 max-h-64 overflow-y-auto divide-y divide-neutral-900">
              {entries.map(([filename, url]) => (
                <div
                  key={filename}
                  className="p-2.5 flex items-center justify-between gap-3 text-xs hover:bg-neutral-900/50"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="font-mono text-neutral-200 font-semibold truncate shrink-0 max-w-[200px]" title={filename}>
                      {filename}
                    </span>
                    <span className="text-neutral-600">→</span>
                    <span className="font-mono text-emerald-400/90 truncate text-[11px] flex-1" title={url}>
                      {url}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(url);
                        setCopiedKey(filename);
                        setTimeout(() => setCopiedKey(null), 2000);
                      }}
                      className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
                      title="Copy WordPress URL"
                    >
                      {copiedKey === filename ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    </button>
                    {url.startsWith('http') && (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
                        title="Open image in new tab"
                      >
                        <ExternalLink size={13} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 bg-[#181818] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shadow-sm"
          >
            Close Summary
          </button>
        </div>
      </div>
    </div>
  );
};
