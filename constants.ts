
import { Belt } from './types';

// BELT_COLORS (tabela estática antiga, indexada só pelo enum Belt) foi removida em
// 12/08/2026 — zero consumidores restantes depois que todo lugar que exibe faixa passou
// a usar getBeltClassName (dinâmico, lê o cadastro de Esporte) mais abaixo neste arquivo.

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

// Mesmo conteúdo de BELT_VISUAL_CONFIG acima, mas indexado pela string `color_key` que fica
// salva em belt_ranks.color_key (ex: "GREY_WHITE") — é o nome do membro do enum Belt, não o
// valor em português. É o vocabulário canônico de cor usado pelo cadastro de Esporte (Fase 5)
// e pela exibição dinâmica de faixa (Fase 8+): editar a cor de uma faixa no cadastro passa a
// ter efeito real porque tanto o seletor quanto o BeltBadge leem deste mesmo mapa.
export const BELT_VISUAL_CONFIG_BY_COLOR_KEY: Record<string, BeltVisualConfig> = {
  WHITE: BELT_VISUAL_CONFIG[Belt.WHITE],
  GREY_WHITE: BELT_VISUAL_CONFIG[Belt.GREY_WHITE],
  GREY: BELT_VISUAL_CONFIG[Belt.GREY],
  GREY_BLACK: BELT_VISUAL_CONFIG[Belt.GREY_BLACK],
  YELLOW_WHITE: BELT_VISUAL_CONFIG[Belt.YELLOW_WHITE],
  YELLOW: BELT_VISUAL_CONFIG[Belt.YELLOW],
  YELLOW_BLACK: BELT_VISUAL_CONFIG[Belt.YELLOW_BLACK],
  ORANGE_WHITE: BELT_VISUAL_CONFIG[Belt.ORANGE_WHITE],
  ORANGE: BELT_VISUAL_CONFIG[Belt.ORANGE],
  ORANGE_BLACK: BELT_VISUAL_CONFIG[Belt.ORANGE_BLACK],
  GREEN_WHITE: BELT_VISUAL_CONFIG[Belt.GREEN_WHITE],
  GREEN: BELT_VISUAL_CONFIG[Belt.GREEN],
  GREEN_BLACK: BELT_VISUAL_CONFIG[Belt.GREEN_BLACK],
  BLUE: BELT_VISUAL_CONFIG[Belt.BLUE],
  PURPLE: BELT_VISUAL_CONFIG[Belt.PURPLE],
  BROWN: BELT_VISUAL_CONFIG[Belt.BROWN],
  BLACK: BELT_VISUAL_CONFIG[Belt.BLACK],
  CORAL: BELT_VISUAL_CONFIG[Belt.CORAL],
  RED: BELT_VISUAL_CONFIG[Belt.RED],
};

// Substituto dinâmico de `BELT_COLORS[belt]`: mesma string combinada "bg text border"
// (mesma ordem, então `.split(' ')[0]` nos call sites antigos continua pegando o bg),
// mas resolvendo primeiro pelo color_key do cadastro de Esporte quando disponível.
// Passe `getBeltConfig(belt)?.colorKey` (hook useAcademyBeltRanks) como segundo argumento.
export function getBeltClassName(belt: Belt, colorKey?: string): string {
  const c = (colorKey ? BELT_VISUAL_CONFIG_BY_COLOR_KEY[colorKey] : undefined)
    ?? BELT_VISUAL_CONFIG[belt]
    ?? DEFAULT_BELT_VISUAL_CONFIG;
  return `${c.bg} ${c.text} ${c.border}`;
}
