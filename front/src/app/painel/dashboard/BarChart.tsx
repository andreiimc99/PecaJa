'use client';

import React from 'react';

interface BarData { label: string; value: number }

export default function BarChart({ data }: { data: BarData[] }) {
  const width = 400;
  const height = 180;
  const padding = 24;
  const max = Math.max(...data.map(d => d.value), 1);
  const barWidth = (width - padding * 2) / data.length - 10;

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
      <g transform={`translate(${padding}, ${padding})`}>
        {data.map((d, i) => {
          const x = i * (barWidth + 10);
          const h = (d.value / max) * (height - padding * 2 - 20);
          const y = (height - padding * 2 - 20) - h;
          return (
            <g key={d.label}>
              <rect x={x} y={y} width={barWidth} height={h} fill="var(--brand, #f55404)" rx={4} />
              <text x={x + barWidth / 2} y={height - padding * 2 - 5} fontSize={10} textAnchor="middle" fill="#333">{d.label}</text>
              <text x={x + barWidth / 2} y={y - 4} fontSize={11} textAnchor="middle" fill="#111" fontWeight={700}>{d.value}</text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
