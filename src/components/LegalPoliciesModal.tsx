import React, { useState, useEffect } from 'react';
import { X, Shield, FileText, Check, AlertCircle, Info } from 'lucide-react';

interface LegalPoliciesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab: 'privacy' | 'terms' | 'cookie';
}

export default function LegalPoliciesModal({ isOpen, onClose, initialTab }: LegalPoliciesModalProps) {
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms' | 'cookie'>(initialTab);
  const [theme, setTheme] = useState<'triton' | 'inospace'>('triton');

  useEffect(() => {
    setActiveTab(initialTab);
    try {
      const saved = localStorage.getItem('cape_town_equipment_theme');
      if (saved === 'inospace' || saved === 'triton') {
        setTheme(saved);
      }
    } catch (e) {
      // fallback
    }
  }, [initialTab, isOpen]);

  const isInospace = theme === 'inospace';
  const headingColor = isInospace ? 'text-[#e31b23]' : 'text-[#1e3a5f]';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/85 backdrop-blur-xs cursor-pointer" 
        onClick={onClose} 
      />
      
      {/* Modal Container */}
      <div className={`relative bg-white border border-[#e0e0e0] w-full max-w-4xl h-[85vh] ${isInospace ? 'rounded-none' : 'rounded'} shadow-2xl flex flex-col overflow-hidden animate-slide-up select-text`}>
        
        {/* Modal Header */}
        <div className="bg-[#1a1a1a] text-white p-5 border-b border-[#333333] flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 ${isInospace ? 'bg-[#e31b23]/10 text-[#e31b23] rounded-none' : 'bg-[#ff0000]/10 text-[#ff0000] rounded'}`}>
              <Shield size={20} />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base tracking-wide uppercase">
                South African Regulatory Compliance Centre
              </h3>
              <p className="text-[10px] sm:text-xs text-[#999999]">
                POPIA (Protection of Personal Information Act) & CPA (Consumer Protection Act) Audited
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-[#999999] hover:text-white hover:bg-[#333333] rounded-full transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="bg-[#f5f5f5] border-b border-[#e0e0e0] flex shrink-0 overflow-x-auto">
          <button 
            onClick={() => setActiveTab('privacy')}
            className={`px-5 py-3 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 border-b-2 shrink-0 ${
              activeTab === 'privacy' 
                ? `border-[#ff0000] ${isInospace ? 'text-[#e31b23]' : 'text-[#1e3a5f]'}` 
                : `border-transparent text-[#666666] ${isInospace ? 'hover:text-[#e31b23]' : 'hover:text-[#1e3a5f]'}`
            }`}
          >
            <Shield size={14} />
            Privacy Policy (POPIA)
          </button>
          
          <button 
            onClick={() => setActiveTab('terms')}
            className={`px-5 py-3 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 border-b-2 shrink-0 ${
              activeTab === 'terms' 
                ? `border-[#ff0000] ${isInospace ? 'text-[#e31b23]' : 'text-[#1e3a5f]'}` 
                : `border-transparent text-[#666666] ${isInospace ? 'hover:text-[#e31b23]' : 'hover:text-[#1e3a5f]'}`
            }`}
          >
            <FileText size={14} />
            Terms & Conditions (CPA)
          </button>
          
          <button 
            onClick={() => setActiveTab('cookie')}
            className={`px-5 py-3 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 border-b-2 shrink-0 ${
              activeTab === 'cookie' 
                ? `border-[#ff0000] ${isInospace ? 'text-[#e31b23]' : 'text-[#1e3a5f]'}` 
                : `border-transparent text-[#666666] ${isInospace ? 'hover:text-[#e31b23]' : 'hover:text-[#1e3a5f]'}`
            }`}
          >
            <Info size={14} />
            Cookie Policy (POPI)
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-white text-[#333333] text-sm leading-relaxed">
          
          {/* PRIVACY POLICY CONTENT */}
          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <div className="pb-4 border-b border-[#e0e0e0]">
                <h4 className="text-xl font-extrabold text-[#1a1a1a]">Privacy / Information Officer Policy</h4>
                <p className="text-xs text-[#999999] mt-1">Effective Date: June 13, 2026 | Compliant with POPI Act No. 4 of 2013 (South Africa)</p>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-4 rounded text-xs text-amber-800 flex items-start gap-2.5">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <div>
                  <strong>POPIA Compliance Statement:</strong> In accordance with the Protection of Personal Information Act (POPI Act No. 4 of 2013), we are committed to safeguarding the confidentiality, integrity, and safety of your personal information. Under South African law, you have the right to request access to, deletion of, or correction of any personal data we store.
                </div>
              </div>

              <div className="space-y-4">
                <h5 className={`font-bold ${headingColor} text-base`}>1. Types of Personal Information Collected</h5>
                <p>
                  We only collect direct information necessary to supply high-compliance automotive lifting equipment, heated spray booths, and relevant safety components:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Names, Company Name, VAT Registration numbers (for South African commercial transactions)</li>
                  <li>Direct contact digits (mobile numbers and email addresses) to communicate shipping requirements</li>
                  <li>Physical street addresses for the delivery and professional installation of heavy machinery</li>
                  <li>Bank account details (specifically for payments made via secure EFT transfers)</li>
                </ul>

                <h5 className={`font-bold ${headingColor} text-base`}>2. Purpose of Statement Processing</h5>
                <p>
                  As mandated by Chapter 3 of POPIA, we process information solely for lawful, defined reasons:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Preparing comprehensive, legally compliant commercial quotes or tax invoices</li>
                  <li>Coordinating crane drops, delivery flatbeds, and installation teams to structural locations</li>
                  <li>Verifying engineering site limits (such as standard single-phase 220V or three-phase 380V loads)</li>
                  <li>Meeting statutory reporting obligations of the South African Revenue Service (SARS)</li>
                </ul>

                <h5 className={`font-bold ${headingColor} text-base`}>3. Secure Storage & Retention of Personal Data</h5>
                <p>
                  Your information is hosted on sandboxed database environments utilizing strict, state-of-the-art encryption protocols. We retain transaction profiles for the minimum statutory periods required under Chapter 4 of the South African Companies Act and Tax Administration Act.
                </p>

                <h5 className={`font-bold ${headingColor} text-base`}>4. Your Statutory Direct Rights</h5>
                <p>
                  Under POPIA, you are entitled to:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Request a breakdown of any personal information we hold containing your footprint</li>
                  <li>Object directly to any proactive marketing material (with immediate opt-out effects)</li>
                  <li>Request immediate correction of incorrect product/delivery listings</li>
                  <li>File strict complaints with the South African Information Regulator (inforeg@justice.gov.za) if you suspect non-remedial breaches</li>
                </ul>

                <h5 className={`font-bold ${headingColor} text-base`}>5. Information Officer Contact</h5>
                <p>
                  Company Registration: Nutec Machinery T/A Car-Lifts Group SA (Pty) Ltd<br />
                  Location: Killarney Gardens, Cape Town, South Africa<br />
                  Information Officer Direct Email: info@nutecmachinery.co.za
                </p>
              </div>
            </div>
          )}

          {/* TERMS & CONDITIONS CONTENT */}
          {activeTab === 'terms' && (
            <div className="space-y-6">
              <div className="pb-4 border-b border-[#e0e0e0]">
                <h4 className="text-xl font-extrabold text-[#1a1a1a]">Terms & Conditions of Trade</h4>
                <p className="text-xs text-[#999999] mt-1">Effective Date: June 13, 2026 | Compliant with Consumer Protection Act No. 68 of 2008 (CPA)</p>
              </div>

              <div className="space-y-4">
                <h5 className={`font-bold ${headingColor} text-base`}>1. Binding Agreements & Applicability</h5>
                <p>
                  These conditions govern all quotes, sales, installations, and structural services conducted by Nutec Machinery across South African provinces. By submitting an interactive quote request through this application, you agree to comply fully with these provisions.
                </p>

                <h5 className={`font-bold ${headingColor} text-base`}>2. Section 49 CPA Disclosures (Important Notices)</h5>
                <div className="bg-red-50 border border-red-200 p-4 rounded text-xs text-red-800 space-y-2">
                  <p className="font-extrabold uppercase tracking-wide">⚠️ CRITICAL INSTALLATION & LIABILITY DISCLOSURES:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      <strong>Concrete Strength Mandates:</strong> All 2-post and 4-post vehicle lifting systems require a minimum concrete slab footing of 150mm thickness with 3000 PSI concrete integrity. Nutec Machinery accepts zero liability for column collapse due to substandard substrate concrete pouring or failure to install professional chemical bolting.
                    </li>
                    <li>
                      <strong>Power Hookup:</strong> All physical electrical wiring connections (single-phase 220V or three-phase 380V) must be finalized by a qualified, registered South African electrical contractor. Nutec Machinery does not conduct raw site mains wiring connections.
                    </li>
                    <li>
                      <strong>Mechanical Offloading:</strong> The buyer is strictly responsible for providing localized mechanical offloading facilities (e.g. mobile crane or professional forklift) at the delivery destination to safely receive heavy machinery shipments.
                    </li>
                  </ul>
                </div>

                <h5 className={`font-bold ${headingColor} text-base`}>3. Estimates, Invoices & EFT Payments</h5>
                <p>
                  Prices listed inside our digital catalog are South African Cash Prices (South African Rand). Unless explicitly stated, rates are quoted excluding VAT. No product may be picked up or dispatched for freight transport until EFT payments reflect as cleared in our corporate accounts, matching strict South African banking regulations.
                </p>

                <h5 className={`font-bold ${headingColor} text-base`}>4. Delivery, Returns & cooling-off periods</h5>
                <p>
                  According to Section 16 of the CPA, if you purchased equipment following direct marketing, you are entitled to a 5-day cooling-off cancel period. Returns on standard mechanical parts carry an absolute administrative restocking fee of up to 15% to cover transport, inspection, and repackaging. Customized equipment (such as specific large-scale truck or bus spray booths) cannot be cancelled or returned once engineering fabrication begins.
                    </p>

                <h5 className={`font-bold ${headingColor} text-base`}>5. Applicable Jurisdiction</h5>
                <p>
                  These terms shall be exclusively interpreted, governed, and resolved under the jurisdiction of the Western Cape High Court and regulatory South African consumer tribunals.
                </p>
              </div>
            </div>
          )}

          {/* COOKIE POLICY CONTENT */}
          {activeTab === 'cookie' && (
            <div className="space-y-6">
              <div className="pb-4 border-b border-[#e0e0e0]">
                <h4 className="text-xl font-extrabold text-[#1a1a1a]">Cookie Policy & Consent Framework</h4>
                <p className="text-xs text-[#999999] mt-1">Audit Standard: POPI Regulation Guidelines on Digital Tracking</p>
              </div>

              <div className="space-y-4">
                <h5 className={`font-bold ${headingColor} text-base`}>1. Digital Cookies Statement</h5>
                <p>
                  We utilize cookies and lightweight browser tracking technologies to improve our automotive showroom and checkout experiences. Under South African personal information guidelines, online identifiers (such as cookie indices) constitute personal information, requiring transparent consent.
                </p>

                <h5 className={`font-bold ${headingColor} text-base`}>2. Breakdown of Active Cookies</h5>
                <div className="divide-y divide-neutral-100 border border-neutral-200 rounded">
                  <div className="p-3 bg-neutral-50 flex justify-between items-center text-xs font-bold text-[#1a1a1a]">
                    <span>Classification</span>
                    <span>Function</span>
                  </div>
                  <div className="p-3 flex justify-between items-start gap-4 text-xs">
                    <div>
                      <strong className={`${headingColor} block`}>Strictly Necessary Cookies</strong>
                      <span className="text-[#666666]">Supports persistent shopping quotes, catalog paging states, and local storage safety caches.</span>
                    </div>
                    <span className="bg-green-100 text-green-800 text-[10px] px-2 py-0.5 rounded uppercase font-bold shrink-0">Mandatory</span>
                  </div>
                  <div className="p-3 flex justify-between items-start gap-4 text-xs">
                    <div>
                      <strong className={`${headingColor} block`}>WooCommerce Integration Cookies</strong>
                      <span className="text-[#666666]">Maintains synchronization tracking between localized selections and the WooCommerce REST API channel.</span>
                    </div>
                    <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded uppercase font-bold shrink-0">Variable</span>
                  </div>
                  <div className="p-3 flex justify-between items-start gap-4 text-xs">
                    <div>
                      <strong className={`${headingColor} block`}>Analytical Cookies</strong>
                      <span className="text-[#666666]">Monitors catalog interest trends anonymously to optimize South African shipping volumes.</span>
                    </div>
                    <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded uppercase font-bold shrink-0">Selective</span>
                  </div>
                </div>

                <h5 className={`font-bold ${headingColor} text-base`}>3. Consent Management</h5>
                <p>
                  You hold the absolute legislative right to revoke analytical or third-party marketing cookies at any time. Essential browser cookies must remain active to allow our custom catalog, wishlist, and inquiry functions to execute correctly.
                </p>

                <p>
                  To change your browser cookie rules or completely wipe your session records, simply clear your individual web browser cache or local storage indices containing website metadata.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer actions */}
        <div className="bg-[#f5f5f5] p-4 border-t border-[#e0e0e0] flex flex-col sm:flex-row gap-3 justify-between items-center shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-[#666666]">
            <Check size={14} className="text-green-600" />
            <span>RSA POPIA Compliance Version: <strong>2.0.46</strong></span>
          </div>
          <button 
            onClick={onClose}
            className={`px-6 py-2 bg-neutral-900 ${isInospace ? 'hover:bg-[#e31b23] rounded-none' : 'hover:bg-[#ff0000] rounded'} text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer w-full sm:w-auto text-center`}
          >
            I Accept terms
          </button>
        </div>

      </div>
    </div>
  );
}
