import React from 'react';
import { Link } from 'react-router-dom';
import { Settings, LogOut, Share2, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore, getActiveProfile, getEffectiveRoles } from '@/stores/profileStore';
import { useUIStore } from '@/stores/uiStore';
import { useTranslation } from '@/hooks/useTranslation';
import { MAIN_NAV, MANAGEMENT_NAV } from './navConfig';
import { NavIcon } from './NavIcons';

export const MobileMenu: React.FC = () => {
  const { user, academy, logout } = useAuthStore();
  const { profiles: switcherProfiles, activeProfileId } = useProfileStore();
  const { mobileMenuOpen, setMobileMenuOpen } = useUIStore();
  const { t } = useTranslation();

  if (!mobileMenuOpen || !user) return null;

  const effectiveRoles = getEffectiveRoles(user.role, getActiveProfile(switcherProfiles, activeProfileId));
  const allItems = [...MAIN_NAV, ...MANAGEMENT_NAV]
    .filter((item) => item.roles.some((r) => effectiveRoles.includes(r)))
    .filter((item) => item.to !== '/kimonos' || academy?.kimonoLoanEnabled);

  const close = () => setMobileMenuOpen(false);

  const handleShare = async () => {
    close();
    const url = window.location.origin;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'NexDojo', url });
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      // user cancelled or browser unsupported
    }
  };

  return (
    <div className="md:hidden fixed inset-0 z-[100] flex items-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={close}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div className="relative w-full bg-white dark:bg-slate-900 rounded-t-[40px] shadow-2xl animate-in slide-in-from-bottom duration-500 p-8 flex flex-col max-h-[85vh]">
        <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-8" />

        <div className="grid grid-cols-2 gap-4 overflow-y-auto">
          {/* Superuser academy switcher */}
          {user.role === 'superuser' && (
            <div className="col-span-2 bg-indigo-600 p-6 rounded-[32px] text-white shadow-xl shadow-indigo-600/20 mb-2">
              <div className="flex items-center gap-3 mb-4">
                <ShieldCheck size={20} />
                <span className="font-black text-xs uppercase tracking-tight italic">Trocar Unidade (Master)</span>
              </div>
              <p className="text-[10px] opacity-80">{academy?.name ?? 'Nenhuma unidade'}</p>
            </div>
          )}

          {/* Menu items */}
          {allItems.map((item) => {
            const label = t[item.labelKey as keyof typeof t] ?? item.labelKey;

            if (item.to === '/logout') {
              return (
                <button
                  key="logout"
                  onClick={() => { close(); logout(); }}
                  className="flex flex-col items-center gap-3 p-5 rounded-3xl bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all group text-center"
                >
                  <LogOut size={18} className="text-red-500 group-hover:scale-110 transition-transform" />
                  <span className="font-bold text-[10px] text-red-600 dark:text-red-400 uppercase tracking-widest">
                    {String(label)}
                  </span>
                </button>
              );
            }

            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={close}
                className="flex flex-col items-center gap-3 p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all group"
              >
                <span className="text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                  <NavIcon name={item.icon} size={18} />
                </span>
                <span className="font-bold text-[10px] text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                  {String(label)}
                </span>
              </Link>
            );
          })}

          {/* Settings */}
          <Link
            to="/settings"
            onClick={close}
            className="flex flex-col items-center gap-3 p-5 rounded-3xl bg-indigo-50/50 dark:bg-indigo-900/20"
          >
            <Settings size={22} className="text-indigo-600 dark:text-indigo-400" />
            <span className="font-bold text-[10px] text-indigo-700 dark:text-indigo-300 uppercase tracking-widest">
              {String(t.settings ?? 'Config')}
            </span>
          </Link>

          {/* Share */}
          <button
            onClick={handleShare}
            className="flex flex-col items-center gap-3 p-5 rounded-3xl bg-emerald-50/50 dark:bg-emerald-900/20"
          >
            <Share2 size={22} className="text-emerald-600 dark:text-emerald-400" />
            <span className="font-bold text-[10px] text-emerald-700 dark:text-emerald-300 uppercase tracking-widest">
              Compartilhar
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
