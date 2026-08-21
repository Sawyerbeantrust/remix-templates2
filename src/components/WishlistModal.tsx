import React from 'react';
import { Product } from '../types';
import { stripHtml } from '../utils/stripHtml';
import { handleImageElementError } from '../utils/imageFallback';
import { X, Heart, ShoppingBag, Trash2, Eye, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface WishlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  wishlist: Product[];
  onRemoveFromWishlist: (productId: string) => void;
  onClearWishlist: () => void;
  onAddToCart: (product: Product) => void;
  onOpenQuickView: (product: Product) => void;
  language?: 'en' | 'af';
  theme?: 'triton' | 'inospace';
}

export default function WishlistModal({
  isOpen,
  onClose,
  wishlist,
  onRemoveFromWishlist,
  onClearWishlist,
  onAddToCart,
  onOpenQuickView,
  language = 'en',
  theme = 'triton',
}: WishlistModalProps) {
  if (!isOpen) return null;

  const isAf = language === 'af';
  const isInospace = theme === 'inospace';

  const formatZAR = (num: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2,
    }).format(num);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-[#151515] border border-[#333333] rounded-lg w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-neutral-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wishlist-modal-title"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#262626] bg-[#111111]">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded flex items-center justify-center ${isInospace ? 'bg-[#e31b23]/10 text-[#e31b23]' : 'bg-[#1e3a5f]/30 text-red-500'}`}>
              <Heart size={20} className="fill-current text-[#ff0000]" />
            </div>
            <div>
              <h2 id="wishlist-modal-title" className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                {isAf ? 'U Gunsteling Toerusting' : 'Saved Equipment & Wishlist'}
                <span className="text-xs font-mono font-normal bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded border border-neutral-700">
                  {wishlist.length} {wishlist.length === 1 ? (isAf ? 'item' : 'item') : (isAf ? 'items' : 'items')}
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                {isAf 
                  ? 'Gestoorde masjiene en kwotasie-keuses vir vinnige hersiening' 
                  : 'Saved machines and quotation selections for instant access'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-2 rounded-md hover:bg-neutral-800 transition-colors"
            title="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {wishlist.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-16 h-16 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto mb-4 text-neutral-600">
                <Heart size={28} />
              </div>
              <h3 className="text-base font-semibold text-neutral-200 mb-2">
                {isAf ? 'U wenslys is tans leeg' : 'Your wishlist is currently empty'}
              </h3>
              <p className="text-xs text-neutral-400 max-w-md mx-auto mb-6">
                {isAf
                  ? 'Klik op die hartjie-ikoon op enige motorlig, spuitkas of werkswinkel masjien om dit hier te stoor vir vinnige kwotasie-vergelyking.'
                  : 'Click the heart icon on any vehicle lift, spray booth, or workshop equipment to save it here for fast quote comparison.'}
              </p>
              <button
                onClick={() => {
                  onClose();
                  const el = document.getElementById('product-segment-anchor');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-all rounded shadow-md cursor-pointer ${
                  isInospace ? 'bg-[#e31b23] hover:bg-[#c2141b]' : 'bg-[#1e3a5f] hover:bg-[#152a45]'
                }`}
              >
                {isAf ? 'Blaai Deur Toerusting' : 'Browse Showroom Equipment'} &rarr;
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[#222222]">
              {wishlist.map((item) => (
                <div 
                  key={item.id}
                  className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div 
                      onClick={() => onOpenQuickView(item)}
                      className="w-16 h-16 sm:w-20 sm:h-20 bg-neutral-900 border border-neutral-800 rounded overflow-hidden shrink-0 cursor-pointer flex items-center justify-center p-1 group-hover:border-neutral-600 transition-colors"
                    >
                      <img
                        src={item.image}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        onError={(e) => handleImageElementError(e)}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-red-950/80 text-red-400 border border-red-800/60">
                          {item.modelCode || 'HEAVY-DUTY'}
                        </span>
                        <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold truncate">
                          {item.category?.replace(/-/g, ' ')}
                        </span>
                      </div>
                      <h4 
                        onClick={() => onOpenQuickView(item)}
                        className="text-sm font-semibold text-white hover:text-[#ff0000] cursor-pointer transition-colors line-clamp-1"
                        title={item.name}
                      >
                        {item.name}
                      </h4>
                      <div className="flex items-center gap-3 mt-1.5 text-xs">
                        <span className="font-bold text-white font-mono">
                          {formatZAR(item.price)}
                        </span>
                        <span className="text-neutral-500 font-sans text-[10px]">excl. VAT</span>
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400">
                          <CheckCircle2 size={11} /> {isAf ? 'In Voorraad' : 'In Stock'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      onClick={() => onOpenQuickView(item)}
                      className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors text-xs flex items-center gap-1 cursor-pointer"
                      title={isAf ? 'Bekyk Besonderhede' : 'Quick View Specs'}
                    >
                      <Eye size={15} />
                      <span className="hidden md:inline">{isAf ? 'Spesifikasies' : 'Specs'}</span>
                    </button>
                    <button
                      onClick={() => {
                        onAddToCart(item);
                      }}
                      className={`px-3 py-2 text-xs font-bold uppercase tracking-wider text-white transition-all rounded flex items-center gap-1.5 cursor-pointer shadow-xs ${
                        isInospace ? 'bg-[#e31b23] hover:bg-[#c2141b]' : 'bg-[#1e3a5f] hover:bg-[#152a45]'
                      }`}
                      title={isAf ? 'Voeg by Kwotasie' : 'Add to Quote / Cart'}
                    >
                      <ShoppingBag size={14} />
                      <span>{isAf ? 'Voeg By' : 'Add to Quote'}</span>
                    </button>
                    <button
                      onClick={() => onRemoveFromWishlist(item.id)}
                      className="p-2 text-neutral-500 hover:text-red-400 hover:bg-red-950/40 rounded transition-colors cursor-pointer"
                      title={isAf ? 'Verwyder van wenslys' : 'Remove from wishlist'}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {wishlist.length > 0 && (
          <div className="px-6 py-4 border-t border-[#262626] bg-[#111111] flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              onClick={onClearWishlist}
              className="text-xs text-neutral-400 hover:text-red-400 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 size={13} />
              <span>{isAf ? 'Maak Wenslys Skoon' : 'Clear All Items'}</span>
            </button>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={onClose}
                className="flex-1 sm:flex-initial px-4 py-2 text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded transition-colors cursor-pointer"
              >
                {isAf ? 'Sluit' : 'Continue Browsing'}
              </button>
              <button
                onClick={() => {
                  wishlist.forEach((p) => onAddToCart(p));
                  onClose();
                }}
                className={`flex-1 sm:flex-initial px-5 py-2 text-xs font-bold uppercase tracking-wider text-white rounded transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer ${
                  isInospace ? 'bg-[#e31b23] hover:bg-[#c2141b]' : 'bg-[#ff0000] hover:bg-[#cc0000]'
                }`}
              >
                <ShoppingBag size={14} />
                <span>{isAf ? 'Voeg Almal By Kwotasie' : 'Add All to Quotation'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
