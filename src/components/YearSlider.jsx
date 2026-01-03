import React from 'react';
import './YearSlider.css';

export function YearSlider({ data, selectedYear, onYearChange, yearType }) {
  // Generate year markers for every 10 years
  const yearMarkers = [];
  for (let year = 2000; year <= 2100; year += 10) {
    yearMarkers.push(year);
  }

  return (
    <div className="year-slider-component">
      <div className="year-slider-header">
        <label>
          Year: {selectedYear}
          <span className={`year-badge ${yearType}`}>
            {yearType === 'observed' ? '📈 Historical' : '🔮 Projected'}
          </span>
        </label>
      </div>
      
      <div className="slider-container">
        <input
          type="range"
          min={data.yearsObserved[0]}
          max={data.lastProjectedYear}
          value={selectedYear}
          step={1}
          onChange={(e) => onYearChange(parseInt(e.target.value))}
          list="year-markers"
        />
        <datalist id="year-markers">
          {yearMarkers.map(year => (
            <option key={year} value={year}></option>
          ))}
        </datalist>
      </div>
      
      <div className="year-labels">
        {yearMarkers.map(year => (
          <span key={year}>{year}</span>
        ))}
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
    </div>
  );
}