import React, { useState } from 'react';
import { X, Search, HelpCircle, ChevronDown, ChevronUp, Sliders, Warehouse, Hammer, ShieldCheck, Mail, Compass } from 'lucide-react';

interface FaqModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenContact: () => void;
  language?: 'en' | 'af';
}

interface FaqItem {
  id: string;
  category: 'spray-booth' | 'car-lift' | 'parking' | 'welding';
  question: { en: string; af: string };
  answer: { en: string; af: string };
  keywords: string[];
}

const uiT = {
  en: {
    tech_support: "TECHNICAL SUPPORT SYSTEM",
    title: "Equipment FAQ & Guides",
    search_placeholder: "Search specifications / keywords...",
    no_results: "No matching technical guides or equipment questions found.",
    clear_filters: "Clear Filters",
    related_specs: "Related specs:",
    compliance_catalogs: "Need full technical compliance catalogs? Get direct Cape Town depot assistance.",
    submit_enquiry: "SUBMIT ENQUIRY",
    close: "CLOSE"
  },
  af: {
    tech_support: "TEGNIESE ONDERSTEUNINGSTELSEL",
    title: "Toerusting VGV & Gidse",
    search_placeholder: "Soek spesifikasies / sleutelwoorde...",
    no_results: "Geen bypassende tegniese gidse of toerustingvrae gevind nie.",
    clear_filters: "Herstel Filters",
    related_specs: "Verwante spesifikasies:",
    compliance_catalogs: "Benodig u volledige tegniese katalogusse? Kry direkte Kaapstad-depotbystand.",
    submit_enquiry: "STUUR NAVRAAG",
    close: "SLUIT"
  }
};

export default function FaqModal({ isOpen, onClose, onOpenContact, language = 'en' }: FaqModalProps) {
  const [activeCategory, setActiveCategory] = useState<'all' | 'spray-booth' | 'car-lift' | 'parking' | 'welding'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentT = uiT[language];

  const faqCategories = [
    { id: 'all', label: language === 'en' ? 'All Questions' : 'Alle Vrae', icon: <HelpCircle size={14} /> },
    { id: 'spray-booth', label: language === 'en' ? 'Spray Booths' : 'Spuitkaste', icon: <Warehouse size={14} /> },
    { id: 'car-lift', label: language === 'en' ? 'Car Lifts' : 'Motorlifte', icon: <Sliders size={14} /> },
    { id: 'parking', label: language === 'en' ? 'Parking Storage' : 'Parkeerstelsels', icon: <Compass size={14} /> },
    { id: 'welding', label: language === 'en' ? 'Welding & Tools' : 'Sweistoerusting', icon: <Hammer size={14} /> },
  ];

  const faqs: FaqItem[] = [
    // 1. Spray Booths FAQ
    {
      id: 'booth-types',
      category: 'spray-booth',
      question: {
        en: 'What are the main differences between Down-Draft, Semi-Down Draft, and Rear-Extraction spray booths?',
        af: 'Wat is die belangrikste verskille tussen Down-Draft, Semi-Down Draft en Rear-Extraction spuitkaste?'
      },
      answer: {
        en: 'Full Down-Draft booths (such as the Pro-Series SB-DD-7000 and SB2-Pro) extract air vertically down through a completely gridded floor, delivering the ultra-cleanest uniform laminar airflow and perfect paint finishes. However, they require either concrete pit excavation or an elevated metal basement. Semi-Down Draft booths (like the Apex SB-SDD-6800) pull fresh air from the ceiling plenum and extract it through the rear-bottom plenum, eliminating pit excavation. Rear Wall Extraction booths (like the SB1 Budget Workshop SB1-Triton) are highly space-saving, drawing air backwards through the cabin, making them affordable options for general repair shops.',
        af: 'Volledige Down-Draft spuitkaste (soos die Pro-Series SB-DD-7000 en SB2-Pro) trek lug vertikaal af deur \'n volledige rooster-vloer, wat die skoonste eenvormige laminêre lugvloei en perfekte verfafwerkings lewer. Hulle vereis egter óf sementput-uitgrawings óf \'n verhoogde metaalkelder. Semi-Down Draft-kaste (soos die Apex SB-SDD-6800) trek vars lug uit die plafonruimte en trek dit deur die agter-onderste plenum uit, wat putuitgrawings uitskakel. Agtermuur-ekstraksiekaste (soos die SB1 Begroting-werkswinkel SB1-Triton) is baie spasiebesparend en trek lug agtertoe deur die kajuit, wat dit bekostigbare opsies vir algemene herstelwinkels maak.'
      },
      keywords: ['downdraft', 'semi-down', 'semidown', 'extraction', 'pit', 'grid', 'airflow', 'ventilation', 'pit', 'triton', 'sdd', 'sb1', 'sb2'],
    },
    {
      id: 'booth-heating',
      category: 'spray-booth',
      question: {
        en: 'How do the heating and baking cycles work in custom booths SB2-Pro and SB-DD-7000?',
        af: 'Hoe werk die verhitting- en bak-siklusse in pasgemaakte spuitkaste SB2-Pro en SB-DD-7000?'
      },
      answer: {
        en: 'Our professional heated spray booths are equipped with premium Italian Riello Diesel Burners (G10 option with 180,000 Kcal/h or G20 models). When baking mode is engaged via the automatic control cabinet, the airflow damper switches electrically to recycle 90% of the heated air stream. This retains internal heat up to 80°C while dramatically reducing diesel fuel usage. High-efficiency EPS tongue-and-groove insulated side walls prevent thermal leakage.',
        af: 'Ons professionele verhitte spuitkaste is toegerus met premium Italiaanse Riello Diesel-branders (G10-opsie met 180 000 Kcal/h of G20-modelle). Wanneer die bak-modus via die outomatiese beheerkas geaktiveer word, skakel die lugvloeiklep elektries om 90% van die verhitte lugstroom te hersirkuleer. Dit behou interne hitte tot 80°C terwyl dit dieselverbruik dramaties verminder. Hoëprestasie EPS-isolasie-mure voorkom hitteverlies.'
      },
      keywords: ['heating', 'burner', 'riello', 'diesel', 'baking', 'dryer', 'bake', 'temperature', 'g20', 'g10', 'cabinet', 'control'],
    },
    {
      id: 'booth-film',
      category: 'spray-booth',
      question: {
        en: 'How do I clean and maintain the booth cabinet walls easily without heavy scrubbing?',
        af: 'Hoe maak ek die spuitkas se mure maklik skoon en onderhou dit sonder strawwe skropwerk?'
      },
      answer: {
        en: 'We highly recommend our Spray Booth Protective Lining Film (Model TF1225mm). This is a 1225mm wide × 500 Meters long roll of 40 microns heavy-duty static-cling transparent film with styled styrene-free adhesive backing. It acts as a shield to catch overspray and wet paint mist. When contaminated, you simply peel off the sheet in sections and roll on clean film. This entirely eliminates the need for harsh stripping solvents.',
        af: 'Ons beveel ons Spuitkas Beskermende Voering-film (Model TF1225mm) ten sterkste aan. Dit is \'n 1225mm wye × 500 meter lange rol van 40 mikron swaardiens statiese deursigtige film met \'n kleeflaag sonder stireen. Dit dien as beskerming om oorverf en nat verfmis op te vang. Wanneer dit vuil is, trek jy bloot die vel in dele af en rol nuwe film op. Dit skakel die behoefte aan harde oplosmiddels heeltemal uit.'
      },
      keywords: ['film', 'coating', 'lining', 'overspray', 'dirty', 'maintenance', 'peelable', 'clean', 'scrubbing', 'tf1225mm'],
    },

    // 2. Car Lifts FAQ
    {
      id: 'lift-voltage',
      category: 'car-lift',
      question: {
        en: 'Do your hydraulic car lifts require a 380V Three-Phase or 220V Single-Phase electrical connection?',
        af: 'Vereis u hidrouliese motorlifte \'n 380V Driefase- of 220V Enkelfase-elektriese verbinding?'
      },
      answer: {
        en: 'Standard heavy commercial units like the Professional 4.0-Ton Clear-Floor Lift (CL-2PC-4000) are fitted with heavy-duty motors optimized for a 380V Three-Phase supply, allowing quick 45-50 second lift cycles. However, for residential garages or lighter environments, we can pre-configure nearly all models with a 220V Single-Phase motor pack at the point of ordering. Please make sure to check your local supply breaker capacity before installation.',
        af: 'Standaard swaar kommersiële eenhede soos die Professional 4.0-Ton Clear-Floor Lift (CL-2PC-4000) is toegerus met swaardiens-motors wat geoptimaliseer is vir \'n 380V Driefase-toevoer, wat vinnige 45-50 sekonde ligsiklusse moontlik maak. Vir residensiële motorhuise of ligter omgewings kan ons egter byna alle modelle met \'n 220V Enkelfase-motor konfigureer tydens bestelling. Kontroleer asseblief u plaaslike stroombreker-kapasiteit voor installasie.'
      },
      keywords: ['voltage', '380v', '220v', 'three-phase', 'three phase', 'single phase', 'single-phase', 'power', 'electricity', 'motor', 'cl-2pc-4000', 'cl2pc'],
    },
    {
      id: 'lift-height',
      category: 'car-lift',
      question: {
        en: 'When should I choose a Clear-Floor (CL-2PC-4000) over a floor Baseplate (CL-2PB-4200) lift?',
        af: 'Wanneer moet ek \'n Clear-Floor (CL-2PC-4000) bo \'n vloer-Baseplate (CL-2PB-4200) hyser kies?'
      },
      answer: {
        en: 'The choice depends on your workshop ceiling height. If your ceiling height is 3.8m or higher, choose the Clear-Floor CL-2PC-4000 (overall column height is 3750 mm). This design leaves the floor entirely flat and unobstructed, allowing you to freely roll oil drains, transmission jacks, or toolchests underneath. If your ceiling has height restrictions (sub-3.0m), the Baseplate CL-2PB-4200 is ideal. Columns are only 2820 mm tall, and the steel cables and hydraulic hoses run safely across the bottom under a low-profile drive-over plate.',
        af: 'Die keuse hang af van u werkswinkel se plafonhoogte. As u plafonhoogte 3.8m of hoër is, kies die Clear-Floor CL-2PC-4000 (totale kolomhoogte is 3750 mm). Hierdie ontwerp laat die vloer heeltemal plat en onbelemmerd, sodat u vrylik olie-dreineerders, ratkas-domkragte of gereedskapskiste daaronder kan rol. As u plafon hoogtebeperkings het (onder 3.0m), is die Baseplate CL-2PB-4200 ideaal. Kolomme is slegs 2820 mm hoog, en die staalkabels en hidrouliese pype loop veilig langs die onderkant onder \'n lae-profiel ry-oor-plaat.'
      },
      keywords: ['clearfloor', 'clear-floor', 'baseplate', 'height', 'ceiling', 'column', 'restriction', 'clearance', 'cl-2pc-4000', 'cl-2pb-4200'],
    },
    {
      id: 'lift-safety',
      category: 'car-lift',
      question: {
        en: 'Are there automatic safety locking mechanisms on the hydraulic columns?',
        af: 'Is daar outomatiese veiligheidssluit-meganismes op die hidrouliese kolomme?'
      },
      answer: {
        en: 'Yes, absolutely. All our lifts include dual active hydraulic cylinders coupled with aerospace-grade steel synchronization wires (9.3mm on the CL-2PB-4200). Heavy-duty mechanical safety hook latches lock securely inside the steel column ladders as the carriage ascends. They require a manual pull-cord on each column (or pneumatic release on selected 4-post models) to clear and lower the vehicle safely, preventing any unplanned descent.',
        af: 'Ja, absoluut. Al ons hysers sluit dubbele aktiewe hidrouliese silinders in, gekoppel aan lugvaart-graad staal sinchronisasiedrade (9.3mm op die CL-2PB-4200). Swaardiens meganiese veiligheidshakies sluit veilig in die staalkolom lere as die wa opstyg. Hulle benodig \'n handmatige trekkoord op elke kolom (of pneumatiese vrystelling op geselekteerde 4-kolom modelle) om die voertuig veilig te laat sak, wat enige onbeplande daling voorkom.'
      },
      keywords: ['safety', 'lock', 'cylinder', 'cables', 'equalization', 'drops', 'hazard', 'accidents', 'failsafe'],
    },

    // 3. Parking Storage FAQ
    {
      id: 'parking-tilting',
      category: 'parking',
      question: {
        en: 'How does the Tilting Parking Lift work in low-ceiling garages?',
        af: 'Hoe werk die kantelende parkeerhyser in lae-plafon motorhuise?'
      },
      answer: {
        en: 'The 2-Post Tilting Storage Lift (T1T1-Tilting) is specifically engineered for residential garages with strict, low-clearance 3.0-meter ceilings. By tilting the elevated top platform containing a sedan, the vehicle nests neatly beneath the roof rafters. An integrated hydraulic parachute safety valve and double mechanical key-switch lock prevent accidental operation.',
        af: 'Die 2-Kolom Kantelende Parkeerhyser (T1T1-Tilting) is spesifiek ontwerp vir residensiële motorhuise met streng, lae-plafon beperkings van 3.0 meter. Deur die verhoogde boonste platform met \'n sedan te kantel, pas die voertuig netjies onder die dakbalke. \'n Geïntegreerde hidrouliese valskermveiligheidsklep en dubbele meganiese sleutelskakelaarslot verhoed ongewenste werking.'
      },
      keywords: ['tilting', 'tilt', 'ceiling', 'low', '3.0m', 'parking', 'storage', 'triton-tltl', 't1t1'],
    },
    {
      id: 'parking-share',
      category: 'parking',
      question: {
        en: 'Can I share columns on multiple parking lift installations to save cost?',
        af: 'Kan ek kolomme deel op verskeie parkeerhyserinstallasies om koste te bespaar?'
      },
      answer: {
        en: 'Yes. The 2-Post Vehicle Parking Storage Lift (2.7-Ton 2ppsl) is completely modular. You can easily order sharing-column configurations. By utilizing a single shared center pole, you save up to 30% on vertical frame cost and decrease the structural concrete floor anchorage space required in commercial bays.',
        af: 'Ja. Die 2-Kolom Voertuig Parkeerstooring hyser (2.7-Ton 2ppsl) is heeltemal modulêr. U kan maklik gedeelde kolom-konfigurasies bestel. Deur \'n enkele gedeelde middelpyp te gebruik, bespaar u tot 30% op vertikale raamkoste en verminder die strukturele beton-vloerankerruimte wat in kommersiële areas benodig word.'
      },
      keywords: ['share', 'column', 'modular', 'shared', 'parking', 'bay', 'cost', '2ppsl'],
    },

    // 4. Welding & Accessories FAQ
    {
      id: 'weld-3in1',
      category: 'welding',
      question: {
        en: 'What is the utility of a 3-in-1 MIG/MMA/TIG welder like the Mig 200 B?',
        af: 'Wat is die nut van \'n 3-in-1 MIG/MMA/TIG sweismasjien soos die Mig 200 B?'
      },
      answer: {
        en: 'The Mig Welder 200 B (model mig200B) utilizes synergic DC inverter technology to offer high-quality metal arc (MMA), gas/gasless MIG, and TIG welding in a single portable machine. This allows you to weld thin auto body panels, structural mild steel, or heavy farm locks from a single 220V wall socket. The synergic dial feed automatically pairs correct wire speed to matching current values for the operator.',
        af: 'Die Mig Welder 200 B (model mig200B) maak gebruik van sinergiese GS-omskakelaartegnologie om hoëgehalte metaalboog- (MMA), gas-/gaslose MIG- en TIG-sweiswerk in \'n enkele draagbare masjien te bied. Dit stel u in staat om dun motorbakpanele, strukturele sagtestaal of swaar plaasslotte vanaf \'n enkele 220V-muursok te sweis. Die sinergiese draadvoer pas outomaties die regte draadspoed by ooreenstemmende stroomwaardes vir die operateur.'
      },
      keywords: ['welder', 'mig200b', '3-in-1', 'gas', 'gasless', 'flux', 'mma', 'tig', 'synergic', 'wire'],
    },
    {
      id: 'weld-gas-flux',
      category: 'welding',
      question: {
        en: 'Do I need a shield gas cylinder to use your MIG welders?',
        af: 'Het ek \'n beskermingsgassilinder nodig om u MIG-sweismasjiene te gebruik?'
      },
      answer: {
        en: 'No, you do not need gas cylinders if you load self-shielded Core Flux Wire (AWS E71T-GS / model 1kgcorefE71T-GS). The flux inside the wire core vaporizes to create its own gas shielding bubble, making it excellent for outdoor welds and mobile locksmithing. However, if you are performing precision indoor fabrication on steel panels, you can load solid Steel gas wire (1kgsteelgasweld) and hook up Carbon Dioxide (CO2) or Argon/CO2 mixes for flat, splash-free fillets.',
        af: 'Nee, u het nie gassilinders nodig as u selfbeskermde Core Flux-draad (AWS E71T-GS / model 1kgcorefE71T-GS) laai nie. Die vloedmiddel in die draadkern verdamp om sy eie gasbeskermende borrel te skep, wat dit uitstekend maak vir buitesweiswerk en mobiele slotmakery. As u egter presisie-binnenshuise vervaardiging op staalpanele doen, kan u soliede staal-gasdraad (1kgsteelgasweld) laai en Koolstofdioksied (CO2) of Argon/CO2-mengsels koppel vir plat, spatselvrye sweislas.'
      },
      keywords: ['gas', 'cylinder', 'shielding', 'argon', 'co2', 'flux-wire', 'flux', 'gasless', 'e71t-gs', 'solid'],
    },
    {
      id: 'weld-aluminum',
      category: 'welding',
      question: {
        en: 'What equipment and settings are required to weld aluminum alloy professionally?',
        af: 'Watter toerusting en instellings word vereis om aluminiumlegering professioneel te sweis?'
      },
      answer: {
        en: 'Aluminum has extremely high thermal conductivity and a tough surface oxide layer. For MIG welding aluminum, you must load stiff ER5356 magnesium-alloy wire (model WireAli2kg1.0mm) along with 100% Pure Argon or Pure Helium shield gas. For TIG welding, you must use an AC-capable inverter like our Professional TIG 200P. The alternating current (AC) dynamic is vital to lift and break down the oxide barrier, while the High-Frequency (HF) arc starter ensures you strike clean welds without touching the tungsten.',
        af: 'Aluminium het uiterste hoë termiese geleidingsvermoë en \'n taai oppervlakoksiedlaag. Vir MIG-sweis van aluminium, moet u stywe ER5356 magnesium-legeringsdraad (model WireAli2kg1.0mm) saam met 100% suiwer Argon of suiwer Helium-beskermingsgas laai. Vir TIG-sweiswerk moet u \'n wisselstroom-geskikte (WS) omskakelaar soos ons Professional TIG 200P gebruik. Die wisselstroom-dinamika is noodsaaklik om die oksiedgrens op te lig en af te breek, terwyl die Hoë-Frekwensie (HF) boogstarter verseker dat u skoon sweislas tref sonder om die wolfram aan te raak.'
      },
      keywords: ['aluminum', 'aluminium', 'er5356', 'tig200p', 'pure argon', 'oxide', 'acdc', 'alternating', 'welding', 'helium'],
    }
  ];

  const handleToggle = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const filteredFaqs = faqs.filter(faq => {
    const questionText = faq.question[language].toLowerCase();
    const answerText = faq.answer[language].toLowerCase();
    const matchesCategory = activeCategory === 'all' || faq.category === activeCategory;
    const matchesSearch = searchQuery === '' || 
      questionText.includes(searchQuery.toLowerCase()) ||
      answerText.includes(searchQuery.toLowerCase()) ||
      faq.keywords.some(kw => kw.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm cursor-pointer"
        onClick={onClose}
      />

      {/* Main Container */}
      <div className="relative bg-[#0d0d0d] border border-neutral-800 w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] text-neutral-200 font-sans animate-scale-up">
        
        {/* Header styling */}
        <div className="bg-[#111111] p-6 border-b border-neutral-800 flex justify-between items-center bg-gradient-to-r from-[#111111] to-[#161616]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-neutral-900 border border-neutral-700 flex items-center justify-center text-[#ff0000]">
              <HelpCircle size={22} className="animate-pulse" />
            </div>
            <div>
              <span className="text-[#ff0000] text-[9px] font-black uppercase tracking-[0.25em] block mb-0.5">{currentT.tech_support}</span>
              <h3 className="text-xl font-black text-white uppercase tracking-tight">{currentT.title}</h3>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-full transition-colors cursor-pointer"
            aria-label="Close guides modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search & Topic Selector Bar */}
        <div className="bg-[#141414] border-b border-neutral-800 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Real-time search */}
          <div className="relative w-full md:max-w-xs shrink-0">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">
              <Search size={14} />
            </span>
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={currentT.search_placeholder}
              className="w-full bg-[#0d0d0d] border border-neutral-800 text-xs px-9 py-2 rounded focus:outline-none focus:border-[#ff0000] transition-colors placeholder-neutral-600 block text-neutral-200"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 font-extrabold text-xs"
              >
                ×
              </button>
            )}
          </div>

          {/* Tab Categories selection */}
          <div className="flex flex-wrap items-center gap-1.5 scrollbar-thin overflow-x-auto pb-1 md:pb-0">
            {faqCategories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as any)}
                className={`px-3 py-1.5 text-[9.5px] font-black uppercase tracking-wider rounded transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  activeCategory === cat.id
                    ? 'bg-[#ff0000] text-white font-extrabold'
                    : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
                }`}
              >
                {cat.icon}
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

        </div>

        {/* Main FAQ list inside scroll container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {filteredFaqs.length === 0 ? (
            <div className="text-center py-16 bg-[#111111]/40 border border-neutral-800 rounded-lg">
              <p className="text-neutral-500 text-sm mb-4">{currentT.no_results}</p>
              <button 
                onClick={() => { setActiveCategory('all'); setSearchQuery(''); }}
                className="px-4 py-2 bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs font-bold uppercase rounded hover:border-neutral-700 cursor-pointer"
              >
                {currentT.clear_filters}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFaqs.map((faq) => {
                const isExpanded = expandedId === faq.id;
                return (
                  <div 
                    key={faq.id} 
                    className={`border rounded-lg transition-all overflow-hidden ${
                      isExpanded 
                        ? 'border-[#ff0000]/40 bg-[#121212]/30 shadow-md' 
                        : 'border-neutral-800 bg-[#0f0f0f] hover:border-neutral-700'
                    }`}
                  >
                    {/* Toggle Button */}
                    <button
                      onClick={() => handleToggle(faq.id)}
                      className="w-full px-5 py-4 text-left flex justify-between items-center gap-4 cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded shrink-0 ${
                          faq.category === 'spray-booth' ? 'bg-amber-900/30 text-amber-400' :
                          faq.category === 'car-lift' ? 'bg-blue-900/30 text-blue-400' :
                          faq.category === 'parking' ? 'bg-emerald-900/30 text-emerald-400' :
                          'bg-purple-900/30 text-purple-400'
                        }`}>
                          {faq.category === 'spray-booth' ? (language === 'en' ? 'Spray Booth' : 'Spuitkas') :
                           faq.category === 'car-lift' ? (language === 'en' ? 'Car Lift' : 'Motorhyser') :
                           faq.category === 'parking' ? (language === 'en' ? 'Parking Lift' : 'Parkeerhyser') :
                           (language === 'en' ? 'Welding/Tools' : 'Sweis/Gereedskap')}
                        </span>
                        <h4 className="text-xs font-bold text-white leading-normal hover:text-[#ff0000] transition-colors">
                          {faq.question[language]}
                        </h4>
                      </div>
                      
                      <span className="text-neutral-500 hover:text-white shrink-0">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </span>
                    </button>

                    {/* Collapsible Answer */}
                    {isExpanded && (
                      <div className="px-5 pb-5 pt-1 text-xs text-neutral-300 leading-relaxed font-sans border-t border-neutral-900 bg-[#0b0b0b]/65">
                        <p>{faq.answer[language]}</p>
                        
                        {/* Quick category model matching tag */}
                        <div className="mt-4 flex flex-wrap gap-1.5">
                          <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest block font-bold">{currentT.related_specs}</span>
                          {faq.keywords.slice(0, 5).map(kw => (
                            <span 
                              key={kw} 
                              className="text-[9px] font-mono text-[#ff0000] bg-[#ff0000]/10 px-1.5 rounded"
                            >
                              #{kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-[#111111] p-5 border-t border-neutral-800 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-2.5 text-neutral-400 text-[11px] text-center sm:text-left">
            <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
            <span>{currentT.compliance_catalogs}</span>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <button 
              onClick={() => { onClose(); onOpenContact(); }}
              className="flex-1 sm:flex-initial px-4 py-2 bg-[#ff0000] hover:bg-[#cc0000] text-white text-xs font-black uppercase tracking-wider rounded transition-colors whitespace-nowrap cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Mail size={12} />
              {currentT.submit_enquiry}
            </button>
            <button 
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold uppercase tracking-wider rounded transition-colors cursor-pointer"
            >
              {currentT.close}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
