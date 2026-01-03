/**
 * Load and parse historical data from CSV files
 */

export async function loadHistoricalBirths() {
  try {
    const response = await fetch('/data/source/Base_Births.csv');
    const csv = await response.text();
    const lines = csv.trim().split('\n').slice(1); // Skip header
    
    const birthsByYear = {};
    lines.forEach(line => {
      // Parse CSV line, handling quoted fields
      const matches = line.match(/"([^"]*)"|[^,]+/g);
      if (!matches || matches.length < 11) return;
      
      const refDate = matches[0].replace(/"/g, '').trim();
      const genderField = matches[3].replace(/"/g, '').trim();
      const value = parseInt(matches[10].replace(/"/g, '').trim(), 10);
      
      // Extract year from "YYYY/YYYY" format
      const year = parseInt(refDate.split('/')[0]);
      
      // Only count "Total - gender" to avoid double-counting
      if (genderField === 'Total - gender') {
        birthsByYear[year] = value;
      }
    });
    
    return birthsByYear;
  } catch (error) {
    console.error('Error loading births data:', error);
    return {};
  }
}

export async function loadHistoricalDeaths() {
  try {
    const response = await fetch('/data/source/Base_Deaths.csv');
    const csv = await response.text();
    const lines = csv.trim().split('\n').slice(1); // Skip header
    
    const deathsByYear = {};
    lines.forEach(line => {
      const matches = line.match(/"([^"]*)"|[^,]+/g);
      if (!matches || matches.length < 11) return;
      
      const refDate = matches[0].replace(/"/g, '').trim();
      const genderField = matches[3].replace(/"/g, '').trim();
      const value = parseInt(matches[10].replace(/"/g, '').trim(), 10);
      
      const year = parseInt(refDate.split('/')[0]);
      
      // Only count "Total - gender" to avoid double-counting
      if (genderField === 'Total - gender') {
        deathsByYear[year] = value;
      }
    });
    
    return deathsByYear;
  } catch (error) {
    console.error('Error loading deaths data:', error);
    return {};
  }
}

export async function loadHistoricalMigration() {
  try {
    const response = await fetch('/data/source/Base_Migration.csv');
    const csv = await response.text();
    const lines = csv.trim().split('\n').slice(1); // Skip header
    
    const immigrationByYear = {};
    const nonPermByYear = {};
    const emigrationByYear = {};
    
    lines.forEach(line => {
      const matches = line.match(/"([^"]*)"|[^,]+/g);
      if (!matches || matches.length < 13) return;
      
      const refDate = matches[0].replace(/"/g, '').trim();
      const genderField = matches[3].replace(/"/g, '').trim();
      const migrationType = matches[4].replace(/"/g, '').trim();
      const ageGroup = matches[5].replace(/"/g, '').trim();
      const value = parseInt(matches[12].replace(/"/g, '').trim(), 10) || 0;
      
      const year = parseInt(refDate.split('/')[0]);
      
      // Only count "Total - gender" and "All ages" to get totals
      if (genderField !== 'Total - gender' || ageGroup !== 'All ages') return;
      
      if (!immigrationByYear[year]) immigrationByYear[year] = 0;
      if (!nonPermByYear[year]) nonPermByYear[year] = 0;
      if (!emigrationByYear[year]) emigrationByYear[year] = 0;
      
      if (migrationType === 'Immigrants') {
        immigrationByYear[year] += value;
      } else if (migrationType === 'Net non-permanent residents') {
        nonPermByYear[year] += value;
      } else if (migrationType === 'Net emigration') {
        emigrationByYear[year] += value;
      }
    });
    
    // Calculate net migration: Immigrants + Net non-permanent residents - Net emigration
    const netMigrationByYear = {};
    const allYears = new Set([
      ...Object.keys(immigrationByYear),
      ...Object.keys(nonPermByYear),
      ...Object.keys(emigrationByYear)
    ]);
    
    allYears.forEach(year => {
      const immigrants = immigrationByYear[year] || 0;
      const nonPerm = nonPermByYear[year] || 0;
      const emigration = emigrationByYear[year] || 0;
      netMigrationByYear[year] = immigrants + nonPerm - emigration;
    });
    
    return netMigrationByYear;
  } catch (error) {
    console.error('Error loading migration data:', error);
    return {};
  }
}