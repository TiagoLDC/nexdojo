/**
 * Avança a data de vencimento para o próximo mês.
 * Regra de fim de mês: se o dia atual é o último dia do mês,
 * o próximo vencimento será sempre o último dia do próximo mês.
 * Exemplos: 28/02 → 31/03 → 30/04 → 31/05
 */
export function advancePaymentDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);

  const daysInCurrentMonth = new Date(year, month, 0).getDate();
  const isLastDayOfMonth = day === daysInCurrentMonth;

  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  const daysInNextMonth = new Date(nextYear, nextMonth, 0).getDate();

  const nextDay = isLastDayOfMonth ? daysInNextMonth : Math.min(day, daysInNextMonth);

  return `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(nextDay).padStart(2, '0')}`;
}
