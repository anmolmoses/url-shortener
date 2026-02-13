'use client';

import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import type { DeviceData } from '@/lib/api';
import { chartColors } from '@/lib/design-tokens';

ChartJS.register(ArcElement, Tooltip, Legend);

interface DevicePieProps {
  data: DeviceData[];
}

/**
 * Doughnut chart — desktop vs mobile vs tablet vs bot.
 */
export default function DevicePie({ data }: DevicePieProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500 text-sm">
        No device data yet
      </div>
    );
  }

  const chartData = {
    labels: data.map(d => d.device),
    datasets: [
      {
        data: data.map(d => d.count),
        backgroundColor: chartColors.slice(0, data.length),
        borderColor: '#18181B',
        borderWidth: 3,
        hoverBorderWidth: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    animation: {
      duration: 400,
      easing: 'easeOutQuart' as const,
    },
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          color: '#A1A1AA',
          padding: 16,
          usePointStyle: true,
          pointStyleWidth: 10,
          font: { size: 12 },
        },
      },
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
      <Doughnut data={chartData} options={options} />
    </div>
  );
}
