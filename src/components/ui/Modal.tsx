import React, { useEffect } from 'react';
import { X } from 'lucide-react';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: ModalSize;
  closeOnBackdrop?: boolean;
  closeOnEsc?: boolean;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-[95vw] sm:max-w-sm',
  md: 'max-w-[95vw] sm:max-w-lg',
  lg: 'max-w-[95vw] sm:max-w-2xl',
  xl: 'max-w-[95vw] sm:max-w-4xl',
  full: 'max-w-[95vw]',
};

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true,
  closeOnEsc = true,
}) => {
  useEffect(() => {
    if (!open || !closeOnEsc) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose, closeOnEsc]);

  if (!open) return null;

  // z-[200]: o MobileDock (z-[90]) e o MobileMenu (z-[100]) são `fixed` e ficavam POR CIMA do modal
  // enquanto ele estava em z-50 — em mobile isso escondia o footer, porque o botão de ação do modal
  // cai justamente na faixa do dock, que passava a receber o toque no lugar dele. 200 é o mesmo
  // patamar dos overlays de modal das views; o ConfirmDialog (z-[500]) continua acima.
  // pb com safe-area: evita que o footer fique sob o home indicator / barra do Safari no iPhone.
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={[
          'relative w-full rounded-2xl bg-white dark:bg-slate-800 shadow-xl',
          'flex flex-col max-h-[90dvh]',
          'animate-in zoom-in',
          sizeClasses[size],
        ].join(' ')}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              aria-label="Fechar"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-3 sm:px-6 sm:py-4">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-4 py-3 sm:px-6 sm:py-4 border-t border-slate-200 dark:border-slate-700 shrink-0 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
