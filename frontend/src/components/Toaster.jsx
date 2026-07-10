import React from 'react';
import { X, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { useToastStore } from '../stores/toastStore';

const MAX_VISIBLE_TOASTS = 4;

const TOAST_STYLES = {
  error: { border: 'border-l-red-500', iconColor: 'text-red-500', Icon: AlertCircle },
  success: { border: 'border-l-green-500', iconColor: 'text-green-500', Icon: CheckCircle2 },
  info: { border: 'border-l-blue-500', iconColor: 'text-blue-500', Icon: Info }
};

function Toaster() {
  const toasts = useToastStore((state) => state.toasts);
  const dismissToast = useToastStore((state) => state.dismissToast);

  const visibleToasts = toasts.slice(-MAX_VISIBLE_TOASTS);

  if (visibleToasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex flex-col items-end space-y-2 pointer-events-none"
      role="status"
      aria-live="polite"
    >
      {visibleToasts.map((toast) => {
        const { border, iconColor, Icon } = TOAST_STYLES[toast.type] || TOAST_STYLES.info;

        return (
          <div
            key={toast.id}
            role={toast.type === 'error' ? 'alert' : 'status'}
            className={`toast-enter pointer-events-auto flex items-start space-x-2 w-80 max-w-[calc(100vw-2rem)] bg-background text-foreground border border-border border-l-4 ${border} rounded-md shadow-lg p-3`}
          >
            <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${iconColor}`} />
            <p className="text-sm flex-1 min-w-0 break-words">{toast.message}</p>
            <button
              onClick={() => dismissToast(toast.id)}
              className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default Toaster;
