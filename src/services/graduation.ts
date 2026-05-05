
import { Student, Belt } from '../types';

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

export const isReadyForGraduation = (student: Student) => {
  const age = calculateAge(student.birthDate);
  
  // Kids rules (simplificadas)
  if (age < 16 && [Belt.WHITE, Belt.GREY, Belt.YELLOW, Belt.ORANGE, Belt.GREEN].includes(student.belt)) {
    const readyForBelt = student.totalClasses >= 100;
    const readyForStripe = student.totalClasses >= 25 && Math.floor(student.totalClasses / 25) > student.stripes && student.stripes < 4;
    return { readyForBelt, readyForStripe };
  }

  // Adult rules
  if (student.belt === Belt.WHITE) {
    const readyForBelt = student.totalClasses >= 80;
    const readyForStripe = student.totalClasses >= 20 && Math.floor(student.totalClasses / 20) > student.stripes && student.stripes < 4;
    return { readyForBelt, readyForStripe };
  }
  
  if ([Belt.BLUE, Belt.PURPLE, Belt.BROWN].includes(student.belt)) {
    const readyForBelt = student.totalClasses >= 160;
    const readyForStripe = student.totalClasses >= 40 && Math.floor(student.totalClasses / 40) > student.stripes && student.stripes < 4;
    return { readyForBelt, readyForStripe };
  }
  
  if (student.belt === Belt.BLACK) {
    const readyForStripe = student.totalClasses >= 300 && Math.floor(student.totalClasses / 300) > student.stripes && student.stripes < 6;
    return { readyForBelt: false, readyForStripe };
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
