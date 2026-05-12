import React, { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { useTranslation } from '@/hooks/useTranslation';
import { Toast } from '@/components/ui/Toast';
import { Sidebar } from './Sidebar';
import { MobileHeader } from './MobileHeader';
import { MobileDock } from './MobileDock';
import { MobileMenu } from './MobileMenu';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { user, academy } = useAuthStore();
  const { sidebarCollapsed } = useUIStore();
  const { t } = useTranslation();
  const [inputFocused, setInputFocused] = useState(false);

  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') setInputFocused(true);
    };
    const onFocusOut = () => setInputFocused(false);
    window.addEventListener('focusin', onFocusIn);
    window.addEventListener('focusout', onFocusOut);
    return () => {
      window.removeEventListener('focusin', onFocusIn);
      window.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  if (!user) return null;

  return (
    <div
      className={[
        'flex flex-col h-[100dvh] overflow-hidden transition-all duration-300 dark:bg-slate-950',
        sidebarCollapsed ? 'md:pl-20' : 'md:pl-64',
      ].join(' ')}
    >
      {/* Version tag */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none">
        <div className="bg-amber-400 text-amber-950 text-[8px] font-black uppercase tracking-widest px-3 py-px rounded-b-lg select-none shadow-sm">
          VERSÃO QAS 12/05/2026 10:24:26
        </div>
      </div>

      {/* Desktop sidebar */}
      <Sidebar />

      {/* Mobile top header */}
      <MobileHeader />

      {/* Main content */}
      <main
        className={[
          'flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar transition-all duration-300',
          inputFocused ? 'p-4 pb-10' : 'p-4 pb-32 md:p-8',
        ].join(' ')}
      >
        {/* Superuser banner */}
        {user.role === 'superuser' && (
          <div className="mb-6 bg-indigo-600 text-white p-4 rounded-[32px] shadow-lg shadow-indigo-600/20 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-top duration-500">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-2.5 rounded-2xl">
                <ShieldCheck size={22} />
              </div>
              <div>
                <h3 className="font-black text-xs uppercase tracking-tight">{t.activeMasterMode}</h3>
                <p className="text-[10px] opacity-90 font-bold uppercase tracking-widest">
                  {academy ? (
                    <>{t.managing} <span className="text-white underline">{academy.name}</span></>
                  ) : (
                    t.noUnitSelected
                  )}
                </p>
              </div>
            </div>
            <div className="bg-white text-indigo-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest animate-pulse">
              {academy ? t.unitSelected : t.pendingSelection}
            </div>
          </div>
        )}

        {children}
      </main>

      {/* Mobile bottom dock */}
      {!inputFocused && <MobileDock />}

      {/* Mobile slide-up menu */}
      <MobileMenu />

      {/* Global toast */}
      <Toast />
    </div>
  );
};
