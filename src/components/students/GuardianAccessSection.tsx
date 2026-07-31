import React, { useEffect, useState } from 'react';
import { UserCheck, Link2, Copy, Trash2, Loader2, CheckCircle2 } from 'lucide-react';
import { guardianService, type StudentGuardian } from '@/features/students/services/guardianService';

interface GuardianAccessSectionProps {
  studentId: string;
  onNotify: (message: string, type?: 'success' | 'error' | 'delete' | 'info') => void;
}

export const GuardianAccessSection: React.FC<GuardianAccessSectionProps> = ({ studentId, onNotify }) => {
  const [guardians, setGuardians] = useState<StudentGuardian[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkEmail, setLinkEmail] = useState('');
  const [linking, setLinking] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [invitingLink, setInvitingLink] = useState(false);
  const [inviteLink, setInviteLink] = useState('');

  const load = () => {
    setLoading(true);
    guardianService.list(studentId)
      .then(setGuardians)
      .catch(() => setGuardians([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [studentId]);

  const handleGenerateInvite = async () => {
    setInvitingLink(true);
    try {
      const { inviteLink } = await guardianService.createInvite(studentId);
      setInviteLink(inviteLink);
    } catch (e: any) {
      onNotify(e.response?.data?.error || 'Erro ao gerar convite.', 'error');
    } finally {
      setInvitingLink(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    onNotify('Link copiado!');
  };

  const handleLinkByEmail = async () => {
    if (!linkEmail.trim()) return;
    setLinking(true);
    try {
      await guardianService.linkByEmail(studentId, linkEmail.trim());
      setLinkEmail('');
      onNotify('Responsável vinculado com sucesso!');
      load();
    } catch (e: any) {
      onNotify(e.response?.data?.error || 'Erro ao vincular responsável.', 'error');
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = async (guardianUserId: string) => {
    if (removingId) return;
    setRemovingId(guardianUserId);
    try {
      await guardianService.unlink(studentId, guardianUserId);
      onNotify('Vínculo removido.');
      load();
    } catch (e: any) {
      onNotify(e.response?.data?.error || 'Erro ao remover vínculo.', 'error');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-4 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900/50">
      <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
        <UserCheck size={14} /> Acesso de Responsável ao Sistema
      </h3>
      <p className="text-xs text-slate-400">
        Permite que um responsável tenha login próprio para gerenciar o perfil deste aluno (pagamento, dados, etc.),
        sem precisar usar o login do aluno.
      </p>

      {/* Lista de responsáveis já vinculados */}
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-slate-400"><Loader2 size={14} className="animate-spin" /> Carregando...</div>
      ) : guardians.length > 0 ? (
        <div className="space-y-2">
          {guardians.map((g) => (
            <div key={g.id} className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-xl px-4 py-2.5 border border-slate-100 dark:border-slate-700">
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{g.name}{g.relation ? ` · ${g.relation}` : ''}</p>
                <p className="text-[10px] text-slate-400 truncate">{g.email}</p>
              </div>
              <button
                onClick={() => handleUnlink(g.userId)}
                disabled={removingId === g.userId}
                className="shrink-0 text-slate-400 hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors p-1.5"
                title="Remover vínculo"
              >
                {removingId === g.userId ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-400 italic">Nenhum responsável com acesso vinculado ainda.</p>
      )}

      {/* Vincular conta já existente por e-mail */}
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          value={linkEmail}
          onChange={(e) => setLinkEmail(e.target.value)}
          placeholder="E-mail de uma conta já cadastrada"
          className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="button"
          onClick={handleLinkByEmail}
          disabled={linking || !linkEmail.trim()}
          className="shrink-0 flex items-center justify-center gap-1.5 bg-slate-700 hover:bg-slate-800 disabled:opacity-50 text-white text-[11px] font-black uppercase px-4 py-2.5 rounded-xl transition-colors"
        >
          {linking ? <Loader2 size={13} className="animate-spin" /> : <Link2 size={13} />} Vincular
        </button>
      </div>

      {/* Convite para quem ainda não tem conta */}
      {!inviteLink ? (
        <button
          type="button"
          onClick={handleGenerateInvite}
          disabled={invitingLink}
          className="w-full flex items-center justify-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 disabled:opacity-50 text-indigo-600 text-[11px] font-black uppercase px-4 py-3 rounded-xl transition-colors"
        >
          {invitingLink ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
          Gerar Link de Convite (para quem ainda não tem cadastro)
        </button>
      ) : (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-3 flex items-center gap-2">
          <CheckCircle2 size={16} className="text-indigo-600 shrink-0" />
          <input
            readOnly
            value={inviteLink}
            className="flex-1 bg-transparent text-[11px] font-medium text-indigo-700 dark:text-indigo-300 outline-none truncate"
          />
          <button onClick={handleCopyLink} className="shrink-0 text-indigo-600 hover:text-indigo-800 p-1.5" title="Copiar link">
            <Copy size={14} />
          </button>
        </div>
      )}
    </div>
  );
};
