import { api } from '@/lib/api';
import type {
  Product,
  PaginatedResponse,
  GetProductsParams,
  CreateProductDTO,
  UpdateProductDTO,
} from '@/types';

export const inventoryService = {
  getAll: (academyId: string, params?: GetProductsParams) =>
    api
      .get<PaginatedResponse<Product>>('/inventory', { params: { academyId, ...params } })
      .then((r) => r.data),

  getById: (id: string) =>
    api.get<Product>(`/inventory/${id}`).then((r) => r.data),

  create: (academyId: string, data: CreateProductDTO) =>
    api.post<Product>('/inventory', { ...data, academyId }).then((r) => r.data),

  update: (id: string, data: UpdateProductDTO) =>
    api.put<Product>(`/inventory/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    api.delete<void>(`/inventory/${id}`).then((r) => r.data),
};
