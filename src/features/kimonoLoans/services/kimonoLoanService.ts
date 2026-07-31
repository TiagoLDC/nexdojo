import { api } from '@/lib/api';
import type {
  KimonoLoan,
  PaginatedResponse,
  GetKimonoLoansParams,
  CreateKimonoLoanDTO,
  ReturnKimonoLoanDTO,
} from '@/types';

export const kimonoLoanService = {
  getAll: (academyId: string, params?: GetKimonoLoansParams) =>
    api
      .get<PaginatedResponse<KimonoLoan>>('/kimono-loans', { params: { academyId, ...params } })
      .then((r) => r.data),

  lend: (academyId: string, data: CreateKimonoLoanDTO) =>
    api.post<KimonoLoan>('/kimono-loans', { ...data, academyId }).then((r) => r.data),

  return: (academyId: string, data: ReturnKimonoLoanDTO) =>
    api.post<KimonoLoan>('/kimono-loans/return', { ...data, academyId }).then((r) => r.data),
};
