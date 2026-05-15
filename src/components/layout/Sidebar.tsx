import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Settings, ShieldCheck, Sun, Moon, ChevronLeft, ChevronRight, Award } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { useTranslation } from '@/hooks/useTranslation';
import { academyService } from '@/features/settings/services/academyService';
import { MAIN_NAV, MANAGEMENT_NAV } from './navConfig';
import { NavIcon } from './NavIcons';
import type { Language } from '@/types';

const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: 'pt', label: 'PT', flag: '🇧🇷' },
  { code: 'en', label: 'EN', flag: '🇺🇸' },
  { code: 'es', label: 'ES', flag: '🇪🇸' },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user, academy, logout, setAcademy } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar, theme, toggleTheme } = useUIStore();
  const { t, language, setLanguage } = useTranslation();
  const queryClient = useQueryClient();

  if (!user) return null;

  const collapsed = sidebarCollapsed;

  const { data: allAcademies = [] } = useQuery({
    queryKey: ['academies-all'],
    queryFn: academyService.getAll,
    enabled: user.role === 'superuser',
    staleTime: 60_000,
  });

  const mainItems = MAIN_NAV.filter((item) => item.roles.includes(user.role));
  const mgmtItems = MANAGEMENT_NAV.filter((item) => item.roles.includes(user.role));

  const isActive = (to: string) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

  return (
    <aside
      className={[
        'hidden md:flex flex-col fixed left-0 top-0 bottom-0 bg-slate-900 text-white z-50 shadow-2xl transition-all duration-300',
        collapsed ? 'w-20' : 'w-64',
      ].join(' ')}
    >
      {/* Toggle button */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-10 bg-indigo-600 text-white p-1 rounded-full border-4 border-slate-900 hover:bg-indigo-500 shadow-lg z-10 transition-transform active:scale-90"
        aria-label={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Logo / Academy */}
      <div className="p-4 pb-2">
        {collapsed ? (
          /* Collapsed: só o card do logo centralizado */
          <div className="flex justify-center">
            <div className="sidebar-brand-card-sm">
              <img src="/logo.png" alt="NexDojo" className="sidebar-brand-logo-sm" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {/* Brand: logo card + NexDojo camelCase */}
            <div className="sidebar-brand-row">
              <div className="sidebar-brand-card">
                <img src="/logo.png" alt="NexDojo" className="sidebar-brand-logo" />
              </div>
              <span className="sidebar-brand-name">
                <span className="sidebar-brand-nex">Nex</span><span className="sidebar-brand-dojo">Dojo</span>
              </span>
            </div>
            {/* Academy row */}
            <div className="flex items-center gap-2 bg-slate-800/60 rounded-xl px-2 py-1.5">
              <div className="w-7 h-7 bg-indigo-500 rounded-full overflow-hidden shrink-0 shadow shadow-indigo-500/20 flex items-center justify-center">
                {academy?.logo ? (
                  <img src={academy.logo} alt={academy.name} className="w-full h-full object-cover" />
                ) : (
                  <Award className="text-white" size={14} />
                )}
              </div>
              <span className="text-xs font-bold text-slate-300 leading-tight line-clamp-2 flex-1">
                {academy?.name ?? '—'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-4 space-y-4 overflow-y-auto custom-scrollbar">
        {/* Superuser academy switcher */}
        {user.role === 'superuser' && (
          <div className="px-1 mb-4">
            {!collapsed && (
              <p className="text-[8px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-2 px-3 italic">
                Master Control
              </p>
            )}
            <div
              className={`bg-indigo-900/40 rounded-2xl border border-indigo-500/20 p-3 ${collapsed ? 'flex justify-center' : ''}`}
            >
              {collapsed ? (
                <ShieldCheck size={20} className="text-indigo-400" />
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-indigo-400">
                    <ShieldCheck size={16} />
                    <span className="font-black text-[9px] uppercase tracking-widest">Switch Academy</span>
                  </div>
                  <select
                    value={academy?.id ?? ''}
                    onChange={async (e) => {
                      const found = allAcademies.find((a) => a.id === e.target.value);
                      if (found) {
                        const full = await academyService.get(found.id);
                        setAcademy(full);
                        queryClient.invalidateQueries();
                      }
                    }}
                    className="w-full bg-slate-800 border-none rounded-lg text-[10px] font-bold text-slate-300 py-1.5 px-2 outline-none focus:ring-1 focus:ring-indigo-500 appearance-none cursor-pointer"
                  >
                    <option value="" disabled>Selecionar unidade</option>
                    {allAcademies.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main links */}
        <div className="space-y-1">
          {!collapsed && (
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 px-3">Links</p>
          )}
          {mainItems.map((item) => {
            const active = isActive(item.to);
            const label = t[item.labelKey as keyof typeof t] ?? item.labelKey;
            return (
              <Link
                key={item.to}
                to={item.to}
                title={collapsed ? String(label) : ''}
                className={[
                  'flex items-center rounded-xl transition-all h-10 relative',
                  active ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800',
                  collapsed ? 'justify-center w-10 mx-auto' : 'px-4 gap-3',
                ].join(' ')}
              >
                <NavIcon name={item.icon} size={20} />
                {!collapsed && <span className="font-bold text-xs">{String(label)}</span>}
              </Link>
            );
          })}
        </div>

        {/* Management grid */}
        <div className="space-y-1">
          {!collapsed && (
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 px-3">Management</p>
          )}
          <div className={!collapsed ? 'grid grid-cols-2 gap-2' : 'space-y-1'}>
            {mgmtItems.map((item) => {
              const active = isActive(item.to);
              const label = t[item.labelKey as keyof typeof t] ?? item.labelKey;

              if (item.to === '/logout') {
                return (
                  <button
                    key="logout"
                    onClick={logout}
                    title={collapsed ? String(label) : ''}
                    className={[
                      'flex items-center rounded-xl transition-all cursor-pointer text-slate-500 hover:text-red-400 hover:bg-slate-800',
                      !collapsed ? 'h-16 flex-col justify-center gap-1 text-center w-full' : 'h-10 justify-center w-10 mx-auto',
                    ].join(' ')}
                  >
                    <NavIcon name={item.icon} size={18} />
                    {!collapsed && (
                      <span className="font-black text-[9px] uppercase tracking-tighter leading-none">{String(label)}</span>
                    )}
                  </button>
                );
              }

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  title={collapsed ? String(label) : ''}
                  className={[
                    'flex items-center rounded-xl transition-all',
                    !collapsed ? 'h-16 flex-col justify-center gap-1 text-center' : 'h-10 justify-center w-10 mx-auto',
                    active
                      ? 'bg-slate-800 text-indigo-400'
                      : 'text-slate-500 hover:text-white hover:bg-slate-800',
                  ].join(' ')}
                >
                  <NavIcon name={item.icon} size={18} />
                  {!collapsed && (
                    <span className="font-black text-[9px] uppercase tracking-tighter leading-none">{String(label)}</span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="mt-auto space-y-1 p-4 border-t border-slate-800 bg-slate-900/50">
        {/* Language switcher */}
        {!collapsed && (
          <div className="flex items-center justify-around mb-3 bg-slate-800/50 p-2 rounded-2xl border border-slate-700/50">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setLanguage(lang.code)}
                className={[
                  'flex flex-col items-center gap-1 transition-all',
                  language === lang.code ? 'scale-110' : 'opacity-40 grayscale hover:grayscale-0 hover:opacity-100',
                ].join(' ')}
              >
                <span className="text-xl leading-none">{lang.flag}</span>
                <span className="text-[7px] font-black uppercase tracking-widest">{lang.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Settings link */}
        <Link
          to="/settings"
          title={collapsed ? String(t.settings ?? 'Configurações') : ''}
          className={[
            'flex items-center rounded-xl h-10 transition-all',
            isActive('/settings')
              ? 'bg-indigo-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-white hover:bg-slate-800',
            collapsed ? 'justify-center w-10 mx-auto' : 'px-4 gap-3',
          ].join(' ')}
        >
          <Settings size={18} />
          {!collapsed && <span className="font-bold text-xs">{String(t.settings ?? 'Configurações')}</span>}
        </Link>

        {/* Theme toggle */}
        {!collapsed ? (
          <div className="flex items-center bg-slate-800 rounded-xl p-1 gap-1">
            <button
              onClick={() => theme !== 'light' && toggleTheme()}
              className={[
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg flex-1 justify-center transition-all text-xs font-bold',
                theme === 'light'
                  ? 'bg-amber-400 text-slate-900 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200',
              ].join(' ')}
            >
              <Sun size={13} />
              Claro
            </button>
            <button
              onClick={() => theme !== 'dark' && toggleTheme()}
              className={[
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg flex-1 justify-center transition-all text-xs font-bold',
                theme === 'dark'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200',
              ].join(' ')}
            >
              <Moon size={13} />
              Escuro
            </button>
          </div>
        ) : (
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
            className="flex items-center justify-center rounded-xl h-10 transition-all w-10 mx-auto text-slate-400 hover:text-white hover:bg-slate-800"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        )}
      </div>
    </aside>
  );
};
