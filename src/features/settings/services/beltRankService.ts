import { api } from '@/lib/api';
import type { Sport, BeltRank, AcademyBeltSetting } from '@/types';

export type AcademyBeltRank = BeltRank &
  Pick<AcademyBeltSetting, 'monthsRequired' | 'classesRequired' | 'warnBeforeMonths' | 'warnBeforeClasses'>;

export interface AcademyBeltSettingsResponse {
  sport: Sport | null;
  beltRanks: AcademyBeltRank[];
}

export interface AcademyBeltSettingInput {
  beltRankId: string;
  monthsRequired?: number | null;
  classesRequired?: number | null;
  warnBeforeMonths?: number | null;
  warnBeforeClasses?: number | null;
}

// Fonte única para consumir as faixas/graus configurados (meses/aulas) da academia,
// já resolvidos a partir do template do esporte dela. Ver PLANO_GRADUACAO.md Fase 4.
export const beltRankService = {
  getAcademyBeltSettings: (academyId: string) =>
    api.get<AcademyBeltSettingsResponse>(`/academies/${academyId}/belt-settings`).then((r) => r.data),

  updateAcademyBeltSettings: (academyId: string, settings: AcademyBeltSettingInput[]) =>
    api.put<AcademyBeltSettingsResponse>(`/academies/${academyId}/belt-settings`, { settings }).then((r) => r.data),
};
