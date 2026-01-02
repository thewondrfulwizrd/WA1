import { getPopulationByYear, getYearType } from './populationHelpers';

// Apply scenario adjustments to population data
export function applyScenarios(data, scenarios, year) {
  const yearType = getYearType(data, year);
  
  if (yearType === 'observed') {
    // Don't modify historical data
    return getPopulationByYear(data, year);
  }

  // Get baseline population for this year
  const baseline = getPopulationByYear(data, year);
  
  // Calculate years into projection
  const yearsIntoProjection = year - data.lastObservedYear;
  
  // Apply cumulative effects (scenarios compound over time)
  const fertilityMultiplier = 1 + (scenarios.fertility / 100) * (yearsIntoProjection / 10);
  const mortalityMultiplier = 1 + (scenarios.mortality / 100) * (yearsIntoProjection / 10);
  const migrationMultiplier = 1 + (scenarios.migration / 100) * (yearsIntoProjection / 5);
  
  // Adjust population by age group
  const adjustedMale = baseline.male.map((pop, ageIndex) => {
    let adjusted = pop;
    
    // Fertility affects younger age groups more (0-4 years)
    if (ageIndex === 0) {
      adjusted *= fertilityMultiplier;
    }
    
    // Mortality affects older age groups more (65+)
    if (ageIndex >= 13) {
      adjusted *= mortalityMultiplier;
    }
    
    // Migration affects working-age population more (20-64)
    if (ageIndex >= 4 && ageIndex <= 12) {
      adjusted *= migrationMultiplier;
    }
    
    return Math.round(adjusted);
  });
  
  const adjustedFemale = baseline.female.map((pop, ageIndex) => {
    let adjusted = pop;
    
    if (ageIndex === 0) {
      adjusted *= fertilityMultiplier;
    }
    
    if (ageIndex >= 13) {
      adjusted *= mortalityMultiplier;
    }
    
    if (ageIndex >= 4 && ageIndex <= 12) {
      adjusted *= migrationMultiplier;
    }
    
    return Math.round(adjusted);
  });
  
  return {
    male: adjustedMale,
    female: adjustedFemale
  };
}
