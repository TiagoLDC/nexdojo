import { api } from '@/lib/api';
import type { RecycleBinItem, PaginatedResponse, SearchParams } from '@/types';

export const recycleBinService = {
  getAll: (academyId: string, params?: SearchParams) =>
    api
      .get<PaginatedResponse<RecycleBinItem>>('/recycle-bin', { params: { academyId, ...params } })
      .then((r) => r.data),

  restore: (id: string) =>
    api.post<RecycleBinItem>(`/recycle-bin/${id}/restore`).then((r) => r.data),

  permanentDelete: (id: string) =>
    api.delete<void>(`/recycle-bin/${id}`).then((r) => r.data),

  empty: (academyId: string) =>
    api.delete<void>('/recycle-bin', { params: { academyId } }).then((r) => r.data),
};
