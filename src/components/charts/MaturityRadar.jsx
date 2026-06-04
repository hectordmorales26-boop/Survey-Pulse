import React from 'react';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer 
} from 'recharts';

export const MaturityRadar = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="no-data-placeholder">Sin datos de madurez disponibles</div>;
  }

  return (
    <div className="chart-wrapper">
      <ResponsiveContainer width="100%" height={320}>
        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
          <PolarGrid stroke="var(--border-color)" />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ fill: 'var(--text-secondary)', fontSize: 12, fontFamily: 'var(--font-sans)' }} 
          />
          <PolarRadiusAxis 
            angle={30} 
            domain={[0, 100]} 
            tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
          />
          <Radar
            name="Madurez %"
            dataKey="score"
            stroke="var(--primary-color)"
            fill="var(--primary-light)"
            fillOpacity={0.4}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MaturityRadar;
