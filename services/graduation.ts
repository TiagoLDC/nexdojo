
import { Student, Belt, GraduationRules } from '../types';

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

// Faixas infantis "mistas" (exclui a Branca, que é compartilhada com o balde adulto — ver isKidsPath abaixo).
// Fonte única: antes duplicado 3x dentro deste arquivo (isReadyForGraduation, getGraduationThreshold, getWarnBefore).
export const KIDS_MIXED_BELTS = [
  Belt.GREY_WHITE, Belt.GREY, Belt.GREY_BLACK,
  Belt.YELLOW_WHITE, Belt.YELLOW, Belt.YELLOW_BLACK,
  Belt.ORANGE_WHITE, Belt.ORANGE, Belt.ORANGE_BLACK,
  Belt.GREEN_WHITE, Belt.GREEN, Belt.GREEN_BLACK,
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

const getMetric = (student: Student, mode: GraduationRules['mode']): number => {
  if (mode === 'hours') return student.hoursSinceGraduation ?? 0;
  if (mode === 'months') return monthsSince(student.lastGraduationDate);
  return student.classesSinceGraduation ?? 0;
};

export const isReadyForGraduation = (student: Student, rules?: GraduationRules) => {
  const age = calculateAge(student.birthDate);
  const mode = rules?.mode ?? 'classes';
  const metric = getMetric(student, mode);

  const isKidsPath = KIDS_MIXED_BELTS.includes(student.belt)
    || (age < 16 && student.belt === Belt.WHITE);

  if (isKidsPath) {
    const stripeT = rules?.kids?.stripeThreshold ?? 25;
    return {
      readyForBelt:   student.stripes >= 4 && metric >= stripeT,
      readyForStripe: student.stripes < 4  && metric >= stripeT,
    };
  }

  if (student.belt === Belt.WHITE) {
    const stripeT = rules?.white?.stripeThreshold ?? 20;
    return {
      readyForBelt:   student.stripes >= 4 && metric >= stripeT,
      readyForStripe: student.stripes < 4  && metric >= stripeT,
    };
  }

  if ([Belt.BLUE, Belt.PURPLE, Belt.BROWN].includes(student.belt)) {
    const stripeT = rules?.intermediate?.stripeThreshold ?? 40;
    return {
      readyForBelt:   student.stripes >= 4 && metric >= stripeT,
      readyForStripe: student.stripes < 4  && metric >= stripeT,
    };
  }

  if (student.belt === Belt.BLACK) {
    const stripeT = rules?.black?.stripeThreshold ?? 300;
    return {
      readyForBelt:   false,
      readyForStripe: student.stripes < 6 && metric >= stripeT,
    };
  }

  return { readyForBelt: false, readyForStripe: false };
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

export const getGraduationThreshold = (
  student: Student,
  rules?: GraduationRules,
): number => {
  const age = calculateAge(student.birthDate);
  const isKids = KIDS_MIXED_BELTS.includes(student.belt)
    || (age < 16 && student.belt === Belt.WHITE);
  if (isKids) return rules?.kids?.stripeThreshold ?? 25;
  if (student.belt === Belt.WHITE) return rules?.white?.stripeThreshold ?? 20;
  if ([Belt.BLUE, Belt.PURPLE, Belt.BROWN].includes(student.belt)) return rules?.intermediate?.stripeThreshold ?? 40;
  if (student.belt === Belt.BLACK) return rules?.black?.stripeThreshold ?? 300;
  return 0;
};

const getWarnBefore = (student: Student, rules?: GraduationRules): number => {
  const age = calculateAge(student.birthDate);
  const isKids = KIDS_MIXED_BELTS.includes(student.belt) || (age < 16 && student.belt === Belt.WHITE);
  if (isKids) return rules?.kids?.warnBefore ?? 0;
  if (student.belt === Belt.WHITE) return rules?.white?.warnBefore ?? 0;
  if ([Belt.BLUE, Belt.PURPLE, Belt.BROWN].includes(student.belt)) return rules?.intermediate?.warnBefore ?? 0;
  if (student.belt === Belt.BLACK) return rules?.black?.warnBefore ?? 0;
  return 0;
};

// ── Elegibilidade por faixa individual (academy_belt_settings) ────────────
// Substitui, na Central de Graduação, os baldes fixos (kids/white/intermediate/black)
// acima por configuração de meses e/ou aulas por faixa — o que ocorrer primeiro.
// Ver PLANO_GRADUACAO.md Fase 7. As funções acima (baldes) continuam em uso em
// DashboardView/ReportsView/StudentProfileView até a migração da Fase 8.

export interface BeltRankConfig {
  degreeCount: number;
  monthsRequired?: number | null;
  classesRequired?: number | null;
  warnBeforeMonths?: number | null;
  warnBeforeClasses?: number | null;
}

export const isReadyForGraduationByBeltRank = (student: Student, config?: BeltRankConfig) => {
  if (!config) return { readyForBelt: false, readyForStripe: false };
  const classesReady = config.classesRequired != null && (student.classesSinceGraduation ?? 0) >= config.classesRequired;
  const monthsReady = config.monthsRequired != null && monthsSince(student.lastGraduationDate) >= config.monthsRequired;
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
  const classes = config.classesRequired != null
    ? { current: student.classesSinceGraduation ?? 0, target: config.classesRequired, unit: 'aulas' as const }
    : null;
  const months = config.monthsRequired != null
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
  const classesRemaining = config.classesRequired != null ? config.classesRequired - (student.classesSinceGraduation ?? 0) : null;
  const monthsRemaining = config.monthsRequired != null ? config.monthsRequired - monthsSince(student.lastGraduationDate) : null;
  const classesClose = classesRemaining != null && config.warnBeforeClasses != null && classesRemaining > 0 && classesRemaining <= config.warnBeforeClasses;
  const monthsClose = monthsRemaining != null && config.warnBeforeMonths != null && monthsRemaining > 0 && monthsRemaining <= config.warnBeforeMonths;
  return classesClose || monthsClose;
};

export const getGraduationWarning = (
  student: Student,
  rules?: GraduationRules,
): { remaining: number; unit: 'treinos' | 'horas' | 'dias' } | null => {
  const { readyForBelt, readyForStripe } = isReadyForGraduation(student, rules);
  if (readyForBelt || readyForStripe) return null;

  const mode = rules?.mode ?? 'classes';
  const warnBefore = getWarnBefore(student, rules);
  if (warnBefore <= 0) return null;

  const threshold = getGraduationThreshold(student, rules);
  if (threshold <= 0) return null;

  if (mode === 'months') {
    if (!student.lastGraduationDate) return null;
    const [y, m, d] = student.lastGraduationDate.split('-').map(Number);
    const graduationDate = new Date(y, m - 1 + threshold, d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    graduationDate.setHours(0, 0, 0, 0);
    const daysUntil = Math.round((graduationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil <= 0 || daysUntil > warnBefore) return null;
    return { remaining: daysUntil, unit: 'dias' };
  }

  const current = mode === 'hours' ? (student.hoursSinceGraduation ?? 0) : (student.classesSinceGraduation ?? 0);
  const remaining = threshold - current;
  if (remaining <= 0 || remaining > warnBefore) return null;
  return { remaining, unit: mode === 'hours' ? 'horas' : 'treinos' };
};
