'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

const listeners = new Set();
let toastCounter = 0;

function emitToast(type, message) {
  const text = String(message || '').trim();
  if (!text) return;
  toastCounter += 1;
  const payload = { id: `${Date.now()}_${toastCounter}`, type, message: text };
  listeners.forEach((fn) => fn(payload));
}

export const toast = {
  error: (message) => emitToast('error', message),
  success: (message) => emitToast('success', message),
  info: (message) => emitToast('info', message),
};

const ToastContext = createContext(toast);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const dismiss = useCallback((id) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  useEffect(() => {
    const timers = timersRef.current;
    const handleNewToast = (item) => {
      setToasts((prev) => [...prev.slice(-4), item]);
      const timer = setTimeout(() => {
        timers.delete(item.id);
        setToasts((prev) => prev.filter((t) => t.id !== item.id));
      }, 5000);
      timers.set(item.id, timer);
    };

    listeners.add(handleNewToast);
    return () => {
      listeners.delete(handleNewToast);
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {toasts.length > 0 && (
        <div className="toast-stack" role="region" aria-label="Notifications" aria-live="polite">
          {toasts.map((item) => {
            const Icon =
              item.type === 'success'
                ? CheckCircle2
                : item.type === 'info'
                  ? Info
                  : AlertCircle;
            return (
              <div
                key={item.id}
                className={`toast-item toast-${item.type}`}
                role={item.type === 'error' ? 'alert' : 'status'}
              >
                <Icon size={18} className="toast-icon" aria-hidden="true" />
                <span className="toast-message">{item.message}</span>
                <button
                  type="button"
                  className="toast-close"
                  onClick={() => dismiss(item.id)}
                  aria-label="Dismiss notification"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

