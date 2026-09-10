import { api } from '@/lib/api';
import type { AuditLogEntry, PaginatedResponse } from '@/types';

export interface AuditLogFilters {
  /** Uma ou mais ações separadas por vírgula (o backend aceita lista) */
  action?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export const auditLogService = {
  getAll: (academyId: string, filters?: AuditLogFilters) =>
    api
      .get<PaginatedResponse<AuditLogEntry>>('/audit-log', { params: { academyId, ...filters } })
      .then((r) => r.data),
};
