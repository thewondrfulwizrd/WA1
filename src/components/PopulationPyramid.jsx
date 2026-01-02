import React, { useState } from 'react';
import { usePopulationData } from '../hooks/usePopulationData';
import { getYearType, formatPopulation } from '../utils/populationHelpers';
import { applyScenarios } from '../utils/scenarioCalculations';
import { ScenarioControls } from './ScenarioControls';
import { PopulationTrendChart } from './PopulationTrendChart';
import { PopulationStatsTable } from './PopulationStatsTable';
import './PopulationPyramid.css';

export function PopulationPyramid() {
  const { data, loading, error } = usePopulationData();
  const [selectedYear, setSelectedYear] = useState(2025);
  const [scenarios, setScenarios] = useState({
    fertility: 0,
    mortality: 0,
    migration: 0
  });

  if (loading) return <div>Loading population data...</div>;
  if (error) return <div>Error loading data: {error.message}</div>;
  if (!data) return null;

  // Get population data with scenario adjustments
  const population = applyScenarios(data, scenarios, selectedYear);
  
  // Calculate totals from adjusted population
  const totals = {
    male: population.male.reduce((sum, val) => sum + val, 0),
    female: population.female.reduce((sum, val) => sum + val, 0)
  };
  totals.total = totals.male + totals.female;
  
  const yearType = getYearType(data, selectedYear);
  const isHistorical = yearType === 'observed';
  const ages = data.ages;

  const maxPop = Math.max(
    ...population.male,
    ...population.female
  );

  const handleScenarioChange = (type, value) => {
    setScenarios(prev => ({
      ...prev,
      [type]: value
    }));
  };

  const handleReset = () => {
    setScenarios({
      fertility: 0,
      mortality: 0,
      migration: 0
    });
  };

  return (
    <div className="population-pyramid">
      <h1>Canada Population Growth Model, 2025-2100</h1>
      
      {/* Year Selector */}
      <div className="controls">
        <label>
          Year: {selectedYear}
          <span className={`year-badge ${yearType}`}>
            {yearType === 'observed' ? '📈 Historical' : '🔮 Projected'}
          </span>
        </label>
        <input
          type="range"
          min={data.yearsObserved[0]}
          max={data.lastProjectedYear}
          value={selectedYear}
          step={1}
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
        />
        <div className="year-labels">
          <span>{data.yearsObserved[0]}</span>
          <span style={{ position: 'absolute', left: '25%' }}>{data.lastObservedYear}</span>
          <span>{data.lastProjectedYear}</span>
        </div>
      </div>

      {/* Timeline Indicator */}
      <div className="timeline-indicator">
        <div className="timeline-bar">
          <div 
            className="observed-section" 
            style={{ width: `${((data.lastObservedYear - data.yearsObserved[0]) / (data.lastProjectedYear - data.yearsObserved[0])) * 100}%` }}
          >
            <span>Historical Data</span>
          </div>
          <div className="projected-section">
            <span>Projected</span>
          </div>
        </div>
      </div>

      {/* Scenario Controls - Always visible */}
      <ScenarioControls
        scenarios={scenarios}
        onScenarioChange={handleScenarioChange}
        onReset={handleReset}
        isHistorical={isHistorical}
      />

      {/* Population Trend Chart */}
      <PopulationTrendChart data={data} scenarios={scenarios} selectedYear={selectedYear} />

      {/* Section Divider */}
      <div className="section-divider"></div>

      {/* Population Pyramid Section */}
      <div className="pyramid-section">
        <h2 className="section-heading">📊 Population Pyramid</h2>
        
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
          {[...ages].reverse().map((ageGroup, reversedIndex) => {
            const index = ages.length - 1 - reversedIndex;
            const malePop = population.male[index];
            const femalePop = population.female[index];
            const malePercent = (malePop / maxPop) * 100;
            const femalePercent = (femalePop / maxPop) * 100;

            return (
              <div key={ageGroup} className="pyramid-row">
                <div className="male-container">
                  <span className="pop-value male-value">{formatPopulation(malePop)}</span>
                  <div className="bar-wrapper male-wrapper">
                    <div 
                      className="bar male-bar"
                      style={{ width: `${malePercent}%` }}
                      title={`Males ${ageGroup}: ${malePop.toLocaleString()}`}
                    />
                  </div>
                </div>
                
                <div className="age-label">{ageGroup}</div>
                
                <div className="female-container">
                  <div className="bar-wrapper female-wrapper">
                    <div 
                      className="bar female-bar"
                      style={{ width: `${femalePercent}%` }}
                      title={`Females ${ageGroup}: ${femalePop.toLocaleString()}`}
                    />
                  </div>
                  <span className="pop-value female-value">{formatPopulation(femalePop)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section Divider */}
      <div className="section-divider"></div>

      {/* Population Statistics Table */}
      <PopulationStatsTable data={data} scenarios={scenarios} selectedYear={selectedYear} />
    </div>
  );
}