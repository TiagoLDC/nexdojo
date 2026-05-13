import { api } from '@/lib/api';
import type { Academy, UpdateAcademyDTO } from '@/types';

export const academyService = {
  get: (academyId: string) =>
    api.get<Academy>(`/academies/${academyId}`).then((r) => r.data),

  update: (academyId: string, data: UpdateAcademyDTO) =>
    api.put<Academy>(`/academies/${academyId}`, data).then((r) => r.data),

  getAll: () =>
    api.get<{ data: Academy[]; total: number }>('/academies').then((r) => r.data.data),

  create: (data: Omit<Academy, 'id'>) =>
    api.post<Academy>('/academies', data).then((r) => r.data),

  delete: (id: string) =>
    api.delete<void>(`/academies/${id}`).then((r) => r.data),
};
