// Get population for a specific year
export function getPopulationByYear(data, year) {
  if (year <= data.lastObservedYear) {
    const yearIndex = data.yearsObserved.indexOf(year);
    return {
      male: data.populationObserved.male[yearIndex],
      female: data.populationObserved.female[yearIndex]
    };
  } else {
    const yearIndex = data.yearsProjected.indexOf(year);
    return {
      male: data.populationProjected.male[yearIndex],
      female: data.populationProjected.female[yearIndex]
    };
  }
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
