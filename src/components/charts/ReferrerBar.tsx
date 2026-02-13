'use client';

import { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import type { ReferrerStat } from '@/lib/api-client';

Chart.register(...registerables);

interface ReferrerBarProps {
  data: ReferrerStat[];
  loading?: boolean;
}

export default function ReferrerBar({ data, loading }: ReferrerBarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current || loading) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const top10 = data.slice(0, 10);

    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels: top10.map((d) => d.referrer || 'Direct'),
        datasets: [
          {
            label: 'Clicks',
            data: top10.map((d) => d.count),
            backgroundColor: '#0EA5E9',
            borderRadius: 4,
            barThickness: 20,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400, easing: 'easeOutQuart' },
        plugins: {
          legend: { display: false },
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
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: 'rgba(63, 63, 70, 0.3)' },
            ticks: { color: '#A1A1AA', font: { size: 11 } },
          },
          y: {
            grid: { display: false },
            ticks: { color: '#A1A1AA', font: { size: 11 } },
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
    return <div className="h-72 bg-zinc-800 animate-pulse rounded-lg" />;
  }

  if (!data.length) {
    return (
      <div className="h-72 flex items-center justify-center text-zinc-500 text-sm">
        No referrer data yet
      </div>
    );
  }

  return (
    <div className="h-72">
      <canvas ref={canvasRef} />
    </div>
  );
}
