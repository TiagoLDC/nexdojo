import { api } from '@/lib/api';
import type { Announcement, PendingAnnouncement, PaginatedResponse, PaginationParams, CreateAnnouncementDTO } from '@/types';

export const announcementService = {
  getAll: (academyId: string, params?: PaginationParams) =>
    api.get<PaginatedResponse<Announcement>>('/announcements', { params: { academyId, ...params } }).then((r) => r.data),

  getPending: (academyId: string) =>
    api.get<{ data: PendingAnnouncement[] }>('/announcements/pending', { params: { academyId } }).then((r) => r.data.data),

  create: (academyId: string, data: CreateAnnouncementDTO) =>
    api.post<Announcement>('/announcements', { ...data, academyId }).then((r) => r.data),

  markAsRead: (id: string) =>
    api.post<void>(`/announcements/${id}/read`).then((r) => r.data),

  delete: (id: string) =>
    api.delete<void>(`/announcements/${id}`).then((r) => r.data),
};
