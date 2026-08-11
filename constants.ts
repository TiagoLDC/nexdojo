
import { Belt } from './types';

// Regras baseadas no Sistema de Graduação CBJJ
export const BELT_COLORS: Record<Belt, string> = {
  [Belt.WHITE]: 'bg-white text-slate-800 border-slate-300',
  [Belt.GREY_WHITE]:   '[background:linear-gradient(to_bottom,#94a3b8_35%,#fff_35%,#fff_65%,#94a3b8_65%)] text-slate-800 border-slate-400',
  [Belt.GREY]:         'bg-slate-400 text-white border-slate-500',
  [Belt.GREY_BLACK]:   '[background:linear-gradient(to_bottom,#94a3b8_35%,#18181b_35%,#18181b_65%,#94a3b8_65%)] text-white border-slate-500',
  [Belt.YELLOW_WHITE]: '[background:linear-gradient(to_bottom,#facc15_35%,#fff_35%,#fff_65%,#facc15_65%)] text-slate-900 border-yellow-400',
  [Belt.YELLOW]:       'bg-yellow-400 text-slate-900 border-yellow-500',
  [Belt.YELLOW_BLACK]: '[background:linear-gradient(to_bottom,#facc15_35%,#18181b_35%,#18181b_65%,#facc15_65%)] text-white [text-shadow:1px_1px_0_#000,-1px_-1px_0_#000,1px_-1px_0_#000,-1px_1px_0_#000] border-yellow-500',
  [Belt.ORANGE_WHITE]: '[background:linear-gradient(to_bottom,#f97316_35%,#fff_35%,#fff_65%,#f97316_65%)] text-slate-800 border-orange-500',
  [Belt.ORANGE]:       'bg-orange-500 text-white border-orange-600',
  [Belt.ORANGE_BLACK]: '[background:linear-gradient(to_bottom,#f97316_35%,#18181b_35%,#18181b_65%,#f97316_65%)] text-white border-orange-600',
  [Belt.GREEN_WHITE]:  '[background:linear-gradient(to_bottom,#16a34a_35%,#fff_35%,#fff_65%,#16a34a_65%)] text-slate-800 border-green-600',
  [Belt.GREEN]:        'bg-green-600 text-white border-green-700',
  [Belt.GREEN_BLACK]:  '[background:linear-gradient(to_bottom,#16a34a_35%,#18181b_35%,#18181b_65%,#16a34a_65%)] text-white border-green-700',
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

// Paleta detalhada usada pelo componente BeltBadge (fundo/borda/texto/barra de graus e
// listra central para faixas compostas). Fonte única — antes era um switch(belt) privado
// dentro de components/BeltBadge.tsx, duplicando as cores já definidas em BELT_COLORS acima.
export interface BeltVisualConfig {
  bg: string;
  border: string;
  text: string;
  bar: string;
  middleStripe?: string;
}

export const BELT_VISUAL_CONFIG: Record<Belt, BeltVisualConfig> = {
  [Belt.WHITE]:        { bg: 'bg-white',      border: 'border-slate-300',  text: 'text-slate-800', bar: 'bg-slate-900' },
  [Belt.GREY_WHITE]:   { bg: 'bg-slate-400',  border: 'border-slate-400',  text: 'text-white',     bar: 'bg-slate-900', middleStripe: 'bg-white' },
  [Belt.GREY]:         { bg: 'bg-slate-400',  border: 'border-slate-500',  text: 'text-white',     bar: 'bg-slate-900' },
  [Belt.GREY_BLACK]:   { bg: 'bg-slate-400',  border: 'border-slate-500',  text: 'text-white',     bar: 'bg-white',     middleStripe: 'bg-zinc-900' },
  [Belt.YELLOW_WHITE]: { bg: 'bg-yellow-400', border: 'border-yellow-400', text: 'text-slate-900', bar: 'bg-slate-900', middleStripe: 'bg-white' },
  [Belt.YELLOW]:       { bg: 'bg-yellow-400', border: 'border-yellow-500', text: 'text-slate-900', bar: 'bg-slate-900' },
  [Belt.YELLOW_BLACK]: { bg: 'bg-yellow-400', border: 'border-yellow-500', text: 'text-slate-900', bar: 'bg-white',     middleStripe: 'bg-zinc-900' },
  [Belt.ORANGE_WHITE]: { bg: 'bg-orange-500', border: 'border-orange-500', text: 'text-white',     bar: 'bg-slate-900', middleStripe: 'bg-white' },
  [Belt.ORANGE]:       { bg: 'bg-orange-500', border: 'border-orange-600', text: 'text-white',     bar: 'bg-slate-900' },
  [Belt.ORANGE_BLACK]: { bg: 'bg-orange-500', border: 'border-orange-600', text: 'text-white',     bar: 'bg-white',     middleStripe: 'bg-zinc-900' },
  [Belt.GREEN_WHITE]:  { bg: 'bg-green-600',  border: 'border-green-600',  text: 'text-white',     bar: 'bg-slate-900', middleStripe: 'bg-white' },
  [Belt.GREEN]:        { bg: 'bg-green-600',  border: 'border-green-700',  text: 'text-white',     bar: 'bg-slate-900' },
  [Belt.GREEN_BLACK]:  { bg: 'bg-green-600',  border: 'border-green-700',  text: 'text-white',     bar: 'bg-white',     middleStripe: 'bg-zinc-900' },
  [Belt.BLUE]:         { bg: 'bg-blue-600',   border: 'border-blue-700',   text: 'text-white',     bar: 'bg-slate-900' },
  [Belt.PURPLE]:       { bg: 'bg-purple-700', border: 'border-purple-800', text: 'text-white',     bar: 'bg-slate-900' },
  [Belt.BROWN]:        { bg: 'bg-amber-800',  border: 'border-amber-900',  text: 'text-white',     bar: 'bg-slate-900' },
  [Belt.BLACK]:        { bg: 'bg-zinc-900',   border: 'border-zinc-950',   text: 'text-white',     bar: 'bg-red-600' },
  [Belt.CORAL]:        { bg: 'bg-red-700',    border: 'border-red-700',    text: 'text-white',     bar: 'bg-white',     middleStripe: 'bg-zinc-900' },
  [Belt.RED]:          { bg: 'bg-red-700',    border: 'border-red-800',    text: 'text-white',     bar: 'bg-white' },
};

export const DEFAULT_BELT_VISUAL_CONFIG: BeltVisualConfig = { bg: 'bg-slate-200', border: 'border-slate-300', text: 'text-slate-600', bar: 'bg-slate-900' };
