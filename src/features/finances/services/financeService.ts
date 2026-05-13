import { api } from '@/lib/api';
import type {
  FinanceTransaction,
  PaginatedResponse,
  GetTransactionsParams,
  CreateTransactionDTO,
  UpdateTransactionDTO,
} from '@/types';

export const financeService = {
  getAll: (academyId: string, params?: GetTransactionsParams) =>
    api
      .get<PaginatedResponse<FinanceTransaction>>('/transactions', {
        params: { academyId, ...params },
      })
      .then((r) => r.data),

  create: (academyId: string, data: CreateTransactionDTO) =>
    api.post<FinanceTransaction>('/transactions', { ...data, academyId }).then((r) => r.data),

  update: (id: string, data: UpdateTransactionDTO) =>
    api.put<FinanceTransaction>(`/transactions/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    api.delete<void>(`/transactions/${id}`).then((r) => r.data),
};
