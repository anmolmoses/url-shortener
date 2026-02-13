'use client';

import { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import type { DeviceStat } from '@/lib/api-client';

Chart.register(...registerables);

const deviceColors: Record<string, string> = {
  desktop: '#6366F1',
  mobile: '#0EA5E9',
  tablet: '#22D3EE',
  bot: '#A1A1AA',
};

interface DevicePieProps {
  data: DeviceStat[];
  loading?: boolean;
}

export default function DevicePie({ data, loading }: DevicePieProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current || loading) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    chartRef.current = new Chart(canvasRef.current, {
      type: 'doughnut',
      data: {
        labels: data.map((d) => d.device),
        datasets: [
          {
            data: data.map((d) => d.count),
            backgroundColor: data.map((d) => deviceColors[d.device] || '#3F3F46'),
            borderColor: '#18181B',
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400, easing: 'easeOutQuart' },
        cutout: '65%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#A1A1AA',
              padding: 16,
              usePointStyle: true,
              pointStyleWidth: 8,
              font: { size: 12 },
            },
          },
          tooltip: {
            backgroundColor: '#27272A',
            borderColor: '#3F3F46',
            borderWidth: 1,
            titleColor: '#FAFAFA',
            bodyColor: '#A1A1AA',
            padding: 10,
            cornerRadius: 8,
          },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [data, loading]);

  if (loading) {
    return <div className="h-64 bg-zinc-800 animate-pulse rounded-lg" />;
  }

  if (!data.length) {
    return (
      <div className="h-64 flex items-center justify-center text-zinc-500 text-sm">
        No device data yet
      </div>
    );
  }

  return (
    <div className="h-64">
      <canvas ref={canvasRef} />
    </div>
  );
}
