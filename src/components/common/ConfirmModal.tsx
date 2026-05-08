import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-200">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 ${variant === 'danger' ? 'bg-red-100 dark:bg-red-900/30 text-red-600' : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600'}`}>
          {variant === 'danger' ? <Trash2 size={24} /> : <AlertTriangle size={24} />}
        </div>
        <p className="text-center text-sm font-bold text-slate-700 dark:text-slate-300 leading-relaxed mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-white transition-all active:scale-95 ${variant === 'danger' ? 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/20' : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
