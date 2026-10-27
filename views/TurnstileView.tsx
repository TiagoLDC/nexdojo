import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  DoorOpen, Search, RefreshCw, KeyRound, Plus, Trash2, Power, Wifi, WifiOff, Clock, ShieldOff,
  Unlock, Lock, Loader2, AlertTriangle, Camera, CheckCircle2, Save, Monitor, Copy,
} from 'lucide-react';
import type { Academy, User } from '../src/types';
import {
  turnstileService, TURNSTILE_EVENT_LABELS,
  type TurnstileCredential, type TurnstileEvent, type TurnstilePerson, type TurnstileSettings,
} from '@/features/turnstile/services/turnstileService';
import { useTranslation } from '../services/LanguageContext';
import { Spinner, Modal, ConfirmDialog } from '@/components/ui';

type PeopleFilter = 'all' | 'blocked' | 'released' | 'problem' | 'staff';

const TYPE_LABEL: Record<TurnstilePerson['type'], string> = { student: 'Aluno', instructor: 'Instrutor', staff: 'Colaborador' };
const SYNC_LABEL: Record<string, string> = {
  synced: 'Na catraca', no_photo: 'Sem foto', photo_rejected: 'Foto recusada', error: 'Erro',
};

const errorMessage = (e: unknown, fallback: string): string =>
  (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? fallback;

const formatDateTime = (iso: string | null | undefined): string =>
  iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';

const minutesAgo = (iso: string | null): number | null =>
  iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 60000) : null;

const describeAgo = (min: number | null): string => {
  if (min === null) return 'nunca conectou';
  if (min < 1) return 'agora há pouco';
  if (min < 60) return `há ${min} min`;
  if (min < 60 * 48) return `há ${Math.floor(min / 60)} h`;
  return `há ${Math.floor(min / 1440)} dias`;
};

const generatePassword = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint32Array(14));
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
};

const card = 'bg-white dark:bg-slate-900 rounded-[28px] sm:rounded-[36px] border border-slate-100 dark:border-slate-800 p-4 sm:p-6 shadow-sm';
const sectionTitle = 'text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2';
const inputCls = 'w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl py-3 px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white';
const btnPrimary = 'flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50';
const btnGhost = 'flex items-center justify-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-300 px-3 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50';

const TurnstileView: React.FC<{ academy: Academy; user: User }> = ({ academy }) => {
  const { showNotification } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [settings, setSettings] = useState<TurnstileSettings>({ graceDays: 0, alertMinutes: 15 });
  const [settingsDraft, setSettingsDraft] = useState<TurnstileSettings>({ graceDays: 0, alertMinutes: 15 });
  const [savingSettings, setSavingSettings] = useState(false);
  const [credentials, setCredentials] = useState<TurnstileCredential[]>([]);
  const [people, setPeople] = useState<TurnstilePerson[]>([]);
  const [events, setEvents] = useState<TurnstileEvent[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<PeopleFilter>('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  // Modais de credencial
  const [credModal, setCredModal] = useState<{ mode: 'create' | 'password'; credential?: TurnstileCredential } | null>(null);
  const [credForm, setCredForm] = useState({ username: '', password: '', label: '' });
  // Depois de salvar, a janela mostra o que FOI GRAVADO e só fecha com a confirmação de que foi
  // anotado. A senha só existe aqui: no banco fica o hash, e não há como recuperá-la depois.
  const [credSaved, setCredSaved] = useState<{ username: string; password: string } | null>(null);
  const [savingCred, setSavingCred] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TurnstileCredential | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const [overview, peopleList, eventList] = await Promise.all([
        turnstileService.getOverview(),
        turnstileService.getPeople(),
        turnstileService.getEvents(100),
      ]);
      setSettings(overview.settings);
      setCredentials(overview.credentials);
      setPeople(peopleList);
      setEvents(eventList);
      return overview.settings;
    } catch (e) {
      console.error(e);
      if (!silent) showNotification(errorMessage(e, 'Erro ao carregar os dados da catraca.'), 'error');
      return null;
    } finally {
      setRefreshing(false);
      setIsLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    load().then((s) => { if (s) setSettingsDraft(s); });
    // Atualiza sozinho: o status do middleware e as passagens mudam o tempo todo.
    const timer = window.setInterval(() => load(true), 30_000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [academy?.id]);

  const activeCredentials = credentials.filter((c) => c.active);

  const summary = useMemo(() => ({
    all: people.length,
    blocked: people.filter((p) => p.status === 'blocked').length,
    released: people.filter((p) => p.releasedUntil).length,
    problem: people.filter((p) => !!p.photoProblem || p.devices.some((d) => d.state !== 'synced')).length,
    staff: people.filter((p) => p.type !== 'student').length,
  }), [people]);

  const filteredPeople = useMemo(() => {
    const term = search.trim().toLowerCase();
    return people
      .filter((p) => {
        if (filter === 'blocked') return p.status === 'blocked';
        if (filter === 'released') return !!p.releasedUntil;
        if (filter === 'problem') return !!p.photoProblem || p.devices.some((d) => d.state !== 'synced');
        if (filter === 'staff') return p.type !== 'student';
        return true;
      })
      .filter((p) => !term || p.name.toLowerCase().includes(term));
  }, [people, filter, search]);

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      const saved = await turnstileService.updateSettings(settingsDraft);
      setSettings(saved);
      setSettingsDraft(saved);
      showNotification('Configurações da catraca salvas. O middleware aplica na próxima sincronização.');
      load(true);
    } catch (e) {
      showNotification(errorMessage(e, 'Erro ao salvar as configurações.'), 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const openCreate = () => {
    // Senha vazia de propósito: uma senha sorteada que o usuário não pediu se confunde com a
    // que ele anotou (foi assim que uma credencial do QAS ficou com senha diferente da anotada).
    setCredForm({ username: `catraca.${(academy?.alias || 'academia').toLowerCase().replace(/[^a-z0-9]/g, '')}`, password: '', label: 'PC da recepção' });
    setCredSaved(null);
    setCredModal({ mode: 'create' });
  };

  const submitCredential = async () => {
    if (!credModal) return;
    setSavingCred(true);
    try {
      // Os valores exibidos no resumo são exatamente os enviados nesta chamada.
      const enviado = { username: credForm.username.trim(), password: credForm.password };
      if (credModal.mode === 'create') {
        await turnstileService.createCredential({ ...enviado, label: credForm.label.trim() || undefined });
      } else if (credModal.credential) {
        await turnstileService.updateCredential(credModal.credential.id, { password: enviado.password });
      }
      setCredSaved(enviado);
      load(true);
    } catch (e) {
      showNotification(errorMessage(e, 'Erro ao salvar a credencial.'), 'error');
    } finally {
      setSavingCred(false);
    }
  };

  const toggleCredential = async (c: TurnstileCredential) => {
    setBusyId(c.id);
    try {
      await turnstileService.updateCredential(c.id, { active: !c.active });
      showNotification(c.active ? 'Credencial desativada: o middleware perde o acesso imediatamente.' : 'Credencial reativada.');
      load(true);
    } catch (e) {
      showNotification(errorMessage(e, 'Erro ao alterar a credencial.'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      await turnstileService.deleteCredential(deleteTarget.id);
      showNotification('Credencial excluída.', 'delete');
      setDeleteTarget(null);
      load(true);
    } catch (e) {
      showNotification(errorMessage(e, 'Erro ao excluir a credencial.'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const release = async (p: TurnstilePerson) => {
    setBusyId(p.id);
    try {
      await turnstileService.release(p.type, p.id, 24);
      showNotification(`${p.name} liberado na catraca por 24 horas.`);
      load(true);
    } catch (e) {
      showNotification(errorMessage(e, 'Erro ao liberar o acesso.'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const revoke = async (p: TurnstilePerson) => {
    if (!p.releaseId) return;
    setBusyId(p.id);
    try {
      await turnstileService.revokeRelease(p.releaseId);
      showNotification(`Liberação de ${p.name} encerrada.`);
      load(true);
    } catch (e) {
      showNotification(errorMessage(e, 'Erro ao encerrar a liberação.'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const copy = (text: string) => {
    navigator.clipboard?.writeText(text).then(() => showNotification('Copiado.', 'info')).catch(() => {});
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[300px]">
        <Spinner size="lg" className="text-indigo-500" />
      </div>
    );
  }

  const filters: { key: PeopleFilter; label: string; count: number }[] = [
    { key: 'all', label: 'Todos', count: summary.all },
    { key: 'blocked', label: 'Bloqueados', count: summary.blocked },
    { key: 'released', label: 'Liberados por 24h', count: summary.released },
    { key: 'problem', label: 'Com problema', count: summary.problem },
    { key: 'staff', label: 'Equipe', count: summary.staff },
  ];

  const settingsDirty = settingsDraft.graceDays !== settings.graceDays || settingsDraft.alertMinutes !== settings.alertMinutes;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto space-y-6 pb-16 p-2">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-800 dark:text-white tracking-tighter uppercase italic leading-none flex items-center gap-3">
            <DoorOpen size={28} className="text-indigo-600" />
            Catraca
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold mt-2 uppercase text-[10px] tracking-[0.2em]">{academy?.name}</p>
        </div>
        <button type="button" onClick={() => load()} disabled={refreshing} className={btnGhost}>
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </header>

      {/* Middleware */}
      <section className={`${card} mx-2`}>
        <h2 className={sectionTitle}><Monitor size={14} /> Middleware NexDojo-Catraca</h2>
        {activeCredentials.length === 0 ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-3xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30">
            <p className="text-sm font-bold text-amber-700 dark:text-amber-400">
              Nenhuma credencial ativa. Crie o usuário e a senha que o NexDojo-Catraca vai usar para se conectar.
            </p>
            <button type="button" onClick={openCreate} className={btnPrimary}><Plus size={14} /> Criar credencial</button>
          </div>
        ) : (
          <div className="space-y-3">
            {activeCredentials.map((c) => {
              const min = minutesAgo(c.lastSeenAt);
              const stale = min === null || min >= settings.alertMinutes;
              return (
                <div key={c.id} className={`p-4 rounded-3xl border ${stale
                  ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30'
                  : 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30'}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-black text-slate-800 dark:text-white text-sm uppercase italic truncate">
                        {c.label || c.username}
                        {c.lastStatus?.machineName && <span className="text-slate-400 normal-case not-italic font-bold"> · {c.lastStatus.machineName}</span>}
                      </p>
                      <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${stale ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {stale ? 'Sem contato' : 'Conectado'} · último contato {describeAgo(min)}
                        {c.lastStatus?.appVersion && <span className="text-slate-400"> · v{c.lastStatus.appVersion}</span>}
                      </p>
                    </div>
                  </div>
                  {(c.lastStatus?.devices?.length ?? 0) > 0 && (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {c.lastStatus!.devices.map((d) => (
                        <div key={d.key} className="flex items-start gap-2 bg-white/70 dark:bg-slate-900/60 rounded-2xl p-3">
                          {d.online && !stale
                            ? <Wifi size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                            : <WifiOff size={16} className="text-red-500 shrink-0 mt-0.5" />}
                          <div className="min-w-0">
                            <p className="text-xs font-black text-slate-700 dark:text-slate-200 truncate">{d.name || d.key}</p>
                            <p className="text-[10px] font-bold text-slate-400">
                              {stale ? 'Estado desconhecido (middleware sem contato)' : d.online ? `Online · ${d.usersOnDevice ?? 0} pessoas cadastradas` : 'Catraca não responde'}
                            </p>
                            {d.lastError && !stale && <p className="text-[10px] font-bold text-red-500 break-words">{d.lastError}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mx-2">
        {/* Regras */}
        <section className={card}>
          <h2 className={sectionTitle}><Clock size={14} /> Regras de bloqueio</h2>
          <div className="space-y-4">
            <label className="block">
              <span className="text-xs font-black text-slate-600 dark:text-slate-300">Tolerância após o vencimento (dias)</span>
              <input type="number" min={0} max={60} value={settingsDraft.graceDays}
                onChange={(e) => setSettingsDraft((s) => ({ ...s, graceDays: Math.max(0, Number(e.target.value)) }))}
                className={`${inputCls} mt-1`} />
              <span className="block text-[11px] font-bold text-slate-400 mt-1">
                {settingsDraft.graceDays === 0
                  ? 'Bloqueia no dia seguinte ao vencimento.'
                  : `Bloqueia ${settingsDraft.graceDays + 1} dias depois do vencimento.`} Plano gratuito nunca bloqueia.
              </span>
            </label>
            <label className="block">
              <span className="text-xs font-black text-slate-600 dark:text-slate-300">Avisar quando o middleware ficar sem contato por (minutos)</span>
              <input type="number" min={5} max={1440} value={settingsDraft.alertMinutes}
                onChange={(e) => setSettingsDraft((s) => ({ ...s, alertMinutes: Number(e.target.value) }))}
                className={`${inputCls} mt-1`} />
            </label>
            <button type="button" onClick={saveSettings} disabled={!settingsDirty || savingSettings} className={`${btnPrimary} w-full`}>
              {savingSettings ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Salvar regras
            </button>
          </div>
        </section>

        {/* Credenciais */}
        <section className={card}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`${sectionTitle} mb-0`}><KeyRound size={14} /> Credenciais de integração</h2>
            <button type="button" onClick={openCreate} className={btnGhost}><Plus size={14} /> Nova</button>
          </div>
          {credentials.length === 0 ? (
            <p className="text-sm text-slate-400 italic">Nenhuma credencial criada.</p>
          ) : (
            <div className="space-y-2">
              {credentials.map((c) => (
                <div key={c.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-slate-700 dark:text-slate-200 truncate">{c.username}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {c.label || 'Sem descrição'} · {c.active ? 'Ativa' : 'Desativada'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button type="button" title="Trocar senha" className={btnGhost}
                      onClick={() => { setCredForm({ username: c.username, password: '', label: c.label ?? '' }); setCredSaved(null); setCredModal({ mode: 'password', credential: c }); }}>
                      <KeyRound size={13} />
                    </button>
                    <button type="button" title={c.active ? 'Desativar' : 'Reativar'} disabled={busyId === c.id} className={btnGhost} onClick={() => toggleCredential(c)}>
                      <Power size={13} className={c.active ? 'text-emerald-500' : 'text-slate-400'} />
                    </button>
                    <button type="button" title="Excluir" className={btnGhost} onClick={() => setDeleteTarget(c)}>
                      <Trash2 size={13} className="text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Pessoas */}
      <section className={`${card} mx-2`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className={`${sectionTitle} mb-0`}><DoorOpen size={14} /> Quem está na catraca</h2>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input type="text" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl py-2.5 pl-10 pr-4 text-[11px] font-bold outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-3">
          {filters.map((f) => (
            <button key={f.key} type="button" onClick={() => setFilter(f.key)}
              className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${filter === f.key
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-indigo-200'}`}>
              {f.label}
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${filter === f.key ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800'}`}>{f.count}</span>
            </button>
          ))}
        </div>
        {filteredPeople.length === 0 ? (
          <div className="text-center py-12 text-slate-400 italic text-sm">Ninguém neste filtro.</div>
        ) : (
          <div className="space-y-2">
            {filteredPeople.map((p) => {
              const canRelease = p.status === 'blocked' && p.overdue && !p.accessBlocked;
              return (
                <div key={`${p.type}-${p.id}`} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-3xl border ${p.status === 'blocked'
                  ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30'
                  : p.releasedUntil
                    ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800'}`}>
                  <div className="min-w-0">
                    <p className="font-black text-slate-800 dark:text-white text-sm uppercase italic truncate leading-none">{p.name}</p>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{TYPE_LABEL[p.type]}</span>
                      {p.status === 'blocked' ? (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                          {p.accessBlocked ? <ShieldOff size={10} /> : <Lock size={10} />} Bloqueado
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 size={10} /> Liberado
                        </span>
                      )}
                      {p.devices.map((d) => (
                        <span key={d.deviceKey} title={d.message ?? undefined}
                          className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${d.state === 'synced'
                            ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                            : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'}`}>
                          <Camera size={10} /> {d.deviceName || 'Catraca'}: {SYNC_LABEL[d.state] ?? d.state}
                        </span>
                      ))}
                      {p.devices.length === 0 && activeCredentials.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-400">Aguardando sincronização</span>
                      )}
                    </div>
                    {p.reason && <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-1">{p.reason}</p>}
                    {p.photoProblem && (
                      <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 mt-0.5 flex items-center gap-1">
                        <Camera size={11} /> {p.photoProblem}
                      </p>
                    )}
                    {p.devices.filter((d) => d.state !== 'synced' && d.message).map((d) => (
                      <p key={d.deviceKey} className="text-[11px] font-bold text-amber-600 dark:text-amber-400 mt-0.5 flex items-center gap-1">
                        <AlertTriangle size={11} /> {d.message}
                      </p>
                    ))}
                  </div>
                  <div className="shrink-0 flex items-center gap-2 sm:ml-auto">
                    {canRelease && (
                      <button type="button" onClick={() => release(p)} disabled={busyId === p.id} className={btnPrimary}
                        title="Libera a passagem na catraca por 24 horas, mesmo com a mensalidade vencida">
                        {busyId === p.id ? <Loader2 size={14} className="animate-spin" /> : <Unlock size={14} />}
                        Liberar 24h
                      </button>
                    )}
                    {p.releaseId && (
                      <button type="button" onClick={() => revoke(p)} disabled={busyId === p.id} className={btnGhost}
                        title="Encerra a liberação agora; o bloqueio volta na próxima sincronização">
                        {busyId === p.id ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                        Encerrar liberação
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Passagens */}
      <section className={`${card} mx-2`}>
        <h2 className={sectionTitle}><Clock size={14} /> Últimas passagens</h2>
        {events.length === 0 ? (
          <p className="text-sm text-slate-400 italic">Nenhuma passagem registrada ainda.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {events.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-700 dark:text-slate-200 truncate">{e.personName ?? 'Pessoa não identificada'}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {formatDateTime(e.occurredAt)} · {e.deviceName || e.deviceKey}
                    {e.attendanceRecordId && ' · presença registrada'}
                  </p>
                </div>
                <span className={`shrink-0 px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${e.granted
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
                  {TURNSTILE_EVENT_LABELS[e.event] ?? `Evento ${e.event}`}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <Modal open={!!credModal} onClose={() => { if (!credSaved) setCredModal(null); }} size="md"
        closeOnBackdrop={!credSaved} closeOnEsc={!credSaved}
        title={credSaved
          ? (credModal?.mode === 'create' ? 'Credencial criada' : 'Senha alterada')
          : credModal?.mode === 'create' ? 'Nova credencial de integração' : `Nova senha para ${credModal?.credential?.username}`}
        footer={credSaved ? (
          <div className="flex justify-end">
            <button type="button" className={btnPrimary} onClick={() => { setCredSaved(null); setCredModal(null); }}>
              <CheckCircle2 size={14} /> Já anotei, fechar
            </button>
          </div>
        ) : (
          <div className="flex gap-2 justify-end">
            <button type="button" className={btnGhost} onClick={() => setCredModal(null)}>Cancelar</button>
            <button type="button" className={btnPrimary} onClick={submitCredential} disabled={savingCred || credForm.password.length < 8 || (credModal?.mode === 'create' && credForm.username.trim().length < 3)}>
              {savingCred ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Salvar
            </button>
          </div>
        )}>
        {credSaved ? (
          <div className="space-y-4">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Estes são os dados que foram gravados. Copie e cole no NexDojo-Catraca, em <b>Configurações</b>.
              A senha não poderá ser vista de novo depois que esta janela for fechada.
            </p>
            {([['Usuário', credSaved.username], ['Senha', credSaved.password]] as const).map(([rotulo, valor]) => (
              <div key={rotulo}>
                <span className="text-xs font-black text-slate-600 dark:text-slate-300">{rotulo}</span>
                <div className="flex gap-2 mt-1">
                  <div className={`${inputCls} font-mono select-all break-all`}>{valor}</div>
                  <button type="button" className={`${btnGhost} shrink-0`} title={`Copiar ${rotulo.toLowerCase()}`} onClick={() => copy(valor)}><Copy size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Esta credencial só serve para o NexDojo-Catraca: ela lê nome, foto e status de acesso, e não abre nenhuma outra tela do sistema.
            </p>
            {credModal?.mode === 'create' && (
              <>
                <label className="block">
                  <span className="text-xs font-black text-slate-600 dark:text-slate-300">Usuário</span>
                  <input className={`${inputCls} mt-1`} value={credForm.username}
                    onChange={(e) => setCredForm((f) => ({ ...f, username: e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, '') }))} />
                </label>
                <label className="block">
                  <span className="text-xs font-black text-slate-600 dark:text-slate-300">Descrição</span>
                  <input className={`${inputCls} mt-1`} value={credForm.label} placeholder="Ex.: PC da recepção"
                    onChange={(e) => setCredForm((f) => ({ ...f, label: e.target.value }))} />
                </label>
              </>
            )}
            <label className="block">
              <span className="text-xs font-black text-slate-600 dark:text-slate-300">Senha</span>
              <div className="flex gap-2 mt-1">
                <input className={`${inputCls} font-mono`} value={credForm.password} placeholder="Digite ou clique em Gerar senha"
                  autoComplete="off" spellCheck={false}
                  onChange={(e) => setCredForm((f) => ({ ...f, password: e.target.value }))} />
                <button type="button" className={`${btnGhost} shrink-0`} onClick={() => setCredForm((f) => ({ ...f, password: generatePassword() }))}>
                  <RefreshCw size={14} /> Gerar senha
                </button>
              </div>
              <span className="block text-[11px] font-bold text-slate-400 mt-1">Mínimo de 8 caracteres. Depois de salvar, a senha aparece para você copiar.</span>
            </label>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={busyId === deleteTarget?.id}
        title="Excluir credencial"
        message={<>O middleware que usa <b>{deleteTarget?.username}</b> perde o acesso imediatamente e a catraca para de ser atualizada. As pessoas continuam cadastradas nela com o último status recebido.</>}
        confirmLabel="Excluir"
        variant="danger"
      />
    </motion.div>
  );
};

export default TurnstileView;
