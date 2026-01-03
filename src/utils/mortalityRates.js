/**
 * Load mortality rates by age and gender from Statistics Canada data
 * Uses 2023 as the base year (last year with complete data)
 */

let cachedMortalityRates = null;

/**
 * Load and parse mortality rates from CSV
 * Returns object with structure: { male: [rates], female: [rates] }
 * Index corresponds to age group index (0=0-4, 1=5-9, ..., 20=100+)
 */
export async function loadMortalityRates() {
  // Return cached version if already loaded
  if (cachedMortalityRates) {
    console.log('[MortalityRates] Using cached rates');
    return cachedMortalityRates;
  }

  console.log('[MortalityRates] Loading from CSV...');

  try {
    const response = await fetch('/data/source/Base_Mortality.csv');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const csv = await response.text();
    console.log('[MortalityRates] CSV loaded, length:', csv.length);
    
    const lines = csv.trim().split('\n').slice(1); // Skip header
    console.log('[MortalityRates] Number of data lines:', lines.length);

    // Map of age group names to indices
    // CRITICAL: Use EXACT strings from CSV file
    const ageGroupIndices = {
      'Age at time of death, 1 to 4 years': 0,      // Use for 0-4 cohort (close enough)
      'Age at time of death, 5 to 9 years': 1,
      'Age at time of death, 10 to 14 years': 2,
      'Age at time of death, 15 to 19 years': 3,
      'Age at time of death, 20 to 24 years': 4,
      'Age at time of death, 25 to 29 years': 5,
      'Age at time of death, 30 to 34 years': 6,
      'Age at time of death, 35 to 39 years': 7,
      'Age at time of death, 40 to 44 years': 8,
      'Age at time of death, 45 to 49 years': 9,
      'Age at time of death, 50 to 54 years': 10,
      'Age at time of death, 55 to 59 years': 11,
      'Age at time of death, 60 to 64 years': 12,
      'Age at time of death, 65 to 69 years': 13,
      'Age at time of death, 70 to 74 years': 14,
      'Age at time of death, 75 to 79 years': 15,
      'Age at time of death, 80 to 84 years': 16,
      'Age at time of death, 85 to 89 years': 17,
      'Age at time of death, 90 to 94 years': 18,
      'Age at time of death, 95 to 99 years': 19,
      'Age at time of death, 100 years and over': 20
    };

    const maleRates = new Array(21).fill(0);
    const femaleRates = new Array(21).fill(0);
    
    let rowsParsed = 0;
    let rowsMatched = 0;

    lines.forEach(line => {
      const matches = line.match(/"([^"]*)"|[^,]+/g);
      if (!matches || matches.length < 13) return;
      
      rowsParsed++;

      // Extract fields (adjust column indices based on CSV structure)
      const refDate = matches[0].replace(/"/g, '').trim();
      const ageGroup = matches[3].replace(/"/g, '').trim();
      const sex = matches[4].replace(/"/g, '').trim();
      const valueStr = matches[12].replace(/"/g, '').trim();
      const value = parseFloat(valueStr);

      if (isNaN(value) || refDate !== '2023') return;

      // Skip "All ages" rows - we only want specific age groups
      if (ageGroup === 'Age at time of death, all ages') return;

      const ageIndex = ageGroupIndices[ageGroup];
      if (ageIndex !== undefined) {
        rowsMatched++;
        if (sex === 'Males') {
          maleRates[ageIndex] = value;
          console.log(`[MortalityRates] Male [${ageIndex}] ${ageGroup}: ${value}/1000`);
        } else if (sex === 'Females') {
          femaleRates[ageIndex] = value;
          console.log(`[MortalityRates] Female [${ageIndex}] ${ageGroup}: ${value}/1000`);
        }
      }
    });
    
    console.log(`[MortalityRates] Parsed ${rowsParsed} rows, matched ${rowsMatched} age groups`);

    cachedMortalityRates = {
      male: maleRates,
      female: femaleRates
    };

    console.log('[MortalityRates] ✓ Mortality rates loaded from 2023 data');
    console.log('[MortalityRates] Male rates:', maleRates);
    console.log('[MortalityRates] Female rates:', femaleRates);
    
    // Check for any zeros (missing data)
    const maleZeros = maleRates.filter(r => r === 0).length;
    const femaleZeros = femaleRates.filter(r => r === 0).length;
    if (maleZeros > 0 || femaleZeros > 0) {
      console.warn(`[MortalityRates] WARNING: ${maleZeros} male and ${femaleZeros} female rates are 0`);
    }

    return cachedMortalityRates;
  } catch (error) {
    console.error('[MortalityRates] ERROR loading mortality rates:', error);
    console.error('[MortalityRates] Stack:', error.stack);
    // Return defaults if load fails
    return {
      male: new Array(21).fill(8.0),
      female: new Array(21).fill(8.0)
    };
  }
}

/**
 * Get mortality rates synchronously (must be pre-loaded)
 */
export function getMortalityRates() {
  if (!cachedMortalityRates) {
    console.warn('[MortalityRates] Rates not yet loaded - use loadMortalityRates() first');
    console.warn('[MortalityRates] Returning default 8.0 for all ages');
    return {
      male: new Array(21).fill(8.0),
      female: new Array(21).fill(8.0)
    };
  }
  return cachedMortalityRates;
}
