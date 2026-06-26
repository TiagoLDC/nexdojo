
import React, { useState, useEffect, useRef } from 'react';
import { Staff, Academy, User } from '../types';
import { staffService } from '@/features/staff/services/staffService';
import { useTranslation } from '../services/LanguageContext';
import { fetchAddressByCep, maskCEP, maskPhone } from '../services/cep';
import { DateSelectInput, ConfirmDialog } from '@/components/ui';
import {
  UserPlus,
  Search,
  MoreVertical,
  X,
  Trash2,
  Upload,
  Filter,
  User as UserIcon,
  Loader2,
  Copy,
  Check,
  MessageCircle,
  Link2,
  CheckCircle2,
} from 'lucide-react';

const compressImage = (base64Str: string, maxWidth = 400, maxHeight = 400): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width, height = img.height;
      if (width > height) { if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; } }
      else { if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; } }
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
  });
};

const statusLabel: Record<string, { label: string; cls: string }> = {
  Active:      { label: 'Ativo',        cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  Inactive:    { label: 'Inativo',      cls: 'bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400' },
  Pending:     { label: 'Pendente',     cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  PreCadastro: { label: 'Pré Cadastro', cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
  Dropped:     { label: 'Inativo',      cls: 'bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400' },
};

interface StaffWithInvite extends Staff {
  inviteLink?: string;
}

const StaffView: React.FC<{ academy: Academy; user: User }> = ({ academy }) => {
  const { showNotification } = useTranslation();
  const [staff, setStaff] = useState<StaffWithInvite[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const editPhotoInputRef = useRef<HTMLInputElement>(null);
  const [editingStaff, setEditingStaff] = useState<StaffWithInvite | null>(null);
  const [isLoadingCep, setIsLoadingCep] = useState(false);

  // Estado para novo pré-cadastro (formulário simplificado)
  const [newName, setNewName] = useState('');
  const [newWhatsapp, setNewWhatsapp] = useState('');
  const [newPosition, setNewPosition] = useState('');
  const [savingNew, setSavingNew] = useState(false);

  const loadStaff = () => {
    if (academy) {
      staffService.getAll(academy.id).then((res) => {
        setStaff(Array.isArray(res.data) ? res.data as any[] : []);
      }).catch(() => setStaff([]));
    }
  };

  useEffect(() => { loadStaff(); }, [academy]);

  const handleCopyLink = (link: string, id: string) => {
    navigator.clipboard.writeText(link).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleWhatsApp = (whatsapp: string, link: string, name: string) => {
    const digits = whatsapp.replace(/\D/g, '');
    const num = digits.startsWith('55') ? digits : `55${digits}`;
    const msg = encodeURIComponent(
      `Olá ${name}! Você foi convidado(a) para se cadastrar como colaborador. Acesse o link: ${link}`
    );
    window.open(`https://wa.me/${num}?text=${msg}`, '_blank');
  };

  const handleOpenNew = () => {
    setNewName('');
    setNewWhatsapp('');
    setNewPosition('');
    setIsNewModalOpen(true);
  };

  const handleSaveNew = async () => {
    if (!newName.trim()) { showNotification('Nome é obrigatório.', 'error'); return; }
    setSavingNew(true);
    try {
      const created = await staffService.create(academy.id, {
        name: newName.trim(),
        whatsapp: newWhatsapp || undefined,
        position: newPosition || undefined,
      });
      setStaff(prev => [...prev, created as any]);
      setIsNewModalOpen(false);
      showNotification('Pré-cadastro criado! Link de convite gerado.');
    } catch {
      showNotification('Erro ao criar colaborador.', 'error');
    } finally {
      setSavingNew(false);
    }
  };

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingStaff) return;
    const value = maskCEP(e.target.value);
    setEditingStaff({ ...editingStaff, cep: value });
    if (value.replace(/\D/g, '').length === 8) {
      setIsLoadingCep(true);
      const addressData = await fetchAddressByCep(value);
      if (addressData) setEditingStaff(prev => prev ? { ...prev, address: addressData.fullAddress } : null);
      setIsLoadingCep(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingStaff) return;
    try {
      // Não enviar status 'PreCadastro' no payload — esse estado é gerenciado pelo fluxo de convite
      const statusToSend = editingStaff.status === 'PreCadastro' ? undefined : editingStaff.status;
      const updated = await staffService.update(editingStaff.id, {
        academyId: academy.id,
        name: editingStaff.name,
        birthDate: editingStaff.birthDate,
        ...(statusToSend ? { status: statusToSend } : {}),
        joinDate: editingStaff.joinDate,
        photo: editingStaff.photo,
        phone: editingStaff.phone,
        whatsapp: (editingStaff as any).whatsapp,
        email: editingStaff.email,
        cpf: editingStaff.cpf,
        rg: editingStaff.rg,
        address: editingStaff.address,
        cep: editingStaff.cep,
        medicalNotes: editingStaff.medicalNotes,
        position: editingStaff.position,
      } as any);
      const u = updated as any;
      setStaff(prev => prev.map(s => s.id === u.id ? { ...s, ...u } : s));
      setIsEditModalOpen(false);
      setEditingStaff(null);
      showNotification('Colaborador atualizado!');
    } catch {
      showNotification('Erro ao salvar.', 'error');
    }
  };

  const handleApprove = async (member: StaffWithInvite) => {
    try {
      const updated = await staffService.update(member.id, { status: 'Active', academyId: academy.id } as any);
      const u = updated as any;
      setStaff(prev => prev.map(s => s.id === member.id ? { ...s, ...u } : s));
      showNotification(`${member.name} aprovado(a)!`);
    } catch (e: any) {
      const msg = e?.response?.data?.error || 'Erro ao aprovar colaborador.';
      showNotification(msg, 'error');
    }
  };

  const handleDeleteStaff = async () => {
    if (!editingStaff) return;
    try {
      await staffService.delete(editingStaff.id);
      setStaff(prev => prev.filter(s => s.id !== editingStaff.id));
      setIsDeleteModalOpen(false);
      setIsEditModalOpen(false);
      setEditingStaff(null);
      showNotification('Colaborador removido.', 'delete');
    } catch {
      showNotification('Erro ao remover colaborador.', 'error');
    }
  };

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingStaff) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const compressed = await compressImage(reader.result as string);
      setEditingStaff({ ...editingStaff, photo: compressed });
    };
    reader.readAsDataURL(file);
  };

  const filtered = staff.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase());
    if (statusFilter === 'All') return matchesSearch;
    return matchesSearch && s.status === statusFilter;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 relative">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white">Equipe Administrativa (Staff)</h1>
          <p className="text-slate-500 dark:text-slate-400">Gerencie os colaboradores da sua unidade.</p>
        </div>
        <button
          onClick={handleOpenNew}
          className="bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all"
        >
          <UserPlus size={20} />
          Novo Colaborador
        </button>
      </header>

      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl pl-12 pr-4 py-4 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 shadow-sm w-fit">
          <Filter size={14} className="text-slate-400" />
          <span className="text-xs font-bold text-slate-400 uppercase">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-bold text-slate-700 dark:text-slate-300 outline-none bg-transparent"
          >
            <option value="All">Todos</option>
            <option value="PreCadastro">Pré Cadastro</option>
            <option value="Pending">Pendentes</option>
            <option value="Active">Ativos</option>
            <option value="Inactive">Inativos</option>
          </select>
        </div>
      </div>

      {/* Tabela desktop */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[640px]">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Colaborador</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Cargo</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Convite / Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map(member => {
                const st = statusLabel[member.status] ?? statusLabel.Inactive;
                return (
                  <tr key={member.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        {member.photo ? (
                          <img src={member.photo} className="w-10 h-10 rounded-xl object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                            <UserIcon size={20} />
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-slate-800 dark:text-white uppercase italic text-sm">{member.name}</div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase">{member.email || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{member.position || 'Geral'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] px-2 py-1 rounded-full font-black uppercase ${st.cls}`}>{st.label}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Botão de aprovação para Pendentes */}
                        {member.status === 'Pending' && (
                          <button
                            onClick={() => handleApprove(member)}
                            title="Aprovar colaborador"
                            className="text-green-500 hover:text-green-700 p-2 rounded-xl hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                          >
                            <CheckCircle2 size={18} />
                          </button>
                        )}
                        {/* Botões de convite — apenas enquanto não for Ativo */}
                        {member.inviteLink && member.status !== 'Active' && member.whatsapp && (
                          <button
                            onClick={() => handleWhatsApp(member.whatsapp!, member.inviteLink!, member.name)}
                            title="Enviar convite via WhatsApp"
                            className="text-green-500 hover:text-green-700 p-2 rounded-xl hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                          >
                            <MessageCircle size={18} />
                          </button>
                        )}
                        {member.inviteLink && member.status !== 'Active' && (
                          <button
                            onClick={() => handleCopyLink(member.inviteLink!, member.id)}
                            title="Copiar link de convite"
                            className="text-indigo-500 hover:text-indigo-700 p-2 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                          >
                            {copiedId === member.id ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                          </button>
                        )}
                        {/* Botão de edição */}
                        <button
                          onClick={() => { setEditingStaff({ ...member }); setIsEditModalOpen(true); }}
                          className="text-slate-400 hover:text-indigo-600 p-2"
                        >
                          <MoreVertical size={20} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400 text-sm italic">Nenhum colaborador encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cards mobile */}
      <div className="md:hidden space-y-3">
        {filtered.map(member => {
          const st = statusLabel[member.status] ?? statusLabel.Inactive;
          return (
            <div key={member.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4">
              <div className="flex items-center gap-3 mb-3">
                {member.photo ? (
                  <img src={member.photo} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 flex-shrink-0">
                    <UserIcon size={20} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-800 dark:text-white uppercase italic text-sm truncate">{member.name}</div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase truncate">{member.position || 'Geral'}</div>
                </div>
                <span className={`text-[10px] px-2 py-1 rounded-full font-black uppercase flex-shrink-0 ${st.cls}`}>{st.label}</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {member.status === 'Pending' && (
                  <button
                    onClick={() => handleApprove(member)}
                    className="flex items-center gap-1.5 text-xs font-bold text-green-600 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-xl"
                  >
                    <CheckCircle2 size={14} /> Aprovar
                  </button>
                )}
                {member.inviteLink && member.status !== 'Active' && member.whatsapp && (
                  <button
                    onClick={() => handleWhatsApp(member.whatsapp!, member.inviteLink!, member.name)}
                    className="flex items-center gap-1.5 text-xs font-bold text-green-600 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-xl"
                  >
                    <MessageCircle size={14} /> WhatsApp
                  </button>
                )}
                {member.inviteLink && member.status !== 'Active' && (
                  <button
                    onClick={() => handleCopyLink(member.inviteLink!, member.id)}
                    className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-2 rounded-xl"
                  >
                    {copiedId === member.id ? <><Check size={14} /> Copiado!</> : <><Copy size={14} /> Copiar Link</>}
                  </button>
                )}
                <button
                  onClick={() => { setEditingStaff({ ...member }); setIsEditModalOpen(true); }}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-xl ml-auto"
                >
                  <MoreVertical size={14} /> Editar
                </button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center text-slate-400 text-sm italic py-12">Nenhum colaborador encontrado.</div>
        )}
      </div>

      {/* Modal Novo Pré-Cadastro */}
      {isNewModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] p-6 sm:p-8 animate-in zoom-in duration-300 shadow-2xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-black text-slate-800 dark:text-white uppercase italic">Novo Colaborador</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">Um link de convite será gerado automaticamente.</p>
              </div>
              <button onClick={() => setIsNewModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nome Completo *</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Nome do colaborador"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">WhatsApp (opcional)</label>
                <input
                  type="text"
                  value={newWhatsapp}
                  onChange={e => setNewWhatsapp(maskPhone(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="(00) 00000-0000"
                />
                <p className="text-[10px] text-slate-400 mt-1 ml-1">Se informado, aparecerá botão de envio direto pelo WhatsApp.</p>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Cargo / Função</label>
                <input
                  type="text"
                  value={newPosition}
                  onChange={e => setNewPosition(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ex: Recepção, Limpeza..."
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-6">
              <button
                onClick={handleSaveNew}
                disabled={savingNew}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-black py-4 rounded-2xl shadow-lg shadow-indigo-600/20 active:scale-95 transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-2"
              >
                {savingNew ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
                Criar e Gerar Link
              </button>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold py-4 rounded-2xl active:scale-95 transition-all text-sm uppercase"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edição de colaborador existente */}
      {isEditModalOpen && editingStaff && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[32px] p-6 sm:p-8 animate-in zoom-in duration-300 shadow-2xl border border-slate-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase italic">Editar Ficha</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X size={24} />
              </button>
            </div>

            {/* Link de convite — apenas enquanto não for Ativo */}
            {editingStaff.inviteLink && editingStaff.status !== 'Active' && (
              <div className="mb-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-4">
                <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-2">Link de Convite</p>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={editingStaff.inviteLink}
                    className="flex-1 bg-white dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 rounded-xl px-3 py-2 outline-none min-w-0 truncate"
                  />
                  <button
                    onClick={() => handleCopyLink(editingStaff.inviteLink!, editingStaff.id)}
                    className="text-indigo-500 hover:text-indigo-700 p-2 flex-shrink-0"
                    title="Copiar link"
                  >
                    {copiedId === editingStaff.id ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
            )}

            {/* Status para aprovar Pendente */}
            {editingStaff.status === 'Pending' && (
              <div className="mb-6 bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4">
                <p className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest mb-1">Cadastro Pendente de Aprovação</p>
                <p className="text-xs text-slate-500 mb-3">O colaborador completou o auto-cadastro e aguarda aprovação.</p>
                <button
                  onClick={() => {
                    handleApprove(editingStaff);
                    setIsEditModalOpen(false);
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white text-xs font-black uppercase tracking-widest px-4 py-2 rounded-xl flex items-center gap-2"
                >
                  <CheckCircle2 size={14} /> Aprovar Colaborador
                </button>
              </div>
            )}

            <div className="space-y-6">
              <div className="flex justify-center mb-4">
                <div
                  className="w-24 h-24 rounded-[32px] bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-300 overflow-hidden border-2 border-dashed border-slate-200 dark:border-slate-700 cursor-pointer hover:border-indigo-500 transition-all"
                  onClick={() => editPhotoInputRef.current?.click()}
                >
                  {editingStaff.photo ? (
                    <img src={editingStaff.photo} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center">
                      <Upload size={24} />
                      <span className="text-[8px] font-black uppercase mt-1">Foto</span>
                    </div>
                  )}
                </div>
                <input type="file" ref={editPhotoInputRef} accept="image/*" className="hidden" onChange={handlePhotoCapture} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nome Completo *</label>
                  <input
                    type="text"
                    value={editingStaff.name}
                    onChange={(e) => setEditingStaff({ ...editingStaff, name: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <DateSelectInput
                    label="Data de Nascimento"
                    labelClassName="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1"
                    value={(editingStaff.birthDate || '').split('T')[0]}
                    onChange={v => setEditingStaff({ ...editingStaff, birthDate: v })}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Cargo / Função</label>
                  <input type="text" value={editingStaff.position || ''} onChange={(e) => setEditingStaff({ ...editingStaff, position: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 dark:text-white outline-none" placeholder="Ex: Recepção, Limpeza..." />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">E-mail</label>
                  <input type="email" value={editingStaff.email || ''} onChange={(e) => setEditingStaff({ ...editingStaff, email: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 dark:text-white outline-none" placeholder="pessoa@exemplo.com" />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Telefone</label>
                  <input type="text" value={editingStaff.phone || ''} onChange={(e) => setEditingStaff({ ...editingStaff, phone: maskPhone(e.target.value) })} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 dark:text-white outline-none" />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">WhatsApp</label>
                  <input type="text" value={(editingStaff as any).whatsapp || ''} onChange={(e) => setEditingStaff({ ...editingStaff, whatsapp: maskPhone(e.target.value) } as any)} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 dark:text-white outline-none" />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 flex items-center justify-between">CEP {isLoadingCep && <Loader2 size={10} className="animate-spin text-indigo-500" />}</label>
                  <input type="text" value={editingStaff.cep || ''} onChange={handleCepChange} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 dark:text-white outline-none" maxLength={9} />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Status</label>
                  <select value={editingStaff.status} onChange={e => setEditingStaff({ ...editingStaff, status: e.target.value as any })} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 dark:text-white outline-none">
                    <option value="Active">Ativo</option>
                    <option value="Inactive">Inativo</option>
                    <option value="Pending">Pendente</option>
                  </select>
                </div>

                <div className="sm:col-span-2 text-right">
                  {editingStaff.id && (
                    <button
                      onClick={() => setIsDeleteModalOpen(true)}
                      className="text-red-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ml-auto hover:underline"
                    >
                      <Trash2 size={14} /> Excluir Colaborador
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-6">
              <button
                onClick={handleSaveEdit}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-indigo-600/20 active:scale-95 transition-all text-sm uppercase tracking-widest"
              >
                Salvar Alterações
              </button>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold py-4 rounded-2xl active:scale-95 transition-all text-sm uppercase"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteStaff}
        title="Excluir Colaborador?"
        message={<>Esta ação é permanente e removerá todos os dados de <strong className="text-slate-900 dark:text-white">{editingStaff?.name}</strong>.</>}
        confirmLabel="Sim, Remover"
      />
    </div>
  );
};

export default StaffView;
