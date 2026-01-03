/**
 * Mortality rates by age and gender from Statistics Canada 2023 data
 * Rates are per 1,000 population
 * 
 * Age cohorts (21 groups):
 * 0: 0-4, 1: 5-9, 2: 10-14, 3: 15-19, 4: 20-24, 5: 25-29, 6: 30-34, 7: 35-39,
 * 8: 40-44, 9: 45-49, 10: 50-54, 11: 55-59, 12: 60-64, 13: 65-69, 14: 70-74,
 * 15: 75-79, 16: 80-84, 17: 85-89, 18: 90-94, 19: 95-99, 20: 100+
 */

// Base mortality rates from Statistics Canada 2023 (per 1,000 population)
const MORTALITY_RATES = {
  female: [
    1.00,        // 0-4 years
    0.10,        // 5-9 years
    0.10,        // 10-14 years
    0.30,        // 15-19 years
    0.45,        // 20-24 years
    0.55,        // 25-29 years
    0.70,        // 30-34 years
    0.85,        // 35-39 years
    1.10,        // 40-44 years
    1.60,        // 45-49 years
    2.30,        // 50-54 years
    3.65,        // 55-59 years
    5.75,        // 60-64 years
    9.00,        // 65-69 years
    14.20,       // 70-74 years
    24.25,       // 75-79 years
    42.90,       // 80-84 years
    80.20,       // 85-89 years
    143.639368,  // 90-94 years
    241.758242,  // 95-99 years
    351.543309   // 100+ years
  ],
  male: [
    1.05,        // 0-4 years
    0.10,        // 5-9 years
    0.10,        // 10-14 years
    0.50,        // 15-19 years
    0.75,        // 20-24 years
    1.10,        // 25-29 years
    1.40,        // 30-34 years
    1.70,        // 35-39 years
    2.10,        // 40-44 years
    2.65,        // 45-49 years
    4.00,        // 50-54 years
    6.15,        // 55-59 years
    9.20,        // 60-64 years
    14.05,       // 65-69 years
    21.70,       // 70-74 years
    34.80,       // 75-79 years
    60.40,       // 80-84 years
    110.75,      // 85-89 years
    185.467822,  // 90-94 years
    278.554094,  // 95-99 years
    401.356994   // 100+ years
  ]
};

/**
 * Get mortality rates (always available, no async loading needed)
 */
export function getMortalityRates() {
  return MORTALITY_RATES;
}

/**
 * Load mortality rates (for compatibility with async loading pattern)
 * Returns immediately since data is hardcoded
 */
export async function loadMortalityRates() {
  console.log('[MortalityRates] Using hardcoded 2023 baseline rates');
  console.log('[MortalityRates] Female rates:', MORTALITY_RATES.female);
  console.log('[MortalityRates] Male rates:', MORTALITY_RATES.male);
  return MORTALITY_RATES;
}

/**
 * Get the age cohort index for a given age
 * @param {number} age - Age in years
 * @returns {number} Cohort index (0-20)
 */
export function getAgeCohortIndex(age) {
  if (age < 5) return 0;
  if (age < 10) return 1;
  if (age < 15) return 2;
  if (age < 20) return 3;
  if (age < 25) return 4;
  if (age < 30) return 5;
  if (age < 35) return 6;
  if (age < 40) return 7;
  if (age < 45) return 8;
  if (age < 50) return 9;
  if (age < 55) return 10;
  if (age < 60) return 11;
  if (age < 65) return 12;
  if (age < 70) return 13;
  if (age < 75) return 14;
  if (age < 80) return 15;
  if (age < 85) return 16;
  if (age < 90) return 17;
  if (age < 95) return 18;
  if (age < 100) return 19;
  return 20; // 100+
}
