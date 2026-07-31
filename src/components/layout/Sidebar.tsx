import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Settings, ShieldCheck, Sun, Moon, ChevronLeft, ChevronRight, ChevronDown, Award } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore, getActiveProfile, getEffectiveRoles } from '@/stores/profileStore';
import { useUIStore } from '@/stores/uiStore';
import { useTranslation } from '@/hooks/useTranslation';
import { academyService } from '@/features/settings/services/academyService';
import { ProfileSwitcher } from './ProfileSwitcher';
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
  const { profiles: switcherProfiles, activeProfileId } = useProfileStore();
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

  const activeProfile = getActiveProfile(switcherProfiles, activeProfileId);
  const effectiveRoles = getEffectiveRoles(user.role, activeProfile);
  const mainItems = MAIN_NAV.filter((item) => item.roles.some((r) => effectiveRoles.includes(r)));
  const mgmtItems = MANAGEMENT_NAV
    .filter((item) => item.roles.some((r) => effectiveRoles.includes(r)))
    .filter((item) => item.to !== '/kimonos' || academy?.kimonoLoanEnabled);

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
              <div className="flex-1 min-w-0">
                <span className="text-xs font-bold text-slate-300 leading-tight line-clamp-2 block">
                  {academy?.name ?? '—'}
                </span>
                {academy?.ownerName && (
                  <span className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.15em] leading-none block mt-0.5 truncate">
                    {academy.ownerName}
                  </span>
                )}
              </div>
            </div>
            {/* User info row / seletor de perfil */}
            <ProfileSwitcher />
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
      <div className="mt-auto p-3 border-t border-slate-800 bg-slate-900/50">
        {collapsed ? (
          <div className="space-y-1">
            <Link
              to="/settings"
              title={String(t.settings ?? 'Configurações')}
              className={[
                'flex items-center justify-center rounded-xl h-10 w-10 mx-auto transition-all',
                isActive('/settings') ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800',
              ].join(' ')}
            >
              <Settings size={18} />
            </Link>
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
              className="flex items-center justify-center rounded-xl h-10 w-10 mx-auto transition-all text-slate-400 hover:text-white hover:bg-slate-800"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            {/* Settings */}
            <Link
              to="/settings"
              className={[
                'flex items-center gap-1.5 px-2.5 py-2 rounded-xl transition-all flex-1 min-w-0',
                isActive('/settings') ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800',
              ].join(' ')}
            >
              <Settings size={14} className="shrink-0" />
              <span className="font-bold text-[10px] truncate">{String(t.settings ?? 'Configurações')}</span>
            </Link>

            {/* Language combobox */}
            <div className="relative shrink-0">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="bg-slate-800 border-none rounded-xl text-[10px] font-bold text-slate-300 py-2 pl-2 pr-5 outline-none focus:ring-1 focus:ring-indigo-500 appearance-none cursor-pointer"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>{l.flag} {l.label}</option>
                ))}
              </select>
              <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
              className={[
                'shrink-0 flex items-center justify-center rounded-xl h-8 w-8 transition-all',
                theme === 'dark'
                  ? 'bg-indigo-600/30 text-indigo-300 hover:bg-indigo-600/50'
                  : 'bg-amber-400/20 text-amber-400 hover:bg-amber-400/30',
              ].join(' ')}
            >
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
