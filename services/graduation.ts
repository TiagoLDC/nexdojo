
import { Student, Belt } from '../types';
import type { BeltRank, AcademyBeltSetting, BeltAgeSegment } from '@/types';

export const BELT_LIST = [
  // Kids
  Belt.WHITE,
  Belt.GREY_WHITE, Belt.GREY, Belt.GREY_BLACK,
  Belt.YELLOW_WHITE, Belt.YELLOW, Belt.YELLOW_BLACK,
  Belt.ORANGE_WHITE, Belt.ORANGE, Belt.ORANGE_BLACK,
  Belt.GREEN_WHITE, Belt.GREEN, Belt.GREEN_BLACK,
  // Adults
  Belt.BLUE, Belt.PURPLE, Belt.BROWN, Belt.BLACK, Belt.CORAL, Belt.RED
];

export const calculateAge = (birthDate: string) => {
  if (!birthDate) return 0;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

const parseLocalDate = (dateStr: string): Date => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const monthsSince = (dateStr?: string): number => {
  if (!dateStr) return 0;
  const past = parseLocalDate(dateStr);
  const now = new Date();
  let months = (now.getFullYear() - past.getFullYear()) * 12 + (now.getMonth() - past.getMonth());
  if (now.getDate() < past.getDate()) months--;
  return Math.max(0, months);
};

// Ao trocar de faixa (não só de grau), pula faixas cujo `minAge`/`maxAge` cadastrado
// (tela Esportes, superuser) não cabe a idade do aluno — ex: aluno de 16 anos não pode
// cair numa faixa infantil com `maxAge: 15` (Cinza-e-Branca) só porque é a próxima da
// sequência; o sistema avança até achar a faixa adequada (ex: Azul). Sem `ageContext`
// (chamador não tem idade/faixas disponíveis), mantém o comportamento antigo — sempre a
// próxima da lista, sem checagem de idade.
export const getNextRank = (
  currentBelt: Belt,
  currentStripes: number,
  ageContext?: { studentAge: number; beltRanks: BeltRank[] },
) => {
  const maxStripes = currentBelt === Belt.BLACK ? 6 : 4;
  let nextBelt = currentBelt;
  let nextStripes = currentStripes + 1;

  if (nextStripes > maxStripes) {
    let idx = BELT_LIST.indexOf(currentBelt);
    if (idx < BELT_LIST.length - 1) {
      nextStripes = 0;
      while (idx < BELT_LIST.length - 1) {
        idx++;
        const candidate = BELT_LIST[idx];
        nextBelt = candidate;
        if (!ageContext) break;
        const rank = ageContext.beltRanks.find(b => b.name === candidate);
        const tooOld = rank?.maxAge != null && ageContext.studentAge > rank.maxAge;
        const tooYoung = rank?.minAge != null && ageContext.studentAge < rank.minAge;
        if (!tooOld && !tooYoung) break;
      }
    } else {
      nextStripes = maxStripes;
    }
  }

  return { nextBelt, nextStripes };
};

// ── Elegibilidade por faixa individual (academy_belt_settings) ────────────
// Critério configurado por faixa (meses e/ou aulas — o que ocorrer primeiro),
// substituindo os antigos baldes fixos (kids/white/intermediate/black) por academia.
// Ver PLANO_GRADUACAO.md Fases 7-8.

export interface BeltRankConfig {
  degreeCount: number;
  colorKey?: string;
  monthsRequired?: number | null;
  monthsRequiredDays?: number | null;
  classesRequired?: number | null;
  warnBeforeMonths?: number | null;
  warnBeforeClasses?: number | null;
}

// 0 e null tem o mesmo significado aqui: "critério não usado" (nenhuma faixa exige
// "0 meses"/"0 aulas" de verdade — 0 é o valor que sobra quando o admin deixa vazio
// e o input trata como zero, então precisa ser ignorado igual a null).
const hasThreshold = (value?: number | null): value is number => value != null && value > 0;

// Meses fracionados ("3 meses e 15 dias"): calcula a data-alvo (última graduação + N meses +
// D dias, com o mesmo clamping de "dia inexistente no mês" que monthsSince já faz) e compara
// com hoje. Equivalente a monthsSince(...) >= monthsRequired quando monthsRequiredDays é
// null/0 — zero regressão para faixas que nunca usarem dias.
export const isMonthsRequirementMet = (
  dateStr: string | undefined,
  monthsRequired: number,
  monthsRequiredDays?: number | null,
): boolean => {
  if (!dateStr) return false;
  const past = parseLocalDate(dateStr);
  const totalMonths = past.getMonth() + monthsRequired;
  const targetYear = past.getFullYear() + Math.floor(totalMonths / 12);
  const targetMonth = ((totalMonths % 12) + 12) % 12;
  const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const targetDay = Math.min(past.getDate(), daysInTargetMonth);
  const target = new Date(targetYear, targetMonth, targetDay + (monthsRequiredDays ?? 0));
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime() >= target.getTime();
};

export const isReadyForGraduationByBeltRank = (student: Student, config?: BeltRankConfig) => {
  if (!config) return { readyForBelt: false, readyForStripe: false };
  const classesReady = hasThreshold(config.classesRequired) && (student.classesSinceGraduation ?? 0) >= config.classesRequired;
  const monthsReady = hasThreshold(config.monthsRequired) && isMonthsRequirementMet(student.lastGraduationDate, config.monthsRequired, config.monthsRequiredDays);
  const ready = classesReady || monthsReady;
  return {
    readyForBelt: ready && student.stripes >= config.degreeCount,
    readyForStripe: ready && student.stripes < config.degreeCount,
  };
};

// Resolve, dentre 0..N linhas de configuração de uma faixa (mais de 1 quando segmentada por
// idade ou por grupo de grau), qual vale para um aluno específico. Sem segmentação (caso
// comum, 1 linha), retorna direto — zero regressão para faixas que nunca usarem isso.
export const resolveBeltRankConfig = (
  beltRanks: BeltRank[],
  beltSettings: AcademyBeltSetting[],
  youthMaxAge: number | null | undefined,
  student: { belt: string; birthDate?: string; stripes?: number },
): BeltRankConfig | undefined => {
  const rank = beltRanks.find(b => b.name === student.belt);
  if (!rank) return undefined;

  const toConfig = (row?: AcademyBeltSetting): BeltRankConfig => ({
    degreeCount: rank.degreeCount,
    colorKey: rank.colorKey,
    monthsRequired: row?.monthsRequired,
    monthsRequiredDays: row?.monthsRequiredDays,
    classesRequired: row?.classesRequired,
    warnBeforeMonths: row?.warnBeforeMonths,
    warnBeforeClasses: row?.warnBeforeClasses,
  });

  const rows = beltSettings.filter(s => s.beltRankId === rank.id);
  if (rows.length === 0) return toConfig(undefined);
  if (rows.length === 1) return toConfig(rows[0]);

  const ageRows = rows.filter(r => r.ageSegment != null);
  if (ageRows.length > 0) {
    const age = calculateAge(student.birthDate ?? '');
    const wanted: BeltAgeSegment = (youthMaxAge != null && age <= youthMaxAge) ? 'under_limit' : 'over_limit';
    const picked = ageRows.find(r => r.ageSegment === wanted)
      ?? ageRows.find(r => r.ageSegment === 'over_limit')
      ?? ageRows[0];
    return toConfig(picked);
  }

  const degreeRows = rows.filter(r => r.degreeSegmentMin != null || r.degreeSegmentMax != null);
  if (degreeRows.length > 0) {
    const nextDegree = (student.stripes ?? 0) + 1;
    const picked = degreeRows.find(r =>
      nextDegree >= (r.degreeSegmentMin ?? -Infinity) && nextDegree <= (r.degreeSegmentMax ?? Infinity)
    ) ?? degreeRows[degreeRows.length - 1];
    return toConfig(picked);
  }

  return toConfig(rows[0]);
};

// Progresso a exibir: quando meses E aulas estão configurados, mostra o que estiver
// mais perto de bater (maior proporção concluída) — é o que vai disparar primeiro.
export const getGraduationProgressByBeltRank = (
  student: Student,
  config?: BeltRankConfig,
): { current: number; target: number; unit: 'aulas' | 'meses' } | null => {
  if (!config) return null;
  const classes = hasThreshold(config.classesRequired)
    ? { current: student.classesSinceGraduation ?? 0, target: config.classesRequired, unit: 'aulas' as const }
    : null;
  const months = hasThreshold(config.monthsRequired)
    ? { current: monthsSince(student.lastGraduationDate), target: config.monthsRequired, unit: 'meses' as const }
    : null;
  if (classes && months) {
    return (classes.current / classes.target) >= (months.current / months.target) ? classes : months;
  }
  return classes ?? months ?? null;
};

// "Quase lá": dentro da margem de aviso antecipado configurada, mas ainda não elegível.
export const isCloseToGraduationByBeltRank = (student: Student, config?: BeltRankConfig): boolean => {
  if (!config) return false;
  const { readyForBelt, readyForStripe } = isReadyForGraduationByBeltRank(student, config);
  if (readyForBelt || readyForStripe) return false;
  const classesRemaining = hasThreshold(config.classesRequired) ? config.classesRequired - (student.classesSinceGraduation ?? 0) : null;
  const monthsRemaining = hasThreshold(config.monthsRequired) ? config.monthsRequired - monthsSince(student.lastGraduationDate) : null;
  const classesClose = classesRemaining != null && hasThreshold(config.warnBeforeClasses) && classesRemaining > 0 && classesRemaining <= config.warnBeforeClasses;
  const monthsClose = monthsRemaining != null && hasThreshold(config.warnBeforeMonths) && monthsRemaining > 0 && monthsRemaining <= config.warnBeforeMonths;
  return classesClose || monthsClose;
};
