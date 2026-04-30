import React, { useState, useEffect, useRef } from 'react';
import { User, Student, Academy, Belt, StudentDocument } from '../types';
import { StorageService } from '../services/storage';
import { 
  User as UserIcon, 
  MapPin, 
  Phone, 
  Award, 
  Calendar as CalendarIcon, 
  CreditCard, 
  Shield, 
  Save, 
  ArrowLeft,
  ChevronRight,
  Camera,
  Heart,
  QrCode,
  UserCheck,
  FileText,
  Upload,
  FileIcon,
  Download,
  Trash2,
  GraduationCap,
  CalendarClock,
  Activity,
  Briefcase,
  Users as UsersIcon,
  AlertCircle,
  CheckCircle2,
  X,
  Printer,
  Share2,
  Shirt,
  TrendingUp
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { fetchAddressByCep, maskCEP, maskPhone, maskCPF, maskRG } from '../services/cep';
import { BELT_COLORS } from '../constants';

import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  ResponsiveContainer 
} from 'recharts';

const Loader2 = ({ size, className }: { size: number, className: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

interface StudentProfileViewProps {
  user: User;
  academy: Academy;
}

const StudentProfileView: React.FC<StudentProfileViewProps> = ({ user, academy }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<Student | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Student | null>(null);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Simulando um loading pequeno para garantir estabilidade visual
    const timer = setTimeout(() => {
      const students = StorageService.getStudents();
      const found = students.find(s => s.email?.toLowerCase() === user.email?.toLowerCase());
      
      if (found) {
        setProfile(found);
        setEditData(JSON.parse(JSON.stringify(found)));
      } else {
        const defaultProfile: Student = {
          id: `s_${Math.random().toString(36).substr(2, 9)}`,
          academyId: academy.id,
          name: user.name,
          email: user.email,
          belt: Belt.WHITE,
          stripes: 0,
          joinDate: new Date().toISOString(),
          status: 'Active',
          totalClasses: 0,
          totalHours: 0,
          absentCount: 0,
          birthDate: '',
          hasLoanedKimono: false,
          documents: []
        };
        setProfile(defaultProfile);
        setEditData(JSON.parse(JSON.stringify(defaultProfile)));
      }
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [academy.id, user.email, user.name]);

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return 0;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
};

const handleCepLookup = async (value: string) => {
  if (!editData) return;
  const masked = maskCEP(value);
  setEditData({ ...editData, cep: masked });

  if (masked.replace(/\D/g, '').length === 8) {
    setIsLoadingCep(true);
    const addressData = await fetchAddressByCep(masked);
    if (addressData) {
      setEditData(prev => prev ? {
        ...prev,
        address: addressData.fullAddress
      } : null);
    }
    setIsLoadingCep(false);
  }
};

const handleSave = () => {
    if (!editData) return;
    
    const allStudents = StorageService.getStudents();
    const exists = allStudents.some(s => s.id === editData.id);
    
    let updatedStudents: Student[];
    if (exists) {
      updatedStudents = allStudents.map(s => s.id === editData.id ? editData : s);
    } else {
      updatedStudents = [...allStudents, editData];
    }
    
    StorageService.saveStudents(updatedStudents);
    setProfile(editData);
    setIsEditing(false);
    setMessage({ type: 'success', text: 'Sua ficha foi atualizada com sucesso! OSS!' });
    setTimeout(() => setMessage(null), 3000);
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editData) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setEditData({ ...editData, photo: base64String });
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editData) return;

    if (file.size > 1000000) { 
      alert("Arquivo muito grande. O limite para documentos é de 1MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const newDoc: StudentDocument = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        type: file.type,
        size: file.size,
        base64: base64String,
        uploadedAt: new Date().toISOString()
      };

      setEditData({
        ...editData,
        documents: [...(editData.documents || []), newDoc]
      });
    };
    reader.readAsDataURL(file);
  };

  const deleteDocument = (docId: string) => {
    if (!editData) return;
    setEditData({
      ...editData,
      documents: editData.documents?.filter(d => d.id !== docId) || []
    });
  };

  const downloadFile = (doc: StudentDocument) => {
    const link = document.createElement('a');
    link.href = doc.base64;
    link.download = doc.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading || !profile || !editData) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-6 animate-pulse">
        <div className="w-24 h-24 bg-indigo-100 dark:bg-slate-800 rounded-[40px] flex items-center justify-center text-indigo-600">
          <Loader2 size={40} className="animate-spin" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase italic tracking-tight">Carregando Ficha...</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Sincronizando com a academia, OSS!</p>
        </div>
      </div>
    );
  }

  const age = calculateAge(editData.birthDate);
  const isMinor = editData.birthDate ? age < 18 : false;

  // Gerar dados de performance baseados na graduação/aulas (Simulado para visual)
  const performanceData = [
    { subject: 'Técnica', A: Math.min(100, (profile.totalClasses * 0.5) + (profile.stripes * 10) + 20), fullMark: 100 },
    { subject: 'Força', A: Math.min(100, (profile.totalClasses * 0.3) + 40), fullMark: 100 },
    { subject: 'Gás', A: Math.min(100, (profile.totalClasses * 0.6) + 30), fullMark: 100 },
    { subject: 'Pressão', A: Math.min(100, (profile.stripes * 15) + (profile.belt === Belt.WHITE ? 20 : 50)), fullMark: 100 },
    { subject: 'Defesa', A: Math.min(100, (profile.totalClasses * 0.4) + 40), fullMark: 100 },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-in fade-in duration-700">
      {/* Header Premium - Estilo Ficha do Aluno */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-50 dark:bg-indigo-900/30 p-3 rounded-2xl text-indigo-600 dark:text-indigo-400 shrink-0">
            <GraduationCap size={32} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white uppercase italic tracking-tighter leading-tight">Ficha do Aluno</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              Cadastrado em {new Date(profile.joinDate).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {isEditing ? (
            <button 
              onClick={handleSave}
              className="w-full sm:w-auto bg-emerald-600 text-white px-5 py-3.5 rounded-2xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 animate-in fade-in zoom-in duration-300"
            >
              <Save size={18} />
              <span className="text-[10px] font-black uppercase tracking-widest">Salvar Alterações</span>
            </button>
          ) : (
            <button 
              onClick={() => setIsEditing(true)}
              className="w-full sm:w-auto bg-indigo-600 text-white px-5 py-3.5 rounded-2xl shadow-lg shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <FileText size={18} />
              <span className="text-[10px] font-black uppercase tracking-widest">Editar Perfil</span>
            </button>
          )}
          <div className="hidden md:flex items-center gap-2 ml-2 border-l border-slate-100 dark:border-slate-800 pl-4">
            <button 
              onClick={() => setIsQRModalOpen(true)}
              className="p-3 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-2xl transition-all"
              title="Minha Carteirinha Digital"
            >
              <QrCode size={24} />
            </button>
            <button 
              onClick={() => window.print()}
              className="p-3 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-2xl transition-all"
              title="Imprimir Ficha"
            >
              <Printer size={24} />
            </button>
          </div>
          <button 
            onClick={() => window.history.back()}
            className="p-3 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all ml-1"
            title="Fechar"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      {message && (
        <div className={`mx-1 p-5 rounded-[28px] flex items-center gap-4 animate-in zoom-in duration-300 mb-8 ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
        }`}>
          <CheckCircle2 size={24} />
          <span className="font-bold uppercase text-[10px] tracking-widest">{message.text}</span>
        </div>
      )}

      {/* Grid Principal Conteúdo (Igual à Ficha do Aluno do Admin) */}
      <div className="space-y-8 no-scrollbar bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[40px] p-4 sm:p-6 md:p-10 shadow-sm">
        {/* Alertas e Widgets Rápidos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {/* Gráfico de Performance (Radar) */}
          <div className="bg-slate-50 dark:bg-slate-800/30 p-6 sm:p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 flex flex-col items-center">
            <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-4 sm:mb-6 self-start">
              PERFORMANCE TÉCNICA
            </h3>
            <div className="w-full h-56 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={performanceData}>
                  <PolarGrid stroke="#cbd5e1" strokeOpacity={0.2} />
                  <PolarAngleAxis 
                    dataKey="subject" 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                  />
                  <Radar
                    name="Performance"
                    dataKey="A"
                    stroke="#4f46e5"
                    fill="#4f46e5"
                    fillOpacity={0.6}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[9px] font-medium text-slate-400 italic text-center mt-4">
              * Dados calculados com base em sua presença e graduação acumulada.
            </p>
          </div>

          <div className="space-y-4">
            {/* Card de Alerta Quimono */}
            {profile.hasLoanedKimono && (
              <div className="bg-gradient-to-r from-amber-500/10 to-amber-600/5 border-2 border-amber-500/30 p-6 rounded-[32px] flex items-center justify-between border-dashed animate-in zoom-in duration-500">
                <div className="flex items-center gap-5">
                  <div className="bg-amber-500 p-4 rounded-2xl text-white shadow-lg shadow-amber-500/20">
                    <Shirt size={28} />
                  </div>
                  <div>
                    <h3 className="font-black text-amber-800 text-lg uppercase tracking-tight italic leading-tight">Quimono Emprestado</h3>
                    <p className="text-amber-700/70 text-xs font-medium">Você está utilizando material da academia.</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="bg-indigo-600 p-8 rounded-[40px] text-white shadow-xl shadow-indigo-600/20 relative overflow-hidden group">
              <div className="relative z-10">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-2">Próxima Graduação</h4>
                <p className="text-3xl font-black italic tracking-tighter">
                  {Math.max(0, (profile.belt === Belt.WHITE ? 80 : 160) - profile.totalClasses)} <span className="text-sm">Aulas</span>
                </p>
                <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest mt-1">Estimativa para o próximo passo</p>
              </div>
              <TrendingUp size={100} className="absolute -bottom-6 -right-6 text-white/10 group-hover:scale-110 transition-transform duration-700" />
            </div>
          </div>
        </div>

        <div className="space-y-12">
          
          {/* Seção 1: Dados Pessoais */}
          <section className="space-y-6">
            <h3 className="text-xs font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-2 mb-8">
              <UserCheck size={16} /> DADOS PESSOAIS
            </h3>
            <div className="flex flex-col md:flex-row gap-10 items-start">
              <div className="flex flex-col items-center gap-4 shrink-0 mx-auto md:mx-0">
                <div className="w-40 h-40 rounded-[48px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden relative group shadow-inner">
                  {editData.photo ? (
                    <img src={editData.photo} alt={editData.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                      <UserIcon size={56} strokeWidth={1} />
                      <span className="text-[10px] font-black uppercase tracking-widest mt-2">Sem Foto</span>
                    </div>
                  )}
                  {isEditing && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-4">
                      <button 
                        onClick={() => cameraInputRef.current?.click()}
                        className="bg-indigo-600 text-white p-4 rounded-full shadow-xl hover:scale-110 transition-transform"
                        title="Tirar Foto Agora"
                      >
                        <Camera size={24} />
                      </button>
                      <button 
                        onClick={() => photoInputRef.current?.click()}
                        className="bg-white/20 text-white p-3 rounded-full hover:bg-white/40 transition-all"
                        title="Escolher da Galeria"
                      >
                        <Upload size={18} />
                      </button>
                    </div>
                  )}
                </div>
                {isEditing && (
                  <div className="grid grid-cols-2 gap-2 w-full">
                    <button 
                      onClick={() => cameraInputRef.current?.click()}
                      className="text-[9px] font-black uppercase tracking-widest text-white bg-indigo-600 py-3 rounded-2xl border border-indigo-500 shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                    >
                      <Camera size={14} /> CÂMERA
                    </button>
                    <button 
                      onClick={() => photoInputRef.current?.click()}
                      className="text-[9px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 py-3 rounded-2xl border border-indigo-100 dark:border-indigo-800 hover:bg-indigo-100 transition-all flex items-center justify-center gap-2"
                    >
                      <Upload size={14} /> GALERIA
                    </button>
                  </div>
                )}
                <input type="file" ref={photoInputRef} accept="image/*" className="hidden" onChange={handlePhotoCapture} />
                <input type="file" ref={cameraInputRef} accept="image/*" capture="user" className="hidden" onChange={handlePhotoCapture} />
              </div>

              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">NOME COMPLETO *</label>
                  <input 
                    disabled={!isEditing}
                    type="text" 
                    value={editData.name}
                    onChange={(e) => setEditData({...editData, name: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-indigo-500/10 outline-none font-bold text-slate-800 dark:text-white transition-all disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">SEXO *</label>
                  <select 
                    disabled={!isEditing}
                    value={editData.gender || ''}
                    onChange={(e) => setEditData({...editData, gender: e.target.value as any})}
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700 dark:text-white transition-all disabled:opacity-60"
                  >
                    <option value="">Selecionar</option>
                    <option value="M">Masculino</option>
                    <option value="F">Feminino</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">NASCIMENTO *</label>
                  <input 
                    disabled={!isEditing}
                    type="date" 
                    value={editData.birthDate}
                    onChange={(e) => setEditData({...editData, birthDate: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-indigo-500 outline-none font-black text-slate-800 dark:text-white text-lg transition-all disabled:opacity-60"
                  />
                </div>
                <div>
                  <Input label="CPF *" value={editData.cpf || ''} onChange={v => setEditData({...editData, cpf: maskCPF(v)})} placeholder="000.000.000-00" disabled={!isEditing} />
                </div>
                <div>
                  <Input label="RG" value={editData.rg || ''} onChange={v => setEditData({...editData, rg: maskRG(v)})} placeholder="00.000.000-0" disabled={!isEditing} />
                </div>
                <div>
                  <Input label="Peso (kg)" value={editData.weight || ''} onChange={v => setEditData({...editData, weight: v})} placeholder="Ex: 80" disabled={!isEditing} />
                </div>
                <div>
                  <Input label="Altura (cm)" value={editData.height || ''} onChange={v => setEditData({...editData, height: v})} placeholder="Ex: 180" disabled={!isEditing} />
                </div>
                <div>
                  <Input label="Tipo Sanguíneo" value={editData.bloodType || ''} onChange={v => setEditData({...editData, bloodType: v})} placeholder="Ex: O+" disabled={!isEditing} />
                </div>
              </div>
            </div>
          </section>

          {/* Seção 2: Contato e Localização */}
          <section className="space-y-6 pt-12 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-2 mb-8">
              <Phone size={16} /> CONTATO & ENDEREÇO
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">WHATSAPP *</label>
                <input 
                  disabled={!isEditing}
                  type="tel" 
                  value={editData.phone || ''}
                  onChange={(e) => setEditData({...editData, phone: maskPhone(e.target.value)})}
                  placeholder="(00) 00000-0000"
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800 dark:text-white transition-all disabled:opacity-60"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-2">
                  <Input 
                    label="CEP" 
                    value={editData.cep || ''} 
                    onChange={handleCepLookup} 
                    placeholder="00000-000"
                    disabled={!isEditing}
                    icon={isLoadingCep ? <Loader2 size={16} className="animate-spin text-indigo-500" /> : <MapPin size={16} />}
                  />
                </div>
                <div className="md:col-span-2">
                  <Input 
                    label="Número" 
                    value={editData.addressNumber || ''} 
                    onChange={v => setEditData({...editData, addressNumber: v})} 
                    placeholder="Ex: 123"
                    disabled={!isEditing}
                  />
                </div>
                <div className="md:col-span-8">
                  <Input 
                    label="Endereço Completo (Auto)" 
                    value={editData.address || ''} 
                    onChange={v => setEditData({...editData, address: v})} 
                    placeholder="Rua, Bairro, Cidade..." 
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Section: Emergência */}
          <section className="space-y-6 pt-12 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-2 mb-8">
              <Activity size={16} /> EMERGÊNCIA
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input 
                label="Contato de Emergência" 
                value={editData.emergencyContact || ''} 
                onChange={v => setEditData({...editData, emergencyContact: v})} 
                placeholder="Nome do contato" 
                disabled={!isEditing}
              />
              <Input 
                label="Telefone de Emergência" 
                value={editData.emergencyPhone || ''} 
                onChange={v => setEditData({...editData, emergencyPhone: maskPhone(v)})} 
                placeholder="(00) 00000-0000" 
                disabled={!isEditing}
              />
            </div>
          </section>

          {/* Seção 3: Responsável (Contextual) */}
          <section className={`space-y-6 pt-12 border-t border-slate-100 dark:border-slate-800 transition-all ${isMinor ? 'opacity-100' : 'opacity-40 grayscale pointer-events-none'}`}>
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xs font-black text-amber-600 uppercase tracking-[0.2em] flex items-center gap-2">
                <UsersIcon size={16} /> RESPONSÁVEL LEGAL {isMinor && <span className="bg-amber-100 text-amber-700 text-[8px] px-2 py-1 rounded-full ml-1 font-black">OBRIGATÓRIO</span>}
              </h3>
            </div>
            <div className="bg-amber-50/30 dark:bg-amber-900/10 rounded-3xl p-8 border border-amber-100 dark:border-amber-900/30 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <Input 
                  label="Nome do Responsável *" 
                  value={editData.guardianName || ''} 
                  onChange={v => setEditData({...editData, guardianName: v})} 
                  placeholder="Digite o nome do responsável" 
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Input 
                  label="Parentesco" 
                  value={editData.guardianRelation || ''} 
                  onChange={v => setEditData({...editData, guardianRelation: v})} 
                  placeholder="Ex: Mãe" 
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Input 
                  label="CPF do Responsável *" 
                  value={editData.guardianCpf || ''} 
                  onChange={v => setEditData({...editData, guardianCpf: maskCPF(v)})} 
                  placeholder="000.000.000-00" 
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Input 
                  label="WhatsApp do Responsável *" 
                  value={editData.guardianPhone || ''} 
                  onChange={v => setEditData({...editData, guardianPhone: maskPhone(v)})} 
                  placeholder="(00) 00000-0000" 
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Input 
                  label="RG do Responsável" 
                  value={editData.guardianRg || ''} 
                  onChange={v => setEditData({...editData, guardianRg: maskRG(v)})} 
                  placeholder="00.000.000-0" 
                  disabled={!isEditing}
                />
              </div>
              <div className="md:col-span-2">
                <Input 
                  label="E-mail do Responsável" 
                  type="email"
                  value={editData.guardianEmail || ''} 
                  onChange={v => setEditData({...editData, guardianEmail: v})} 
                  placeholder="email@exemplo.com" 
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Input 
                  label="Profissão do Responsável" 
                  value={editData.guardianProfession || ''} 
                  onChange={v => setEditData({...editData, guardianProfession: v})} 
                  placeholder="Ex: Professora" 
                  disabled={!isEditing}
                />
              </div>
            </div>
          </section>

          {/* Seção 4: Documentação */}
          <section className="space-y-6 pt-12 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xs font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-2">
                <FileText size={16} /> 4. DOCUMENTAÇÃO E ANEXOS
              </h3>
              {isEditing && (
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                >
                  <Upload size={14} /> Anexar
                </button>
              )}
              <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {editData.documents && editData.documents.length > 0 ? (
                editData.documents.map(doc => (
                  <div key={doc.id} className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl flex items-center justify-between group hover:border-indigo-200 dark:hover:border-indigo-800 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="bg-white dark:bg-slate-800 p-2 rounded-xl text-slate-400 shadow-sm">
                        <FileIcon size={20} />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate max-w-[150px]">{doc.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {(doc.size / 1024).toFixed(1)} KB • {new Date(doc.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => downloadFile(doc)}
                        className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-all"
                        title="Ver / Baixar"
                      >
                        <Download size={18} />
                      </button>
                      {isEditing && (
                        <button 
                          onClick={() => deleteDocument(doc.id)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-12 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-700 rounded-[32px] text-slate-400">
                  <AlertCircle size={32} className="mb-2 opacity-20" />
                  <p className="text-xs font-bold uppercase tracking-widest opacity-60">Nenhum documento anexado</p>
                </div>
              )}
            </div>
          </section>

          {/* Seção 5: Graduação & Faixa Atual */}
          <section className="space-y-6 pt-12 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-2 mb-8">
              <Award size={16} /> GRADUAÇÃO & FAIXA ATUAL
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Graus na Faixa</label>
                  <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-3xl border border-slate-100 dark:border-slate-800">
                    <button 
                      type="button"
                      disabled={!isEditing}
                      onClick={() => setEditData(prev => prev ? {...prev, stripes: Math.max(0, (prev.stripes || 0) - 1)} : null)}
                      className="w-10 h-10 rounded-full bg-white dark:bg-slate-700 shadow-sm border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 disabled:opacity-40"
                    >
                      -
                    </button>
                    <div className="flex-1 flex gap-2 justify-center">
                      {[...Array(4)].map((_, i) => (
                        <div 
                          key={i} 
                          className={`w-3 h-8 rounded-sm border ${i < (editData.stripes || 0) ? 'bg-white border-slate-300 shadow-sm' : 'bg-slate-200/50 dark:bg-slate-700/50 border-transparent'}`} 
                        />
                      ))}
                    </div>
                    <button 
                      type="button"
                      disabled={!isEditing}
                      onClick={() => setEditData(prev => prev ? {...prev, stripes: Math.min(4, (prev.stripes || 0) + 1)} : null)}
                      className="w-10 h-10 rounded-full bg-white dark:bg-slate-700 shadow-sm border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                  <p className="text-[9px] font-medium text-slate-400 italic ml-1">* Faixas coloridas possuem até 4 graus.</p>
                </div>

                <Input 
                  label="Data da última graduação" 
                  type="date"
                  value={editData.lastGraduationDate || ''} 
                  onChange={v => setEditData({...editData, lastGraduationDate: v})} 
                  disabled={!isEditing}
                />

                <div className="space-y-1">
                  <Input 
                    label="Total de aulas na ficha" 
                    value={String(editData.totalClasses || 0)} 
                    onChange={v => setEditData({...editData, totalClasses: parseInt(v) || 0})} 
                    disabled={!isEditing}
                  />
                  <p className="text-[9px] font-medium text-slate-400 italic ml-1">* Este número é usado para calcular a prontidão para graduação.</p>
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Selecione a Graduação</label>
                <div className="grid grid-cols-3 gap-3">
                  {Object.values(Belt).map((belt) => (
                    <button
                      key={belt}
                      disabled={!isEditing}
                      onClick={() => setEditData({...editData, belt})}
                      className={`py-3 px-2 rounded-2xl border-2 text-[8px] font-black uppercase tracking-widest transition-all ${
                        editData.belt === belt 
                          ? `${BELT_COLORS[belt]} shadow-lg shadow-indigo-500/10 scale-105 ring-4 ring-indigo-500/10` 
                          : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400 opacity-60 hover:opacity-100'
                      }`}
                    >
                      {belt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Seção 6: Observações Médicas & Status */}
          <section className="space-y-8 pt-12 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-2 mb-8">
              <Heart size={16} /> OBSERVAÇÕES MÉDICAS
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Status de Matrícula</label>
                  <select 
                    disabled={!isEditing}
                    value={editData.status || 'Active'}
                    onChange={(e) => setEditData({...editData, status: e.target.value as any})}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 outline-none font-bold text-slate-700 dark:text-white transition-all disabled:opacity-60"
                  >
                    <option value="Active">Ativo</option>
                    <option value="Inactive">Inativo</option>
                    <option value="Pending">Pendente</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Limite de faltas personalizado</label>
                  <select 
                    disabled={!isEditing}
                    value={editData.customAbsenceLimit || 'standard'}
                    onChange={(e) => setEditData({...editData, customAbsenceLimit: e.target.value as any})}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 outline-none font-bold text-slate-700 dark:text-white transition-all disabled:opacity-60"
                  >
                    <option value="standard">Usar padrão da academia</option>
                    <option value="strict">Rígido (Menos faltas)</option>
                    <option value="relaxed">Flexível (Mais faltas)</option>
                  </select>
                  <p className="text-[9px] font-medium text-slate-400 italic mt-2 ml-1">* Deixe vazio para usar o limite padrão da academia.</p>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Informações de saúde relevantes para o treino...</label>
                <textarea 
                  disabled={!isEditing}
                  rows={6}
                  value={editData.medicalNotes || ''}
                  onChange={(e) => setEditData({...editData, medicalNotes: e.target.value})}
                  placeholder="Ex: Alergias, lesões, cirurgias recentes, medicamentos, etc."
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-3xl px-6 py-5 outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-slate-700 dark:text-white transition-all resize-none disabled:opacity-60"
                />
              </div>
            </div>
          </section>
        </div>

        {/* Footer de Ações - Igual à Ficha do Aluno */}
        <div className="flex flex-col md:flex-row gap-4 pt-10 border-t border-slate-100 dark:border-slate-800 sticky bottom-0 bg-white dark:bg-slate-900 z-20 pb-2">
          {isEditing ? (
             <>
               <button 
                onClick={() => {
                  setEditData(JSON.parse(JSON.stringify(profile)));
                  setIsEditing(false);
                }}
                className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 py-5 rounded-3xl font-black uppercase text-xs tracking-widest active:scale-95 transition-all"
              >
                Cancelar Edição
              </button>
              <button 
                onClick={handleSave}
                className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white py-5 rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Save size={20} />
                Salvar Ficha Completa
              </button>
             </>
          ) : (
            <>
              <button 
                onClick={() => {
                  if (confirm("Deseja realmente solicitar a exclusão de sua ficha? Esta ação não pode ser desfeita pelo usuário.")) {
                    alert("Para excluir sua conta definitivamente, entre em contato com a administração da academia.");
                  }
                }}
                className="flex-1 bg-white hover:bg-red-50 text-red-500 py-5 rounded-3xl font-black uppercase text-xs tracking-widest active:scale-95 transition-all border border-slate-200 flex items-center justify-center gap-2"
              >
                <Trash2 size={20} />
                Excluir
              </button>
              <button 
                onClick={() => setIsEditing(true)}
                className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white py-5 rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-600/20 active:scale-95 transition-all"
              >
                Editar Meus Dados
              </button>
            </>
          )}
        </div>
      </div>

      {/* Modal Carteirinha Digital Premium (QR Code Expandido) */}
      {isQRModalOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setIsQRModalOpen(false)}
        >
          <div 
            className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[40px] p-8 animate-in zoom-in duration-300 shadow-2xl overflow-hidden relative cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Background Style */}
            <div className={`absolute top-0 left-0 w-full h-32 -z-10 ${getBeltHeaderColor(profile.belt)}`}>
               <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:10px_10px]"></div>
            </div>
            
            <div className="flex flex-col items-center text-center">
              <div className="flex items-center justify-between w-full mb-8 text-white">
                <div className="flex items-center gap-2">
                   <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
                      <CreditCard size={14} />
                   </div>
                   <span className="text-[10px] font-black uppercase tracking-[0.2em]">Membro Ativo</span>
                </div>
                <button 
                  onClick={() => setIsQRModalOpen(false)} 
                  className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className={`w-28 h-28 rounded-[36px] border-4 border-white dark:border-slate-800 shadow-xl flex items-center justify-center overflow-hidden mb-6 ${BELT_COLORS[profile.belt]}`}>
                {profile.photo ? (
                  <img src={profile.photo} alt={profile.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-black">{profile.name.charAt(0)}</span>
                )}
              </div>

              <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase italic tracking-tighter leading-none">{profile.name}</h3>
              <div className="flex items-center gap-2 mt-2">
                 <div className="bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                    {profile.belt} • {profile.stripes} Graus
                 </div>
              </div>
              
              <div className="my-10 p-6 bg-white rounded-3xl border-2 border-slate-50 shadow-inner">
                <QRCodeSVG 
                  value={profile.id}
                  size={180}
                  level="H"
                  includeMargin={false}
                />
              </div>

              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-10 leading-relaxed px-4">
                Apresente na entrada da ACADEMIA para check-in automático.
              </p>

              <div className="grid grid-cols-2 gap-4 w-full">
                <button 
                  onClick={() => window.print()}
                  className="flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-black text-[10px] uppercase py-5 rounded-3xl transition-all"
                >
                  <Printer size={18} />
                  Imprimir
                </button>
                <button 
                  className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase py-5 rounded-3xl transition-all shadow-xl shadow-indigo-600/20"
                >
                  <Share2 size={18} />
                  Compartilhar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Input: React.FC<{ label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; icon?: React.ReactNode; disabled?: boolean }> = ({ 
  label, value, onChange, type = 'text', placeholder, icon, disabled 
}) => (
  <div className="space-y-1">
    <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider ml-1 truncate">{label}</label>
    <div className="relative">
      {icon && <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">{icon}</div>}
      <input 
        disabled={disabled}
        type={type} 
        value={value} 
        onChange={e => onChange(e.target.value)} 
        placeholder={placeholder} 
        className={`w-full ${icon ? 'pl-11' : 'px-4'} py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none text-slate-800 dark:text-white transition-all font-bold text-sm disabled:opacity-60`}
      />
    </div>
  </div>
);

const getBeltHeaderColor = (belt: Belt) => {
  switch (belt) {
    case Belt.WHITE: return 'bg-slate-100';
    case Belt.BLUE: return 'bg-blue-600';
    case Belt.PURPLE: return 'bg-purple-700';
    case Belt.BROWN: return 'bg-amber-900';
    case Belt.BLACK: return 'bg-slate-900';
    default: return 'bg-indigo-600';
  }
};

export default StudentProfileView;

