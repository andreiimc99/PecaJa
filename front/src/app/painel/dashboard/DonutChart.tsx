'use client';

import React from 'react';

export default function DonutChart({ parts }: { parts: { label: string; value: number; color?: string }[] }) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <svg width="120" height="120" viewBox="0 0 120 120">
      <g transform="translate(60,60)">
        {parts.map((p, i) => {
          const fraction = p.value / total;
          const dash = fraction * circumference;
          const strokeDasharray = `${dash} ${circumference - dash}`;
          const strokeDashoffset = -offset;
          offset += dash;
          return (
            <circle
              key={p.label}
              r={radius}
              fill="transparent"
              stroke={p.color || ['#f55404','#007bff','#28a745','#ffc107'][i % 4]}
              strokeWidth={18}
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform="rotate(-90)"
            />
          );
        })}
        <circle r={radius - 16} fill="#fff" />
        <text x="0" y="4" textAnchor="middle" fontWeight={700} fontSize={12}>{total}</text>
      </g>
    </svg>
  );
}
