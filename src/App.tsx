import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Spinner } from '@/components/ui';
import { PrivateRoute } from '@/app/PrivateRoute';
import { RoleGuard } from '@/app/RoleGuard';
import { AppLayoutRoute } from '@/app/AppLayoutRoute';

const LoginPage            = React.lazy(() => import('@/pages/LoginPage'));
const DashboardPage        = React.lazy(() => import('@/pages/DashboardPage'));
const DashboardPageNovo    = React.lazy(() => import('@/pages/DashboardPageNovo'));
const MensalidadesReportPage = React.lazy(() => import('@/pages/MensalidadesReportPage'));
const StudentsPage         = React.lazy(() => import('@/pages/StudentsPage'));
const InstructorsPage      = React.lazy(() => import('@/pages/InstructorsPage'));
const StaffPage            = React.lazy(() => import('@/pages/StaffPage'));
const UsersPage            = React.lazy(() => import('@/pages/UsersPage'));
const AttendancePage       = React.lazy(() => import('@/pages/AttendancePage'));
// DESATIVADO — controle financeiro simplificado (pagamento do aluno via /pay)
// const FinancesPage         = React.lazy(() => import('@/pages/FinancesPage'));
// DESATIVADO em #090 — Turmas substituídas por Planos de Aula
// const TemplatesPage        = React.lazy(() => import('@/pages/TemplatesPage'));
// const SchedulesPage        = React.lazy(() => import('@/pages/SchedulesPage'));
const CalendarPage         = React.lazy(() => import('@/pages/CalendarPage'));
const ChatPage             = React.lazy(() => import('@/pages/ChatPage'));
const InventoryPage        = React.lazy(() => import('@/pages/InventoryPage'));
const KimonoLoansPage      = React.lazy(() => import('@/pages/KimonoLoansPage'));
const ReportsPage          = React.lazy(() => import('@/pages/ReportsPage'));
const RecycleBinPage       = React.lazy(() => import('@/pages/RecycleBinPage'));
const SettingsPage         = React.lazy(() => import('@/pages/SettingsPage'));
const StudentProfilePage   = React.lazy(() => import('@/pages/StudentProfilePage'));
const InstructorProfilePage = React.lazy(() => import('@/pages/InstructorProfilePage'));
const PaymentPage          = React.lazy(() => import('@/pages/PaymentPage'));
const SystemConfigPage     = React.lazy(() => import('@/pages/SystemConfigPage'));
const ResetPasswordPage    = React.lazy(() => import('@/pages/ResetPasswordPage'));
const StaffInvitePage      = React.lazy(() => import('@/pages/StaffInvitePage'));
const GuardianInvitePage   = React.lazy(() => import('@/pages/GuardianInvitePage'));

const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center h-full min-h-[200px]">
    <Spinner size="lg" className="text-indigo-500" />
  </div>
);

const App: React.FC = () => (
  <Suspense fallback={<PageLoader />}>
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/login/forgot-password" element={<LoginPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/login/register" element={<LoginPage />} />
      <Route path="/login/register/academy" element={<LoginPage />} />
      <Route path="/login/register/student" element={<LoginPage />} />
      <Route path="/login/register/instructor" element={<LoginPage />} />
      {/* Academy alias routes */}
      <Route path="/login/:alias" element={<LoginPage />} />
      <Route path="/login/:alias/forgot-password" element={<LoginPage />} />
      <Route path="/login/:alias/register" element={<LoginPage />} />
      <Route path="/login/:alias/register/student" element={<LoginPage />} />
      <Route path="/login/:alias/register/instructor" element={<LoginPage />} />
      <Route path="/staff-invite/:alias/:token" element={<StaffInvitePage />} />
      <Route path="/guardian-invite/:alias/:token" element={<GuardianInvitePage />} />

      {/* Protected — requires auth */}
      <Route element={<PrivateRoute />}>
        <Route element={<AppLayoutRoute />}>

          {/* All authenticated roles */}
          <Route path="/" element={<DashboardPage />} />
          {/* Dashboard novo — layout compacto em teste, comparar com "/" (ver views/DashboardViewNovo.tsx) */}
          <Route path="/dashnovo" element={<DashboardPageNovo />} />
          {/* DESATIVADO em #090 — Turmas substituídas por Planos de Aula */}
          {/* <Route path="/schedules"  element={<SchedulesPage />} /> */}
          <Route path="/calendar"   element={<CalendarPage />} />
          <Route path="/chat"       element={<ChatPage />} />
          <Route path="/inventory"  element={<InventoryPage />} />
          <Route path="/settings"   element={<SettingsPage />} />

          {/* Admin + Instructor + Staff */}
          <Route element={<RoleGuard roles={['superuser', 'admin', 'instructor', 'staff']} />}>
            <Route path="/attendance" element={<AttendancePage />} />
            <Route path="/kimonos" element={<KimonoLoansPage />} />
            {/* DESATIVADO em #090 — Turmas substituídas por Planos de Aula */}
            {/* <Route path="/templates"  element={<TemplatesPage />} /> */}
          </Route>

          {/* Admin + Staff */}
          <Route element={<RoleGuard roles={['superuser', 'admin', 'staff']} />}>
            <Route path="/students" element={<StudentsPage />} />
          </Route>

          {/* Admin only */}
          <Route element={<RoleGuard roles={['superuser', 'admin']} />}>
            {/* <Route path="/finances"    element={<FinancesPage />} /> */}
            <Route path="/instructors" element={<InstructorsPage />} />
            <Route path="/staff"       element={<StaffPage />} />
            <Route path="/users"       element={<UsersPage />} />
            <Route path="/reports"     element={<ReportsPage />} />
            <Route path="/relatorios/mensalidades" element={<MensalidadesReportPage />} />
            <Route path="/recycle-bin" element={<RecycleBinPage />} />
          </Route>

          {/* Superuser only */}
          <Route element={<RoleGuard roles={['superuser']} />}>
            <Route path="/system-config" element={<SystemConfigPage />} />
          </Route>

          {/* Student + Guardian (responsável gerenciando o perfil de um dependente) */}
          <Route element={<RoleGuard roles={['student', 'guardian']} />}>
            <Route path="/profile" element={<StudentProfilePage />} />
            <Route path="/pay"     element={<PaymentPage />} />
          </Route>

          {/* Instructor / Staff only */}
          <Route element={<RoleGuard roles={['instructor', 'staff']} />}>
            <Route path="/instructor-profile" element={<InstructorProfilePage />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  </Suspense>
);

export default App;
