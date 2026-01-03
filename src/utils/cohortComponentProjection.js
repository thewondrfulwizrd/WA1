/**
 * Cohort-Component Projection Model
 * 
 * Implements proper demographic projection methodology:
 * 1. Ages each cohort forward by 5 years (cohorts are 5-year age groups)
 * 2. Applies age-specific mortality rates
 * 3. Distributes births to 0-4 age group based on fertility
 * 4. Distributes migration by age-gender proportions from 2024/2025
 */

import { getPopulationByYear } from './populationHelpers';
import { getMortalityRates, loadMortalityRates } from './mortalityRates';
import { getMigrationDistribution, loadMigrationDistribution } from './migrationDistribution';

// Cache for computed projections to avoid recalculating
let projectionCache = {};

/**
 * Main projection function: applies cohort-component model to compute next year
 * @param {Object} currentPopulation - { male: Array[21], female: Array[21] }
 * @param {Object} scenarios - { fertility: number, mortality: number, migration: number }
 * @param {Object} data - Full dataset with mortality and migration info
 * @returns {Object} { male: Array[21], female: Array[21] }
 */
export async function projectOneYear(currentPopulation, scenarios, data) {
  // Ensure data is loaded
  await loadMortalityRates();
  await loadMigrationDistribution();

  const mortalityRates = getMortalityRates();
  const migrationDist = getMigrationDistribution();

  const baseMaleRates = mortalityRates.male;      // Already in per-1000 format
  const baseFemaleRates = mortalityRates.female;  // Already in per-1000 format

  // Constants for demographic model
  const BASELINE_ANNUAL_BIRTHS = 330000; // Actual 2024/2025 births (Statistics Canada)
  const BASELINE_NET_MIGRATION = 400000; // Annual net migration

  // Scenario adjustments
  const fertilityMultiplier = 1 + scenarios.fertility / 100;
  const mortalityMultiplier = 1 + scenarios.mortality / 100; // Positive % means more deaths
  const migrationMultiplier = 1 + scenarios.migration / 100;

  // Calculate adjusted net migration (scalar value)
  const adjustedNetMigration = Math.round(BASELINE_NET_MIGRATION * migrationMultiplier);

  // MALES: Age forward and apply mortality
  const projectedMale = new Array(21).fill(0);

  // Age cohorts forward (except 0-4 which are births)
  for (let i = 20; i > 0; i--) {
    // Mortality rate is already per-1000, convert to proportion
    const baseMortalityRatePer1000 = baseMaleRates[i - 1]; // e.g., 8.5 per 1000
    const adjustedMortalityRatePer1000 = baseMortalityRatePer1000 * mortalityMultiplier;
    const mortalityProportion = adjustedMortalityRatePer1000 / 1000; // Convert to 0-1 proportion
    const survivalRate = Math.max(0, Math.min(1, 1 - mortalityProportion));

    projectedMale[i] = Math.round(currentPopulation.male[i - 1] * survivalRate);
  }

  // FEMALES: Age forward and apply mortality
  const projectedFemale = new Array(21).fill(0);

  for (let i = 20; i > 0; i--) {
    const baseMortalityRatePer1000 = baseFemaleRates[i - 1];
    const adjustedMortalityRatePer1000 = baseMortalityRatePer1000 * mortalityMultiplier;
    const mortalityProportion = adjustedMortalityRatePer1000 / 1000;
    const survivalRate = Math.max(0, Math.min(1, 1 - mortalityProportion));

    projectedFemale[i] = Math.round(currentPopulation.female[i - 1] * survivalRate);
  }

  // BIRTHS (ages 0-4 cohort)
  // Use baseline births adjusted by fertility scenario
  const births = Math.round(BASELINE_ANNUAL_BIRTHS * fertilityMultiplier);

  // Split births 51% female, 49% male (standard demographic assumption)
  projectedMale[0] = Math.round(births * 0.49);
  projectedFemale[0] = Math.round(births * 0.51);

  // MIGRATION: Distribute by age-gender proportions
  const maleMigration = migrationDist.male.map(share =>
    Math.round(adjustedNetMigration * share)
  );
  const femaleMigration = migrationDist.female.map(share =>
    Math.round(adjustedNetMigration * share)
  );

  // Add migration to projected populations
  const finalMale = projectedMale.map((pop, i) => Math.max(0, pop + maleMigration[i]));
  const finalFemale = projectedFemale.map((pop, i) => Math.max(0, pop + femaleMigration[i]));

  return {
    male: finalMale,
    female: finalFemale,
    // Include component details for analysis
    _components: {
      births,
      adjustedNetMigration,
      adjustedMortalityRate: (baseMaleRates[15] * mortalityMultiplier) / 1000 // sample rate for display
    }
  };
}

/**
 * Project forward from a given year using cohort-component model
 * Caches results for performance
 * @param {Object} data - Full dataset
 * @param {Object} scenarios - Scenario parameters
 * @param {number} targetYear - Year to project to
 * @param {number} baseYear - Starting year (typically 2025)
 * @returns {Object} Population for target year
 */
export async function projectToYear(data, scenarios, targetYear, baseYear = 2025) {
  // Generate cache key
  const cacheKey = `${targetYear}_${JSON.stringify(scenarios)}`;
  if (projectionCache[cacheKey]) {
    console.log(`Using cached projection for ${targetYear}`);
    return projectionCache[cacheKey];
  }

  let currentPop = getPopulationByYear(data, baseYear);
  if (!currentPop) {
    console.error(`Cannot find base population for year ${baseYear}`);
    return null;
  }

  // Project year by year from base to target
  for (let year = baseYear + 1; year <= targetYear; year++) {
    currentPop = await projectOneYear(currentPop, scenarios, data);
  }

  projectionCache[cacheKey] = currentPop;
  return currentPop;
}

/**
 * Clear projection cache (call when scenarios change significantly)
 */
export function clearProjectionCache() {
  projectionCache = {};
}

/**
 * Calculate global mortality rate from cohort deaths
 * @param {Object} population - { male: Array, female: Array }
 * @param {Object} scenarios - Scenario parameters
 * @returns {number} Global mortality rate per 1000 population
 */
export async function calculateGlobalMortalityRate(population, scenarios) {
  await loadMortalityRates();
  const mortalityRates = getMortalityRates();

  const mortalityMultiplier = 1 + scenarios.mortality / 100;

  let totalDeaths = 0;
  let totalPopulation = 0;

  // Calculate deaths for each cohort
  for (let i = 0; i < 21; i++) {
    const malePop = population.male[i];
    const femalePop = population.female[i];

    // Mortality rates already per-1000
    const baseMaleMortalityPer1000 = (mortalityRates.male[i] || 8.0) * mortalityMultiplier;
    const baseFemaleMortalityPer1000 = (mortalityRates.female[i] || 8.0) * mortalityMultiplier;

    const maleMortalityProp = baseMaleMortalityPer1000 / 1000;
    const femaleMortalityProp = baseFemaleMortalityPer1000 / 1000;

    totalDeaths += Math.round(malePop * maleMortalityProp);
    totalDeaths += Math.round(femalePop * femaleMortalityProp);

    totalPopulation += malePop + femalePop;
  }

  // Global mortality rate per 1000
  return totalPopulation > 0 ? (totalDeaths / totalPopulation) * 1000 : 0;
}