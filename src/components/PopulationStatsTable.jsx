import React, { useMemo } from 'react';
import { getPopulationByYear } from '../utils/populationHelpers';
import { applyScenarios } from '../utils/scenarioCalculations';
import './PopulationStatsTable.css';

const BASELINE_MIGRATION = 400000;
const BASELINE_FERTILITY = 1.5;
const BASELINE_MORTALITY = 8.0; // Deaths per 1000 population (realistic rate for Canada)

export function PopulationStatsTable({ data, scenarios, selectedYear }) {
  const tableData = useMemo(() => {
    if (!data) return [];

    // Show EVERY year instead of every 5 years
    const years = [...data.yearsObserved, ...data.yearsProjected];
    
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
        percentGrowth = (nominalGrowth / previousTotal) * 100; // Per year
      }

      // Estimate demographic indicators based on scenario adjustments
      const adjustedFertility = BASELINE_FERTILITY * (1 + scenarios.fertility / 100);
      const adjustedMortality = BASELINE_MORTALITY * (1 - scenarios.mortality / 100); // Lower is better
      const adjustedMigration = Math.round(BASELINE_MIGRATION * (1 + scenarios.migration / 100));
      
      // Calculate births and deaths based on population and rates
      const births = Math.round((total / 1000) * (adjustedFertility * 6.67)); // TFR to crude birth rate approximation
      const deaths = Math.round((total / 1000) * adjustedMortality); // Deaths per 1000
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

  return (
    <div className="population-stats-table-container">
      <h2 className="section-heading">📊 Components of Population Growth</h2>
      <div className="table-description">
        Showing data for every year from {data.yearsObserved[0]} to {data.lastProjectedYear}. 
        Historical data ({data.yearsObserved[0]}-{data.lastObservedYear}) uses actual Statistics Canada figures. 
        Projected data ({data.yearsProjected[0]}-{data.lastProjectedYear}) shows calculated estimates with current scenario adjustments.
      </div>
      
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
              <React.Fragment key={row.year}>
                <tr className={`${row.year === selectedYear ? 'highlighted' : ''} ${row.year <= data.lastObservedYear ? 'historical' : 'projected'}`}>
                  <td className="year-cell">
                    <span className="year-value">{row.year}</span>
                    {row.year === selectedYear && <span className="current-badge">◄ Current</span>}
                  </td>
                  <td className="number-cell population-cell">
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
                {/* Add demarcation line between 2025 and 2026 */}
                {row.year === 2025 && (
                  <tr className="demarcation-row">
                    <td colSpan="8">
                      <div className="demarcation-line">
                        <span className="demarcation-label">Historical Data Ends / Projections Begin</span>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}