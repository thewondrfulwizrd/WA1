/**
 * Cohort-Component Projection Model
 * 
 * Implements proper demographic projection methodology:
 * 1. Ages each cohort forward by 5 years (cohorts are 5-year age groups)
 * 2. Applies age-specific mortality rates from base rates × scenario slider
 * 3. Calculates births using age-specific fertility rates (ASFR) × 1 year
 * 4. Distributes migration by age-gender proportions from 2024/2025
 * 5. Accounts for population aging into 100+ cohort
 * 
 * CRITICAL: In year-by-year projection:
 * - 0-4 cohort contains surviving infants from CURRENT year's births
 * - This accumulates over a 5-year span as cohort ages
 * - e.g., 2026 0-4 gets 2026 births, then ages to 5-9 in 2031,
 *   while 2027 births become new 0-4, etc.
 */

import { getPopulationByYear } from './populationHelpers';
import { getMortalityRates, loadMortalityRates } from './mortalityRates';
import { getMigrationDistribution, loadMigrationDistribution } from './migrationDistribution';
import { getAdjustedFertilityRates, calculateBirthsFromASFR } from './fertilityRates';

// Cache for computed projections to avoid recalculating
let projectionCache = {};

/**
 * Main projection function: applies cohort-component model to compute next year
 * 
 * CRITICAL: This projects ONE YEAR forward, handling births correctly:
 * - Year N 0-4 cohort: survivors of infants born in year N
 * - During year N+1: existing 0-4 cohort ages/survives to 5-9
 *                    Year N+1 births go to new 0-4 cohort
 * 
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
  const fertilityRates = getAdjustedFertilityRates(scenarios.fertility);

  const baseMaleRates = mortalityRates.male;      // Already in per-1000 format
  const baseFemaleRates = mortalityRates.female;  // Already in per-1000 format
  const adjustedASFRs = fertilityRates.asfrs;    // Age-specific fertility rates

  // Constants for demographic model
  const BASELINE_NET_MIGRATION = 400000; // Annual net migration

  // Scenario adjustments - EACH RATE IS INDEPENDENTLY ADJUSTED
  // Mortality slider affects all age-specific mortality rates proportionally
  const mortalityMultiplier = 1 + scenarios.mortality / 100; // Positive % means more deaths
  const migrationMultiplier = 1 + scenarios.migration / 100;

  // Calculate adjusted net migration (scalar value)
  const adjustedNetMigration = Math.round(BASELINE_NET_MIGRATION * migrationMultiplier);

  // CRITICAL: Calculate deaths by age-gender FIRST
  // Then derive global mortality rate from these deaths
  const deathsByAgeGender = new Array(21).fill(0).map(() => ({ male: 0, female: 0 }));
  let totalDeaths = 0;
  let totalPopulation = 0;

  for (let i = 0; i < 21; i++) {
    const malePop = currentPopulation.male[i] || 0;
    const femalePop = currentPopulation.female[i] || 0;
    const cohortPop = malePop + femalePop;

    // Each age-gender cohort has its own base mortality rate
    const baseMaleMortalityPer1000 = baseMaleRates[i] || 8.0;
    const baseFemaleMortalityPer1000 = baseFemaleRates[i] || 8.0;

    // Apply scenario slider to each rate independently
    const adjustedMaleMortalityPer1000 = baseMaleMortalityPer1000 * mortalityMultiplier;
    const adjustedFemaleMortalityPer1000 = baseFemaleMortalityPer1000 * mortalityMultiplier;

    // Convert to proportions
    const maleMortalityProp = Math.max(0, Math.min(1, adjustedMaleMortalityPer1000 / 1000));
    const femaleMortalityProp = Math.max(0, Math.min(1, adjustedFemaleMortalityPer1000 / 1000));

    // Calculate deaths
    const maleDeaths = Math.round(malePop * maleMortalityProp);
    const femaleDeaths = Math.round(femalePop * femaleMortalityProp);

    deathsByAgeGender[i] = { male: maleDeaths, female: femaleDeaths };
    totalDeaths += maleDeaths + femaleDeaths;
    totalPopulation += cohortPop;
  }

  // Calculate survivors by age-gender (using calculated deaths)
  const survivors = new Array(21).fill(0).map(() => ({ male: 0, female: 0 }));
  for (let i = 0; i < 21; i++) {
    const malePop = currentPopulation.male[i] || 0;
    const femalePop = currentPopulation.female[i] || 0;
    survivors[i].male = malePop - deathsByAgeGender[i].male;
    survivors[i].female = femalePop - deathsByAgeGender[i].female;
  }

  // FEMALES: Age forward with survivors
  const projectedFemale = new Array(21).fill(0);

  // Oldest cohort (100+, index 20) ages INTO itself
  projectedFemale[20] = (survivors[19].female || 0) + (survivors[20].female || 0);

  // Age all younger cohorts forward
  for (let i = 19; i >= 1; i--) {
    // Age group i ages into group i+1
    projectedFemale[i] = survivors[i - 1].female || 0;
  }

  // MALES: Age forward with survivors
  const projectedMale = new Array(21).fill(0);

  // Oldest cohort (100+, index 20) ages INTO itself
  projectedMale[20] = (survivors[19].male || 0) + (survivors[20].male || 0);

  // Age all younger cohorts forward
  for (let i = 19; i >= 1; i--) {
    // Age group i ages into group i+1
    projectedMale[i] = survivors[i - 1].male || 0;
  }

  // BIRTHS: Calculate from reproductive-age females BEFORE aging
  // This year's births enter as the NEW 0-4 cohort (surviving infants)
  // NOTE: ASFR is based on current female population at reproductive ages
  const births = calculateBirthsFromASFR(currentPopulation.female, adjustedASFRs);

  // Apply infant survival to births
  // Infants (0-4) have very low mortality
  const infantMortalityMale = Math.max(0, Math.min(1, (baseMaleRates[0] * mortalityMultiplier) / 1000));
  const infantMortalityFemale = Math.max(0, Math.min(1, (baseFemaleRates[0] * mortalityMultiplier) / 1000));
  
  const maleInfantSurvivors = Math.round(births * 0.49 * (1 - infantMortalityMale));
  const femaleInfantSurvivors = Math.round(births * 0.51 * (1 - infantMortalityFemale));

  // CRITICAL FIX: This year's surviving infants become the new 0-4 cohort
  // They are ADDED to any previous infants who are still in 0-4
  // (In the real data from JSON, 2026 shows accumulated births from multiple years)
  projectedFemale[0] = femaleInfantSurvivors;
  projectedMale[0] = maleInfantSurvivors;

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
      maleInfantSurvivors,
      femaleInfantSurvivors,
      deaths: totalDeaths,
      adjustedTFR: fertilityRates.tfr,
      adjustedNetMigration,
      adjustedMortalityMultiplier: mortalityMultiplier,
      globalMortalityRate: totalPopulation > 0 ? (totalDeaths / totalPopulation) * 1000 : 0
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
 * Calculate global mortality rate from population and scenarios
 * Uses the same age-specific mortality rates as projection
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

  // Calculate deaths using age-specific rates × scenario multiplier
  for (let i = 0; i < 21; i++) {
    const malePop = population.male[i] || 0;
    const femalePop = population.female[i] || 0;

    // Each cohort has independent base rate
    const baseMaleMortalityPer1000 = (mortalityRates.male[i] || 8.0);
    const baseFemaleMortalityPer1000 = (mortalityRates.female[i] || 8.0);

    // Apply scenario adjustment
    const adjustedMaleMortalityPer1000 = baseMaleMortalityPer1000 * mortalityMultiplier;
    const adjustedFemaleMortalityPer1000 = baseFemaleMortalityPer1000 * mortalityMultiplier;

    const maleMortalityProp = Math.max(0, Math.min(1, adjustedMaleMortalityPer1000 / 1000));
    const femaleMortalityProp = Math.max(0, Math.min(1, adjustedFemaleMortalityPer1000 / 1000));

    totalDeaths += Math.round(malePop * maleMortalityProp);
    totalDeaths += Math.round(femalePop * femaleMortalityProp);

    totalPopulation += malePop + femalePop;
  }

  // Global mortality rate per 1000
  return totalPopulation > 0 ? (totalDeaths / totalPopulation) * 1000 : 0;
}