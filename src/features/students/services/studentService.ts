import { api } from '@/lib/api';
import type {
  Student,
  PaginatedResponse,
  GetStudentsParams,
  CreateStudentDTO,
  UpdateStudentDTO,
  GraduateStudentDTO,
  AddDocumentDTO,
} from '@/types';

export const studentService = {
  getAll: (academyId: string, params?: GetStudentsParams) =>
    api
      .get<PaginatedResponse<Student>>('/students', { params: { academyId, ...params }, timeout: 300000 })
      .then((r) => r.data),

  getById: (id: string) =>
    api.get<Student>(`/students/${id}`).then((r) => r.data),

  // Busca em lote só a foto de ids específicos — usado por telas que listam muitos alunos
  // (com includePhoto: false) mas só precisam exibir avatar de alguns poucos.
  getPhotos: (ids: string[]) =>
    api.get<Record<string, string>>('/students/photos', { params: { ids: ids.join(',') } }).then((r) => r.data),

  create: (academyId: string, data: CreateStudentDTO) =>
    api.post<Student>('/students', { ...data, academyId }).then((r) => r.data),

  update: (id: string, data: UpdateStudentDTO) =>
    api.put<Student>(`/students/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    api.delete<void>(`/students/${id}`).then((r) => r.data),

  graduate: (id: string, data: GraduateStudentDTO) =>
    api.post<Student>(`/students/${id}/graduate`, data).then((r) => r.data),

  addDocument: (id: string, data: AddDocumentDTO) =>
    api.post<Student>(`/students/${id}/documents`, data).then((r) => r.data),

  deleteDocument: (id: string, docId: string) =>
    api.delete<Student>(`/students/${id}/documents/${docId}`).then((r) => r.data),
};
