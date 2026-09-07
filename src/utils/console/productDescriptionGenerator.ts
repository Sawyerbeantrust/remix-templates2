import { Product } from '../../types/index.js';

/**
 * Builds a deterministic, engineering-grade long description for South African automotive workshop equipment.
 */
export function buildClientFallbackLongDescription(product: Product): string {
  const name = product.name || 'Automotive Equipment';
  const category = product.category || 'Automotive Machinery';
  const modelCode = product.modelCode ? ` (Model: ${product.modelCode})` : '';
  const description = product.description || '';
  const features = product.features || [];
  const specifications = product.specifications || {};

  const categoryLower = category.toLowerCase();
  const isLift = categoryLower.includes('lift') || categoryLower.includes('hoist');
  const isSprayBooth = categoryLower.includes('spray') || categoryLower.includes('booth');
  const isWelder = categoryLower.includes('weld');
  const isWheel = categoryLower.includes('wheel') || categoryLower.includes('tire') || categoryLower.includes('tyre') || categoryLower.includes('balancer');

  let domainOverview = '';
  let operationalHighlights: string[] = [];

  if (isLift) {
    domainOverview = `Engineered specifically for heavy-throughput commercial automotive service bays, the ${name}${modelCode} sets the professional benchmark for vehicle elevation, undercarriage inspections, transmission drops, and suspension servicing. Built with high-tensile structural steel columns, synchronized dual hydraulic cylinders, and high-strength equalizing wire ropes, this lift ensures consistent, vibration-free lifting even under maximum rated loads.`;
    operationalHighlights = [
      `<strong>Dual Direct-Drive Hydraulic Cylinders:</strong> Engineered for silky-smooth lifting dynamics, minimized mechanical wear, and whisper-quiet operation during daily continuous shop cycles.`,
      `<strong>Automatic Mechanical Locking Ladders:</strong> Integrated fail-safe locking dogs at short increments guarantee complete technician security with zero drift under sustained elevation.`,
      `<strong>Versatile Arm Configurations:</strong> Telescoping symmetric/asymmetric support arms with low-profile drop-in pads accommodate low-clearance performance sedans through to high-axle 4x4 commercial bakkies.`,
      `<strong>Overload Pressure Relief Bypass:</strong> Built-in hydraulic bypass valve shields the pump motor and hydraulic pack from unintentional overload damage.`,
    ];
  } else if (isSprayBooth) {
    domainOverview = `The ${name}${modelCode} provides automotive refinishing workshops and panel beaters with a controlled, dust-free paint curing environment engineered to deliver factory-level glass finishes. Featuring pressurized downdraft airflow, multi-stage ceiling filter media, and high-efficiency thermal heat-exchange burners, this booth eliminates overspray turbulence while accelerating cycle turnover times.`;
    operationalHighlights = [
      `<strong>High-CFM Centrifugal Turbo Fans:</strong> Deliver balanced, laminar air displacement across the entire vehicle envelope, ensuring complete evacuation of solvent fumes.`,
      `<strong>Multi-Tier Filter Array:</strong> Combines pre-filtration mats, sub-micron ceiling diffusion pads, and high-absorption floor exhaust fiberglass filters for pristine finishes.`,
      `<strong>Precision Digital Microprocessor Console:</strong> Intuitive bake-and-spray cycles with programmable temperature ramps, safety interlocks, and automatic burner shutdown.`,
      `<strong>Explosion-Proof LED Light Enclosures:</strong> Day-balanced shadow-free illumination across roof and side walls to reveal precise color match nuances and metallic flakes.`,
    ];
  } else if (isWelder) {
    domainOverview = `The ${name}${modelCode} is a high-duty cycle, precision inverter welding workstation designed for fabrication plants, exhaust shops, and heavy structural collision repair. Equipped with advanced IGBT inverter modules, arc stability processors, and synergic wire speed controls, it delivers clean, spatter-free welds across carbon steel, stainless alloys, and lightweight automotive aluminum.`;
    operationalHighlights = [
      `<strong>Advanced IGBT Inverter Topology:</strong> High electrical conversion efficiency with immediate arc strike and dynamic molten puddle viscosity control.`,
      `<strong>Gas & Gasless Flux-Core Versatility:</strong> Seamlessly transitions between shielding gas applications for showroom-grade cosmetic seams and rugged outdoor flux-cored jobs.`,
      `<strong>Integrated Thermal Overload & Undervoltage Protection:</strong> Intelligent sensors safeguard electrical components against South African power grid fluctuations and thermal peaks.`,
      `<strong>Heavy-Duty Euro-Connect Torch & Brass Grounding Clamps:</strong> Industrial-grade consumables crafted for ergonomic operator grip and continuous duty cycles.`,
    ];
  } else if (isWheel) {
    domainOverview = `Designed for high-volume tyre fitment bays and high-end wheel refurbishment workshops, the ${name}${modelCode} pairs rapid mechanical turnaround with micron-precise calibration. Its rugged chassis resists structural deflection when mounting stiff, low-profile run-flat tyres, while automated distance sonar and laser balance pointers ensure vibration-free customer ride comfort.`;
    operationalHighlights = [
      `<strong>High-Torque Pneumatic Clamping Turntable:</strong> Hardened steel jaws lock rims securely without scuffing premium alloy clear coats or bead edges.`,
      `<strong>Pneumatic Assist Helper Arms:</strong> Effortlessly depresses stiff sidewalls and bead humps on oversized SUV and low-profile sports tyres without tyre lever fatigue.`,
      `<strong>Micro-Precision Dynamic & Static Balancing:</strong> Laser plane guidance automatically pinpoints the exact hidden clip-on or adhesive tape weight placement.`,
      `<strong>Rugged Industrial Grade Air Regulator & Oiler:</strong> Moisture-separator assembly ensures clean, lubricated pneumatic air supply for long valve and seal longevity.`,
    ];
  } else {
    domainOverview = `The ${name}${modelCode} is an industrial-grade workshop machine manufactured to exacting standards for automotive service centers, fabrication bays, and industrial maintenance facilities across Southern Africa. Engineered using heavy-gauge reinforced steel and commercial-grade mechanical components, this unit maximizes workshop throughput while maintaining safety.`;
    operationalHighlights = [
      `<strong>Reinforced Commercial Construction:</strong> High-tensile steel framing and powder-coated enamel resist aggressive workshop chemicals, brake fluid, and daily impact.`,
      `<strong>Ergonomic Operator Controls:</strong> Intuitive controls reduce technician fatigue and improve precision during repetitive maintenance tasks.`,
      `<strong>Industrial Power System:</strong> Designed to operate efficiently on standard workshop power connections with integrated overload thermal protection.`,
      `<strong>Low-Maintenance Architecture:</strong> Readily serviceable wear points and sealed maintenance-free bearings maximize equipment uptime.`,
    ];
  }

  if (features.length > 0) {
    for (const f of features.slice(0, 3)) {
      operationalHighlights.push(`<strong>Commercial Capability:</strong> ${f}`);
    }
  }

  const specKeys = Object.keys(specifications);
  let specsHtml = '';
  if (specKeys.length > 0) {
    const specItems = specKeys.slice(0, 6).map((k) => `<li><strong>${k}:</strong> ${specifications[k]}</li>`).join('\n    ');
    specsHtml = `
  <h3>Operational Specifications & Technical Ratings</h3>
  <ul>
    ${specItems}
  </ul>`;
  }

  return `
  <h3>Engineering Architecture & Commercial Overview</h3>
  <p>${domainOverview}</p>
  <p>${description || `The ${name} is engineered to elevate productivity, reduce operator cycle times, and meet stringent occupational health and safety benchmarks across South Africa. Every structural component undergoes rigorous static and dynamic load testing prior to factory dispatch.`}</p>

  <h3>Key Structural & Operational Advantages</h3>
  <ul>
    ${operationalHighlights.map((h) => `<li>${h}</li>`).join('\n    ')}
  </ul>
${specsHtml}
  <h3>Built for Demanding South African Workshop Environments</h3>
  <p>All Triton automotive equipment is designed and tested to withstand high ambient workshop temperatures and intensive daily operation. Structural metalwork receives a specialized electrostatic powder-coated finish that resists oil, solvent corrosion, and chipping. Power units are calibrated to ensure reliable continuous performance on South African single-phase (220V/50Hz) or three-phase (380V/50Hz) electrical connections.</p>

  <h3>Warranty, Spares & Triton Certified Support</h3>
  <p>Your investment is backed by Triton's comprehensive <strong>3-Year Structural Warranty</strong> and a 1-Year warranty on electrical and hydraulic power packs. Triton maintains a fully stocked central warehouse with genuine replacement seals, cables, valves, and switches in Gauteng and the Western Cape, guaranteeing rapid nationwide parts delivery and dedicated technical assistance.</p>
`.trim();
}
