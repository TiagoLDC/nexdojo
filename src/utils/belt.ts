import { Belt } from '../types';

export const getBeltColor = (belt: Belt): string => {
  switch (belt) {
    case Belt.WHITE:  return 'bg-white text-slate-900 border-slate-200';
    case Belt.GREY:   return 'bg-slate-400 text-white border-slate-500';
    case Belt.YELLOW: return 'bg-yellow-400 text-slate-900 border-yellow-500';
    case Belt.ORANGE: return 'bg-orange-500 text-white border-orange-600';
    case Belt.GREEN:  return 'bg-green-600 text-white border-green-700';
    case Belt.BLUE:   return 'bg-blue-600 text-white border-blue-400';
    case Belt.PURPLE: return 'bg-purple-700 text-white border-purple-500';
    case Belt.BROWN:  return 'bg-amber-900 text-white border-amber-800';
    case Belt.BLACK:  return 'bg-slate-950 text-white border-slate-800';
    case Belt.CORAL:  return 'bg-gradient-to-r from-red-600 to-slate-900 text-white border-red-700';
    case Belt.RED:    return 'bg-red-700 text-white border-red-800';
    default:          return 'bg-indigo-600 text-white border-indigo-400';
  }
};
