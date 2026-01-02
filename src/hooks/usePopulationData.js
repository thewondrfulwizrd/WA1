// src/hooks/usePopulationData.js
import { useState, useEffect } from 'react';

export function usePopulationData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/data/canada_age_sex_observed_projected_2000_2100_v2.json')
      .then(response => response.json())
      .then(jsonData => {
        setData(jsonData);
        setLoading(false);
        console.log('✓ Data loaded successfully');
        console.log(`  Years: ${jsonData.yearsObserved}-${jsonData.lastProjectedYear}`);
        console.log(`  Age groups: ${jsonData.ages.length}`);
      })
      .catch(err => {
        setError(err);
        setLoading(false);
        console.error('✗ Failed to load data:', err);
      });
  }, []);

  return { data, loading, error };
}
