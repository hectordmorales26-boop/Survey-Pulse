import { useState, useEffect } from 'react';
import { getSurveyAttempts } from '../api/stats';
import { groupStatsByCompany } from '../utils/dataTransformers';

export function useCompanyStats() {
  const [companiesStats, setCompaniesStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true);
        const attempts = await getSurveyAttempts();
        const grouped = groupStatsByCompany(attempts);
        setCompaniesStats(grouped);
      } catch (err) {
        console.error('Error cargando estadísticas por empresa:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  const getCompanyDetails = (companyName) => {
    return companiesStats.find(c => c.name.toLowerCase() === companyName.toLowerCase());
  };

  return {
    companiesStats,
    loading,
    error,
    getCompanyDetails
  };
}

export default useCompanyStats;
