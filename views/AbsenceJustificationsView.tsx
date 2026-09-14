import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FileText, Send, Clock, CheckCircle2, XCircle, Search, Trash2,
  CalendarDays, User as UserIcon, ChevronLeft, ChevronRight, AlertCircle,
} from 'lucide-react';
import type { Academy, User, AbsenceJustification, AbsenceJustificationStatus } from '@/types';
import { absenceJustificationService } from '@/features/absenceJustifications/services/absenceJustificationService';
import { useProfileStore, getActiveProfile } from '@/stores/profileStore';
import { useTranslation } from '../services/LanguageContext';
import { ConfirmDialog } from '@/components/ui';
import { getTodayBrasilia } from '@/utils/date';

/** Mesma janela aplicada no backend (MAX_DAYS_BACK em api/src/routes/absenceJustifications.ts) */
const MAX_DAYS_BACK = 60;
const PAGE_SIZE = 50;
const REVIEWER_ROLES = ['admin', 'superuser', 'instructor', 'staff'];

const STATUS_META: Record<AbsenceJustificationStatus, { label: string; className: string; icon: React.ElementType }> = {
  Pending:  { label: 'Aguardando análise', icon: Clock,        className: 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400' },
  Approved: { label: 'Aceita',             icon: CheckCircle2, className: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400' },
  Rejected: { label: 'Recusada',           icon: XCircle,      className: 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400' },
};

const formatDate = (value: string) =>
  new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

const formatWeekday = (value: string) =>
  new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long' });

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const daysAgoISO = (days: number) => {
  const today = getTodayBrasilia();
  const [y, m, d] = today.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d - days, 12, 0, 0));
  return date.toISOString().slice(0, 10);
};

const inputClass =
  'w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm ' +
  'focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm dark:text-white';

const StatusBadge: React.FC<{ status: AbsenceJustificationStatus }> = ({ status }) => {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${meta.className}`}>
      <Icon size={12} />
      {meta.label}
    </span>
  );
};

// ── Painel do aluno / responsável ────────────────────────────────────────────

const StudentPanel: React.FC<{ academy: Academy; studentId?: string; dependentName?: string }> = ({
  academy, studentId, dependentName,
}) => {
  const { showNotification } = useTranslation();
  const [items, setItems] = useState<AbsenceJustification[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const today = getTodayBrasilia();
  const minDate = daysAgoISO(MAX_DAYS_BACK);

  const load = useCallback(() => {
    setLoading(true);
    absenceJustificationService
      .getAll(academy.id, { limit: PAGE_SIZE, ...(studentId ? { studentId } : {}) })
      .then((res) => setItems(res.data))
      .catch(() => showNotification('Erro ao carregar suas justificativas.', 'delete'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [academy.id, studentId]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!date) { setFormError('Escolha o dia em que você faltou.'); return; }
    if (date > today) { setFormError('Não é possível justificar uma falta em data futura.'); return; }
    if (date < minDate) { setFormError(`Só é possível justificar faltas dos últimos ${MAX_DAYS_BACK} dias.`); return; }
    if (reason.trim().length < 5) { setFormError('Descreva o motivo da falta com um pouco mais de detalhe.'); return; }

    setSending(true);
    try {
      await absenceJustificationService.create(academy.id, {
        date,
        reason: reason.trim(),
        ...(studentId ? { studentId } : {}),
      });
      setDate('');
      setReason('');
      load();
      showNotification('Justificativa enviada! Aguarde a análise do professor.');
    } catch (err: any) {
      setFormError(err?.response?.data?.error || 'Falha ao enviar a justificativa. Tente novamente.');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    setPendingDeleteId(null);
    try {
      await absenceJustificationService.delete(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err: any) {
      showNotification(err?.response?.data?.error || 'Não foi possível excluir a justificativa.', 'delete');
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-[24px] border border-slate-100 dark:border-slate-800 shadow-sm">
        <h2 className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-wide mb-1">
          Justificar uma falta
        </h2>
        <p className="text-xs text-slate-400 mb-4">
          {dependentName
            ? `Enviando como responsável por ${dependentName}. O professor analisa e, se aceitar, a presença do dia é concedida.`
            : 'O professor analisa o pedido e, se aceitar, a presença daquele dia é concedida automaticamente.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-1">
                Dia da falta
              </label>
              <input
                type="date"
                value={date}
                min={minDate}
                max={today}
                onChange={(e) => setDate(e.target.value)}
                className={inputClass}
              />
              {date && (
                <p className="text-[11px] text-slate-400 mt-1 ml-1 capitalize">{formatWeekday(date)}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-1">
              Motivo
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={1000}
              rows={4}
              placeholder="Ex: Estava com febre e fui ao médico; atestado em anexo na secretaria."
              className={`${inputClass} resize-none`}
            />
            <p className="text-[10px] text-slate-400 mt-1 ml-1">{reason.length}/1000</p>
          </div>

          {formError && (
            <p className="flex items-start gap-2 text-xs font-bold text-red-500">
              <AlertCircle size={14} className="shrink-0 mt-px" />
              {formError}
            </p>
          )}

          <button
            type="submit"
            disabled={sending}
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20"
          >
            <Send size={14} />
            {sending ? 'Enviando...' : 'Enviar Justificativa'}
          </button>
        </form>
      </div>

      <div className="space-y-3">
        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">
          Minhas justificativas
        </h2>

        {loading ? (
          <p className="text-xs text-slate-400 px-1">Carregando...</p>
        ) : items.length === 0 ? (
          <div className="py-14 text-center bg-white dark:bg-slate-900/50 rounded-[24px] border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
            <FileText size={52} className="mx-auto mb-3 opacity-10" />
            <h3 className="font-bold text-slate-500">Nenhuma justificativa enviada</h3>
            <p className="text-sm mt-1">Faltou em um treino? Registre o motivo acima.</p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-900 p-4 rounded-[24px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CalendarDays size={16} className="text-indigo-600 shrink-0" />
                  <span className="font-black text-slate-800 dark:text-white">{formatDate(item.date)}</span>
                </div>
                <StatusBadge status={item.status} />
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap break-words">
                {item.reason}
              </p>

              {item.status !== 'Pending' && (
                <div className="text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2">
                  <p>
                    {item.status === 'Approved' ? 'Aceita' : 'Recusada'}
                    {item.reviewedByName ? ` por ${item.reviewedByName}` : ''}
                    {item.reviewedAt ? ` em ${formatDateTime(item.reviewedAt)}` : ''}
                  </p>
                  {item.reviewNote && (
                    <p className="mt-1 text-slate-500 dark:text-slate-400">
                      Observação do professor: {item.reviewNote}
                    </p>
                  )}
                  {item.status === 'Approved' && (
                    <p className="mt-1 font-bold text-emerald-600 dark:text-emerald-400">
                      Presença concedida neste dia.
                    </p>
                  )}
                </div>
              )}

              {item.status !== 'Approved' && (
                <div className="flex justify-end">
                  <button
                    onClick={() => setPendingDeleteId(item.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                  >
                    <Trash2 size={12} />
                    Excluir
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <ConfirmDialog
        open={!!pendingDeleteId}
        onClose={() => setPendingDeleteId(null)}
        onConfirm={() => pendingDeleteId && handleDelete(pendingDeleteId)}
        title="Excluir justificativa?"
        message="A justificativa será removida. Se ela já tiver sido recusada, você poderá enviar outra para o mesmo dia."
        confirmLabel="Sim, Excluir"
      />
    </div>
  );
};

// ── Painel do professor / administrador ──────────────────────────────────────

const ReviewPanel: React.FC<{ academy: Academy }> = ({ academy }) => {
  const { showNotification } = useTranslation();
  const [items, setItems] = useState<AbsenceJustification[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'' | AbsenceJustificationStatus>('Pending');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  // Observação opcional digitada pelo professor, por justificativa
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [pendingReject, setPendingReject] = useState<AbsenceJustification | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    absenceJustificationService
      .getAll(academy.id, {
        status: statusFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        page,
        limit: PAGE_SIZE,
      })
      .then((res) => {
        setItems(res.data);
        setTotal(res.total);
        setTotalPages(res.totalPages || 1);
      })
      .catch(() => showNotification('Erro ao carregar as justificativas.', 'delete'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [academy.id, statusFilter, dateFrom, dateTo, page]);

  useEffect(() => { load(); }, [load]);

  // A busca por nome do aluno é local: a lista já vem paginada e filtrada por status/período,
  // e é ela que o professor tem na tela — evita uma rodada extra na API a cada tecla.
  const visibleItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((i) => (i.studentName ?? '').toLowerCase().includes(term));
  }, [items, search]);

  const handleReview = async (item: AbsenceJustification, status: 'Approved' | 'Rejected') => {
    setPendingReject(null);
    setBusyId(item.id);
    try {
      const updated = await absenceJustificationService.review(item.id, status, notes[item.id]?.trim() || undefined);
      setNotes((prev) => { const next = { ...prev }; delete next[item.id]; return next; });
      // Com o filtro em "Pendentes", a linha analisada sai da fila; nos demais filtros, atualiza no lugar
      if (statusFilter === 'Pending') {
        setItems((prev) => prev.filter((i) => i.id !== item.id));
        setTotal((prev) => Math.max(0, prev - 1));
      } else {
        setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
      }
      showNotification(
        status === 'Approved'
          ? `Justificativa aceita — presença de ${formatDate(item.date)} concedida a ${item.studentName ?? 'aluno'}.`
          : 'Justificativa recusada. O aluno segue sem presença neste dia.',
      );
    } catch (err: any) {
      showNotification(err?.response?.data?.error || 'Não foi possível registrar a análise.', 'delete');
    } finally {
      setBusyId(null);
    }
  };

  const changeFilter = (fn: () => void) => { fn(); setPage(1); };

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="bg-white dark:bg-slate-900 p-4 md:p-5 rounded-[24px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {([
            { id: 'Pending' as const,  label: 'Pendentes' },
            { id: 'Approved' as const, label: 'Aceitas' },
            { id: 'Rejected' as const, label: 'Recusadas' },
            { id: '' as const,         label: 'Todas' },
          ]).map((opt) => {
            const active = statusFilter === opt.id;
            return (
              <button
                key={opt.id || 'all'}
                onClick={() => changeFilter(() => setStatusFilter(opt.id))}
                className={`px-3 py-2.5 rounded-2xl border text-[11px] font-bold transition-all ${
                  active
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-indigo-300 dark:hover:border-indigo-900'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar pelo nome do aluno..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${inputClass} pl-11`}
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-1">De</label>
            <input type="date" value={dateFrom} onChange={(e) => changeFilter(() => setDateFrom(e.target.value))} className={inputClass} />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-1">Até</label>
            <input type="date" value={dateTo} onChange={(e) => changeFilter(() => setDateTo(e.target.value))} className={inputClass} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
          {loading ? 'Carregando...' : `${total} justificativa(s)`}
        </span>
      </div>

      {/* Lista — mesmo card em desktop e mobile: cada item tem texto longo e ações próprias,
          o que cabe mal numa tabela e quebraria em telas pequenas */}
      <div className="space-y-3">
        {visibleItems.map((item) => {
          const busy = busyId === item.id;
          return (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-900 p-4 md:p-5 rounded-[24px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 font-black">
                    {item.studentName?.trim().charAt(0).toUpperCase() || <UserIcon size={18} />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-slate-800 dark:text-white truncate">{item.studentName ?? 'Aluno'}</p>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                      Faltou em {formatDate(item.date)} · <span className="capitalize">{formatWeekday(item.date)}</span>
                    </p>
                  </div>
                </div>
                <StatusBadge status={item.status} />
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap break-words bg-slate-50 dark:bg-slate-950/40 rounded-2xl p-3">
                {item.reason}
              </p>

              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                Enviada em {formatDateTime(item.createdAt)}
                {item.createdByName ? ` por ${item.createdByName}` : ''}
              </p>

              {item.status !== 'Pending' && (
                <div className="text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2">
                  <p>
                    {item.status === 'Approved' ? 'Aceita' : 'Recusada'}
                    {item.reviewedByName ? ` por ${item.reviewedByName}` : ''}
                    {item.reviewedAt ? ` em ${formatDateTime(item.reviewedAt)}` : ''}
                  </p>
                  {item.reviewNote && <p className="mt-1">Observação: {item.reviewNote}</p>}
                </div>
              )}

              <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                <input
                  type="text"
                  value={notes[item.id] ?? ''}
                  onChange={(e) => setNotes((prev) => ({ ...prev, [item.id]: e.target.value }))}
                  maxLength={500}
                  placeholder="Observação para o aluno (opcional)"
                  className={inputClass}
                />
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => handleReview(item, 'Approved')}
                    disabled={busy || item.status === 'Approved'}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all"
                  >
                    <CheckCircle2 size={14} />
                    Aceitar e conceder presença
                  </button>
                  <button
                    onClick={() => setPendingReject(item)}
                    disabled={busy || item.status === 'Rejected'}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-red-400 hover:text-red-600 disabled:opacity-40 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all"
                  >
                    <XCircle size={14} />
                    Recusar
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {!loading && visibleItems.length === 0 && (
          <div className="py-16 text-center bg-white dark:bg-slate-900/50 rounded-[24px] border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
            <FileText size={56} className="mx-auto mb-3 opacity-10" />
            <h3 className="font-bold text-slate-500">Nenhuma justificativa encontrada</h3>
            <p className="text-sm mt-1">
              {statusFilter === 'Pending' ? 'Não há pedidos aguardando análise.' : 'Ajuste os filtros para ver outros registros.'}
            </p>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 px-1 py-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">Página {page} de {totalPages}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-40 hover:border-indigo-500 transition-all"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-40 hover:border-indigo-500 transition-all"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!pendingReject}
        onClose={() => setPendingReject(null)}
        onConfirm={() => pendingReject && handleReview(pendingReject, 'Rejected')}
        title="Recusar justificativa?"
        message={
          pendingReject?.status === 'Approved'
            ? 'Esta justificativa já havia sido aceita: a presença concedida será removida e os contadores do aluno voltarão ao valor anterior.'
            : 'O aluno continuará sem presença neste dia. Ele poderá excluir a justificativa recusada e enviar outra.'
        }
        confirmLabel="Sim, Recusar"
      />
    </div>
  );
};

// ── View ─────────────────────────────────────────────────────────────────────

const AbsenceJustificationsView: React.FC<{ academy: Academy; user: User }> = ({ academy, user }) => {
  const { profiles, activeProfileId } = useProfileStore();
  const activeProfile = getActiveProfile(profiles, activeProfileId);
  const isViewingDependent = activeProfile?.kind === 'guardian' && activeProfile.entityType === 'student';

  const canReview = REVIEWER_ROLES.includes(user.role);
  // Conta de aluno, de responsável, ou qualquer conta que esteja gerenciando um dependente aluno
  const canSubmit = user.role === 'student' || user.role === 'guardian' || isViewingDependent;

  return (
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-6 pb-20 animate-in fade-in duration-500">
      <header>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <FileText size={24} className="text-indigo-600" />
          Justificativas de Falta
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {canReview
            ? 'Analise os pedidos dos alunos. Ao aceitar, a presença do dia é concedida automaticamente.'
            : 'Registre o motivo da sua falta e acompanhe a análise do professor.'}
        </p>
      </header>

      {canReview && <ReviewPanel academy={academy} />}

      {canSubmit && (
        <StudentPanel
          academy={academy}
          studentId={isViewingDependent ? activeProfile!.entityId : undefined}
          dependentName={isViewingDependent ? activeProfile!.name : undefined}
        />
      )}
    </div>
  );
};

export default AbsenceJustificationsView;
