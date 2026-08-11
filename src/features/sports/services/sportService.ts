import { api } from '@/lib/api';
import type { Sport, BeltRank, BeltCategory } from '@/types';

export interface BeltRankInput {
  name: string;
  colorKey: string;
  orderIndex: number;
  degreeCount: number;
  category: BeltCategory;
  minAge?: number | null;
  maxAge?: number | null;
}

// Cadastro de Esporte (template de faixas/graus) — restrito ao superuser.
// Ver PLANO_GRADUACAO.md Fase 5.
export const sportService = {
  getAll: () =>
    api.get<{ data: Sport[]; total: number }>('/sports').then((r) => r.data.data),

  create: (data: { name: string; slug?: string; active?: boolean }) =>
    api.post<Sport>('/sports', data).then((r) => r.data),

  update: (id: string, data: Partial<Pick<Sport, 'name' | 'active'>>) =>
    api.put<Sport>(`/sports/${id}`, data).then((r) => r.data),

  getBeltRanks: (sportId: string) =>
    api.get<{ data: BeltRank[]; total: number }>(`/sports/${sportId}/belt-ranks`).then((r) => r.data.data),

  createBeltRank: (sportId: string, data: BeltRankInput) =>
    api.post<BeltRank>(`/sports/${sportId}/belt-ranks`, data).then((r) => r.data),

  updateBeltRank: (sportId: string, rankId: string, data: Partial<BeltRankInput>) =>
    api.put<BeltRank>(`/sports/${sportId}/belt-ranks/${rankId}`, data).then((r) => r.data),

  deleteBeltRank: (sportId: string, rankId: string) =>
    api.delete<{ message: string }>(`/sports/${sportId}/belt-ranks/${rankId}`).then((r) => r.data),
};
