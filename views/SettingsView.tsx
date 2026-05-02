
import React, { useState } from 'react';
import { Academy, User, Student, Instructor, Staff, AcademyPlan, Language } from '../types';
import { Settings, Bell, Shield, LogOut, ChevronRight, User as UserIcon, Palette, MapPin, Moon, Sun, X, CreditCard, Wallet, Loader2, Save, Phone, Mail, Eye, EyeOff, CheckCircle2, Crown, Zap, Star as StarIcon, Award, Trophy, Book, Users, Clock, Plus, Trash2, Calendar, Globe, AlertTriangle, Smartphone, Check } from 'lucide-react';
import { fetchAddressByCep, maskCEP, maskPhone } from '../services/cep';
import { PrivacyValue } from '../components/PrivacyValue';
import { StorageService } from '../services/storage';
import { getTranslation } from '../services/translations';

/**
 * Função para redimensionar e comprimir imagem Base64
 */
const compressImage = (base64Str: string, maxWidth = 300, maxHeight = 300): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
  });
};

interface SettingsViewProps {
  academy: Academy;
  user: User;
  onLogout: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onUpdateAcademy: (academy: Academy) => void;
  accentColor: string;
  onAccentColorChange: (color: string) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ 
  academy, 
  user, 
  onLogout, 
  theme, 
  onToggleTheme, 
  language, 
  onLanguageChange, 
  onUpdateAcademy,
  accentColor,
  onAccentColorChange
}) => {
  const t = getTranslation(language);
  const [isEditingAcademy, setIsEditingAcademy] = React.useState(false);
  const [isEditingNotifications, setIsEditingNotifications] = React.useState(false);
  const [isEditingPayment, setIsEditingPayment] = React.useState(false);
  const [isEditingProfile, setIsEditingProfile] = React.useState(false);
  const [isEditingPlans, setIsEditingPlans] = useState(false);
  const [isManagingAcademyPlans, setIsManagingAcademyPlans] = useState(false);
  const [isAddingAcademyPlan, setIsAddingAcademyPlan] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Partial<AcademyPlan> | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState<string | null>(null);
  const [showPlanNotification, setShowPlanNotification] = useState(false);
  const [editAcademy, setEditAcademy] = React.useState<Academy>(academy);
  const logoInputRef = React.useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      const compressed = await compressImage(base64String);
      setEditAcademy({ ...editAcademy, logo: compressed });
    };
    reader.readAsDataURL(file);
  };

  const [isLoadingCep, setIsLoadingCep] = useState(false);

  // Perfil do usuário logado
  const [userProfile, setUserProfile] = useState<Student | Instructor | Staff | null>(() => {
    if (user.role === 'student') return StorageService.getStudents().find(s => s.email === user.email) || null;
    if (user.role === 'instructor') return StorageService.getInstructors().find(i => i.email === user.email) || null;
    if (user.role === 'staff') return StorageService.getStaff().find(s => s.email === user.email) || null;
    return null;
  });

  const [editProfile, setEditProfile] = useState<Student | Instructor | Staff | null>(userProfile);

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>, isAcademy: boolean) => {
    const value = maskCEP(e.target.value);
    
    if (isAcademy) {
      setEditAcademy({ ...editAcademy, cep: value });
    } else if (editProfile) {
      setEditProfile({ ...editProfile, cep: value } as any);
    }

    if (value.replace(/\D/g, '').length === 8) {
      setIsLoadingCep(true);
      const addressData = await fetchAddressByCep(value);
      if (addressData) {
        if (isAcademy) {
          setEditAcademy(prev => ({ ...prev, address: addressData.fullAddress }));
        } else if (editProfile) {
          setEditProfile(prev => prev ? ({ ...prev, address: addressData.fullAddress }) as any : null);
        }
      }
      setIsLoadingCep(false);
    }
  };

  const handleSaveAcademy = () => {
    onUpdateAcademy(editAcademy);
    setIsEditingAcademy(false);
    setIsEditingNotifications(false);
    setIsEditingPayment(false);
  };

  const handleSaveProfile = () => {
    if (!editProfile) return;
    
    if (user.role === 'student') {
      const students = StorageService.getStudents();
      const updated = students.map(s => s.id === editProfile.id ? (editProfile as Student) : s);
      StorageService.saveStudents(updated);
    } else if (user.role === 'instructor') {
      const instructors = StorageService.getInstructors();
      const updated = instructors.map(i => i.id === editProfile.id ? (editProfile as Instructor) : i);
      StorageService.saveInstructors(updated);
    } else if (user.role === 'staff') {
      const staff = StorageService.getStaff();
      const updated = staff.map(s => s.id === editProfile.id ? (editProfile as Staff) : s);
      StorageService.saveStaff(updated);
    }

    setUserProfile(editProfile);
    setIsEditingProfile(false);
  };

  const handleSaveAcademyPlans = (updatedPlans: AcademyPlan[]) => {
    const updatedAcademy = { ...academy, plans: updatedPlans };
    onUpdateAcademy(updatedAcademy);
    setEditAcademy(updatedAcademy);
  };

  const deletePlan = (id: string) => {
    const updated = (editAcademy.plans || []).filter(p => p.id !== id);
    handleSaveAcademyPlans(updated);
  };

  const savePlan = () => {
    if (!editingPlan?.name) return;

    const plans = editAcademy.plans || [];
    let updated: AcademyPlan[];

    if (editingPlan.id) {
      updated = plans.map(p => p.id === editingPlan.id ? (editingPlan as AcademyPlan) : p);
    } else {
      const newPlanWithId: AcademyPlan = {
        ...editingPlan as AcademyPlan,
        id: Math.random().toString(36).substr(2, 9)
      };
      updated = [...plans, newPlanWithId];
    }

    handleSaveAcademyPlans(updated);
    setIsAddingAcademyPlan(false);
    setEditingPlan(null);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-10 transition-colors">
      <header>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{t.settings}</h1>
        <p className="text-slate-500 dark:text-slate-400">{t.welcome}<strong>{user.name}</strong>. {t.manageAccess}</p>
      </header>

      {(user.role === 'admin' || user.role === 'superuser') && academy && (
        <section className="space-y-4">
          <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-4">Gestão da Unidade</h2>
          <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm transition-colors divide-y divide-slate-50 dark:divide-slate-800">
            <SettingItem 
              icon={<Settings className="text-indigo-500" />} 
              title="Dados da Unidade" 
              subtitle={`${academy.name} • ${academy.ownerName}`} 
              onClick={() => {
                setEditAcademy(academy);
                setIsEditingAcademy(true);
              }}
            />
            <SettingItem icon={<Shield className="text-green-500" />} title={t.additionalUsers} subtitle={t.manageAccess} />
          </div>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-4">Personalização & Preferências</h2>
        <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm transition-colors divide-y divide-slate-50 dark:divide-slate-800">
          {/* Color Selector Block */}
          <div className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-slate-100 dark:bg-slate-800 w-10 h-10 rounded-xl flex items-center justify-center">
                <Palette size={20} className="text-indigo-600" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Cor da Unidade</h4>
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Identidade Visual do Sistema</p>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-3">
              {[
                { id: 'indigo', color: 'bg-[#4f46e5]', label: 'Indigo' },
                { id: 'azul', color: 'bg-[#2563eb]', label: 'Azul' },
                { id: 'roxo', color: 'bg-[#9333ea]', label: 'Roxo' },
                { id: 'verde', color: 'bg-[#10b981]', label: 'Verde' },
                { id: 'laranja', color: 'bg-[#f97316]', label: 'Laranja' },
                { id: 'amarelo', color: 'bg-[#eab308]', label: 'Amarelo' },
                { id: 'marrom', color: 'bg-[#5c4033]', label: 'Marrom' },
                { id: 'preto', color: 'bg-[#0f172a]', label: 'Preto' },
                { id: 'cinza', color: 'bg-[#64748b]', label: 'Cinza' },
                { id: 'branco', color: 'bg-[#94a3b8]', label: 'Clean' },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => onAccentColorChange(c.id)}
                  className={`group relative flex flex-col items-center gap-2 transition-all active:scale-95`}
                >
                  <div className={`w-12 h-12 rounded-2xl ${c.color} shadow-lg transition-all ${accentColor === c.id ? 'ring-4 ring-offset-4 dark:ring-offset-slate-900 ring-indigo-500 scale-110' : 'hover:scale-105'}`}>
                    {accentColor === c.id && (
                      <div className="absolute inset-0 flex items-center justify-center text-white">
                        <Check size={24} strokeWidth={4} />
                      </div>
                    )}
                  </div>
                  <span className={`text-[8px] font-black uppercase tracking-tighter ${accentColor === c.id ? 'text-indigo-600' : 'text-slate-400'}`}>
                    {c.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Theme Toggle */}
          <div className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-slate-100 dark:bg-slate-800 w-10 h-10 rounded-xl flex items-center justify-center">
                {theme === 'dark' ? <Sun size={20} className="text-amber-500" /> : <Moon size={20} className="text-slate-600" />}
              </div>
              <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{t.theme}</h4>
            </div>
            <button 
              onClick={onToggleTheme}
              className={`w-12 h-6 rounded-full p-1 transition-colors ${theme === 'dark' ? 'bg-indigo-600' : 'bg-slate-300'}`}
            >
              <div className={`bg-white w-4 h-4 rounded-full transition-transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Language Selector */}
          <div className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-slate-100 dark:bg-slate-800 w-10 h-10 rounded-xl flex items-center justify-center">
                <Globe size={20} className="text-indigo-600" />
              </div>
              <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{t.language}</h4>
            </div>
            <div className="flex bg-slate-50 dark:bg-slate-800 p-1 rounded-2xl border border-slate-100 dark:border-slate-700">
              {[
                { code: 'pt', flag: '🇧🇷' },
                { code: 'en', flag: '🇺🇸' },
                { code: 'es', flag: '🇪🇸' }
              ].map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => onLanguageChange(lang.code as Language)}
                  className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${language === lang.code ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                >
                  <span className="text-base leading-none">{lang.flag}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>


      {userProfile && (
        <section className="space-y-4">
          <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-4">Portal do Atleta / Meus Dados</h2>
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm divide-y divide-slate-50 dark:divide-slate-800 transition-colors">
            <SettingItem 
              icon={<UserIcon className="text-indigo-600" />} 
              title="Meu Perfil" 
              subtitle={
                user.role === 'student' && (userProfile as Student).belt
                  ? `${userProfile.name} • ${(userProfile as Student).belt} (${(userProfile as Student).stripes} Graus)`
                  : userProfile.name
              } 
              onClick={() => {
                setEditProfile(userProfile);
                setIsEditingProfile(true);
              }}
            />
            {userProfile.address && (
              <SettingItem 
                icon={<MapPin className="text-slate-600" />} 
                title="Meu Endereço" 
                subtitle={`${userProfile.address}${userProfile.addressNumber ? `, ${userProfile.addressNumber}` : ''}`} 
                onClick={() => {
                  setEditProfile(userProfile);
                  setIsEditingProfile(true);
                }}
              />
            )}
          </div>
        </section>
      )}

      {user.role === 'admin' && (
        <section className="space-y-4">
          <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-4">Compartilhamento</h2>
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-4 mb-2">
              <div className="bg-indigo-100 dark:bg-indigo-900/30 p-3 rounded-2xl text-indigo-600 dark:text-indigo-400">
                <Zap size={24} />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 dark:text-white text-sm">Link de Acesso Rápido</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">Compartilhe este link com alunos e professores para que eles acessem diretamente sua academia no sistema.</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 bg-slate-50 dark:bg-slate-800 rounded-2xl px-4 py-3 border border-slate-100 dark:border-slate-700 font-mono text-[10px] text-slate-500 dark:text-slate-400 flex items-center overflow-hidden">
                  <span className="truncate">{`${window.location.href.split('#')[0]}#/?academyId=${academy.id}`}</span>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button 
                    onClick={(e) => {
                      const baseUrl = window.location.href.split('#')[0];
                      const url = `${baseUrl}#/?academyId=${academy.id}`;
                      navigator.clipboard.writeText(url);
                      const btn = e.currentTarget;
                      const originalText = btn.innerText;
                      btn.innerText = 'Copiado!';
                      btn.classList.add('bg-green-600');
                      setTimeout(() => {
                        btn.innerText = originalText;
                        btn.classList.remove('bg-green-600');
                      }, 2000);
                    }}
                    className="bg-slate-800 text-white font-black px-6 py-3 rounded-2xl text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg"
                  >
                    Copiar
                  </button>
                  <a 
                    href={`https://wa.me/?text=${encodeURIComponent(`Olá! Faça sua matrícula na ${academy.name} através do link: ${window.location.href.split('#')[0]}#/?academyId=${academy.id}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#25D366] hover:bg-[#128C7E] text-white font-black px-6 py-3 rounded-2xl text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-green-500/20 flex items-center gap-2"
                  >
                    <Smartphone size={14} />
                    WhatsApp
                  </a>
                </div>
              </div>

              {window.location.href.includes('-dev-') && (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-4 rounded-2xl flex items-start gap-3">
                  <AlertTriangle className="text-amber-500 shrink-0" size={18} />
                  <div>
                    <h5 className="text-[10px] font-black text-amber-800 dark:text-amber-400 uppercase">Atenção: Link em modo Edição</h5>
                    <p className="text-[9px] text-amber-700 dark:text-amber-500 font-bold mt-1 leading-relaxed">
                      Este link é para seu uso pessoal. Para compartilhar com alunos, clique em <b>"Share"</b> no topo do AI Studio e envie o <b>"Shared App URL"</b> que o Google fornecer, adicionando <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded">#/?academyId={academy.id}</code> ao final.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {user.role === 'admin' && (
        <section className="space-y-4">
          <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-4">{t.mySubscription}</h2>
          <div className="bg-indigo-600 rounded-[32px] p-6 text-white shadow-xl shadow-indigo-600/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
              <Crown size={80} />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-white/20 p-2 rounded-xl">
                  <Zap size={20} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">{t.mySubscription}: {academy.currentPlan || 'Free'}</span>
              </div>
              <h3 className="text-2xl font-black italic uppercase tracking-tighter mb-2 italic">Power on Mat</h3>
              <p className="text-xs text-indigo-100 font-medium mb-6 max-w-[200px]">Unlock all features and scale your academy professionally.</p>
              <button 
                onClick={() => setIsEditingPlans(true)}
                className="bg-white text-indigo-600 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95"
              >
                {t.viewPlans}
              </button>
            </div>
          </div>
        </section>
      )}

      {user.role === 'admin' && (
        <section className="space-y-4">
          <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-4">Recrutamento & Planos</h2>
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm divide-y divide-slate-50 dark:divide-slate-800 transition-colors">
            <SettingItem 
              icon={<Book className="text-orange-500" />} 
              title="Planos de Aula" 
              subtitle={`${(editAcademy.plans || []).length} planos configurados`} 
              onClick={() => setIsManagingAcademyPlans(true)}
            />
          </div>
        </section>
      )}

      {user.role === 'admin' && (
        <section className="space-y-4">
          <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-4">Financeiro & Pagamentos</h2>
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm divide-y divide-slate-50 dark:divide-slate-800 transition-colors">
            <div className="flex items-center justify-between p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left group">
              <div className="flex items-center gap-4">
                <div className="bg-slate-100 dark:bg-slate-800 w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110">
                  <Wallet className="text-green-600" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Chave PIX</h4>
                  <div className="text-xs text-slate-400 dark:text-slate-500">
                    <PrivacyValue value={academy.pixKey || "Não configurada"} maskType="generic" className="mt-0.5" />
                  </div>
                </div>
              </div>
              <button 
                onClick={() => {
                  setEditAcademy(academy);
                  setIsEditingPayment(true);
                }}
                className="text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase"
              >
                Editar
              </button>
            </div>
            
            <div className="flex items-center justify-between p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left group">
              <div className="flex items-center gap-4">
                <div className="bg-slate-100 dark:bg-slate-800 w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110">
                  <CreditCard className="text-indigo-600" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Dados Bancários</h4>
                  <div className="text-xs text-slate-400 dark:text-slate-500">
                    <PrivacyValue value={academy.bankName ? `${academy.bankName} - Ag: ${academy.bankAgency} Conta: ${academy.bankAccount}` : "Não configurados"} maskType="generic" className="mt-0.5" />
                  </div>
                </div>
              </div>
              <button 
                onClick={() => {
                  setEditAcademy(academy);
                  setIsEditingPayment(true);
                }}
                className="text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase"
              >
                Editar
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Modal de Notificações Automáticas */}
      {isEditingNotifications && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[200] flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] p-8 animate-in zoom-in duration-300 shadow-2xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight uppercase italic flex items-center gap-2">
                <Bell className="text-amber-500" />
                Notificações
              </h2>
              <button onClick={() => setIsEditingNotifications(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X size={24} />
              </button>
            </div>
            
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6 leading-relaxed">
              Defina os gatilhos para as notificações automáticas da academia <span className="text-indigo-600">{academy.name}</span>.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Limite de Faltas (Alerta)</label>
                <input 
                  type="number" 
                  min="1"
                  value={editAcademy.absenceLimit || 3}
                  onChange={(e) => setEditAcademy({ ...editAcademy, absenceLimit: parseInt(e.target.value) || 0 })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  placeholder="Ex: 3"
                />
                <p className="text-[9px] text-slate-400 mt-1 ml-1 italic">Define quando o sistema sinaliza risco de evasão do aluno.</p>
              </div>
              {user.role === 'admin' && (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Aviso de Mensalidade (Dias)</label>
                  <input 
                    type="number" 
                    min="1"
                    value={editAcademy.paymentWarningDays || 5}
                    onChange={(e) => setEditAcademy({ ...editAcademy, paymentWarningDays: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    placeholder="Ex: 5"
                  />
                  <p className="text-[9px] text-slate-400 mt-1 ml-1 italic">Dias de antecedência para alertar sobre o vencimento da mensalidade.</p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 mt-8">
              <button 
                onClick={handleSaveAcademy}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-indigo-600/20 active:scale-95 transition-all text-sm uppercase tracking-widest"
              >
                Salvar Configurações
              </button>
              <button 
                onClick={() => setIsEditingNotifications(false)}
                className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold py-4 rounded-2xl active:scale-95 transition-all text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Gestão de Planos da Academia */}
      {isManagingAcademyPlans && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[32px] p-8 animate-in zoom-in duration-300 shadow-2xl border border-slate-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight uppercase italic flex items-center gap-2">
                  <Book className="text-orange-500" />
                  Planos da Academia
                </h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Configure as opções de mensalidade para seus alunos</p>
              </div>
              <button onClick={() => setIsManagingAcademyPlans(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <button 
                onClick={() => {
                  setEditingPlan({
                    name: '',
                    durationMonths: 1,
                    classesPerWeek: 3,
                    price: 0,
                    category: 'Adultos'
                  });
                  setIsAddingAcademyPlan(true);
                }}
                className="w-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-black py-4 rounded-2xl border-2 border-dashed border-indigo-200 dark:border-indigo-800 flex items-center justify-center gap-2 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-all"
              >
                <Plus size={20} /> Adicionar Novo Plano
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(editAcademy.plans || []).map(plan => (
                  <div key={plan.id} className="bg-slate-50 dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700 space-y-3 relative group">
                    <div className="flex justify-between items-start">
                      <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-tight italic">
                        {plan.category}
                      </span>
                      <button 
                        onClick={() => deletePlan(plan.id)}
                        className="text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div>
                      <h4 className="font-black text-slate-800 dark:text-white text-base leading-tight uppercase italic">{plan.name}</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                        {plan.durationMonths} {plan.durationMonths === 1 ? 'Mês' : 'Meses'} • {plan.classesPerWeek}x p/ Semana
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 italic">R$ {plan.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      <button 
                        onClick={() => {
                          setEditingPlan(plan);
                          setIsAddingAcademyPlan(true);
                        }}
                        className="bg-white dark:bg-slate-700 p-2 rounded-xl text-slate-400 hover:text-indigo-600 shadow-sm border border-slate-100 dark:border-slate-600"
                      >
                        <Save size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {(editAcademy.plans || []).length === 0 && !isAddingAcademyPlan && (
                <div className="text-center py-10">
                  <div className="bg-slate-50 dark:bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Book size={32} className="text-slate-300" />
                  </div>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest italic">Nenhum plano cadastrado</p>
                </div>
              )}
            </div>

            <div className="mt-8">
              <button 
                onClick={() => setIsManagingAcademyPlans(false)}
                className="w-full bg-slate-900 dark:bg-slate-800 text-white font-black py-4 rounded-2xl active:scale-95 transition-all text-sm uppercase tracking-widest italic"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Adição/Edição de Plano Específico */}
      {isAddingAcademyPlan && editingPlan && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[300] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] p-8 animate-in zoom-in duration-300 shadow-2xl border border-slate-100 dark:border-slate-800">
            <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase italic mb-6">
              {editingPlan.id ? 'Editar Plano' : 'Novo Plano'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nome do Plano</label>
                <input 
                  type="text" 
                  value={editingPlan.name}
                  onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                  placeholder="Ex: Semestral Master"
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 font-mono">Duração (Meses)</label>
                  <input 
                    type="number" 
                    value={editingPlan.durationMonths}
                    onChange={(e) => setEditingPlan({ ...editingPlan, durationMonths: parseInt(e.target.value) || 1 })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Aulas p/ Semana</label>
                  <input 
                    type="number" 
                    value={editingPlan.classesPerWeek}
                    onChange={(e) => setEditingPlan({ ...editingPlan, classesPerWeek: parseInt(e.target.value) || 3 })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Valor (R$)</label>
                  <input 
                    type="number" 
                    value={editingPlan.price}
                    onChange={(e) => setEditingPlan({ ...editingPlan, price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Categoria</label>
                  <select 
                    value={editingPlan.category}
                    onChange={(e) => setEditingPlan({ ...editingPlan, category: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none"
                  >
                    <option value="Adultos">Adultos</option>
                    <option value="Crianças">Crianças</option>
                    <option value="Adolescentes">Adolescentes</option>
                    <option value="Feminino">Feminino</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-8">
              <button 
                onClick={savePlan}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-indigo-600/20 transition-all active:scale-95 text-sm uppercase tracking-widest italic"
              >
                Salvar Plano
              </button>
              <button 
                onClick={() => {
                  setIsAddingAcademyPlan(false);
                  setEditingPlan(null);
                }}
                className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold py-4 rounded-2xl active:scale-95 transition-all text-sm uppercase tracking-widest"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição da Academia */}
      {isEditingAcademy && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[200] flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[32px] p-8 animate-in zoom-in duration-300 shadow-2xl border border-slate-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight uppercase italic">Editar Academia</h2>
              <button onClick={() => setIsEditingAcademy(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3 mb-6">
                <div 
                  className="w-28 h-28 rounded-3xl bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 overflow-hidden relative group cursor-pointer hover:border-indigo-500 transition-all shadow-inner"
                  onClick={() => logoInputRef.current?.click()}
                >
                  {editAcademy.logo ? (
                    <img src={editAcademy.logo} alt="Logo" className="w-full h-full object-contain p-2" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                      <Zap size={32} className="opacity-20" />
                      <span className="text-[10px] font-black uppercase mt-1">Logo</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <span className="text-[10px] font-black uppercase italic">Alterar Logotipo</span>
                  </div>
                </div>
                <input 
                  type="file" 
                  ref={logoInputRef} 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleLogoUpload} 
                />
                <p className="text-[10px] font-bold text-slate-400 uppercase">Logotipo da Academia</p>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nome da Unidade</label>
                <input 
                  type="text" 
                  value={editAcademy.name}
                  onChange={(e) => setEditAcademy({ ...editAcademy, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  placeholder="Ex: NexDojo"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Responsável Técnico</label>
                <input 
                  type="text" 
                  value={editAcademy.ownerName}
                  onChange={(e) => setEditAcademy({ ...editAcademy, ownerName: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  placeholder="Nome do Mestre"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 flex items-center justify-between">
                  CEP
                  {isLoadingCep && <Loader2 size={10} className="animate-spin text-indigo-500" />}
                </label>
                <input 
                  type="text" 
                  value={editAcademy.cep || ''}
                  onChange={(e) => handleCepChange(e, true)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                  placeholder="00000-000"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Endereço (Auto)</label>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <input 
                      type="text" 
                      value={editAcademy.address || ''}
                      onChange={(e) => setEditAcademy({ ...editAcademy, address: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                      placeholder="Rua, Bairro..."
                    />
                  </div>
                  <div className="col-span-1">
                    <input 
                      type="text" 
                      value={editAcademy.addressNumber || ''}
                      onChange={(e) => setEditAcademy({ ...editAcademy, addressNumber: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      placeholder="Nº"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Telefone / WhatsApp</label>
                <input 
                  type="text" 
                  value={editAcademy.phone || ''}
                  onChange={(e) => setEditAcademy({ ...editAcademy, phone: maskPhone(e.target.value) })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  placeholder="(00) 0.0000-0000"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-8">
              <button 
                onClick={handleSaveAcademy}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-indigo-600/20 active:scale-95 transition-all text-sm uppercase tracking-widest"
              >
                Salvar Alterações
              </button>
              <button 
                onClick={() => setIsEditingAcademy(false)}
                className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold py-4 rounded-2xl active:scale-95 transition-all text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição de Perfil do Usuário */}
      {isEditingProfile && editProfile && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[200] flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[32px] p-8 animate-in zoom-in duration-300 shadow-2xl border border-slate-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-600 p-2 rounded-xl text-white"><UserIcon size={20} /></div>
                <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight uppercase italic">Editar Meu Perfil</h2>
              </div>
              <button onClick={() => setIsEditingProfile(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-center mb-6">
                <div className="w-24 h-24 rounded-[32px] bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 overflow-hidden border-2 border-dashed border-slate-200 dark:border-slate-700">
                  {(editProfile as any).photo ? (
                    <img src={(editProfile as any).photo} alt="Perfil" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon size={32} />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nome Completo</label>
                  <input 
                    type="text" 
                    value={editProfile.name}
                    onChange={(e) => setEditProfile({ ...editProfile, name: e.target.value } as any)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                  />
                </div>

                {user.role === 'student' && (
                  <>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">CPF</label>
                      <input 
                        type="text" 
                        value={(editProfile as any).cpf || ''}
                        onChange={(e) => setEditProfile({ ...editProfile, cpf: e.target.value } as any)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                        placeholder="000.000.000-00"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Data de Nascimento</label>
                      <input 
                        type="date" 
                        value={(editProfile as any).birthDate || ''}
                        onChange={(e) => setEditProfile({ ...editProfile, birthDate: e.target.value } as any)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">RG</label>
                      <input 
                        type="text" 
                        value={(editProfile as any).rg || ''}
                        onChange={(e) => setEditProfile({ ...editProfile, rg: e.target.value } as any)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                        placeholder="00.000.000-0"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Gênero</label>
                      <select 
                        value={(editProfile as any).gender || ''}
                        onChange={(e) => setEditProfile({ ...editProfile, gender: e.target.value } as any)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      >
                        <option value="">Selecione</option>
                        <option value="M">Masculino</option>
                        <option value="F">Feminino</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </div>
                  </>
                )}

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Email</label>
                  <input 
                    type="email" 
                    value={(editProfile as any).email || ''}
                    disabled
                    className="w-full bg-slate-100 dark:bg-slate-800/50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-400 outline-none cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Telefone / WhatsApp</label>
                  <input 
                    type="text" 
                    value={(editProfile as any).phone || ''}
                    onChange={(e) => setEditProfile({ ...editProfile, phone: maskPhone(e.target.value) } as any)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    placeholder="(00) 0.0000-0000"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 flex items-center justify-between">
                    CEP
                    {isLoadingCep && <Loader2 size={10} className="animate-spin text-indigo-500" />}
                  </label>
                  <input 
                    type="text" 
                    value={editProfile.cep || ''}
                    onChange={(e) => handleCepChange(e, false)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                    placeholder="00000-000"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Endereço (Auto)</label>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <input 
                        type="text" 
                        value={editProfile.address || ''}
                        onChange={(e) => setEditProfile({ ...editProfile, address: e.target.value } as any)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-medium text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        placeholder="Rua, Bairro..."
                      />
                    </div>
                    <div className="col-span-1">
                      <input 
                        type="text" 
                        value={editProfile.addressNumber || ''}
                        onChange={(e) => setEditProfile({ ...editProfile, addressNumber: e.target.value } as any)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                        placeholder="Nº"
                      />
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Observações Médicas</label>
                  <textarea 
                    value={(editProfile as any).medicalNotes || ''}
                    onChange={(e) => setEditProfile({ ...editProfile, medicalNotes: e.target.value } as any)}
                    rows={2}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-medium text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                    placeholder="Alergias, lesões, condições específicas..."
                  />
                </div>

                {user.role === 'student' && (editProfile as any).birthDate && (new Date().getFullYear() - new Date((editProfile as any).birthDate).getFullYear() < 18) && (
                  <div className="sm:col-span-2 space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Informações do Responsável</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nome do Responsável</label>
                        <input 
                          type="text" 
                          value={(editProfile as any).guardianName || ''}
                          onChange={(e) => setEditProfile({ ...editProfile, guardianName: e.target.value } as any)}
                          className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Contato do Responsável</label>
                        <input 
                          type="text" 
                          value={(editProfile as any).guardianPhone || ''}
                          onChange={(e) => setEditProfile({ ...editProfile, guardianPhone: maskPhone(e.target.value) } as any)}
                          className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                          placeholder="(00) 0.0000-0000"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-8">
              <button 
                onClick={handleSaveProfile}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-indigo-600/20 active:scale-95 transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-2"
              >
                <Save size={18} /> Atualizar Perfil
              </button>
              <button 
                onClick={() => setIsEditingProfile(false)}
                className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold py-4 rounded-2xl active:scale-95 transition-all text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Pagamentos */}
      {isEditingPayment && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[200] flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] p-8 animate-in zoom-in duration-300 shadow-2xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight uppercase italic flex items-center gap-2">
                <Wallet className="text-indigo-500" />
                Recebimentos
              </h2>
              <button onClick={() => setIsEditingPayment(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Tipo de Chave</label>
                  <select 
                    value={editAcademy.pixType || 'CPF'}
                    onChange={(e) => setEditAcademy({ ...editAcademy, pixType: e.target.value as any })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-4 text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none"
                  >
                    <option value="CPF">CPF</option>
                    <option value="CNPJ">CNPJ</option>
                    <option value="E-mail">E-mail</option>
                    <option value="Telefone">Telefone</option>
                    <option value="Aleatória">Chave Aleatória</option>
                  </select>
                </div>
                <div className="col-span-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Chave PIX</label>
                  <input 
                    type="text" 
                    value={editAcademy.pixKey || ''}
                    onChange={(e) => setEditAcademy({ ...editAcademy, pixKey: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-4 text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                    placeholder="Chave PIX"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Dados Bancários (DOC/TED)</h3>
                <div className="space-y-3">
                  <div>
                    <input 
                      type="text" 
                      value={editAcademy.bankName || ''}
                      onChange={(e) => setEditAcademy({ ...editAcademy, bankName: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-4 text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                      placeholder="Nome do Banco"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input 
                      type="text" 
                      value={editAcademy.bankAgency || ''}
                      onChange={(e) => setEditAcademy({ ...editAcademy, bankAgency: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-4 text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                      placeholder="Agência"
                    />
                    <input 
                      type="text" 
                      value={editAcademy.bankAccount || ''}
                      onChange={(e) => setEditAcademy({ ...editAcademy, bankAccount: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-4 text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                      placeholder="Conta Corrente"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-8">
              <button 
                onClick={handleSaveAcademy}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-green-600/20 active:scale-95 transition-all text-xs uppercase tracking-widest"
              >
                Confirmar Dados
              </button>
              <button 
                onClick={() => setIsEditingPayment(false)}
                className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold py-4 rounded-2xl active:scale-95 transition-all text-xs"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preferências do Sistema */}
      {user.role !== 'student' && (
        <section className="space-y-4">
          <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-4">Preferências do Sistema</h2>
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm divide-y divide-slate-50 dark:divide-slate-800 transition-colors">
            <SettingItem 
              icon={<Bell className="text-amber-500" />} 
              title="Notificações Automáticas" 
              subtitle={user.role === 'admin' 
                ? `${academy.absenceLimit || 3} Faltas / Aviso de Mensalidade: ${academy.paymentWarningDays || 5} Dias`
                : `${academy.absenceLimit || 3} Faltas`
              } 
              onClick={() => {
                setEditAcademy(academy);
                setIsEditingNotifications(true);
              }}
            />
          </div>
        </section>
      )}


      {user.role !== 'student' && (
        <section className="space-y-4">
          <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-4">Guia de Gestão de Equipe</h2>
          <div className="bg-indigo-50 dark:bg-indigo-900/10 p-6 rounded-[32px] border border-indigo-100 dark:border-indigo-900/30 space-y-4">
            <div className="flex items-start gap-4">
              <div className="bg-indigo-600 p-2 rounded-xl text-white shrink-0"><Shield size={18} /></div>
              <div>
                <h4 className="text-sm font-black text-slate-800 dark:text-indigo-400 uppercase italic">Como funcionam os usuários?</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  Para adicionar um colaborador, basta cadastrá-lo em sua respectiva aba <strong>(Mestres ou Staff)</strong>. 
                  Ao realizar o cadastro, um acesso de usuário é criado automaticamente com o e-mail informado.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1 italic">Mestres</p>
                <p className="text-[11px] text-slate-500 leading-tight">Podem fazer chamada, gerenciar turmas e ver alertas de alunos.</p>
              </div>
              <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Staff / Colab.</p>
                <p className="text-[11px] text-slate-500 leading-tight">Ajudam no mural, cadastro de alunos e estoque de quimonos.</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Modal Planos */}
      {isEditingPlans && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[250] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[40px] p-8 md:p-10 animate-in zoom-in duration-300 shadow-2xl border border-slate-100 dark:border-slate-800 max-h-[95vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight uppercase italic flex items-center gap-3">
                  <Crown className="text-amber-500" />
                  Planos de Assinatura
                </h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Escolha o nível ideal para sua evolução</p>
              </div>
              <button onClick={() => setIsEditingPlans(false)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 hover:text-red-500 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              {/* Plano Silver */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[32px] p-8 flex flex-col transition-all hover:shadow-xl hover:-translate-y-2 group">
                <div className="text-slate-400 mb-4 group-hover:scale-110 transition-transform"><Trophy size={40} /></div>
                <h3 className="text-xl font-black uppercase italic mb-2 dark:text-white">Silver</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-sm font-bold text-slate-400 font-mono">R$</span>
                  <span className="text-4xl font-black text-slate-800 dark:text-white leading-none">49</span>
                  <span className="text-sm font-bold text-slate-400 font-mono">,90/mês</span>
                </div>
                <ul className="space-y-4 mb-8 flex-1">
                  <PlanFeature text="Gestão Básica" />
                  <PlanFeature text="Alunos Ilimitados" />
                  <PlanFeature text="Chamada Digital" />
                  <PlanFeature text="Mural de Avisos" />
                  <PlanFeature text="Quimonos (Estoque)" />
                  <PlanFeature text="Suporte por E-mail" inactive />
                </ul>
                <button 
                  onClick={() => setIsCheckingOut('Silver')}
                  className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
                >
                  Selecionar Prata
                </button>
              </div>

              {/* Plano Gold */}
              <div className="bg-white dark:bg-slate-900 border-2 border-indigo-600 rounded-[32px] p-8 flex flex-col transition-all hover:shadow-2xl hover:-translate-y-2 relative group scale-105 shadow-2xl shadow-indigo-600/10">
                <div className="absolute top-0 right-10 transform -translate-y-1/2 bg-indigo-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest italic animate-bounce">Mais Popular</div>
                <div className="text-amber-500 mb-4 group-hover:scale-110 transition-transform"><StarIcon size={40} fill="currentColor" /></div>
                <h3 className="text-xl font-black uppercase italic mb-2 dark:text-white">Gold</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-sm font-bold text-slate-400 font-mono">R$</span>
                  <span className="text-4xl font-black text-indigo-600 leading-none">99</span>
                  <span className="text-sm font-bold text-slate-400 font-mono">,90/mês</span>
                </div>
                <ul className="space-y-4 mb-8 flex-1">
                  <PlanFeature text="Tudo do Silver" highlight />
                  <PlanFeature text="Financeiro Completo" />
                  <PlanFeature text="Relatórios Avançados" />
                  <PlanFeature text="Análise de Dados" />
                  <PlanFeature text="QR Code Payment" />
                  <PlanFeature text="Suporte WhatsApp" />
                </ul>
                <button 
                  onClick={() => setIsCheckingOut('Gold')}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95 shadow-xl shadow-indigo-600/30"
                >
                  Assinar Ouro
                </button>
              </div>

              {/* Plano Black Belt */}
              <div className="bg-slate-950 rounded-[32px] p-8 flex flex-col transition-all hover:shadow-2xl hover:-translate-y-2 group border border-white/5">
                <div className="text-slate-200 mb-4 group-hover:scale-110 transition-transform"><Award size={40} /></div>
                <h3 className="text-xl font-black uppercase italic mb-2 text-white">Black Belt</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-sm font-bold text-slate-500 font-mono">R$</span>
                  <span className="text-4xl font-black text-white leading-none">199</span>
                  <span className="text-sm font-bold text-slate-500 font-mono">,90/mês</span>
                </div>
                <ul className="space-y-4 mb-8 flex-1">
                  <PlanFeature text="Tudo do Gold" dark />
                  <PlanFeature text="Gestão Multi-unidades" dark />
                  <PlanFeature text="White-label Custom" dark />
                  <PlanFeature text="Gerente de Sucesso" dark />
                  <PlanFeature text="Acesso API" dark />
                  <PlanFeature text="Backup em Tempo Real" dark />
                </ul>
                <button 
                  onClick={() => setIsCheckingOut('Black Belt')}
                  className="w-full py-4 bg-white text-slate-950 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
                >
                  Virar Black Belt
                </button>
              </div>
            </div>

            <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Pagamento processado de forma segura via Criptografia de Ponta-a-Ponta
            </p>
          </div>
        </div>
      )}

      {/* Modal Checkout Simulation */}
      {isCheckingOut && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[300] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[40px] p-10 animate-in zoom-in duration-300 shadow-2xl text-center border border-slate-100 dark:border-slate-800">
            <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto mb-6">
              <CreditCard size={40} />
            </div>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2 uppercase italic tracking-tighter">Finalizar Compra</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-8">
              Você está assinando o plano <span className="text-indigo-600 font-bold">{isCheckingOut}</span>. 
              Deseja confirmar a transação segura?
            </p>
            
            <div className="space-y-3">
              <button 
                onClick={() => {
                  onUpdateAcademy({ ...academy, currentPlan: isCheckingOut as any, planStatus: 'Active' });
                  setIsCheckingOut(null);
                  setIsEditingPlans(false);
                  setShowPlanNotification(true);
                  setTimeout(() => setShowPlanNotification(false), 4000);
                }}
                className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black uppercase tracking-widest text-xs hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/30"
              >
                Pagar com Cartão / Pix
              </button>
              <button 
                onClick={() => setIsCheckingOut(null)}
                className="w-full py-4 text-slate-400 font-bold uppercase tracking-widest text-[10px] hover:text-slate-600"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notificação de Plano Ativado */}
      {showPlanNotification && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[400] bg-slate-950 text-white px-8 py-5 rounded-[32px] shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom duration-500 border border-white/5">
          <div className="bg-green-500 p-2 rounded-xl text-white">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-widest">Plano Ativado com Sucesso!</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Obrigado por confiar na Casa do Pai. OSS!</p>
          </div>
        </div>
      )}

      <section className="pt-4">
        <button 
          onClick={onLogout}
          className="w-full flex items-center justify-between p-5 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-2xl text-red-600 dark:text-red-400 transition-colors border border-red-100 dark:border-red-900/30"
        >
          <div className="flex items-center gap-3">
            <LogOut size={20} />
            <span className="font-bold">Encerrar Sessão</span>
          </div>
          <ChevronRight size={20} />
        </button>
        <p className="text-center text-slate-400 dark:text-slate-600 text-[10px] mt-6 font-bold uppercase tracking-widest italic">
          {academy.name} v1.1.0 • Desenvolvido para campeões
        </p>
      </section>
    </div>
  );
};

const SettingItem: React.FC<{ icon: React.ReactNode; title: string; subtitle: string; onClick?: () => void }> = ({ icon, title, subtitle, onClick }) => (
  <button 
    onClick={onClick}
    className="w-full flex items-center justify-between p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left group"
  >
    <div className="flex items-center gap-4">
      <div className="bg-slate-100 dark:bg-slate-800 w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110">
        {icon}
      </div>
      <div>
        <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{title}</h4>
        <p className="text-xs text-slate-400 dark:text-slate-500">{subtitle}</p>
      </div>
    </div>
    <ChevronRight size={20} className="text-slate-300 dark:text-slate-700" />
  </button>
);

const PlanFeature: React.FC<{ text: string; inactive?: boolean; highlight?: boolean; dark?: boolean }> = ({ text, inactive, highlight, dark }) => (
  <li className={`flex items-center gap-3 text-[11px] font-bold uppercase tracking-tight ${inactive ? 'opacity-30' : ''} ${dark ? 'text-slate-400' : 'text-slate-600 dark:text-slate-400'}`}>
    <CheckCircle2 size={14} className={highlight ? 'text-indigo-600' : (dark ? 'text-slate-500' : 'text-emerald-500')} />
    <span className={highlight ? 'text-indigo-600 dark:text-indigo-400' : ''}>{text}</span>
  </li>
);

export default SettingsView;
