import React, { useState, useEffect } from 'react';
import { usePopulationData } from '../hooks/usePopulationData';
import { getYearType, formatPopulation } from '../utils/populationHelpers';
import { applyScenarios } from '../utils/scenarioCalculations';
import { ScenarioControls } from './ScenarioControls';
import { PopulationTrendChart } from './PopulationTrendChart';
import { PopulationStatsTable } from './PopulationStatsTable';
import { YearSlider } from './YearSlider';
import { DebugTable } from './DebugTable';
import './PopulationPyramid.css';
import './DebugTable.css';

/**
 * Calculate baseline mortality rate for a given year
 * Mortality rate = (deaths in that year / population in that year) * 1000
 * 
 * For observed years: use reported deaths from data
 * For projected years: calculate from projection
 */
function calculateBaselineMortality(data, year) {
  if (!data) return 7.5; // Default fallback
  
  // Check if this is an observed year
  if (data.observed && data.observed[year]) {
    const yearData = data.observed[year];
    if (yearData.deaths !== undefined && yearData.population !== undefined) {
      return (yearData.deaths / yearData.population) * 1000;
    }
  }
  
  // For projected years, we'd need the projection data
  // For now, use approximation based on age structure
  // Canada's baseline mortality: ~7-8 per 1000
  return 7.5; // Default Canada baseline
}

export function PopulationPyramid() {
  const { data, loading, error } = usePopulationData();
  const [selectedYear, setSelectedYear] = useState(2025);
  const [scenarios, setScenarios] = useState({
    fertility: 0,
    mortality: 0,
    migration: 0
  });
  const [population, setPopulation] = useState({ male: [], female: [] });
  const [projectionLoading, setProjectionLoading] = useState(false);
  const [showDebugTable, setShowDebugTable] = useState(false);
  const [baselineMortality, setBaselineMortality] = useState(7.5);

  // Compute population when year or scenarios change
  useEffect(() => {
    async function computePopulation() {
      if (!data) return;
      setProjectionLoading(true);
      try {
        const result = await applyScenarios(data, scenarios, selectedYear);
        setPopulation(result || { male: [], female: [] });
        
        // Calculate baseline mortality for this year
        const baseline = calculateBaselineMortality(data, selectedYear);
        setBaselineMortality(baseline);
      } catch (err) {
        console.error('Error computing population:', err);
        setPopulation({ male: [], female: [] });
      } finally {
        setProjectionLoading(false);
      }
    }
    computePopulation();
  }, [data, scenarios, selectedYear]);

  if (loading) return <div>Loading population data...</div>;
  if (error) return <div>Error loading data: {error.message}</div>;
  if (!data) return null;

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
    ...population.female,
    1 // Prevent max from being 0
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
      {/* Canadian Flag Image */}
      <div className="canada-flag">
        <img src="/canadaflag1.png" alt="Canada Flag" />
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
        baselineMortality={baselineMortality}
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
          {population.male && population.male.length > 0 ? (
            [...ages].reverse().map((ageGroup, reversedIndex) => {
              const index = ages.length - 1 - reversedIndex;
              const malePop = population.male[index] || 0;
              const femalePop = population.female[index] || 0;
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
            })
          ) : (
            <div>Loading pyramid...</div>
          )}
        </div>
      </div>

      {/* Section Divider */}
      <div className="section-divider"></div>

      {/* Second Year Selector - Between Pyramid and Stats */}
      <YearSlider data={data} selectedYear={selectedYear} onYearChange={setSelectedYear} yearType={yearType} />

      {/* Population Statistics Table */}
      <PopulationStatsTable data={data} scenarios={scenarios} selectedYear={selectedYear} />

      {/* Debug Button */}
      <button 
        className="debug-button"
        onClick={() => setShowDebugTable(!showDebugTable)}
      >
        {showDebugTable ? '🔼 Hide Debug Breakdown' : '🔽 Show Debug Breakdown'}
      </button>

      {/* Debug Table */}
      <DebugTable 
        data={data} 
        scenarios={scenarios} 
        visible={showDebugTable}
      />
    </div>
  );
}