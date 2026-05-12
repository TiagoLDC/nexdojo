import React from 'react';
import { CheckCircle, XCircle, Trash2, Info, X } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import type { ToastType } from '@/stores/uiStore';

const config: Record<ToastType, { icon: React.ReactNode; classes: string }> = {
  success: {
    icon: <CheckCircle size={18} />,
    classes: 'bg-green-600 text-white',
  },
  error: {
    icon: <XCircle size={18} />,
    classes: 'bg-red-600 text-white',
  },
  delete: {
    icon: <Trash2 size={18} />,
    classes: 'bg-slate-800 text-white dark:bg-slate-700',
  },
  info: {
    icon: <Info size={18} />,
    classes: 'bg-indigo-600 text-white',
  },
};

export const Toast: React.FC = () => {
  const toast = useUIStore((s) => s.toast);
  const hideToast = useUIStore((s) => s.hideToast);

  if (!toast) return null;

  const { icon, classes } = config[toast.type];

  return (
    <div className="fixed top-4 right-4 z-[100] pointer-events-none">
      <div
        className={[
          'flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium pointer-events-auto',
          'animate-in slide-in-from-bottom',
          classes,
        ].join(' ')}
        role="alert"
      >
        <span className="shrink-0">{icon}</span>
        <span>{toast.message}</span>
        <button
          onClick={hideToast}
          className="ml-2 opacity-70 hover:opacity-100 transition-opacity"
          aria-label="Fechar"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};
