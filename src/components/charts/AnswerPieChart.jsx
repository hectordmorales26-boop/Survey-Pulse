import React from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

const COLORS = ['#8c6239', '#d4af37', '#6b8e23', '#b23b3b', '#a27b5c'];

export const AnswerPieChart = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="no-data-placeholder">Sin distribución de respuestas disponible</div>;
  }

  return (
    <div className="chart-wrapper">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ 
              backgroundColor: 'var(--bg-secondary)', 
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
              borderRadius: '8px',
              fontFamily: 'var(--font-sans)'
            }}
          />
          <Legend 
            verticalAlign="bottom" 
            height={36}
            wrapperStyle={{ fontSize: 11, fontFamily: 'var(--font-sans)', marginTop: '10px' }} 
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AnswerPieChart;
