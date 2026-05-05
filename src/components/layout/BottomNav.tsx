import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface BottomNavLinkProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}

export const BottomNavLink: React.FC<BottomNavLinkProps> = ({ to, icon, label, badge }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link to={to} className={`flex flex-col items-center justify-center space-y-1 w-full h-full transition-all relative ${isActive ? 'text-indigo-600 dark:text-indigo-400 scale-110' : 'text-slate-400'}`}>
      <div className="relative">
        {icon}
        {badge !== undefined && (
          <span className="absolute -top-1 -right-1.5 bg-red-500 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 animate-pulse">
            {badge > 9 ? '+' : badge}
          </span>
        )}
      </div>
      <span className="text-[9px] font-black uppercase tracking-tighter">{label}</span>
    </Link>
  );
};
