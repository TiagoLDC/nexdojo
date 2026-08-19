
import { Student, Belt } from '../types';

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

export const getNextRank = (currentBelt: Belt, currentStripes: number) => {
  const maxStripes = currentBelt === Belt.BLACK ? 6 : 4;
  let nextBelt = currentBelt;
  let nextStripes = currentStripes + 1;

  if (nextStripes > maxStripes) {
    const idx = BELT_LIST.indexOf(currentBelt);
    if (idx < BELT_LIST.length - 1) {
      nextBelt = BELT_LIST[idx + 1];
      nextStripes = 0;
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
  monthsRequired?: number | null;
  classesRequired?: number | null;
  warnBeforeMonths?: number | null;
  warnBeforeClasses?: number | null;
}

// 0 e null tem o mesmo significado aqui: "critério não usado" (nenhuma faixa exige
// "0 meses"/"0 aulas" de verdade — 0 é o valor que sobra quando o admin deixa vazio
// e o input trata como zero, então precisa ser ignorado igual a null).
const hasThreshold = (value?: number | null): value is number => value != null && value > 0;

export const isReadyForGraduationByBeltRank = (student: Student, config?: BeltRankConfig) => {
  if (!config) return { readyForBelt: false, readyForStripe: false };
  const classesReady = hasThreshold(config.classesRequired) && (student.classesSinceGraduation ?? 0) >= config.classesRequired;
  const monthsReady = hasThreshold(config.monthsRequired) && monthsSince(student.lastGraduationDate) >= config.monthsRequired;
  const ready = classesReady || monthsReady;
  return {
    readyForBelt: ready && student.stripes >= config.degreeCount,
    readyForStripe: ready && student.stripes < config.degreeCount,
  };
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
