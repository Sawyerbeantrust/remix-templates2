import React, { useState } from 'react';
import {
  Globe, Sparkles, Search, Activity, Code, CheckCircle2,
  AlertTriangle, Copy, Check, ExternalLink, RefreshCw, FileText
} from 'lucide-react';
import { Product } from '../../types/index.js';
import { SeoHealthResult, CategoryAuditResult } from '../../types/console.js';
import { SOUTH_AFRICAN_COMPETITIVE_KEYWORDS, generateSchemaOrg } from '../../utils/console/seoGenerators.js';
import { formatZarPrice } from '../../utils/console/formatters.js';

interface SEOTabProps {
  products: Product[];
  categories: string[];
  globalSeoTitle: string;
  setGlobalSeoTitle: (val: string) => void;
  globalSeoDescription: string;
  setGlobalSeoDescription: (val: string) => void;
  selectedSeoProductId: string;
  setSelectedSeoProductId: (id: string) => void;
  selectedSeoProduct: Product;
  seoRichSnippetReviews: number;
  setSeoRichSnippetReviews: (val: number) => void;
  seoRichSnippetStock: 'instock' | 'outofstock';
  setSeoRichSnippetStock: (val: 'instock' | 'outofstock') => void;
  seoSearchSimulatorQuery: string;
  setSeoSearchSimulatorQuery: (val: string) => void;
  isGeneratingAiSeo: boolean;
  isGeneratingGlobalSeo: boolean;
  isAuditingHealth: boolean;
  isAuditingCategory: boolean;
  seoHealthData: SeoHealthResult | null;
  categoryAuditData: CategoryAuditResult | null;
  handleGenerateProductSeo: (p: Product) => void;
  handleGenerateGlobalSeo: () => void;
  handleRunSeoHealth: () => void;
  handleRunCategoryAudit: (cat: string) => void;
  addLog: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const SEOTab: React.FC<SEOTabProps> = ({
  products,
  categories,
  globalSeoTitle,
  setGlobalSeoTitle,
  globalSeoDescription,
  setGlobalSeoDescription,
  selectedSeoProductId,
  setSelectedSeoProductId,
  selectedSeoProduct,
  seoRichSnippetReviews,
  setSeoRichSnippetReviews,
  seoRichSnippetStock,
  setSeoRichSnippetStock,
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
  addLog,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'global' | 'simulator' | 'keywords' | 'schema' | 'audit'>('global');
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [selectedAuditCat, setSelectedAuditCat] = useState<string>(categories[0] || 'car-lifts');

  const schemaJson = selectedSeoProduct
    ? JSON.stringify(
        generateSchemaOrg(selectedSeoProduct, 'Triton Automotive Equipment South Africa', seoRichSnippetReviews, seoRichSnippetStock),
        null,
        2
      )
    : '';

  return (
    <div className="space-y-6">
      {/* SEO Tab Header */}
      <div className="p-4 bg-neutral-900/80 border border-neutral-800 rounded-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-950/80 border border-indigo-500/40 text-indigo-400">
            <Globe size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Search Engine Optimization & SERP Simulator
            </h3>
            <p className="text-xs text-neutral-400">
              South African high-intent keyword strategies, Schema.org rich snippets, and Google SERP rendering
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleGenerateGlobalSeo}
            disabled={isGeneratingGlobalSeo}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
          >
            <Sparkles size={14} />
            <span>{isGeneratingGlobalSeo ? 'Generating...' : 'AI Global SEO'}</span>
          </button>
          <button
            type="button"
            onClick={handleRunSeoHealth}
            disabled={isAuditingHealth}
            className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 text-neutral-200 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Activity size={14} className="text-emerald-400" />
            <span>{isAuditingHealth ? 'Auditing...' : 'Run SEO Audit'}</span>
          </button>
        </div>
      </div>

      {/* Sub Navigation */}
      <div className="flex border-b border-neutral-800 gap-2">
        {[
          { id: 'global', label: 'Global Strategy' },
          { id: 'simulator', label: 'Google SERP Preview' },
          { id: 'keywords', label: 'SA Competitive Keywords' },
          { id: 'schema', label: 'Schema.org JSON-LD' },
          { id: 'audit', label: 'Audit & Health' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
              activeSubTab === tab.id
                ? 'border-indigo-500 text-white bg-neutral-900/40'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sub-tab 1: Global Strategy */}
      {activeSubTab === 'global' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-[#141414] border border-neutral-800 rounded-xl p-5 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300">Global Website Metadata</h4>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                Global Title Tag ({globalSeoTitle.length} chars)
              </label>
              <input
                type="text"
                value={globalSeoTitle}
                onChange={(e) => setGlobalSeoTitle(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[10px] text-neutral-500 mt-1">Recommended: 50-60 characters</p>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                Global Meta Description ({globalSeoDescription.length} chars)
              </label>
              <textarea
                rows={4}
                value={globalSeoDescription}
                onChange={(e) => setGlobalSeoDescription(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[10px] text-neutral-500 mt-1">Recommended: 120-160 characters</p>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <div className="bg-[#141414] border border-neutral-800 rounded-xl p-5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300">Target Geolocation & Indexing</h4>
              <div className="space-y-2 text-xs text-neutral-400">
                <p className="flex items-center justify-between py-1.5 border-b border-neutral-850">
                  <span>Canonical Domain</span>
                  <span className="font-mono text-white">car-lifts.co.za</span>
                </p>
                <p className="flex items-center justify-between py-1.5 border-b border-neutral-850">
                  <span>Primary Target Market</span>
                  <span className="font-semibold text-emerald-400">South Africa (ZA)</span>
                </p>
                <p className="flex items-center justify-between py-1.5 border-b border-neutral-850">
                  <span>Regional Hubs</span>
                  <span className="text-neutral-200">Cape Town & Johannesburg</span>
                </p>
                <p className="flex items-center justify-between py-1.5">
                  <span>Robots Meta</span>
                  <span className="font-mono text-indigo-400">index, follow, max-image-preview:large</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-tab 2: Google SERP Preview */}
      {activeSubTab === 'simulator' && (
        <div className="space-y-4">
          <div className="p-4 bg-neutral-900/60 border border-neutral-800 rounded-xl flex items-center gap-3">
            <Search className="text-neutral-500 shrink-0" size={16} />
            <input
              type="text"
              placeholder="Test Google Search Query..."
              value={seoSearchSimulatorQuery}
              onChange={(e) => setSeoSearchSimulatorQuery(e.target.value)}
              className="flex-1 bg-transparent text-xs text-white placeholder-neutral-500 focus:outline-none"
            />
          </div>

          {/* Desktop Google Snippet Box */}
          <div className="bg-white p-6 rounded-xl border border-neutral-200 text-neutral-900 space-y-2 shadow-sm">
            <div className="flex items-center gap-2 text-xs text-neutral-600">
              <div className="w-4 h-4 rounded-full bg-red-600 flex items-center justify-center text-white text-[9px] font-bold">
                T
              </div>
              <div className="flex flex-col">
                <span className="font-medium text-neutral-800 text-[11px] leading-tight">Triton Car Lifts & Equipment</span>
                <span className="text-[10px] text-neutral-500 font-mono">https://car-lifts.co.za › product</span>
              </div>
            </div>
            <h3 className="text-lg text-[#1a0dab] hover:underline cursor-pointer font-medium leading-snug">
              {selectedSeoProduct?.seoTitle || globalSeoTitle}
            </h3>
            <p className="text-xs text-[#4d5156] leading-relaxed">
              {selectedSeoProduct?.seoDescription || globalSeoDescription}
            </p>
            {selectedSeoProduct && (
              <div className="flex items-center gap-3 text-[11px] text-[#70757a] font-mono pt-1">
                <span>Rating: {selectedSeoProduct.rating || '4.9'} ★★★★★ ({seoRichSnippetReviews} reviews)</span>
                <span>•</span>
                <span>Price: {formatZarPrice(selectedSeoProduct.price)}</span>
                <span>•</span>
                <span className="text-emerald-700 font-medium">In stock</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sub-tab 3: SA Keywords */}
      {activeSubTab === 'keywords' && (
        <div className="space-y-4">
          <div className="border border-neutral-800 rounded-xl overflow-hidden bg-[#141414]">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-900/80 text-neutral-400 uppercase font-bold border-b border-neutral-800">
                <tr>
                  <th className="p-3">South African Search Term</th>
                  <th className="p-3">Search Volume</th>
                  <th className="p-3">Difficulty</th>
                  <th className="p-3">Est. CPC</th>
                  <th className="p-3">Search Intent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-850 text-neutral-300">
                {Object.entries(SOUTH_AFRICAN_COMPETITIVE_KEYWORDS).flatMap(([cat, list]) =>
                  list.map((kw, i) => (
                    <tr key={`${cat}-${i}`} className="hover:bg-neutral-900/40">
                      <td className="p-3 font-semibold text-white">{kw.keyword}</td>
                      <td className="p-3 font-mono text-emerald-400">{kw.volume}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            kw.difficulty === 'Low'
                              ? 'bg-emerald-950 text-emerald-400'
                              : kw.difficulty === 'Medium'
                              ? 'bg-amber-950 text-amber-400'
                              : 'bg-red-950 text-red-400'
                          }`}
                        >
                          {kw.difficulty}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-neutral-300">{kw.cpc}</td>
                      <td className="p-3 text-neutral-400">{kw.intent}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-tab 4: Schema.org */}
      {activeSubTab === 'schema' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Select Product:</label>
              <select
                value={selectedSeoProductId}
                onChange={(e) => setSelectedSeoProductId(e.target.value)}
                className="px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(schemaJson);
                setCopiedSchema(true);
                setTimeout(() => setCopiedSchema(false), 2000);
              }}
              className="px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
            >
              {copiedSchema ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copiedSchema ? 'Copied' : 'Copy JSON-LD'}</span>
            </button>
          </div>

          <pre className="p-4 bg-black border border-neutral-800 rounded-xl text-xs font-mono text-emerald-400 overflow-x-auto max-h-96">
            {schemaJson}
          </pre>
        </div>
      )}

      {/* Sub-tab 5: Audit & Health */}
      {activeSubTab === 'audit' && (
        <div className="space-y-6">
          {seoHealthData ? (
            <div className="bg-[#141414] border border-neutral-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
                <div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">Site SEO Health Overview</h4>
                  <p className="text-xs text-neutral-400 mt-0.5">{seoHealthData.summary}</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-emerald-400">{seoHealthData.score}</span>
                  <span className="text-xs text-neutral-500 font-bold"> / 100</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Strengths</h5>
                  <ul className="space-y-1.5 text-xs text-neutral-300">
                    {seoHealthData.strengths.map((s, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Actionable Recommendations</h5>
                  <ul className="space-y-1.5 text-xs text-neutral-300">
                    {seoHealthData.issues.map((iss, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />
                        <span>{iss.recommendation}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-neutral-900/40 border border-neutral-800 rounded-xl space-y-3">
              <p className="text-xs text-neutral-400">Click below to run a real-time Gemini SEO health analysis.</p>
              <button
                type="button"
                onClick={handleRunSeoHealth}
                disabled={isAuditingHealth}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider shadow"
              >
                {isAuditingHealth ? 'Running Audit...' : 'Start SEO Audit'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
