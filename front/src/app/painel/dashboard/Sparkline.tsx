'use client';

import React from 'react';

export default function Sparkline({ data, color = 'var(--brand)' }: { data: number[]; color?: string }) {
  const width = 120;
  const height = 36;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const points = data.map((v, i) => {
    const x = (i * width) / (data.length - 1 || 1);
    const y = (1 - (v - min) / (max - min || 1)) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
