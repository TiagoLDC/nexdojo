
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
  ChevronDown,
  Clock,
  Globe,
  Bell,
  Smartphone,
  Share2
} from 'lucide-react';

import { Academy, Student, User, Belt, Language } from './types';
import { StorageService } from './services/storage';
import { getTranslation } from './services/translations';
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
import SchedulesView from './views/SchedulesView';

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
  { to: '/schedules', icon: <Clock size={18} />, label: 'Horários', roles: ['superuser', 'admin', 'instructor', 'staff', 'student'] },
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
  const [academy, setAcademy] = useState<Academy | null>(() => {
    if (!user) return null;
    if (user.role === 'superuser') {
      const savedAcadId = localStorage.getItem('oss_last_superuser_academy');
      if (savedAcadId) {
        const found = StorageService.getAcademyById(savedAcadId);
        if (found) return found;
      }
      return StorageService.getAcademy() || StorageService.getAcademies()[0] || null;
    }
    return StorageService.getAcademyById(user.academyId);
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(StorageService.getTheme());
  const [accentColor, setAccentColor] = useState<string>(StorageService.getAccentColor());
  const [language, setLanguage] = useState<Language>(StorageService.getLanguage());
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (user?.id && (user?.role === 'admin' || user?.role === 'superuser')) {
      const allUsers = user.role === 'superuser' ? StorageService.getUsers() : StorageService.getUsers(academy?.id || '');
      const pending = allUsers.filter(u => u.status === 'Pending');
      setPendingCount(pending.length);
      
      // Se houver novos usuários pendentes e não estamos vendo o sinalizador, podemos trigger algo aqui se necessário
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
    const handleBlur = () => {
      setIsInputFocused(false);
    };

    window.addEventListener('focusin', handleFocus);
    window.addEventListener('focusout', handleBlur);

    return () => {
      window.removeEventListener('focusin', handleFocus);
      window.removeEventListener('focusout', handleBlur);
    };
  }, []);

  const t = getTranslation(language);

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

  useEffect(() => {
    const colorPalettes: Record<string, { base: string; shades: Record<number, string> }> = {
      branco: {
        base: '#94a3b8',
        shades: { 50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 400: '#94a3b8', 500: '#64748b', 700: '#334155', 800: '#1e293b', 900: '#0f172a', 950: '#020617' }
      },
      azul: {
        base: '#2563eb',
        shades: { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa', 500: '#3b82f6', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a', 950: '#172554' }
      },
      roxo: {
        base: '#9333ea',
        shades: { 50: '#faf5ff', 100: '#f3e8ff', 200: '#e9d5ff', 300: '#d8b4fe', 400: '#c084fc', 500: '#a855f7', 700: '#7e22ce', 800: '#6b21a8', 900: '#581c87', 950: '#3b0764' }
      },
      marrom: {
        base: '#5c4033',
        shades: { 50: '#fdfcfb', 100: '#f7f2ef', 200: '#efdfd6', 300: '#dec0b0', 400: '#bd927b', 500: '#9b6e5d', 700: '#7a5142', 800: '#5c4033', 900: '#4a332a', 950: '#2d1f19' }
      },
      preto: {
        base: '#0f172a',
        shades: { 50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 400: '#94a3b8', 500: '#64748b', 700: '#334155', 800: '#1e293b', 900: '#0f172a', 950: '#020617' }
      },
      cinza: {
        base: '#64748b',
        shades: { 50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 400: '#94a3b8', 500: '#64748b', 700: '#334155', 800: '#1e293b', 900: '#0f172a', 950: '#020617' }
      },
      amarelo: {
        base: '#eab308',
        shades: { 50: '#fefce8', 100: '#fef9c3', 200: '#fef08a', 300: '#fde047', 400: '#facc15', 500: '#eab308', 700: '#a16207', 800: '#854d0e', 900: '#713f12', 950: '#422006' }
      },
      laranja: {
        base: '#f97316',
        shades: { 50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#fdba74', 400: '#fb923c', 500: '#f97316', 700: '#c2410c', 800: '#9a3412', 900: '#7c2d12', 950: '#431407' }
      },
      verde: {
        base: '#10b981',
        shades: { 50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399', 500: '#10b981', 700: '#047857', 800: '#065f46', 900: '#064e3b', 950: '#022c22' }
      },
      indigo: {
        base: '#4f46e5',
        shades: { 50: '#f5f3ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc', 400: '#818cf8', 500: '#6366f1', 700: '#4338ca', 800: '#3730a3', 900: '#1e1b4b', 950: '#0f172a' }
      }
    };

    const palette = colorPalettes[accentColor] || colorPalettes.indigo;
    document.documentElement.style.setProperty('--primary-accent-color', palette.base);
    Object.entries(palette.shades).forEach(([shade, value]) => {
      document.documentElement.style.setProperty(`--primary-accent-${shade}`, value);
    });
  }, [accentColor]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.style.backgroundColor = '#020617'; // slate-950
    } else {
      document.documentElement.classList.remove('dark');
      document.body.style.backgroundColor = '#f8fafc'; // slate-50
    }
    StorageService.saveTheme(theme);
  }, [theme]);

  useEffect(() => {
    StorageService.saveLanguage(language);
  }, [language]);

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
    
    // Forçar navegação para Dashboard (/#/)
    window.location.hash = '#/';
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
    window.location.hash = '#/';
  };

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');
  const handleAccentColorChange = (color: string) => {
    setAccentColor(color);
    StorageService.saveAccentColor(color);
  };

  if (!user || (!academy && user.role !== 'superuser')) {
    return <LoginView onLogin={handleLogin} />;
  }

  return (
    <HashRouter>
      <div className={`flex flex-col h-[100dvh] overflow-hidden transition-all duration-300 dark:bg-slate-950 ${isSidebarCollapsed ? 'md:pl-20' : 'md:pl-64'}`}>
        {/* TAG DE VERSÃO QAS */}
        <div className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none flex justify-center">
          <div className="bg-amber-500/90 text-white text-[10px] font-black px-4 py-1 rounded-b-xl shadow-lg backdrop-blur-sm border-x border-b border-amber-400/50 uppercase tracking-widest animate-in slide-in-from-top duration-500">
            VERSÃO QAS 04/05/2026 09:30:00
          </div>
        </div>
        <div className="no-print shrink-0">
          <Sidebar 
            academy={academy} 
            onLogout={handleLogout} 
            isCollapsed={isSidebarCollapsed} 
            setIsCollapsed={setIsSidebarCollapsed}
            theme={theme}
            onToggleTheme={toggleTheme}
            user={user}
            onSwitchAcademy={handleSwitchAcademy}
            language={language}
            onLanguageChange={setLanguage}
            translatedMainMenu={translatedMainMenu}
            translatedManagementMenu={translatedManagementMenu}
            pendingCount={pendingCount}
          />
        </div>

        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-900 border-b dark:border-slate-800 shrink-0 z-30 shadow-sm transition-colors no-print">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-indigo-600 rounded-xl overflow-hidden shadow-lg shadow-indigo-600/20 shrink-0 flex items-center justify-center p-0.5">
              {academy?.logo ? (
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
              <h1 className="text-xl font-black text-slate-800 dark:text-white tracking-tighter uppercase italic leading-tight truncate">{academy?.name || 'Gestão Master'}</h1>
              <p className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] mt-0.5 line-clamp-1">{academy?.ownerName || 'Administrador'}</p>
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
                      value={academy?.id || ''}
                      onChange={(e) => {
                        const selected = StorageService.getAcademies().find(a => a.id === e.target.value);
                        if (selected) {
                          handleSwitchAcademy(selected);
                          setIsMobileMenuOpen(false);
                        }
                      }}
                      className="w-full bg-white/20 border-none rounded-2xl p-4 text-xs font-black uppercase tracking-widest text-white appearance-none outline-none focus:ring-2 focus:ring-white/40"
                    >
                      <option value="" disabled className="text-slate-900">Selecione uma Unidade</option>
                      {StorageService.getAcademies().map(a => (
                        <option key={a.id} value={a.id} className="text-slate-900">{a.name}</option>
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
                          handleLogout();
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

          <Routes>
            <Route path="/" element={<DashboardView academy={academy} user={user} onSwitchAcademy={handleSwitchAcademy} />} />
            
            {academy ? (
              <>
                <Route path="/templates" element={
                  <ProtectedRoute roles={['superuser', 'admin', 'instructor']} user={user}>
                    <TemplateView academy={academy} user={user} />
                  </ProtectedRoute>
                } />
                <Route path="/schedules" element={
                  <ProtectedRoute roles={['superuser', 'admin', 'instructor', 'staff', 'student']} user={user}>
                    <SchedulesView academy={academy} user={user} />
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
                    language={language}
                    onLanguageChange={setLanguage}
                    onUpdateAcademy={(updatedAcademy) => {
                      setAcademy(updatedAcademy);
                      StorageService.saveAcademy(updatedAcademy);
                    }}
                    accentColor={accentColor}
                    onAccentColorChange={handleAccentColorChange}
                  />
                } />
              </>
            ) : user.role === 'superuser' ? (
              <Route path="*" element={<Navigate to="/" replace />} />
            ) : null}

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
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
    </HashRouter>
  );
};

const BottomNavLink: React.FC<{ to: string; icon: React.ReactNode; label: string; badge?: number }> = ({ to, icon, label, badge }) => {
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

const Sidebar: React.FC<{ 
  academy: Academy | null; 
  onLogout: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (v: boolean) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  user: User;
  onSwitchAcademy?: (acad: Academy) => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  translatedMainMenu: any[];
  translatedManagementMenu: any[];
  pendingCount?: number;
}> = ({ academy, onLogout, isCollapsed, setIsCollapsed, theme, onToggleTheme, user, onSwitchAcademy, language, onLanguageChange, translatedMainMenu, translatedManagementMenu, pendingCount }) => {
  const location = useLocation();
  const allAcademies = StorageService.getAcademies();
  const t = getTranslation(language);
  
  const languages = [
    { code: 'pt' as Language, label: 'PT', flag: '🇧🇷' },
    { code: 'en' as Language, label: 'EN', flag: '🇺🇸' },
    { code: 'es' as Language, label: 'ES', flag: '🇪🇸' },
  ];

  return (
    <aside className={`hidden md:flex flex-col fixed left-0 top-0 bottom-0 bg-slate-900 text-white transition-all duration-300 z-50 shadow-2xl ${isCollapsed ? 'w-20' : 'w-64'}`}>
      <div className="p-6">
        <button onClick={() => setIsCollapsed(!isCollapsed)} className="absolute -right-3 top-10 bg-indigo-600 text-white p-1 rounded-full border-4 border-slate-900 hover:bg-indigo-500 shadow-lg z-10 transition-transform active:scale-90">
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
        <div className={`mb-6 flex flex-col gap-3 ${isCollapsed ? 'items-center' : ''}`}>
          <div className="flex items-center gap-3 w-full">
            <div className="w-10 h-10 bg-indigo-500 rounded-xl overflow-hidden shrink-0 shadow-lg shadow-indigo-500/20 flex items-center justify-center p-0.5">
              {academy?.logo ? (
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
                {academy?.name || 'Gestão Master'}
              </h1>
            )}
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-4 overflow-y-auto custom-scrollbar">
        {/* MODO MASTER - NOVO ITEM DE MENU */}
        {user.role === 'superuser' && (
          <div className="px-1 mb-4">
            {!isCollapsed && <p className="text-[8px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-2 px-3 italic">Master Control</p>}
            <div className={`bg-indigo-900/40 rounded-2xl border border-indigo-500/20 p-3 ${isCollapsed ? 'flex justify-center' : ''}`}>
              {isCollapsed ? (
                <ShieldCheck size={20} className="text-indigo-400" />
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-indigo-400">
                    <ShieldCheck size={16} />
                    <span className="font-black text-[9px] uppercase tracking-widest">Switch Academy</span>
                  </div>
                  <select 
                    value={academy?.id || ''}
                    onChange={(e) => {
                      const selected = allAcademies.find(a => a.id === e.target.value);
                      if (selected && onSwitchAcademy) onSwitchAcademy(selected);
                    }}
                    className="w-full bg-slate-800 border-none rounded-lg text-[10px] font-bold text-slate-300 py-1.5 px-2 outline-none focus:ring-1 focus:ring-indigo-500 appearance-none cursor-pointer"
                  >
                    <option value="" disabled>Select a Unit</option>
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
          {!isCollapsed && <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 px-3">Links</p>}
          {translatedMainMenu.filter(item => item.roles.includes(user.role)).map((item) => {
            const isActive = location.pathname === item.to;
            const hasBadge = item.to === '/' && (pendingCount || 0) > 0;
            
            return (
              <Link key={item.to} to={item.to} className={`flex items-center rounded-xl transition-all h-10 relative ${isActive ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'} ${isCollapsed ? 'justify-center w-10 mx-auto' : 'px-4 gap-3'}`} title={isCollapsed ? item.label : ''}>
                <div className="relative">
                  {item.icon}
                  {hasBadge && isCollapsed && (
                    <span className="absolute -top-1 -right-1.5 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-900 animate-pulse" />
                  )}
                </div>
                {!isCollapsed && (
                  <div className="flex items-center justify-between flex-1">
                    <span className="font-bold text-xs">{item.label}</span>
                    {hasBadge && (
                      <span className="bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full animate-pulse shadow-lg shadow-red-500/20">
                        {pendingCount}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </div>

        {/* Gestão em Grade */}
        <div className="space-y-1">
          {!isCollapsed && <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 px-3">Management</p>}
          <div className={!isCollapsed ? "grid grid-cols-2 gap-2" : "space-y-1"}>
            {translatedManagementMenu.filter(item => item.roles.includes(user.role)).map((item) => {
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
        {!isCollapsed && (
          <div className="flex items-center justify-around mb-3 bg-slate-800/50 p-2 rounded-2xl border border-slate-700/50">
            {languages.map((lang) => (
              <button 
                key={lang.code}
                onClick={() => onLanguageChange(lang.code)}
                className={`flex flex-col items-center gap-1 transition-all ${language === lang.code ? 'scale-110' : 'opacity-40 grayscale group hover:grayscale-0 hover:opacity-100'}`}
              >
                <span className="text-xl leading-none">{lang.flag}</span>
                <span className="text-[7px] font-black uppercase tracking-widest">{lang.label}</span>
              </button>
            ))}
          </div>
        )}
        <Link to="/settings" className={`flex items-center rounded-xl h-10 ${location.pathname === '/settings' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'} ${isCollapsed ? 'justify-center w-10 mx-auto' : 'px-4 gap-3'}`} title={t.settings}>
          <Settings size={18} />
          {!isCollapsed && <span className="font-bold text-xs">{t.settings}</span>}
        </Link>
        <button onClick={onToggleTheme} className={`flex items-center text-slate-400 hover:text-indigo-400 h-10 rounded-xl hover:bg-slate-800/50 ${isCollapsed ? 'justify-center w-10 mx-auto' : 'px-4 gap-3'}`}>
          {theme === 'dark' ? <Sun size={18} className="text-amber-500" /> : <Moon size={18} />}
          {!isCollapsed && <span className="font-bold text-xs">{theme === 'dark' ? t.light : t.dark}</span>}
        </button>
      </div>
    </aside>
  );
};

export default App;
