/**
 * SEO Keywords to Category Mapping
 * 
 * Maps common automotive equipment search queries (in both English and Afrikaans)
 * to their respective product categories. This provides a smart search experience
 * where searching for synonyms like 'hoist' or 'lifting' automatically directs
 * the user to the correct category catalog.
 */

export const seoKeywordsToCategory: Record<string, string> = {
  // --- CAR LIFTS (car-lift) ---
  // English keywords
  'hoist': 'car-lift',
  'hoists': 'car-lift',
  'lifting': 'car-lift',
  'lifter': 'car-lift',
  'lifters': 'car-lift',
  'ramp': 'car-lift',
  'ramps': 'car-lift',
  'elevator': 'car-lift',
  'elevators': 'car-lift',
  'jack': 'car-lift',
  'jacks': 'car-lift',
  'two post': 'car-lift',
  '2-post': 'car-lift',
  '2post': 'car-lift',
  'four post': 'car-lift',
  '4-post': 'car-lift',
  '4post': 'car-lift',
  'tilting': 'car-lift',
  'parking': 'car-lift',
  'storage lift': 'car-lift',
  'vehicle storage': 'car-lift',
  'hydraulic lift': 'car-lift',
  
  // Afrikaans keywords
  'hyser': 'car-lift',
  'hysers': 'car-lift',
  'hysbak': 'car-lift',
  'hysbakke': 'car-lift',
  'ligtoerusting': 'car-lift',
  'motorlig': 'car-lift',
  'motorlifte': 'car-lift',
  'oplaai': 'car-lift',
  'optel': 'car-lift',
  'opstoot': 'car-lift',
  'parkering': 'car-lift',

  // --- SPRAY BOOTHS (spray-booth) ---
  // English keywords
  'booth': 'spray-booth',
  'booths': 'spray-booth',
  'spray': 'spray-booth',
  'spraying': 'spray-booth',
  'oven': 'spray-booth',
  'ovens': 'spray-booth',
  'paint': 'spray-booth',
  'painting': 'spray-booth',
  'downdraft': 'spray-booth',
  'semi-downdraft': 'spray-booth',
  'extraction': 'spray-booth',
  'baking oven': 'spray-booth',

  // Afrikaans keywords
  'spuitkas': 'spray-booth',
  'spuitkaste': 'spray-booth',
  'verf': 'spray-booth',
  'verfwerk': 'spray-booth',
  'bakoond': 'spray-booth',
  'oond': 'spray-booth',

  // --- WORKSHOP EQUIPMENT (workshop-equipment) ---
  // English keywords
  'welder': 'workshop-equipment',
  'welders': 'workshop-equipment',
  'welding': 'workshop-equipment',
  'mig': 'workshop-equipment',
  'tig': 'workshop-equipment',
  'plasma': 'workshop-equipment',
  'cutter': 'workshop-equipment',
  'cutters': 'workshop-equipment',
  'compressor': 'workshop-equipment',
  'compressors': 'workshop-equipment',
  'tools': 'workshop-equipment',
  'tool': 'workshop-equipment',
  'helmet': 'workshop-equipment',
  'helmets': 'workshop-equipment',
  'accessories': 'workshop-equipment',
  'accessory': 'workshop-equipment',
  'machine': 'workshop-equipment',
  'machines': 'workshop-equipment',

  // Afrikaans keywords
  'sweis': 'workshop-equipment',
  'sweiser': 'workshop-equipment',
  'sweistoerusting': 'workshop-equipment',
  'kompressor': 'workshop-equipment',
  'kompressors': 'workshop-equipment',
  'gereedskap': 'workshop-equipment',
  'bybehore': 'workshop-equipment',
  'helm': 'workshop-equipment',
  'snymasjien': 'workshop-equipment'
};

/**
 * Returns a specific product category if the search query contains any of the mapped SEO keywords.
 * Performs substring and word token matching.
 * 
 * @param query The search query string
 * @returns The matched category ID, or null if no mapping is found
 */
export function getCategoryFromQuery(query: string): string | null {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) return null;

  // Direct exact match check
  if (seoKeywordsToCategory[normalizedQuery]) {
    return seoKeywordsToCategory[normalizedQuery];
  }

  // Sort keys by length descending to match longer multi-word phrases first
  const sortedKeys = Object.keys(seoKeywordsToCategory).sort((a, b) => b.length - a.length);
  for (const keyword of sortedKeys) {
    // Check if the query contains the keyword as a whole word or significant substring
    if (normalizedQuery.includes(keyword)) {
      // Ensure it's not a partial word match of a completely different word
      // e.g., 'paint' in 'painter' is fine, but we want to be relatively safe.
      const index = normalizedQuery.indexOf(keyword);
      const beforeChar = index > 0 ? normalizedQuery[index - 1] : '';
      const afterChar = index + keyword.length < normalizedQuery.length ? normalizedQuery[index + keyword.length] : '';
      
      // If it is surrounded by letters, verify it's a valid match (e.g. 'lifting' matching 'lift' is fine)
      // Standard word boundaries check
      const isWordBoundaryBefore = !beforeChar || /[^a-z0-9]/.test(beforeChar);
      const isWordBoundaryAfter = !afterChar || /[^a-z0-9]/.test(afterChar);
      
      if (isWordBoundaryBefore || isWordBoundaryAfter) {
        return seoKeywordsToCategory[keyword];
      }
    }
  }

  return null;
}
