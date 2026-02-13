'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import type { ReferrerData } from '@/lib/api';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

interface ReferrerBarProps {
  data: ReferrerData[];
}

/**
 * Horizontal bar chart — top 10 referrers by click count.
 */
export default function ReferrerBar({ data }: ReferrerBarProps) {
  const top10 = data.slice(0, 10);

  if (top10.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500 text-sm">
        No referrer data yet
      </div>
    );
  }

  const chartData = {
    labels: top10.map(d => d.referrer || 'Direct'),
    datasets: [
      {
        label: 'Clicks',
        data: top10.map(d => d.count),
        backgroundColor: 'rgba(14, 165, 233, 0.6)',
        hoverBackgroundColor: 'rgba(14, 165, 233, 0.8)',
        borderRadius: 4,
        borderSkipped: false,
        barThickness: 20,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    animation: {
      duration: 400,
      easing: 'easeOutQuart' as const,
    },
    scales: {
      x: {
        grid: { color: 'rgba(63, 63, 70, 0.3)' },
        ticks: { color: '#A1A1AA', font: { size: 11 } },
        border: { display: false },
        beginAtZero: true,
      },
      y: {
        grid: { display: false },
        ticks: {
          color: '#A1A1AA',
          font: { size: 11 },
          callback: function(this: unknown, _: unknown, index: number) {
            const label = top10[index]?.referrer || 'Direct';
            return label.length > 25 ? label.slice(0, 25) + '…' : label;
          },
        },
        border: { display: false },
      },
    },
    plugins: {
      tooltip: {
        backgroundColor: '#27272A',
        titleColor: '#FAFAFA',
        bodyColor: '#A1A1AA',
        borderColor: '#3F3F46',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
      },
    },
  };

  return (
    <div className="h-64">
      <Bar data={chartData} options={options} />
    </div>
  );
}
