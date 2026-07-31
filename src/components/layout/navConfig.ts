import type { UserRole } from '@/types';

export interface NavItem {
  to: string;
  labelKey: string;
  icon: string;
  roles: UserRole[];
}

export const MAIN_NAV: NavItem[] = [
  { to: '/', labelKey: 'dashboard', icon: 'Home', roles: ['superuser', 'admin', 'instructor', 'staff', 'student'] },
  { to: '/attendance', labelKey: 'attendance', icon: 'CheckCircle2', roles: ['superuser', 'admin', 'instructor', 'staff'] },
  // DESATIVADO — controle financeiro simplificado (pagamento via /pay)
  // { to: '/finances', labelKey: 'finances', icon: 'DollarSign', roles: ['superuser', 'admin'] },
];

export const MANAGEMENT_NAV: NavItem[] = [
  { to: '/students', labelKey: 'students', icon: 'Users', roles: ['superuser', 'admin', 'staff'] },
  { to: '/instructors', labelKey: 'instructors', icon: 'Award', roles: ['superuser', 'admin'] },
  { to: '/staff',  labelKey: 'staff',  icon: 'Briefcase', roles: ['superuser', 'admin'] },
  { to: '/users',  labelKey: 'users',  icon: 'KeyRound',  roles: ['superuser', 'admin'] },
  // DESATIVADO em #090 — Turmas substituídas por Planos de Aula. Manter para eventual reativação.
  // { to: '/schedules', labelKey: 'schedules', icon: 'Clock', roles: ['superuser', 'admin', 'instructor', 'staff', 'student'] },
  // { to: '/templates', labelKey: 'templates', icon: 'CalendarDays', roles: ['superuser', 'admin', 'instructor'] },
  { to: '/calendar', labelKey: 'calendar', icon: 'Calendar', roles: ['superuser', 'admin', 'instructor', 'staff', 'student'] },
  { to: '/chat', labelKey: 'chat', icon: 'MessageSquare', roles: ['superuser', 'admin', 'instructor', 'staff', 'student'] },
  { to: '/inventory', labelKey: 'inventory', icon: 'Shirt', roles: ['superuser', 'admin', 'instructor', 'staff', 'student'] },
  // Só aparece se a academia tiver o módulo ativado (ver filtro extra em Sidebar/MobileMenu)
  { to: '/kimonos', labelKey: 'kimonoLoans', icon: 'Shirt', roles: ['superuser', 'admin', 'instructor', 'staff'] },
  { to: '/pay', labelKey: 'pay', icon: 'CreditCard', roles: ['student', 'guardian'] },
  { to: '/profile', labelKey: 'profile', icon: 'UserCircle', roles: ['student', 'guardian'] },
  { to: '/instructor-profile', labelKey: 'myData', icon: 'UserCircle', roles: ['instructor', 'staff'] },
  { to: '/reports', labelKey: 'reports', icon: 'BarChart3', roles: ['superuser', 'admin'] },
  { to: '/recycle-bin', labelKey: 'recycleBin', icon: 'Trash2', roles: ['superuser', 'admin'] },
  { to: '/system-config', labelKey: 'systemConfig', icon: 'SlidersHorizontal', roles: ['superuser'] },
  { to: '/logout', labelKey: 'logout', icon: 'LogOut', roles: ['superuser', 'admin', 'instructor', 'staff', 'student', 'guardian'] },
];
