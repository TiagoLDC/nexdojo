import React, { useEffect, useState } from 'react';
import { Academy, User } from '../types';
import type { Announcement } from '@/types';
import { announcementService } from '@/features/announcements/services/announcementService';
import { useAcademyBeltRanks } from '@/features/settings/hooks/useAcademyBeltRanks';
import { Button, Card, ConfirmDialog, EmptyState, Spinner } from '@/components/ui';
import { Megaphone, Send, Trash2, Users as UsersIcon, CheckCircle2 } from 'lucide-react';

interface AnnouncementsViewProps {
  academy: Academy;
  user: User;
}

const AnnouncementsView: React.FC<AnnouncementsViewProps> = ({ academy }) => {
  const { beltRanks } = useAcademyBeltRanks(academy.id);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [scope, setScope] = useState<'all' | 'belts'>('all');
  const [selectedBeltIds, setSelectedBeltIds] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [formError, setFormError] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const loadAnnouncements = () => {
    setIsLoading(true);
    announcementService.getAll(academy.id, { limit: 50 })
      .then((res) => setAnnouncements(res.data))
      .catch(() => setFormError('Erro ao carregar comunicados enviados.'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadAnnouncements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [academy.id]);

  const toggleBelt = (id: string) => {
    setSelectedBeltIds((prev) => (prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!title.trim() || !content.trim()) {
      setFormError('Preencha o título e a mensagem do comunicado.');
      return;
    }
    if (scope === 'belts' && selectedBeltIds.length === 0) {
      setFormError('Selecione ao menos uma faixa, ou escolha "Todos".');
      return;
    }

    setIsSending(true);
    try {
      await announcementService.create(academy.id, {
        title: title.trim(),
        content: content.trim(),
        beltRankIds: scope === 'belts' ? selectedBeltIds : [],
      });
      // Recarrega a lista (em vez de só inserir o retorno do create) para trazer os
      // campos calculados no GET (beltRanks, readCount, totalRecipients), ausentes no POST.
      loadAnnouncements();
      setTitle('');
      setContent('');
      setScope('all');
      setSelectedBeltIds([]);
    } catch {
      setFormError('Falha ao enviar o comunicado. Tente novamente.');
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    setPendingDeleteId(null);
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    try {
      await announcementService.delete(id);
    } catch {
      loadAnnouncements();
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10 p-2">
      <header className="flex items-center gap-3 px-2">
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 p-2.5 rounded-2xl text-white shadow-lg shadow-indigo-600/20">
          <Megaphone size={20} />
        </div>
        <div>
          <h1 className="text-lg font-black text-slate-800 dark:text-white tracking-tight uppercase italic">Comunicados</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-0.5">
            Envie avisos para todos ou para faixas específicas
          </p>
        </div>
      </header>

      <Card padding="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Título</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={255}
              placeholder="Ex: Aula cancelada nesta sexta-feira"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Mensagem</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={5000}
              rows={4}
              placeholder="Escreva o comunicado..."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-sm px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Destinatários</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setScope('all')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors ${
                  scope === 'all'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setScope('belts')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors ${
                  scope === 'belts'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                Faixas específicas
              </button>
            </div>

            {scope === 'belts' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-700">
                {beltRanks.map((b) => (
                  <label key={b.id} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedBeltIds.includes(b.id)}
                      onChange={() => toggleBelt(b.id)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    {b.name}
                  </label>
                ))}
                {beltRanks.length === 0 && (
                  <p className="col-span-full text-xs text-slate-400">Nenhuma faixa cadastrada para esta academia.</p>
                )}
              </div>
            )}
          </div>

          {formError && <p className="text-xs font-bold text-red-500">{formError}</p>}

          <Button type="submit" loading={isSending} icon={<Send size={16} />}>
            Enviar Comunicado
          </Button>
        </form>
      </Card>

      <div>
        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 px-2">Enviados</h2>

        {isLoading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : announcements.length === 0 ? (
          <EmptyState icon={<Megaphone size={28} />} title="Nenhum comunicado enviado ainda" />
        ) : (
          <div className="space-y-3">
            {announcements.map((a) => (
              <Card key={a.id} padding="md">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 dark:text-white truncate">{a.title}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 whitespace-pre-wrap break-words">{a.content}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide px-2 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400">
                        <UsersIcon size={11} />
                        {a.targetAll ? 'Todos' : (a.beltRanks?.map((b) => b.name).join(', ') || 'Faixas específicas')}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 size={11} />
                        {a.readCount ?? 0} de {a.totalRecipients ?? 0} leram
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {formatDate(a.createdAt)}{a.createdByName ? ` · ${a.createdByName}` : ''}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setPendingDeleteId(a.id)}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
                    aria-label="Excluir comunicado"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!pendingDeleteId}
        onClose={() => setPendingDeleteId(null)}
        onConfirm={() => pendingDeleteId && handleDelete(pendingDeleteId)}
        title="Excluir Comunicado?"
        message="O comunicado será removido e deixará de aparecer para quem ainda não leu."
        confirmLabel="Sim, Excluir"
      />
    </div>
  );
};

export default AnnouncementsView;
