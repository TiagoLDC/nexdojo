import { api } from '@/lib/api';
import type {
  ClassTemplate,
  PaginatedResponse,
  SearchParams,
  CreateClassTemplateDTO,
  UpdateClassTemplateDTO,
} from '@/types';

export const templateService = {
  getAll: (academyId: string, params?: SearchParams) =>
    api
      .get<PaginatedResponse<ClassTemplate>>('/templates', { params: { academyId, ...params } })
      .then((r) => r.data),

  getById: (id: string) =>
    api.get<ClassTemplate>(`/templates/${id}`).then((r) => r.data),

  create: (academyId: string, data: CreateClassTemplateDTO) =>
    api.post<ClassTemplate>('/templates', { ...data, academyId }).then((r) => r.data),

  update: (id: string, data: UpdateClassTemplateDTO) =>
    api.put<ClassTemplate>(`/templates/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    api.delete<void>(`/templates/${id}`).then((r) => r.data),
};
