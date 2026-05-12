import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  containerClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helper, leading, trailing, containerClassName = '', className = '', id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className={`flex flex-col gap-1 ${containerClassName}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leading && (
            <span className="absolute left-3 flex items-center text-slate-400 dark:text-slate-500 pointer-events-none">
              {leading}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={[
              'w-full rounded-lg border bg-white text-slate-900 placeholder:text-slate-400 text-sm transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
              'disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed',
              'dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500',
              error
                ? 'border-red-400 focus:ring-red-400 dark:border-red-500'
                : 'border-slate-300 dark:border-slate-600',
              leading ? 'pl-9' : 'pl-3',
              trailing ? 'pr-9' : 'pr-3',
              'py-2',
              className,
            ].join(' ')}
            {...props}
          />
          {trailing && (
            <span className="absolute right-3 flex items-center text-slate-400 dark:text-slate-500 pointer-events-none">
              {trailing}
            </span>
          )}
        </div>
        {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
        {!error && helper && <p className="text-xs text-slate-500 dark:text-slate-400">{helper}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
