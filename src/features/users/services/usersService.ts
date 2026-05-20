import { api } from '@/lib/api';

export interface UserRecord {
  id: string;
  academy_id: string;
  role: 'superuser' | 'admin' | 'instructor' | 'staff' | 'student';
  name: string;
  email: string;
  photo?: string;
  phone?: string | null;
  position?: string | null;
  status: 'Active' | 'Pending' | 'Blocked';
  requires_password_change: boolean;
  created_at?: string;
  entity_id?: string | null;
  entity_type?: 'student' | 'instructor' | 'staff' | null;
}

export interface PaginatedUsers {
  data: UserRecord[];
  total: number;
  page: number;
  limit: number;
}

export const usersService = {
  getAll: (params?: { search?: string; role?: string; status?: string; page?: number; limit?: number }) =>
    api.get<PaginatedUsers>('/users', { params }).then((r) => r.data),

  create: (data: { name: string; email: string; role: string; password: string }) =>
    api.post<UserRecord>('/users', data).then((r) => r.data),

  update: (id: string, data: { status?: string; password?: string; name?: string; email?: string; role?: string; photo?: string | null; phone?: string | null; position?: string | null }) =>
    api.put<UserRecord>(`/users/${id}`, data).then((r) => r.data),
};
