import React, { useState, useEffect, useRef } from 'react';
import { User, Instructor, Academy, Belt, StudentDocument, Staff } from '../types';
import { instructorService } from '@/features/instructors/services/instructorService';
import { staffService } from '@/features/staff/services/staffService';
import {
  User as UserIcon,
  Phone,
  Award,
  Save,
  Camera,
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
  Plus,
  Minus,
  Heart,
  MapPin
} from 'lucide-react';
import { fetchAddressByCep, maskCEP, maskPhone, maskCPF, maskRG } from '../services/cep';
import { BELT_COLORS } from '../constants';
import { useTranslation } from '../services/LanguageContext';
import { DateSelectInput } from '@/components/ui';

const Loader2 = ({ size, className }: { size: number, className: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

interface InstructorProfileViewProps {
  user: User;
  academy: Academy;
}

const InstructorProfileView: React.FC<InstructorProfileViewProps> = ({ user, academy }) => {
  const { t, showNotification } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<Instructor | Staff | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Instructor | Staff | null>(null);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true);
      try {
        // Match por userId (não por e-mail) — evita pegar a ficha errada quando duas fichas
        // compartilham o mesmo e-mail cadastrado.
        if (user.role === 'instructor') {
          const res = await instructorService.getAll(academy.id, { limit: 1000 });
          const found = res.data.find((i: any) => i.userId === (user as any).id)
            ?? res.data.find(i => i.email?.toLowerCase() === user.email?.toLowerCase())
            ?? null;
          if (found) {
            const full = await instructorService.getById(found.id);
            setProfile(full);
            setEditData(JSON.parse(JSON.stringify(full)));
          } else {
            setProfile(null);
            setEditData(null);
          }
        } else if (user.role === 'staff') {
          const res = await staffService.getAll(academy.id, { limit: 1000 });
          const found = res.data.find((s: any) => s.userId === (user as any).id)
            ?? res.data.find(s => s.email?.toLowerCase() === user.email?.toLowerCase())
            ?? null;
          setProfile(found);
          setEditData(found ? JSON.parse(JSON.stringify(found)) : null);
        } else {
          setProfile(null);
          setEditData(null);
        }
      } catch (err) {
        console.error('Erro ao carregar perfil:', err);
        setProfile(null);
        setEditData(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [academy.id, user.email, user.role]);

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

  const handleSave = async () => {
    if (!editData || !editData.id) return;

    setIsSaving(true);
    try {
      if (user.role === 'instructor') {
        await instructorService.update(editData.id, editData as Instructor);

        const newDocs = ((editData as Instructor).documents || []).filter(d => d.id.length < 32);
        for (const doc of newDocs) {
          await instructorService.addDocument(editData.id, {
            name: doc.name,
            type: doc.type,
            size: doc.size,
            base64: doc.base64,
          });
        }

        const full = await instructorService.getById(editData.id);
        setProfile(full);
        setEditData(JSON.parse(JSON.stringify(full)));
      } else if (user.role === 'staff') {
        const updated = await staffService.update(editData.id, editData as Staff);
        setProfile(updated);
        setEditData(JSON.parse(JSON.stringify(updated)));
      }
      setIsEditing(false);
      showNotification('Seus dados foram atualizados com sucesso! OSS!', 'success');
    } catch (err) {
      console.error('Erro ao salvar perfil:', err);
      showNotification('Erro ao salvar. Tente novamente.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editData) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setEditData({ ...editData, photo: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editData) return;

    if (file.size > 2000000) {
      alert("Arquivo muito grande. O limite é de 2MB.");
      return;
    }

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

      setEditData({
        ...editData,
        documents: [...(editData.documents || []), newDoc]
      });
      showNotification("Arquivo anexado! Salve para confirmar.");
    };
    reader.readAsDataURL(file);
  };

  const deleteDocument = async (docId: string) => {
    if (!editData?.id) return;
    try {
      let updated;
      if (user.role === 'instructor') {
        updated = await instructorService.deleteDocument(editData.id, docId);
      } else if (user.role === 'staff') {
        updated = await staffService.deleteDocument(editData.id, docId);
      } else return;
      setProfile(updated);
      setEditData(JSON.parse(JSON.stringify(updated)));
      showNotification('Documento removido.', 'delete');
    } catch (e) {
      console.error(e);
      showNotification('Erro ao remover documento. Tente novamente.', 'error');
    }
  };

  const downloadFile = (doc: StudentDocument) => {
    const link = document.createElement('a');
    link.href = doc.base64;
    link.download = doc.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-6 animate-pulse">
        <div className="w-24 h-24 bg-indigo-100 dark:bg-slate-800 rounded-[40px] flex items-center justify-center text-indigo-600">
          <Loader2 size={40} className="animate-spin" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase italic tracking-tight">Carregando Ficha...</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Sincronizando seus dados, OSS!</p>
        </div>
      </div>
    );
  }

  if (!profile || !editData) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-6">
        <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-[40px] flex items-center justify-center text-slate-400">
          <UserIcon size={40} strokeWidth={1} />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase italic tracking-tight">Perfil Não Encontrado</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Nenhum registro encontrado para este e-mail. Contate o administrador.</p>
        </div>
      </div>
    );
  }

  const isInstructor = user.role === 'instructor';

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-50 dark:bg-indigo-900/30 p-3 rounded-2xl text-indigo-600 dark:text-indigo-400 shrink-0">
            {isInstructor ? <Award size={32} /> : <Briefcase size={32} />}
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white uppercase italic tracking-tighter leading-tight">
              {isInstructor ? 'Ficha do Professor' : 'Meus Dados'}
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              Identificador: {profile.id}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {isEditing ? (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full sm:w-auto bg-emerald-600 text-white px-5 py-3.5 rounded-2xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 animate-in fade-in zoom-in duration-300 disabled:opacity-60"
            >
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              <span className="text-[10px] font-black uppercase tracking-widest">{isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
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
        </div>
      </div>

<div className="space-y-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[40px] p-4 sm:p-6 md:p-10 shadow-sm transition-colors">

        {/* Dados Pessoais */}
        <section className="space-y-8">
          <h3 className="text-xs font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-2">
            <UserCheck size={16} /> DADOS PESSOAIS
          </h3>

          <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-start">
            {/* Foto */}
            <div className="flex flex-col items-center gap-4 shrink-0 mx-auto md:mx-0">
               <div className="w-40 h-40 rounded-[48px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden relative group shadow-inner transition-colors">
                {editData.photo ? (
                  <img src={editData.photo} alt={editData.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                    <UserIcon size={56} strokeWidth={1} />
                    <span className="text-[10px] font-black uppercase tracking-widest mt-2">Sem Foto</span>
                  </div>
                )}
                {isEditing && (
                  <div
                    onClick={() => photoInputRef.current?.click()}
                    className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white"
                  >
                    <Camera size={32} />
                    <span className="text-[10px] font-black uppercase tracking-widest mt-2">Alterar Foto</span>
                  </div>
                )}
              </div>
              <input type="file" ref={photoInputRef} accept="image/*" className="hidden" onChange={handlePhotoCapture} />
            </div>

            {/* Campos */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
              <div className="md:col-span-2">
                <FieldInput label="Nome Completo *" disabled={!isEditing}
                  value={editData.name}
                  onChange={v => setEditData({...editData, name: v})}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Sexo</label>
                <select
                  disabled={!isEditing}
                  value={editData.gender || ''}
                  onChange={(e) => setEditData({...editData, gender: e.target.value as any})}
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 outline-none font-bold text-slate-700 dark:text-white transition-all disabled:opacity-60"
                >
                  <option value="">Selecionar</option>
                  <option value="Masculino">{t.male}</option>
                  <option value="Feminino">{t.female}</option>
                  <option value="Outro">{t.other}</option>
                </select>
              </div>
              <div>
                <DateSelectInput label="Nascimento *" disabled={!isEditing}
                  value={(editData.birthDate || '').split('T')[0]}
                  onChange={v => setEditData({...editData, birthDate: v})}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Estado Civil</label>
                <select
                  disabled={!isEditing}
                  value={(editData as Instructor).maritalStatus || ''}
                  onChange={(e) => setEditData({...editData, maritalStatus: e.target.value as any})}
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 outline-none font-bold text-slate-700 dark:text-white transition-all disabled:opacity-60"
                >
                  <option value="">Selecionar</option>
                  <option value="Solteiro">Solteiro(a)</option>
                  <option value="Casado">Casado(a)</option>
                  <option value="Divorciado">Divorciado(a)</option>
                  <option value="Viúvo">Viúvo(a)</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
              <div>
                <FieldInput label="CPF" disabled={!isEditing}
                  value={editData.cpf || ''}
                  onChange={v => setEditData({...editData, cpf: maskCPF(v)})}
                  placeholder="000.000.000-00"
                />
              </div>
              <div>
                <FieldInput label="RG" disabled={!isEditing}
                  value={editData.rg || ''}
                  onChange={v => setEditData({...editData, rg: maskRG(v)})}
                  placeholder="00.000.000-0"
                />
              </div>
              <div>
                <FieldInput label="Peso (kg)" disabled={!isEditing}
                  value={String((editData as any).weight || '')}
                  onChange={v => setEditData({...editData, weight: v} as any)}
                  placeholder="Ex: 80"
                />
              </div>
              <div>
                <FieldInput label="Altura (cm)" disabled={!isEditing}
                  value={String((editData as any).height || '')}
                  onChange={v => setEditData({...editData, height: v} as any)}
                  placeholder="Ex: 180"
                />
              </div>
              <div>
                <FieldInput label="Tipo Sanguíneo" disabled={!isEditing}
                  value={(editData as any).bloodType || ''}
                  onChange={v => setEditData({...editData, bloodType: v} as any)}
                  placeholder="Ex: O+"
                />
              </div>
              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-[10px] font-black text-indigo-500 uppercase mb-2 ml-1">E-mail Profissional (Login) *</label>
                <input
                  disabled={true}
                  type="email"
                  value={editData.email || ''}
                  className="w-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 outline-none font-bold text-slate-400 dark:text-slate-500 transition-all cursor-not-allowed"
                />
                <p className="text-[9px] font-bold text-slate-400 mt-2 ml-1 uppercase tracking-widest italic">* O e-mail de acesso não pode ser alterado e deve ser usado para login.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Contato & Localização */}
        <section className="space-y-8 pt-12 border-t border-slate-100 dark:border-slate-800">
          <h3 className="text-xs font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-2">
            <Phone size={16} /> CONTATO & LOCALIZAÇÃO
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="md:col-span-2 lg:col-span-3">
               <FieldInput label="WhatsApp" type="tel" disabled={!isEditing}
                  value={editData.phone || ''}
                  onChange={v => setEditData({...editData, phone: maskPhone(v)})}
                  placeholder="(00) 00000-0000"
                />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 flex items-center justify-between">
                CEP {isLoadingCep && <Loader2 size={12} className="animate-spin text-indigo-500" />}
              </label>
              <div className="relative">
                <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  disabled={!isEditing}
                  type="text"
                  value={editData.cep || ''}
                  onChange={(e) => handleCepLookup(e.target.value)}
                  placeholder="00000-000"
                  className="w-full pl-10 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 outline-none font-bold text-slate-800 dark:text-white transition-all disabled:opacity-60"
                />
              </div>
            </div>
            <div>
              <FieldInput label="Número" disabled={!isEditing}
                value={editData.addressNumber || ''}
                onChange={v => setEditData({...editData, addressNumber: v})}
                placeholder="Ex: 123"
              />
            </div>
            <div>
              <FieldInput label="Endereço Completo" disabled={!isEditing}
                value={editData.address || ''}
                onChange={v => setEditData({...editData, address: v})}
                placeholder="Rua, Bairro, Cidade - UF"
              />
            </div>
          </div>
        </section>

        {/* Contato de Emergência */}
        <section className="space-y-8 pt-12 border-t border-slate-100 dark:border-slate-800">
          <h3 className="text-xs font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-2">
            <Activity size={16} /> EMERGÊNCIA
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FieldInput label="Contato de Emergência" disabled={!isEditing}
              value={(editData as any).emergencyContact || ''}
              onChange={v => setEditData({...editData, emergencyContact: v} as any)}
              placeholder="Nome do contato"
            />
            <FieldInput label="Telefone de Emergência" type="tel" disabled={!isEditing}
              value={(editData as any).emergencyPhone || ''}
              onChange={v => setEditData({...editData, emergencyPhone: maskPhone(v)} as any)}
              placeholder="(00) 00000-0000"
            />
          </div>
        </section>

        {/* Carreira & Graduação — somente instrutor */}
        {isInstructor && (
          <section className="space-y-8 pt-12 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-2">
              <GraduationCap size={16} /> CARREIRA & GRADUAÇÃO
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-3">Graus na Faixa Atual</label>
                  <div className={`flex items-center justify-between border-2 transition-all rounded-[32px] px-6 py-4 shadow-inner ${(editData as Instructor).belt ? BELT_COLORS[(editData as Instructor).belt] : 'bg-slate-900 border-slate-800'}`}>
                    <button
                      disabled={!isEditing}
                      onClick={() => setEditData({ ...editData, stripes: Math.max(0, ((editData as Instructor).stripes || 0) - 1) } as Instructor)}
                      className="bg-black/30 hover:bg-black/50 border border-white/20 text-white rounded-xl p-2 transition-all outline-none disabled:opacity-40"
                    >
                      <Minus size={20} />
                    </button>
                    <div className={`flex gap-2 p-1.5 rounded-lg px-4 bg-opacity-90 ${(editData as Instructor).belt === Belt.BLACK ? 'bg-red-600' : 'bg-slate-950 shadow-2xl shadow-indigo-500/20'}`}>
                       {[...Array((editData as Instructor).belt === Belt.BLACK ? 6 : 4)].map((_, i) => (
                        <div
                          key={i}
                          className={`w-3 h-8 rounded-sm transition-all ${i < ((editData as Instructor).stripes || 0) ? 'bg-white shadow-[0_0_12px_rgba(255,255,255,0.7)] scale-y-110' : 'bg-white/10'}`}
                        />
                      ))}
                    </div>
                    <button
                      disabled={!isEditing}
                      onClick={() => setEditData({ ...editData, stripes: Math.min((editData as Instructor).belt === Belt.BLACK ? 6 : 4, ((editData as Instructor).stripes || 0) + 1) } as Instructor)}
                      className="bg-black/30 hover:bg-black/50 border border-white/20 text-white rounded-xl p-2 transition-all outline-none disabled:opacity-40"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </div>

                <DateSelectInput label="Data da Última Graduação" disabled={!isEditing}
                  value={((editData as Instructor).lastGraduationDate || '').split('T')[0]}
                  onChange={v => setEditData({...editData, lastGraduationDate: v} as Instructor)}
                  yearFrom={2000}
                />

                <FieldInput label="Minhas Especialidades" disabled={!isEditing}
                  value={(editData as Instructor).specialties || ''}
                  onChange={v => setEditData({...editData, specialties: v} as Instructor)}
                  placeholder="Ex: Kids, No-Gi, Competição..."
                />
              </div>

              <div className="space-y-4">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Graduação Atual</label>
                <div className="grid grid-cols-3 gap-3">
                  {[Belt.WHITE, Belt.BLUE, Belt.PURPLE, Belt.BROWN, Belt.BLACK, Belt.CORAL, Belt.RED].map((belt) => (
                    <button
                      key={belt}
                      disabled={!isEditing}
                      onClick={() => setEditData({...editData, belt} as Instructor)}
                      className={`py-3 px-1 rounded-2xl border-2 text-[8px] font-black uppercase tracking-tighter transition-all ${
                        (editData as Instructor).belt === belt
                          ? `${BELT_COLORS[belt]} shadow-lg scale-105 ring-4 ring-indigo-500/10`
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
        )}

        {/* Documentos */}
        <section className="space-y-8 pt-12 border-t border-slate-100 dark:border-slate-800">
           <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-2">
              <FileText size={16} /> MEUS DOCUMENTOS
            </h3>
            {isEditing && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
              >
                <Upload size={14} /> Anexar Arquivo
              </button>
            )}
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {editData.documents && editData.documents.length > 0 ? (
              editData.documents.map(doc => (
                <div key={doc.id} className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl flex items-center justify-between group hover:border-indigo-200 dark:hover:border-indigo-800 transition-all shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="bg-white dark:bg-slate-800 p-2 rounded-xl text-slate-400 shadow-sm transition-colors group-hover:text-indigo-600">
                      <FileIcon size={20} />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate max-w-[150px]">{doc.name}</p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {doc.size ? `${(doc.size / 1024).toFixed(1)} KB • ` : ''}{new Date(doc.uploadedAt).toLocaleDateString()}
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
              <div className="col-span-full py-10 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-700 rounded-[32px] text-slate-400">
                <FileText size={32} className="mb-2 opacity-20" />
                <p className="text-xs font-bold uppercase tracking-widest opacity-60">Nenhum documento anexado ainda</p>
              </div>
            )}
          </div>
        </section>

        {/* Saúde */}
        <section className="space-y-8 pt-12 border-t border-slate-100 dark:border-slate-800">
          <h3 className="text-xs font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-2">
            <Heart size={16} /> OBSERVAÇÕES DE SAÚDE
          </h3>
          <textarea
            disabled={!isEditing}
            rows={4}
            value={editData.medicalNotes || ''}
            onChange={(e) => setEditData({...editData, medicalNotes: e.target.value})}
            placeholder="Alergias, medicamentos contínuos, cirurgias recentes ou problemas de saúde..."
            className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-3xl px-6 py-5 outline-none font-bold text-slate-800 dark:text-white transition-all focus:ring-4 focus:ring-indigo-500/10 placeholder:text-slate-300 disabled:opacity-60"
          />
        </section>

        {/* Histórico de Graduação — somente instrutor */}
        {isInstructor && (
          <section className="space-y-8 pt-12 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-2">
                <CalendarClock size={16} /> HISTÓRICO DE GRADUAÇÃO
              </h3>
              {isEditing && (
                <button
                  onClick={() => {
                    const newItem = {
                      id: 'hist_' + Math.random().toString(36).substr(2, 9),
                      previousBelt: (editData as Instructor).belt,
                      newBelt: (editData as Instructor).belt,
                      previousStripes: (editData as Instructor).stripes,
                      newStripes: (editData as Instructor).stripes,
                      date: new Date().toISOString().split('T')[0]
                    };
                    setEditData({
                      ...editData,
                      graduationHistory: [...((editData as Instructor).graduationHistory || []), newItem]
                    } as Instructor);
                  }}
                  className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                >
                  <Plus size={14} /> Registrar Faixa
                </button>
              )}
            </div>

            <div className="space-y-3">
              {(editData as Instructor).graduationHistory && (editData as Instructor).graduationHistory!.length > 0 ? (
                (editData as Instructor).graduationHistory!.map((item) => (
                  <div key={item.id} className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-5 rounded-3xl flex items-center justify-between group shadow-sm transition-all hover:border-indigo-200">
                    <div className="flex items-center gap-6">
                      <div className="text-[10px] font-black text-slate-400 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                        {new Date(item.date).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black uppercase text-slate-400">{item.previousBelt}</span>
                        <div className="w-8 h-px bg-slate-200 dark:bg-slate-700 relative">
                          <div className="absolute -right-1 -top-[3px] w-2 h-2 border-r border-t border-slate-200 dark:border-slate-700 rotate-45" />
                        </div>
                        <span className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400">{item.newBelt}</span>
                      </div>
                    </div>
                    {isEditing && (
                      <button
                        onClick={() => {
                          const updated = (editData as Instructor).graduationHistory!.filter(h => h.id !== item.id);
                          setEditData({...editData, graduationHistory: updated} as Instructor);
                        }}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-10 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-700 rounded-[32px] text-slate-400">
                  <Award size={32} className="mb-2 opacity-20" />
                  <p className="text-xs font-bold uppercase tracking-widest opacity-60">Nenhum histórico registrado</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Botões de ação */}
        <div className="flex flex-col md:flex-row gap-4 pt-10 border-t border-slate-100 dark:border-slate-800">
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
                disabled={isSaving}
                className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white py-5 rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                Salvar Ficha Completa
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white py-5 rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-600/20 active:scale-95 transition-all"
            >
              Editar Meus Dados
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

const FieldInput: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
}> = ({ label, value, onChange, type = 'text', placeholder, disabled }) => (
  <div className="space-y-1">
    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">{label}</label>
    <input
      disabled={disabled}
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 outline-none font-bold text-slate-800 dark:text-white transition-all disabled:opacity-60"
    />
  </div>
);

export default InstructorProfileView;
