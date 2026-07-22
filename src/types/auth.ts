import { UserRole, UserAccountStatus } from './common';
import type { Academy } from './entities';

export interface User {
  id: string;
  academyId: string;
  role: UserRole;
  name: string;
  email: string;
  photo?: string;
  status: UserAccountStatus;
  requiresPasswordChange?: boolean;
  viaMasterPassword?: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  academy: Academy | null;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export interface Profile {
  kind: 'self' | 'guardian';
  entityType: 'student' | 'instructor' | 'staff';
  entityId: string;
  name: string;
  photo?: string;
  belt?: string;
  totalClasses?: number;
  relation?: string;
}
