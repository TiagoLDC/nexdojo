import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { useAuth, AuthProvider } from './context/AuthContext';
import { useTheme } from './hooks/useTheme';
import Layout from './components/layout/Layout';
import { ShieldCheck, Home } from 'lucide-react';
import { Academy } from './types';

// Views
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

const ProtectedRoute: React.FC<{ children: React.ReactNode; roles: string[] }> = ({ children, roles }) => {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (!roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

const RequireAcademy: React.FC<{ academy: Academy | null; children: React.ReactNode }> = ({ academy, children }) => {
  if (!academy) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 animate-in fade-in duration-500">
        <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-3xl flex items-center justify-center text-indigo-600 mb-6 shadow-xl shadow-indigo-600/10 rotate-3">
          <ShieldCheck size={40} />
        </div>
        <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase italic tracking-tighter leading-tight">Unidade não Selecionada</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-sm font-bold uppercase text-[10px] tracking-widest">
          Como Gestor Master, você precisa selecionar uma unidade no Dashboard para acessar esta funcionalidade.
        </p>
        <Link to="/" className="mt-8 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-600/20 transition-all active:scale-95 flex items-center gap-2">
          <Home size={14} />
          Ir para Seleção
        </Link>
      </div>
    );
  }
  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { user, academy, isLoading, logout, theme, accentColor, language, setLanguage, updateAcademy, setTheme, setAccentColor, switchAcademy } = useAuth();
  
  useTheme();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Carregando...</p>
          <div className="mt-4 bg-amber-500/90 text-black text-[10px] font-black px-2 py-1 rounded">
            VERSÃO QAS 07/05/2026 10:43:00
          </div>
        </div>
      </div>
    );
  }
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginView />} />
        <Route path="/cadastro" element={<LoginView />} />
        <Route path="/cadastro/aluno" element={<LoginView />} />
        <Route path="/cadastro/academia" element={<LoginView />} />
        <Route path="/cadastro/instrutor" element={<LoginView />} />
        <Route path="/esqueci-senha" element={<LoginView />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardView academy={academy} user={user} onSwitchAcademy={switchAcademy} />} />
        
        {(academy || user.role === 'superuser') && (
          <>
            <Route path="/templates" element={
              <ProtectedRoute roles={['superuser', 'admin', 'instructor']}>
                <RequireAcademy academy={academy}>
                  <TemplateView academy={academy!} user={user} />
                </RequireAcademy>
              </ProtectedRoute>
            } />
            <Route path="/schedules" element={
              <ProtectedRoute roles={['superuser', 'admin', 'instructor', 'staff', 'student']}>
                <RequireAcademy academy={academy}>
                  <SchedulesView academy={academy!} user={user} />
                </RequireAcademy>
              </ProtectedRoute>
            } />
            <Route path="/attendance" element={
              <ProtectedRoute roles={['superuser', 'admin', 'instructor']}>
                <RequireAcademy academy={academy}>
                  <AttendanceView academy={academy!} user={user} />
                </RequireAcademy>
              </ProtectedRoute>
            } />
            <Route path="/finances" element={
              <ProtectedRoute roles={['superuser', 'admin']}>
                <RequireAcademy academy={academy}>
                  <FinancesView academy={academy!} user={user} />
                </RequireAcademy>
              </ProtectedRoute>
            } />
            <Route path="/students" element={
              <ProtectedRoute roles={['superuser', 'admin', 'instructor', 'staff']}>
                <RequireAcademy academy={academy}>
                  <StudentsView academy={academy!} user={user} />
                </RequireAcademy>
              </ProtectedRoute>
            } />
            <Route path="/instructors" element={
              <ProtectedRoute roles={['superuser', 'admin']}>
                <RequireAcademy academy={academy}>
                  <InstructorsView academy={academy!} user={user} />
                </RequireAcademy>
              </ProtectedRoute>
            } />
            <Route path="/kimonos" element={
              <ProtectedRoute roles={['superuser', 'admin', 'staff']}>
                <RequireAcademy academy={academy}>
                  <KimonoView academy={academy!} user={user} />
                </RequireAcademy>
              </ProtectedRoute>
            } />
            <Route path="/calendar" element={
              <RequireAcademy academy={academy}>
                <CalendarView academy={academy!} user={user} />
              </RequireAcademy>
            } />
            <Route path="/chat" element={
              <RequireAcademy academy={academy}>
                <ChatView academy={academy!} user={user} />
              </RequireAcademy>
            } />
            <Route path="/profile" element={
              <ProtectedRoute roles={['student']}>
                <RequireAcademy academy={academy}>
                  <StudentProfileView academy={academy!} user={user} />
                </RequireAcademy>
              </ProtectedRoute>
            } />
            <Route path="/pay" element={
              <ProtectedRoute roles={['student']}>
                <RequireAcademy academy={academy}>
                  <PaymentView academy={academy!} user={user} />
                </RequireAcademy>
              </ProtectedRoute>
            } />
            <Route path="/reports" element={
              <ProtectedRoute roles={['superuser', 'admin']}>
                <RequireAcademy academy={academy}>
                  <ReportsView academy={academy!} user={user} />
                </RequireAcademy>
              </ProtectedRoute>
            } />
            <Route path="/recycle-bin" element={
              <ProtectedRoute roles={['superuser', 'admin']}>
                <RequireAcademy academy={academy}>
                  <RecycleBinView academy={academy!} user={user} />
                </RequireAcademy>
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <RequireAcademy academy={academy}>
                <SettingsView 
                  academy={academy!} 
                  user={user}
                  onLogout={logout} 
                  theme={theme} 
                  onToggleTheme={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                  language={language}
                  onLanguageChange={setLanguage}
                  onUpdateAcademy={updateAcademy}
                  accentColor={accentColor}
                  onAccentColorChange={setAccentColor}
                />
              </RequireAcademy>
            } />
          </>
        )}
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
