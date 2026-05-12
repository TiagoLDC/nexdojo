import { Belt } from '@/types';
import type { Student } from '@/types';
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

export const isReadyForGraduation = (
  student: Student,
): { readyForBelt: boolean; readyForStripe: boolean } => {
  const age = calculateAge(student.birthDate);

  if (age < 16 && isKidsBelt(student.belt)) {
    return {
      readyForBelt: student.totalClasses >= 100,
      readyForStripe:
        student.totalClasses >= 25 &&
        Math.floor(student.totalClasses / 25) > student.stripes &&
        student.stripes < 4,
    };
  }

  if (student.belt === Belt.WHITE) {
    return {
      readyForBelt: student.totalClasses >= 80,
      readyForStripe:
        student.totalClasses >= 20 &&
        Math.floor(student.totalClasses / 20) > student.stripes &&
        student.stripes < 4,
    };
  }

  if ([Belt.BLUE, Belt.PURPLE, Belt.BROWN].includes(student.belt)) {
    return {
      readyForBelt: student.totalClasses >= 160,
      readyForStripe:
        student.totalClasses >= 40 &&
        Math.floor(student.totalClasses / 40) > student.stripes &&
        student.stripes < 4,
    };
  }

  if (student.belt === Belt.BLACK) {
    return {
      readyForBelt: false,
      readyForStripe:
        student.totalClasses >= 300 &&
        Math.floor(student.totalClasses / 300) > student.stripes &&
        student.stripes < 6,
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
