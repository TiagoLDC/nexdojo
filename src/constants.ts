
import { Belt } from './types';

// Regras baseadas no Sistema de Graduação CBJJ
export const BELT_COLORS: Record<Belt, string> = {
  [Belt.WHITE]: 'bg-white text-slate-800 border-slate-300',
  [Belt.GREY]: 'bg-slate-400 text-white border-slate-500',
  [Belt.YELLOW]: 'bg-yellow-400 text-slate-900 border-yellow-500',
  [Belt.ORANGE]: 'bg-orange-500 text-white border-orange-600',
  [Belt.GREEN]: 'bg-green-600 text-white border-green-700',
  [Belt.BLUE]: 'bg-blue-600 text-white border-blue-700',
  [Belt.PURPLE]: 'bg-purple-700 text-white border-purple-800',
  [Belt.BROWN]: 'bg-amber-800 text-white border-amber-900',
  [Belt.BLACK]: 'bg-zinc-900 text-white border-zinc-950',
  [Belt.CORAL]: 'bg-gradient-to-r from-red-600 to-zinc-900 text-white border-red-700',
  [Belt.RED]: 'bg-red-700 text-white border-red-800',
};

export const MIN_AGE_FOR_BELT: Partial<Record<Belt, number>> = {
  [Belt.BLUE]: 16,
  [Belt.PURPLE]: 16,
  [Belt.BROWN]: 18,
  [Belt.BLACK]: 19,
};

export const DAYS_MAP = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
