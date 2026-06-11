import React, { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Spinner } from './Spinner';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary' | 'warning';
  icon?: React.ReactNode;
  loading?: boolean;
}

const defaultIcons: Record<'danger' | 'primary' | 'warning', React.ReactNode> = {
  danger: <AlertTriangle size={32} />,
  primary: null,
  warning: <AlertTriangle size={32} />,
};

const iconColors: Record<'danger' | 'primary' | 'warning', string> = {
  danger: 'bg-red-100 dark:bg-red-950/30 text-red-500 dark:text-red-400',
  primary: 'bg-indigo-100 dark:bg-indigo-950/30 text-indigo-500 dark:text-indigo-400',
  warning: 'bg-amber-100 dark:bg-amber-950/30 text-amber-500 dark:text-amber-400',
};

const confirmColors: Record<'danger' | 'primary' | 'warning', string> = {
  danger:
    'bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white shadow-lg shadow-red-600/20',
  primary:
    'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white shadow-lg shadow-indigo-600/20',
  warning:
    'bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white shadow-lg shadow-amber-500/20',
};

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title = 'Confirmar ação',
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  icon,
  loading = false,
}) => {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, loading, onClose]);

  if (!open) return null;

  const resolvedIcon = icon ?? defaultIcons[variant];

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[500] flex items-center justify-center p-4">
      <div
        className="absolute inset-0"
        onClick={!loading ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        role="alertdialog"
        aria-modal="true"
        className="relative bg-white dark:bg-slate-900 w-full max-w-sm rounded-[40px] p-8 animate-in zoom-in duration-300 shadow-2xl text-center border border-slate-100 dark:border-slate-800"
      >
        {resolvedIcon && (
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${iconColors[variant]}`}
          >
            {resolvedIcon}
          </div>
        )}

        <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2 tracking-tight">
          {title}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-8 leading-relaxed">
          {message}
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`w-full font-black py-5 rounded-3xl transition-all active:scale-95 flex items-center justify-center gap-2 text-sm uppercase tracking-wide ${confirmColors[variant]}`}
          >
            {loading && <Spinner size="xs" className="text-current" />}
            {confirmLabel}
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold py-5 rounded-3xl transition-all active:scale-95 text-sm disabled:opacity-50"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
