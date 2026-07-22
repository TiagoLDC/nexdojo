import React from 'react';
import { Sun, Moon, Award } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { ProfileSwitcher } from './ProfileSwitcher';

export const MobileHeader: React.FC = () => {
  const { academy } = useAuthStore();
  const { theme, toggleTheme } = useUIStore();

  return (
    <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 z-30 shadow-sm transition-colors no-print">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl overflow-hidden shadow-lg shadow-indigo-600/20 shrink-0 flex items-center justify-center p-0.5">
          {academy?.logo ? (
            <img src={academy.logo} alt={academy.name} className="w-full h-full object-contain" />
          ) : (
            <Award className="text-white" size={20} />
          )}
        </div>
        <div className="min-w-0">
          <h1 className="text-base font-black text-slate-800 dark:text-white tracking-tighter uppercase italic leading-tight truncate">
            {academy?.name ?? 'NexDojo'}
          </h1>
          <p className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em]">
            {academy?.ownerName ?? 'Administrador'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <ProfileSwitcher compact />
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-2xl p-1 gap-1 shrink-0">
          <button
            onClick={() => theme !== 'light' && toggleTheme()}
            className={[
              'flex items-center justify-center p-2 rounded-xl transition-all active:scale-90',
              theme === 'light'
                ? 'bg-amber-400 text-slate-900 shadow-sm'
                : 'text-slate-400 dark:text-slate-500',
            ].join(' ')}
            aria-label="Modo claro"
          >
            <Sun size={16} />
          </button>
          <button
            onClick={() => theme !== 'dark' && toggleTheme()}
            className={[
              'flex items-center justify-center p-2 rounded-xl transition-all active:scale-90',
              theme === 'dark'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 dark:text-slate-500',
            ].join(' ')}
            aria-label="Modo escuro"
          >
            <Moon size={16} />
          </button>
        </div>
      </div>
    </header>
  );
};
