
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Academy, User, Student, Instructor, Staff, AcademyPlan, Language, GraduationRules } from '../types';
import { Settings, Bell, Shield, LogOut, ChevronRight, User as UserIcon, Palette, MapPin, Moon, Sun, X, CreditCard, Wallet, Loader2, Save, CheckCircle2, Crown, Zap, Star as StarIcon, Award, Trophy, Book, Users, Plus, Trash2, Globe, AlertTriangle, Smartphone, Check, Briefcase, Clock, ToggleLeft, ToggleRight } from 'lucide-react';
import { fetchAddressByCep, maskCEP, maskPhone } from '../services/cep';
import { PrivacyValue } from '../components/PrivacyValue';
import { studentService } from '@/features/students/services/studentService';
import { instructorService } from '@/features/instructors/services/instructorService';
import { staffService } from '@/features/staff/services/staffService';
import { academyService } from '@/features/settings/services/academyService';
import { plansService } from '@/features/plans/services/plansService';
import { useTranslation } from '../services/LanguageContext';
import { DateSelectInput, ConfirmDialog } from '@/components/ui';

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
  const { t, showNotification } = useTranslation();
  const [isEditingAcademy, setIsEditingAcademy] = React.useState(false);
  const [isEditingNotifications, setIsEditingNotifications] = React.useState(false);
  const [isEditingGraduation, setIsEditingGraduation] = React.useState(false);
  const [isEditingPayment, setIsEditingPayment] = React.useState(false);
  const [isEditingProfile, setIsEditingProfile] = React.useState(false);
  const [isEditingPlans, setIsEditingPlans] = useState(false);
  const [isManagingAcademyPlans, setIsManagingAcademyPlans] = useState(false);
  const [isManagingAdditionalUsers, setIsManagingAdditionalUsers] = useState(false);
  const [isAddingAcademyPlan, setIsAddingAcademyPlan] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Partial<AcademyPlan> | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState<string | null>(null);
  const [additionalUsers, setAdditionalUsers] = useState<{ instructors: Instructor[]; staff: Staff[] }>({ instructors: [], staff: [] });

  // Planos de aula — gerenciados pelo novo endpoint /api/plans
  const [localPlans, setLocalPlans] = useState<AcademyPlan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [availableInstructors, setAvailableInstructors] = useState<Instructor[]>([]);
  const [showPlanNotification, setShowPlanNotification] = useState(false);
  const [isSavingAcademy, setIsSavingAcademy] = useState(false);
  const [editAcademy, setEditAcademy] = React.useState<Academy>(academy);

  const defaultGraduationRules = (): GraduationRules => ({
    mode: 'classes',
    kids:         { beltThreshold: 100, stripeThreshold: 25 },
    white:        { beltThreshold: 80,  stripeThreshold: 20 },
    intermediate: { beltThreshold: 160, stripeThreshold: 40 },
    black:        { stripeThreshold: 300 },
  });

  const [editGraduationRules, setEditGraduationRules] = useState<GraduationRules>(
    academy.graduationRules ?? defaultGraduationRules()
  );
  const logoInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditAcademy(academy);
  }, [academy.id]);

  // Carrega planos do novo endpoint e instrutores (para select no modal)
  useEffect(() => {
    if (user.role !== 'admin' && user.role !== 'superuser') return;
    const load = async () => {
      try {
        const [plansRes, instrRes] = await Promise.all([
          plansService.getAll(academy.id),
          instructorService.getAll(academy.id, { limit: 1000 }),
        ]);
        setLocalPlans(plansRes.data);
        setAvailableInstructors(instrRes.data);
      } catch (err) {
        console.error('Erro ao carregar planos:', err);
      }
    };
    load();
  }, [academy.id, user.role]);

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
  const [userProfile, setUserProfile] = useState<Student | Instructor | Staff | null>(null);
  const [editProfile, setEditProfile] = useState<Student | Instructor | Staff | null>(null);

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        if (user.role === 'student') {
          const res = await studentService.getAll(academy.id, { limit: 1000 });
          const found = res.data.find((s: Student) => s.email === user.email) || null;
          setUserProfile(found);
          setEditProfile(found);
        } else if (user.role === 'instructor') {
          const res = await instructorService.getAll(academy.id, { limit: 1000 });
          const found = res.data.find((i: Instructor) => i.email === user.email) || null;
          setUserProfile(found);
          setEditProfile(found);
        } else if (user.role === 'staff') {
          const res = await staffService.getAll(academy.id, { limit: 1000 });
          const found = res.data.find((s: Staff) => s.email === user.email) || null;
          setUserProfile(found);
          setEditProfile(found);
        }
      } catch (err) {
        console.error('Erro ao carregar perfil do usuário:', err);
      }
    };
    loadUserProfile();
  }, [academy.id, user.email, user.role]);

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

  const handleSaveAcademyData = async () => {
    setIsSavingAcademy(true);
    try {
      const payload = {
        name: editAcademy.name,
        ownerName: editAcademy.ownerName,
        email: editAcademy.email,
        phone: editAcademy.phone,
        logo: editAcademy.logo,
        alias: editAcademy.alias,
        cep: editAcademy.cep,
        address: editAcademy.address,
        addressNumber: editAcademy.addressNumber,
      };
      const saved = await academyService.update(academy.id, payload);
      onUpdateAcademy({ ...academy, ...saved });
      setEditAcademy({ ...academy, ...saved });
      setIsEditingAcademy(false);
      showNotification("Dados da unidade salvos com sucesso!");
    } catch (e) {
      console.error(e);
      showNotification("Erro ao salvar dados da unidade. Tente novamente.", 'error');
    } finally {
      setIsSavingAcademy(false);
    }
  };

  const handleSaveNotifications = async () => {
    setIsSavingAcademy(true);
    try {
      const payload = {
        absenceLimit: editAcademy.absenceLimit,
        paymentWarningDays: editAcademy.paymentWarningDays,
      };
      const saved = await academyService.update(academy.id, payload);
      onUpdateAcademy({ ...academy, ...saved });
      setEditAcademy({ ...academy, ...saved });
      setIsEditingNotifications(false);
      showNotification("Configurações de notificações salvas!");
    } catch (e) {
      console.error(e);
      showNotification("Erro ao salvar notificações. Tente novamente.", 'error');
    } finally {
      setIsSavingAcademy(false);
    }
  };

  const handleSaveGraduation = async () => {
    setIsSavingAcademy(true);
    try {
      const saved = await academyService.update(academy.id, { graduationRules: editGraduationRules });
      onUpdateAcademy({ ...academy, ...saved });
      setIsEditingGraduation(false);
      showNotification('Critérios de graduação salvos!');
    } catch (e) {
      console.error(e);
      showNotification('Erro ao salvar critérios. Tente novamente.', 'error');
    } finally {
      setIsSavingAcademy(false);
    }
  };

  const handleSavePayment = async () => {
    setIsSavingAcademy(true);
    try {
      const payload = {
        pixKey: editAcademy.pixKey,
        pixType: editAcademy.pixType,
        bankName: editAcademy.bankName,
        bankAgency: editAcademy.bankAgency,
        bankAccount: editAcademy.bankAccount,
      };
      const saved = await academyService.update(academy.id, payload);
      onUpdateAcademy({ ...academy, ...saved });
      setEditAcademy({ ...academy, ...saved });
      setIsEditingPayment(false);
      showNotification("Dados de pagamento salvos com sucesso!");
    } catch (e) {
      console.error(e);
      showNotification("Erro ao salvar dados de pagamento. Tente novamente.", 'error');
    } finally {
      setIsSavingAcademy(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!editProfile) return;

    try {
      if (user.role === 'student') {
        const updated = await studentService.update(editProfile.id, editProfile as Student);
        setUserProfile(updated);
        setEditProfile(updated);
      } else if (user.role === 'instructor') {
        const updated = await instructorService.update(editProfile.id, editProfile as Instructor);
        setUserProfile(updated);
        setEditProfile(updated);
      } else if (user.role === 'staff') {
        const updated = await staffService.update(editProfile.id, editProfile as Staff);
        setUserProfile(updated);
        setEditProfile(updated);
      }
      setIsEditingProfile(false);
      showNotification("Perfil atualizado com sucesso!");
    } catch (err) {
      console.error('Erro ao atualizar perfil:', err);
      showNotification("Erro ao atualizar perfil.", 'error' as any);
    }
  };

  const deletePlan = async (id: string) => {
    try {
      await plansService.delete(id);
      setLocalPlans(prev => prev.filter(p => p.id !== id));
      showNotification('Plano removido.', 'delete' as any);
    } catch (e) {
      console.error(e);
      showNotification('Erro ao remover plano. Tente novamente.', 'error');
    }
  };

  const savePlan = async () => {
    if (!editingPlan?.name || !editingPlan?.price || !editingPlan?.durationMonths) return;
    setIsSavingPlan(true);
    try {
      if (editingPlan.id) {
        const updated = await plansService.update(editingPlan.id, editingPlan);
        setLocalPlans(prev => prev.map(p => p.id === updated.id ? updated : p));
      } else {
        const created = await plansService.create(academy.id, editingPlan);
        setLocalPlans(prev => [...prev, created]);
      }
      setIsAddingAcademyPlan(false);
      setEditingPlan(null);
      showNotification('Plano salvo com sucesso!');
    } catch (e) {
      console.error(e);
      showNotification('Erro ao salvar plano. Tente novamente.', 'error');
    } finally {
      setIsSavingPlan(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-10 transition-colors">
      <header>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{t.settings}</h1>
        <p className="text-slate-500 dark:text-slate-400">{t.welcome}<strong>{user.name}</strong>. {t.manageAccess}</p>
      </header>

      {(user.role === 'admin' || user.role === 'superuser') && (
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
            <SettingItem
              icon={<Shield className="text-green-500" />}
              title={t.additionalUsers}
              subtitle={t.manageAccess}
              onClick={async () => {
                setIsManagingAdditionalUsers(true);
                try {
                  const [iRes, sRes] = await Promise.all([
                    instructorService.getAll(academy.id, { limit: 1000 }),
                    staffService.getAll(academy.id, { limit: 1000 }),
                  ]);
                  setAdditionalUsers({ instructors: iRes.data, staff: sRes.data });
                } catch (err) {
                  console.error('Erro ao carregar equipe:', err);
                }
              }}
            />
          </div>
        </section>
      )}

      {(user.role === 'admin' || user.role === 'superuser') && (
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
                  {theme === 'dark' ? <Sun size={20} className="text-amber-500" /> : <Moon size={20} className="text-slate-600 dark:text-slate-300" />}
                </div>
                <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{t.theme}</h4>
              </div>
              <button 
                onClick={onToggleTheme}
                className={`w-12 h-6 rounded-full p-1 transition-colors ${theme === 'dark' ? 'bg-indigo-600' : 'bg-slate-300'}`}
              >
                <div className={`bg-white dark:bg-slate-800 w-4 h-4 rounded-full transition-transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-0'}`} />
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
      )}


      {userProfile && (
        <section className="space-y-4">
          <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-4">Meu Perfil / Meus Dados</h2>
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
                icon={<MapPin className="text-slate-600 dark:text-slate-300" />} 
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

      {(user.role === 'admin' || user.role === 'superuser') && (
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
                  <span className="truncate">{`${window.location.origin}/login/${academy.alias || academy.id}`}</span>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={(e) => {
                      const url = `${window.location.origin}/login/${academy.alias || academy.id}`;
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
                    href={`https://wa.me/?text=${encodeURIComponent(`Olá! Faça sua matrícula na ${academy.name} através do link: ${window.location.origin}/login/${academy.alias || academy.id}`)}`}
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
                      Este link direciona diretamente para a página de cadastro da sua unidade. Para compartilhar com alunos, clique em <b>"Share"</b> no topo do AI Studio e envie o <b>"Shared App URL"</b> que o Google fornecer, adicionando <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded">/login/{academy.alias || academy.id}</code> ao final.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {(user.role === 'admin' || user.role === 'superuser') && (
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
                className="bg-white dark:bg-slate-800 text-indigo-600 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all active:scale-95"
              >
                {t.viewPlans}
              </button>
            </div>
          </div>
        </section>
      )}

      {(user.role === 'admin' || user.role === 'superuser') && (
        <section className="space-y-4">
          <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-4">Recrutamento & Planos</h2>
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm divide-y divide-slate-50 dark:divide-slate-800 transition-colors">
            <SettingItem
              icon={<Book className="text-orange-500" />}
              title="Planos de Aula"
              subtitle={`${localPlans.length} plano${localPlans.length !== 1 ? 's' : ''} configurado${localPlans.length !== 1 ? 's' : ''}`}
              onClick={async () => {
                setIsLoadingPlans(true);
                try {
                  const [plansRes, instrRes] = await Promise.all([
                    plansService.getAll(academy.id),
                    instructorService.getAll(academy.id, { limit: 1000 }),
                  ]);
                  setLocalPlans(plansRes.data);
                  setAvailableInstructors(instrRes.data);
                } catch (err) {
                  console.error(err);
                } finally {
                  setIsLoadingPlans(false);
                }
                setIsManagingAcademyPlans(true);
              }}
            />
          </div>
        </section>
      )}

      {(user.role === 'admin' || user.role === 'superuser') && (
        <section className="space-y-4">
          <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-4">Financeiro & Pagamentos</h2>
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm divide-y divide-slate-50 dark:divide-slate-800 transition-colors">
            <div className="flex items-center justify-between p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left group">
              <div className="flex items-center gap-4">
                <div className="bg-slate-100 dark:bg-slate-800 w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110">
                  <CreditCard className="text-indigo-600" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Dados Bancários & PIX</h4>
                  <div className="text-xs text-slate-400 dark:text-slate-500 space-y-0.5">
                    {academy.pixKey
                      ? <PrivacyValue value={`PIX (${academy.pixType || 'CPF'}): ${academy.pixKey}`} maskType="generic" className="block" />
                      : <span>PIX: não configurado</span>
                    }
                    {academy.bankName
                      ? <PrivacyValue value={`${academy.bankName} — Ag: ${academy.bankAgency} • Cta: ${academy.bankAccount}`} maskType="generic" className="block" />
                      : <span>Banco: não configurado</span>
                    }
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
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[28px] md:rounded-[32px] p-5 md:p-8 animate-in zoom-in duration-300 shadow-2xl border border-slate-100 dark:border-slate-800">
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
                onClick={handleSaveNotifications}
                disabled={isSavingAcademy}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black py-4 rounded-2xl shadow-lg shadow-indigo-600/20 active:scale-95 transition-all text-sm uppercase tracking-widest"
              >
                {isSavingAcademy ? 'Salvando...' : 'Salvar Configurações'}
              </button>
              <button
                onClick={() => setIsEditingNotifications(false)}
                disabled={isSavingAcademy}
                className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold py-4 rounded-2xl active:scale-95 transition-all text-sm disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Critérios de Graduação */}
      {isEditingGraduation && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white dark:bg-slate-900 w-full max-w-[95vw] sm:max-w-lg rounded-[28px] md:rounded-[32px] p-5 md:p-8 animate-in zoom-in duration-300 shadow-2xl border border-slate-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight uppercase italic flex items-center gap-2">
                <Trophy size={20} className="text-indigo-500" /> Critérios de Graduação
              </h2>
              <button onClick={() => setIsEditingGraduation(false)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <X size={18} className="text-slate-500" />
              </button>
            </div>

            {/* Modo */}
            <div className="mb-6">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Métrica de Avaliação</label>
              <div className="grid grid-cols-3 gap-2">
                {(['classes', 'hours', 'months'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setEditGraduationRules(r => ({ ...r, mode: m }))}
                    className={`py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${
                      editGraduationRules.mode === m
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                        : 'border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:border-indigo-300'
                    }`}
                  >
                    {m === 'classes' ? 'Treinos' : m === 'hours' ? 'Horas' : 'Meses'}
                  </button>
                ))}
              </div>
              <p className="text-[9px] text-slate-400 mt-2 ml-1 italic">
                {editGraduationRules.mode === 'classes' && 'Critério baseado no número de presenças registradas.'}
                {editGraduationRules.mode === 'hours'   && 'Critério baseado no total de horas treinadas (calculado automaticamente via duração das aulas).'}
                {editGraduationRules.mode === 'months'  && 'Critério baseado nos meses desde a última graduação.'}
              </p>
            </div>

            {/* Tabela de thresholds */}
            {(() => {
              const unit = editGraduationRules.mode === 'classes' ? 'Treinos' : editGraduationRules.mode === 'hours' ? 'Horas' : 'Meses';
              const groups: Array<{
                key: 'kids' | 'white' | 'intermediate' | 'black';
                label: string;
                hasBelt: boolean;
                defaults: { belt: number; stripe: number };
              }> = [
                { key: 'kids',         label: 'Infantil (< 16 anos)',          hasBelt: true,  defaults: { belt: 100, stripe: 25 } },
                { key: 'white',        label: 'Branca (adulto)',                hasBelt: true,  defaults: { belt: 80,  stripe: 20 } },
                { key: 'intermediate', label: 'Intermediárias (Azul/Roxa/Marrom)', hasBelt: true, defaults: { belt: 160, stripe: 40 } },
                { key: 'black',        label: 'Faixa Preta',                   hasBelt: false, defaults: { belt: 0,   stripe: 300 } },
              ];
              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2 mb-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Grupo</span>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Grau ({unit})</span>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Faixa ({unit})</span>
                  </div>
                  {groups.map(g => (
                    <div key={g.key} className="grid grid-cols-3 gap-2 items-center">
                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">{g.label}</span>
                      <input
                        type="number"
                        min="1"
                        value={(editGraduationRules[g.key] as any)?.stripeThreshold ?? g.defaults.stripe}
                        onChange={e => setEditGraduationRules(r => ({
                          ...r,
                          [g.key]: { ...(r[g.key] as any), stripeThreshold: parseInt(e.target.value) || 1 },
                        }))}
                        className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-3 py-2.5 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 text-center"
                      />
                      {g.hasBelt ? (
                        <input
                          type="number"
                          min="1"
                          value={(editGraduationRules[g.key] as any)?.beltThreshold ?? g.defaults.belt}
                          onChange={e => setEditGraduationRules(r => ({
                            ...r,
                            [g.key]: { ...(r[g.key] as any), beltThreshold: parseInt(e.target.value) || 1 },
                          }))}
                          className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-3 py-2.5 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 text-center"
                        />
                      ) : (
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2.5 text-center text-[10px] text-slate-400 italic">—</div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}

            <div className="flex flex-col gap-2 mt-8">
              <button
                onClick={handleSaveGraduation}
                disabled={isSavingAcademy}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black py-4 rounded-2xl shadow-lg shadow-indigo-600/20 active:scale-95 transition-all text-sm uppercase tracking-widest"
              >
                {isSavingAcademy ? 'Salvando...' : 'Salvar Critérios'}
              </button>
              <button
                onClick={() => setIsEditingGraduation(false)}
                disabled={isSavingAcademy}
                className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold py-4 rounded-2xl active:scale-95 transition-all text-sm disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Gestão de Planos de Aula */}
      {isManagingAcademyPlans && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-[95vw] sm:max-w-2xl rounded-[28px] md:rounded-[32px] p-4 md:p-8 animate-in zoom-in duration-300 shadow-2xl border border-slate-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight uppercase italic flex items-center gap-2">
                  <Book className="text-orange-500" />
                  Planos de Aula
                </h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Horários, mensalidade e regras de presença</p>
              </div>
              <button onClick={() => setIsManagingAcademyPlans(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2">
                <X size={24} />
              </button>
            </div>

            {isLoadingPlans ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin text-indigo-500" size={32} />
              </div>
            ) : (
              <div className="space-y-4">
                <button
                  onClick={() => {
                    setEditingPlan({
                      name: '',
                      durationMonths: 1,
                      classesPerWeek: 3,
                      price: 0,
                      category: 'Adultos',
                      active: true,
                      freeSchedule: false,
                      freeDays: false,
                      freeAge: false,
                      toleranceBeforeMinutes: 15,
                      toleranceAfterStartMinutes: 15,
                      schedules: [],
                    });
                    setIsAddingAcademyPlan(true);
                  }}
                  className="w-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-black py-4 rounded-2xl border-2 border-dashed border-indigo-200 dark:border-indigo-800 flex items-center justify-center gap-2 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-all"
                >
                  <Plus size={20} /> Novo Plano de Aula
                </button>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {localPlans.map(plan => {
                    const DAY_SHORT = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
                    const activeDays = [...new Set((plan.schedules || []).map(s => s.dayOfWeek))].sort();
                    return (
                      <div key={plan.id} className={`bg-slate-50 dark:bg-slate-800 p-4 rounded-3xl border space-y-3 relative ${plan.active === false ? 'border-slate-200 dark:border-slate-700 opacity-60' : 'border-slate-100 dark:border-slate-700'}`}>
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex flex-wrap gap-1.5 items-center">
                            {plan.category && (
                              <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[9px] font-black px-2 py-0.5 rounded-lg uppercase tracking-tight italic">
                                {plan.category}
                              </span>
                            )}
                            {plan.active === false && (
                              <span className="bg-slate-200 dark:bg-slate-700 text-slate-500 text-[9px] font-black px-2 py-0.5 rounded-lg uppercase">Inativo</span>
                            )}
                          </div>
                          <button onClick={() => deletePlan(plan.id)} className="text-slate-300 hover:text-red-500 transition-colors shrink-0">
                            <Trash2 size={15} />
                          </button>
                        </div>

                        <div>
                          <h4 className="font-black text-slate-800 dark:text-white text-sm leading-tight uppercase italic">{plan.name}</h4>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                            {plan.durationMonths} {plan.durationMonths === 1 ? 'Mês' : 'Meses'} • {plan.classesPerWeek}x/sem
                            {plan.minAge || plan.maxAge ? ` • ${plan.minAge ?? 0}–${plan.maxAge ?? '∞'} anos` : ''}
                          </p>
                        </div>

                        {activeDays.length > 0 && (
                          <div className="flex gap-1 flex-wrap">
                            {[0,1,2,3,4,5,6].map(d => (
                              <span key={d} className={`w-6 h-6 rounded-full text-[9px] font-black flex items-center justify-center ${activeDays.includes(d) ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
                                {DAY_SHORT[d]}
                              </span>
                            ))}
                          </div>
                        )}

                        {(plan.schedules || []).length > 0 && (
                          <div className="space-y-1">
                            {plan.schedules!.map((s, i) => (
                              <div key={i} className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                                <Clock size={10} className="text-indigo-400 shrink-0" />
                                <span>{['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][s.dayOfWeek]} {s.startTime.slice(0,5)}–{s.endTime.slice(0,5)}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700">
                          <span className="text-lg font-black text-indigo-600 dark:text-indigo-400 italic">
                            R$ {plan.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          <button
                            onClick={() => { setEditingPlan({ ...plan }); setIsAddingAcademyPlan(true); }}
                            className="bg-white dark:bg-slate-700 p-2 rounded-xl text-slate-400 hover:text-indigo-600 shadow-sm border border-slate-100 dark:border-slate-600 transition-colors"
                          >
                            <Save size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {localPlans.length === 0 && (
                  <div className="text-center py-10">
                    <div className="bg-slate-50 dark:bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Book size={32} className="text-slate-300" />
                    </div>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest italic">Nenhum plano cadastrado</p>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6">
              <button
                onClick={() => setIsManagingAcademyPlans(false)}
                className="w-full bg-slate-900 dark:bg-slate-800 text-white font-black py-4 rounded-2xl active:scale-95 transition-all text-sm uppercase tracking-widest italic"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Adição/Edição de Plano de Aula */}
      {isAddingAcademyPlan && editingPlan && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[300] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-[95vw] sm:max-w-lg rounded-[28px] md:rounded-[32px] p-4 md:p-8 animate-in zoom-in duration-300 shadow-2xl border border-slate-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase italic">
                {editingPlan.id ? 'Editar Plano' : 'Novo Plano de Aula'}
              </h3>
              <button onClick={() => { setIsAddingAcademyPlan(false); setEditingPlan(null); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1">
                <X size={22} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Nome */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nome do Plano *</label>
                <input
                  type="text"
                  value={editingPlan.name ?? ''}
                  onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                  placeholder="Ex: Infantil – 3x Semana"
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>

              {/* Mensalidade + Duração */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Mensalidade (R$) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editingPlan.price ?? ''}
                    onChange={(e) => setEditingPlan({ ...editingPlan, price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Duração (Meses) *</label>
                  <input
                    type="number"
                    min="1"
                    value={editingPlan.durationMonths ?? 1}
                    onChange={(e) => setEditingPlan({ ...editingPlan, durationMonths: parseInt(e.target.value) || 1 })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                  />
                </div>
              </div>

              {/* Aulas/semana + Categoria */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Aulas p/ Semana</label>
                  <input
                    type="number"
                    min="1"
                    value={editingPlan.classesPerWeek ?? 3}
                    onChange={(e) => setEditingPlan({ ...editingPlan, classesPerWeek: parseInt(e.target.value) || 1 })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Categoria</label>
                  <select
                    value={editingPlan.category ?? 'Adultos'}
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

              {/* Idade mín/máx */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Idade Mínima (anos)</label>
                  <input
                    type="number"
                    min="0"
                    value={editingPlan.minAge ?? ''}
                    onChange={(e) => setEditingPlan({ ...editingPlan, minAge: e.target.value ? parseInt(e.target.value) : undefined })}
                    placeholder="Sem limite"
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Idade Máxima (anos)</label>
                  <input
                    type="number"
                    min="0"
                    value={editingPlan.maxAge ?? ''}
                    onChange={(e) => setEditingPlan({ ...editingPlan, maxAge: e.target.value ? parseInt(e.target.value) : undefined })}
                    placeholder="Sem limite"
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                  />
                </div>
              </div>

              {/* Instrutor responsável */}
              {availableInstructors.length > 0 && (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Instrutor Responsável (opcional)</label>
                  <select
                    value={editingPlan.instructorId ?? ''}
                    onChange={(e) => setEditingPlan({ ...editingPlan, instructorId: e.target.value || undefined })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none"
                  >
                    <option value="">Nenhum</option>
                    {availableInstructors.map(i => (
                      <option key={i.id} value={i.id}>{i.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Tolerâncias */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Tolerância antes (min)</label>
                  <input
                    type="number"
                    min="0"
                    value={editingPlan.toleranceBeforeMinutes ?? 15}
                    onChange={(e) => setEditingPlan({ ...editingPlan, toleranceBeforeMinutes: parseInt(e.target.value) ?? 15 })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                  />
                  <p className="text-[9px] text-slate-400 mt-1 ml-1 italic">Min. antes do início para marcar presença</p>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Tolerância após início (min)</label>
                  <input
                    type="number"
                    min="0"
                    value={editingPlan.toleranceAfterStartMinutes ?? 15}
                    onChange={(e) => setEditingPlan({ ...editingPlan, toleranceAfterStartMinutes: parseInt(e.target.value) ?? 15 })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                  />
                  <p className="text-[9px] text-slate-400 mt-1 ml-1 italic">Min. após início ainda aceitos como presença</p>
                </div>
              </div>

              {/* Horários dinâmicos */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Horários de Aula</label>
                  <button
                    type="button"
                    onClick={() => setEditingPlan({
                      ...editingPlan,
                      schedules: [...(editingPlan.schedules ?? []), { dayOfWeek: 1, startTime: '07:00', endTime: '08:00' }]
                    })}
                    className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase hover:underline"
                  >
                    <Plus size={14} /> Adicionar Horário
                  </button>
                </div>
                <div className="space-y-2">
                  {(editingPlan.schedules ?? []).map((sched, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-2xl px-3 py-2">
                      <select
                        value={sched.dayOfWeek}
                        onChange={(e) => {
                          const s = [...(editingPlan.schedules ?? [])];
                          s[idx] = { ...s[idx], dayOfWeek: parseInt(e.target.value) };
                          setEditingPlan({ ...editingPlan, schedules: s });
                        }}
                        className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-300 outline-none appearance-none cursor-pointer flex-shrink-0 w-[64px]"
                      >
                        {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map((d, i) => (
                          <option key={i} value={i}>{d}</option>
                        ))}
                      </select>
                      <input
                        type="time"
                        value={sched.startTime.slice(0, 5)}
                        onChange={(e) => {
                          const s = [...(editingPlan.schedules ?? [])];
                          s[idx] = { ...s[idx], startTime: e.target.value };
                          setEditingPlan({ ...editingPlan, schedules: s });
                        }}
                        className="bg-transparent text-xs font-mono text-slate-700 dark:text-slate-300 outline-none w-[80px]"
                      />
                      <span className="text-slate-400 text-xs">–</span>
                      <input
                        type="time"
                        value={sched.endTime.slice(0, 5)}
                        onChange={(e) => {
                          const s = [...(editingPlan.schedules ?? [])];
                          s[idx] = { ...s[idx], endTime: e.target.value };
                          setEditingPlan({ ...editingPlan, schedules: s });
                        }}
                        className="bg-transparent text-xs font-mono text-slate-700 dark:text-slate-300 outline-none w-[80px]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const s = (editingPlan.schedules ?? []).filter((_, i) => i !== idx);
                          setEditingPlan({ ...editingPlan, schedules: s });
                        }}
                        className="ml-auto text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  {(editingPlan.schedules ?? []).length === 0 && (
                    <p className="text-[10px] text-slate-400 italic text-center py-2">Nenhum horário adicionado — alunos deste plano poderão marcar presença em qualquer horário.</p>
                  )}
                </div>
              </div>

              {/* Toggle Horário Livre */}
              <div className="flex items-center justify-between pt-2">
                <div>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    Horário Livre
                    <span
                      title="Permite que os alunos registrem presença em qualquer horário, independentemente dos horários configurados no plano."
                      className="cursor-help text-slate-400 hover:text-indigo-500 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                    </span>
                  </p>
                  <p className="text-[10px] text-slate-400">Ignora a validação de horário ao registrar presença</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingPlan({ ...editingPlan, freeSchedule: !editingPlan.freeSchedule })}
                  className="transition-colors"
                >
                  {editingPlan.freeSchedule
                    ? <ToggleRight size={36} className="text-indigo-600" />
                    : <ToggleLeft size={36} className="text-slate-400" />
                  }
                </button>
              </div>

              {/* Toggle Dias Livres */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    Dias Livres
                    <span
                      title="Permite que os alunos registrem presença mais vezes por semana do que o limite definido no plano."
                      className="cursor-help text-slate-400 hover:text-indigo-500 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                    </span>
                  </p>
                  <p className="text-[10px] text-slate-400">Ignora o limite de aulas por semana ao registrar presença</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingPlan({ ...editingPlan, freeDays: !editingPlan.freeDays })}
                  className="transition-colors"
                >
                  {editingPlan.freeDays
                    ? <ToggleRight size={36} className="text-indigo-600" />
                    : <ToggleLeft size={36} className="text-slate-400" />
                  }
                </button>
              </div>

              {/* Toggle Idade Livre */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    Idade Livre
                    <span
                      title="Permite que alunos de qualquer idade registrem presença neste plano, ignorando as faixas de idade mínima e máxima configuradas."
                      className="cursor-help text-slate-400 hover:text-indigo-500 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                    </span>
                  </p>
                  <p className="text-[10px] text-slate-400">Ignora a validação de idade mínima/máxima ao registrar presença</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingPlan({ ...editingPlan, freeAge: !editingPlan.freeAge })}
                  className="transition-colors"
                >
                  {editingPlan.freeAge
                    ? <ToggleRight size={36} className="text-indigo-600" />
                    : <ToggleLeft size={36} className="text-slate-400" />
                  }
                </button>
              </div>

              {/* Toggle Plano Ativo */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Plano Ativo</p>
                  <p className="text-[10px] text-slate-400">Planos inativos não aceitam novos registros de presença</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingPlan({ ...editingPlan, active: !editingPlan.active })}
                  className="transition-colors"
                >
                  {editingPlan.active !== false
                    ? <ToggleRight size={36} className="text-indigo-600" />
                    : <ToggleLeft size={36} className="text-slate-400" />
                  }
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-6">
              <button
                onClick={savePlan}
                disabled={isSavingPlan || !editingPlan.name || !editingPlan.price || !editingPlan.durationMonths}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black py-4 rounded-2xl shadow-lg shadow-indigo-600/20 transition-all active:scale-95 text-sm uppercase tracking-widest italic flex items-center justify-center gap-2"
              >
                {isSavingPlan ? <><Loader2 size={16} className="animate-spin" /> Salvando...</> : 'Salvar Plano'}
              </button>
              <button
                onClick={() => { setIsAddingAcademyPlan(false); setEditingPlan(null); }}
                disabled={isSavingPlan}
                className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold py-4 rounded-2xl active:scale-95 transition-all text-sm uppercase tracking-widest disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Gestão de Usuários Adicionais */}
      {isManagingAdditionalUsers && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[28px] md:rounded-[32px] p-4 md:p-8 animate-in zoom-in duration-300 shadow-2xl border border-slate-100 dark:border-slate-800 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-8 shrink-0">
              <div>
                <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight uppercase italic flex items-center gap-2">
                  <Shield className="text-green-500" />
                  {t.additionalUsers}
                </h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Gestão de Instrutores e Equipe Administrativa</p>
              </div>
              <button onClick={() => setIsManagingAdditionalUsers(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
              <div className="bg-indigo-50 dark:bg-indigo-900/10 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
                <p className="text-xs text-indigo-700 dark:text-indigo-400 font-medium leading-relaxed mb-4">
                  Para conceder acesso ao sistema a um novo colaborador, basta cadastrá-lo nas seções de <b>Mestres</b> ou <b>Staff</b>. 
                  O e-mail cadastrado servirá como identificador de login para eles.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link 
                    to="/instructors" 
                    onClick={() => setIsManagingAdditionalUsers(false)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-2"
                  >
                    <Crown size={14} /> Gerenciar Mestres
                  </Link>
                  <Link 
                    to="/staff" 
                    onClick={() => setIsManagingAdditionalUsers(false)}
                    className="bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-all flex items-center gap-2"
                  >
                    <Briefcase size={14} /> Gerenciar Staff
                  </Link>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic ml-1">Equipe com Acesso</h3>
                
                <div className="space-y-2">
                  {/* Mestres */}
                  {additionalUsers.instructors.map(instructor => (
                    <div key={instructor.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl group">
                      <div className="flex items-center gap-3">
                        <div className="bg-indigo-100 dark:bg-indigo-900/30 w-10 h-10 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                          <Crown size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-800 dark:text-white uppercase italic">{instructor.name}</p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase">{instructor.email || 'Email não cadastrado'}</p>
                        </div>
                      </div>
                      <span className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-[8px] font-black px-2 py-1 rounded-lg uppercase italic tracking-tighter">Instrutor</span>
                    </div>
                  ))}

                  {/* Staff */}
                  {additionalUsers.staff.map(staffMember => (
                    <div key={staffMember.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className="bg-slate-200 dark:bg-slate-700 w-10 h-10 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-400">
                          <Users size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-800 dark:text-white uppercase italic">{staffMember.name}</p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase">{staffMember.email || 'Email não cadastrado'}</p>
                        </div>
                      </div>
                      <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-[8px] font-black px-2 py-1 rounded-lg uppercase italic tracking-tighter">Staff</span>
                    </div>
                  ))}

                  {additionalUsers.instructors.length === 0 && additionalUsers.staff.length === 0 && (
                    <div className="text-center py-10 opacity-40">
                      <Users size={40} className="mx-auto mb-2" />
                      <p className="text-xs font-bold uppercase tracking-widest italic">Nenhum membro da equipe cadastrado</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <button 
                onClick={() => setIsManagingAdditionalUsers(false)}
                className="w-full bg-slate-900 dark:bg-slate-800 text-white font-black py-4 rounded-2xl active:scale-95 transition-all text-sm uppercase tracking-widest italic"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição da Academia
          CAMPOS OBRIGATÓRIOS — ao editar este modal, garanta que todos estão presentes como <input>:
          - logo         (upload de imagem)
          - name         (Nome da Unidade)
          - alias        (Apelido / Link da Academia → /login/:alias)
          - ownerName    (Responsável Técnico)
          - cep          (CEP com autocomplete de endereço)
          - address      (Endereço)
          - addressNumber (Número)
          - phone        (Telefone / WhatsApp)
          Payload de save: handleSaveAcademyData() — manter em sincronia com esta lista.
      */}
      {isEditingAcademy && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[28px] md:rounded-[32px] p-4 md:p-8 animate-in zoom-in duration-300 shadow-2xl border border-slate-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto custom-scrollbar">
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
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Apelido / Link da Academia</label>
                <input
                  type="text"
                  value={editAcademy.alias || ''}
                  onChange={(e) => setEditAcademy({ ...editAcademy, alias: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                  placeholder="ex: nexdojo"
                />
                <p className="text-[10px] text-slate-400 mt-1 ml-1">Link: <span className="font-mono">/login/{editAcademy.alias || '<apelido>'}</span></p>
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
                onClick={handleSaveAcademyData}
                disabled={isSavingAcademy}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black py-4 rounded-2xl shadow-lg shadow-indigo-600/20 active:scale-95 transition-all text-sm uppercase tracking-widest"
              >
                {isSavingAcademy ? 'Salvando...' : 'Salvar Alterações'}
              </button>
              <button
                onClick={() => setIsEditingAcademy(false)}
                disabled={isSavingAcademy}
                className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold py-4 rounded-2xl active:scale-95 transition-all text-sm disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição de Perfil do Usuário */}
      {isEditingProfile && editProfile && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[28px] md:rounded-[32px] p-4 md:p-8 animate-in zoom-in duration-300 shadow-2xl border border-slate-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto custom-scrollbar">
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

                {['student', 'instructor', 'staff'].includes(user.role) && (
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
                      <DateSelectInput
                        label="Data de Nascimento"
                        labelClassName="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1"
                        value={(editProfile as any).birthDate || ''}
                        onChange={v => setEditProfile({ ...editProfile, birthDate: v } as any)}
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
                        <option value="Masculino">Masculino</option>
                        <option value="Feminino">Feminino</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </div>
                  </>
                )}

                {user.role === 'instructor' && (
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 text-indigo-500">Minhas Especialidades</label>
                    <input 
                      type="text" 
                      value={(editProfile as any).specialties || ''}
                      onChange={(e) => setEditProfile({ ...editProfile, specialties: e.target.value } as any)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                      placeholder="Ex: Kids, No-Gi, Competição..."
                    />
                  </div>
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
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[28px] md:rounded-[32px] p-5 md:p-8 animate-in zoom-in duration-300 shadow-2xl border border-slate-100 dark:border-slate-800">
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
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1.5 block ml-1">Banco</label>
                    <input
                      type="text"
                      value={editAcademy.bankName || ''}
                      onChange={(e) => setEditAcademy({ ...editAcademy, bankName: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-4 text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                      placeholder="Ex: Itaú, Bradesco"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1.5 block ml-1">Agência</label>
                      <input
                        type="text"
                        value={editAcademy.bankAgency || ''}
                        onChange={(e) => setEditAcademy({ ...editAcademy, bankAgency: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-4 text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                        placeholder="0000"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1.5 block ml-1">Conta</label>
                      <input
                        type="text"
                        value={editAcademy.bankAccount || ''}
                        onChange={(e) => setEditAcademy({ ...editAcademy, bankAccount: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-4 text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                        placeholder="00000-0"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-8">
              <button
                onClick={handleSavePayment}
                disabled={isSavingAcademy}
                className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-black py-4 rounded-2xl shadow-lg shadow-green-600/20 active:scale-95 transition-all text-xs uppercase tracking-widest"
              >
                {isSavingAcademy ? 'Salvando...' : 'Confirmar Dados'}
              </button>
              <button
                onClick={() => setIsEditingPayment(false)}
                disabled={isSavingAcademy}
                className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold py-4 rounded-2xl active:scale-95 transition-all text-xs disabled:opacity-50"
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
            {['admin', 'superuser'].includes(user.role) && (
              <SettingItem
                icon={<Trophy className="text-indigo-500" />}
                title="Critérios de Graduação"
                subtitle={(() => {
                  const r = academy.graduationRules;
                  if (!r) return 'Padrão do sistema (treinos)';
                  const modeLabel = r.mode === 'hours' ? 'horas' : r.mode === 'months' ? 'meses' : 'treinos';
                  return `Por ${modeLabel} · Branca: ${r.white?.beltThreshold ?? 80} · Intermediária: ${r.intermediate?.beltThreshold ?? 160}`;
                })()}
                onClick={() => {
                  setEditGraduationRules(academy.graduationRules ?? defaultGraduationRules());
                  setIsEditingGraduation(true);
                }}
              />
            )}
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
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[32px] md:rounded-[40px] p-4 md:p-10 animate-in zoom-in duration-300 shadow-2xl border border-slate-100 dark:border-slate-800 max-h-[95vh] overflow-y-auto custom-scrollbar">
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
                  className="w-full py-4 bg-white dark:bg-slate-800 text-slate-950 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
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
      <ConfirmDialog
        open={!!isCheckingOut}
        onClose={() => setIsCheckingOut(null)}
        onConfirm={() => {
          if (!isCheckingOut) return;
          onUpdateAcademy({ ...academy, currentPlan: isCheckingOut as any, planStatus: 'Active' });
          setIsCheckingOut(null);
          setIsEditingPlans(false);
          setShowPlanNotification(true);
          setTimeout(() => setShowPlanNotification(false), 4000);
        }}
        title="Finalizar Compra"
        message={<>Você está assinando o plano <span className="text-indigo-600 font-bold">{isCheckingOut}</span>. Deseja confirmar a transação segura?</>}
        confirmLabel="Pagar com Cartão / Pix"
        variant="primary"
        icon={<CreditCard size={32} />}
      />

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
