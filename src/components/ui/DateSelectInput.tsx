import React, { useState } from 'react';

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

const parseValue = (v: string): [string, string, string] => {
  const parts = v ? v.split('T')[0].split('-') : [];
  return [parts[0] ?? '', parts[1] ?? '', parts[2] ?? ''];
};

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

  // Local state keeps each field independent so partial fills aren't lost
  const [localYear, setLocalYear] = useState(() => parseValue(value)[0]);
  const [localMonth, setLocalMonth] = useState(() => parseValue(value)[1]);
  const [localDay, setLocalDay] = useState(() => parseValue(value)[2]);
  // Track which external value we last synced from
  const [syncedValue, setSyncedValue] = useState(value);

  // Derived state (synchronous, during render): sync when the external value
  // changes. This correctly handles form resets and opening different records
  // without a post-render timing gap that useEffect would introduce.
  if (value !== syncedValue) {
    setSyncedValue(value);
    const [y, m, d] = parseValue(value);
    setLocalYear(y);
    setLocalMonth(m);
    setLocalDay(d);
  }

  const daysInMonth =
    localYear && localMonth
      ? new Date(parseInt(localYear), parseInt(localMonth), 0).getDate()
      : 31;

  const fireChange = (y: string, m: string, d: string) => {
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
          value={localDay}
          onChange={e => { const v = e.target.value; setLocalDay(v); fireChange(localYear, localMonth, v); }}
          className={sel}
        >
          <option value="">Dia</option>
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => (
            <option key={d} value={String(d).padStart(2, '0')}>{d}</option>
          ))}
        </select>

        <select
          disabled={disabled}
          value={localMonth}
          onChange={e => { const v = e.target.value; setLocalMonth(v); fireChange(localYear, v, localDay); }}
          className={`${sel} flex-[1.8]`}
        >
          <option value="">Mês</option>
          {MONTHS.map((m, i) => (
            <option key={i + 1} value={String(i + 1).padStart(2, '0')}>{m}</option>
          ))}
        </select>

        <select
          disabled={disabled}
          value={localYear}
          onChange={e => { const v = e.target.value; setLocalYear(v); fireChange(v, localMonth, localDay); }}
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
