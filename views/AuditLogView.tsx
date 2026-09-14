import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ScrollText, LogIn, Trash2, DollarSign, KeyRound, Layers,
  Search, Globe, ShieldAlert, ChevronLeft, ChevronRight, X, FileText,
} from 'lucide-react';
import type { Academy, User, AuditLogEntry } from '../src/types';
import { auditLogService } from '@/features/auditLog/services/auditLogService';
import { useTranslation } from '../services/LanguageContext';

interface Category {
  id: string;
  label: string;
  icon: React.ElementType;
  actions: string[];
}

const CATEGORIES: Category[] = [
  { id: 'all', label: 'Todos os eventos', icon: Layers, actions: [] },
  {
    id: 'auth',
    label: 'Acessos e senhas',
    icon: LogIn,
    actions: [
      'auth.login_success', 'auth.login_failed', 'auth.master_password_login',
      'auth.password_changed', 'auth.password_reset_requested',
      'auth.password_reset_completed', 'auth.password_reset_failed',
    ],
  },
  {
    id: 'deletions',
    label: 'Exclusões e restaurações',
    icon: Trash2,
    actions: [
      'student.delete', 'student.restore', 'student.purge',
      'instructor.delete', 'instructor.restore', 'instructor.purge',
      'staff.delete', 'staff.restore', 'staff.purge',
      'template.delete', 'template.restore', 'template.purge',
    ],
  },
  {
    id: 'finance',
    label: 'Financeiro',
    icon: DollarSign,
    actions: ['finance.create', 'finance.update', 'finance.delete'],
  },
  {
    id: 'justifications',
    label: 'Justificativas de falta',
    icon: FileText,
    actions: ['absence_justification.approve', 'absence_justification.reject'],
  },
  {
    id: 'users',
    label: 'Usuários e permissões',
    icon: KeyRound,
    actions: ['user.role_change', 'user.status_change', 'user.password_reset_by_admin'],
  },
];

const ACTION_LABELS: Record<string, string> = {
  'auth.login_success': 'Login realizado',
  'auth.login_failed': 'Falha de login',
  'auth.master_password_login': 'Login via senha mestra',
  'auth.password_changed': 'Senha alterada pelo usuário',
  'auth.password_reset_requested': 'Recuperação de senha solicitada',
  'auth.password_reset_completed': 'Senha redefinida por link',
  'auth.password_reset_failed': 'Falha ao redefinir senha',
  'student.delete': 'Aluno excluído',
  'student.restore': 'Aluno restaurado',
  'student.purge': 'Aluno excluído definitivamente',
  'instructor.delete': 'Instrutor excluído',
  'instructor.restore': 'Instrutor restaurado',
  'instructor.purge': 'Instrutor excluído definitivamente',
  'staff.delete': 'Colaborador excluído',
  'staff.restore': 'Colaborador restaurado',
  'staff.purge': 'Colaborador excluído definitivamente',
  'template.delete': 'Plano de aula excluído',
  'template.restore': 'Plano de aula restaurado',
  'template.purge': 'Plano de aula excluído definitivamente',
  'finance.create': 'Lançamento criado',
  'finance.update': 'Lançamento editado',
  'finance.delete': 'Lançamento excluído',
  'absence_justification.approve': 'Justificativa de falta aceita',
  'absence_justification.reject': 'Justificativa de falta recusada',
  'user.role_change': 'Função alterada',
  'user.status_change': 'Status de acesso alterado',
  'user.password_reset_by_admin': 'Senha redefinida pelo admin',
};

const FAILURE_REASONS: Record<string, string> = {
  user_not_found: 'e-mail não cadastrado',
  invalid_password: 'senha incorreta',
  account_blocked: 'conta bloqueada',
  account_pending: 'cadastro pendente de aprovação',
  invalid_or_expired_token: 'link inválido ou expirado',
};

const FIELD_LABELS: Record<string, string> = {
  description: 'Descrição', amount: 'Valor', type: 'Tipo', category: 'Categoria',
  date: 'Data', paymentMethod: 'Forma de pagamento', status: 'Situação',
  studentId: 'Aluno', dueDate: 'Vencimento',
};

// Eventos que merecem destaque visual: falha de acesso e exclusão sem volta
const isAlert = (action: string) =>
  action === 'auth.login_failed' ||
  action === 'auth.master_password_login' ||
  action === 'auth.password_reset_failed' ||
  action.endsWith('.purge') ||
  action === 'finance.delete';

const formatMoney = (value: unknown) =>
  typeof value === 'number'
    ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : String(value ?? '—');

const formatValue = (field: string, value: unknown): string => {
  if (value === null || value === undefined || value === '') return '(vazio)';
  if (field === 'amount') return formatMoney(Number(value));
  return String(value);
};

/** Traduz o JSON de `details` para uma frase legível, em vez de despejar o objeto cru na tela. */
const describeDetails = (entry: AuditLogEntry): string => {
  const d = entry.details as Record<string, any> | null;
  if (!d) return '—';

  if (entry.action === 'auth.login_failed' || entry.action === 'auth.password_reset_failed') {
    return FAILURE_REASONS[d.reason] ?? String(d.reason ?? '—');
  }
  if (entry.action === 'auth.password_reset_requested') {
    const base = d.delivered ? 'Link enviado por e-mail' : 'Link não enviado';
    return d.reason ? `${base} (${FAILURE_REASONS[d.reason] ?? d.reason})` : base;
  }
  if (entry.action === 'auth.login_success') {
    return d.role ? `Perfil: ${d.role}` : '—';
  }
  if (entry.action === 'finance.update' && d.changes) {
    return Object.entries(d.changes as Record<string, { from: unknown; to: unknown }>)
      .map(([field, ch]) =>
        `${FIELD_LABELS[field] ?? field}: ${formatValue(field, ch.from)} → ${formatValue(field, ch.to)}`)
      .join(' · ');
  }
  if (entry.action.startsWith('finance.')) {
    const parts = [d.description, d.amount !== undefined ? formatMoney(Number(d.amount)) : null].filter(Boolean);
    return parts.length ? parts.join(' · ') : '—';
  }
  if (entry.action.startsWith('absence_justification.')) {
    const day = typeof d.date === 'string' ? d.date.split('-').reverse().join('/') : '—';
    const base = `Falta de ${day}`;
    const extra = entry.action === 'absence_justification.approve'
      ? (d.attendanceGranted ? ' · presença concedida' : ' · presença já existia no dia')
      : (d.previousStatus === 'Approved' ? ' · presença concedida foi revertida' : '');
    return `${base}${extra}${d.note ? ` · "${d.note}"` : ''}`;
  }
  if (entry.action === 'user.role_change' || entry.action === 'user.status_change') {
    return `${d.email ?? ''} — de "${d.from}" para "${d.to}"`.trim();
  }
  // Exclusões/restaurações e demais: nome e e-mail do registro afetado
  const parts = [d.name, d.email].filter(Boolean);
  return parts.length ? parts.join(' · ') : '—';
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  return {
    date: date.toLocaleDateString('pt-BR'),
    time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };
};

const todayISO = () => new Date().toISOString().slice(0, 10);
const daysAgoISO = (days: number) =>
  new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

const PAGE_SIZE = 50;

const AuditLogView: React.FC<{ academy: Academy; user: User }> = ({ academy, user }) => {
  const { showNotification } = useTranslation();
  const isSuperuser = user.role === 'superuser';

  const [categoryId, setCategoryId] = useState('all');
  const [actionFilter, setActionFilter] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dateFrom, setDateFrom] = useState(daysAgoISO(30));
  const [dateTo, setDateTo] = useState(todayISO());
  const [globalScope, setGlobalScope] = useState(false);
  const [page, setPage] = useState(1);

  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const category = useMemo(
    () => CATEGORIES.find(c => c.id === categoryId) ?? CATEGORIES[0],
    [categoryId],
  );

  // Digitar na busca não deve disparar uma chamada por tecla
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(() => {
    const scopeId = globalScope && isSuperuser ? 'all' : academy.id;
    // Ação específica tem precedência; sem ela, filtra pela categoria inteira
    const action = actionFilter || (category.actions.length ? category.actions.join(',') : undefined);

    setLoading(true);
    auditLogService
      .getAll(scopeId, {
        action,
        search: debouncedSearch || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        page,
        limit: PAGE_SIZE,
      })
      .then(res => {
        setEntries(res.data);
        setTotal(res.total);
        setTotalPages(res.totalPages || 1);
      })
      .catch(() => showNotification('Erro ao carregar os logs.', 'delete'))
      .finally(() => setLoading(false));
  }, [academy.id, globalScope, isSuperuser, category, actionFilter, debouncedSearch, dateFrom, dateTo, page]);

  useEffect(() => { load(); }, [load]);

  // Toda mudança de filtro volta para a página 1 — a página atual pode não existir no novo recorte.
  // Feito aqui, e não num efeito sobre os filtros, para não disparar uma busca com a página antiga
  // antes do reset (duas chamadas por clique).
  const handleCategoryChange = (id: string) => {
    setCategoryId(id);
    setActionFilter('');
    setPage(1);
  };

  const handleActionChange = (value: string) => {
    setActionFilter(value);
    setPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleDateFromChange = (value: string) => {
    setDateFrom(value);
    setPage(1);
  };

  const handleDateToChange = (value: string) => {
    setDateTo(value);
    setPage(1);
  };

  const handleScopeChange = (checked: boolean) => {
    setGlobalScope(checked);
    setPage(1);
  };

  const clearFilters = () => {
    setCategoryId('all');
    setActionFilter('');
    setSearch('');
    setDateFrom(daysAgoISO(30));
    setDateTo(todayISO());
    setGlobalScope(false);
    setPage(1);
  };

  const hasCustomFilter =
    categoryId !== 'all' || !!actionFilter || !!search ||
    dateFrom !== daysAgoISO(30) || dateTo !== todayISO() || globalScope;

  const inputClass =
    'w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm ' +
    'focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm dark:text-white';

  return (
    <div className="max-w-6xl mx-auto space-y-4 md:space-y-6 pb-20 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <ScrollText size={24} className="text-indigo-600" />
            Logs do Sistema
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Registro de quem fez o quê, quando e de onde.
          </p>
        </div>
        {hasCustomFilter && (
          <button
            onClick={clearFilters}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:border-indigo-500 transition-all"
          >
            <X size={14} />
            Limpar filtros
          </button>
        )}
      </header>

      {/* Seletor de qual log ver */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          const active = cat.id === categoryId;
          return (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              className={`flex flex-col items-start gap-2 p-3 md:p-4 rounded-2xl border text-left transition-all ${
                active
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-indigo-300 dark:hover:border-indigo-900'
              }`}
            >
              <Icon size={18} className={active ? 'text-white' : 'text-indigo-600'} />
              <span className="text-[11px] md:text-xs font-bold leading-tight">{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-slate-900 p-4 md:p-5 rounded-[24px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por usuário, e-mail ou detalhe..."
              value={search}
              onChange={e => handleSearchChange(e.target.value)}
              className={`${inputClass} pl-11`}
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-1">De</label>
            <input type="date" value={dateFrom} onChange={e => handleDateFromChange(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-1">Até</label>
            <input type="date" value={dateTo} onChange={e => handleDateToChange(e.target.value)} className={inputClass} />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {category.actions.length > 0 && (
            <select
              value={actionFilter}
              onChange={e => handleActionChange(e.target.value)}
              className={`${inputClass} sm:max-w-xs`}
            >
              <option value="">Todas as ações desta categoria</option>
              {category.actions.map(a => (
                <option key={a} value={a}>{ACTION_LABELS[a] ?? a}</option>
              ))}
            </select>
          )}

          {isSuperuser && (
            <label className="flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-200 dark:border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={globalScope}
                onChange={e => handleScopeChange(e.target.checked)}
                className="accent-indigo-600"
              />
              <Globe size={14} className="text-slate-400" />
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                Todas as academias
              </span>
            </label>
          )}
        </div>

        {globalScope && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Inclui tentativas de login em e-mails que não pertencem a nenhuma academia — só visíveis neste modo.
          </p>
        )}
      </div>

      {/* Resultado */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
            {loading ? 'Carregando...' : `${total} evento(s)`}
          </span>
        </div>

        {/* Desktop: tabela */}
        <div className="hidden md:block bg-white dark:bg-slate-900 rounded-[24px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-950/50">
                <tr className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <th className="px-5 py-3">Data / Hora</th>
                  <th className="px-5 py-3">Ação</th>
                  <th className="px-5 py-3">Autor</th>
                  <th className="px-5 py-3">Detalhes</th>
                  <th className="px-5 py-3">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {entries.map(entry => {
                  const { date, time } = formatDateTime(entry.createdAt);
                  const alert = isAlert(entry.action);
                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-950/40 transition-colors">
                      <td className="px-5 py-3 whitespace-nowrap">
                        <span className="font-bold text-slate-700 dark:text-slate-300">{date}</span>
                        <span className="block text-[11px] text-slate-400">{time}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          alert
                            ? 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                          {alert && <ShieldAlert size={12} />}
                          {ACTION_LABELS[entry.action] ?? entry.action}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {entry.userName ?? '—'}
                        </span>
                        {entry.userEmail && (
                          <span className="block text-[11px] text-slate-400">{entry.userEmail}</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-slate-600 dark:text-slate-400 max-w-md">
                        {describeDetails(entry)}
                      </td>
                      <td className="px-5 py-3 text-[11px] text-slate-400 whitespace-nowrap">
                        {entry.ipAddress ?? '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!loading && entries.length === 0 && (
            <div className="py-16 text-center text-slate-400">
              <ScrollText size={64} className="mx-auto mb-3 opacity-10" />
              <h3 className="font-bold text-slate-500">Nenhum evento encontrado</h3>
              <p className="text-sm mt-1">Ajuste o período ou a categoria para ver outros registros.</p>
            </div>
          )}
        </div>

        {/* Mobile: cards */}
        <div className="md:hidden space-y-3">
          {entries.map(entry => {
            const { date, time } = formatDateTime(entry.createdAt);
            const alert = isAlert(entry.action);
            return (
              <div
                key={entry.id}
                className="bg-white dark:bg-slate-900 p-4 rounded-[24px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                    alert
                      ? 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  }`}>
                    {alert && <ShieldAlert size={12} />}
                    {ACTION_LABELS[entry.action] ?? entry.action}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap">
                    {date} {time}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {entry.userName ?? entry.userEmail ?? '—'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 break-words">
                    {describeDetails(entry)}
                  </p>
                </div>
                {entry.ipAddress && (
                  <p className="text-[10px] text-slate-400 font-mono">{entry.ipAddress}</p>
                )}
              </div>
            );
          })}

          {!loading && entries.length === 0 && (
            <div className="py-16 text-center bg-white dark:bg-slate-900/50 rounded-[24px] border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
              <ScrollText size={56} className="mx-auto mb-3 opacity-10" />
              <h3 className="font-bold text-slate-500">Nenhum evento encontrado</h3>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-4 px-1 py-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Página {page} de {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-40 hover:border-indigo-500 transition-all"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-40 hover:border-indigo-500 transition-all"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogView;
