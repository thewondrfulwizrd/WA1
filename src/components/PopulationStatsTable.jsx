import React, { useMemo } from 'react';
import { getPopulationByYear } from '../utils/populationHelpers';
import { applyScenarios } from '../utils/scenarioCalculations';
import './PopulationStatsTable.css';

const BASELINE_MIGRATION = 400000;
const BASELINE_FERTILITY = 1.5;
const BASELINE_MORTALITY = 75;
const BIRTHS_PER_TFR = 200000; // Approximate multiplier for TFR to births
const DEATHS_PER_MORTALITY = 300000; // Approximate multiplier for mortality rate

export function PopulationStatsTable({ data, scenarios, selectedYear }) {
  const tableData = useMemo(() => {
    if (!data) return [];

    // Show every 5 years for readability
    const years = [...data.yearsObserved, ...data.yearsProjected].filter(y => y % 5 === 0);
    
    let previousTotal = null;
    
    return years.map((year, index) => {
      const population = applyScenarios(data, scenarios, year);
      const maleTotal = population.male.reduce((sum, val) => sum + val, 0);
      const femaleTotal = population.female.reduce((sum, val) => sum + val, 0);
      const total = maleTotal + femaleTotal;

      // Calculate growth
      let nominalGrowth = 0;
      let percentGrowth = 0;
      if (previousTotal !== null) {
        nominalGrowth = total - previousTotal;
        percentGrowth = ((nominalGrowth / previousTotal) * 100) / 5; // Per year average
      }

      // Estimate demographic indicators based on scenario adjustments
      const adjustedFertility = BASELINE_FERTILITY * (1 + scenarios.fertility / 100);
      const adjustedMortality = BASELINE_MORTALITY * (1 + scenarios.mortality / 100);
      const adjustedMigration = Math.round(BASELINE_MIGRATION * (1 + scenarios.migration / 100));
      
      const births = Math.round(total * (adjustedFertility / 1000));
      const deaths = Math.round(total * (adjustedMortality / 1000));
      const naturalIncrease = births - deaths;
      const netMigration = adjustedMigration;

      previousTotal = total;

      return {
        year,
        population: total,
        nominalGrowth,
        percentGrowth,
        births,
        deaths,
        naturalIncrease,
        netMigration
      };
    });
  }, [data, scenarios]);

  if (!tableData.length) return null;

  const isHistorical = selectedYear <= data.lastObservedYear;

  return (
    <div className="population-stats-table-container">
      <h3>📊 Demographic Statistics (Every 5 Years)</h3>
      <div className="table-wrapper">
        <table className="population-stats-table">
          <thead>
            <tr>
              <th>Year</th>
              <th>Total Population</th>
              <th>Nominal Growth</th>
              <th>% Growth (annual)</th>
              <th>Births</th>
              <th>Deaths</th>
              <th>Natural Increase</th>
              <th>Net Migration</th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((row) => (
              <tr key={row.year} className={`${row.year === selectedYear ? 'highlighted' : ''} ${row.year <= data.lastObservedYear ? 'historical' : 'projected'}`}>
                <td className="year-cell">
                  <span className="year-value">{row.year}</span>
                  {row.year === selectedYear && <span className="current-badge">◄ Current</span>}
                </td>
                <td className="number-cell">
                  {(row.population / 1000000).toFixed(2)}M
                </td>
                <td className={`number-cell growth-cell ${row.nominalGrowth >= 0 ? 'positive' : 'negative'}`}>
                  {row.nominalGrowth > 0 ? '+' : ''}{(row.nominalGrowth / 1000).toFixed(0)}K
                </td>
                <td className={`number-cell growth-cell ${row.percentGrowth >= 0 ? 'positive' : 'negative'}`}>
                  {row.percentGrowth > 0 ? '+' : ''}{row.percentGrowth.toFixed(2)}%
                </td>
                <td className="number-cell">
                  {(row.births / 1000).toFixed(0)}K
                </td>
                <td className="number-cell">
                  {(row.deaths / 1000).toFixed(0)}K
                </td>
                <td className={`number-cell ${row.naturalIncrease >= 0 ? 'positive' : 'negative'}`}>
                  {row.naturalIncrease > 0 ? '+' : ''}{(row.naturalIncrease / 1000).toFixed(0)}K
                </td>
                <td className="number-cell migration-cell">
                  {row.netMigration > 0 ? '+' : ''}{(row.netMigration / 1000).toFixed(0)}K
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="table-notes">
        <p>
          <strong>Notes:</strong> 
          Births, deaths, and migration are calculated based on baseline demographic rates adjusted by scenario parameters. 
          Historical data (2000-{data.lastObservedYear}) uses actual Statistics Canada figures. 
          Projected data ({data.yearsProjected[0]}-{data.lastProjectedYear}) shows calculated estimates with current scenario adjustments.
        </p>
      </div>
    </div>
  );
}