import React, { useState } from 'react';
import { FileCode, Copy, Check, ExternalLink } from 'lucide-react';
import { Product } from '../../types/index.js';

interface ShortcodesTabProps {
  products: Product[];
  categories: string[];
}

export const ShortcodesTab: React.FC<ShortcodesTabProps> = ({ products, categories }) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const shortcodes = [
    {
      id: 'sc-1',
      title: 'Full Product Catalog Grid',
      code: '[triton_catalog layout="grid" columns="3" per_page="12"]',
      desc: 'Embeds responsive interactive catalog grid with live filters, pricing, and modal viewers.',
    },
    {
      id: 'sc-2',
      title: 'Category Specific Showcase',
      code: `[triton_category_showcase category="${categories[0] || 'car-lifts'}" style="cards"]`,
      desc: 'Embeds filtered product collection with direct WhatsApp and quotation CTAs.',
    },
    {
      id: 'sc-3',
      title: 'Commercial Quote & Inquiry Form',
      code: '[triton_inquiry_form destination="sales@car-lifts.co.za" theme="dark"]',
      desc: 'High-converting multi-step quotation form with equipment selector and electrical phase inputs.',
    },
    {
      id: 'sc-4',
      title: 'Featured Equipment Hero Slider',
      code: '[triton_featured_slider limit="5" autoplay="true"]',
      desc: 'Hero slider featuring high-resolution commercial workshop machinery with CTA buttons.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 bg-neutral-900/80 border border-neutral-800 rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-950/80 border border-indigo-500/40 text-indigo-400">
            <FileCode size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              WordPress & Elementor Shortcode Directory
            </h3>
            <p className="text-xs text-neutral-400">Copy ready-to-use shortcodes for pages, posts, and Elementor widgets</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {shortcodes.map((sc) => (
          <div key={sc.id} className="p-5 bg-[#141414] border border-neutral-800 rounded-xl space-y-3">
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">{sc.title}</h4>
              <p className="text-xs text-neutral-400 mt-1">{sc.desc}</p>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-black rounded-lg border border-neutral-800">
              <code className="text-xs font-mono text-indigo-400 truncate mr-2">{sc.code}</code>
              <button
                type="button"
                onClick={() => copyToClipboard(sc.code, sc.id)}
                className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors shrink-0"
              >
                {copiedCode === sc.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
