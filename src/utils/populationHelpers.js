// Get population for a specific year
export function getPopulationByYear(data, year) {
  if (year <= data.lastObservedYear) {
    // For observed years, access from 'observed' object
    if (data.observed && data.observed[year.toString()]) {
      return data.observed[year.toString()];
    }
  } else {
    // For projected years, access from 'projected' object
    if (data.projected && data.projected[year.toString()]) {
      return data.projected[year.toString()];
    }
  }
  
  // Fallback in case year not found
  console.warn(`Population data not found for year ${year}`);
  return null;
}

// Calculate total population for a specific year
export function getTotalPopulation(data, year) {
  const population = getPopulationByYear(data, year);
  
  if (!population) {
    return null;
  }
  
  const maleTotal = population.male.reduce((sum, val) => sum + val, 0);
  const femaleTotal = population.female.reduce((sum, val) => sum + val, 0);
  
  return {
    male: maleTotal,
    female: femaleTotal,
    total: maleTotal + femaleTotal
  };
}

// Determine if a year is observed or projected
export function getYearType(data, year) {
  return year <= data.lastObservedYear ? 'observed' : 'projected';
}

// Format population numbers for display
export function formatPopulation(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}