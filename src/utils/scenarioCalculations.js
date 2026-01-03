import { getPopulationByYear, getYearType } from './populationHelpers';

/**
 * Apply scenario adjustments to population data
 * Scenarios represent percentage changes from baseline projections
 * 
 * @param {Object} data - Full dataset with observed and projected populations
 * @param {Object} scenarios - { fertility: number, mortality: number, migration: number }
 * @param {number} year - Year to apply scenarios to
 * @returns {Object} { male: Array, female: Array } - Adjusted population
 */
export function applyScenarios(data, scenarios, year) {
  const yearType = getYearType(data, year);
  
  // Don't modify historical data
  if (yearType === 'observed') {
    return getPopulationByYear(data, year);
  }

  // Get baseline population for this year
  const baseline = getPopulationByYear(data, year);
  if (!baseline) {
    console.warn(`No baseline population data for year ${year}`);
    return { male: [], female: [] };
  }
  
  // All scenarios are percentage changes: -100 to +100+ range
  // Convert to multipliers: 0% change = 1.0, +50% = 1.5, -50% = 0.5
  const fertilityMultiplier = 1 + (scenarios.fertility / 100);
  // MORTALITY IS INVERTED: negative value = lower mortality = better survival = more population
  const mortalityMultiplier = 1 - (scenarios.mortality / 100);
  const migrationMultiplier = 1 + (scenarios.migration / 100);
  
  // Age group indices for scenario effects
  // Based on 21 age groups: 0=0-4, 1=5-9, ..., 20=100+
  const ageGroupCount = baseline.male.length;
  
  const adjustedMale = baseline.male.map((pop, ageIndex) => {
    let adjusted = pop;
    
    // FERTILITY: affects births (0-4 age group, index 0)
    // Children born in projection reflect TFR changes
    if (ageIndex === 0) {
      adjusted *= fertilityMultiplier;
    }
    
    // MORTALITY: affects survival rates, mainly impacts older population (65+)
    // Negative mortality % = lower death rate = more elderly survive
    // Age 13-20 are roughly 65+
    if (ageIndex >= 13) {
      adjusted *= mortalityMultiplier;
    }
    
    // MIGRATION: affects working-age population (20-64 years)
    // Age 4-12 correspond to ages 20-64
    if (ageIndex >= 4 && ageIndex <= 12) {
      adjusted *= migrationMultiplier;
    }
    
    return Math.max(0, Math.round(adjusted));
  });
  
  const adjustedFemale = baseline.female.map((pop, ageIndex) => {
    let adjusted = pop;
    
    // Same logic as males
    if (ageIndex === 0) {
      adjusted *= fertilityMultiplier;
    }
    
    if (ageIndex >= 13) {
      adjusted *= mortalityMultiplier;
    }
    
    if (ageIndex >= 4 && ageIndex <= 12) {
      adjusted *= migrationMultiplier;
    }
    
    return Math.max(0, Math.round(adjusted));
  });
  
  return {
    male: adjustedMale,
    female: adjustedFemale
  };
}

/**
 * Calculate the impact of scenarios on total population
 * Useful for showing users how their choices affect population growth
 * 
 * @param {Object} data - Full dataset
 * @param {Object} scenarios - Scenario adjustments
 * @param {number} year - Year to analyze
 * @returns {Object} Impact analysis
 */
export function analyzeScenarioImpact(data, scenarios, year) {
  const baseline = getPopulationByYear(data, year);
  const adjusted = applyScenarios(data, scenarios, year);
  
  if (!baseline) return null;
  
  const baselineMale = baseline.male.reduce((sum, v) => sum + v, 0);
  const baselineFemale = baseline.female.reduce((sum, v) => sum + v, 0);
  const baselineTotal = baselineMale + baselineFemale;
  
  const adjustedMale = adjusted.male.reduce((sum, v) => sum + v, 0);
  const adjustedFemale = adjusted.female.reduce((sum, v) => sum + v, 0);
  const adjustedTotal = adjustedMale + adjustedFemale;
  
  const diff = adjustedTotal - baselineTotal;
  const pctChange = baselineTotal > 0 ? ((diff / baselineTotal) * 100) : 0;
  
  return {
    baseline: baselineTotal,
    adjusted: adjustedTotal,
    difference: diff,
    percentChange: pctChange.toFixed(2)
  };
}