import React from 'react';
import { X, MapPin, Award, ShieldCheck, Heart, Truck, Sparkles, Phone, Mail, Building } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContactClick: () => void;
  language?: 'en' | 'af';
}

const t = {
  en: {
    established: "CAPE TOWN ESTABLISHED",
    about_title: "ABOUT CAR-LIFTS SOUTH AFRICA",
    about_subtitle: "Engineered for South African workshop tolerances. Built with absolute integrity, proud to operate from the Mother City.",
    operating_title: "Operating from Killarney Gardens",
    history_p1: "Headquartered in the thriving industrial hub of Killarney Gardens, Cape Town, Nutec Machinery T/A Car-Lifts Group SA (Pty) Ltd has been at the forefront of automotive lifting and workshop equipment supply for over a decade.",
    history_p2: "We design, import, and test heavy-capacity twin-post lifts, alignment platforms, and high-performance heated spray booths. Drawing inspiration from the strength and timelessness of Table Mountain, our engineering standards are built to withstand the rigorous demands of South African commercial auto body shops and mechanical yards.",
    address_label: "Killarney Gardens, Cape Town",
    sans_label: "CE Compliant",
    western_cape_hub: "Western Cape Hub",
    cape_town_hq: "CAPE TOWN HQ",
    direct_logistics: "Direct logistics across all 9 provinces",
    sa_owned: "SA Owned",
    compliant: "Compliant",
    our_commitment: "OUR COMMITMENT",
    difference_title: "THE CAR-LIFTS DIFFERENCE",
    sa_standards: "South African Standards",
    sa_standards_desc: "Every electric car lift contains custom 380V or 220V power units certified according to compulsory CE regulations and electrical codes of practice.",
    national_delivery: "National Delivery Yards",
    national_delivery_desc: "While our engineering and test-rigs are located in Cape Town, we dispatch machinery to Johannesburg, Durban, Gqeberha, and Bloemfontein weekly using secure flatbed transporters.",
    local_spares: "Local Spares Warehouse",
    local_spares_desc: "Never worry about down-time. We store seals, hydraulic pumps, pulleys, steel cables, and limit switches here in our Western Cape warehouse for same-day dispatch.",
    visit_showroom: "VISIT OUR SHOWROOM",
    showroom_title: "CAPE TOWN SHOWROOM & TESTING BAY",
    showroom_desc: "Commercial workshops and individual collectors are welcome to visit our physical showroom in Killarney Gardens. Inspect our active models, experience our twin-cylinders lift setups, and consult directly with our structural engineering advisors.",
    address_full: "14 Killarney Avenue, Killarney Gardens, Cape Town, 7441",
    live_showroom_map: "Live Showroom Map",
    wc_hq: "Car-Lifts Western Cape HQ",
    map_desc: "Located just off Koeberg Road, providing fast highway access for transport operators.",
    reg_footer: "Nutec Machinery T/A Car-Lifts Group SA (Pty) Ltd · Reg: 2018/382042/07",
    close_about: "Close About",
    contact_office: "Contact Our Cape Town Office"
  },
  af: {
    established: "KAAPSTAD GEVESTIG",
    about_title: "OOR MOTORLIFTE SUID-AFRIKA",
    about_subtitle: "Ontwerp vir Suid-Afrikaanse werkswinkeltoleransies. Gebou met absolute integriteit, trots om vanuit die Moederstad te werk.",
    operating_title: "Bedrywig vanaf Killarney Gardens",
    history_p1: "Met ons hoofkwartier in die florerende industriële spilpunt van Killarney Gardens, Kaapstad, is Nutec Machinery H/A Car-Lifts Group SA (Edms) Bpk al vir meer as 'n dekade aan die voorpunt van die verskaffing van voertuigligters en werkswinkeltoerusting.",
    history_p2: "Ons ontwerp, voer in, en toets swaardiens dubbelkolom-lifte, belyningsplatforms, en hoëprestasie verhitte spuitkaste. Geïnspireer deur die krag en tydloosheid van Tafelberg, is ons ingenieurstandaarde gebou om die streng vereistes van Suid-Afrikaanse kommersiële motorherstelwinkels en meganiese werwe te weerstaan.",
    address_label: "Killarney Gardens, Kaapstad",
    sans_label: "Voldoen aan CE",
    western_cape_hub: "Wes-Kaapse Spilpunt",
    cape_town_hq: "KAAPSTAD HOOFKANTOOR",
    direct_logistics: "Direkte logistiek na al 9 provinsies",
    sa_owned: "SA Besit",
    compliant: "Voldoenend",
    our_commitment: "ONS VERBINTENIS",
    difference_title: "DIE MOTORLIFTE VERSKIL",
    sa_standards: "Suid-Afrikaanse Standaarde",
    sa_standards_desc: "Elke elektriese motorhyser bevat pasgemaakte 380V of 220V krageenhede wat gesertifiseer is volgens verpligte CE-regulasies en elektriese praktykkodes.",
    national_delivery: "Nasionale Afleweringswerwe",
    national_delivery_desc: "Alhoewel ons ingenieurswese en toetsfasiliteite in Kaapstad geleë is, versend ons weekliks masjinerie na Johannesburg, Durban, Gqeberha en Bloemfontein met veilige platbak-vragmotors.",
    local_spares: "Plaaslike Onderdele-pakhuis",
    local_spares_desc: "Moet nooit bekommerd wees oor staantyd nie. Ons stoor seëls, hidrouliese pompe, katrolle, staalkabels en limietskakelaars hier in ons Wes-Kaapse pakhuis vir dieselfde dag versending.",
    visit_showroom: "BESOEK ONS VERTOONLOKAAL",
    showroom_title: "KAAPSTAD VERTOONLOKAAL & TOETSBAY",
    showroom_desc: "Kommersiële werkswinkels en individuele versamelaars is welkom om ons fisiese vertoonlokaal in Killarney Gardens te besoek. Inspekteer ons aktiewe modelle, ervaar ons dubbelsilinder-ligstelsels, en raadpleeg ons strukturele ingenieursadviseurs direk.",
    address_full: "Killarney-laan 14, Killarney Gardens, Kaapstad, 7441",
    live_showroom_map: "Regstreekse Kaart",
    wc_hq: "Motorlifte Wes-Kaap Hoofkantoor",
    map_desc: "Geleë net buite Koebergweg, wat vinnige snelwegtoegang vir vervoeroperateurs bied.",
    reg_footer: "Nutec Machinery H/A Car-Lifts Group SA (Edms) Bpk · Reg: 2018/382042/07",
    close_about: "Sluit Besonderhede",
    contact_office: "Kontak Ons Kaapstad Kantoor"
  }
};

export default function AboutModal({ isOpen, onClose, onContactClick, language = 'en' }: AboutModalProps) {
  if (!isOpen) return null;

  const currentT = t[language];

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/90 backdrop-blur-md cursor-pointer" 
        onClick={onClose} 
      />
      
      {/* Modal Container */}
      <div className="relative bg-[#0d0d0d] border border-[#333333] w-full max-w-5xl h-[90vh] rounded-md shadow-2xl flex flex-col overflow-hidden animate-slide-up select-text text-neutral-200 font-sans">
        
        {/* Header Block with custom Cape Town visual flair */}
        <div className="relative bg-[#111111] p-6 sm:p-8 border-b border-[#222222] shrink-0 flex justify-between items-start">
          <div className="relative z-10">
            <span className="text-[#ff0000] font-bold uppercase tracking-[0.3em] text-[10px] block mb-2">{currentT.established}</span>
            <h3 className="text-2xl sm:text-4xl font-black text-white tracking-tight uppercase">
              {currentT.about_title}
            </h3>
            <p className="text-xs sm:text-sm text-[#999999] mt-2 max-w-xl">
              {currentT.about_subtitle}
            </p>
          </div>
          
          <button 
            onClick={onClose}
            className="relative z-10 p-2 text-[#999999] hover:text-white hover:bg-[#222222] rounded-full transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X size={22} />
          </button>

          {/* Abstract Subtle Grid Backdrop */}
          <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#333333_1px,transparent_1px)] [background-size:16px_16px] z-0" />
        </div>

        {/* Scrolling Inner Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-12">
          
          {/* Section 1: Split Pitch & Cape Town Heritage */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <h4 className="text-lg sm:text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                <span className="w-1.5 h-6 bg-[#ff0000]" />
                {currentT.operating_title}
              </h4>
              <p className="text-sm text-[#b3b3b3] leading-relaxed">
                {currentT.history_p1}
              </p>
              <p className="text-sm text-[#b3b3b3] leading-relaxed">
                {currentT.history_p2}
              </p>
              
              <div className="pt-2 flex flex-wrap gap-4 text-xs">
                <div className="flex items-center gap-2 text-neutral-400">
                  <MapPin size={14} className="text-[#ff0000]" />
                  <span>{currentT.address_label}</span>
                </div>
                <div className="flex items-center gap-2 text-neutral-400">
                  <ShieldCheck size={14} className="text-[#ff0000]" />
                  <span>{currentT.sans_label}</span>
                </div>
              </div>
            </div>

            {/* Cape Town Visual Card & Stats */}
            <div className="lg:col-span-5 bg-[#141414] border border-[#222222] p-6 rounded-md space-y-6">
              <div className="relative h-40 bg-[#1e1e1e] rounded overflow-hidden flex items-center justify-center border border-[#333333]">
                {/* Simulated stylized visual representation of Table Mountain silhouette / Cape Town Harbor */}
                <div className="absolute inset-0 opacity-30 bg-gradient-to-t from-black via-transparent to-transparent z-10" />
                <div className="text-center p-4 relative z-20 space-y-2">
                  <span className="text-[10px] bg-[#ff0000]/10 text-[#ff0000] border border-[#ff0000]/30 px-2 py-0.5 rounded font-bold uppercase tracking-widest">{currentT.western_cape_hub}</span>
                  <div className="text-lg font-bold text-white tracking-widest uppercase">{currentT.cape_town_hq}</div>
                  <div className="text-[10px] text-neutral-400">{currentT.direct_logistics}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="border border-[#222222] p-3 text-center rounded bg-[#111111]">
                  <div className="text-xl sm:text-2xl font-black text-white">100%</div>
                  <div className="text-[9px] uppercase tracking-wider text-[#999999] mt-1">{currentT.sa_owned}</div>
                </div>
                <div className="border border-[#222222] p-3 text-center rounded bg-[#111111]">
                  <div className="text-xl sm:text-2xl font-black text-[#ff0000]">CE</div>
                  <div className="text-[9px] uppercase tracking-wider text-[#999999] mt-1">{currentT.compliant}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Core Values (Bento Grid Style) */}
          <div className="space-y-6">
            <div className="text-center max-w-md mx-auto">
              <span className="text-[#ff0000] text-xs font-bold uppercase tracking-widest">{currentT.our_commitment}</span>
              <h4 className="text-xl font-black uppercase text-white mt-1">{currentT.difference_title}</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#111111] border border-[#222222] p-6 rounded hover:border-[#ff0000]/40 transition-all group">
                <div className="w-10 h-10 bg-[#ff0000]/10 text-[#ff0000] rounded flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                  <Award size={18} />
                </div>
                <h5 className="font-bold text-white text-base mb-2 uppercase">{currentT.sa_standards}</h5>
                <p className="text-xs text-[#999999] leading-relaxed">
                  {currentT.sa_standards_desc}
                </p>
              </div>

              <div className="bg-[#111111] border border-[#222222] p-6 rounded hover:border-[#ff0000]/40 transition-all group">
                <div className="w-10 h-10 bg-[#ff0000]/10 text-[#ff0000] rounded flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                  <Truck size={18} />
                </div>
                <h5 className="font-bold text-white text-base mb-2 uppercase">{currentT.national_delivery}</h5>
                <p className="text-xs text-[#999999] leading-relaxed">
                  {currentT.national_delivery_desc}
                </p>
              </div>

              <div className="bg-[#111111] border border-[#222222] p-6 rounded hover:border-[#ff0000]/40 transition-all group">
                <div className="w-10 h-10 bg-[#ff0000]/10 text-[#ff0000] rounded flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                  <Building size={18} />
                </div>
                <h5 className="font-bold text-white text-base mb-2 uppercase">{currentT.local_spares}</h5>
                <p className="text-xs text-[#999999] leading-relaxed">
                  {currentT.local_spares_desc}
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Engineering Team & Visual Map Location Info */}
          <div className="bg-gradient-to-r from-[#111111] to-[#161616] border border-[#222222] p-6 sm:p-8 rounded-md grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <span className="text-[10px] bg-[#ff0000]/15 text-[#ff0000] px-2.5 py-1 rounded font-bold uppercase tracking-wider inline-block">
                {currentT.visit_showroom}
              </span>
              <h4 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
                {currentT.showroom_title}
              </h4>
              <p className="text-xs sm:text-sm text-[#b3b3b3] leading-relaxed">
                {currentT.showroom_desc}
              </p>
              
              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-3 text-xs text-neutral-300">
                  <MapPin size={16} className="text-[#ff0000] shrink-0" />
                  <span>{currentT.address_full}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-neutral-300">
                  <Phone size={16} className="text-[#ff0000] shrink-0" />
                  <span>+27 (0) 21 556 2413</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-neutral-300">
                  <Mail size={16} className="text-[#ff0000] shrink-0" />
                  <span>showroom@car-lifts.co.za</span>
                </div>
              </div>
            </div>

            <div className="border border-[#333333] p-1 rounded bg-black/50 overflow-hidden relative">
              {/* Simulated visual Map representation */}
              <div className="aspect-video relative bg-[#1c1c1c] rounded flex flex-col items-center justify-center p-4 text-center">
                <span className="absolute top-2 right-2 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                  {currentT.live_showroom_map}
                </span>
                <MapPin size={34} className="text-[#ff0000] animate-bounce mb-3" />
                <div className="text-sm font-black text-white uppercase tracking-wider">{currentT.wc_hq}</div>
                <div className="text-[10px] text-[#999999] mt-1 max-w-xs">{currentT.map_desc}</div>
              </div>
            </div>
          </div>

        </div>

        {/* Footer CTAs */}
        <div className="bg-[#111111] p-5 border-t border-[#222222] flex flex-col sm:flex-row gap-4 justify-between items-center shrink-0">
          <div className="text-xs text-[#999999] font-mono text-center sm:text-left">
            {currentT.reg_footer}
          </div>
          
          <div className="flex gap-3 w-full sm:w-auto">
            <button 
              onClick={onClose}
              className="px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold uppercase tracking-wider rounded transition-all cursor-pointer flex-1 sm:flex-initial text-center"
            >
              {currentT.close_about}
            </button>
            <button 
              onClick={() => {
                onClose();
                onContactClick();
              }}
              className="px-6 py-2.5 bg-[#ff0000] hover:bg-[#cc0000] text-white text-xs font-bold uppercase tracking-wider rounded transition-all cursor-pointer flex-1 sm:flex-initial text-center"
            >
              {currentT.contact_office}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
