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
  const width = 1000;
  const height = 300;
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Create points for the line
  const points = chartData.map((d, i) => {
    const x = padding.left + (i / (chartData.length - 1)) * chartWidth;
    const y = padding.top + chartHeight - ((d.total - minPop) / popRange) * chartHeight;
    return { x, y, year: d.year, total: d.total };
  });

  // Create SVG path for the line
  const linePath = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;
  
  // Create area fill path
  const areaPath = `M ${padding.left},${padding.top + chartHeight} L ${points.map(p => `${p.x},${p.y}`).join(' L ')} L ${padding.left + chartWidth},${padding.top + chartHeight} Z`;

  // Find the transition point between observed and projected
  const transitionIndex = chartData.findIndex(d => d.year === data.lastObservedYear);
  const transitionX = padding.left + (transitionIndex / (chartData.length - 1)) * chartWidth;

  // Highlight current year
  const currentIndex = chartData.findIndex(d => d.year === selectedYear);
  const currentPoint = points[currentIndex];
  const currentPopulation = chartData[currentIndex]?.total;
  
  // Calculate population at base year (2025)
  const baseYearIndex = chartData.findIndex(d => d.year === 2025);
  const baseYearPopulation = chartData[baseYearIndex]?.total || currentPopulation;
  
  // Calculate change from 2025
  let changeFrom2025 = '-';
  if (selectedYear >= 2025) {
    const change = ((currentPopulation - baseYearPopulation) / baseYearPopulation) * 100;
    changeFrom2025 = `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
  }

  // Y-axis labels
  const yAxisLabels = [];
  for (let i = 0; i <= 4; i++) {
    const value = minPop + (popRange * i / 4);
    const y = padding.top + chartHeight - (chartHeight * i / 4);
    yAxisLabels.push({ value, y });
  }

  // X-axis labels (every 25 years)
  const xAxisLabels = [];
  for (let year = 2000; year <= 2100; year += 25) {
    const index = chartData.findIndex(d => d.year === year);
    if (index >= 0) {
      const x = padding.left + (index / (chartData.length - 1)) * chartWidth;
      xAxisLabels.push({ year, x });
    }
  }

  return (
    <div className="population-trend-chart">
      <div className="chart-container">
        <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
          <defs>
            {/* Gradient for area fill */}
            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1976d2" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#1976d2" stopOpacity="0.05" />
            </linearGradient>
            
            {/* Gradient for the line */}
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1976d2" />
              <stop offset={`${(transitionX / width) * 100}%`} stopColor="#1976d2" />
              <stop offset={`${(transitionX / width) * 100}%`} stopColor="#7b1fa2" />
              <stop offset="100%" stopColor="#7b1fa2" />
            </linearGradient>
            
            {/* Shadow filter */}
            <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
              <feOffset dx="0" dy="2" result="offsetblur"/>
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.3"/>
              </feComponentTransfer>
              <feMerge>
                <feMergeNode/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Grid lines */}
          {yAxisLabels.map((label, i) => (
            <line
              key={i}
              x1={padding.left}
              y1={label.y}
              x2={padding.left + chartWidth}
              y2={label.y}
              className="grid-line"
            />
          ))}

          {/* Observed/Projected divider */}
          <line
            x1={transitionX}
            y1={padding.top}
            x2={transitionX}
            y2={padding.top + chartHeight}
            className="divider-line"
          />
          <text
            x={transitionX}
            y={padding.top - 5}
            className="divider-label"
            textAnchor="middle"
          >
            {data.lastObservedYear}
          </text>

          {/* Area fill */}
          <path
            d={areaPath}
            fill="url(#areaGradient)"
            className="area-fill"
          />

          {/* Trend line */}
          <path
            d={linePath}
            fill="none"
            stroke="url(#lineGradient)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="trend-line"
            filter="url(#shadow)"
          />

          {/* Current year indicator */}
          {currentPoint && (
            <>
              <line
                x1={currentPoint.x}
                y1={padding.top}
                x2={currentPoint.x}
                y2={padding.top + chartHeight}
                className="current-year-line"
              />
              <circle
                cx={currentPoint.x}
                cy={currentPoint.y}
                r="6"
                className="current-year-point"
              />
              <circle
                cx={currentPoint.x}
                cy={currentPoint.y}
                r="4"
                fill="white"
              />
              {/* Year label beside the line on the chart */}
              <text
                x={currentPoint.x + 10}
                y={padding.top + chartHeight + 20}
                className="current-year-label"
                textAnchor="start"
              >
                {selectedYear}
              </text>
            </>
          )}

          {/* Y-axis */}
          <line
            x1={padding.left}
            y1={padding.top}
            x2={padding.left}
            y2={padding.top + chartHeight}
            className="axis-line"
          />

          {/* Y-axis labels */}
          {yAxisLabels.map((label, i) => (
            <text
              key={i}
              x={padding.left - 10}
              y={label.y + 4}
              className="axis-label"
              textAnchor="end"
            >
              {(label.value / 1000000).toFixed(0)}M
            </text>
          ))}

          {/* X-axis */}
          <line
            x1={padding.left}
            y1={padding.top + chartHeight}
            x2={padding.left + chartWidth}
            y2={padding.top + chartHeight}
            className="axis-line"
          />

          {/* X-axis labels */}
          {xAxisLabels.map((label, i) => (
            <text
              key={i}
              x={label.x}
              y={padding.top + chartHeight + 20}
              className="axis-label"
              textAnchor="middle"
            >
              {label.year}
            </text>
          ))}

          {/* Y-axis title */}
          <text
            x={20}
            y={height / 2}
            className="axis-title"
            textAnchor="middle"
            transform={`rotate(-90, 20, ${height / 2})`}
          >
            Population
          </text>

          {/* X-axis title */}
          <text
            x={width / 2}
            y={height - 5}
            className="axis-title"
            textAnchor="middle"
          >
            Year
          </text>
        </svg>
      </div>

      {/* Simplified footer with population and change */}
      <div className="chart-footer-simple">
        <div className="population-display">
          <div className="population-main">
            {(currentPopulation / 1000000).toFixed(2)}M
          </div>
          <div className="population-label">Population in {selectedYear}</div>
        </div>
        <div className="change-display">
          <div className="change-value" style={{ color: changeFrom2025 === '-' ? '#666' : (changeFrom2025.startsWith('+') ? '#2e7d32' : '#c62828') }}>
            {changeFrom2025}
          </div>
          <div className="change-label">Change from 2025</div>
        </div>
      </div>
    </div>
  );
}