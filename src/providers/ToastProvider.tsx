import { createContext, useContext, useState, type ReactNode } from 'react';
import { theme } from '../theme/tokens';

type Toast = {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
};

type ToastContextType = {
  showToast: (message: string, type: Toast['type']) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const toastIcons = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
};

const toastColors = {
  success: theme.colors.success,
  error: theme.colors.error,
  info: theme.colors.gold,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: Toast['type']) => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3000);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        role="region"
        aria-live="polite"
        aria-label="Notifications"
        style={{
          position: 'fixed',
          top: 24,
          right: 24,
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            aria-live="polite"
            style={{
              backgroundColor: theme.colors.black,
              border: `2px solid ${toastColors[toast.type]}`,
              padding: '16px 24px',
              borderRadius: theme.borderRadius.md,
              color: theme.colors.white,
              minWidth: 300,
              boxShadow: theme.shadows.md,
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.md,
              fontFamily: theme.typography.fontFamily.body,
              fontSize: theme.typography.fontSize.md,
              animation: 'slideIn 0.3s ease',
            }}
          >
            <span style={{ color: toastColors[toast.type], fontSize: 20 }} aria-hidden="true">
              {toastIcons[toast.type]}
            </span>
            {toast.message}
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
