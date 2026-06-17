
import React from 'react';
import { Belt } from '../types';

interface BeltBadgeProps {
  belt: Belt;
  stripes: number;
  className?: string;
  showText?: boolean;
}

type BeltColorConfig = {
  bg: string;
  border: string;
  text: string;
  bar: string;
  middleStripe?: string;
};

export const BeltBadge: React.FC<BeltBadgeProps> = ({ belt, stripes, className = '', showText = true }) => {
  const getBeltColors = (belt: Belt): BeltColorConfig => {
    switch (belt) {
      case Belt.WHITE:        return { bg: 'bg-white',     border: 'border-slate-300',  text: 'text-slate-800', bar: 'bg-slate-900' };
      case Belt.GREY_WHITE:   return { bg: 'bg-slate-400', border: 'border-slate-400',  text: 'text-white',     bar: 'bg-slate-900', middleStripe: 'bg-white' };
      case Belt.GREY:         return { bg: 'bg-slate-400', border: 'border-slate-500',  text: 'text-white',     bar: 'bg-slate-900' };
      case Belt.GREY_BLACK:   return { bg: 'bg-slate-400', border: 'border-slate-500',  text: 'text-white',     bar: 'bg-white',     middleStripe: 'bg-zinc-900' };
      case Belt.YELLOW_WHITE: return { bg: 'bg-yellow-400',border: 'border-yellow-400', text: 'text-slate-900', bar: 'bg-slate-900', middleStripe: 'bg-white' };
      case Belt.YELLOW:       return { bg: 'bg-yellow-400',border: 'border-yellow-500', text: 'text-slate-900', bar: 'bg-slate-900' };
      case Belt.YELLOW_BLACK: return { bg: 'bg-yellow-400',border: 'border-yellow-500', text: 'text-slate-900', bar: 'bg-white',     middleStripe: 'bg-zinc-900' };
      case Belt.ORANGE_WHITE: return { bg: 'bg-orange-500',border: 'border-orange-500', text: 'text-white',     bar: 'bg-slate-900', middleStripe: 'bg-white' };
      case Belt.ORANGE:       return { bg: 'bg-orange-500',border: 'border-orange-600', text: 'text-white',     bar: 'bg-slate-900' };
      case Belt.ORANGE_BLACK: return { bg: 'bg-orange-500',border: 'border-orange-600', text: 'text-white',     bar: 'bg-white',     middleStripe: 'bg-zinc-900' };
      case Belt.GREEN_WHITE:  return { bg: 'bg-green-600', border: 'border-green-600',  text: 'text-white',     bar: 'bg-slate-900', middleStripe: 'bg-white' };
      case Belt.GREEN:        return { bg: 'bg-green-600', border: 'border-green-700',  text: 'text-white',     bar: 'bg-slate-900' };
      case Belt.GREEN_BLACK:  return { bg: 'bg-green-600', border: 'border-green-700',  text: 'text-white',     bar: 'bg-white',     middleStripe: 'bg-zinc-900' };
      case Belt.BLUE:         return { bg: 'bg-blue-600',  border: 'border-blue-700',   text: 'text-white',     bar: 'bg-slate-900' };
      case Belt.PURPLE:       return { bg: 'bg-purple-700',border: 'border-purple-800', text: 'text-white',     bar: 'bg-slate-900' };
      case Belt.BROWN:        return { bg: 'bg-amber-800', border: 'border-amber-900',  text: 'text-white',     bar: 'bg-slate-900' };
      case Belt.BLACK:        return { bg: 'bg-zinc-900',  border: 'border-zinc-950',   text: 'text-white',     bar: 'bg-red-600' };
      case Belt.CORAL:        return { bg: 'bg-red-700',   border: 'border-red-700',    text: 'text-white',     bar: 'bg-white',     middleStripe: 'bg-zinc-900' };
      case Belt.RED:          return { bg: 'bg-red-700',   border: 'border-red-800',    text: 'text-white',     bar: 'bg-white' };
      default:                return { bg: 'bg-slate-200', border: 'border-slate-300',  text: 'text-slate-600', bar: 'bg-slate-900' };
    }
  };

  const colors = getBeltColors(belt);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`relative h-6 w-16 rounded-md border ${colors.bg} ${colors.border} overflow-hidden shadow-sm`}>
        {/* Listra central para faixas compostas */}
        {colors.middleStripe && (
          <div
            className={`absolute inset-x-0 ${colors.middleStripe}`}
            style={{ top: '50%', transform: 'translateY(-50%)', height: '8px' }}
          />
        )}
        {/* Ponta da faixa (graus) */}
        <div className={`absolute left-0 top-0 bottom-0 w-5 ${colors.bar} flex flex-col items-center justify-center gap-[2px] py-1`}>
          {[...Array(stripes)].map((_, i) => (
            <div key={i} className="w-3 h-[2px] bg-white rounded-full shadow-[0_0_1px_rgba(0,0,0,0.5)]" />
          ))}
        </div>
      </div>
      {showText && (
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 leading-none">
            {belt}
          </span>
          {stripes > 0 && (
            <span className="text-[8px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-tighter mt-0.5">
              {stripes} {stripes === 1 ? 'Grau' : 'Graus'}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
