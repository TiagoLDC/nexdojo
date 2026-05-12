import React, { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { Spinner } from './Spinner';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  onRowClick?: (row: T) => void;
  className?: string;
}

interface SortState {
  key: string;
  dir: 'asc' | 'desc';
}

export function Table<T extends Record<string, unknown>>({
  columns,
  data,
  keyExtractor,
  loading = false,
  emptyMessage = 'Nenhum registro encontrado.',
  emptyIcon,
  onRowClick,
  className = '',
}: TableProps<T>) {
  const [sort, setSort] = useState<SortState | null>(null);

  const handleSort = (key: string) => {
    setSort((prev) => {
      if (prev?.key === key) return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
      return { key, dir: 'asc' };
    });
  };

  const sorted = sort
    ? [...data].sort((a, b) => {
        const av = a[sort.key];
        const bv = b[sort.key];
        const cmp =
          typeof av === 'string' && typeof bv === 'string'
            ? av.localeCompare(bv, 'pt')
            : (av as number) > (bv as number)
            ? 1
            : -1;
        return sort.dir === 'asc' ? cmp : -cmp;
      })
    : data;

  return (
    <div className={`w-full overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 ${className}`}>
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-50 dark:bg-slate-800/60">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={[
                  'px-4 py-3 font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap',
                  col.sortable ? 'cursor-pointer select-none hover:text-slate-900 dark:hover:text-slate-200' : '',
                  col.headerClassName ?? '',
                ].join(' ')}
                onClick={col.sortable ? () => handleSort(col.key) : undefined}
              >
                <span className="inline-flex items-center gap-1">
                  {col.header}
                  {col.sortable && (
                    <span className="text-slate-400">
                      {sort?.key === col.key ? (
                        sort.dir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                      ) : (
                        <ChevronsUpDown size={14} />
                      )}
                    </span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="py-16 text-center">
                <div className="flex flex-col items-center gap-3 text-slate-400">
                  <Spinner size="lg" className="text-indigo-500" />
                  <span>Carregando…</span>
                </div>
              </td>
            </tr>
          ) : sorted.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-16 text-center">
                <div className="flex flex-col items-center gap-3 text-slate-400">
                  {emptyIcon && <span className="text-slate-300 dark:text-slate-600">{emptyIcon}</span>}
                  <span>{emptyMessage}</span>
                </div>
              </td>
            </tr>
          ) : (
            sorted.map((row, idx) => (
              <tr
                key={keyExtractor(row)}
                className={[
                  'bg-white dark:bg-slate-800 transition-colors',
                  onRowClick
                    ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    : '',
                ].join(' ')}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={['px-4 py-3 text-slate-800 dark:text-slate-200', col.className ?? ''].join(' ')}
                  >
                    {col.render
                      ? col.render(row, idx)
                      : (row[col.key] as React.ReactNode)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
