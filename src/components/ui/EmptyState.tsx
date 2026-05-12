import React from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
    {icon && (
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500">
        {icon}
      </span>
    )}
    <div>
      <p className="text-base font-semibold text-slate-700 dark:text-slate-300">{title}</p>
      {description && (
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
      )}
    </div>
    {action && (
      <Button variant="primary" size="sm" icon={action.icon} onClick={action.onClick}>
        {action.label}
      </Button>
    )}
  </div>
);
