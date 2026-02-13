'use client';

import { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import type { ClickAggregation } from '@/lib/api-client';

Chart.register(...registerables);

interface ClickTimelineProps {
  data: ClickAggregation[];
  loading?: boolean;
}

export default function ClickTimeline({ data, loading }: ClickTimelineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current || loading) return;

    // Destroy existing chart before creating new one
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: data.map((d) => d.period),
        datasets: [
          {
            label: 'Clicks',
            data: data.map((d) => d.count),
            borderColor: '#6366F1',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            fill: true,
            tension: 0.3,
            pointRadius: 3,
            pointHoverRadius: 6,
            pointBackgroundColor: '#6366F1',
          },
        ],
      },
      options: {
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
            grid: { color: 'rgba(63, 63, 70, 0.3)' },
            ticks: { color: '#A1A1AA', font: { size: 11 } },
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(63, 63, 70, 0.3)' },
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
    return <div className="h-64 bg-zinc-800 animate-pulse rounded-lg" />;
  }

  return (
    <div className="h-64">
      <canvas ref={canvasRef} />
    </div>
  );
}
