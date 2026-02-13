'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { ClickData } from '@/lib/api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

interface ClickTimelineProps {
  data: ClickData[];
  granularity: 'hourly' | 'daily' | 'weekly';
}

/**
 * Line chart showing click counts over time.
 * Animated on load with 400ms ease-out.
 */
export default function ClickTimeline({ data, granularity }: ClickTimelineProps) {
  const labelFormat: Intl.DateTimeFormatOptions =
    granularity === 'hourly'
      ? { hour: 'numeric', minute: '2-digit' }
      : granularity === 'daily'
        ? { month: 'short', day: 'numeric' }
        : { month: 'short', day: 'numeric' };

  const labels = data.map(d =>
    new Intl.DateTimeFormat('en-US', labelFormat).format(new Date(d.timestamp))
  );

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Clicks',
        data: data.map(d => d.count),
        borderColor: '#6366F1',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: data.length > 50 ? 0 : 3,
        pointHoverRadius: 5,
        pointBackgroundColor: '#6366F1',
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 400,
      easing: 'easeOutQuart' as const,
    },
    scales: {
      x: {
        grid: { color: 'rgba(63, 63, 70, 0.3)' },
        ticks: { color: '#A1A1AA', maxTicksLimit: 12, font: { size: 11 } },
        border: { display: false },
      },
      y: {
        grid: { color: 'rgba(63, 63, 70, 0.3)' },
        ticks: { color: '#A1A1AA', font: { size: 11 } },
        border: { display: false },
        beginAtZero: true,
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
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  };

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500 text-sm">
        No click data for this period
      </div>
    );
  }

  return (
    <div className="h-64">
      <Line data={chartData} options={options} />
    </div>
  );
}
