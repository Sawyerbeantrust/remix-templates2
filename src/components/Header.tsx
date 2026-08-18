import React, { useState } from 'react';
import { ShoppingBag, PhoneCall, Mail, Settings, Globe, Shield, Activity, FileText, Menu, X, Search, ChevronDown, Heart, ArrowLeftRight, Palette, Bot } from 'lucide-react';
import { CartItem, Product } from '../types';
import { stripHtml } from '../utils/stripHtml';
import CategoryPreviewImage from './CategoryPreviewImage';

interface HeaderProps {
  cart: CartItem[];
  setIsCartOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  onOpenAbout: () => void;
  onOpenContact: () => void;
  onOpenFaq: () => void;
  products: Product[];
  onSelectProduct: (product: Product) => void;
  language?: 'en' | 'af';
  onLanguageChange?: (lang: 'en' | 'af') => void;
  theme: 'triton' | 'inospace';
  onThemeChange: (theme: 'triton' | 'inospace') => void;
  compareList?: Product[];
  onOpenCompare?: () => void;
  onOpenAssistant?: () => void;
}

export default function Header({
  cart,
  setIsCartOpen,
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  onOpenAbout,
  onOpenContact,
  onOpenFaq,
  products,
  onSelectProduct,
  language = 'en',
  onLanguageChange,
  theme = 'triton',
  onThemeChange,
  compareList = [],
  onOpenCompare,
  onOpenAssistant,
}: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isShopExpanded, setIsShopExpanded] = useState(false);
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const suggestions = searchQuery.trim().length >= 1 && products
    ? products.filter(p =>
        p.status !== 'draft' && (
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.modelCode.toLowerCase().includes(searchQuery.toLowerCase())
        )
      ).slice(0, 6)
    : [];

  const handleCategorySelect = (e: React.MouseEvent, category: string, subSearch?: string) => {
    e.preventDefault();
    setSelectedCategory(category);
    if (subSearch !== undefined) {
      setSearchQuery(subSearch);
    } else {
      setSearchQuery('');
    }
    setIsMobileMenuOpen(false);
    setTimeout(() => {
      const el = document.getElementById('product-segment-anchor');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const navLinks = [
    { label: language === 'en' ? 'Shop' : 'Winkel', href: '#' },
    { label: language === 'en' ? 'About Us' : 'Oor Ons', href: '#' },
    { label: language === 'en' ? 'Contact' : 'Kontak', href: '#' },
  ];

  return (
    <header className="bg-[#1a1a1a] backdrop-blur-md text-white sticky top-0 z-50 transition-all border-b border-[#333333]">
      {/* Top Bar with real contact info */}
      <div className="bg-[#0a0a0a] px-4 py-2 text-[10px] border-b border-[#333333] tracking-widest uppercase">
        <div className="w-full mx-auto flex flex-col md:flex-row justify-between items-center gap-2">
          <div className="flex flex-wrap items-center gap-6 text-[#999999]">
            <span className="flex items-center gap-2 hover:text-white cursor-pointer transition-colors">
              <PhoneCall size={10} className="text-white" /> +27 (0) 21 556 2413
            </span>
            <span className="flex items-center gap-2 hover:text-white cursor-pointer transition-colors">
              <Mail size={10} className="text-white" /> info@car-lifts.co.za
            </span>
            <span 
              onClick={() => window.location.hash = '#admin'} 
              className="flex items-center gap-2 hover:text-red-500 cursor-pointer transition-colors font-bold text-neutral-400 pl-4 border-l border-[#333333]"
            >
              <Shield size={10} className="text-red-500 animate-pulse" /> {language === 'en' ? 'Admin Portal' : 'Admin Portaal'}
            </span>
          </div>
          <div className="flex items-center gap-4 text-[#999999]">
            <span className="flex items-center gap-2 hover:text-white cursor-pointer transition-colors">
              {language === 'en' ? 'National Delivery' : 'Nasionale Aflewering'}
            </span>
            <span className="text-[#333333]" aria-hidden="true">|</span>
            
            {/* Language Switcher with improved touch targets */}
            <div className="flex items-center bg-[#111111] border border-neutral-800 rounded overflow-hidden select-none" id="lang-switcher">
              <button
                onClick={() => onLanguageChange?.('en')}
                className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center ${
                  language === 'en' 
                    ? 'bg-[#ff0000] text-white' 
                    : 'text-neutral-300 hover:text-white hover:bg-neutral-800'
                }`}
                title="English view"
              >
                EN
              </button>
              <button
                onClick={() => onLanguageChange?.('af')}
                className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center ${
                  language === 'af' 
                    ? 'bg-[#ff0000] text-white' 
                    : 'text-neutral-300 hover:text-white hover:bg-neutral-800'
                }`}
                title="Afrikaanse siening"
              >
                AFR
              </button>
            </div>

            <span className="text-[#333333]" aria-hidden="true">|</span>

            {/* Premium Theme Status (Single selected theme) */}
            <div className="flex items-center bg-[#111111] border border-neutral-800 rounded px-2.5 py-0.5 select-none" id="theme-switcher">
              <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider flex items-center gap-1.5" title="Active Showroom Theme">
                <div className={`w-1.5 h-1.5 rounded-full ${theme === 'inospace' ? 'bg-[#e31b23] animate-pulse' : 'bg-[#1e3a5f] animate-pulse'}`} />
                CAR-LIFTS
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="w-full mx-auto px-4 py-4 md:py-0 md:h-[70px] flex items-center">
        <div className="flex flex-1 items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center gap-4 group cursor-pointer mr-12">
            <div className="w-8 h-8 border border-[#e0e0e0] bg-transparent flex items-center justify-center transition-colors group-hover:bg-white group-hover:text-black">
              <div className="font-bold text-xs">CL</div>
            </div>
            <div>
              <div className="flex items-center gap-0">
                <span className="text-xl font-medium tracking-[0.2em] text-white uppercase">
                  Car-Lifts
                </span>
                <span className="text-[10px] text-[#999999] mt-1 ml-1">.co.za</span>
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-10 flex-1">
            <a href="#" className="text-sm font-semibold text-white hover:text-[#ff0000] hover:border-b-2 hover:border-[#ff0000] py-6 transition-all">
              {language === 'en' ? 'Home' : 'Tuiste'}
            </a>

            <a 
              href="#" 
              onClick={(e) => handleCategorySelect(e, 'all')}
              className="text-sm font-semibold text-white hover:text-[#ff0000] hover:border-b-2 hover:border-[#ff0000] py-6 transition-all"
            >
              {language === 'en' ? 'All Products' : 'Alle Produkte'}
            </a>

            <div className="relative group py-6 cursor-pointer select-none" id="shop-trigger-wrapper">
              <a 
                href="#" 
                onClick={(e) => { e.preventDefault(); const el = document.getElementById('product-segment-anchor'); if(el) el.scrollIntoView({ behavior: 'smooth' }); }}
                className="text-sm font-semibold text-white hover:text-[#ff0000] transition-colors flex items-center gap-1 group-hover:text-[#ff0000]"
              >
                {language === 'en' ? 'Shop' : 'Winkel'} <ChevronDown size={14} className="text-[#999999] group-hover:text-[#ff0000] group-hover:rotate-180 transition-all duration-200" />
              </a>
              {/* Dropdown Menu (Mega Menu format) */}
              <div className="absolute top-full -left-20 w-[840px] bg-white border border-[#e0e0e0] rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 z-50 p-6">
                <div className="grid grid-cols-4 gap-6 text-left">
                  {/* Column 1: 2-Post & 4-Post Lifts */}
                  <div>
                    <button
                      onClick={(e) => handleCategorySelect(e, 'car-lift', '2-post')}
                      className={`w-full text-left font-sans font-bold text-[11px] uppercase tracking-wider ${theme === 'inospace' ? 'text-[#e31b23]' : 'text-[#1e3a5f]'} hover:text-[#ff0000] border-b border-[#f0f0f0] pb-2 mb-3 block transition-colors`}
                    >
                      {language === 'en' ? '2-Post & 4-Post Lifts' : '2- & 4-Kolom Motorlifte'}
                    </button>
                    <div className="space-y-1">
                      {[
                        { id: 'lift-2p-clear', fallbackName: 'Pro 2-Post Clear-Floor Lift' },
                        { id: 'lift-2p-base', fallbackName: 'Comm 2-Post Baseplate Lift' },
                        { id: 'lift-2p-manual-4t', fallbackName: 'Triton 2-Post Manual Lift' },
                        { id: 'lift-4p-align', fallbackName: 'Industrial 4-Post Align Lift' }
                      ].map(item => {
                        const p = products?.find(prod => prod.id === item.id);
                        return (
                          <a
                            href="#"
                            key={item.id}
                            onClick={(e) => {
                              e.preventDefault();
                              if (p) {
                                onSelectProduct(p);
                              } else {
                                handleCategorySelect(e, 'car-lift', '2-post');
                              }
                            }}
                            className="w-full text-left font-sans text-xs text-[#555555] hover:text-[#ff0000] hover:pl-1 transition-all py-1 flex items-center gap-1.5 leading-tight"
                            title={p ? p.name : item.fallbackName}
                          >
                            <span className="font-semibold text-[8px] text-[#ff0000] bg-red-50 border border-red-100 px-1 py-[0.5px] rounded shrink-0 uppercase font-mono tracking-tight">
                              {p ? p.modelCode : 'LIFT'}
                            </span>
                            <span className="truncate">{p ? p.name.split('(')[0].trim() : item.fallbackName}</span>
                          </a>
                        );
                      })}
                    </div>
                  </div>

                  {/* Column 2: Parking & Scissor Lifts */}
                  <div>
                    <button
                      onClick={(e) => handleCategorySelect(e, 'car-lift', 'parking')}
                      className={`w-full text-left font-sans font-bold text-[11px] uppercase tracking-wider ${theme === 'inospace' ? 'text-[#e31b23]' : 'text-[#1e3a5f]'} hover:text-[#ff0000] border-b border-[#f0f0f0] pb-2 mb-3 block transition-colors`}
                    >
                      {language === 'en' ? 'Parking & Scissor Lifts' : 'Parkeering- & Skêrlifte'}
                    </button>
                    <div className="space-y-1">
                      {[
                        { id: 'lift-2p-parking-storage', fallbackName: '2-Post Parking Lift' },
                        { id: 'lift-2p-tilting-low', fallbackName: '2-Post Tilting Low-Ceiling' },
                        { id: 'scissor-lift-portable-27t', fallbackName: 'Portable Scissor Lift' },
                        { id: 'scissor-lift-tall-3t', fallbackName: 'Triton Full-Height Scissor' }
                      ].map(item => {
                        const p = products?.find(prod => prod.id === item.id);
                        return (
                          <a
                            href="#"
                            key={item.id}
                            onClick={(e) => {
                              e.preventDefault();
                              if (p) {
                                onSelectProduct(p);
                              } else {
                                handleCategorySelect(e, 'car-lift', 'parking');
                              }
                            }}
                            className="w-full text-left font-sans text-xs text-[#555555] hover:text-[#ff0000] hover:pl-1 transition-all py-1 flex items-center gap-1.5 leading-tight"
                            title={p ? p.name : item.fallbackName}
                          >
                            <span className="font-semibold text-[8px] text-[#ff0000] bg-red-50 border border-red-100 px-1 py-[0.5px] rounded shrink-0 uppercase font-mono tracking-tight">
                              {p ? p.modelCode : 'HOIST'}
                            </span>
                            <span className="truncate">{p ? p.name.split('(')[0].trim() : item.fallbackName}</span>
                          </a>
                        );
                      })}
                    </div>
                  </div>

                  {/* Column 3: Spray Booths */}
                  <div>
                    <button
                      onClick={(e) => handleCategorySelect(e, 'spray-booth')}
                      className={`w-full text-left font-sans font-bold text-[11px] uppercase tracking-wider ${theme === 'inospace' ? 'text-[#e31b23]' : 'text-[#1e3a5f]'} hover:text-[#ff0000] border-b border-[#f0f0f0] pb-2 mb-3 block transition-colors`}
                    >
                      {language === 'en' ? 'Spray Booth Cabins' : 'Spuitkaste & Kamers'}
                    </button>
                    <div className="space-y-1">
                      {[
                        { id: 'sb-down-draft', fallbackName: 'Pro Heated Down-Draft' },
                        { id: 'sb-semi-down', fallbackName: 'Apex Semi-Down Draft' },
                        { id: 'sb2-heated-spraybooth', fallbackName: 'Delta Double-Heated' }
                      ].map(item => {
                        const p = products?.find(prod => prod.id === item.id);
                        return (
                          <a
                            href="#"
                            key={item.id}
                            onClick={(e) => {
                              e.preventDefault();
                              if (p) {
                                onSelectProduct(p);
                              } else {
                                handleCategorySelect(e, 'spray-booth');
                              }
                            }}
                            className="w-full text-left font-sans text-xs text-[#555555] hover:text-[#ff0000] hover:pl-1 transition-all py-1 flex items-center gap-1.5 leading-tight"
                            title={p ? p.name : item.fallbackName}
                          >
                            <span className="font-semibold text-[8px] text-[#ff0000] bg-red-50 border border-red-100 px-1 py-[0.5px] rounded shrink-0 uppercase font-mono tracking-tight">
                              {p ? p.modelCode : 'BOOTH'}
                            </span>
                            <span className="truncate">{p ? p.name.split('(')[0].trim() : item.fallbackName}</span>
                          </a>
                        );
                      })}
                    </div>
                  </div>

                  {/* Column 4: Accessories & Welding */}
                  <div>
                    <button
                      onClick={(e) => handleCategorySelect(e, 'workshop-equipment')}
                      className={`w-full text-left font-sans font-bold text-[11px] uppercase tracking-wider ${theme === 'inospace' ? 'text-[#e31b23]' : 'text-[#1e3a5f]'} hover:text-[#ff0000] border-b border-[#f0f0f0] pb-2 mb-3 block transition-colors`}
                    >
                      {language === 'en' ? 'Accessories & Welding' : 'Werkswinkel Toebehore'}
                    </button>
                    <div className="space-y-1">
                      {[
                        { id: 'mig-welder-200b', fallbackName: 'Professional Synergic MIG' },
                        { id: 'mig-welder-200b-3in1', fallbackName: 'Synergic 3-in-1 MIG' },
                        { id: 'welding-helmet-auto', fallbackName: 'Auto-Darkening Helmet' }
                      ].map(item => {
                        const p = products?.find(prod => prod.id === item.id);
                        return (
                          <a
                            href="#"
                            key={item.id}
                            onClick={(e) => {
                              e.preventDefault();
                              if (p) {
                                onSelectProduct(p);
                              } else {
                                handleCategorySelect(e, 'workshop-equipment');
                              }
                            }}
                            className="w-full text-left font-sans text-xs text-[#555555] hover:text-[#ff0000] hover:pl-1 transition-all py-1 flex items-center gap-1.5 leading-tight"
                            title={p ? p.name : item.fallbackName}
                          >
                            <span className="font-semibold text-[8px] text-[#ff0000] bg-red-50 border border-red-100 px-1 py-[0.5px] rounded shrink-0 uppercase font-mono tracking-tight">
                              {p ? p.modelCode : 'WELDER'}
                            </span>
                            <span className="truncate">{p ? p.name.split('(')[0].trim() : item.fallbackName}</span>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Bottom Bar inside Mega Menu */}
                <div className="mt-5 pt-4 border-t border-[#f0f0f0] flex flex-col sm:flex-row justify-between items-center bg-[#fafafa] -mx-6 -mb-6 p-4 rounded-b-lg gap-2 text-left">
                  <span className="text-[10px] text-neutral-500 font-sans">
                    {language === 'en' ? 'Need customized layout drawings? Email info@car-lifts.co.za' : 'Benodig u pasgemaakte uitlegte? E-pos info@car-lifts.co.za'}
                  </span>
                  <div className="flex gap-4">
                    <button
                      onClick={(e) => handleCategorySelect(e, 'all')}
                      className="text-xs font-bold text-red-600 hover:text-red-700 transition-colors uppercase tracking-wider"
                    >
                      {language === 'en' ? 'View Full Canvas' : 'Sien Volledige Katalogus'} &rarr;
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <a 
              href="#" 
              onClick={(e) => { e.preventDefault(); onOpenAbout(); }}
              className="text-sm font-semibold text-white hover:text-[#ff0000] hover:border-b-2 hover:border-[#ff0000] py-6 transition-all"
            >
              {language === 'en' ? 'About Us' : 'Oor Ons'}
            </a>
            <a 
              href="#" 
              onClick={(e) => { e.preventDefault(); onOpenFaq(); }}
              className="text-sm font-semibold text-white hover:text-[#ff0000] hover:border-b-2 hover:border-[#ff0000] py-6 transition-all"
            >
              {language === 'en' ? 'FAQ' : 'VGV'}
            </a>
            <a 
              href="#" 
              onClick={(e) => { e.preventDefault(); onOpenContact(); }}
              className="text-sm font-semibold text-white hover:text-[#ff0000] hover:border-b-2 hover:border-[#ff0000] py-6 transition-all"
            >
              {language === 'en' ? 'Contact' : 'Kontak'}
            </a>
          </nav>

          {/* Right Actions & Cart */}
          <div className="flex items-center gap-5">
            
            <button
               onClick={() => setIsSearchOpen(!isSearchOpen)}
               className={`hidden md:flex p-1 text-[#666666] ${theme === 'inospace' ? 'hover:text-[#e31b23]' : 'hover:text-[#1e3a5f]'} hover:scale-110 transition-all cursor-pointer`}
             >
               <Search size={20} strokeWidth={1.5} />
            </button>
            
            <button
               id="header-assistant-btn"
               onClick={() => onOpenAssistant?.()}
               className={`hidden md:flex relative p-1 text-[#666666] ${theme === 'inospace' ? 'hover:text-[#e31b23]' : 'hover:text-[#ff0000]'} hover:scale-110 transition-all cursor-pointer`}
               title={language === 'af' ? 'Triton AI Produk-assistent' : 'Triton AI Product Assistant'}
             >
               <Bot size={20} strokeWidth={1.5} />
               <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
            </button>

            <button
               id="header-compare-btn"
               onClick={() => onOpenCompare?.()}
               className={`hidden md:flex relative p-2 text-[#666666] ${theme === 'inospace' ? 'hover:text-[#e31b23]' : 'hover:text-[#ff0000]'} hover:scale-110 transition-all cursor-pointer items-center gap-1`}
               title={language === 'af' ? 'Vergelyk toerusting' : 'Compare Equipment Matrix'}
             >
               <ArrowLeftRight size={20} strokeWidth={1.5} />
               <span className={`w-4 h-4 ${compareList.length > 0 ? 'bg-[#ff0000]' : 'bg-neutral-600'} text-white text-[10px] flex items-center justify-center rounded-full font-bold transition-colors`}>
                 {compareList.length}
               </span>
            </button>

            <button
               className={`hidden md:flex relative p-1 text-[#666666] ${theme === 'inospace' ? 'hover:text-[#e31b23]' : 'hover:text-[#1e3a5f]'} hover:scale-110 transition-all cursor-pointer`}
             >
               <Heart size={20} strokeWidth={1.5} />
               <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#e74c3c] text-white text-[10px] flex items-center justify-center rounded-full font-bold">0</span>
            </button>

            {/* Cart Trigger with improved touch target */}
            <button
              id="header-cart-btn"
              onClick={() => setIsCartOpen(true)}
              className={`relative w-11 h-11 flex items-center justify-center text-[#666666] ${theme === 'inospace' ? 'hover:text-[#e31b23]' : 'hover:text-[#1e3a5f]'} hover:scale-110 transition-all cursor-pointer`}
              title="View Cart"
            >
              <ShoppingBag size={20} strokeWidth={1.5} />
              {cartCount > 0 && (
                <span className={`absolute top-1.5 right-1.5 w-4 h-4 ${theme === 'inospace' ? 'bg-[#e31b23]' : 'bg-[#1e3a5f]'} text-white text-[10px] flex items-center justify-center rounded-full font-bold transform action-pulse`}>
                  {cartCount}
                </span>
              )}
            </button>

            {/* Desktop Request Quote button */}
             <button
               onClick={() => setIsCartOpen(true)}
               className={`hidden md:flex px-6 py-2.5 ${theme === 'inospace' ? 'bg-[#e31b23] hover:bg-[#c2141b]' : 'bg-[#1e3a5f] hover:bg-[#162a47]'} text-white text-sm font-semibold rounded shadow-sm hover:shadow-md transition-all ml-2`}
             >
               {language === 'en' ? 'Request Quote' : 'Vra Kwotasie'}
             </button>

            {/* Mobile Menu Toggle with improved touch target */}
            <button 
              className="md:hidden w-11 h-11 flex items-center justify-center text-white cursor-pointer"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

          </div>
        </div>
      </div>

       {/* Desktop Search Overlay (Slide down) */}
       {isSearchOpen && (
          <div className="absolute top-full left-0 w-full bg-[#f5f5f5] p-6 border-b border-[#e0e0e0] shadow-md z-40 transform origin-top transition-transform min-h-[90px] h-auto flex items-center justify-center overflow-visible">
             <div className="relative w-full max-w-lg flex items-center">
                <input
                  type="text"
                  placeholder={language === 'en' ? 'Search products, lifts, equipment...' : 'Soek produkte, lifte, toerusting...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full bg-white text-[#333333] text-sm px-4 py-3 border border-[#e0e0e0] rounded focus:outline-none focus:border-${theme === 'inospace' ? '[#e31b23]' : '[#1e3a5f]'} focus:ring-2 focus:ring-${theme === 'inospace' ? '[#e31b23]' : '[#1e3a5f]'}/20 transition-all font-sans placeholder-[#999999]`}
                />
                <button className={`absolute right-0 top-0 bottom-0 px-6 ${theme === 'inospace' ? 'bg-[#e31b23] hover:bg-[#c2141b]' : 'bg-[#1e3a5f] hover:bg-[#162a47]'} text-white text-sm font-bold rounded-r transition-colors`}>
                  {language === 'en' ? 'Search' : 'Soek'}
                </button>

                {/* Autocomplete Suggestions Box */}
                {suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-[#e0e0e0] shadow-2xl rounded-b-lg mt-1 overflow-hidden z-50 divide-y divide-slate-100 max-h-[320px] overflow-y-auto">
                    <div className="bg-[#1a1a1a] px-4 py-1.5 text-[10px] text-[#999999] uppercase tracking-wider font-semibold text-left">
                      {language === 'en' ? 'Suggested Products' : 'Voorgestelde Produkte'}
                    </div>
                    {suggestions.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          onSelectProduct(p);
                          setIsSearchOpen(false); // Close search bar on selection
                        }}
                        className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer transition-colors group text-left"
                      >
                        <CategoryPreviewImage 
                          src={p.image} 
                          alt={p.name} 
                          className="w-10 h-10 object-cover rounded border border-slate-100 group-hover:border-slate-300 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="text-xs font-bold text-slate-800 group-hover:text-[#ff0000] transition-colors truncate">
                              {p.name}
                            </h4>
                            <span className="text-[9px] font-mono font-medium text-slate-400 bg-slate-50 border border-slate-200 px-1 py-0.5 rounded leading-none shrink-0 uppercase">
                              {p.modelCode}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 truncate mt-0.5 leading-normal">
                            {stripHtml(p.description)}
                          </p>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-[10px] font-bold text-slate-900">
                              {!p.price || p.price <= 0 ? (language === 'en' ? 'Request Quote' : 'Vra Kwotasie') : `R ${p.price.toLocaleString('en-ZA')}`}
                            </span>
                            <span className="text-[9px] text-[#ff0000] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                              specs →
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* No results notice */}
                {searchQuery.trim().length >= 1 && suggestions.length === 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-[#e0e0e0] shadow-xl rounded-b-lg mt-1 p-4 text-center z-50">
                    <p className="text-xs text-slate-500">
                      {language === 'en' 
                        ? `No products matching "${searchQuery}"` 
                        : `Geen produkte stem ooreen met "${searchQuery}" nie`}
                    </p>
                  </div>
                )}
             </div>
             <button onClick={() => setIsSearchOpen(false)} className="absolute right-6 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-[#999999] hover:text-[#333333] cursor-pointer">
                <X size={20} />
             </button>
          </div>
       )}

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex h-screen bg-black/50" onClick={() => setIsMobileMenuOpen(false)}>
           <div 
             className="w-[280px] h-full bg-white shadow-[-4px_0_16px_rgba(0,0,0,0.2)] ml-auto flex flex-col relative transform transition-transform"
             onClick={(e) => e.stopPropagation()}
           >
              {/* Drawer Header */}
              <div className="bg-[#1a1a1a] p-5 flex justify-between items-center text-white">
                <span className="font-semibold text-base">Menu</span>
                <button onClick={() => setIsMobileMenuOpen(false)} className="w-11 h-11 flex items-center justify-center hover:opacity-80 transition-opacity cursor-pointer">
                  <X size={24} />
                </button>
              </div>

              {/* Mobile Nav Items */}
              <div className="flex-1 overflow-y-auto">
                <a href="#" className={`block px-5 py-4 text-sm text-[#333333] border-b border-[#f0f0f0] hover:bg-[#f5f5f5] hover:text-${theme === 'inospace' ? '[#e31b23]' : '[#1e3a5f]'} hover:border-l-[3px] hover:border-l-${theme === 'inospace' ? '[#e31b23]' : '[#1e3a5f]'} transition-colors`}>Home</a>
                
                <a 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); handleCategorySelect(e, 'all'); }}
                  className={`block px-5 py-4 text-sm text-[#333333] border-b border-[#f0f0f0] hover:bg-[#f5f5f5] hover:text-${theme === 'inospace' ? '[#e31b23]' : '[#1e3a5f]'} hover:border-l-[3px] hover:border-l-${theme === 'inospace' ? '[#e31b23]' : '[#1e3a5f]'} transition-colors`}
                >
                  {language === 'en' ? 'All Products' : 'Alle Produkte'}
                </a>

                {/* Mobile Shop section dropdown */}
                <div className="border-b border-[#f0f0f0]">
                  <button 
                    onClick={() => setIsShopExpanded(!isShopExpanded)}
                    className="w-full text-left px-5 py-4 text-sm font-semibold text-[#333333] hover:bg-[#f5f5f5] hover:text-[#ff0000] flex justify-between items-center transition-colors select-none"
                  >
                    <span>{language === 'en' ? 'Shop by Category' : 'Kategorieë'}</span>
                    <ChevronDown size={14} className={`text-neutral-500 transition-transform ${isShopExpanded ? 'rotate-180' : ''}`} />
                  </button>
                  {isShopExpanded && (
                    <div className="bg-[#fcfcfc] pl-8 pr-5 py-2 space-y-3.5 border-t border-b border-[#f0f0f0]">
                      <button 
                        onClick={(e) => handleCategorySelect(e, 'car-lift', '2-post')}
                        className="w-full text-left text-xs text-[#555555] hover:text-[#ff0000] font-medium block"
                      >
                        {language === 'en' ? '2-Post & 4-Post Lifts' : '2- & 4-Kolom Motorlifte'}
                      </button>
                      <button 
                        onClick={(e) => handleCategorySelect(e, 'car-lift', 'parking')}
                        className="w-full text-left text-xs text-[#555555] hover:text-[#ff0000] font-medium block"
                      >
                        {language === 'en' ? 'Parking & Scissor Lifts' : 'Parkeering- & Skêrlifte'}
                      </button>
                      <button 
                        onClick={(e) => handleCategorySelect(e, 'spray-booth')}
                        className="w-full text-left text-xs text-[#555555] hover:text-[#ff0000] font-medium block"
                      >
                        {language === 'en' ? 'Spray Booth Cabins' : 'Spuitkaste & Kamers'}
                      </button>
                      <button 
                        onClick={(e) => handleCategorySelect(e, 'workshop-equipment')}
                        className="w-full text-left text-xs text-[#555555] hover:text-[#ff0000] font-medium block"
                      >
                        {language === 'en' ? 'Accessories & Welding' : 'Werkswinkel Toebehore'}
                      </button>
                    </div>
                  )}
                </div>



                <a 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); setIsMobileMenuOpen(false); onOpenCompare?.(); }}
                  className={`flex items-center justify-between px-5 py-4 text-sm font-semibold text-[#333333] border-b border-[#f0f0f0] hover:bg-[#f5f5f5] hover:text-[#ff0000] transition-colors`}
                >
                  <span className="flex items-center gap-2">
                    <ArrowLeftRight size={16} className="text-[#ff0000]" />
                    {language === 'af' ? 'Vergelyk Matriks' : 'Compare Matrix'}
                  </span>
                  <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${compareList.length > 0 ? 'bg-[#ff0000] text-white' : 'bg-neutral-200 text-neutral-600'}`}>
                    {compareList.length}
                  </span>
                </a>

                <a 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); setIsMobileMenuOpen(false); onOpenAbout(); }}
                  className={`block px-5 py-4 text-sm text-[#333333] border-b border-[#f0f0f0] hover:bg-[#f5f5f5] hover:text-${theme === 'inospace' ? '[#e31b23]' : '[#1e3a5f]'} transition-colors`}
                >
                  About Us
                </a>
                <a 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); setIsMobileMenuOpen(false); onOpenFaq(); }}
                  className={`block px-5 py-4 text-sm text-[#333333] border-b border-[#f0f0f0] hover:bg-[#f5f5f5] hover:text-${theme === 'inospace' ? '[#e31b23]' : '[#1e3a5f]'} transition-colors`}
                >
                  FAQ
                </a>
                <a 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); setIsMobileMenuOpen(false); onOpenContact(); }}
                  className={`block px-5 py-4 text-sm text-[#333333] border-b border-[#f0f0f0] hover:bg-[#f5f5f5] hover:text-${theme === 'inospace' ? '[#e31b23]' : '[#1e3a5f]'} transition-colors`}
                >
                  Contact
                </a>

                <div className="p-5 mt-4">
                   <button
                     onClick={() => { setIsMobileMenuOpen(false); setIsCartOpen(true); }}
                     className={`w-full ${theme === 'inospace' ? 'bg-[#e31b23] hover:bg-[#c2141b]' : 'bg-[#1e3a5f] hover:bg-[#162a47]'} text-white text-sm font-semibold py-3.5 rounded transition-colors`}
                   >
                     {language === 'en' ? 'Request Quote' : 'Vra Kwotasie'}
                   </button>
                </div>
              </div>
           </div>
        </div>
      )}
    </header>
  );
}
