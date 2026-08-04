/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Academy, User } from '../types';
import { usersService, UserRecord } from '@/features/users/services/usersService';
import { useTranslation } from '../services/LanguageContext';
import {
  UserPlus,
  Search,
  Filter,
  MoreVertical,
  X,
  ShieldCheck,
  ShieldOff,
  KeyRound,
  User as UserIcon,
  Eye,
  EyeOff,
  Camera,
} from 'lucide-react';

const compressImage = (base64Str: string, maxWidth = 400, maxHeight = 400): Promise<string> =>
  new Promise(resolve => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      let w = img.width, h = img.height;
      if (w > h) { if (w > maxWidth)  { h *= maxWidth  / w; w = maxWidth;  } }
      else        { if (h > maxHeight) { w *= maxHeight / h; h = maxHeight; } }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
  });

// ── helpers ──────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  superuser: 'Super',
  admin:     'Admin',
  instructor:'Instrutor',
  staff:     'Staff',
  student:   'Aluno',
  guardian:  'Responsável',
};

const ROLE_COLORS: Record<string, string> = {
  superuser: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  admin:     'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  instructor:'bg-amber-100  text-amber-700  dark:bg-amber-900/40  dark:text-amber-300',
  staff:     'bg-teal-100   text-teal-700   dark:bg-teal-900/40   dark:text-teal-300',
  student:   'bg-sky-100    text-sky-700    dark:bg-sky-900/40    dark:text-sky-300',
  guardian:  'bg-rose-100   text-rose-700   dark:bg-rose-900/40   dark:text-rose-300',
};

const STATUS_LABELS: Record<string, string> = {
  Active:  'Ativo',
  Pending: 'Pendente',
  Blocked: 'Bloqueado',
};

const STATUS_COLORS: Record<string, string> = {
  Active:  'bg-green-100  text-green-700  dark:bg-green-900/40  dark:text-green-300',
  Pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  Blocked: 'bg-red-100    text-red-700    dark:bg-red-900/40    dark:text-red-300',
};

const ENTITY_LABELS: Record<string, string> = {
  student:    'Aluno',
  instructor: 'Instrutor',
  staff:      'Staff',
};

// ── component ─────────────────────────────────────────────────────────────────

const UsersView: React.FC<{ academy: Academy; user: User }> = ({ user: currentUser }) => {
  const { showNotification } = useTranslation();

  const [users, setUsers]               = useState<UserRecord[]>([]);
  const [total, setTotal]               = useState(0);
  const [search, setSearch]             = useState('');
  const [roleFilter, setRoleFilter]     = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // modal de edição/criação
  const [isEditOpen, setIsEditOpen]   = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<UserRecord> & { password?: string; confirmPassword?: string } | null>(null);
  const [isNew, setIsNew]             = useState(false);
  const [showPwd, setShowPwd]         = useState(false);

  // modal de reset de senha
  const [isResetOpen, setIsResetOpen]   = useState(false);
  const [resetTarget, setResetTarget]   = useState<UserRecord | null>(null);
  const [newPassword, setNewPassword]   = useState('');
  const [showNewPwd, setShowNewPwd]     = useState(false);

  // menu de ações rápidas
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuRect, setMenuRect] = useState<DOMRect | null>(null);

  const toggleMenu = (e: React.MouseEvent<HTMLButtonElement>, id: string) => {
    if (openMenuId === id) {
      setOpenMenuId(null);
      setMenuRect(null);
      return;
    }
    setMenuRect(e.currentTarget.getBoundingClientRect());
    setOpenMenuId(id);
  };

  const photoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingUser) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const compressed = await compressImage(reader.result as string);
      setEditingUser(u => u ? { ...u, photo: compressed } : u);
    };
    reader.readAsDataURL(file);
  };

  // ── load ──────────────────────────────────────────────────────────────────
  const loadUsers = async () => {
    try {
      const res = await usersService.getAll({
        search:  search  || undefined,
        role:    roleFilter   || undefined,
        status:  statusFilter || undefined,
        limit: 100,
      });
      setUsers(res.data);
      setTotal(res.total);
    } catch {
      setUsers([]);
    }
  };

  useEffect(() => { loadUsers(); }, [search, roleFilter, statusFilter]);

  // ── handlers ──────────────────────────────────────────────────────────────

  const handleOpenNew = () => {
    setEditingUser({ role: 'admin', status: 'Active', password: '', confirmPassword: '' });
    setIsNew(true);
    setShowPwd(false);
    setIsEditOpen(true);
  };

  const handleOpenEdit = (u: UserRecord) => {
    setEditingUser({ ...u, password: '', confirmPassword: '' });
    setIsNew(false);
    setShowPwd(false);
    setIsEditOpen(true);
    setOpenMenuId(null);
    setMenuRect(null);
  };

  const handleSave = async () => {
    if (!editingUser) return;

    if (!editingUser.name?.trim() || !editingUser.email?.trim()) {
      showNotification('Nome e e-mail são obrigatórios.', 'error');
      return;
    }
    if (isNew) {
      if (!editingUser.password || editingUser.password.length < 6) {
        showNotification('Senha mínima de 6 caracteres.', 'error');
        return;
      }
      if (editingUser.password !== editingUser.confirmPassword) {
        showNotification('As senhas não coincidem.', 'error');
        return;
      }
    }

    try {
      if (isNew) {
        const created = await usersService.create({
          name:     editingUser.name!,
          email:    editingUser.email!,
          role:     editingUser.role as string,
          password: editingUser.password!,
        });
        setUsers(prev => [created, ...prev]);
        setTotal(t => t + 1);
        showNotification('Usuário criado com sucesso!');
      } else {
        const updated = await usersService.update(editingUser.id!, {
          name:   editingUser.name,
          email:  editingUser.email,
          role:   editingUser.role,
          status: editingUser.status,
          ...(!editingUser.entity_type && {
            photo:    editingUser.photo    ?? null,
            phone:    editingUser.phone    ?? null,
            position: editingUser.position ?? null,
          }),
        });
        setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
        showNotification('Usuário atualizado!');
      }
      setIsEditOpen(false);
      setEditingUser(null);
    } catch (e: any) {
      const msg = e?.response?.data?.error || 'Erro ao salvar usuário.';
      showNotification(msg, 'error');
    }
  };

  const handleToggleStatus = async (u: UserRecord) => {
    const next = u.status === 'Active' ? 'Blocked' : 'Active';
    try {
      const updated = await usersService.update(u.id, { status: next });
      setUsers(prev => prev.map(x => x.id === updated.id ? updated : x));
      showNotification(next === 'Active' ? 'Usuário ativado.' : 'Usuário bloqueado.');
    } catch {
      showNotification('Erro ao alterar status.', 'error');
    }
    setOpenMenuId(null);
    setMenuRect(null);
  };

  const handleOpenReset = (u: UserRecord) => {
    setResetTarget(u);
    setNewPassword('');
    setShowNewPwd(false);
    setIsResetOpen(true);
    setOpenMenuId(null);
    setMenuRect(null);
  };

  const handleResetPassword = async () => {
    if (!resetTarget) return;
    if (newPassword.length < 6) {
      showNotification('Senha mínima de 6 caracteres.', 'error');
      return;
    }
    try {
      await usersService.update(resetTarget.id, { password: newPassword });
      showNotification('Senha redefinida. O usuário precisará trocá-la no próximo login.');
      setIsResetOpen(false);
      setResetTarget(null);
    } catch {
      showNotification('Erro ao redefinir senha.', 'error');
    }
  };

  // ── derived ───────────────────────────────────────────────────────────────

  const isSelf = (u: UserRecord) => u.id === currentUser.id;

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto space-y-6 relative">

      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Usuários</h1>
          <p className="text-slate-500 dark:text-slate-400">
            {total} conta{total !== 1 ? 's' : ''} com acesso ao sistema
          </p>
        </div>
        <button
          onClick={handleOpenNew}
          className="bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all"
        >
          <UserPlus size={20} />
          Novo Usuário
        </button>
      </header>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl pl-11 pr-4 py-3.5 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm dark:text-white text-sm"
          />
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 shadow-sm">
            <Filter size={13} className="text-slate-400" />
            <span className="text-[10px] font-black text-slate-400 uppercase">Função:</span>
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="text-xs font-bold text-slate-700 dark:text-slate-300 outline-none bg-transparent"
            >
              <option value="">Todas</option>
              <option value="admin">Admin</option>
              <option value="instructor">Instrutor</option>
              <option value="staff">Staff</option>
              <option value="student">Aluno</option>
              <option value="guardian">Responsável</option>
            </select>
          </div>
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 shadow-sm">
            <span className="text-[10px] font-black text-slate-400 uppercase">Status:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="text-xs font-bold text-slate-700 dark:text-slate-300 outline-none bg-transparent"
            >
              <option value="">Todos</option>
              <option value="Active">Ativos</option>
              <option value="Pending">Pendentes</option>
              <option value="Blocked">Bloqueados</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-transparent md:bg-white dark:md:bg-slate-900 md:rounded-3xl md:border md:border-slate-100 dark:md:border-slate-800 md:shadow-sm overflow-visible md:overflow-hidden">
        {/* Mobile Card View */}
        <div className="md:hidden space-y-3 pb-24">
          {users.map(u => (
            <div
              key={u.id}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-4 relative"
            >
              <div className="flex items-start gap-3">
                {u.photo ? (
                  <img src={u.photo} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 flex-shrink-0">
                    <UserIcon size={20} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-black text-slate-800 dark:text-white text-sm uppercase italic leading-tight truncate">
                    {u.name}
                    {isSelf(u) && (
                      <span className="ml-2 text-[9px] bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300 px-1.5 py-0.5 rounded-full font-black uppercase">Você</span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium truncate">{u.email}</div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter ${ROLE_COLORS[u.role] ?? ''}`}>
                      {ROLE_LABELS[u.role] ?? u.role}
                    </span>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter ${STATUS_COLORS[u.status] ?? ''}`}>
                      {STATUS_LABELS[u.status] ?? u.status}
                    </span>
                    {u.entity_type && (
                      <span className="text-[9px] px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black uppercase">
                        {ENTITY_LABELS[u.entity_type]}
                      </span>
                    )}
                  </div>
                  {u.requires_password_change && (
                    <span className="block mt-2 text-[9px] text-orange-500 font-bold uppercase">Troca de senha pendente</span>
                  )}
                  {!u.entity_type && (u.position || u.phone) && (
                    <div className="mt-2 flex flex-col gap-0.5">
                      {u.position && <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{u.position}</span>}
                      {u.phone && <span className="text-[10px] text-slate-400 dark:text-slate-500">{u.phone}</span>}
                    </div>
                  )}
                </div>
                <button
                  onClick={(e) => toggleMenu(e, u.id)}
                  className="text-slate-400 hover:text-indigo-600 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0"
                >
                  <MoreVertical size={18} />
                </button>
              </div>
            </div>
          ))}
          {users.length === 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 px-6 py-12 text-center text-slate-400 text-sm italic">
              Nenhum usuário encontrado.
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left min-w-[680px]">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Usuário</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Função</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Ficha</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">

                  {/* Name + email */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {u.photo ? (
                        <img src={u.photo} className="w-9 h-9 rounded-xl object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 flex-shrink-0">
                          <UserIcon size={18} />
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-slate-800 dark:text-white text-sm uppercase italic leading-tight">
                          {u.name}
                          {isSelf(u) && (
                            <span className="ml-2 text-[9px] bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300 px-1.5 py-0.5 rounded-full font-black uppercase">Você</span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">{u.email}</div>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="px-6 py-4">
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-black uppercase ${ROLE_COLORS[u.role] ?? ''}`}>
                      {ROLE_LABELS[u.role] ?? u.role}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className={`text-[10px] px-2.5 py-1 rounded-full font-black uppercase w-fit ${STATUS_COLORS[u.status] ?? ''}`}>
                        {STATUS_LABELS[u.status] ?? u.status}
                      </span>
                      {u.requires_password_change && (
                        <span className="text-[9px] text-orange-500 font-bold uppercase">Troca de senha pendente</span>
                      )}
                    </div>
                  </td>

                  {/* Linked entity */}
                  <td className="px-6 py-4">
                    {u.entity_type ? (
                      <span className="text-[10px] px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase">
                        {ENTITY_LABELS[u.entity_type]}
                      </span>
                    ) : (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-slate-300 dark:text-slate-600 font-bold">—</span>
                        {u.position && <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{u.position}</span>}
                        {u.phone    && <span className="text-[10px] text-slate-400 dark:text-slate-500">{u.phone}</span>}
                      </div>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 text-right relative">
                    <button
                      onClick={(e) => toggleMenu(e, u.id)}
                      className="text-slate-400 hover:text-indigo-600 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <MoreVertical size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm italic">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Click fora fecha menu */}
      {openMenuId && (
        <div className="fixed inset-0 z-40" onClick={() => { setOpenMenuId(null); setMenuRect(null); }} />
      )}

      {/* Menu de ações — renderizado via portal para não ser cortado pelo scroll/overflow da tabela */}
      {openMenuId && menuRect && (() => {
        const u = users.find(x => x.id === openMenuId);
        if (!u) return null;
        const menuWidth = 190;
        const estimatedHeight = 96 + (!isSelf(u) && u.role !== 'superuser' ? 48 : 0);
        const openUp = menuRect.bottom + estimatedHeight > window.innerHeight;
        const style: React.CSSProperties = {
          position: 'fixed',
          left: Math.max(8, Math.min(menuRect.right - menuWidth, window.innerWidth - menuWidth - 8)),
          ...(openUp
            ? { bottom: window.innerHeight - menuRect.top + 4 }
            : { top: menuRect.bottom + 4 }),
          width: menuWidth,
          zIndex: 60,
        };
        return createPortal(
          <div style={style} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl py-2 text-left">
            <button
              onClick={() => handleOpenEdit(u)}
              className="w-full px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
            >
              <UserIcon size={14} /> Editar dados
            </button>
            <button
              onClick={() => handleOpenReset(u)}
              className="w-full px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
            >
              <KeyRound size={14} /> Redefinir senha
            </button>
            {!isSelf(u) && u.role !== 'superuser' && (
              <>
                <div className="border-t border-slate-100 dark:border-slate-700 my-1" />
                <button
                  onClick={() => handleToggleStatus(u)}
                  className={`w-full px-4 py-2.5 text-xs font-bold flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 ${u.status === 'Active' ? 'text-red-500' : 'text-green-600'}`}
                >
                  {u.status === 'Active'
                    ? <><ShieldOff size={14} /> Bloquear acesso</>
                    : <><ShieldCheck size={14} /> Ativar acesso</>
                  }
                </button>
              </>
            )}
          </div>,
          document.body
        );
      })()}

      {/* ── Modal Edição / Novo Usuário ─────────────────────────────────── */}
      {isEditOpen && editingUser && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[32px] p-8 animate-in zoom-in duration-300 shadow-2xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase italic">
                {isNew ? 'Novo Usuário' : 'Editar Usuário'}
              </h2>
              <button onClick={() => setIsEditOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">

              {/* Foto — apenas para admins puros (sem entidade vinculada) */}
              {!isNew && !editingUser.entity_type && (
                <div className="flex items-center gap-4">
                  <div
                    className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden flex-shrink-0 cursor-pointer relative group"
                    onClick={() => photoInputRef.current?.click()}
                  >
                    {editingUser.photo ? (
                      <img src={editingUser.photo} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <UserIcon size={28} />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera size={16} className="text-white" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all flex items-center gap-1.5"
                    >
                      <Camera size={11} /> {editingUser.photo ? 'Trocar foto' : 'Adicionar foto'}
                    </button>
                    {editingUser.photo && (
                      <button
                        type="button"
                        onClick={() => setEditingUser(u => u ? { ...u, photo: undefined } : u)}
                        className="text-[10px] font-bold text-slate-400 hover:text-red-500 transition-colors"
                      >
                        Remover foto
                      </button>
                    )}
                  </div>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoChange}
                  />
                </div>
              )}

              {/* Nome */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nome Completo *</label>
                <input
                  type="text"
                  value={editingUser.name ?? ''}
                  onChange={e => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">E-mail *</label>
                <input
                  type="email"
                  value={editingUser.email ?? ''}
                  onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Função */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Função *</label>
                <select
                  value={editingUser.role ?? 'admin'}
                  onChange={e => setEditingUser({ ...editingUser, role: e.target.value as any })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={!isNew && ['superuser', 'guardian'].includes(editingUser.role ?? '')}
                >
                  <option value="admin">Admin</option>
                  <option value="instructor">Instrutor</option>
                  <option value="staff">Staff</option>
                  {!isNew && <option value="student">Aluno</option>}
                  {!isNew && editingUser.role === 'guardian' && <option value="guardian">Responsável</option>}
                </select>
              </div>

              {/* Status (só edição) */}
              {!isNew && (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Status</label>
                  <select
                    value={editingUser.status ?? 'Active'}
                    onChange={e => setEditingUser({ ...editingUser, status: e.target.value as any })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    disabled={isSelf(editingUser as UserRecord) || editingUser.role === 'superuser'}
                  >
                    <option value="Active">Ativo</option>
                    <option value="Pending">Pendente</option>
                    <option value="Blocked">Bloqueado</option>
                  </select>
                </div>
              )}

              {/* Telefone e Cargo — apenas para admins/staff puros (sem entidade vinculada) */}
              {!isNew && !editingUser.entity_type && ['admin', 'superuser', 'staff'].includes(editingUser.role ?? '') && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Telefone</label>
                    <input
                      type="tel"
                      value={editingUser.phone ?? ''}
                      onChange={e => setEditingUser({ ...editingUser, phone: e.target.value })}
                      placeholder="(00) 00000-0000"
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Cargo</label>
                    <input
                      type="text"
                      value={editingUser.position ?? ''}
                      onChange={e => setEditingUser({ ...editingUser, position: e.target.value })}
                      placeholder="Ex: Diretor, Gerente..."
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}

              {/* Senha (só criação) */}
              {isNew && (
                <>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Senha *</label>
                    <div className="relative">
                      <input
                        type={showPwd ? 'text' : 'password'}
                        value={editingUser.password ?? ''}
                        onChange={e => setEditingUser({ ...editingUser, password: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 pr-12 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Mínimo 6 caracteres"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd(v => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Confirmar Senha *</label>
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={editingUser.confirmPassword ?? ''}
                      onChange={e => setEditingUser({ ...editingUser, confirmPassword: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-col gap-2 mt-8">
              <button
                onClick={handleSave}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-indigo-600/20 active:scale-95 transition-all text-sm uppercase tracking-widest"
              >
                {isNew ? 'Criar Usuário' : 'Salvar Alterações'}
              </button>
              <button
                onClick={() => setIsEditOpen(false)}
                className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold py-4 rounded-2xl active:scale-95 transition-all text-sm uppercase"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Redefinir Senha ─────────────────────────────────────────── */}
      {isResetOpen && resetTarget && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] p-8 animate-in zoom-in duration-300 shadow-2xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-black text-slate-800 dark:text-white uppercase italic">Redefinir Senha</h2>
              <button onClick={() => setIsResetOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X size={22} />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              Defina uma nova senha temporária para <strong className="text-slate-700 dark:text-slate-200">{resetTarget.name}</strong>.
              O usuário será obrigado a trocá-la no próximo acesso.
            </p>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nova Senha</label>
              <div className="relative">
                <input
                  type={showNewPwd ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 pr-12 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Mínimo 6 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPwd(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showNewPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-8">
              <button
                onClick={handleResetPassword}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-indigo-600/20 active:scale-95 transition-all text-sm uppercase tracking-widest"
              >
                Confirmar Redefinição
              </button>
              <button
                onClick={() => setIsResetOpen(false)}
                className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold py-4 rounded-2xl active:scale-95 transition-all text-sm uppercase"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersView;
