import React from 'react';

type CardPadding = 'none' | 'sm' | 'md' | 'lg';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: CardPadding;
  onClick?: () => void;
  as?: React.ElementType;
}

const paddingClasses: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  padding = 'md',
  onClick,
  as: Tag = 'div',
}) => (
  <Tag
    className={[
      'rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800',
      paddingClasses[padding],
      onClick ? 'cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors' : '',
      className,
    ].join(' ')}
    onClick={onClick}
  >
    {children}
  </Tag>
);
