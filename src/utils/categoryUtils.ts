/**
 * Category Normalization & Formatting Utilities
 * Preserves full category folder taxonomy (e.g. 'automotive-spray-booths', 'car-lifts', 
 * '20-ton-bus-lifts', 'mig-welders-direct', 's-a-parking-storage-lifts', 'bus-spray-booths',
 * 'chassis-straightener', 'filter-media', 'telescopic-ladders', 'forklift-loading-ramps',
 * 'hydraulic-oil-46gr-10-litres', 'parking-lifts', 'wheel-care', 'workshop-equipment', etc.)
 * while converting user category input strings into clean folder slugs.
 */

export const normalizeCategorySlug = (
  rawCategory?: string,
  productName: string = '',
  productId: string = '',
  productDesc: string = ''
): string => {
  const cat = (rawCategory || '').trim().toLowerCase();

  if (cat) {
    const formatted = cat.replace(/[\s_]+/g, '-');
    if (formatted === 'automotive-spray-booths' || formatted === 'spray-booth' || formatted === 'spray-booths' || formatted === 'spraybooth') {
      return 'spray-booth';
    }
    return formatted;
  }

  // Fallback category slug inference if product has no category assigned
  const name = productName.toLowerCase();
  const desc = productDesc.toLowerCase();
  const id = productId.toLowerCase();

  if (name.includes('booth') || name.includes('spray') || id.includes('booth') || id.includes('spray')) {
    return 'automotive-spray-booths';
  }
  if (name.includes('lift') || name.includes('hoist') || id.includes('lift') || id.includes('hoist')) {
    return 'car-lifts';
  }
  if (name.includes('wheel') || name.includes('tire') || name.includes('tyre') || name.includes('balancer') || name.includes('changer')) {
    return 'wheel-care';
  }
  if (name.includes('welder') || name.includes('mig') || name.includes('sweis')) {
    return 'mig-welders-direct';
  }

  return 'workshop-equipment';
};

/**
 * Legacy compatibility alias
 */
export const mapCategoryToCoreSlug = normalizeCategorySlug;

export const formatCategoryLabel = (categorySlug?: string): string => {
  if (!categorySlug) return 'Workshop Equipment';
  const slug = categorySlug.trim().toLowerCase();

  const PREDEFINED_LABELS: Record<string, string> = {
    'automotive-spray-booths': 'Automotive Spray Booths',
    'spray-booth': 'Automotive Spray Booths',
    'spray-booths': 'Automotive Spray Booths',
    'bus-spray-booths': 'Bus Spray Booths',
    'car-lift': 'Car Lifts',
    'car-lifts': 'Car Lifts',
    'mig-welders-direct': 'Mig Welders Direct',
    'budget-infrared-heaters': 'Budget Infrared Heaters',
    'chassis-straightener': 'Chassis Straightener',
    'filter-media': 'Filter Media',
    'telescopic-ladders': 'Telescopic Ladders',
    's-a-parking-storage-lifts': 'S A Parking Storage Lifts',
    '20-ton-bus-lifts': '20 Ton Bus Lifts',
    'hydraulic-oil-46gr-10-litres': 'Hydraulic Oil 46Gr 10 Litres',
    'forklift-loading-ramps': 'Forklift Loading Ramps',
    'parking-lifts': 'Parking Lifts',
    'wheel-care': 'Wheel Care',
    'workshop-equipment': 'Workshop Equipment',
    'welding-gear': 'Welding Gear'
  };

  if (PREDEFINED_LABELS[slug]) {
    return PREDEFINED_LABELS[slug];
  }

  return slug
    .split('-')
    .map(word => {
      if (word === 's' || word === 'a') return word.toUpperCase();
      if (word === '46gr') return '46Gr';
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
};
