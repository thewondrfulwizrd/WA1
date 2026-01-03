import React, { useState } from 'react';
import { usePopulationData } from '../hooks/usePopulationData';
import { getYearType, formatPopulation } from '../utils/populationHelpers';
import { applyScenarios } from '../utils/scenarioCalculations';
import { ScenarioControls } from './ScenarioControls';
import { PopulationTrendChart } from './PopulationTrendChart';
import { PopulationStatsTable } from './PopulationStatsTable';
import { YearSlider } from './YearSlider';
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
      {/* Canadian Flag SVG */}
      <div className="canada-flag">
        <svg viewBox="0 0 1000 500" xmlns="http://www.w3.org/2000/svg">
          <rect width="250" height="500" fill="#FF0000"/>
          <rect x="250" width="500" height="500" fill="#FFFFFF"/>
          <rect x="750" width="250" height="500" fill="#FF0000"/>
          <g transform="translate(500, 250)">
            <path d="M 0,-90 L -10,-40 L -50,-50 L -25,-25 L -30,10 L 0,-10 L 30,10 L 25,-25 L 50,-50 L 10,-40 Z" fill="#FF0000"/>
            <rect x="-7" y="-10" width="14" height="80" fill="#FF0000"/>
          </g>
        </svg>
      </div>
      
      <h1>Canada Population Growth Model, 2025-2100</h1>
      
      {/* Population Trend Chart - MOVED TO TOP */}
      <PopulationTrendChart data={data} scenarios={scenarios} selectedYear={selectedYear} onYearChange={setSelectedYear} />

      {/* First Year Selector */}
      <YearSlider data={data} selectedYear={selectedYear} onYearChange={setSelectedYear} yearType={yearType} />

      {/* Scenario Controls - Always visible */}
      <ScenarioControls
        scenarios={scenarios}
        onScenarioChange={handleScenarioChange}
        onReset={handleReset}
        isHistorical={isHistorical}
      />

      {/* Section Divider */}
      <div className="section-divider"></div>

      {/* Population Pyramid Section */}
      <div className="pyramid-section">
        {/* Large Year Display instead of heading */}
        <div className="pyramid-year-display">{selectedYear}</div>
        
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

      {/* Second Year Selector - Between Pyramid and Stats */}
      <YearSlider data={data} selectedYear={selectedYear} onYearChange={setSelectedYear} yearType={yearType} />

      {/* Population Statistics Table */}
      <PopulationStatsTable data={data} scenarios={scenarios} selectedYear={selectedYear} />
    </div>
  );
}