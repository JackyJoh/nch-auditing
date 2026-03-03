import React, { createContext, useContext, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

type ToastAPI = {
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastAPI | undefined>(undefined);

let nextId = 0;
const DURATION = 4000;

const styles: Record<ToastType, { border: string; iconColor: string; icon: string }> = {
  success: { border: 'border-green-500/50',  iconColor: 'text-green-400',  icon: '✓' },
  error:   { border: 'border-red-500/50',    iconColor: 'text-red-400',    icon: '✕' },
  warning: { border: 'border-yellow-500/50', iconColor: 'text-yellow-400', icon: '⚠' },
  info:    { border: 'border-indigo-500/50', iconColor: 'text-indigo-400', icon: 'ℹ' },
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const add = useCallback((type: ToastType, message: string) => {
    const id = nextId++;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => remove(id), DURATION);
  }, [remove]);

  const api: ToastAPI = {
    success: (msg) => add('success', msg),
    error:   (msg) => add('error', msg),
    warning: (msg) => add('warning', msg),
    info:    (msg) => add('info', msg),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      {ReactDOM.createPortal(
        <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-[200] pointer-events-none">
          {toasts.map(t => {
            const s = styles[t.type];
            return (
              <div
                key={t.id}
                className={`toast-animate pointer-events-auto flex items-start gap-3 bg-slate-800/95 backdrop-blur-sm border ${s.border} rounded-xl shadow-2xl px-4 py-3 max-w-sm`}
              >
                <span className={`${s.iconColor} font-bold text-base flex-shrink-0 mt-0.5`}>{s.icon}</span>
                <p className="text-white/90 text-sm leading-snug flex-1">{t.message}</p>
                <button
                  onClick={() => remove(t.id)}
                  className="text-white/40 hover:text-white/80 transition-colors flex-shrink-0"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastAPI => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
};
