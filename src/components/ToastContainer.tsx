'use client';

import { useEffect, useState } from 'react';
import { subscribe, getToasts, type Toast } from '@/lib/toast';
import { colors } from '@/lib/design-tokens';

const typeStyles: Record<string, string> = {
  success: 'border-emerald-500/50 bg-emerald-500/10',
  error: 'border-red-500/50 bg-red-500/10',
  info: 'border-indigo-500/50 bg-indigo-500/10',
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>(getToasts);

  useEffect(() => subscribe(setToasts), []);

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-3 rounded-lg border text-sm text-zinc-100 shadow-lg backdrop-blur-sm animate-in slide-in-from-right duration-300 ${typeStyles[t.type] || typeStyles.info}`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
