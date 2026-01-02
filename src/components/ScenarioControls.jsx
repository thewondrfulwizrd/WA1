import React from 'react';
import './ScenarioControls.css';

export function ScenarioControls({ scenarios, onScenarioChange, onReset }) {
  return (
    <div className="scenario-controls">
      <div className="scenario-header">
        <h3>📊 Scenario Builder</h3>
        <button className="reset-button" onClick={onReset}>
          Reset to Baseline
        </button>
      </div>

      <div className="scenario-sliders">
        {/* Fertility Rate Slider */}
        <div className="scenario-item">
          <div className="scenario-label-row">
            <label>
              <span className="scenario-icon">👶</span>
              Fertility Rate
            </label>
            <span className={`scenario-value ${scenarios.fertility === 0 ? 'baseline' : scenarios.fertility > 0 ? 'increase' : 'decrease'}`}>
              {scenarios.fertility > 0 ? '+' : ''}{scenarios.fertility}%
            </span>
          </div>
          <input
            type="range"
            min="-50"
            max="100"
            value={scenarios.fertility}
            step="5"
            onChange={(e) => onScenarioChange('fertility', parseInt(e.target.value))}
          />
          <div className="scenario-markers">
            <span>-50%</span>
            <span className="baseline-marker">Baseline</span>
            <span>+100%</span>
          </div>
        </div>

        {/* Mortality Rate Slider */}
        <div className="scenario-item">
          <div className="scenario-label-row">
            <label>
              <span className="scenario-icon">🏥</span>
              Mortality Rate
            </label>
            <span className={`scenario-value ${scenarios.mortality === 0 ? 'baseline' : scenarios.mortality > 0 ? 'decrease' : 'increase'}`}>
              {scenarios.mortality > 0 ? '+' : ''}{scenarios.mortality}%
            </span>
          </div>
          <input
            type="range"
            min="-50"
            max="50"
            value={scenarios.mortality}
            step="5"
            onChange={(e) => onScenarioChange('mortality', parseInt(e.target.value))}
          />
          <div className="scenario-markers">
            <span>-50% (worse)</span>
            <span className="baseline-marker">Baseline</span>
            <span>+50% (better)</span>
          </div>
        </div>

        {/* Net Migration Slider */}
        <div className="scenario-item">
          <div className="scenario-label-row">
            <label>
              <span className="scenario-icon">✈️</span>
              Net Migration
            </label>
            <span className={`scenario-value ${scenarios.migration === 0 ? 'baseline' : scenarios.migration > 0 ? 'increase' : 'decrease'}`}>
              {scenarios.migration > 0 ? '+' : ''}{scenarios.migration}%
            </span>
          </div>
          <input
            type="range"
            min="-75"
            max="150"
            value={scenarios.migration}
            step="5"
            onChange={(e) => onScenarioChange('migration', parseInt(e.target.value))}
          />
          <div className="scenario-markers">
            <span>-75%</span>
            <span className="baseline-marker">Baseline</span>
            <span>+150%</span>
          </div>
        </div>
      </div>

      {(scenarios.fertility !== 0 || scenarios.mortality !== 0 || scenarios.migration !== 0) && (
        <div className="scenario-active-banner">
          ⚠️ Custom scenario active - viewing adjusted projections
        </div>
      )}
    </div>
  );
}
