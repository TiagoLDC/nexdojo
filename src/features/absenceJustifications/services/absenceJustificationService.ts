import { api } from '@/lib/api';
import type {
  AbsenceJustification,
  AbsenceJustificationStatus,
  CreateAbsenceJustificationDTO,
  GetAbsenceJustificationsParams,
  PaginatedResponse,
} from '@/types';

export const absenceJustificationService = {
  getAll: (academyId: string, params?: GetAbsenceJustificationsParams) =>
    api
      .get<PaginatedResponse<AbsenceJustification>>('/absence-justifications', {
        params: { academyId, ...params },
      })
      .then((r) => r.data),

  getPendingCount: (academyId: string) =>
    api
      .get<{ count: number }>('/absence-justifications/pending-count', { params: { academyId } })
      .then((r) => r.data.count),

  create: (academyId: string, data: CreateAbsenceJustificationDTO) =>
    api
      .post<AbsenceJustification>('/absence-justifications', { ...data, academyId })
      .then((r) => r.data),

  review: (id: string, status: Exclude<AbsenceJustificationStatus, 'Pending'>, reviewNote?: string) =>
    api
      .patch<AbsenceJustification>(`/absence-justifications/${id}/review`, { status, reviewNote })
      .then((r) => r.data),

  delete: (id: string) =>
    api.delete<void>(`/absence-justifications/${id}`).then((r) => r.data),
};
