
import React from 'react';
import { Belt } from '../types';
import { BELT_VISUAL_CONFIG, DEFAULT_BELT_VISUAL_CONFIG } from '../constants';

interface BeltBadgeProps {
  belt: Belt;
  stripes: number;
  className?: string;
  showText?: boolean;
}

export const BeltBadge: React.FC<BeltBadgeProps> = ({ belt, stripes, className = '', showText = true }) => {
  const colors = BELT_VISUAL_CONFIG[belt] ?? DEFAULT_BELT_VISUAL_CONFIG;

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
