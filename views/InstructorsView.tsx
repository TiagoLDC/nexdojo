
import React, { useState, useEffect, useRef } from 'react';
import { Instructor, Belt, StudentDocument, Academy, User } from '../types';
import { StorageService } from '../services/storage';
import { fetchAddressByCep, maskCEP, maskPhone, maskCPF, maskRG } from '../services/cep';
import { 
  UserPlus, 
  Search, 
  MoreVertical, 
  X, 
  Trash2, 
  Save, 
  GraduationCap, 
  Minus, 
  Plus,
  Phone,
  MessageCircle,
  FileText,
  UserCheck,
  Activity,
  Upload,
  Download,
  FileIcon,
  AlertCircle,
  Printer,
  Briefcase,
  Filter,
  Check,
  Camera,
  User as UserIcon,
  CalendarClock,
  CheckCircle2,
  Award,
  Heart,
  MapPin,
  Mail,
  Users,
  AlertTriangle,
  Loader2,
  Eye,
  EyeOff
} from 'lucide-react';
import { BeltBadge } from '../components/BeltBadge';
import { BELT_COLORS } from '../constants';

// Funções utilitárias removidas e unificadas em services/cep.ts

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

const InstructorsView: React.FC<{ academy: Academy; user: User }> = ({ academy, user }) => {
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'delete'} | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('All');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editPhotoInputRef = useRef<HTMLInputElement>(null);
  const [editingInstructor, setEditingInstructor] = useState<Instructor | null>(null);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [showSensitive, setShowSensitive] = useState<{[key: string]: boolean}>({});

  const toggleSensitive = (field: string) => {
    setShowSensitive(prev => ({ ...prev, [field]: !prev[field] }));
  };

  useEffect(() => {
    if (academy) {
      setInstructors(StorageService.getInstructors(academy.id));
    }
  }, [academy]);

  const showNotification = (message: string, type: 'success' | 'error' | 'delete' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleOpenNewInstructor = () => {
    const newInstructor: Instructor = {
      id: 'inst_' + Math.random().toString(36).substr(2, 9),
      academyId: academy.id, // Garantindo vínculo com a academia atual
      name: '',
      belt: Belt.BLACK,
      stripes: 0,
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
      specialties: ''
    };
    setEditingInstructor(newInstructor);
    setIsEditModalOpen(true);
  };

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingInstructor) return;
    const value = maskCEP(e.target.value);
    setEditingInstructor({ ...editingInstructor, cep: value });

    if (value.replace(/\D/g, '').length === 8) {
      setIsLoadingCep(true);
      const addressData = await fetchAddressByCep(value);
      if (addressData) {
        setEditingInstructor(prev => prev ? {
          ...prev,
          address: addressData.fullAddress
        } : null);
      }
      setIsLoadingCep(false);
    }
  };

  const handleSaveInstructor = () => {
    if (!editingInstructor || !editingInstructor.name || !editingInstructor.birthDate) {
      alert("Nome e Data de Nascimento são obrigatórios.");
      return;
    }

    try {
      const currentInstructors = StorageService.getInstructors();
      const exists = currentInstructors.find(i => i.id === editingInstructor.id);
      
      let updated;
      if (exists) {
        updated = currentInstructors.map(i => i.id === editingInstructor.id ? editingInstructor : i);
      } else {
        updated = [...currentInstructors, editingInstructor];
      }

      StorageService.saveInstructors(updated);
      setInstructors(updated);
      setIsEditModalOpen(false);
      setEditingInstructor(null);
      showNotification(exists ? "Ficha atualizada!" : "Professor cadastrado com sucesso!");
    } catch (e) {
      showNotification("Erro ao salvar. Tente remover arquivos pesados.", 'error');
    }
  };

  const handleDeleteInstructor = () => {
    if (!editingInstructor) return;
    
    const id = editingInstructor.id;
    const updated = instructors.filter(i => i.id !== id);
    StorageService.saveInstructors(updated);
    setInstructors(updated);
    
    setIsDeleteModalOpen(false);
    setIsEditModalOpen(false);
    setEditingInstructor(null);
    showNotification("Professor removido.", 'delete');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingInstructor) return;
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
      setEditingInstructor({
        ...editingInstructor,
        documents: [...(editingInstructor.documents || []), newDoc]
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
    if (!editingInstructor) return;
    setEditingInstructor({
      ...editingInstructor,
      documents: editingInstructor.documents?.filter(d => d.id !== docId) || []
    });
    showNotification("Documento removido.", 'delete');
  };

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingInstructor) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const compressed = await compressImage(reader.result as string);
      setEditingInstructor({ ...editingInstructor, photo: compressed });
    };
    reader.readAsDataURL(file);
  };

  const filtered = instructors.filter(i => {
    const matchesSearch = i.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' ? i.status !== 'Pending' : i.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const allBeltOptions = [Belt.WHITE, Belt.BLUE, Belt.PURPLE, Belt.BROWN, Belt.BLACK, Belt.CORAL, Belt.RED];

  return (
    <div className="max-w-4xl mx-auto space-y-6 relative">
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-top duration-300 ${
          toast.type === 'success' ? 'bg-green-600 text-white' : toast.type === 'delete' ? 'bg-red-600 text-white' : 'bg-slate-800 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span className="font-bold text-sm tracking-tight">{toast.message}</span>
        </div>
      )}

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Instrutores</h1>
          <p className="text-slate-500">Gestão completa do corpo docente.</p>
        </div>
        <button 
          onClick={handleOpenNewInstructor}
          className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all"
        >
          <UserPlus size={20} />
          Novo Professor
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
            className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-4 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm w-fit">
          <Filter size={14} className="text-slate-400" />
          <span className="text-xs font-bold text-slate-400 uppercase">Status:</span>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-bold text-slate-700 outline-none bg-transparent"
          >
            <option value="All">Todos</option>
            <option value="Active">Ativos</option>
            <option value="Inactive">Inativos</option>
            <option value="Pending">Pendentes</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-slate-100">
          {filtered.map(instructor => (
            <div key={instructor.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  {instructor.photo ? (
                    <img src={instructor.photo} className="w-12 h-12 rounded-xl object-cover border-2 border-white shadow-sm" />
                  ) : (
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl ${BELT_COLORS[instructor.belt].split(' ')[0]}`}>{instructor.name.charAt(0)}</div>
                  )}
                </div>
                <div>
                  <div className="font-bold text-slate-800 text-sm">{instructor.name || "Sem nome"}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <BeltBadge belt={instructor.belt} stripes={instructor.stripes} />
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase ${instructor.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                      {instructor.status === 'Active' ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a 
                  href={instructor.phone ? `https://wa.me/55${instructor.phone.replace(/\D/g, '')}` : '#'} 
                  target={instructor.phone ? "_blank" : "_self"}
                  rel="noopener noreferrer"
                  onClick={(e) => !instructor.phone && e.preventDefault()}
                  className={`p-2 rounded-xl transition-all ${
                    instructor.phone 
                      ? 'bg-emerald-500 text-white hover:bg-emerald-600' 
                      : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                  }`}
                >
                  <MessageCircle size={18} />
                </a>
                <button onClick={() => { setEditingInstructor({...instructor}); setIsEditModalOpen(true); }} className="text-slate-400 p-2 hover:bg-slate-100 rounded-lg">
                  <MoreVertical size={20} />
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-sm italic">Nenhum professor encontrado.</div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Professor</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Especialidade</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(instructor => (
                <tr key={instructor.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="relative shrink-0 z-0 hover:z-50">
                        {instructor.photo ? (
                          <img src={instructor.photo} className="w-12 h-12 rounded-xl object-cover border-2 border-white shadow-sm transition-all duration-300 transform hover:scale-[2.5] hover:shadow-2xl hover:rounded-lg cursor-zoom-in" />
                        ) : (
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl transition-all duration-300 transform hover:scale-[2.5] hover:shadow-2xl hover:rounded-lg ${BELT_COLORS[instructor.belt].split(' ')[0]}`}>{instructor.name.charAt(0)}</div>
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800">{instructor.name || "Sem nome"}</div>
                        <BeltBadge belt={instructor.belt} stripes={instructor.stripes} />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-slate-600">{instructor.specialties || 'Geral'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] px-2 py-1 rounded-full font-black uppercase ${instructor.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                      {instructor.status === 'Active' ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <a 
                        href={instructor.phone ? `https://wa.me/55${instructor.phone.replace(/\D/g, '')}` : '#'} 
                        target={instructor.phone ? "_blank" : "_self"}
                        rel="noopener noreferrer"
                        onClick={(e) => !instructor.phone && e.preventDefault()}
                        className={`p-2 rounded-xl transition-all shadow-sm ${
                          instructor.phone 
                            ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-200 hover:scale-105 active:scale-95' 
                            : 'bg-slate-100 text-slate-300 cursor-not-allowed opacity-50'
                        }`}
                        title={instructor.phone ? `Chamar no WhatsApp (${instructor.phone})` : "Telefone não cadastrado"}
                      >
                        <MessageCircle size={18} fill={instructor.phone ? "currentColor" : "none"} />
                      </a>
                      <button onClick={() => { setEditingInstructor({...instructor}); setIsEditModalOpen(true); }} className="text-slate-400 hover:text-indigo-600 p-2 hover:bg-indigo-50 rounded-lg transition-all" title="Editar Ficha">
                        <MoreVertical size={20} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">Nenhum professor encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Unificado: Ficha do Professor */}
      {isEditModalOpen && editingInstructor && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white w-full max-w-4xl rounded-t-3xl md:rounded-3xl p-6 md:p-8 animate-in slide-in-from-bottom duration-300 max-h-[95vh] overflow-y-auto">
             <div className="flex items-center justify-between mb-8 sticky top-0 bg-white py-2 z-20 border-b border-slate-50">
              <div className="flex items-center gap-3">
                <div className="bg-slate-900 p-2 rounded-xl text-white">
                  <Award size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Ficha do Professor</h2>
                  <p className="text-xs text-slate-400 font-medium">Preencha os campos obrigatórios (*)</p>
                </div>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 p-2 hover:bg-slate-100 rounded-full">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-10 pb-32">
              {/* Seção 1: Dados Pessoais */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                  <UserCheck size={14} /> Dados Pessoais
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="flex flex-col items-center gap-3 shrink-0">
                    <div 
                      className="w-32 h-32 rounded-3xl bg-slate-100 border border-slate-200 overflow-hidden relative group cursor-pointer shadow-sm"
                      onClick={() => editPhotoInputRef.current?.click()}
                    >
                      {editingInstructor.photo ? (
                        <img src={editingInstructor.photo} alt={editingInstructor.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50">
                          <UserIcon size={40} />
                          <span className="text-[10px] font-black uppercase tracking-widest mt-2">Sem Foto</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white">
                        <Camera size={24} />
                        <span className="text-[10px] font-bold uppercase mt-1">Alterar</span>
                      </div>
                    </div>
                    <input type="file" ref={editPhotoInputRef} accept="image/*" className="hidden" onChange={handlePhotoCapture} />
                  </div>
                  
                  <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Nome Completo <span className="text-red-500">*</span></label>
                      <input type="text" value={editingInstructor.name} onChange={(e) => setEditingInstructor({...editingInstructor, name: e.target.value})} placeholder="Ex: Professor Hélio Gracie" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none font-medium" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Data de Nascimento <span className="text-red-500">*</span></label>
                      <input type="date" value={editingInstructor.birthDate} onChange={(e) => setEditingInstructor({...editingInstructor, birthDate: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none font-bold text-slate-800 text-lg" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Sexo</label>
                      <select value={editingInstructor.gender || ''} onChange={(e) => setEditingInstructor({...editingInstructor, gender: e.target.value as any})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none font-medium text-slate-700">
                        <option value="">Selecionar</option>
                        <option value="M">Masculino</option>
                        <option value="F">Feminino</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1 flex items-center justify-between">
                        CPF
                        <button onClick={() => toggleSensitive('cpf')} className="text-slate-400">
                          {showSensitive['cpf'] ? <EyeOff size={12} /> : <Eye size={12} />}
                        </button>
                      </label>
                      <input 
                        type={showSensitive['cpf'] ? "text" : "password"} 
                        value={editingInstructor.cpf || ''} 
                        onChange={(e) => setEditingInstructor({...editingInstructor, cpf: maskCPF(e.target.value)})} 
                        placeholder="000.000.000-00" 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none font-medium" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1 flex items-center justify-between">
                        RG
                        <button onClick={() => toggleSensitive('rg')} className="text-slate-400">
                          {showSensitive['rg'] ? <EyeOff size={12} /> : <Eye size={12} />}
                        </button>
                      </label>
                      <input 
                        type={showSensitive['rg'] ? "text" : "password"} 
                        value={editingInstructor.rg || ''} 
                        onChange={(e) => setEditingInstructor({...editingInstructor, rg: maskRG(e.target.value)})} 
                        placeholder="00.000.000-0" 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none font-medium" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Estado Civil</label>
                      <select value={editingInstructor.maritalStatus || ''} onChange={(e) => setEditingInstructor({...editingInstructor, maritalStatus: e.target.value as any})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none font-medium text-slate-700">
                        <option value="">Selecionar</option>
                        <option value="Solteiro">Solteiro(a)</option>
                        <option value="Casado">Casado(a)</option>
                        <option value="Divorciado">Divorciado(a)</option>
                        <option value="Viúvo">Viúvo(a)</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Status na Academia</label>
                      <select value={editingInstructor.status} onChange={(e) => setEditingInstructor({...editingInstructor, status: e.target.value as any})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none font-bold text-slate-700">
                        <option value="Active">Ativo</option>
                        <option value="Inactive">Inativo</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção 2: Contato & Localização */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                  <Phone size={14} /> Contato & Endereço
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">WhatsApp</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                      <input type="tel" value={editingInstructor.phone || ''} onChange={(e) => setEditingInstructor({...editingInstructor, phone: maskPhone(e.target.value)})} placeholder="(00) 00000-0000" className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 outline-none font-medium" />
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">E-mail Profissional</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                      <input type="email" value={editingInstructor.email || ''} onChange={(e) => setEditingInstructor({...editingInstructor, email: e.target.value})} placeholder="exemplo@academia.com" className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 outline-none font-medium" />
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1 flex items-center justify-between">
                      CEP
                      {isLoadingCep && <Loader2 size={10} className="animate-spin text-indigo-500" />}
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                      <input 
                        type="text" 
                        value={editingInstructor.cep || ''} 
                        onChange={handleCepChange} 
                        placeholder="00000-000" 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 outline-none font-medium" 
                      />
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Endereço Residencial (Preenchido auto via CEP)</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                      <input type="text" value={editingInstructor.address || ''} onChange={(e) => setEditingInstructor({...editingInstructor, address: e.target.value})} placeholder="Rua, Número, Bairro, Cidade - UF" className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 outline-none font-medium" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção 3: Carreira e Graduação */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                  <GraduationCap size={14} /> Graduação & Carreira
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase ml-1 mb-2">Graus na Faixa Atual</label>
                      <div className={`flex items-center justify-between border-2 transition-all rounded-2xl px-5 py-4 shadow-inner ${BELT_COLORS[editingInstructor.belt || Belt.WHITE]}`}>
                        <button type="button" onClick={() => setEditingInstructor({...editingInstructor, stripes: Math.max(0, (editingInstructor.stripes || 0) - 1)})} className="text-white/50 hover:scale-125 transition-all outline-none md:p-2"><Minus size={20} /></button>
                        <div className={`flex gap-1.5 p-1 rounded-md px-3 bg-opacity-90 ${editingInstructor.belt === Belt.BLACK ? 'bg-red-600' : 'bg-zinc-900 shadow-lg'}`}>
                          {[...Array(editingInstructor.belt === Belt.BLACK ? 6 : 4)].map((_, i) => (
                            <div 
                              key={i} 
                              className={`w-2.5 h-7 rounded-sm transition-all ${i < (editingInstructor.stripes || 0) ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)] scale-y-110' : 'bg-white/10'}`} 
                            />
                          ))}
                        </div>
                        <button type="button" onClick={() => setEditingInstructor({...editingInstructor, stripes: Math.min(editingInstructor.belt === Belt.BLACK ? 6 : 4, (editingInstructor.stripes || 0) + 1)})} className="text-white/50 hover:scale-125 transition-all outline-none md:p-2"><Plus size={20} /></button>
                      </div>
                      <p className="text-[9px] text-slate-400 mt-1 ml-1 font-medium">
                        {editingInstructor.belt === Belt.BLACK ? 'Faixa preta possui até 6 graus.' : 'Faixas coloridas possuem até 4 graus.'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase ml-1 mb-2 flex items-center gap-1">
                        <CalendarClock size={12} /> Data da Última Graduação
                      </label>
                      <input type="date" value={editingInstructor.lastGraduationDate || ''} onChange={(e) => setEditingInstructor({...editingInstructor, lastGraduationDate: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none font-medium" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase ml-1 mb-2">Especialidades / Foco</label>
                      <input type="text" value={editingInstructor.specialties || ''} onChange={(e) => setEditingInstructor({...editingInstructor, specialties: e.target.value})} placeholder="Ex: Kids, No-Gi, Competição..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none font-medium" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Selecione a Graduação</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {allBeltOptions.map(belt => (
                        <button
                          key={belt}
                          onClick={() => setEditingInstructor({...editingInstructor, belt})}
                          className={`px-2 py-2 rounded-lg border text-[9px] font-black transition-all ${
                            editingInstructor.belt === belt 
                              ? `${BELT_COLORS[belt]} shadow-md transform scale-105 ring-2 ring-offset-1 ring-slate-100` 
                              : 'bg-white text-slate-400 border-slate-200 hover:border-slate-400'
                          }`}
                        >
                          {belt.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção 4: Documentação e Anexos */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                    <FileText size={14} /> Documentação e Contratos
                  </h3>
                  <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-colors">
                    <Upload size={14} /> Anexar Arquivo
                  </button>
                  <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {editingInstructor.documents && editingInstructor.documents.length > 0 ? (
                    editingInstructor.documents.map(doc => (
                      <div key={doc.id} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-center justify-between group hover:border-indigo-200 transition-all">
                        <div className="flex items-center gap-3">
                          <div className="bg-white p-2 rounded-xl text-slate-400 group-hover:text-indigo-600 transition-colors shadow-sm">
                            <FileIcon size={20} />
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-sm font-bold text-slate-700 truncate max-w-[150px]">{doc.name}</p>
                            <p className="text-[10px] text-slate-400 font-medium">{(doc.size / 1024).toFixed(1)} KB</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => downloadFile(doc)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all"><Download size={18} /></button>
                          <button onClick={() => deleteDocument(doc.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-white rounded-lg transition-all"><Trash2 size={18} /></button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full py-8 flex flex-col items-center justify-center bg-slate-50 border border-dashed border-slate-200 rounded-3xl text-slate-400">
                      <p className="text-xs font-medium">Sem documentos anexados.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Seção 5: Observações de Saúde */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                  <Activity size={14} /> Histórico de Saúde / Restrições
                </h3>
                <textarea rows={3} placeholder="Alergias, cirurgias recentes ou condições crônicas que o mestre possua..." value={editingInstructor.medicalNotes || ''} onChange={(e) => setEditingInstructor({...editingInstructor, medicalNotes: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 outline-none font-medium text-sm focus:ring-2 focus:ring-indigo-500" />
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-3 pt-6 pb-12 md:pb-2 border-t border-slate-100 sticky -bottom-1 bg-white z-10 mt-auto">
                <button 
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="flex-1 bg-white hover:bg-red-50 text-red-500 font-bold py-4 rounded-2xl transition-all border border-slate-200 shadow-sm"
                >
                  <Trash2 size={20} className="inline mr-2" /> Excluir
                </button>
                <button 
                  onClick={handleSaveInstructor}
                  className="flex-[2] bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-2xl shadow-xl transition-all"
                >
                  <Save size={20} className="inline mr-2" /> Salvar Ficha
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {isDeleteModalOpen && editingInstructor && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[40px] p-8 animate-in zoom-in duration-300 shadow-2xl text-center">
            <div className="bg-red-100 w-20 h-20 rounded-full flex items-center justify-center text-red-600 mx-auto mb-6">
              <AlertTriangle size={40} />
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-2">Excluir Professor?</h2>
            <p className="text-sm text-slate-500 font-medium mb-8 leading-relaxed">
              Deseja realmente remover o professor <span className="text-slate-900 font-bold">{editingInstructor.name}</span>? 
              Todos os registros e documentos dele serão apagados permanentemente.
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleDeleteInstructor}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-5 rounded-3xl shadow-xl shadow-red-600/20 transition-all active:scale-95"
              >
                Sim, Remover Mestre
              </button>
              <button 
                onClick={() => setIsDeleteModalOpen(false)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-5 rounded-3xl transition-all active:scale-95"
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

export default InstructorsView;
