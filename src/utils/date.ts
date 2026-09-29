export const getTodayBrasilia = (): string => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const get = (t: string) => parts.find(p => p.type === t)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
};

export const addDaysToDateString = (dateStr: string, days: number): string => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d + days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

/**
 * Formata uma data vinda do banco ("YYYY-MM-DD", coluna DATE que o driver entrega como
 * string pura — ver `dateStrings: ['DATE']` em api/src/db.ts) para "DD/MM/AAAA", quebrando
 * a string em pedaços, sem passar por `new Date`.
 *
 * O motivo de NÃO usar `new Date(str)` aqui: uma string só-data é interpretada pelo
 * JavaScript como MEIA-NOITE UTC. Em Brasília (UTC-3) `new Date('2026-09-26')` vira
 * 25/09/2026 21:00 — um dia a menos e uma hora que nunca existiu. Era exatamente esse o
 * bug do feed "Atividade Recente" do dashboard: presenças de 26/09 apareciam como
 * "25/09/2026, 21:00" para toda a lista, porque 21:00 é só o offset do fuso aparecendo.
 * Se precisar de um objeto Date a partir de uma data assim, use `new Date(str + 'T12:00:00')`,
 * que fixa meio-dia LOCAL e por isso não atravessa a virada do dia em nenhum fuso do Brasil.
 */
export const formatDateBR = (dateStr?: string | null): string => {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('T')[0].split('-');
  if (!y || !m || !d) return '—';
  return `${d}/${m}/${y}`;
};

/** "HH:MM:SS" (coluna TIME) → "HH:MM". Devolve null quando não há hora registrada. */
export const formatTimeHHMM = (timeStr?: string | null): string | null => {
  if (!timeStr) return null;
  const hhmm = String(timeStr).substring(0, 5);
  return /^\d{2}:\d{2}$/.test(hhmm) ? hhmm : null;
};
