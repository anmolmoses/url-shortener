import { formatNumber } from '@/lib/utils';
import { type ReactNode } from 'react';

interface StatsCardProps {
  icon: ReactNode;
  label: string;
  value: number | string;
  change?: string; // e.g. "+12%"
}

/**
 * Reusable stats card — icon, label, big number.
 * Glassmorphism dark card style.
 */
export default function StatsCard({ icon, label, value, change }: StatsCardProps) {
  const display = typeof value === 'number' ? formatNumber(value) : value;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm p-5 flex flex-col gap-3 transition-colors hover:border-zinc-700">
      <div className="flex items-center justify-between">
        <span className="text-zinc-400 text-sm font-medium">{label}</span>
        <div className="text-indigo-400">{icon}</div>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold text-zinc-50 tracking-tight">{display}</span>
        {change && (
          <span className={`text-xs font-medium mb-1 ${
            change.startsWith('+') ? 'text-emerald-400' : change.startsWith('-') ? 'text-red-400' : 'text-zinc-500'
          }`}>
            {change}
          </span>
        )}
      </div>
    </div>
  );
}
