import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  CheckCircle2, 
  DollarSign, 
  Users, 
  Award, 
  Clock, 
  CalendarDays, 
  Calendar, 
  MessageSquare, 
  CreditCard, 
  Shirt, 
  UserCircle, 
  BarChart3, 
  Trash2, 
  LogOut,
  Settings,
  Sun,
  Moon,
  LayoutGrid,
  ShieldCheck,
  Trophy
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import { BottomNavLink } from './BottomNav';
import { getTranslation } from '../../services/translations';
import { StorageService } from '../../services/storage';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { 
    user, 
    academy, 
    theme, 
    language, 
    setTheme, 
    setLanguage, 
    logout, 
    switchAcademy,
    academies 
  } = useAuth();
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  
  const location = useLocation();
  const t = getTranslation(language);

  useEffect(() => {
    if (user?.id && (user?.role === 'admin' || user?.role === 'superuser')) {
      const allUsers = user.role === 'superuser' ? StorageService.getUsers() : StorageService.getUsers(academy?.id || '');
      const pending = allUsers.filter(u => u.status === 'Pending');
      setPendingCount(pending.length);
    } else {
      setPendingCount(0);
    }
  }, [academy?.id, user?.id, user?.role]);

  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        setIsInputFocused(true);
      }
    };
    const handleBlur = () => setIsInputFocused(false);

    window.addEventListener('focusin', handleFocus);
    window.addEventListener('focusout', handleBlur);
    return () => {
      window.removeEventListener('focusin', handleFocus);
      window.removeEventListener('focusout', handleBlur);
    };
  }, []);

  const translatedMainMenu = [
    { to: '/', icon: <Home size={20} />, label: t.dashboard, roles: ['superuser', 'admin', 'instructor', 'staff', 'student'] },
    { to: '/attendance', icon: <CheckCircle2 size={20} />, label: t.attendance, roles: ['superuser', 'admin', 'instructor'] },
    { to: '/finances', icon: <DollarSign size={20} />, label: t.finances, roles: ['superuser', 'admin'] },
  ];

  const translatedManagementMenu = [
    { to: '/students', icon: <Users size={18} />, label: t.students, roles: ['superuser', 'admin', 'instructor', 'staff'] },
    { to: '/instructors', icon: <Award size={18} />, label: t.instructors, roles: ['superuser', 'admin'] },
    { to: '/schedules', icon: <Clock size={18} />, label: t.schedules, roles: ['superuser', 'admin', 'instructor', 'staff', 'student'] },
    { to: '/templates', icon: <CalendarDays size={18} />, label: t.templates, roles: ['superuser', 'admin', 'instructor'] },
    { to: '/calendar', icon: <Calendar size={18} />, label: t.calendar, roles: ['superuser', 'admin', 'instructor', 'staff', 'student'] },
    { to: '/chat', icon: <MessageSquare size={18} />, label: t.chat, roles: ['superuser', 'admin', 'instructor', 'staff', 'student'] },
    { to: '/pay', icon: <CreditCard size={18} />, label: t.pay, roles: ['student'] },
    { to: '/kimonos', icon: <Shirt size={18} />, label: t.kimonos, roles: ['superuser', 'admin', 'staff'] },
    { to: '/profile', icon: <UserCircle size={18} />, label: t.profile, roles: ['student'] },
    { to: '/reports', icon: <BarChart3 size={18} />, label: t.reports, roles: ['superuser', 'admin'] },
    { to: '/recycle-bin', icon: <Trash2 size={18} />, label: t.recycleBin, roles: ['superuser', 'admin'] },
    { to: '/logout', icon: <LogOut size={18} />, label: t.logout, roles: ['superuser', 'admin', 'instructor', 'staff', 'student'] },
  ];

  if (!user) return <>{children}</>;

  return (
    <div className={`flex flex-col h-[100dvh] overflow-hidden transition-all duration-300 dark:bg-slate-950 ${isSidebarCollapsed ? 'md:pl-20' : 'md:pl-64'}`}>
      {/* TAG DE VERSÃO QAS */}
      <div className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none flex justify-center">
        <div className="bg-amber-500/90 text-white text-[10px] font-black px-4 py-1 rounded-b-xl shadow-lg backdrop-blur-sm border-x border-b border-amber-400/50 uppercase tracking-widest animate-in slide-in-from-top duration-500">
          VERSÃO QAS 08/05/2026 16:09:20
        </div>
      </div>

      <div className="no-print shrink-0">
        <Sidebar 
          academy={academy} 
          user={user}
          onLogout={logout} 
          isCollapsed={isSidebarCollapsed} 
          setIsCollapsed={setIsSidebarCollapsed}
          theme={theme}
          onToggleTheme={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          language={language}
          onLanguageChange={setLanguage}
          onSwitchAcademy={switchAcademy}
          translatedMainMenu={translatedMainMenu}
          translatedManagementMenu={translatedManagementMenu}
          pendingCount={pendingCount}
          academies={academies}
        />
      </div>

      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-900 border-b dark:border-slate-800 shrink-0 z-30 shadow-sm transition-colors no-print">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-indigo-600 rounded-xl overflow-hidden shadow-lg shadow-indigo-600/20 shrink-0 flex items-center justify-center p-0.5">
            {academy?.logo ? (
              <img src={academy.logo} alt={academy.name} className="w-full h-full object-contain" />
            ) : (
              <Award className="text-white" size={24} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black text-slate-800 dark:text-white tracking-tighter uppercase italic leading-tight truncate">{academy?.name || 'Gestão Master'}</h1>
            <p className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] mt-0.5 line-clamp-1">{academy?.ownerName || 'Administrador'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-indigo-400 rounded-2xl transition-all active:scale-90"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[100] flex items-end">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="relative w-full bg-white dark:bg-slate-900 rounded-t-[40px] shadow-2xl animate-in slide-in-from-bottom duration-500 p-8 flex flex-col max-h-[85vh]">
            <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-8" />
            <div className="grid grid-cols-2 gap-4 overflow-y-auto">
              {user.role === 'superuser' && (
                <div className="col-span-2 bg-indigo-600 p-6 rounded-[32px] text-white shadow-xl shadow-indigo-600/20 mb-2">
                  <div className="flex items-center gap-3 mb-4">
                    <ShieldCheck size={20} />
                    <span className="font-black text-xs uppercase tracking-tight italic">Trocar Unidade (Master)</span>
                  </div>
                  <select 
                    value={academy?.id || ''}
                    onChange={(e) => {
                      const selected = academies.find(a => a.id === e.target.value);
                      if (selected) {
                        switchAcademy(selected);
                        setIsMobileMenuOpen(false);
                      }
                    }}
                    className="w-full bg-white/20 border-none rounded-2xl p-4 text-xs font-black uppercase tracking-widest text-white appearance-none outline-none focus:ring-2 focus:ring-white/40"
                  >
                    <option value="" disabled>Selecione uma Unidade</option>
                    {academies.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {[...translatedMainMenu, ...translatedManagementMenu].filter(item => item.roles.includes(user.role)).map((item) => {
                if (item.to === '/logout') {
                  return (
                    <button 
                      key="logout-btn"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        logout();
                      }} 
                      className="flex flex-col items-center gap-3 p-5 rounded-3xl bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all border border-transparent group text-center"
                    >
                      <div className="text-red-500 group-hover:scale-110 transition-transform"><LogOut size={18} /></div>
                      <span className="font-bold text-[10px] text-red-600 dark:text-red-400 uppercase tracking-widest">{t.logout}</span>
                    </button>
                  );
                }
                return (
                  <Link key={item.to} to={item.to} onClick={() => setIsMobileMenuOpen(false)} className="flex flex-col items-center gap-3 p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all border border-transparent group">
                    <div className="text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{item.icon}</div>
                    <span className="font-bold text-[10px] text-slate-600 dark:text-slate-300 uppercase tracking-widest">{item.label}</span>
                  </Link>
                );
              })}
              
              <Link to="/settings" onClick={() => setIsMobileMenuOpen(false)} className="flex flex-col items-center gap-3 p-5 rounded-3xl bg-indigo-50/50 dark:bg-indigo-900/20 col-span-2">
                <div className="text-indigo-600 dark:text-indigo-400"><Settings size={22} /></div>
                <span className="font-bold text-[10px] text-indigo-700 dark:text-indigo-300 uppercase tracking-widest">{t.settings}</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      <main className={`flex-1 overflow-y-auto overflow-x-hidden ${isInputFocused ? 'p-4 pb-10' : 'p-4 pb-32 md:p-8'} transition-all duration-300 custom-scrollbar`}>
        {/* INDICADOR DE MODO MASTER (SUPERUSER) */}
        {user.role === 'superuser' && (
          <div className="mb-6 bg-indigo-600 text-white p-4 rounded-[32px] shadow-lg shadow-indigo-600/20 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-top duration-500">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-2.5 rounded-2xl">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h3 className="font-black text-xs uppercase tracking-tight">Modo de Gestão Master Ativo</h3>
                <p className="text-[10px] opacity-90 font-bold uppercase tracking-widest">
                  {academy ? (
                    <>Você está gerenciando a unidade: <span className="text-white underline">{academy.name}</span></>
                  ) : (
                    'Nenhuma unidade selecionada no momento'
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-[9px] font-black uppercase opacity-70 px-3 hidden sm:block">Acesso Total ao Banco de Dados</p>
              <div className="bg-white text-indigo-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest animate-pulse">
                {academy ? 'Unidade Selecionada' : 'Seleção Pendente'}
              </div>
            </div>
          </div>
        )}

        {children}
      </main>

      {/* Dock (Mobile) */}
      {!isInputFocused && (
        <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm z-[90] no-print animate-in fade-in slide-in-from-bottom duration-300">
          <nav className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 flex justify-between items-center h-20 px-4 rounded-[32px] shadow-2xl">
            <BottomNavLink to="/" icon={<Home size={22} />} label="Início" badge={pendingCount > 0 ? pendingCount : undefined} />
            
            {user.role === 'student' ? (
              <>
                <BottomNavLink to="/pay" icon={<CreditCard size={22} />} label="Pagar" />
                <div className="relative -top-6 w-16 h-16 bg-indigo-600 text-white rounded-[24px] flex items-center justify-center shadow-xl shadow-indigo-600/40">
                  <Trophy size={32} />
                </div>
                <BottomNavLink to="/profile" icon={<UserCircle size={22} />} label="Ficha" />
              </>
            ) : (
              <>
                {(user.role === 'superuser' || user.role === 'admin') ? (
                  <BottomNavLink to="/finances" icon={<DollarSign size={22} />} label="Finanças" />
                ) : (
                  <BottomNavLink to="/calendar" icon={<Calendar size={22} />} label="Agenda" />
                )}
                <Link to="/attendance" className="relative -top-6 w-16 h-16 bg-indigo-600 text-white rounded-[24px] flex items-center justify-center shadow-xl shadow-indigo-600/40">
                  <CheckCircle2 size={32} />
                </Link>
                <BottomNavLink to="/students" icon={<Users size={22} />} label="Alunos" />
              </>
            )}
            
            <button onClick={() => setIsMobileMenuOpen(true)} className="flex flex-col items-center justify-center space-y-1 w-full h-full text-slate-400">
              <LayoutGrid size={22} />
              <span className="text-[9px] font-black uppercase tracking-tighter">Menu</span>
            </button>
          </nav>
        </div>
      )}
    </div>
  );
};

export default Layout;
