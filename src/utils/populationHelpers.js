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
export function getT
