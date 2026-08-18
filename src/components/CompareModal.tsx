import React, { useState } from 'react';
import { Product } from '../types';
import { stripHtml } from '../utils/stripHtml';
import { handleImageElementError } from '../utils/imageFallback';
import { X, ArrowLeftRight, Check, ShoppingBag, Plus, Trash2, ShieldCheck, Zap, Settings, AlertCircle, Sparkles } from 'lucide-react';

interface CompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  compareList: Product[];
  onRemoveFromCompare: (productId: string) => void;
  onClearCompare: () => void;
  onAddToCart: (product: Product) => void;
  allProducts: Product[];
  onAddToCompare: (product: Product) => void;
  language?: 'en' | 'af';
  theme?: 'triton' | 'inospace';
}

export default function CompareModal({
  isOpen,
  onClose,
  compareList,
  onRemoveFromCompare,
  onClearCompare,
  onAddToCart,
  allProducts,
  onAddToCompare,
  language = 'en',
  theme = 'triton',
}: CompareModalProps) {
  const [highlightDifferences, setHighlightDifferences] = useState(false);
  const [selectedAddId, setSelectedAddId] = useState('');

  if (!isOpen) return null;

  const isAf = language === 'af';
  const isInospace = theme === 'inospace';

  // Extract common technical comparison fields
  const getCapacity = (p: Product) => {
    if (p.specifications && (p.specifications['Payload Capacity'] || p.specifications['Capacity'] || p.specifications['Lifting Capacity'])) {
      return p.specifications['Payload Capacity'] || p.specifications['Capacity'] || p.specifications['Lifting Capacity'];
    }
    const match = (p.name + ' ' + p.description).match(/(\d+(\.\d+)?\s*(ton|t|kg))/i);
    return match ? match[0] : (p.category === 'car-lift' ? '4.0 Ton Standard' : 'N/A');
  };

  const getPower = (p: Product) => {
    if (p.specifications && (p.specifications['Direct Electrical Line'] || p.specifications['Power Supply'] || p.specifications['Voltage'])) {
      return p.specifications['Direct Electrical Line'] || p.specifications['Power Supply'] || p.specifications['Voltage'];
    }
    const desc = p.description + ' ' + JSON.stringify(p.specifications || {});
    if (desc.includes('380V')) return '380V Three-Phase Heavy Industrial';
    if (desc.includes('220V')) return '220V Single-Phase Workshop Standard';
    return '380V / 220V Dual Option';
  };

  const getLiftingHeight = (p: Product) => {
    if (p.specifications && (p.specifications['Max Lifting Height'] || p.specifications['Height'])) {
      return p.specifications['Max Lifting Height'] || p.specifications['Height'];
    }
    const match = (p.description + ' ' + JSON.stringify(p.specifications || {})).match(/(\d{3,4}\s*mm)/i);
    return match ? match[0] : (p.category === 'car-lift' ? '1900 mm' : 'N/A');
  };

  const getCertification = (p: Product) => {
    if (p.specifications && (p.specifications['CE Standard'] || p.specifications['SABS Approved'])) {
      return `${p.specifications['CE Standard'] || 'CE Certified'} (${p.specifications['SABS Approved'] === 'Yes' ? 'SABS Approved' : 'SABS Direct'})`;
    }
    return 'CE Quality Inspected';
  };

  const getWarranty = (p: Product) => {
    return '3-Year Structural / 1-Year Electro-Hydraulic';
  };

  // Check if a row has differences among compared products
  const checkDiff = (getter: (p: Product) => string) => {
    if (compareList.length <= 1) return false;
    const values = compareList.map(getter);
    return new Set(values).size > 1;
  };

  const candidateProducts = allProducts.filter(p => !compareList.some(item => item.id === p.id));

  const handleSelectAdd = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedAddId(val);
    if (val) {
      const prod = allProducts.find(p => p.id === val);
      if (prod) {
        onAddToCompare(prod);
        setSelectedAddId('');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div 
        id="compare-modal-container"
        className="bg-[#111111] border border-neutral-800 text-white w-full max-w-6xl max-h-[92vh] rounded-xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Modal Header */}
        <div className="bg-[#181818] px-6 py-4 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#ff0000]/10 border border-[#ff0000]/30 flex items-center justify-center text-[#ff0000]">
              <ArrowLeftRight size={18} />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-wide uppercase flex items-center gap-2">
                {isAf ? 'Toerusting Vergelyking' : 'Equipment Comparison Matrix'}
                <span className="text-xs font-mono font-normal text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded-full">
                  {compareList.length} / 4
                </span>
              </h2>
              <p className="text-xs text-neutral-400 font-sans">
                {isAf 
                  ? 'Vergelyk spesifikasies, kapastiteit en kragtoevoer van motorlifte en werkswinkel toerusting.'
                  : 'Compare specifications, payload capacity, voltage line, and features side-by-side.'}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            {compareList.length > 1 && (
              <button
                onClick={() => setHighlightDifferences(!highlightDifferences)}
                className={`px-3 py-1.5 text-xs font-semibold rounded border transition-colors flex items-center gap-1.5 cursor-pointer ${
                  highlightDifferences
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                    : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-neutral-700'
                }`}
              >
                <Sparkles size={13} className={highlightDifferences ? 'text-amber-400' : 'text-neutral-400'} />
                {isAf ? 'Merk Verskille' : 'Highlight Differences'}
              </button>
            )}

            {compareList.length > 0 && (
              <button
                onClick={onClearCompare}
                className="px-3 py-1.5 text-xs font-semibold text-neutral-400 hover:text-red-400 bg-neutral-900 border border-neutral-800 rounded hover:border-red-950 transition-colors flex items-center gap-1 cursor-pointer"
                title="Clear all items from compare"
              >
                <Trash2 size={13} />
                {isAf ? 'Vee Alles Skoon' : 'Clear All'}
              </button>
            )}

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close comparison modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {compareList.length === 0 ? (
            <div className="py-16 text-center space-y-4 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto text-neutral-600">
                <ArrowLeftRight size={32} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">
                  {isAf ? 'Geen toerusting gekies om te vergelyk nie' : 'No equipment selected for comparison'}
                </h3>
                <p className="text-xs text-neutral-400">
                  {isAf 
                    ? 'Kliek op "Vergelyk" op enige produk in die katalogus of kies hieronder om te begin.'
                    : 'Click the compare icon on any product in the catalog or pick a product below to compare side-by-side.'}
                </p>
              </div>

              {candidateProducts.length > 0 && (
                <div className="pt-2">
                  <select
                    value={selectedAddId}
                    onChange={handleSelectAdd}
                    className="w-full bg-neutral-900 border border-neutral-700 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#ff0000]"
                  >
                    <option value="">{isAf ? '-- Kies produk om te vergelyk --' : '-- Select a product to compare --'}</option>
                    {candidateProducts.map(p => (
                      <option key={p.id} value={p.id}>
                        [{p.modelCode}] {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Add Product quick dropdown if less than 4 */}
              {compareList.length < 4 && candidateProducts.length > 0 && (
                <div className="bg-[#161616] border border-neutral-800 p-3 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <span className="text-neutral-400 font-medium">
                    {isAf ? 'Voeg nog n masjien by die vergelyking:' : 'Add another machine to compare:'}
                  </span>
                  <select
                    value={selectedAddId}
                    onChange={handleSelectAdd}
                    className="w-full sm:w-80 bg-neutral-900 border border-neutral-700 text-white rounded px-3 py-1.5 text-xs focus:outline-none focus:border-[#ff0000]"
                  >
                    <option value="">{isAf ? '+ Kies om by te voeg...' : '+ Select machine to add...'}</option>
                    {candidateProducts.map(p => (
                      <option key={p.id} value={p.id}>
                        [{p.modelCode}] {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Matrix Table */}
              <div className="overflow-x-auto border border-neutral-800 rounded-lg bg-[#0c0c0c]">
                <table className="w-full border-collapse text-left text-xs min-w-[700px]">
                  <thead>
                    <tr className="border-b border-neutral-800 bg-[#141414]">
                      <th className="p-4 w-44 font-mono font-bold text-neutral-400 uppercase tracking-wider text-[11px] align-top">
                        {isAf ? 'Produk Spesifikasies' : 'Specifications'}
                      </th>
                      {compareList.map(product => (
                        <th key={product.id} className="p-4 w-1/4 align-top border-l border-neutral-800 relative">
                          <button
                            onClick={() => onRemoveFromCompare(product.id)}
                            className="absolute top-3 right-3 p-1 rounded bg-neutral-800 hover:bg-red-950 text-neutral-400 hover:text-red-400 transition-colors"
                            title="Remove item"
                          >
                            <X size={14} />
                          </button>

                          <div className="space-y-2 pr-6">
                            <div className="aspect-[4/3] bg-black rounded overflow-hidden border border-neutral-800 mb-2">
                              <img 
                                src={product.image} 
                                alt={product.name} 
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                                onError={(e) => handleImageElementError(e)}
                              />
                            </div>
                            <span className="inline-block px-1.5 py-0.5 text-[9px] font-mono font-bold bg-[#ff0000]/10 text-[#ff0000] border border-[#ff0000]/20 rounded">
                              {product.modelCode}
                            </span>
                            <h4 className="font-bold text-white text-xs leading-snug line-clamp-2">
                              {product.name}
                            </h4>
                            <div className="pt-2">
                              <button
                                onClick={() => {
                                  onAddToCart(product);
                                  onClose();
                                }}
                                className="w-full py-2 bg-[#ff0000] hover:bg-[#cc0000] text-white font-bold text-xs uppercase tracking-wider rounded transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                              >
                                <ShoppingBag size={13} />
                                {isAf ? 'Vra Kwotasie' : 'Request Quote'}
                              </button>
                            </div>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60 font-sans">
                    {/* Category Row */}
                    <tr className={highlightDifferences && checkDiff(p => p.category) ? 'bg-amber-950/20' : ''}>
                      <td className="p-3.5 font-bold text-neutral-400 bg-[#121212]">
                        {isAf ? 'Kategorie' : 'Category'}
                      </td>
                      {compareList.map(p => (
                        <td key={p.id} className="p-3.5 border-l border-neutral-800 text-neutral-200 capitalize">
                          {p.category.replace('-', ' ')}
                        </td>
                      ))}
                    </tr>

                    {/* Payload Capacity */}
                    <tr className={highlightDifferences && checkDiff(getCapacity) ? 'bg-amber-950/20' : ''}>
                      <td className="p-3.5 font-bold text-neutral-400 bg-[#121212]">
                        {isAf ? 'Kapasiteit / Laai' : 'Lifting Capacity'}
                      </td>
                      {compareList.map(p => (
                        <td key={p.id} className="p-3.5 border-l border-neutral-800 font-semibold text-white">
                          {getCapacity(p)}
                        </td>
                      ))}
                    </tr>

                    {/* Voltage / Power */}
                    <tr className={highlightDifferences && checkDiff(getPower) ? 'bg-amber-950/20' : ''}>
                      <td className="p-3.5 font-bold text-neutral-400 bg-[#121212]">
                        {isAf ? 'Kragtoevoer' : 'Power Supply'}
                      </td>
                      {compareList.map(p => (
                        <td key={p.id} className="p-3.5 border-l border-neutral-800 text-neutral-300">
                          {getPower(p)}
                        </td>
                      ))}
                    </tr>

                    {/* Lifting Height */}
                    <tr className={highlightDifferences && checkDiff(getLiftingHeight) ? 'bg-amber-950/20' : ''}>
                      <td className="p-3.5 font-bold text-neutral-400 bg-[#121212]">
                        {isAf ? 'Max Hoogte' : 'Max Lifting Height'}
                      </td>
                      {compareList.map(p => (
                        <td key={p.id} className="p-3.5 border-l border-neutral-800 text-neutral-300">
                          {getLiftingHeight(p)}
                        </td>
                      ))}
                    </tr>

                    {/* Safety Certification */}
                    <tr className={highlightDifferences && checkDiff(getCertification) ? 'bg-amber-950/20' : ''}>
                      <td className="p-3.5 font-bold text-neutral-400 bg-[#121212]">
                        {isAf ? 'Sertifisering' : 'Safety Compliance'}
                      </td>
                      {compareList.map(p => (
                        <td key={p.id} className="p-3.5 border-l border-neutral-800 text-emerald-400 font-medium flex items-center gap-1.5">
                          <ShieldCheck size={14} className="shrink-0 text-emerald-500" />
                          <span>{getCertification(p)}</span>
                        </td>
                      ))}
                    </tr>

                    {/* Warranty */}
                    <tr>
                      <td className="p-3.5 font-bold text-neutral-400 bg-[#121212]">
                        {isAf ? 'Waarborg' : 'Warranty Coverage'}
                      </td>
                      {compareList.map(p => (
                        <td key={p.id} className="p-3.5 border-l border-neutral-800 text-neutral-300">
                          {getWarranty(p)}
                        </td>
                      ))}
                    </tr>

                    {/* Key Features */}
                    <tr>
                      <td className="p-3.5 font-bold text-neutral-400 bg-[#121212] align-top">
                        {isAf ? 'Sleutel Kenmerke' : 'Key Features'}
                      </td>
                      {compareList.map(p => (
                        <td key={p.id} className="p-3.5 border-l border-neutral-800 align-top">
                          <ul className="space-y-1 text-neutral-400 text-[11px] list-disc list-inside">
                            {(p.features || []).slice(0, 4).map((f, i) => (
                              <li key={i} className="line-clamp-2">{f}</li>
                            ))}
                          </ul>
                        </td>
                      ))}
                    </tr>

                    {/* Availability */}
                    <tr>
                      <td className="p-3.5 font-bold text-neutral-400 bg-[#121212]">
                        {isAf ? 'Beskikbaarheid' : 'Stock Status'}
                      </td>
                      {compareList.map(p => (
                        <td key={p.id} className="p-3.5 border-l border-neutral-800">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                            p.inStock !== false
                              ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-800/50'
                              : 'bg-amber-950/50 text-amber-400 border border-amber-800/50'
                          }`}>
                            <Check size={12} />
                            {p.inStock !== false ? (isAf ? 'IN VOORRAAD' : 'IN STOCK') : (isAf ? 'AGTERSTALLIGE BESTELLING' : 'BACKORDER')}
                          </span>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-[#181818] p-4 border-t border-neutral-800 flex justify-between items-center text-xs shrink-0">
          <span className="text-neutral-500 font-mono text-[11px]">
            {isAf ? 'Nutec Machinery T/A Car-Lifts Group SA (Pty) Ltd' : 'Car-Lifts.co.za Technical Matrix'}
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded transition-colors cursor-pointer"
          >
            {isAf ? 'Sluit' : 'Close Matrix'}
          </button>
        </div>
      </div>
    </div>
  );
}
