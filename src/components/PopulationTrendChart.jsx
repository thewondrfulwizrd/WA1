import React, { useMemo } from 'react';
import { getPopulationByYear, getTotalPopulation } from '../utils/populationHelpers';
import { applyScenarios } from '../utils/scenarioCalculations';
import './PopulationTrendChart.css';

export function PopulationTrendChart({ data, scenarios, selectedYear }) {
  const chartData = useMemo(() => {
    if (!data) return [];

    const years = [...data.yearsObserved, ...data.yearsProjected];
    return years.map(year => {
      const population = applyScenarios(data, scenarios, year);
      const maleTotal = population.male.reduce((sum, val) => sum + val, 0);
      const femaleTotal = population.female.reduce((sum, val) => sum + val, 0);
      const total = maleTotal + femaleTotal;
      return { year, total };
    });
  }, [data, scenarios]);

  if (!chartData.length) return null;

  // Find min and max for scaling
  const minPop = Math.min(...chartData.map(d => d.total));
  const maxPop = Math.max(...chartData.map(d => d.total));
  const popRange = maxPop - minPop;

  // Calculate chart dimensions
  const width = 100; // percent
  const height = 250; // pixels

  // Create SVG path for the line
  const points = chartData.map((d, i) => {
    const x = (i / (chartData.length - 1)) * width;
    const y = height - ((d.total - minPop) / popRange) * height;
    return `${x},${y}`;
  });

  const pathData = `M ${points.join(' L ')}`;

  // Highlight current year
  const currentIndex = chartData.findIndex(d => d.year === selectedYear);
  const currentX = (currentIndex / (chartData.length - 1)) * 100;

  return (
    <div className="population-trend-chart">
      <h3>📈 Population Trend (2000-2100)</h3>
      
      <div className="chart-container">
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
          {/* Grid lines */}
          <line x1="0" y1={height * 0.25} x2={width} y2={height * 0.25} className="grid-line" />
          <line x1="0" y1={height * 0.5} x2={width} y2={height * 0.5} className="grid-line" />
          <line x1="0" y1={height * 0.75} x2={width} y2={height * 0.75} className="grid-line" />

          {/* Observed/Projected divider */}
          <line
            x1={(data.lastObservedYear - data.yearsObserved[0]) / (data.lastProjectedYear - data.yearsObserved[0]) * width}
            y1="0"
            x2={(data.lastObservedYear - data.yearsObserved[0]) / (data.lastProjectedYear - data.yearsObserved[0]) * width}
            y2={height}
            className="divider-line"
          />

          {/* Population trend line */}
          <path d={pathData} className="trend-line" fill="none" />

          {/* Data point circles */}
          {chartData.map((d, i) => {
            const x = (i / (chartData.length - 1)) * width;
            const y = height - ((d.total - minPop) / popRange) * height;
            return (
              <circle
                key={d.year}
                cx={x}
                cy={y}
                r="1.5"
                className={d.year === selectedYear ? 'data-point active' : 'data-point'}
              />
            );
          })}

          {/* Current year indicator */}
          <line
            x1={currentX}
            y1="0"
            x2={currentX}
            y2={height}
            className="current-year-line"
          />
        </svg>
      </div>

      {/* Legend and labels */}
      <div className="chart-legend">
        <div className="legend-item">
          <span className="legend-label">Historical Data</span>
          <span className="legend-value">{data.yearsObserved[0]}-{data.lastObservedYear}</span>
        </div>
        <div className="legend-item">
          <span className="legend-label">Projected</span>
          <span className="legend-value">{data.yearsProjected[0]}-{data.lastProjectedYear}</span>
        </div>
        <div className="legend-item">
          <span className="legend-label">Current Year</span>
          <span className="legend-value">{selectedYear}</span>
        </div>
      </div>

      {/* Population range info */}
      <div className="chart-stats">
        <div className="stat-item">
          <span className="stat-label">Min Population</span>
          <span className="stat-value">{(minPop / 1000000).toFixed(1)}M</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Max Population</span>
          <span className="stat-value">{(maxPop / 1000000).toFixed(1)}M</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Total Change</span>
          <span className="stat-value">{((popRange / minPop) * 100).toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
}