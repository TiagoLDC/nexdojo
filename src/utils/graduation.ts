import { Belt } from '@/types';
import type { Student, GraduationRules } from '@/types';
import { BELT_ORDER } from './constants';

export const calculateAge = (birthDate: string): number => {
  if (!birthDate) return 0;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

export const isKidsBelt = (belt: Belt): boolean =>
  [Belt.WHITE, Belt.GREY, Belt.YELLOW, Belt.ORANGE, Belt.GREEN].includes(belt);

const monthsSince = (dateStr?: string): number => {
  if (!dateStr) return 0;
  const past = new Date(dateStr);
  const now = new Date();
  return (now.getFullYear() - past.getFullYear()) * 12 + (now.getMonth() - past.getMonth());
};

const getMetric = (student: Student, mode: GraduationRules['mode']): number => {
  if (mode === 'hours') return student.hoursSinceGraduation ?? 0;
  if (mode === 'months') return monthsSince(student.lastGraduationDate);
  return student.classesSinceGraduation ?? 0;
};

export const isReadyForGraduation = (
  student: Student,
  rules?: GraduationRules,
): { readyForBelt: boolean; readyForStripe: boolean } => {
  const age = calculateAge(student.birthDate);
  const mode = rules?.mode ?? 'classes';
  const metric = getMetric(student, mode);

  if (age < 16 && isKidsBelt(student.belt)) {
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

export const getNextRank = (
  currentBelt: Belt,
  currentStripes: number,
): { nextBelt: Belt; nextStripes: number } => {
  const maxStripes = currentBelt === Belt.BLACK ? 6 : 4;
  let nextStripes = currentStripes + 1;

  if (nextStripes <= maxStripes) {
    return { nextBelt: currentBelt, nextStripes };
  }

  const idx = BELT_ORDER.indexOf(currentBelt);
  if (idx < BELT_ORDER.length - 1) {
    return { nextBelt: BELT_ORDER[idx + 1], nextStripes: 0 };
  }

  return { nextBelt: currentBelt, nextStripes: maxStripes };
};

export const getGraduationThreshold = (
  student: Student,
  rules?: GraduationRules,
): number => {
  const age = calculateAge(student.birthDate);
  const isKids = age < 16 && isKidsBelt(student.belt);

  if (isKids) return rules?.kids?.stripeThreshold ?? 25;
  if (student.belt === Belt.WHITE) return rules?.white?.stripeThreshold ?? 20;
  if ([Belt.BLUE, Belt.PURPLE, Belt.BROWN].includes(student.belt)) return rules?.intermediate?.stripeThreshold ?? 40;
  if (student.belt === Belt.BLACK) return rules?.black?.stripeThreshold ?? 300;
  return 0;
};
