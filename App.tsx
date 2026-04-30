
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { 
  Users, 
  CheckCircle2, 
  BarChart3, 
  Settings, 
  Shirt,
  Search,
  ChevronRight,
  ChevronLeft,
  LogOut,
  Trophy,
  CalendarDays,
  LayoutGrid,
  Award,
  MessageSquare,
  Calendar,
  Moon,
  Sun,
  X,
  MoreHorizontal,
  Home,
  AlertTriangle,
  Trash2,
  DollarSign,
  UserCircle,
  CreditCard,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';

import { Academy, Student, User, Belt } from './types';
import { StorageService } from './services/storage';
import { MOCK_ACADEMY } from './services/mockData';
import DashboardView from './views/DashboardView';
import AttendanceView from './views/AttendanceView';
import StudentsView from './views/StudentsView';
import InstructorsView from './views/InstructorsView';
import ReportsView from './views/ReportsView';
import SettingsView from './views/SettingsView';
import LoginView from './views/LoginView';
import KimonoView from './views/KimonoView';
import TemplateView from './views/TemplateView';
import ChatView from './views/ChatView';
import CalendarView from './views/CalendarView';
import RecycleBinView from './views/RecycleBinView';
import FinancesView from './views/FinancesView';
import StudentProfileView from './views/StudentProfileView';
import PaymentView from './views/PaymentView';

// Itens principais (Linha Inteira)
const MAIN_MENU = [
  { to: '/', icon: <Home size={20} />, label: 'Dashboard', roles: ['superuser', 'admin', 'instructor', 'staff', 'student'] },
  { to: '/attendance', icon: <CheckCircle2 size={20} />, label: 'Fazer Chamada', roles: ['superuser', 'admin', 'instructor'] },
  { to: '/finances', icon: <DollarSign size={20} />, label: 'Financeiro', roles: ['superuser', 'admin'] },
];

// Itens de Gestão (Grade de 2 Colunas)
const MANAGEMENT_MENU = [
  { to: '/students', icon: <Users size={18} />, label: 'Alunos', roles: ['superuser', 'admin', 'instructor', 'staff'] },
  { to: '/instructors', icon: <Award size={18} />, label: 'Mestres', roles: ['superuser', 'admin'] },
  { to: '/templates', icon: <CalendarDays size={18} />, label: 'Turmas', roles: ['superuser', 'admin', 'instructor'] },
  { to: '/calendar', icon: <Calendar size={18} />, label: 'Agenda', roles: ['superuser', 'admin', 'instructor', 'staff', 'student'] },
  { to: '/chat', icon: <MessageSquare size={18} />, label: 'Mural', roles: ['superuser', 'admin', 'instructor', 'staff', 'student'] },
  { to: '/pay', icon: <CreditCard size={18} />, label: 'Pagamento', roles: ['student'] },
  { to: '/kimonos', icon: <Shirt size={18} />, label: 'Quimonos', roles: ['superuser', 'admin', 'staff'] },
  { to: '/profile', icon: <UserCircle size={18} />, label: 'Minha Ficha', roles: ['student'] },
  { to: '/reports', icon: <BarChart3 size={18} />, label: 'Dados', roles: ['superuser', 'admin'] },
  { to: '/recycle-bin', icon: <Trash2 size={18} />, label: 'Lixeira', roles: ['superuser', 'admin'] },
  { to: '/logout', icon: <LogOut size={18} />, label: 'Sair', roles: ['superuser', 'admin', 'instructor', 'staff', 'student'] },
];

const ProtectedRoute: React.FC<{ children: React.ReactNode; roles: string[]; user: User }> = ({ children, roles, user }) => {
  if (!roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(StorageService.getCurrentUser());
  const [academy, setAcademy] = useState<Academy | null>(user ? StorageService.getAcademyById(user.academyId) : null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(StorageService.getTheme());

  useEffect(() => {
    const savedAccent = localStorage.getItem('oss_accent_color') || 'indigo';
    const accentMap: Record<string, string> = {
      indigo: '#4f46e5',
      blue: '#2563eb',
      emerald: '#10b981',
      rose: '#f43f5e'
    };
    document.documentElement.style.setProperty('--primary-accent-color', accentMap[savedAccent]);

    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.style.backgroundColor = '#020617'; // slate-950
    } else {
      document.documentElement.classList.remove('dark');
      document.body.style.backgroundColor = '#f8fafc'; // slate-50
    }
    StorageService.saveTheme(theme);
  }, [theme]);

  const handleLogin = (loggedUser: User, currentAcademy: Academy) => {
    setUser(loggedUser);
    
    // Se for superuser, tenta carregar a última academia vista ou a primeira da lista
    let academyToSet = currentAcademy;
    if (loggedUser.role === 'superuser') {
      const allAcademies = StorageService.getAcademies();
      const savedAcadId = localStorage.getItem('oss_last_superuser_academy');
      academyToSet = allAcademies.find(a => a.id === savedAcadId) || allAcademies[0] || MOCK_ACADEMY;
    }

    setAcademy(academyToSet);
    StorageService.saveCurrentUser(loggedUser);
    StorageService.saveAcademy(academyToSet); // Salva como academia ativa
  };

  const handleSwitchAcademy = (newAcademy: Academy) => {
    setAcademy(newAcademy);
    StorageService.saveAcademy(newAcademy);
    localStorage.setItem('oss_last_superuser_academy', newAcademy.id);
  };

  const handleLogout = () => {
    StorageService.clear();
    setAcademy(null);
    setUser(null);
    setIsMobileMenuOpen(false);
  };

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  if (!user || !academy) {
    return <LoginView onLogin={handleLogin} />;
  }

  return (
    <HashRouter>
      <div className={`flex flex-col min-h-screen pb-24 md:pb-0 transition-all duration-300 dark:bg-slate-950 ${isSidebarCollapsed ? 'md:pl-20' : 'md:pl-64'}`}>
        <div className="no-print">
          <Sidebar 
            academy={academy} 
            onLogout={handleLogout} 
            isCollapsed={isSidebarCollapsed} 
            setIsCollapsed={setIsSidebarCollapsed}
            theme={theme}
            onToggleTheme={toggleTheme}
            user={user}
            onSwitchAcademy={handleSwitchAcademy}
          />
        </div>

        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between px-6 py-5 bg-white dark:bg-slate-900 border-b dark:border-slate-800 sticky top-0 z-30 shadow-sm transition-colors no-print">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-indigo-600 rounded-xl overflow-hidden shadow-lg shadow-indigo-600/20 shrink-0 flex items-center justify-center p-0.5">
              {academy.logo ? (
                <img 
                  src={academy.logo} 
                  alt={academy.name} 
                  className="w-full h-full object-contain"
                />
              ) : (
                <Award className="text-white" size={24} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-black text-slate-800 dark:text-white tracking-tighter uppercase italic leading-tight truncate">{academy.name}</h1>
              <p className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] mt-0.5 line-clamp-1">{academy.ownerName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleTheme}
              className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-indigo-400 rounded-2xl transition-all active:scale-90"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </div>

        {/* Bottom Menu (Mobile) */}
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
                      value={academy.id}
                      onChange={(e) => {
                        const selected = StorageService.getAcademies().find(a => a.id === e.target.value);
                        if (selected) {
                          handleSwitchAcademy(selected);
                          setIsMobileMenuOpen(false);
                        }
                      }}
                      className="w-full bg-white/20 border-none rounded-2xl p-4 text-xs font-black uppercase tracking-widest text-white appearance-none outline-none focus:ring-2 focus:ring-white/40"
                    >
                      {StorageService.getAcademies().map(a => (
                        <option key={a.id} value={a.id} className="text-slate-900">{a.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                {[...MAIN_MENU, ...MANAGEMENT_MENU].filter(item => item.roles.includes(user.role)).map((item) => {
                  if (item.to === '/logout') {
                    return (
                      <button 
                        key="logout-btn"
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          handleLogout();
                        }} 
                        className="flex flex-col items-center gap-3 p-5 rounded-3xl bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all border border-transparent group text-center"
                      >
                        <div className="text-red-500 group-hover:scale-110 transition-transform"><LogOut size={18} /></div>
                        <span className="font-bold text-[10px] text-red-600 dark:text-red-400 uppercase tracking-widest">Sair</span>
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
                  <span className="font-bold text-[10px] text-indigo-700 dark:text-indigo-300 uppercase tracking-widest">Configurações do Sistema</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 p-4 md:p-8">
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
                    Você está gerenciando a unidade: <span className="text-white underline">{academy.name}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-[9px] font-black uppercase opacity-70 px-3 hidden sm:block">Acesso Total ao Banco de Dados</p>
                <div className="bg-white text-indigo-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest animate-pulse">
                  Unidade Selecionada
                </div>
              </div>
            </div>
          )}

          <Routes>
            <Route path="/" element={<DashboardView academy={academy} user={user} onSwitchAcademy={handleSwitchAcademy} />} />
            <Route path="/templates" element={
              <ProtectedRoute roles={['superuser', 'admin', 'instructor']} user={user}>
                <TemplateView academy={academy} user={user} />
              </ProtectedRoute>
            } />
            <Route path="/attendance" element={
              <ProtectedRoute roles={['superuser', 'admin', 'instructor']} user={user}>
                <AttendanceView academy={academy} user={user} />
              </ProtectedRoute>
            } />
            <Route path="/finances" element={
              <ProtectedRoute roles={['superuser', 'admin']} user={user}>
                <FinancesView academy={academy} user={user} />
              </ProtectedRoute>
            } />
            <Route path="/students" element={
              <ProtectedRoute roles={['superuser', 'admin', 'instructor', 'staff']} user={user}>
                <StudentsView academy={academy} user={user} />
              </ProtectedRoute>
            } />
            <Route path="/instructors" element={
              <ProtectedRoute roles={['superuser', 'admin']} user={user}>
                <InstructorsView academy={academy} user={user} />
              </ProtectedRoute>
            } />
            <Route path="/kimonos" element={
              <ProtectedRoute roles={['superuser', 'admin', 'staff']} user={user}>
                <KimonoView academy={academy} user={user} />
              </ProtectedRoute>
            } />
            <Route path="/calendar" element={<CalendarView academy={academy} user={user} />} />
            <Route path="/chat" element={<ChatView academy={academy} user={user} />} />
            <Route path="/profile" element={
              <ProtectedRoute roles={['student']} user={user}>
                <StudentProfileView academy={academy} user={user} />
              </ProtectedRoute>
            } />
            <Route path="/pay" element={
              <ProtectedRoute roles={['student']} user={user}>
                <PaymentView academy={academy} user={user} />
              </ProtectedRoute>
            } />
            <Route path="/reports" element={
              <ProtectedRoute roles={['superuser', 'admin']} user={user}>
                <ReportsView academy={academy} user={user} />
              </ProtectedRoute>
            } />
            <Route path="/recycle-bin" element={
              <ProtectedRoute roles={['superuser', 'admin']} user={user}>
                <RecycleBinView academy={academy} user={user} />
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <SettingsView 
                academy={academy} 
                user={user}
                onLogout={handleLogout} 
                theme={theme} 
                onToggleTheme={toggleTheme}
                onUpdateAcademy={(updatedAcademy) => {
                  setAcademy(updatedAcademy);
                  StorageService.saveAcademy(updatedAcademy);
                }}
              />
            } />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>

        {/* Dock (Mobile) */}
        <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm z-[90] no-print">
          <nav className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 flex justify-between items-center h-20 px-4 rounded-[32px] shadow-2xl">
            <BottomNavLink to="/" icon={<Home size={22} />} label="Início" />
            
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
      </div>
    </HashRouter>
  );
};

const BottomNavLink: React.FC<{ to: string; icon: React.ReactNode; label: string }> = ({ to, icon, label }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link to={to} className={`flex flex-col items-center justify-center space-y-1 w-full h-full transition-all ${isActive ? 'text-indigo-600 dark:text-indigo-400 scale-110' : 'text-slate-400'}`}>
      {icon}
      <span className="text-[9px] font-black uppercase tracking-tighter">{label}</span>
    </Link>
  );
};

  const Sidebar: React.FC<{ 
  academy: Academy; 
  onLogout: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (v: boolean) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  user: User;
  onSwitchAcademy?: (acad: Academy) => void;
}> = ({ academy, onLogout, isCollapsed, setIsCollapsed, theme, onToggleTheme, user, onSwitchAcademy }) => {
  const location = useLocation();
  const allAcademies = StorageService.getAcademies();
  
  return (
    <aside className={`hidden md:flex flex-col fixed left-0 top-0 bottom-0 bg-slate-900 text-white transition-all duration-300 z-50 shadow-2xl ${isCollapsed ? 'w-20' : 'w-64'}`}>
      <div className="p-6">
        <button onClick={() => setIsCollapsed(!isCollapsed)} className="absolute -right-3 top-10 bg-indigo-600 text-white p-1 rounded-full border-4 border-slate-900 hover:bg-indigo-500 shadow-lg z-10 transition-transform active:scale-90">
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
        <div className={`mb-6 flex flex-col gap-3 ${isCollapsed ? 'items-center' : ''}`}>
          <div className="flex items-center gap-3 w-full">
            <div className="w-10 h-10 bg-indigo-500 rounded-xl overflow-hidden shrink-0 shadow-lg shadow-indigo-500/20 flex items-center justify-center p-0.5">
              {academy.logo ? (
                <img 
                  src={academy.logo} 
                  alt={academy.name} 
                  className="w-full h-full object-contain"
                />
              ) : (
                <Award className="text-white" size={24} />
              )}
            </div>
            {!isCollapsed && (
              <h1 className="text-lg font-black tracking-tighter uppercase italic leading-tight break-words flex-1">
                {academy.name}
              </h1>
            )}
          </div>

          {/* Seletor de Academia para Superuser - REMOVIDO DAQUI */}
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-4 overflow-y-auto custom-scrollbar">
        {/* MODO MASTER - NOVO ITEM DE MENU */}
        {user.role === 'superuser' && (
          <div className="px-1 mb-4">
            {!isCollapsed && <p className="text-[8px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-2 px-3 italic">Controle Master</p>}
            <div className={`bg-indigo-900/40 rounded-2xl border border-indigo-500/20 p-3 ${isCollapsed ? 'flex justify-center' : ''}`}>
              {isCollapsed ? (
                <ShieldCheck size={20} className="text-indigo-400" />
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-indigo-400">
                    <ShieldCheck size={16} />
                    <span className="font-black text-[9px] uppercase tracking-widest">Trocar Academia</span>
                  </div>
                  <select 
                    value={academy.id}
                    onChange={(e) => {
                      const selected = allAcademies.find(a => a.id === e.target.value);
                      if (selected && onSwitchAcademy) onSwitchAcademy(selected);
                    }}
                    className="w-full bg-slate-800 border-none rounded-lg text-[10px] font-bold text-slate-300 py-1.5 px-2 outline-none focus:ring-1 focus:ring-indigo-500 appearance-none cursor-pointer"
                  >
                    {allAcademies.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Principais */}
        <div className="space-y-1">
          {!isCollapsed && <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 px-3">Atalhos</p>}
          {MAIN_MENU.filter(item => item.roles.includes(user.role)).map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <Link key={item.to} to={item.to} className={`flex items-center rounded-xl transition-all h-10 ${isActive ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'} ${isCollapsed ? 'justify-center w-10 mx-auto' : 'px-4 gap-3'}`} title={isCollapsed ? item.label : ''}>
                {item.icon}
                {!isCollapsed && <span className="font-bold text-xs">{item.label}</span>}
              </Link>
            );
          })}
        </div>

        {/* Gestão em Grade */}
        <div className="space-y-1">
          {!isCollapsed && <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 px-3">Gestão</p>}
          <div className={!isCollapsed ? "grid grid-cols-2 gap-2" : "space-y-1"}>
            {MANAGEMENT_MENU.filter(item => item.roles.includes(user.role)).map((item) => {
              const isActive = location.pathname === item.to;
              
              if (item.to === '/logout') {
                return (
                  <button 
                    key={item.to} 
                    onClick={onLogout} 
                    className={`flex items-center rounded-xl transition-all cursor-pointer ${!isCollapsed ? 'h-16 flex-col justify-center gap-1 text-center w-full' : 'h-10 justify-center w-10 mx-auto'} text-slate-500 hover:text-red-400 hover:bg-slate-800`}
                    title={isCollapsed ? item.label : ''}
                  >
                    {item.icon}
                    {!isCollapsed && <span className="font-black text-[9px] uppercase tracking-tighter leading-none">{item.label}</span>}
                  </button>
                );
              }

              return (
                <Link key={item.to} to={item.to} className={`flex items-center rounded-xl transition-all ${!isCollapsed ? 'h-16 flex-col justify-center gap-1 text-center' : 'h-10 justify-center w-10 mx-auto'} ${isActive ? 'bg-slate-800 text-indigo-400' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`} title={isCollapsed ? item.label : ''}>
                  {item.icon}
                  {!isCollapsed && <span className="font-black text-[9px] uppercase tracking-tighter leading-none">{item.label}</span>}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <div className="mt-auto space-y-1 p-4 border-t border-slate-800 bg-slate-900/50">
        <Link to="/settings" className={`flex items-center rounded-xl h-10 ${location.pathname === '/settings' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'} ${isCollapsed ? 'justify-center w-10 mx-auto' : 'px-4 gap-3'}`} title="Configurações">
          <Settings size={18} />
          {!isCollapsed && <span className="font-bold text-xs">Configurações</span>}
        </Link>
        <button onClick={onToggleTheme} className={`flex items-center text-slate-400 hover:text-indigo-400 h-10 rounded-xl hover:bg-slate-800/50 ${isCollapsed ? 'justify-center w-10 mx-auto' : 'px-4 gap-3'}`}>
          {theme === 'dark' ? <Sun size={18} className="text-amber-500" /> : <Moon size={18} />}
          {!isCollapsed && <span className="font-bold text-xs">Tema {theme === 'dark' ? 'Light' : 'Dark'}</span>}
        </button>
      </div>
    </aside>
  );
};

export default App;
