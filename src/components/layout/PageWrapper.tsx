import React from 'react';

interface PageWrapperProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const PageWrapper: React.FC<PageWrapperProps> = ({
  title,
  description,
  actions,
  children,
  className = '',
}) => (
  <div className={`space-y-6 ${className}`}>
    {(title || actions) && (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          {title && (
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{title}</h1>
          )}
          {description && (
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    )}
    {children}
  </div>
);
