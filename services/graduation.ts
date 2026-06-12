
import { Student, Belt, GraduationRules } from '../types';

export const BELT_LIST = [
  // Kids
  Belt.WHITE, Belt.GREY, Belt.YELLOW, Belt.ORANGE, Belt.GREEN,
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

const getMetric = (student: Student, mode: GraduationRules['mode']): number => {
  if (mode === 'hours') return student.hoursSinceGraduation ?? 0;
  if (mode === 'months') return monthsSince(student.lastGraduationDate);
  return student.classesSinceGraduation ?? 0;
};

export const isReadyForGraduation = (student: Student, rules?: GraduationRules) => {
  const age = calculateAge(student.birthDate);
  const mode = rules?.mode ?? 'classes';
  const metric = getMetric(student, mode);

  const isKidsPath = [Belt.GREY, Belt.YELLOW, Belt.ORANGE, Belt.GREEN].includes(student.belt)
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
  const isKids = [Belt.GREY, Belt.YELLOW, Belt.ORANGE, Belt.GREEN].includes(student.belt)
    || (age < 16 && student.belt === Belt.WHITE);
  if (isKids) return rules?.kids?.stripeThreshold ?? 25;
  if (student.belt === Belt.WHITE) return rules?.white?.stripeThreshold ?? 20;
  if ([Belt.BLUE, Belt.PURPLE, Belt.BROWN].includes(student.belt)) return rules?.intermediate?.stripeThreshold ?? 40;
  if (student.belt === Belt.BLACK) return rules?.black?.stripeThreshold ?? 300;
  return 0;
};
