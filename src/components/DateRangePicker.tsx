'use client';

import { useState } from 'react';

interface DateRangePickerProps {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}

const presets = [
  { label: '24h', days: 1 },
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
];

/**
 * Date range picker with preset buttons and custom date inputs.
 * Filters all analytics panels.
 */
export default function DateRangePicker({ from, to, onChange }: DateRangePickerProps) {
  const [activePreset, setActivePreset] = useState<number | null>(7);

  const handlePreset = (days: number) => {
    setActivePreset(days);
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    onChange(fromDate.toISOString().split('T')[0], toDate.toISOString().split('T')[0]);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Presets */}
      {presets.map(p => (
        <button
          key={p.days}
          onClick={() => handlePreset(p.days)}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            activePreset === p.days
              ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
              : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600'
          }`}
        >
          {p.label}
        </button>
      ))}

      {/* Custom range */}
      <div className="flex items-center gap-1.5 ml-2">
        <input
          type="date"
          value={from}
          onChange={e => {
            setActivePreset(null);
            onChange(e.target.value, to);
          }}
          className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs rounded-md px-2 py-1.5 focus:outline-none focus:border-indigo-500 [color-scheme:dark]"
        />
        <span className="text-zinc-500 text-xs">→</span>
        <input
          type="date"
          value={to}
          onChange={e => {
            setActivePreset(null);
            onChange(from, e.target.value);
          }}
          className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs rounded-md px-2 py-1.5 focus:outline-none focus:border-indigo-500 [color-scheme:dark]"
        />
      </div>
    </div>
  );
}
