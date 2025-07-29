import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { DepthChartData } from '../types/types';


interface DepthChartProps {
  data: DepthChartData[];
}

export const DepthChart: React.FC<DepthChartProps> = ({ data }) => {
  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-xl font-semibold mb-4">Market Depth Chart</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="price" stroke="#9CA3AF" tick={{ fontSize: 12 }} />
            <YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} />
            <Area
              type="monotone"
              dataKey="bidTotal"
              stackId="1"
              stroke="#10B981"
              fill="#10B981"
              fillOpacity={0.3}
            />
            <Area
              type="monotone"
              dataKey="askTotal"
              stackId="1"
              stroke="#EF4444"
              fill="#EF4444"
              fillOpacity={0.3}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};