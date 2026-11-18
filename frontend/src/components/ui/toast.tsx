import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
}

interface ToastContextType {
  toast: (item: Omit<ToastItem, 'id'>) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ type, message, title }: Omit<ToastItem, 'id'>) => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id, type, message, title }]);
      setTimeout(() => {
        removeToast(id);
      }, 5000);
    },
    [removeToast],
  );

  const contextValue: ToastContextType = {
    toast: addToast,
    success: (message, title) => addToast({ type: 'success', message, title }),
    error: (message, title) => addToast({ type: 'error', message, title }),
    info: (message, title) => addToast({ type: 'info', message, title }),
    warning: (message, title) => addToast({ type: 'warning', message, title }),
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-start gap-3 rounded-xl p-4 shadow-lg border text-sm transition-all animate-in slide-in-from-top-2 duration-200',
              t.type === 'success' && 'bg-white border-emerald-200 text-emerald-900',
              t.type === 'error' && 'bg-white border-rose-200 text-rose-900',
              t.type === 'warning' && 'bg-white border-amber-200 text-amber-900',
              t.type === 'info' && 'bg-white border-teal-200 text-brand-dark',
            )}
          >
            {t.type === 'success' && (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            )}
            {t.type === 'error' && (
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            {t.type === 'warning' && (
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            )}
            {t.type === 'info' && (
              <Info className="h-5 w-5 text-brand-primary shrink-0 mt-0.5" />
            )}

            <div className="flex-1">
              {t.title && <div className="font-bold text-xs uppercase tracking-wider">{t.title}</div>}
              <div className="mt-0.5 leading-snug">{t.message}</div>
            </div>

            <button
              onClick={() => removeToast(t.id)}
              className="text-stone-400 hover:text-stone-600 p-0.5"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
