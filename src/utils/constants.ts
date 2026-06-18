import { Belt } from '@/types';

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

export const BELT_ORDER: Belt[] = [
  Belt.WHITE,
  Belt.GREY_WHITE,
  Belt.GREY,
  Belt.GREY_BLACK,
  Belt.YELLOW_WHITE,
  Belt.YELLOW,
  Belt.YELLOW_BLACK,
  Belt.ORANGE_WHITE,
  Belt.ORANGE,
  Belt.ORANGE_BLACK,
  Belt.GREEN_WHITE,
  Belt.GREEN,
  Belt.GREEN_BLACK,
  Belt.BLUE,
  Belt.PURPLE,
  Belt.BROWN,
  Belt.BLACK,
  Belt.CORAL,
  Belt.RED,
];

export const KIDS_BELTS: Belt[] = [
  Belt.WHITE,
  Belt.GREY_WHITE,
  Belt.GREY,
  Belt.GREY_BLACK,
  Belt.YELLOW_WHITE,
  Belt.YELLOW,
  Belt.YELLOW_BLACK,
  Belt.ORANGE_WHITE,
  Belt.ORANGE,
  Belt.ORANGE_BLACK,
  Belt.GREEN_WHITE,
  Belt.GREEN,
  Belt.GREEN_BLACK,
];

export const ADULT_BELTS: Belt[] = [
  Belt.WHITE,
  Belt.BLUE,
  Belt.PURPLE,
  Belt.BROWN,
  Belt.BLACK,
  Belt.CORAL,
  Belt.RED,
];

export const MIXED_KIDS_BELTS: Belt[] = [
  Belt.GREY_WHITE,
  Belt.GREY_BLACK,
  Belt.YELLOW_WHITE,
  Belt.YELLOW_BLACK,
  Belt.ORANGE_WHITE,
  Belt.ORANGE_BLACK,
  Belt.GREEN_WHITE,
  Belt.GREEN_BLACK,
];

export const MAX_STRIPES = 4;
export const KIDS_MAX_AGE = 15;
export const ADULT_MIN_AGE = 16;

export const FINANCE_CATEGORIES = {
  income: ['Mensalidade', 'Matrícula', 'Venda de Produto', 'Evento', 'Outros'],
  expense: ['Aluguel', 'Energia', 'Água', 'Internet', 'Salários', 'Material', 'Manutenção', 'Outros'],
} as const;

export const PAYMENT_METHODS = [
  'Dinheiro',
  'PIX',
  'Cartão de Débito',
  'Cartão de Crédito',
  'Boleto',
  'Transferência',
] as const;

export interface ColorPalette {
  base: string;
  shades: Record<number, string>;
}

export const COLOR_PALETTES: Record<string, ColorPalette> = {
  indigo: { base: '#4f46e5', shades: { 50: '#f5f3ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc', 400: '#818cf8', 500: '#6366f1', 700: '#4338ca', 800: '#3730a3', 900: '#1e1b4b', 950: '#0f172a' } },
  azul:   { base: '#2563eb', shades: { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa', 500: '#3b82f6', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a', 950: '#172554' } },
  roxo:   { base: '#9333ea', shades: { 50: '#faf5ff', 100: '#f3e8ff', 200: '#e9d5ff', 300: '#d8b4fe', 400: '#c084fc', 500: '#a855f7', 700: '#7e22ce', 800: '#6b21a8', 900: '#581c87', 950: '#3b0764' } },
  verde:  { base: '#10b981', shades: { 50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399', 500: '#10b981', 700: '#047857', 800: '#065f46', 900: '#064e3b', 950: '#022c22' } },
  laranja:{ base: '#f97316', shades: { 50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#fdba74', 400: '#fb923c', 500: '#f97316', 700: '#c2410c', 800: '#9a3412', 900: '#7c2d12', 950: '#431407' } },
  amarelo:{ base: '#eab308', shades: { 50: '#fefce8', 100: '#fef9c3', 200: '#fef08a', 300: '#fde047', 400: '#facc15', 500: '#eab308', 700: '#a16207', 800: '#854d0e', 900: '#713f12', 950: '#422006' } },
  marrom: { base: '#5c4033', shades: { 50: '#fdfcfb', 100: '#f7f2ef', 200: '#efdfd6', 300: '#dec0b0', 400: '#bd927b', 500: '#9b6e5d', 700: '#7a5142', 800: '#5c4033', 900: '#4a332a', 950: '#2d1f19' } },
  preto:  { base: '#0f172a', shades: { 50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 400: '#94a3b8', 500: '#64748b', 700: '#334155', 800: '#1e293b', 900: '#0f172a', 950: '#020617' } },
  cinza:  { base: '#64748b', shades: { 50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 400: '#94a3b8', 500: '#64748b', 700: '#334155', 800: '#1e293b', 900: '#0f172a', 950: '#020617' } },
  branco: { base: '#94a3b8', shades: { 50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 400: '#94a3b8', 500: '#64748b', 700: '#334155', 800: '#1e293b', 900: '#0f172a', 950: '#020617' } },
};

export const STORAGE_KEYS = {
  ACADEMY: 'oss_academy',
  STUDENTS: 'oss_students',
  INSTRUCTORS: 'oss_instructors',
  STAFF: 'oss_staff',
  TEMPLATES: 'oss_templates',
  CLASSES: 'oss_classes',
  ATTENDANCE: 'oss_attendance',
  TRANSACTIONS: 'oss_transactions',
  CALENDAR: 'oss_calendar',
  CHAT: 'oss_chat',
  PRODUCTS: 'oss_products',
  RECYCLE_BIN: 'oss_recycle_bin',
  AUTH_USER: 'oss_auth_user',
  AUTH_TOKEN: 'oss_auth_token',
  LANGUAGE: 'oss_language',
  THEME: 'oss_theme',
  ACCENT_COLOR: 'oss_accent_color',
} as const;
