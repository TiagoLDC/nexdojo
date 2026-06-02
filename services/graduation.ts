
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

export const isReadyForGraduation = (student: Student, rules?: GraduationRules) => {
  const age = calculateAge(student.birthDate);
  const mode = rules?.mode ?? 'classes';
  const metric = getMetric(student, mode);

  if (age < 16 && [Belt.WHITE, Belt.GREY, Belt.YELLOW, Belt.ORANGE, Belt.GREEN].includes(student.belt)) {
    const beltT  = rules?.kids?.beltThreshold  ?? 100;
    const stripeT = rules?.kids?.stripeThreshold ?? 25;
    return {
      readyForBelt: metric >= beltT,
      readyForStripe: metric >= stripeT && Math.floor(metric / stripeT) > student.stripes && student.stripes < 4,
    };
  }

  if (student.belt === Belt.WHITE) {
    const beltT  = rules?.white?.beltThreshold  ?? 80;
    const stripeT = rules?.white?.stripeThreshold ?? 20;
    return {
      readyForBelt: metric >= beltT,
      readyForStripe: metric >= stripeT && Math.floor(metric / stripeT) > student.stripes && student.stripes < 4,
    };
  }

  if ([Belt.BLUE, Belt.PURPLE, Belt.BROWN].includes(student.belt)) {
    const beltT  = rules?.intermediate?.beltThreshold  ?? 160;
    const stripeT = rules?.intermediate?.stripeThreshold ?? 40;
    return {
      readyForBelt: metric >= beltT,
      readyForStripe: metric >= stripeT && Math.floor(metric / stripeT) > student.stripes && student.stripes < 4,
    };
  }

  if (student.belt === Belt.BLACK) {
    const stripeT = rules?.black?.stripeThreshold ?? 300;
    return {
      readyForBelt: false,
      readyForStripe: metric >= stripeT && Math.floor(metric / stripeT) > student.stripes && student.stripes < 6,
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
  type: 'belt' | 'stripe' = 'belt',
): number => {
  const age = calculateAge(student.birthDate);
  const isKids = age < 16 && [Belt.WHITE, Belt.GREY, Belt.YELLOW, Belt.ORANGE, Belt.GREEN].includes(student.belt);
  if (isKids) {
    return type === 'belt' ? (rules?.kids?.beltThreshold ?? 100) : (rules?.kids?.stripeThreshold ?? 25);
  }
  if (student.belt === Belt.WHITE) {
    return type === 'belt' ? (rules?.white?.beltThreshold ?? 80) : (rules?.white?.stripeThreshold ?? 20);
  }
  if ([Belt.BLUE, Belt.PURPLE, Belt.BROWN].includes(student.belt)) {
    return type === 'belt' ? (rules?.intermediate?.beltThreshold ?? 160) : (rules?.intermediate?.stripeThreshold ?? 40);
  }
  if (student.belt === Belt.BLACK) {
    return rules?.black?.stripeThreshold ?? 300;
  }
  return 0;
};
