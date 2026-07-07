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
