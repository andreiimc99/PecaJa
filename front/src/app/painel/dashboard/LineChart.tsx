'use client';

import React from 'react';

export default function LineChart({ data, labels }: { data: number[]; labels?: string[] }) {
  const width = 420;
  const height = 180;
  const padding = 24;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const points = data.map((v, i) => {
    const x = padding + (i * (width - padding * 2)) / (data.length - 1 || 1);
    const y = padding + (1 - (v - min) / (max - min || 1)) * (height - padding * 2);
    return { x, y };
  });

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--brand, #f55404)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--brand, #f55404)" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      <g>
        <path d={path} fill="none" stroke="var(--brand, #f55404)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {/* area fill */}
        <path d={`${path} L ${points[points.length -1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`} fill="url(#grad)" opacity={0.9} />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={3.5} fill="#fff" stroke="var(--brand, #f55404)" strokeWidth={2} />
            {labels && <text x={p.x} y={height - 6} fontSize={10} textAnchor="middle" fill="#333">{labels[i]}</text>}
          </g>
        ))}
      </g>
    </svg>
  );
}
