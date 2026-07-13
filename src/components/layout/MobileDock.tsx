import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, CheckCircle2, Users, Calendar, UserCircle, LayoutGrid } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';

interface DockLinkProps {
  to: string;
  icon: React.ReactNode;
  label: string;
}

const DockLink: React.FC<DockLinkProps> = ({ to, icon, label }) => {
  const location = useLocation();
  const active = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

  return (
    <Link
      to={to}
      className={[
        'flex flex-col items-center justify-center space-y-1 w-full h-full transition-all',
        active ? 'text-indigo-600 dark:text-indigo-400 scale-110' : 'text-slate-400',
      ].join(' ')}
    >
      {icon}
      <span className="text-[9px] font-black uppercase tracking-tighter">{label}</span>
    </Link>
  );
};

export const MobileDock: React.FC = () => {
  const { user } = useAuthStore();
  const { setMobileMenuOpen } = useUIStore();

  if (!user) return null;

  return (
    <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm z-[90] no-print animate-in fade-in slide-in-from-bottom duration-300">
      <nav className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 flex justify-between items-center h-20 px-4 rounded-[32px] shadow-2xl">
        <DockLink to="/" icon={<Home size={22} />} label="Início" />

        {user.role === 'student' ? (
          <>
            <DockLink to="/calendar" icon={<Calendar size={22} />} label="Agenda" />
            <div className="relative -top-6 w-16 h-16 bg-indigo-600 text-white rounded-[24px] flex items-center justify-center shadow-xl shadow-indigo-600/40 shrink-0">
              <UserCircle size={28} />
            </div>
            <DockLink to="/profile" icon={<UserCircle size={22} />} label="Ficha" />
          </>
        ) : (
          <>
            {/* DESATIVADO — controle financeiro simplificado (pagamento via /pay) */}
            {/* {user.role === 'superuser' || user.role === 'admin' ? (
              <DockLink to="/finances" icon={<DollarSign size={22} />} label="Finanças" />
            ) : (
              <DockLink to="/calendar" icon={<Calendar size={22} />} label="Agenda" />
            )} */}
            <DockLink to="/calendar" icon={<Calendar size={22} />} label="Agenda" />
            <Link
              to="/attendance"
              className="relative -top-6 w-16 h-16 bg-indigo-600 text-white rounded-[24px] flex items-center justify-center shadow-xl shadow-indigo-600/40 shrink-0"
            >
              <CheckCircle2 size={28} />
            </Link>
            {user.role === 'instructor' ? (
              <DockLink to="/instructor-profile" icon={<UserCircle size={22} />} label="Meus Dados" />
            ) : (
              <DockLink to="/students" icon={<Users size={22} />} label="Alunos" />
            )}
          </>
        )}

        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center space-y-1 w-full h-full text-slate-400"
        >
          <LayoutGrid size={22} />
          <span className="text-[9px] font-black uppercase tracking-tighter">Menu</span>
        </button>
      </nav>
    </div>
  );
};
