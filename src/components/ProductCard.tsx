import React, { useState } from 'react';
import { Product } from '../types';
import { stripHtml } from '../utils/stripHtml';
import { ShoppingBag, Eye, CheckCircle2, ShieldCheck, Settings, Award, RefreshCw, Calendar, ArrowLeftRight, Heart } from 'lucide-react';
import ResponsiveImage from './ResponsiveImage';

interface ProductCardProps {
  key?: string;
  product: Product;
  onAddToCart: (product: Product) => void;
  onOpenQuickView: (product: Product) => void;
  isCentralStocked?: boolean;
  isCentralSyncing?: boolean;
  isCentralFlash?: boolean;
  onToggleCompare?: (product: Product) => void;
  isInCompare?: boolean;
  onToggleWishlist?: (product: Product) => void;
  isInWishlist?: boolean;
}

export default function ProductCard({
  product,
  onAddToCart,
  onOpenQuickView,
  isCentralStocked,
  isCentralSyncing,
  isCentralFlash,
  onToggleCompare,
  isInCompare = false,
  onToggleWishlist,
  isInWishlist = false,
}: ProductCardProps) {
  const [hovered, setHovered] = useState(false);
  const [theme, setTheme] = useState<'triton' | 'inospace'>('triton');

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('cape_town_equipment_theme');
      if (saved === 'inospace' || saved === 'triton') {
        setTheme(saved);
      }
    } catch (e) {
      // fallback
    }
  }, []);

  const isInospace = theme === 'inospace';

  // Format category display name for the product card badge
  const categoryDisplayName = React.useMemo(() => {
    if (product.rawCategoryName && product.rawCategoryName.trim()) {
      return product.rawCategoryName.toUpperCase();
    }
    const name = (product.name || '').toLowerCase();
    const desc = (product.description || '').toLowerCase();
    const cat = (product.category || '').toLowerCase();
    const model = (product.modelCode || '').toLowerCase();

    if (name.includes('2-post') || desc.includes('2-post') || model.includes('2-post')) return '2-POST CAR LIFTS';
    if (name.includes('4-post') || desc.includes('4-post') || model.includes('4-post')) return '4-POST CAR LIFTS';
    if (name.includes('parking') || desc.includes('parking') || name.includes('stacker')) return 'PARKING LIFTS';
    if (name.includes('bus') && cat === 'spray-booth') return 'BUS SPRAY BOOTHS';
    if (cat === 'spray-booth' || name.includes('booth')) return 'AUTOMOTIVE SPRAY BOOTHS';
    if (name.includes('mig') || name.includes('welder') || name.includes('wire') || cat === 'welding-gear') return 'WELDING GEAR';
    if (name.includes('straightener') || name.includes('chassis')) return 'CHASSIS STRAIGHTENER';
    if (name.includes('filter') || desc.includes('filter')) return 'FILTER MEDIA';
    if (name.includes('ladder') || desc.includes('ladder')) return 'TELESCOPIC LADDERS';
    if (name.includes('ramp')) return 'FORKLIFT LOADING RAMPS';
    if (name.includes('oil') || desc.includes('oil')) return 'HYDRAULIC OIL';

    if (!product.category) return 'EQUIPMENT';
    switch (cat) {
      case 'car-lift':
      case 'car-lifts':
        return 'CAR LIFTS';
      case 'spray-booth':
      case 'spray-booths':
        return 'SPRAY BOOTHS';
      case 'workshop-equipment':
        return 'WORKSHOP EQUIPMENT';
      case 'welding-gear':
        return 'WELDING GEAR';
      default:
        return product.category.replace(/-/g, ' ').toUpperCase();
    }
  }, [product.rawCategoryName, product.category, product.name, product.description, product.modelCode]);

  // Generate a mock lead time based on product properties
  const mockLeadTime = React.useMemo(() => {
    const charSum = product.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const leadTimes = [
      '3-5 Working Days (Local Dispatch)',
      '7-10 Working Days (SABS Custom Build)',
      '14-21 Days (Direct Import)',
      '4 Weeks (Built-to-Order)',
      '6-8 Weeks (Specialist Sea Freight)'
    ];
    return leadTimes[charSum % leadTimes.length];
  }, [product.id]);

  // Generate estimated arrival date based on lead time
  const estimatedArrivalDate = React.useMemo(() => {
    const baseDate = new Date();
    let daysToAdd = 5;
    
    if (mockLeadTime.includes('3-5')) {
      daysToAdd = 5;
    } else if (mockLeadTime.includes('7-10')) {
      daysToAdd = 10;
    } else if (mockLeadTime.includes('14-21')) {
      daysToAdd = 21;
    } else if (mockLeadTime.includes('4 Weeks')) {
      daysToAdd = 28;
    } else if (mockLeadTime.includes('6-8')) {
      daysToAdd = 56;
    }
    
    const targetDate = new Date(baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
    return targetDate.toLocaleDateString('en-ZA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, [mockLeadTime]);

  // Real-time stock states (controlled centrally or falling back to product defaults)
  const isStocked = isCentralStocked !== undefined ? isCentralStocked : (product.inStock !== false);
  const isSyncing = isCentralSyncing || false;
  const flash = isCentralFlash || false;

  // Format ZAR rands currency
  const formatZAR = (num: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2,
    }).format(num);
  };

  const allProducts: Product[] = React.useMemo(() => {
    try {
      const saved = localStorage.getItem('triton_products_db');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      // fallback
    }
    return [];
  }, []);

  const lowestChildPrice = React.useMemo(() => {
    if (product.productType !== 'grouped' || !product.linkedSkuString) {
      return null;
    }
    const childSkus = product.linkedSkuString.split(',').map(s => s.trim().toLowerCase()).filter(s => s.length > 0);
    if (childSkus.length === 0) return null;

    const children = allProducts.filter(p => p && p.modelCode && childSkus.includes(p.modelCode.trim().toLowerCase()));
    if (children.length === 0) return null;

    const prices = children.map(p => p.price).filter(price => price > 0);
    if (prices.length === 0) return null;

    return Math.min(...prices);
  }, [product.productType, product.linkedSkuString, allProducts]);

  const priceInclVAT = product.price * 1.15; // 15% VAT in South Africa

  return (
    <div
      id={`product-card-${product.id}`}
      className={`bg-transparent ${isInospace ? 'rounded-none border-neutral-300 hover:border-[#e31b23]' : 'rounded-none border-neutral-800 hover:border-neutral-500'} overflow-hidden shadow-none hover:shadow-2xl transition-all duration-300 flex flex-col h-full group transform-gpu hover:-translate-y-1.5 hover:scale-[1.015]`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Product Image Panel */}
      <div className={`relative aspect-[4/3] ${isInospace ? 'bg-[#f5f5f5]' : 'bg-neutral-950'} overflow-hidden border-b ${isInospace ? 'border-neutral-300' : 'border-neutral-800'}`}>
        <ResponsiveImage
          src={product.image}
          alt={product.name}
          className="group-hover:scale-105 transition-transform duration-700"
          showFitToggle={false}
          aspectRatioClassName="aspect-[4/3]"
        />

        {/* Technical overlay when image succeeds or is empty */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-4 opacity-90">
          <div className="text-white w-full flex justify-between items-center bg-transparent">
            <span className="text-[10px] font-mono font-medium tracking-[0.2em] uppercase px-2 py-1 rounded-sm bg-black/50 border border-neutral-700/50 backdrop-blur-sm">
              {categoryDisplayName}
            </span>
          </div>
        </div>

        {/* Top-right persistent wishlist toggle badge on mobile & desktop */}
        {onToggleWishlist && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleWishlist(product);
            }}
            className={`absolute top-3 left-3 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-md ${
              isInWishlist
                ? 'bg-[#ff0000] text-white'
                : 'bg-black/60 text-white/80 hover:text-white hover:bg-black/80 backdrop-blur-sm'
            }`}
            title={isInWishlist ? 'Remove from wishlist' : 'Save to wishlist'}
          >
            <Heart size={14} className={isInWishlist ? 'fill-current' : ''} />
          </button>
        )}

        {/* Hover action bar overlay - hidden below md to avoid mobile hover lockouts */}
        <div className="absolute inset-0 bg-black/40 opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 hidden md:flex items-center justify-center gap-3">
          <button
            onClick={() => onOpenQuickView(product)}
            className={`w-11 h-11 flex items-center justify-center ${isInospace ? 'bg-[#e31b23] text-white hover:scale-110' : 'bg-white text-black hover:scale-105'} transition-all duration-300 font-medium cursor-pointer shadow-xl rounded-full`}
            title="Read Technical Specs"
          >
            <Eye size={18} strokeWidth={1.5} />
          </button>
          {onToggleCompare && (
            <button
              onClick={() => onToggleCompare(product)}
              className={`w-11 h-11 flex items-center justify-center ${isInCompare ? 'bg-[#ff0000] text-white border border-[#ff0000]' : 'bg-black/60 border border-white/60 text-white hover:bg-white hover:text-black'} transition-all duration-300 font-medium cursor-pointer shadow-xl rounded-full`}
              title={isInCompare ? 'Remove from compare' : 'Add to compare matrix'}
            >
              <ArrowLeftRight size={18} strokeWidth={1.5} />
            </button>
          )}
          {onToggleWishlist && (
            <button
              onClick={() => onToggleWishlist(product)}
              className={`w-11 h-11 flex items-center justify-center ${isInWishlist ? 'bg-[#ff0000] text-white border border-[#ff0000]' : 'bg-black/60 border border-white/60 text-white hover:bg-white hover:text-black'} transition-all duration-300 font-medium cursor-pointer shadow-xl rounded-full`}
              title={isInWishlist ? 'Remove from wishlist' : 'Save to wishlist'}
            >
              <Heart size={18} strokeWidth={1.5} className={isInWishlist ? 'fill-current' : ''} />
            </button>
          )}
          <button
            onClick={() => onAddToCart(product)}
            className={`w-11 h-11 flex items-center justify-center bg-transparent border border-white text-white ${isInospace ? 'hover:bg-[#e31b23] hover:border-[#e31b23]' : 'hover:bg-white hover:text-black'} transition-all duration-300 font-medium cursor-pointer rounded-full`}
            title="Add to WooCommerce checkout"
          >
            <ShoppingBag size={18} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Card Content body */}
      <div className="p-6 flex-1 flex flex-col font-sans">
        {/* Category & Status */}
        <div className="flex items-center justify-end mb-3 min-h-[22px]">
          {(() => {
            const badgeType = product.badgeType || (isStocked ? 'instock' : 'backorder');
            const isBackorder = badgeType === 'backorder';

            let badgeColorClass = '';
            let textColorClass = '';
            let badgeLabel = '';
            
            if (badgeType === 'instock') {
              badgeColorClass = isInospace ? 'bg-emerald-600 shadow-[0_0_6px_rgba(16,185,129,0.7)]' : 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]';
              textColorClass = isInospace ? 'text-emerald-700' : 'text-emerald-400';
              badgeLabel = 'IN STOCK';
            } else if (badgeType === 'backorder') {
              badgeColorClass = isInospace ? 'bg-[#e31b23] shadow-[0_0_6px_rgba(227,27,35,0.7)]' : 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.7)]';
              textColorClass = isInospace ? 'text-[#e31b23]' : 'text-amber-500';
              badgeLabel = 'BACKORDERED';
            } else if (badgeType === 'leadtime_24_48') {
              badgeColorClass = isInospace ? 'bg-blue-600 shadow-[0_0_6px_rgba(37,99,235,0.7)]' : 'bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.7)]';
              textColorClass = isInospace ? 'text-blue-700' : 'text-blue-400';
              badgeLabel = '24-48HR DISPATCH';
            } else if (badgeType === 'leadtime_custom') {
              badgeColorClass = isInospace ? 'bg-purple-600 shadow-[0_0_6px_rgba(147,51,234,0.7)]' : 'bg-fuchsia-400 shadow-[0_0_6px_rgba(232,121,249,0.7)]';
              textColorClass = isInospace ? 'text-purple-700' : 'text-fuchsia-400';
              badgeLabel = (product.leadTimeValue || 'LEAD TIME ORDER').toUpperCase();
            }

            return (
              <div className={`flex flex-col items-end shrink-0 relative group/stock ${isBackorder ? 'cursor-help' : ''}`}>
                {/* Tooltip for Backordered Stock */}
                {isBackorder && (
                  <div className="absolute bottom-full right-0 mb-2 w-64 bg-slate-950 border border-slate-800 text-neutral-100 p-3.5 rounded-lg shadow-2xl opacity-0 pointer-events-none group-hover/stock:opacity-100 group-hover/stock:pointer-events-auto transition-all duration-200 transform scale-95 origin-bottom-right group-hover/stock:scale-100 z-50 text-left">
                    <div className="flex items-center gap-1.5 border-b border-slate-800/80 pb-2 mb-2">
                      <Calendar size={13} className="text-amber-500 shrink-0" />
                      <span className="text-[9px] font-mono font-black tracking-widest text-slate-400 uppercase">ESTIMATED DISPATCH</span>
                    </div>
                    <p className="text-xs font-bold text-white tracking-wide leading-tight">
                      {estimatedArrivalDate}
                    </p>
                    <div className="mt-1.5 text-[9px] text-neutral-400 font-mono flex flex-col gap-0.5">
                      <span className="flex items-center justify-between">
                        <span className="text-neutral-400">Warehouse Lead Time:</span>
                        <strong className="text-amber-400 font-semibold">{mockLeadTime.split(' (')[0]}</strong>
                      </span>
                      {mockLeadTime.includes('(') && (
                        <span className="text-neutral-400 italic text-[8px] mt-0.5 text-right block">
                          {mockLeadTime.substring(mockLeadTime.indexOf('('))}
                        </span>
                      )}
                    </div>
                    {/* Pointer arrow */}
                    <div className="absolute top-full right-6 -mt-1 border-4 border-transparent border-t-slate-950" />
                  </div>
                )}

                <span className={`flex items-center gap-1.5 text-[10px] font-mono transition-all duration-300 py-0.5 px-1 rounded-sm ${
                  flash 
                    ? 'bg-neutral-800/80 text-white font-bold scale-105' 
                    : (isInospace ? 'text-neutral-700' : 'text-neutral-300')
                }`}>
                  {isSyncing && (
                    <RefreshCw size={10} className="animate-spin text-neutral-400 mr-0.5 shrink-0" />
                  )}
                  <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-500 shrink-0 ${badgeColorClass} animate-pulse`} />
                  <span className={`font-semibold tracking-wide ${textColorClass}`}>
                    {badgeLabel}
                  </span>
                </span>
                
                {isBackorder && (
                  <span className="text-[8px] font-mono text-neutral-400 mt-0.5 max-w-[125px] text-right line-clamp-1 truncate block font-semibold">
                    ETA: {mockLeadTime.split(' (')[0]}
                  </span>
                )}
              </div>
            );
          })()}
        </div>

        <h3 className={`text-base font-medium ${isInospace ? 'text-neutral-900 group-hover:text-[#e31b23]' : 'text-white group-hover:text-amber-500'} transition tracking-wide line-clamp-1 mb-2`}>
          {product.name}
        </h3>

        <p className={`text-xs ${isInospace ? 'text-neutral-600' : 'text-neutral-400'} line-clamp-2 leading-relaxed mb-6 font-light`}>
          {stripHtml(product.description)}
        </p>

        {/* Technical Features Strip */}
        <div className="space-y-2 mb-6 mt-auto">
          {(product.features || []).slice(0, 2).map((feat, idx) => (
            <div key={idx} className="flex items-start gap-2 text-xs text-neutral-400">
              <span className="text-neutral-400 text-[10px] font-bold mt-0.5">—</span>
              <span className={`line-clamp-1 font-light tracking-wide ${isInospace ? 'text-neutral-600' : 'text-neutral-400'}`}>{feat}</span>
            </div>
          ))}
        </div>

        {/* Pricing Segment - Removed per user request */}
        <div className={`border-t ${isInospace ? 'border-neutral-200' : 'border-neutral-800'} pt-5 mt-auto`}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-[9px] text-neutral-400 font-medium uppercase tracking-[0.15em] mb-1">AVAILABILITY</p>
              <button
                onClick={() => onAddToCart(product)}
                className={`text-xs font-black ${isInospace ? 'text-[#e31b23]' : 'text-[#ff0000]'} hover:text-white transition-colors duration-200 uppercase tracking-widest flex items-center gap-1 cursor-pointer bg-transparent border-0 outline-none p-0 inline-flex group/btn`}
              >
                <span className="underline group-hover/btn:no-underline">Quote on Request</span>
                <span>→</span>
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenQuickView(product)}
              className={`flex-1 py-2.5 bg-transparent ${isInospace ? 'text-neutral-900 border-neutral-300 hover:border-neutral-400' : 'text-white border border-neutral-700 hover:border-neutral-500'} text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer`}
            >
              <Settings size={14} className="text-neutral-400" strokeWidth={1.5} />
              SPECS
            </button>
            {onToggleCompare && (
              <button
                onClick={() => onToggleCompare(product)}
                className={`py-2.5 px-3 border transition-colors flex items-center justify-center cursor-pointer ${
                  isInCompare 
                    ? 'bg-[#ff0000] border-[#ff0000] text-white' 
                    : (isInospace ? 'border-neutral-300 text-neutral-700 hover:border-[#ff0000] hover:text-[#ff0000]' : 'border-neutral-700 text-neutral-300 hover:border-white hover:text-white')
                }`}
                title={isInCompare ? 'Remove from compare' : 'Add to comparison matrix'}
              >
                <ArrowLeftRight size={14} />
              </button>
            )}
            <button
              onClick={() => onAddToCart(product)}
              className={`flex-1 py-2.5 ${isInospace ? 'bg-[#e31b23] hover:bg-[#c2141b] text-white' : 'bg-white hover:bg-neutral-200 text-black'} text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer`}
            >
              <ShoppingBag size={14} strokeWidth={1.5} />
              ADD
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
