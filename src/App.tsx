import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, AuthProvider } from './context/AuthContext';
import { useTheme } from './hooks/useTheme';
import Layout from './components/layout/Layout';

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

const AppRoutes: React.FC = () => {
  const { user, academy, isLoading, logout, theme, accentColor, language, setLanguage, updateAcademy, setTheme, setAccentColor } = useAuth();
  
  useTheme();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Carregando...</p>
          <div className="mt-4 bg-amber-500/90 text-black text-[10px] font-black px-2 py-1 rounded">
            VERSÃO QAS 07/05/2026 09:58:25
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
        <Route path="/" element={<DashboardView academy={academy} user={user} onSwitchAcademy={() => {}} />} />
        
        {academy && (
          <>
            <Route path="/templates" element={
              <ProtectedRoute roles={['superuser', 'admin', 'instructor']}>
                <TemplateView academy={academy} user={user} />
              </ProtectedRoute>
            } />
            <Route path="/schedules" element={
              <ProtectedRoute roles={['superuser', 'admin', 'instructor', 'staff', 'student']}>
                <SchedulesView academy={academy} user={user} />
              </ProtectedRoute>
            } />
            <Route path="/attendance" element={
              <ProtectedRoute roles={['superuser', 'admin', 'instructor']}>
                <AttendanceView academy={academy} user={user} />
              </ProtectedRoute>
            } />
            <Route path="/finances" element={
              <ProtectedRoute roles={['superuser', 'admin']}>
                <FinancesView academy={academy} user={user} />
              </ProtectedRoute>
            } />
            <Route path="/students" element={
              <ProtectedRoute roles={['superuser', 'admin', 'instructor', 'staff']}>
                <StudentsView academy={academy} user={user} />
              </ProtectedRoute>
            } />
            <Route path="/instructors" element={
              <ProtectedRoute roles={['superuser', 'admin']}>
                <InstructorsView academy={academy} user={user} />
              </ProtectedRoute>
            } />
            <Route path="/kimonos" element={
              <ProtectedRoute roles={['superuser', 'admin', 'staff']}>
                <KimonoView academy={academy} user={user} />
              </ProtectedRoute>
            } />
            <Route path="/calendar" element={<CalendarView academy={academy} user={user} />} />
            <Route path="/chat" element={<ChatView academy={academy} user={user} />} />
            <Route path="/profile" element={
              <ProtectedRoute roles={['student']}>
                <StudentProfileView academy={academy} user={user} />
              </ProtectedRoute>
            } />
            <Route path="/pay" element={
              <ProtectedRoute roles={['student']}>
                <PaymentView academy={academy} user={user} />
              </ProtectedRoute>
            } />
            <Route path="/reports" element={
              <ProtectedRoute roles={['superuser', 'admin']}>
                <ReportsView academy={academy} user={user} />
              </ProtectedRoute>
            } />
            <Route path="/recycle-bin" element={
              <ProtectedRoute roles={['superuser', 'admin']}>
                <RecycleBinView academy={academy} user={user} />
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <SettingsView 
                academy={academy} 
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
