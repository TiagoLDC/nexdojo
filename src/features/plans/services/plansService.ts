import { api } from '@/lib/api';
import type { AcademyPlan, PaginatedResponse, SearchParams } from '@/types';

export const plansService = {
  getAll: (academyId: string, params?: SearchParams) =>
    api
      .get<PaginatedResponse<AcademyPlan>>('/plans', { params: { academyId, ...params } })
      .then((r) => r.data),

  getById: (id: string) =>
    api.get<AcademyPlan>(`/plans/${id}`).then((r) => r.data),

  create: (academyId: string, data: Partial<AcademyPlan>) =>
    api.post<AcademyPlan>('/plans', { ...data, academyId }).then((r) => r.data),

  update: (id: string, data: Partial<AcademyPlan>) =>
    api.put<AcademyPlan>(`/plans/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    api.delete<{ message: string; softDeleted: boolean }>(`/plans/${id}`).then((r) => r.data),
};
