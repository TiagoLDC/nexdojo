
import React, { useState, useEffect, useRef } from 'react';
import { Staff, StudentDocument, Academy, User } from '../types';
import { staffService } from '@/features/staff/services/staffService';
import { useTranslation } from '../services/LanguageContext';
import { fetchAddressByCep, maskCEP, maskPhone, maskCPF, maskRG } from '../services/cep';
import {
  UserPlus,
  Search,
  MoreVertical,
  X,
  Trash2,
  Save,
  Phone,
  MessageCircle,
  FileText,
  Upload,
  Download,
  FileIcon,
  Filter,
  Check,
  User as UserIcon,
  CheckCircle2,
  Briefcase,
  Mail,
  MapPin,
  Loader2,
  Eye,
  EyeOff
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

const StaffView: React.FC<{ academy: Academy; user: User }> = ({ academy, user }) => {
  const { t, showNotification } = useTranslation();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  const editPhotoInputRef = useRef<HTMLInputElement>(null);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [isLoadingCep, setIsLoadingCep] = useState(false);

  useEffect(() => {
    if (academy) {
      staffService.getAll(academy.id).then((res) => {
        setStaff(Array.isArray(res.data) ? res.data : []);
      }).catch(() => {
        setStaff([]);
      });
    }
  }, [academy]);

  const handleOpenNewStaff = () => {
    const newStaff: Staff = {
      id: '',
      academyId: academy.id,
      name: '',
      birthDate: '',
      status: 'Active',
      joinDate: new Date().toISOString(),
      documents: [],
      photo: undefined,
      phone: '',
      email: '',
      cpf: '',
      rg: '',
      address: '',
      medicalNotes: '',
      position: ''
    };
    setEditingStaff(newStaff);
    setIsEditModalOpen(true);
  };

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingStaff) return;
    const value = maskCEP(e.target.value);
    setEditingStaff({ ...editingStaff, cep: value });

    if (value.replace(/\D/g, '').length === 8) {
      setIsLoadingCep(true);
      const addressData = await fetchAddressByCep(value);
      if (addressData) {
        setEditingStaff(prev => prev ? {
          ...prev,
          address: addressData.fullAddress
        } : null);
      }
      setIsLoadingCep(false);
    }
  };

  const handleSaveStaff = async () => {
    if (!editingStaff || !editingStaff.name || !editingStaff.birthDate) {
      alert("Nome e Data de Nascimento são obrigatórios.");
      return;
    }

    try {
      const isNew = !editingStaff.id;

      if (isNew) {
        const created = await staffService.create(academy.id, {
          name: editingStaff.name,
          birthDate: editingStaff.birthDate,
          status: editingStaff.status,
          joinDate: editingStaff.joinDate,
          photo: editingStaff.photo,
          phone: editingStaff.phone,
          email: editingStaff.email,
          cpf: editingStaff.cpf,
          rg: editingStaff.rg,
          address: editingStaff.address,
          cep: editingStaff.cep,
          medicalNotes: editingStaff.medicalNotes,
          position: editingStaff.position,
        });
        setStaff(prev => [...prev, created]);
        showNotification("Colaborador cadastrado!");
      } else {
        const updated = await staffService.update(editingStaff.id, {
          name: editingStaff.name,
          birthDate: editingStaff.birthDate,
          status: editingStaff.status,
          joinDate: editingStaff.joinDate,
          photo: editingStaff.photo,
          phone: editingStaff.phone,
          email: editingStaff.email,
          cpf: editingStaff.cpf,
          rg: editingStaff.rg,
          address: editingStaff.address,
          cep: editingStaff.cep,
          medicalNotes: editingStaff.medicalNotes,
          position: editingStaff.position,
        });
        setStaff(prev => prev.map(s => s.id === updated.id ? updated : s));
        showNotification("Colaborador atualizado!");
      }

      setIsEditModalOpen(false);
      setEditingStaff(null);
    } catch (e) {
      showNotification("Erro ao salvar.", 'error');
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
      showNotification("Colaborador removido.", 'delete');
    } catch {
      showNotification("Erro ao remover colaborador.", 'error');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingStaff) return;
    if (file.size > 2000000) { alert("Limite de 2MB por arquivo."); return; }

    const reader = new FileReader();
    reader.onloadend = () => {
      const newDoc: StudentDocument = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        type: file.type,
        size: file.size,
        base64: reader.result as string,
        uploadedAt: new Date().toISOString()
      };
      setEditingStaff({
        ...editingStaff,
        documents: [...(editingStaff.documents || []), newDoc]
      });
      showNotification("Arquivo anexado!");
    };
    reader.readAsDataURL(file);
  };

  const downloadFile = (doc: StudentDocument) => {
    const link = document.createElement('a');
    link.href = doc.base64;
    link.download = doc.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const deleteDocument = (docId: string) => {
    if (!editingStaff) return;
    setEditingStaff({
      ...editingStaff,
      documents: editingStaff.documents?.filter(d => d.id !== docId) || []
    });
    showNotification("Documento removido.", 'delete');
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
    const matchesStatus = statusFilter === 'All' ? s.status !== 'Pending' : s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 relative">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Equipe Administrativa (Staff)</h1>
          <p className="text-slate-500 dark:text-slate-400">Gerencie os colaboradores da sua unidade.</p>
        </div>
        <button
          onClick={handleOpenNewStaff}
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
            <option value="Active">Ativos</option>
            <option value="Inactive">Inativos</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Colaborador</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Cargo / Função</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map(member => (
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
                        <div className="text-[10px] text-slate-400 font-bold uppercase">{member.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{member.position || 'Geral'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] px-2 py-1 rounded-full font-black uppercase ${member.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200'}`}>
                      {member.status === 'Active' ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                       <button onClick={() => { setEditingStaff({...member}); setIsEditModalOpen(true); }} className="text-slate-400 hover:text-indigo-600 p-2">
                        <MoreVertical size={20} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400 text-sm italic">Nenhum colaborador encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Edição/Novo */}
      {isEditModalOpen && editingStaff && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[32px] p-8 animate-in zoom-in duration-300 shadow-2xl border border-slate-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase italic">{!editingStaff.id ? 'Novo Colaborador' : 'Editar Ficha'}</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
               <div className="flex justify-center mb-6">
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

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nome Completo *</label>
                  <input
                    type="text"
                    value={editingStaff.name}
                    onChange={(e) => setEditingStaff({ ...editingStaff, name: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Data de Nascimento *</label>
                   <input type="date" value={(editingStaff.birthDate || '').split('T')[0]} onChange={(e) => setEditingStaff({...editingStaff, birthDate: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 dark:text-white outline-none" />
                </div>

                <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Cargo / Função</label>
                   <input type="text" value={editingStaff.position} onChange={(e) => setEditingStaff({...editingStaff, position: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 dark:text-white outline-none" placeholder="Ex: Recepção, Limpeza..." />
                </div>

                <div className="md:col-span-2">
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">E-mail de Login *</label>
                   <input type="email" value={editingStaff.email} onChange={(e) => setEditingStaff({...editingStaff, email: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 dark:text-white outline-none" placeholder="pessoa@exemplo.com" />
                </div>

                <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Telefone / WhatsApp</label>
                   <input type="text" value={editingStaff.phone} onChange={(e) => setEditingStaff({...editingStaff, phone: maskPhone(e.target.value)})} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 dark:text-white outline-none" />
                </div>

                <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 flex items-center justify-between">CEP {isLoadingCep && <Loader2 size={10} className="animate-spin text-indigo-500" />}</label>
                   <input type="text" value={editingStaff.cep || ''} onChange={handleCepChange} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 dark:text-white outline-none" maxLength={9} />
                </div>

                <div className="md:col-span-2 text-right">
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

            <div className="flex flex-col gap-2 mt-8">
              <button
                onClick={handleSaveStaff}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-indigo-600/20 active:scale-95 transition-all text-sm uppercase tracking-widest"
              >
                Salvar Colaborador
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

      {/* Modal Deletar */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[300] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] p-8 animate-in zoom-in duration-300 shadow-2xl border border-slate-100 dark:border-slate-800 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-950/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase italic mb-2">Excluir Colaborador?</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-8">
              Esta ação é permanente e removerá todos os dados de <strong>{editingStaff?.name}</strong>.
            </p>
            <div className="flex flex-col gap-2">
               <button onClick={handleDeleteStaff} className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-red-600/20 active:scale-95 transition-all text-sm uppercase tracking-widest italic">Sim, Remover</button>
               <button onClick={() => setIsDeleteModalOpen(false)} className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold py-4 rounded-2xl active:scale-95 transition-all text-sm uppercase">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffView;
