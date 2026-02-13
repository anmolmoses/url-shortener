/** Lightweight toast notification system */

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

type Listener = (toasts: Toast[]) => void;

let toasts: Toast[] = [];
let nextId = 0;
const listeners: Set<Listener> = new Set();

function notify() {
  listeners.forEach((fn) => fn([...toasts]));
}

export function addToast(message: string, type: ToastType = 'info') {
  const id = nextId++;
  toasts = [...toasts, { id, message, type }];
  notify();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    notify();
  }, 4000);
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getToasts(): Toast[] {
  return toasts;
}

export type { Toast, ToastType };
