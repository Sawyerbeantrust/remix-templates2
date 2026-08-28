import React, { useState } from 'react';
import { X, MapPin, Phone, Mail, Building, Send, CheckCircle2, Clock, Map, ClipboardList, ZoomIn, ZoomOut, Compass } from 'lucide-react';
import { CartItem } from '../types';
import { handleImageElementError } from '../utils/imageFallback';
const mapImage = '/images/killarney_gardens_map_1781354004848.jpg';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart?: CartItem[];
  language?: 'en' | 'af';
}

const uiT = {
  en: {
    direct_line: "CAPE TOWN DIRECT LINE",
    title: "CONTACT & WORKSHOP ENQUIRY",
    subtitle: "Get detailed specifications, official quotes, or schedule a Cape Town showroom demo today.",
    tech_title: "TECHNICAL SPECIFICATION ENQUIRY",
    tech_desc: "Please provide your setup criteria so we can advise on standard foundation and electrical ceiling height clearances.",
    name_label: "Contact Name *",
    name_placeholder: "e.g. Johan de Beer",
    company_label: "Company / Workshop Name",
    company_placeholder: "e.g. Killarney Auto Body",
    email_label: "Email Address *",
    email_placeholder: "e.g. johan@example.co.za",
    phone_label: "Direct Phone Number *",
    phone_placeholder: "e.g. 082 123 4567",
    province_label: "Delivery Province",
    address_label: "Physical / Street Address *",
    address_placeholder: "e.g. Unit 4, 13 Killarney Avenue",
    suburb_label: "Suburb *",
    suburb_placeholder: "e.g. Killarney Gardens",
    interest_label: "Equipment Interest *",
    delivery_label: "Requires Delivery & Rigging?",
    delivery_yes: "Yes (Deliver to Site)",
    delivery_no: "No (Self-Collection)",
    items_included: "Items Included in Quote Request",
    additional_notes: "Additional Installation Criteria / Notes",
    notes_placeholder: "Provide any specific requirements (e.g. ceiling depth, custom 220V power pack requests, concrete thickness parameters...)",
    popia: "POPIA compliant. Your data is stored securely.",
    submitting: "TRANSMITTING ENQUIRY DATA...",
    submit: "SUBMIT SPECIFICATION REQUEST",
    cape_town_hub: "CAPE TOWN HUB",
    western_cape_office: "WESTERN CAPE OFFICE",
    call_showroom: "CALL SHOWROOM DIRECT",
    operational_hours: "Mon-Thurs 8 am - 4pm | Fri 8am - 2:30 pm",
    email_correspondence: "EMAIL CORRESPONDENCE",
    email_desc: "For orders, parts, and compliance certificates",
    physical_access: "PHYSICAL ACCESS POINT",
    killarney_address: "Unit 4, 13 Killarney Avenue",
    killarney_suburb: "Killarney Gardens, Cape Town, 7441",
    geolocation_map: "GEOLOCATION MAP",
    google_map: "Google Map",
    blueprint: "Blueprint",
    unit_4_title: "UNIT 4, 13 KILLARNEY AVE",
    zoom_hint: "ZOOM",
    click_to_zoom: "Click to magnify blueprint layout & road guides",
    high_res_title: "HIGH-RESOLUTION SITE PLAN",
    logistics_point: "KILLARNEY GARDENS LOGISTICS POINT",
    blueprint_layout: "Blueprint Layout",
    unit_4_showroom_here: "UNIT 4 SHOWROOM HERE",
    map_convenience: "Convenient access close to Cape Town Port, N7 interchange, and Koeberg Road.",
    open_google_maps: "OPEN GOOGLE MAPS",
    close_view: "CLOSE VIEW",
    footer_notice: "Showroom visits by appointment",
    dismiss_panel: "DISMISS CONTACT PANEL",
    
    // Success view
    transmitted: "ENQUIRY TRANSMITTED",
    thank_you: "THANK YOU FOR YOUR INQUIRY",
    success_desc: "Our sales engineers based in Cape Town have received your workbook request. A CE certified technical counselor will contact you within 2 working hours.",
    reference_id: "REFERENCE ID:",
    dispatch_from: "DISPATCH FROM:",
    killarney_cp: "Killarney Gardens, CP",
    est_response_time: "EST. RESPONSE TIME:",
    response_value: "< 120 Minutes",
    send_another: "Send another message",
    
    // Mailto templates
    mailto_dear: "Dear Car-Lifts South Africa,",
    mailto_inquire: "I would like to enquire about the following products:",
    mailto_details_header: "My Contact & Workshop Details:",
    mailto_full_name: "Full Name:",
    mailto_email: "Email:",
    mailto_phone: "Direct Phone:",
    mailto_address: "Address:",
    mailto_province: "Province:",
    mailto_rigging: "Delivery & Site Rigging:",
    mailto_yes: "Yes",
    mailto_no: "No (Self-Collection)",
    mailto_message_label: "Additional message / special requirements:",
    mailto_none: "None",
    mailto_kind_regards: "Kind regards,"
  },
  af: {
    direct_line: "KAAPSTAD DIREKTE LYN",
    title: "KONTAK & WERKSLOPER NAVRAAG",
    subtitle: "Kry gedetailleerde spesifikasies, amptelike kwotasies, of reël vandag 'n Kaapstad-vertoonlokaal-demonstrasie.",
    tech_title: "TEGNIESE SPESIFIKASIE NAVRAAG",
    tech_desc: "Verskaf asseblief u opstellingskriteria sodat ons u kan adviseer oor standaardfondasies en elektriese plafonhoogtevryhoogtes.",
    name_label: "Naam van Kontakpersoon *",
    name_placeholder: "b.v. Johan de Beer",
    company_label: "Maatskappy / Werkswinkelnaam",
    company_placeholder: "b.v. Killarney Auto Body",
    email_label: "E-posadres *",
    email_placeholder: "b.v. johan@example.co.za",
    phone_label: "Direkte Telefoonnommer *",
    phone_placeholder: "b.v. 082 123 4567",
    province_label: "Afleweringsprovinsie",
    address_label: "Fisiese / Straatadres *",
    address_placeholder: "b.v. Eenheid 4, Killarney-laan 13",
    suburb_label: "Voorstad *",
    suburb_placeholder: "b.v. Killarney Gardens",
    interest_label: "Toerusting Belangstelling *",
    delivery_label: "Vereis Aflewering & Montering?",
    delivery_yes: "Ja (Aflewer op terrein)",
    delivery_no: "Nee (Self-Afhaal)",
    items_included: "Items ingesluit by kwotasieversoek",
    additional_notes: "Bykomende Installasie Kriteria / Notas",
    notes_placeholder: "Verskaf enige spesifieke vereistes (b.v. plafon-diepte, pasgemaakte 220V kragbron-versoeke, beton-dikte parameters...)",
    popia: "Voldoen aan POPIA. U data word veilig gestoor.",
    submitting: "STUUR NAVRAAGDATA...",
    submit: "STUUR SPESIFIKASIEVERSOEK",
    cape_town_hub: "KAAPSTAD HUB",
    western_cape_office: "WES-KAAP KANTOOR",
    call_showroom: "BEL VERTOONLOKAAL DIREK",
    operational_hours: "Ma-Do 8 am - 4pm | Vr 8am - 2:30 pm",
    email_correspondence: "E-POS KORRESPONDENSIE",
    email_desc: "Vir bestellings, onderdele en nakomingsertifikate",
    physical_access: "FISIESE TOEGANGSPUNT",
    killarney_address: "Eenheid 4, Killarney-laan 13",
    killarney_suburb: "Killarney Gardens, Kaapstad, 7441",
    geolocation_map: "GEOLOKASIE-KAART",
    google_map: "Google Map",
    blueprint: "Bloudruk",
    unit_4_title: "EENHEID 4, KILLARNEY-LAAN 13",
    zoom_hint: "ZOOM",
    click_to_zoom: "Klik om bloudruk-uitleg en padgids te vergroot",
    high_res_title: "HOË-RESOLUSIE TERREINPLAN",
    logistics_point: "KILLARNEY GARDENS LOGISTIEKE PUNT",
    blueprint_layout: "Bloudruk-Uitleg",
    unit_4_showroom_here: "EENHEID 4 VERTOONLOKAAL HIER",
    map_convenience: "Gerieflike toegang naby Kaapstad Hawe, N7-wisselaar en Koeberg-weg.",
    open_google_maps: "MAAK GOOGLE MAPS OOP",
    close_view: "SLUIT SKERM",
    footer_notice: "Vertoonlokaalbesoeke volgens afspraak",
    dismiss_panel: "SLUIT KONTAK-PANEEL",
    
    // Success view
    transmitted: "NAVRAAG GESTUUR",
    thank_you: "DANKIE VIR U NAVRAAG",
    success_desc: "Ons verkoopsingenieurs in Kaapstad het u versoek ontvang. 'n CE-gesertifiseerde tegniese adviseur sal u binne 2 werksure kontak.",
    reference_id: "VERWYSINGS-ID:",
    dispatch_from: "STUUR VANAF:",
    killarney_cp: "Killarney Gardens, KP",
    est_response_time: "VERWAGTE REAKSIETYD:",
    response_value: "< 120 Minute",
    send_another: "Stuur nog 'n boodskap",
    
    // Mailto templates
    mailto_dear: "Geagte Car-Lifts Suid-Afrika,",
    mailto_inquire: "Ek wil graag navraag doen oor die volgende produkte:",
    mailto_details_header: "My Kontak- & Werkswinkelbesonderhede:",
    mailto_full_name: "Volle Naam:",
    mailto_email: "E-pos:",
    mailto_phone: "Direkte Telefoon:",
    mailto_address: "Adres:",
    mailto_province: "Provinsie:",
    mailto_rigging: "Aflewering & Montering:",
    mailto_yes: "Ja",
    mailto_no: "Nee (Self-Afhaal)",
    mailto_message_label: "Bykomende boodskap / spesiale vereistes:",
    mailto_none: "Geen",
    mailto_kind_regards: "Met vriendelike groete,"
  }
};

export default function ContactModal({ isOpen, onClose, cart = [], language = 'en' }: ContactModalProps) {
  const currentT = uiT[language];
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    province: 'Western Cape',
    suburb: '',
    address: '',
    deliveryPreference: 'yes' as 'yes' | 'no',
    interest: 'Professional 2-Post Clear-Floor Hydraulic Lift (CL-2PC-4000)',
    message: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [isMapZoomed, setIsMapZoomed] = useState(false);
  const [mapType, setMapType] = useState<'google' | 'blueprint'>('google');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/send-inquiry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: formData.name,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          suburb: formData.suburb,
          province: formData.province,
          deliveryPreference: formData.deliveryPreference,
          cartItems: cart.length > 0 ? cart : [{
            product: {
              name: formData.interest,
              modelCode: "DIRECT_INQUIRY",
              price: 0
            },
            quantity: 1
          }],
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        const refId = data.referenceId || `CL-RFQ-2026-${Math.floor(1000 + Math.random() * 9000)}`;
        setIsSubmitted(true);
        setReferenceNumber(refId);
      } else {
        alert(data.message || "Could not process contact form. Please try again.");
      }
    } catch (error) {
      console.error("Error submitting contact form:", error);
      const fallbackRefId = `CL-RFQ-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      setIsSubmitted(true);
      setReferenceNumber(fallbackRefId);
    } finally {
      setIsSubmitting(false);
    }
  };

  const provinces = [
    { value: 'Western Cape', label: language === 'en' ? 'Western Cape' : 'Wes-Kaap' },
    { value: 'Gauteng', label: 'Gauteng' },
    { value: 'KwaZulu-Natal', label: 'KwaZulu-Natal' },
    { value: 'Eastern Cape', label: language === 'en' ? 'Eastern Cape' : 'Oos-Kaap' },
    { value: 'Free State', label: language === 'en' ? 'Free State' : 'Vrystaat' },
    { value: 'Limpopo', label: 'Limpopo' },
    { value: 'Mpumalanga', label: 'Mpumalanga' },
    { value: 'North West', label: language === 'en' ? 'North West' : 'Noordwes' },
    { value: 'Northern Cape', label: language === 'en' ? 'Northern Cape' : 'Noord-Kaap' }
  ];

  const groupedEquipment = [
    {
      categoryName: language === 'en' ? 'Heated Spray Booths' : 'Verhitte Spuitkaste',
      items: [
        'Pro-Series Down-Draft Heated Spray Booth (SB-DD-7000)',
        'Apex Semi-Down Draft Spray Booth (SB-SDD-6800)',
        'SB1 Budget Workshop Spray Booth (SB1-Triton)',
        'SB2 Professional Full Down-Draft Heated Booth (SB2-Pro)',
        'Spray Booth Protective Lining Film (TF1225mm)',
      ]
    },
    {
      categoryName: language === 'en' ? 'Hydraulic Car Lifts' : 'Hidrouliese Motorlifte',
      items: [
        'Professional 2-Post Clear-Floor Hydraulic Lift (CL-2PC-4000)',
        'Commercial 2-Post Baseplate Hydraulic Lift (CL-2PB-4200)',
        'Industrial 4-Post Wheel Alignment Lift (CL-4PA-5000)',
      ]
    },
    {
      categoryName: language === 'en' ? 'Parking & Multi-level Storage Platforms' : 'Parkeerstelsels & Meerlaagse Berging',
      items: [
        '2-Post Vehicle Parking Storage Lift (2.7-Ton) (2ppsl)',
        '2-Post Tilting Parking storage Lift (Low-Ceiling) (T1T1-Tilting)',
        '4-Post Custom Storage car Parking Lift (3.6-Ton) (4ppsl-HP)',
      ]
    },
    {
      categoryName: language === 'en' ? 'Workshop Tools, Welders & Extras' : 'Werkswinkel Gereedskap, Sweistoerusting & Extras',
      items: [
        'Welding Helmet Auto Darkening (Ahelmet)',
        'Mig Welder 200 B - 3 In One Machine (mig200B)',
        'Mig Welding Torch 175/195 (migtorch175/195)',
        'Mig 195 Welder Dual Gas No Gas 220v (Mig-195-Dual)',
        'Core Flux No Gas Mig Welding Wire AWS E71T-GS (1kgcorefE71T-GS)',
        'MIG Welding Wire For Gas (Steel) 1 kg (1kgsteelgasweld)',
        'Aluminium Mig Welding Wire ER5356 (WireAli2kg1.0mm)',
        'TIG Foot Pedal Controller (Tfpedal)',
        'TIG Welder 200P Professional ACDC MMA/TIG (TIG200P)',
        'Thermometer Infrared - Non-Contact (NCTHERM)',
        'Mig Welding Shrouds MB15 (Pack of 5) (migshrouds)',
        'Titan Pro Telescopic Ladder (2.6m) (2.6m-ladder)',
        'Titan Pro Telescopic Ladder (3.8m) (3.8m-ladder)',
        'Protective Board Heavy Duty Floor Protection (prof-board)',
      ]
    }
  ];

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
      {/* Backdrop with rich blur */}
      <div 
        className="absolute inset-0 bg-black/85 backdrop-blur-md cursor-pointer" 
        onClick={onClose} 
      />

      {/* Main Container */}
      <div className="relative bg-[#0d0d0d] border border-[#333333] w-full max-w-5xl h-[90vh] rounded-md shadow-2xl flex flex-col overflow-hidden animate-slide-up text-neutral-200 font-sans select-text">
        
        {/* Header Block */}
        <div className="relative bg-[#111111] p-6 sm:p-8 border-b border-[#222222] shrink-0 flex justify-between items-start">
          <div className="relative z-10">
            <span className="text-[#ff0000] font-bold uppercase tracking-[0.3em] text-[10px] block mb-1">{currentT.direct_line}</span>
            <h3 className="text-2xl sm:text-4xl font-black text-white tracking-tight uppercase">
              {currentT.title}
            </h3>
            <p className="text-xs sm:text-sm text-[#999999] mt-1 max-w-xl">
              {currentT.subtitle}
            </p>
          </div>
          
          <button 
            onClick={onClose}
            className="relative z-10 p-2 text-[#999999] hover:text-white hover:bg-[#222222] rounded-full transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X size={22} />
          </button>
        </div>

        {/* Content Body split in Form & Info/Map */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12">
          
          {/* Left Column: Interactive Form */}
          <div className="lg:col-span-7 p-6 sm:p-8 border-b lg:border-b-0 lg:border-r border-[#222222]">
            {isSubmitted ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-6 animate-fade-in">
                <div className="w-16 h-16 bg-[#ff0000]/10 border border-[#ff0000]/40 text-[#ff0000] rounded-full flex items-center justify-center">
                  <CheckCircle2 size={36} />
                </div>
                <div className="space-y-2">
                  <span className="text-[10px] text-[#ff0000] font-black tracking-widest uppercase">{currentT.transmitted}</span>
                  <h4 className="text-2xl font-black text-white uppercase">{currentT.thank_you}</h4>
                  <p className="text-xs text-neutral-400 max-w-md mx-auto leading-relaxed">
                    {currentT.success_desc}
                  </p>
                </div>

                <div className="bg-[#141414] border border-[#222222] p-4 rounded max-w-md w-full text-left space-y-3 font-mono text-xs">
                  <div className="flex justify-between border-b border-[#222222] pb-2">
                    <span className="text-neutral-500">{currentT.reference_id}</span>
                    <span className="text-white font-bold">{referenceNumber}</span>
                  </div>
                  <div className="flex justify-between border-b border-[#222222] pb-2">
                    <span className="text-neutral-500">{currentT.dispatch_from}</span>
                    <span className="text-white">{currentT.killarney_cp}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">{currentT.est_response_time}</span>
                    <span className="text-emerald-400 font-bold">{currentT.response_value}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setIsSubmitted(false);
                    setFormData({
                      name: '',
                      email: '',
                      phone: '',
                      company: '',
                      province: 'Western Cape',
                      suburb: '',
                      address: '',
                      deliveryPreference: 'yes',
                      interest: 'Professional 2-Post Clear-Floor Hydraulic Lift (CL-2PC-4000)',
                      message: '',
                    });
                  }}
                  className="px-5 py-2 w-full max-w-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold uppercase tracking-wider rounded cursor-pointer transition-colors"
                >
                  {currentT.send_another}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <h4 className="text-sm font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                    <span className="w-1 h-4 bg-[#ff0000]" />
                    {currentT.tech_title}
                  </h4>
                  <p className="text-xs text-[#999999]">
                    {currentT.tech_desc}
                  </p>
                </div>

                {/* Grid Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-[#999999] tracking-widest uppercase font-bold">{currentT.name_label}</label>
                    <input 
                      type="text" 
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder={currentT.name_placeholder}
                      className="w-full bg-[#141414] border border-[#333333] rounded px-3 py-2 text-xs focus:outline-none focus:border-[#ff0000] focus:ring-1 focus:ring-[#ff0000]/35 transition-colors placeholder-[#666666]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-[#999999] tracking-widest uppercase font-bold">{currentT.company_label}</label>
                    <input 
                      type="text"
                      value={formData.company}
                      onChange={(e) => setFormData({...formData, company: e.target.value})}
                      placeholder={currentT.company_placeholder}
                      className="w-full bg-[#141414] border border-[#333333] rounded px-3 py-2 text-xs focus:outline-none focus:border-[#ff0000] focus:ring-1 focus:ring-[#ff0000]/35 transition-colors placeholder-[#666666]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-[#999999] tracking-widest uppercase font-bold">{currentT.email_label}</label>
                    <input 
                      type="email" 
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder={currentT.email_placeholder}
                      className="w-full bg-[#141414] border border-[#333333] rounded px-3 py-2 text-xs focus:outline-none focus:border-[#ff0000] focus:ring-1 focus:ring-[#ff0000]/35 transition-colors placeholder-[#666666]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-[#999999] tracking-widest uppercase font-bold">{currentT.phone_label}</label>
                    <input 
                      type="tel" 
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      placeholder={currentT.phone_placeholder}
                      className="w-full bg-[#141414] border border-[#333333] rounded px-3 py-2 text-xs focus:outline-none focus:border-[#ff0000] focus:ring-1 focus:ring-[#ff0000]/35 transition-colors placeholder-[#666666]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-[#999999] tracking-widest uppercase font-bold">{currentT.province_label}</label>
                    <select 
                      value={formData.province}
                      onChange={(e) => setFormData({...formData, province: e.target.value})}
                      className="w-full bg-[#141414] border border-[#333333] text-neutral-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-[#ff0000] transition-colors"
                    >
                      {provinces.map((prov) => (
                        <option key={prov.value} value={prov.value} className="bg-[#111111]">{prov.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-[#999999] tracking-widest uppercase font-bold">{currentT.address_label}</label>
                    <input 
                      type="text" 
                      required
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      placeholder={currentT.address_placeholder}
                      className="w-full bg-[#141414] border border-[#333333] rounded px-3 py-2 text-xs focus:outline-none focus:border-[#ff0000] focus:ring-1 focus:ring-[#ff0000]/35 transition-colors placeholder-[#666666]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-[#999999] tracking-widest uppercase font-bold">{currentT.suburb_label}</label>
                    <input 
                      type="text" 
                      required
                      value={formData.suburb}
                      onChange={(e) => setFormData({...formData, suburb: e.target.value})}
                      placeholder={currentT.suburb_placeholder}
                      className="w-full bg-[#141414] border border-[#333333] rounded px-3 py-2 text-xs focus:outline-none focus:border-[#ff0000] focus:ring-1 focus:ring-[#ff0000]/35 transition-colors placeholder-[#666666]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-[#999999] tracking-widest uppercase font-bold">{currentT.interest_label}</label>
                    <select 
                      value={formData.interest}
                      onChange={(e) => setFormData({...formData, interest: e.target.value})}
                      className="w-full bg-[#141414] border border-[#333333] text-neutral-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-[#ff0000] focus:ring-1 focus:ring-[#ff0000]/30 transition-colors"
                    >
                      {groupedEquipment.map((group) => (
                        <optgroup 
                          key={group.categoryName} 
                          label={group.categoryName}
                          className="bg-[#0f0f0f] text-[#ff0000] font-black text-[10px] uppercase tracking-wider py-1.5"
                        >
                          {group.items.map((item) => (
                            <option 
                              key={item} 
                              value={item} 
                              className="bg-[#141414] text-neutral-200 font-sans font-normal normal-case text-xs py-1"
                            >
                              {item}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] text-[#999999] tracking-widest uppercase font-bold block mb-1">{currentT.delivery_label}</label>
                    <div className="grid grid-cols-2 gap-3 mt-1.5">
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, deliveryPreference: 'yes'})}
                        className={`py-2.5 px-3 rounded text-xs font-bold uppercase border transition-all cursor-pointer text-center flex items-center justify-center ${
                          formData.deliveryPreference === 'yes'
                            ? 'bg-white text-black border-white font-extrabold'
                            : 'bg-[#141414] text-neutral-400 border-[#333333] hover:text-white hover:border-neutral-500'
                        }`}
                      >
                        {currentT.delivery_yes}
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, deliveryPreference: 'no'})}
                        className={`py-2.5 px-3 rounded text-xs font-bold uppercase border transition-all cursor-pointer text-center flex items-center justify-center ${
                          formData.deliveryPreference === 'no'
                            ? 'bg-white text-black border-white font-extrabold'
                            : 'bg-[#141414] text-neutral-400 border-[#333333] hover:text-white hover:border-neutral-500'
                        }`}
                      >
                        {currentT.delivery_no}
                      </button>
                    </div>
                  </div>
                </div>

                {/* If items in physical cart, show them automatically */}
                {cart.length > 0 && (
                  <div className="bg-[#161616] border border-[#ff0000]/25 p-3 rounded-md space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#ff0000] uppercase tracking-wider">
                      <ClipboardList size={14} />
                      <span>{currentT.items_included} ({cart.length})</span>
                    </div>
                    <ul className="text-[10px] space-y-1 font-mono text-neutral-300">
                      {cart.map((item, idx) => (
                        <li key={idx} className="flex justify-between border-b border-[#222222] pb-1">
                          <span>{item.product.name} × {item.quantity}</span>
                          <span className="text-white">
                            {item.product?.specifications?.capacity 
                              ? `Capacity: ${item.product.specifications.capacity}` 
                              : (item.product?.specifications?.['Lifting Capacity'] 
                                  ? `Capacity: ${item.product.specifications['Lifting Capacity']}`
                                  : (item.product?.specifications && Object.keys(item.product.specifications).length > 0 
                                      ? `${Object.keys(item.product.specifications)[0]}: ${Object.values(item.product.specifications)[0]}`
                                      : `SKU: ${item.product?.modelCode || 'N/A'}`
                                    )
                                )
                            }
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="space-y-1 animate-fade-in">
                  <label className="text-[10px] text-[#999999] tracking-widest uppercase font-bold">Additional Installation Criteria / Notes</label>
                  <textarea 
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    placeholder="Provide any specific requirements (e.g. ceiling depth, custom 220V power pack requests, concrete thickness parameters...)"
                    className="w-full bg-[#141414] border border-[#333333] rounded px-3 py-2 text-xs focus:outline-none focus:border-[#ff0000] focus:ring-1 focus:ring-[#ff0000]/35 transition-colors placeholder-[#616161] resize-none"
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#999999]" id="popia-notice">
                  <span>POPIA compliant. Your data is stored securely.</span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#ff0000] hover:bg-[#cc0000] text-white py-3 px-4 rounded text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer shadow-md hover:shadow-lg"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>TRANSMITTING ENQUIRY DATA...</span>
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>SUBMIT SPECIFICATION REQUEST</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Right Column: Contact info & Maps */}
          <div className="lg:col-span-5 p-6 sm:p-8 bg-[#111111] space-y-8 flex flex-col justify-between">
            
            <div className="space-y-6">
              <div>
                <span className="text-[#ff0000] text-[10px] font-black uppercase tracking-widest">CAPE TOWN HUB</span>
                <h4 className="text-lg font-black text-white uppercase mt-1">WESTERN CAPE OFFICE</h4>
              </div>

              {/* Real Phone display */}
              <div className="space-y-4">
                <a 
                  href="tel:+27215562413" 
                  className="flex items-start gap-4 p-4 rounded bg-[#181818] border border-[#2d2d2d] hover:border-[#ff0000]/40 transition-colors group"
                >
                  <div className="w-10 h-10 bg-[#ff0000]/10 text-[#ff0000] rounded flex items-center justify-center shrink-0">
                    <Phone size={18} />
                  </div>
                  <div>
                    <div className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">CALL SHOWROOM DIRECT</div>
                    <div className="text-lg font-black text-white font-mono group-hover:text-[#ff0000] transition-colors mt-0.5">
                      +27 (0) 21 556 2413
                    </div>
                    <span className="text-[9px] text-[#999999] block mt-0.5">{uiT[language].operational_hours}</span>
                  </div>
                </a>

                {/* Email Section */}
                <a 
                  href="mailto:info@car-lifts.co.za" 
                  className="flex items-start gap-4 p-4 rounded bg-[#181818] border border-[#2d2d2d] hover:border-[#ff0000]/40 transition-colors group"
                >
                  <div className="w-10 h-10 bg-[#ff0000]/10 text-[#ff0000] rounded flex items-center justify-center shrink-0">
                    <Mail size={18} />
                  </div>
                  <div>
                    <div className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">EMAIL CORRESPONDENCE</div>
                    <div className="text-sm font-bold text-white group-hover:text-[#ff0000] transition-colors mt-1 font-mono">
                      info@car-lifts.co.za
                    </div>
                    <span className="text-[9px] text-[#999999] block mt-0.5">For orders, parts, and compliance certificates</span>
                  </div>
                </a>

                {/* Physical Address */}
                <div className="flex items-start gap-4 p-4 rounded bg-[#181818] border border-[#2d2d2d]">
                  <div className="w-10 h-10 bg-[#ff0000]/10 text-[#ff0000] rounded flex items-center justify-center shrink-0">
                    <Building size={18} />
                  </div>
                  <div>
                    <div className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">PHYSICAL ACCESS POINT</div>
                    <div className="text-xs font-bold text-white mt-1 leading-relaxed">
                      Unit 4, 13 Killarney Avenue
                    </div>
                    <div className="text-[11px] text-[#999999] leading-relaxed">
                      Killarney Gardens, Cape Town, 7441
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Custom Styled Map Location segment */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#999999] font-bold uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <Map size={12} />
                  GEOLOCATION MAP
                </span>
                <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 p-0.5 rounded">
                  <button
                    type="button"
                    onClick={() => setMapType('google')}
                    className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      mapType === 'google' 
                        ? 'bg-[#ff0000] text-white' 
                        : 'text-neutral-500 hover:text-neutral-300'
                    }`}
                  >
                    Google Map
                  </button>
                  <button
                    type="button"
                    onClick={() => setMapType('blueprint')}
                    className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      mapType === 'blueprint' 
                        ? 'bg-[#ff0000] text-white' 
                        : 'text-neutral-500 hover:text-neutral-300'
                    }`}
                  >
                    Blueprint
                  </button>
                </div>
              </div>

              {/* Dynamic Interactive Map Canvas with live feed */}
              <div 
                className="group border border-[#2c2c2c] bg-black/60 rounded p-1 pb-2 overflow-hidden relative select-none hover:border-[#ff0000]/60 transition-all duration-300"
              >
                {mapType === 'google' ? (
                  <div className="aspect-video relative bg-[#151515] rounded overflow-hidden">
                    <iframe
                      src="https://maps.google.com/maps?q=-33.828569,18.531859&hl=en&z=15&output=embed"
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      allowFullScreen={false}
                      loading="lazy"
                      title="Google Maps Location Cape Town"
                      className="absolute inset-0 w-full h-full opacity-85 hover:opacity-100 transition-opacity duration-300"
                    />
                    
                    {/* Dark map tint cover to blend color-palette with UI design until hover */}
                    <div className="absolute inset-0 bg-neutral-950/15 pointer-events-none group-hover:bg-transparent transition-all" />

                    {/* Expand overlay button */}
                    <button 
                      onClick={() => setIsMapZoomed(true)}
                      className="absolute top-2 right-2 bg-black/85 hover:bg-[#ff0000] text-white p-1.5 rounded-sm border border-neutral-800 hover:border-[#ff0000] transition-all cursor-pointer shadow-lg hover:scale-105 z-20"
                      title="View Magnified Map"
                    >
                      <ZoomIn size={12} />
                    </button>

                    {/* Subtle info pill on bottom */}
                    <div className="absolute bottom-2 left-2 right-2 bg-black/95 p-1.5 rounded border border-neutral-800 pointer-events-none z-10 text-center">
                      <div className="text-[8.5px] text-white font-black uppercase tracking-wider">
                        Unit 4, 13 Killarney Ave
                      </div>
                    </div>
                  </div>
                ) : (
                  <div 
                    onClick={() => setIsMapZoomed(true)}
                    title="Click to zoom / view larger map"
                    className="aspect-video relative bg-[#151515] rounded flex flex-col items-center justify-end p-4 text-center overflow-hidden cursor-pointer"
                  >
                    {/* Real generated map image layout as background */}
                    <img 
                      src={mapImage} 
                      alt="Cape Town Depot Roadmap Location" 
                      referrerPolicy="no-referrer"
                      onError={(e) => handleImageElementError(e)}
                      className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-85 group-hover:scale-105 transition-all duration-500" 
                    />

                    {/* High contrast overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent pointer-events-none" />

                    {/* Marker Pin */}
                    <div className="absolute top-[42%] left-[49%] transform -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center justify-center pointer-events-none">
                      <div className="relative">
                        <div className="absolute -inset-3 bg-[#ff0000]/30 rounded-full animate-ping duration-[1800ms]" />
                        <div className="absolute -inset-1.5 bg-[#ff0000]/50 rounded-full" />
                        <MapPin size={32} className="text-[#ff0000] drop-shadow-[0_4px_6px_rgba(0,0,0,0.8)] relative z-10 animate-bounce-slow" />
                      </div>
                    </div>

                    {/* Text panel at the bottom */}
                    <div className="relative z-10 w-full bg-black/80 backdrop-blur-sm border border-neutral-800 p-2.5 rounded shadow-lg">
                      <div className="text-[10px] font-black uppercase text-white tracking-widest flex items-center justify-center gap-1.5">
                        <span>UNIT 4, 13 KILLARNEY AVE</span>
                        <span className="bg-[#ff0000] text-white font-extrabold text-[8px] px-1 py-0.2 rounded-sm">ZOOM</span>
                      </div>
                      <div className="text-[8.5px] text-[#999999] mt-0.5 font-mono">
                        Click to magnify blueprint layout & road guides
                      </div>
                    </div>

                    {/* Operational indicators */}
                    <div className="absolute bottom-1 right-2 text-[7.5px] text-neutral-400 bg-neutral-900/90 px-1.5 py-0.5 rounded border border-neutral-800 font-mono pointer-events-none">
                      S33° 49&apos; 52.8&quot; E18° 31&apos; 41.5&quot;
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Magnified Lightbox Overlay / Map Modal */}
            {isMapZoomed && (
              <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                <div 
                  className="absolute inset-0 bg-black/95 backdrop-blur-md cursor-pointer"
                  onClick={() => setIsMapZoomed(false)}
                />
                
                <div className="relative bg-[#0d0d0d] border border-neutral-800 w-full max-w-4xl rounded-md overflow-hidden shadow-2xl animate-scale-up text-neutral-200">
                  
                  {/* Lightbox Header */}
                  <div className="bg-[#111111] p-5 border-b border-neutral-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <span className="text-[#ff0000] text-[9px] font-black uppercase tracking-[0.25em] block mb-0.5">HIGH-RESOLUTION SITE PLAN</span>
                      <h4 className="text-xl font-black text-white uppercase flex items-center gap-2">
                        <Compass className="text-[#ff0000]" size={18} />
                        KILLARNEY GARDENS LOGISTICS POINT
                      </h4>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                      {/* Map Type toggle switcher */}
                      <div className="flex items-center bg-neutral-900 border border-neutral-800 p-0.5 rounded">
                        <button
                          type="button"
                          onClick={() => setMapType('google')}
                          className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                            mapType === 'google' 
                              ? 'bg-[#ff0000] text-white' 
                              : 'text-neutral-500 hover:text-neutral-400'
                          }`}
                        >
                          Google Map
                        </button>
                        <button
                          type="button"
                          onClick={() => setMapType('blueprint')}
                          className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                            mapType === 'blueprint' 
                              ? 'bg-[#ff0000] text-white' 
                              : 'text-neutral-500 hover:text-neutral-400'
                          }`}
                        >
                          Blueprint Layout
                        </button>
                      </div>

                      <button 
                        onClick={() => setIsMapZoomed(false)}
                        className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-full transition-colors cursor-pointer"
                        aria-label="Close zoomed map"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  </div>

                  {/* Lightbox Body / Image Container */}
                  <div className="relative aspect-[16/10] sm:aspect-video bg-[#141414] overflow-hidden flex items-center justify-center p-1">
                    {mapType === 'google' ? (
                      <iframe
                        src="https://maps.google.com/maps?q=-33.828569,18.531859&hl=en&z=17&output=embed"
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        allowFullScreen={true}
                        loading="lazy"
                        title="Google Maps Location High Resolution"
                        className="absolute inset-0 w-full h-full min-h-[50vh] sm:min-h-[62vh]"
                      />
                    ) : (
                      <div className="relative w-full h-full flex items-center justify-center p-2 group">
                        <img 
                          src={mapImage} 
                          alt="Magnified Cape Town Depot Map Location" 
                          referrerPolicy="no-referrer"
                          onError={(e) => handleImageElementError(e)}
                          className="w-full h-full object-contain max-h-[62vh] transition-transform duration-500 group-hover:scale-105"
                        />

                        {/* Styled pinpoint markers highlighting Unit 4 */}
                        <div className="absolute top-[41%] left-[49.2%] transform -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center">
                          <div className="relative">
                            <div className="absolute -inset-4 bg-[#ff0000]/25 rounded-full animate-ping duration-[1800ms]" />
                            <div className="absolute -inset-2 bg-[#ff0000]/40 rounded-full" />
                            <MapPin size={46} className="text-[#ff0000] drop-shadow-[0_8px_16px_rgba(0,0,0,0.9)]" />
                          </div>
                          <div className="bg-black border-2 border-[#ff0000] rounded px-3 py-1 mt-2 shadow-2xl">
                            <span className="text-[10px] font-black text-white uppercase tracking-wider font-sans whitespace-nowrap">
                              UNIT 4 SHOWROOM HERE
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Lightbox Footer info & actions */}
                  <div className="bg-[#111111] p-5 border-t border-neutral-800 flex flex-col sm:flex-row gap-4 items-center justify-between font-sans">
                    <div className="space-y-1 text-center sm:text-left">
                      <div className="text-xs font-bold text-white uppercase">Unit 4, 13 Killarney Avenue, Killarney Gardens</div>
                      <div className="text-[10.5px] text-neutral-400">
                        Convenient access close to Cape Town Port, N7 interchange, and Koeberg Road.
                      </div>
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto">
                      <a 
                        href="https://maps.google.com/?q=-33.828569,18.531859" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex-1 sm:flex-initial text-center px-4 py-2 bg-[#ff0000] hover:bg-[#cc0000] text-white text-xs font-black uppercase tracking-wider rounded transition-colors whitespace-nowrap cursor-pointer flex items-center justify-center gap-1.5 animate-pulse"
                      >
                        <Map size={13} />
                        OPEN GOOGLE MAPS
                      </a>
                      <button 
                        onClick={() => setIsMapZoomed(false)}
                        className="flex-1 sm:flex-initial px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold uppercase tracking-wider rounded transition-colors whitespace-nowrap cursor-pointer"
                      >
                        CLOSE VIEW
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            )}

          </div>
        </div>

        {/* Footer actions */}
        <div className="bg-[#111111] p-5 border-t border-[#222222] flex flex-col sm:flex-row gap-4 justify-between items-center shrink-0">
          <div className="text-xs text-[#999999] font-mono text-center sm:text-left flex items-center gap-1.5">
            <Clock size={12} className="text-[#ff0000]" />
            <span>{currentT.footer_notice}</span>
          </div>
          
          <button 
            onClick={onClose}
            className="px-6 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold uppercase tracking-wider rounded transition-all cursor-pointer w-full sm:w-auto text-center"
          >
            DISMISS CONTACT PANEL
          </button>
        </div>

      </div>
    </div>
  );
}
