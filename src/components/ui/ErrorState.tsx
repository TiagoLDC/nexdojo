import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Erro ao carregar',
  message = 'Ocorreu um erro inesperado. Tente novamente.',
  onRetry,
}) => (
  <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
    <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-500 dark:bg-red-900/30">
      <AlertTriangle size={28} />
    </span>
    <div>
      <p className="text-base font-semibold text-slate-700 dark:text-slate-300">{title}</p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{message}</p>
    </div>
    {onRetry && (
      <Button variant="outline" size="sm" onClick={onRetry}>
        Tentar novamente
      </Button>
    )}
  </div>
);
