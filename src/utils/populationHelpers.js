// src/utils/populationHelpers.js

/**
 * Get population for a specific year
 * @param {Object} data - Full dataset
 * @param {number} year - Year to retrieve (2000-2100)
 * @returns {Object} { male: Array, female: Array }
 */
export function getPopulationByYear(data, year) {
  if (!data) return null;

  if (year <= data.lastObservedYear) {
    return data.observed[year.toString()];
  } else if (year <= data.lastProjectedYear) {
    return data.projected[year.toString()];
  }

  return null;
}

/**
 * Calculate total population for a year
 * @param {Object} data - Full dataset
 * @param {number} year - Year
 * @returns {Object} { male: number, female: number, total: number }
 */
export function getTotalPopulation(data, year) {
  const pop = getPopulationByYear(data, year);
  if (!pop) return null;

  const male = pop.male.reduce((sum, val) => sum + val, 0);
  const female = pop.female.reduce((sum, val) => sum + val, 0);

  return {
    male,
    female,
    total: male + female
  };
}

/**
 * Check if a year is projected vs observed
 * @param {Object} data - Full dataset
 * @param {number} year - Year
 * @returns {string} 'observed' | 'projected'
 */
export function getYearType(data, year) {
  return year <= data.lastObservedYear ? 'observed' : 'projected';
}

/**
 * Format population number for display
 * @param {number} num - Population number
 * @returns {string} Formatted string (e.g., "41.7M")
 */
export function formatPopulation(num) {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(0)}K`;
  }
  return num.toString();
}
