// src/components/PopulationPyramid.jsx
import React, { useState } from 'react';
import { usePopulationData } from '../hooks/usePopulationData';
import { getPopulationByYear, getTotalPopulation, getYearType, formatPopulation } from '../utils/populationHelpers';

export function PopulationPyramid() {
  const { data, loading, error } = usePopulationData();
  const [selectedYear, setSelectedYear] = useState(2025);

  if (loading) return <div>Loading population data...</div>;
  if (error) return <div>Error loading data: {error.message}</div>;
  if (!data) return null;

  const population = getPopulationByYear(data, selectedYear);
  const totals = getTotalPopulation(data, selectedYear);
  const yearType = getYearType(data, selectedYear);
  const ages = data.ages;

  // Find max population for scaling bars
  const maxPop = Math.max(
    ...population.male,
    ...population.female
  );

  return (
    <div className="population-pyramid">
      <h2>Canada Population Pyramid</h2>

      {/* Year Selector */}
      <div className="controls">
        <label>
          Year: {selectedYear}
          <span className={`year-badge ${yearType}`}>
            {yearType === 'observed' ? '📊 Historical' : '🔮 Projected'}
          </span>
        </label>
        <input
          type="range"
          min={data.yearsObserved}
          max={data.lastProjectedYear}
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
        />
        <div className="year-labels">
          <span>{data.yearsObserved}</span>
          <span>{data.lastObservedYear}</span>
          <span>{data.lastProjectedYear}</span>
        </div>
      </div>

      {/* Population Summary */}
      <div className="summary">
        <div className="stat">
          <span className="label">Male</span>
          <span className="value male">{formatPopulation(totals.male)}</span>
        </div>
        <div className="stat">
          <span className="label">Total</span>
          <span className="value total">{formatPopulation(totals.total)}</span>
        </div>
        <div className="stat">
          <span className="label">Female</span>
          <span className="value female">{formatPopulation(totals.female)}</span>
        </div>
      </div>

      {/* Pyramid Chart */}
      <div className="pyramid-chart">
        {ages.map((ageGroup, index) => {
          const malePop = population.male[index];
          const femalePop = population.female[index];
          const maleWidth = (malePop / maxPop) * 100;
          const femaleWidth = (femalePop / maxPop) * 100;

          return (
            <div key={ageGroup} className="pyramid-row">
              {/* Male bar (left side) */}
              <div className="male-side">
                <span className="pop-value">{formatPopulation(malePop)}</span>
                <div 
                  className="bar male-bar"
                  style={{ width: `${maleWidth}%` }}
                  title={`Males ${ageGroup}: ${malePop.toLocaleString()}`}
                />
              </div>

              {/* Age label (center) */}
              <div className="age-label">{ageGroup}</div>

              {/* Female bar (right side) */}
              <div className="female-side">
                <div 
                  className="bar female-bar"
                  style={{ width: `${femaleWidth}%` }}
                  title={`Females ${ageGroup}: ${femalePop.toLocaleString()}`}
                />
                <span className="pop-value">{formatPopulation(femalePop)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
