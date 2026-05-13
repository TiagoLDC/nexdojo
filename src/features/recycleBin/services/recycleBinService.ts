import { api } from '@/lib/api';
import type { RecycleBinItem, PaginatedResponse } from '@/types';

export const recycleBinService = {
  getAll: (academyId: string) =>
    api
      .get<PaginatedResponse<RecycleBinItem>>('/recycle-bin', { params: { academyId } })
      .then((r) => r.data),

  restore: (id: string) =>
    api.post<void>(`/recycle-bin/${id}/restore`).then((r) => r.data),

  deletePermanently: (id: string) =>
    api.delete<void>(`/recycle-bin/${id}`).then((r) => r.data),
};
