import React, { useState, useEffect } from 'react';
import { ShieldCheck, Info, X } from 'lucide-react';
import { safeLocalStorage } from '../utils/safeStorage';

interface CookieConsentBannerProps {
  onOpenPreferences: () => void;
}

export default function CookieConsentBanner({ onOpenPreferences }: CookieConsentBannerProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if the user has already consented
    const consent = safeLocalStorage.getItem('rsa_cookie_consent');
    if (!consent) {
      // Small delayed fade-in for high professional feel
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    safeLocalStorage.setItem('rsa_cookie_consent', 'accepted');
    setIsVisible(false);
  };

  const handleDecline = () => {
    safeLocalStorage.setItem('rsa_cookie_consent', 'declined');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-6 md:right-auto md:max-w-md bg-[#1a1a1a] text-white border border-[#333333] shadow-2xl p-5 rounded z-[100] animate-slide-up select-none">
      <div className="flex gap-3 items-start">
        <div className="p-2 bg-[#ff0000]/10 text-[#ff0000] rounded shrink-0">
          <ShieldCheck size={20} />
        </div>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-[#ff0000]">
                RSA Regulatory Consent
              </span>
              <button 
                onClick={() => setIsVisible(false)}
                className="text-neutral-400 hover:text-white transition-colors"
                title="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
            <h4 className="font-bold text-sm tracking-tight mt-1">POPIA & Cookie Compliance</h4>
            <p className="text-[11px] text-[#999999] leading-relaxed mt-1.5">
              We process personal information & use trackers according to the South African <strong>Protection of Personal Information Act (POPIA)</strong> to handle quotes, service deliveries, and logistics.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2 pt-1">
            <button 
              onClick={handleAccept}
              className="px-4 py-2 bg-[#ff0000] hover:bg-[#cc0000] text-white text-[10px] font-black uppercase tracking-wider rounded transition-all cursor-pointer"
            >
              Accept Compliance Info
            </button>
            
            <button 
              onClick={onOpenPreferences}
              className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-[10px] font-bold uppercase tracking-wider rounded transition-all cursor-pointer flex items-center gap-1"
            >
              <Info size={10} />
              Read Policies
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
