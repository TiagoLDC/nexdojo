import { api } from '@/lib/api';
import type {
  Staff,
  PaginatedResponse,
  GetStaffParams,
  CreateStaffDTO,
  UpdateStaffDTO,
  AddDocumentDTO,
} from '@/types';

export const staffService = {
  getAll: (academyId: string, params?: GetStaffParams) =>
    api
      .get<PaginatedResponse<Staff>>('/staff', { params: { academyId, ...params } })
      .then((r) => r.data),

  getById: (id: string) =>
    api.get<Staff>(`/staff/${id}`).then((r) => r.data),

  create: (academyId: string, data: CreateStaffDTO) =>
    api.post<Staff>('/staff', { ...data, academyId }).then((r) => r.data),

  update: (id: string, data: UpdateStaffDTO) =>
    api.put<Staff>(`/staff/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    api.delete<void>(`/staff/${id}`).then((r) => r.data),

  addDocument: (id: string, data: AddDocumentDTO) =>
    api.post<Staff>(`/staff/${id}/documents`, data).then((r) => r.data),

  deleteDocument: (id: string, docId: string) =>
    api.delete<Staff>(`/staff/${id}/documents/${docId}`).then((r) => r.data),
};
