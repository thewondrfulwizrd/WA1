import React, { useState, useEffect } from 'react';
import { applyScenarios } from '../utils/scenarioCalculations';
import { getMortalityRates, loadMortalityRates } from '../utils/mortalityRates';
import { getMigrationDistribution, loadMigrationDistribution } from '../utils/migrationDistribution';
import './DebugTable.css';

export function DebugTable({ data, scenarios, visible }) {
  const [debugData, setDebugData] = useState([]);
  const [loading, setLoading] = useState(false);

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

        const years = [2026, 2027, 2028, 2029, 2030];
        const breakdown = [];

        for (const year of years) {
          const population = await applyScenarios(data, scenarios, year);
          if (!population) continue;

          // Calculate totals
          const maleTotal = population.male.reduce((sum, val) => sum + val, 0);
          const femaleTotal = population.female.reduce((sum, val) => sum + val, 0);
          const total = maleTotal + femaleTotal;

          // Calculate overall mortality rate and deaths
          let totalDeaths = 0;
          for (let i = 0; i < 21; i++) {
            const malePop = population.male[i];
            const femalePop = population.female[i];
            const maleMortalityRate = (mortalityRates.male[i] || 8.0) * mortalityMultiplier;
            const femaleMortalityRate = (mortalityRates.female[i] || 8.0) * mortalityMultiplier;
            const maleDeaths = Math.round(malePop * maleMortalityRate / 1000);
            const femaleDeaths = Math.round(femalePop * femaleMortalityRate / 1000);
            totalDeaths += maleDeaths + femaleDeaths;
          }
          const globalMortalityRate = total > 0 ? (totalDeaths / total) * 1000 : 0;

          // Add "All ages" row
          breakdown.push({
            year,
            age: 'All ages',
            population: total,
            mortalityRate: globalMortalityRate,
            deaths: totalDeaths,
            netMigration: adjustedNetMigration
          });

          // Add rows for each age group
          data.ages.forEach((ageGroup, i) => {
            const malePop = population.male[i] || 0;
            const femalePop = population.female[i] || 0;
            const cohortPop = malePop + femalePop;

            // Calculate average mortality rate for this cohort
            const maleMortalityRate = (mortalityRates.male[i] || 8.0) * mortalityMultiplier;
            const femaleMortalityRate = (mortalityRates.female[i] || 8.0) * mortalityMultiplier;
            const avgMortalityRate = cohortPop > 0 
              ? ((malePop * maleMortalityRate) + (femalePop * femaleMortalityRate)) / cohortPop
              : (maleMortalityRate + femaleMortalityRate) / 2;

            // Calculate deaths for this cohort
            const maleDeaths = Math.round(malePop * maleMortalityRate / 1000);
            const femaleDeaths = Math.round(femalePop * femaleMortalityRate / 1000);
            const cohortDeaths = maleDeaths + femaleDeaths;

            // Calculate net migration for this cohort
            const maleMigration = Math.round(adjustedNetMigration * migrationDist.male[i]);
            const femaleMigration = Math.round(adjustedNetMigration * migrationDist.female[i]);
            const cohortMigration = maleMigration + femaleMigration;

            breakdown.push({
              year,
              age: ageGroup,
              population: cohortPop,
              mortalityRate: avgMortalityRate,
              deaths: cohortDeaths,
              netMigration: cohortMigration
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
  }, [visible, data, scenarios]);

  if (!visible) return null;
  if (loading) return <div className="debug-table-container">Loading debug data...</div>;
  if (!debugData.length) return null;

  return (
    <div className="debug-table-container">
      <h2 className="debug-heading">🔍 Projection Breakdown (2026-2030)</h2>
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
            </tr>
          </thead>
          <tbody>
            {debugData.map((row, index) => (
              <tr key={index} className={row.age === 'All ages' ? 'total-row' : ''}>
                <td>{row.year}</td>
                <td>{row.age}</td>
                <td className="number-cell">{row.population.toLocaleString()}</td>
                <td className="number-cell">{row.mortalityRate.toFixed(row.age === 'All ages' ? 5 : 3)}</td>
                <td className="number-cell">{row.deaths.toLocaleString()}</td>
                <td className="number-cell">{row.netMigration.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}