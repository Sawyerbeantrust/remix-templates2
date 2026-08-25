import React from 'react';
import { Phone, Mail, MessageCircle, Wrench, Shield, Clock, Lock, Sparkles } from 'lucide-react';

interface MaintenancePageProps {
  onAdminAccess?: () => void;
}

export default function MaintenancePage({ onAdminAccess }: MaintenancePageProps) {
  const whatsappUrl = "https://wa.me/27768252078?text=Hello%20Triton%20Team%2C%20I%20am%20inquiring%20about%20workshop%20equipment%20and%20car%20lifts.";

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col justify-between p-4 sm:p-8 font-sans selection:bg-red-600 selection:text-white">
      {/* Top Brand Bar */}
      <header className="max-w-5xl mx-auto w-full flex items-center justify-between py-4 border-b border-neutral-900">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-red-600 rounded flex items-center justify-center font-black text-xl tracking-tighter text-white shadow-lg shadow-red-600/20">
            T
          </div>
          <div>
            <div className="text-lg font-black tracking-wider uppercase text-white">
              TRITON <span className="text-red-500 text-xs font-bold tracking-widest ml-1">COMMERCIAL</span>
            </div>
            <div className="text-[10px] text-neutral-400 tracking-wider uppercase">
              Car Lifts & Workshop Equipment South Africa
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
            Showroom Upgrade Active
          </span>
        </div>
      </header>

      {/* Center Hero Block */}
      <main className="max-w-3xl mx-auto w-full my-auto py-12 text-center space-y-8">
        <div className="inline-flex p-4 bg-neutral-900/80 border border-neutral-800 rounded-2xl shadow-2xl relative">
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
          <Wrench size={42} className="text-red-500" strokeWidth={2} />
        </div>

        <div className="space-y-4">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white uppercase tracking-tight leading-tight">
            Site Under Maintenance
          </h1>
          <p className="text-base sm:text-lg text-neutral-300 font-medium max-w-xl mx-auto">
            We're upgrading our showroom. We'll be back shortly.
          </p>
          <p className="text-xs sm:text-sm text-neutral-500 max-w-lg mx-auto leading-relaxed">
            Our online catalog is receiving scheduled performance, inventory, and specification updates. Our technical sales and support desks are operating normally.
          </p>
        </div>

        {/* 3 Contact Channels */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left pt-4">
          {/* Phone */}
          <a
            href="tel:0215562413"
            className="group p-5 bg-[#121212] hover:bg-[#181818] border border-neutral-800 hover:border-red-500/50 rounded-xl transition-all duration-200 shadow-xl flex flex-col justify-between space-y-3"
            id="maintenance-phone-link"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Direct Telephone</span>
              <div className="p-2 bg-neutral-900 rounded-lg group-hover:text-red-400 text-neutral-400 transition-colors">
                <Phone size={16} />
              </div>
            </div>
            <div>
              <div className="text-base font-extrabold text-white font-mono group-hover:text-red-400 transition-colors">
                021 556 2413
              </div>
              <div className="text-[11px] text-neutral-500 mt-0.5">Mon–Fri: 08:00 – 17:00</div>
            </div>
          </a>

          {/* Email */}
          <a
            href="mailto:info@car-lifts.co.za"
            className="group p-5 bg-[#121212] hover:bg-[#181818] border border-neutral-800 hover:border-red-500/50 rounded-xl transition-all duration-200 shadow-xl flex flex-col justify-between space-y-3"
            id="maintenance-email-link"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Sales & Inquiries</span>
              <div className="p-2 bg-neutral-900 rounded-lg group-hover:text-red-400 text-neutral-400 transition-colors">
                <Mail size={16} />
              </div>
            </div>
            <div>
              <div className="text-sm font-extrabold text-white font-mono truncate group-hover:text-red-400 transition-colors">
                info@car-lifts.co.za
              </div>
              <div className="text-[11px] text-neutral-500 mt-0.5">Official quotes & spec sheets</div>
            </div>
          </a>

          {/* WhatsApp */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group p-5 bg-[#121212] hover:bg-[#181818] border border-neutral-800 hover:border-emerald-500/50 rounded-xl transition-all duration-200 shadow-xl flex flex-col justify-between space-y-3"
            id="maintenance-whatsapp-link"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Instant WhatsApp</span>
              <div className="p-2 bg-emerald-950/40 rounded-lg text-emerald-400 transition-colors">
                <MessageCircle size={16} />
              </div>
            </div>
            <div>
              <div className="text-base font-extrabold text-emerald-400 font-mono">
                +27 76 825 2078
              </div>
              <div className="text-[11px] text-neutral-500 mt-0.5">Live technical consultant</div>
            </div>
          </a>
        </div>

        {/* Highlights Banner */}
        <div className="bg-[#111111] border border-neutral-800/80 rounded-xl p-4 flex flex-wrap items-center justify-around gap-4 text-xs text-neutral-400">
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-red-500" />
            <span>Heavy-Duty CE Certified Lifts</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-amber-400" />
            <span>Nationwide SA Delivery & Rigging</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-emerald-400" />
            <span>380V & 220V Configurations</span>
          </div>
        </div>
      </main>

      {/* Footer & Discreet Admin Access */}
      <footer className="max-w-5xl mx-auto w-full py-4 border-t border-neutral-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-600">
        <div>
          © {new Date().getFullYear()} Triton Car Lifts & Workshop Equipment (Pty) Ltd. All rights reserved.
        </div>
        <div className="flex items-center gap-4">
          <a
            href="#admin"
            onClick={(e) => {
              if (onAdminAccess) {
                e.preventDefault();
                onAdminAccess();
              }
            }}
            id="maintenance-admin-access-link"
            className="flex items-center gap-1.5 text-neutral-500 hover:text-neutral-300 transition-colors py-1 px-2 rounded hover:bg-neutral-900 cursor-pointer"
            title="Administrator Login"
          >
            <Lock size={12} />
            <span>Admin Access</span>
          </a>
        </div>
      </footer>
    </div>
  );
}
