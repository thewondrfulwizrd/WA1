import React, { useState, useEffect } from 'react';
import { applyScenarios } from '../utils/scenarioCalculations';
import { getMortalityRates, loadMortalityRates } from '../utils/mortalityRates';
import { getMigrationDistribution, loadMigrationDistribution } from '../utils/migrationDistribution';
import { loadHistoricalMigration, loadHistoricalBirths, loadHistoricalDeaths } from '../utils/historicalDataLoader';
import './DebugTable.css';

export function DebugTable({ data, scenarios, visible }) {
  const [debugData, setDebugData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [historicalMigration, setHistoricalMigration] = useState({});
  const [historicalBirths, setHistoricalBirths] = useState({});
  const [historicalDeaths, setHistoricalDeaths] = useState({});

  // Load historical data
  useEffect(() => {
    async function loadHistoricalData() {
      const [migration, births, deaths] = await Promise.all([
        loadHistoricalMigration(),
        loadHistoricalBirths(),
        loadHistoricalDeaths()
      ]);
      setHistoricalMigration(migration);
      setHistoricalBirths(births);
      setHistoricalDeaths(deaths);
    }
    loadHistoricalData();
  }, []);

  useEffect(() => {
    async function computeDebugData() {
      if (!visible || !data) return;
      
      setLoading(true);
      try {
        await loadMortalityRates();
        await loadMigrationDistribution();
        
        const mortalityRates = getMortalityRates();
        const migrationDist = getMigrationDistribution();
        const mortalityMultiplier = 1 + scenarios.mortality / 100;
        const migrationMultiplier = 1 + scenarios.migration / 100;
        const baseNetMigration = 400000;
        const adjustedNetMigration = Math.round(baseNetMigration * migrationMultiplier);

        const years = [2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035];
        const breakdown = [];
        const populationByYear = {}; // Store populations for calculating annual change

        for (const year of years) {
          const population = await applyScenarios(data, scenarios, year);
          if (!population) continue;

          const isHistorical = year <= data.lastObservedYear;

          // Store population data for this year
          populationByYear[year] = {
            cohorts: [],
            total: 0
          };

          // Calculate totals
          const maleTotal = population.male.reduce((sum, val) => sum + val, 0);
          const femaleTotal = population.female.reduce((sum, val) => sum + val, 0);
          const total = maleTotal + femaleTotal;
          populationByYear[year].total = total;

          // Calculate deaths and net migration
          let totalDeaths = 0;
          let totalNetMigration = 0;

          if (isHistorical) {
            // Use actual historical data
            totalDeaths = historicalDeaths[year] || 0;
            totalNetMigration = Math.round(historicalMigration[year] || 0);
          } else {
            // Calculate for projected years
            for (let i = 0; i < 21; i++) {
              const malePop = population.male[i];
              const femalePop = population.female[i];
              const maleMortalityRate = (mortalityRates.male[i] || 8.0) * mortalityMultiplier;
              const femaleMortalityRate = (mortalityRates.female[i] || 8.0) * mortalityMultiplier;
              const maleDeaths = Math.round(malePop * maleMortalityRate / 1000);
              const femaleDeaths = Math.round(femalePop * femaleMortalityRate / 1000);
              totalDeaths += maleDeaths + femaleDeaths;
            }
            totalNetMigration = adjustedNetMigration;
          }

          const globalMortalityRate = total > 0 ? (totalDeaths / total) * 1000 : 0;

          // Calculate annual change for "All ages"
          const previousYear = year - 1;
          const annualChange = populationByYear[previousYear] 
            ? total - populationByYear[previousYear].total
            : null; // null for first year

          // Add "All ages" row
          breakdown.push({
            year,
            age: 'All ages',
            population: total,
            mortalityRate: globalMortalityRate,
            deaths: totalDeaths,
            netMigration: totalNetMigration,
            annualChange,
            isHistorical
          });

          // Add rows for each age group
          data.ages.forEach((ageGroup, i) => {
            const malePop = population.male[i] || 0;
            const femalePop = population.female[i] || 0;
            const cohortPop = malePop + femalePop;

            // Store cohort population
            populationByYear[year].cohorts[i] = cohortPop;

            // Calculate mortality rate and deaths for this cohort
            let cohortDeaths = 0;
            let avgMortalityRate = 0;

            if (isHistorical) {
              // For historical years, we can't break down deaths by age group from aggregate data
              // So we show proportional estimates based on mortality rates
              const maleMortalityRate = mortalityRates.male[i] || 8.0;
              const femaleMortalityRate = mortalityRates.female[i] || 8.0;
              avgMortalityRate = cohortPop > 0 
                ? ((malePop * maleMortalityRate) + (femalePop * femaleMortalityRate)) / cohortPop
                : (maleMortalityRate + femaleMortalityRate) / 2;
              cohortDeaths = Math.round(cohortPop * avgMortalityRate / 1000);
            } else {
              // For projected years, use adjusted rates
              const maleMortalityRate = (mortalityRates.male[i] || 8.0) * mortalityMultiplier;
              const femaleMortalityRate = (mortalityRates.female[i] || 8.0) * mortalityMultiplier;
              avgMortalityRate = cohortPop > 0 
                ? ((malePop * maleMortalityRate) + (femalePop * femaleMortalityRate)) / cohortPop
                : (maleMortalityRate + femaleMortalityRate) / 2;
              cohortDeaths = Math.round(cohortPop * avgMortalityRate / 1000);
            }

            // Calculate net migration for this cohort
            let cohortMigration = 0;
            if (isHistorical) {
              // For historical years, distribute total migration by age-gender shares
              const totalHistoricalMigration = historicalMigration[year] || 0;
              const maleMigration = Math.round(totalHistoricalMigration * migrationDist.male[i]);
              const femaleMigration = Math.round(totalHistoricalMigration * migrationDist.female[i]);
              cohortMigration = maleMigration + femaleMigration;
            } else {
              // For projected years, use scenario-adjusted migration
              const maleMigration = Math.round(adjustedNetMigration * migrationDist.male[i]);
              const femaleMigration = Math.round(adjustedNetMigration * migrationDist.female[i]);
              cohortMigration = maleMigration + femaleMigration;
            }

            // Calculate annual change for this cohort
            const cohortAnnualChange = populationByYear[previousYear] && populationByYear[previousYear].cohorts[i] !== undefined
              ? cohortPop - populationByYear[previousYear].cohorts[i]
              : null; // null for first year

            breakdown.push({
              year,
              age: ageGroup,
              population: cohortPop,
              mortalityRate: avgMortalityRate,
              deaths: cohortDeaths,
              netMigration: cohortMigration,
              annualChange: cohortAnnualChange,
              isHistorical
            });
          });
        }

        setDebugData(breakdown);
      } catch (error) {
        console.error('Error computing debug data:', error);
        setDebugData([]);
      } finally {
        setLoading(false);
      }
    }

    computeDebugData();
  }, [visible, data, scenarios, historicalMigration, historicalBirths, historicalDeaths]);

  if (!visible) return null;
  if (loading) return <div className="debug-table-container">Loading debug data...</div>;
  if (!debugData.length) return null;

  return (
    <div className="debug-table-container">
      <h2 className="debug-heading">🔍 Projection Breakdown (2020-2035)</h2>
      <div className="table-description">
        Historical years (2020-2025) use actual Statistics Canada data. 
        Projected years (2026-2035) use scenario-adjusted calculations.
      </div>
      <div className="debug-table-wrapper">
        <table className="debug-table">
          <thead>
            <tr>
              <th>Year</th>
              <th>Age</th>
              <th>Population</th>
              <th>Mortality Rate</th>
              <th>Deaths</th>
              <th>Net Migration</th>
              <th>Annual Change</th>
            </tr>
          </thead>
          <tbody>
            {debugData.map((row, index) => (
              <tr key={index} className={`${row.age === 'All ages' ? 'total-row' : ''} ${row.isHistorical ? 'historical' : 'projected'}`}>
                <td>{row.year}</td>
                <td>{row.age}</td>
                <td className="number-cell">{row.population.toLocaleString()}</td>
                <td className="number-cell">{row.mortalityRate.toFixed(row.age === 'All ages' ? 5 : 3)}</td>
                <td className="number-cell">{row.deaths.toLocaleString()}</td>
                <td className="number-cell">{row.netMigration.toLocaleString()}</td>
                <td className="number-cell change-cell">
                  {row.annualChange === null ? '—' : (
                    <span className={row.annualChange >= 0 ? 'positive-change' : 'negative-change'}>
                      {row.annualChange >= 0 ? '+' : ''}{row.annualChange.toLocaleString()}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {/* Add demarcation line between 2025 and 2026 */}
            {debugData.find(row => row.year === 2025 && row.age === '100 years and older') && (
              <tr className="demarcation-row">
                <td colSpan="7">
                  <div className="demarcation-line">
                    <span className="demarcation-label">Historical Data Ends / Projections Begin</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}