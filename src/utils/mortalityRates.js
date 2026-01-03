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
    return cachedMortalityRates;
  }

  try {
    const response = await fetch('/data/source/Base_Mortality.csv');
    const csv = await response.text();
    const lines = csv.trim().split('\n').slice(1); // Skip header

    // Map of age group names to indices (based on pyramid age groups)
    const ageGroupIndices = {
      '0 to 4 years': 0,
      '5 to 9 years': 1,
      '10 to 14 years': 2,
      '15 to 19 years': 3,
      '20 to 24 years': 4,
      '25 to 29 years': 5,
      '30 to 34 years': 6,
      '35 to 39 years': 7,
      '40 to 44 years': 8,
      '45 to 49 years': 9,
      '50 to 54 years': 10,
      '55 to 59 years': 11,
      '60 to 64 years': 12,
      '65 to 69 years': 13,
      '70 to 74 years': 14,
      '75 to 79 years': 15,
      '80 to 84 years': 16,
      '85 to 89 years': 17,
      '90 to 94 years': 18,
      '95 to 99 years': 19,
      '100 years and over': 20
    };

    const maleRates = new Array(21).fill(0);
    const femaleRates = new Array(21).fill(0);

    lines.forEach(line => {
      const matches = line.match(/"([^"]*)"|[^,]+/g);
      if (!matches || matches.length < 12) return;

      const refDate = matches[0].replace(/"/g, '').trim();
      const sex = matches[4].replace(/"/g, '').trim();
      const ageGroup = matches[3].replace(/"/g, '').trim();
      const valueStr = matches[11].replace(/"/g, '').trim();
      const value = parseFloat(valueStr);

      if (isNaN(value) || refDate !== '2023') return;

      // Skip "All ages" rows - we only want specific age groups
      if (ageGroup === 'Age at time of death, all ages') return;

      const ageIndex = ageGroupIndices[ageGroup];
      if (ageIndex !== undefined) {
        if (sex === 'Males') {
          maleRates[ageIndex] = value;
        } else if (sex === 'Females') {
          femaleRates[ageIndex] = value;
        }
      }
    });

    cachedMortalityRates = {
      male: maleRates,
      female: femaleRates
    };

    console.log('✓ Mortality rates loaded from 2023 data');
    console.log('  Male rates (sample):', maleRates.slice(0, 5));
    console.log('  Female rates (sample):', femaleRates.slice(0, 5));

    return cachedMortalityRates;
  } catch (error) {
    console.error('Error loading mortality rates:', error);
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
    console.warn('Mortality rates not yet loaded - use loadMortalityRates() first');
    return {
      male: new Array(21).fill(8.0),
      female: new Array(21).fill(8.0)
    };
  }
  return cachedMortalityRates;
}
