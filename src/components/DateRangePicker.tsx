'use client';

import { useState } from 'react';

interface DateRangePickerProps {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}

const presets = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
];

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}

export default function DateRangePicker({ from, to, onChange }: DateRangePickerProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {presets.map((p) => (
        <button
          key={p.label}
          onClick={() => onChange(daysAgo(p.days), today())}
          className={`px-3 py-1 text-xs rounded-md border transition-colors ${
            from === daysAgo(p.days)
              ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300'
              : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600'
          }`}
        >
          {p.label}
        </button>
      ))}
      <input
        type="date"
        value={from}
        onChange={(e) => onChange(e.target.value, to)}
        className="bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1 text-xs text-zinc-300 focus:border-indigo-500 focus:outline-none"
      />
      <span className="text-zinc-500 text-xs">to</span>
      <input
        type="date"
        value={to}
        onChange={(e) => onChange(from, e.target.value)}
        className="bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1 text-xs text-zinc-300 focus:border-indigo-500 focus:outline-none"
      />
    </div>
  );
}
