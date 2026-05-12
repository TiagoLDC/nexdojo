import { api } from '@/lib/api';
import type {
  Instructor,
  PaginatedResponse,
  GetInstructorsParams,
  CreateInstructorDTO,
  UpdateInstructorDTO,
  GraduateStudentDTO,
  AddDocumentDTO,
} from '@/types';

export const instructorService = {
  getAll: (academyId: string, params?: GetInstructorsParams) =>
    api
      .get<PaginatedResponse<Instructor>>('/instructors', { params: { academyId, ...params } })
      .then((r) => r.data),

  getById: (id: string) =>
    api.get<Instructor>(`/instructors/${id}`).then((r) => r.data),

  create: (academyId: string, data: CreateInstructorDTO) =>
    api.post<Instructor>('/instructors', { ...data, academyId }).then((r) => r.data),

  update: (id: string, data: UpdateInstructorDTO) =>
    api.put<Instructor>(`/instructors/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    api.delete<void>(`/instructors/${id}`).then((r) => r.data),

  graduate: (id: string, data: GraduateStudentDTO) =>
    api.post<Instructor>(`/instructors/${id}/graduate`, data).then((r) => r.data),

  addDocument: (id: string, data: AddDocumentDTO) =>
    api.post<Instructor>(`/instructors/${id}/documents`, data).then((r) => r.data),

  deleteDocument: (id: string, docId: string) =>
    api.delete<Instructor>(`/instructors/${id}/documents/${docId}`).then((r) => r.data),
};
