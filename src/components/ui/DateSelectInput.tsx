import React from 'react';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril',
  'Maio', 'Junho', 'Julho', 'Agosto',
  'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

interface DateSelectInputProps {
  label?: string;
  value: string;           // YYYY-MM-DD or ''
  onChange: (v: string) => void;
  disabled?: boolean;
  required?: boolean;
  yearFrom?: number;       // oldest year in dropdown (default 1920)
  yearTo?: number;         // newest year in dropdown (default current year)
  className?: string;
  labelClassName?: string;
}

export const DateSelectInput: React.FC<DateSelectInputProps> = ({
  label,
  value,
  onChange,
  disabled,
  required,
  yearFrom,
  yearTo,
  className,
  labelClassName,
}) => {
  const currentYear = new Date().getFullYear();
  const minYear = yearFrom ?? 1920;
  const maxYear = yearTo ?? currentYear;

  const parts = value ? value.split('T')[0].split('-') : [];
  const yearVal  = parts[0] ?? '';
  const monthVal = parts[1] ?? '';
  const dayVal   = parts[2] ?? '';

  const daysInMonth =
    yearVal && monthVal
      ? new Date(parseInt(yearVal), parseInt(monthVal), 0).getDate()
      : 31;

  const emit = (y: string, m: string, d: string) => {
    if (!y || !m || !d) { onChange(''); return; }
    const maxDay = new Date(parseInt(y), parseInt(m), 0).getDate();
    const safeDay = Math.min(parseInt(d), maxDay).toString().padStart(2, '0');
    onChange(`${y}-${m.padStart(2, '0')}-${safeDay}`);
  };

  const sel = 'flex-1 min-w-0 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-2 py-3.5 outline-none font-bold text-slate-800 dark:text-white transition-all disabled:opacity-60 text-sm';

  return (
    <div className={className}>
      {label && (
        <label className={labelClassName ?? 'block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1'}>
          {label}{required && ' *'}
        </label>
      )}
      <div className="flex gap-2">
        <select
          disabled={disabled}
          value={dayVal}
          onChange={e => emit(yearVal, monthVal, e.target.value)}
          className={sel}
        >
          <option value="">Dia</option>
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => (
            <option key={d} value={String(d).padStart(2, '0')}>{d}</option>
          ))}
        </select>

        <select
          disabled={disabled}
          value={monthVal}
          onChange={e => emit(yearVal, e.target.value, dayVal)}
          className={`${sel} flex-[1.8]`}
        >
          <option value="">Mês</option>
          {MONTHS.map((m, i) => (
            <option key={i + 1} value={String(i + 1).padStart(2, '0')}>{m}</option>
          ))}
        </select>

        <select
          disabled={disabled}
          value={yearVal}
          onChange={e => emit(e.target.value, monthVal, dayVal)}
          className={`${sel} flex-[1.5]`}
        >
          <option value="">Ano</option>
          {Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i).map(y => (
            <option key={y} value={String(y)}>{y}</option>
          ))}
        </select>
      </div>
    </div>
  );
};
