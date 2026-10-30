'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';

type ToastKind = 'success' | 'error';
type ToastItem = { id: number; kind: ToastKind; message: string };
type ToastContextValue = (kind: ToastKind, message: string) => void;

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const notify = useContext(ToastContext);
  if (!notify) {
    throw new Error('useToast phải được dùng bên trong ToastProvider.');
  }
  return notify;
}

export default function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) window.clearTimeout(timer);
    timers.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback((kind: ToastKind, message: string) => {
    const id = ++nextId.current;
    setToasts((current) => [...current, { id, kind, message }]);
    const timer = window.setTimeout(() => dismiss(id), 6000);
    timers.current.set(id, timer);
  }, [dismiss]);

  useEffect(() => () => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current.clear();
  }, []);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="toast-stack" aria-label="Thông báo">
        {toasts.map((toast) => (
          <div
            className={`action-toast action-toast-${toast.kind}`}
            key={toast.id}
            role={toast.kind === 'error' ? 'alert' : 'status'}
          >
            <span className="action-toast-mark" aria-hidden="true">
              {toast.kind === 'success' ? '✓' : '!'}
            </span>
            <span className="action-toast-message">{toast.message}</span>
            <button
              className="action-toast-close"
              type="button"
              aria-label="Đóng thông báo"
              onClick={() => dismiss(toast.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
