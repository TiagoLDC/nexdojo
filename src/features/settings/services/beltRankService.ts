import { api } from '@/lib/api';
import type { Sport, BeltRank, AcademyBeltSetting, BeltAgeSegment } from '@/types';

export interface AcademyBeltSettingsResponse {
  sport: Sport | null;
  beltRanks: BeltRank[];
  beltSettings: AcademyBeltSetting[];
}

export interface AcademyBeltSettingInput {
  beltRankId: string;
  monthsRequired?: number | null;
  monthsRequiredDays?: number | null;
  classesRequired?: number | null;
  warnBeforeMonths?: number | null;
  warnBeforeClasses?: number | null;
  ageSegment?: BeltAgeSegment | null;
  degreeSegmentMin?: number | null;
  degreeSegmentMax?: number | null;
}

export type PublicBeltRank = Pick<BeltRank, 'id' | 'name' | 'colorKey' | 'orderIndex'>;

// Fonte única para consumir as faixas/graus configurados (meses/aulas) da academia,
// já resolvidos a partir do template do esporte dela. Ver PLANO_GRADUACAO.md Fase 4.
export const beltRankService = {
  getAcademyBeltSettings: (academyId: string) =>
    api.get<AcademyBeltSettingsResponse>(`/academies/${academyId}/belt-settings`).then((r) => r.data),

  updateAcademyBeltSettings: (academyId: string, settings: AcademyBeltSettingInput[]) =>
    api.put<AcademyBeltSettingsResponse>(`/academies/${academyId}/belt-settings`, { settings }).then((r) => r.data),

  // Sem auth — usado no auto-cadastro (LoginView) antes de existir sessão. Só nome/cor/ordem.
  getPublicBeltRanks: (academyId: string) =>
    api.get<{ data: PublicBeltRank[] }>(`/academies/${academyId}/belt-ranks/public`).then((r) => r.data.data),
};
