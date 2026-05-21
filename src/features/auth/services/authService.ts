import { api } from '@/lib/api';
import type { LoginCredentials, LoginResponse, User } from '@/types';

export const authService = {
  login: (credentials: LoginCredentials) =>
    api.post<LoginResponse>('/auth/login', credentials).then((r) => r.data),

  logout: () =>
    api.post<void>('/auth/logout').then((r) => r.data),

  me: () =>
    api.get<User>('/auth/me').then((r) => r.data),

  changePassword: (newPassword: string) =>
    api.post<{ message: string }>('/auth/change-password', { newPassword }).then((r) => r.data),

  forgotPassword: (email: string) =>
    api.post<{ message: string }>('/auth/forgot-password', { email }).then((r) => r.data),

  resetPassword: (token: string, newPassword: string) =>
    api.post<{ message: string }>('/auth/reset-password', { token, newPassword }).then((r) => r.data),
};
