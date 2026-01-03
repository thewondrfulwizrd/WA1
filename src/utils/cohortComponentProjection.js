/**
 * Cohort-Component Projection Model
 * 
 * CRITICAL: Year-by-year projection with 5-year age groups
 * This means each year we move 1/5 of each cohort to the next age group
 * 
 * Example:
 * - Year 1: Age 0-4 group has [births only for that year]
 *         Ages 5-9 has [full cohort + aged from 0-4]
 * - Year 2: Age 0-4 group has [new births]
 *         Ages 5-9 receives [1/5 of previous 0-4 + 4/5 of previous 5-9]
 * - Year 5: Original 0-4 cohort has fully aged into 5-9 group
 * 
 * This avoids the error of replacing entire cohorts each year.
 */

import { getPopulationByYear } from './populationHelpers';
import { getMortalityRates, loadMortalityRates } from './mortalityRates';
import { getMigrationDistribution, loadMigrationDistribution } from './migrationDistribution';
import { getAdjustedFertilityRates, calculateBirthsFromASFR } from './fertilityRates';

// Cache for computed projections to avoid recalculating
let projectionCache = {};

/**
 * Main projection function: applies cohort-component model for ONE YEAR
 * 
 * CRITICAL LOGIC:
 * - Move 1/5 of each 5-year cohort to the next age group
 * - This means cohorts gradually age over 5 years, not all at once
 * - Apply age-specific mortality rates to each cohort
 * - Calculate births from reproductive-age females
 * - Add migration
 * 
 * @param {Object} currentPopulation - { male: Array[21], female: Array[21] }
 * @param {Object} scenarios - { fertility: number, mortality: number, migration: number }
 * @param {Object} data - Full dataset with mortality and migration info
 * @returns {Object} { male: Array[21], female: Array[21], _components: {...} }
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
  const COHORT_WIDTH = 5; // Each age group spans 5 years

  // Scenario adjustments
  const mortalityMultiplier = 1 + scenarios.mortality / 100;
  const migrationMultiplier = 1 + scenarios.migration / 100;

  // Calculate adjusted net migration
  const adjustedNetMigration = Math.round(BASELINE_NET_MIGRATION * migrationMultiplier);

  // ============================================
  // STEP 1: Calculate deaths for each cohort
  // ============================================
  const deathsByAgeGender = new Array(21).fill(0).map(() => ({ male: 0, female: 0 }));
  let totalDeaths = 0;
  let totalPopulation = 0;

  for (let i = 0; i < 21; i++) {
    const malePop = currentPopulation.male[i] || 0;
    const femalePop = currentPopulation.female[i] || 0;
    const cohortPop = malePop + femalePop;

    // CRITICAL FIX: Use the age-specific base rate for THIS cohort
    // NOT the global average, and NOT apply global rate to 100+ cohort
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

  // ============================================
  // STEP 2: Calculate survivors after mortality
  // ============================================
  const survivors = new Array(21).fill(0).map(() => ({ male: 0, female: 0 }));
  for (let i = 0; i < 21; i++) {
    const malePop = currentPopulation.male[i] || 0;
    const femalePop = currentPopulation.female[i] || 0;
    survivors[i].male = malePop - deathsByAgeGender[i].male;
    survivors[i].female = femalePop - deathsByAgeGender[i].female;
  }

  // ============================================
  // STEP 3: Age cohorts forward (1/5 per year)
  // ============================================
  // CRITICAL: We move 1/5 of each cohort forward each year
  // The remaining 4/5 stay in place
  // This gradually ages cohorts over 5 years

  const projectedFemale = new Array(21).fill(0);
  const projectedMale = new Array(21).fill(0);

  // Age group 0-4: will be filled with births below
  projectedFemale[0] = 0;
  projectedMale[0] = 0;

  // Age groups 1-20: Each receives 1/5 from younger group + 4/5 of its own
  for (let i = 1; i < 20; i++) {
    // 1/5 of current cohort ages out
    // 4/5 stays in place
    // Plus 1/5 from the younger cohort ages in
    const inflow = (survivors[i - 1].female || 0) / COHORT_WIDTH;
    const staying = (survivors[i].female * (COHORT_WIDTH - 1)) / COHORT_WIDTH;
    projectedFemale[i] = inflow + staying;

    const inflowMale = (survivors[i - 1].male || 0) / COHORT_WIDTH;
    const stayingMale = (survivors[i].male * (COHORT_WIDTH - 1)) / COHORT_WIDTH;
    projectedMale[i] = inflowMale + stayingMale;
  }

  // Age group 20 (100+): Receives aged-in cohort + its own survivors
  // (These don't age out, they stay in 100+)
  const inflow100Female = (survivors[19].female || 0) / COHORT_WIDTH;
  const staying100Female = survivors[20].female || 0;
  projectedFemale[20] = inflow100Female + staying100Female;

  const inflow100Male = (survivors[19].male || 0) / COHORT_WIDTH;
  const staying100Male = survivors[20].male || 0;
  projectedMale[20] = inflow100Male + staying100Male;

  // ============================================
  // STEP 4: Calculate births and add to 0-4
  // ============================================
  // Births are calculated from reproductive-age females (current year)
  // These become the 0-4 cohort for this year
  const births = calculateBirthsFromASFR(currentPopulation.female, adjustedASFRs);

  // Apply infant survival (0-4 mortality) to births
  const infantMortalityMale = Math.max(0, Math.min(1, (baseMaleRates[0] * mortalityMultiplier) / 1000));
  const infantMortalityFemale = Math.max(0, Math.min(1, (baseFemaleRates[0] * mortalityMultiplier) / 1000));
  
  const maleInfantSurvivors = Math.round(births * 0.49 * (1 - infantMortalityMale));
  const femaleInfantSurvivors = Math.round(births * 0.51 * (1 - infantMortalityFemale));

  // Place surviving infants in 0-4 cohort
  projectedFemale[0] = femaleInfantSurvivors;
  projectedMale[0] = maleInfantSurvivors;

  // ============================================
  // STEP 5: Add migration
  // ============================================
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

    // CRITICAL: Use age-specific base rates, not global average
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