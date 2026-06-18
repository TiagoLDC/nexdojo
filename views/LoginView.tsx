
import React, { useState, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { User, Academy, Student, Instructor, Staff, Belt, AcademyPlan } from '../types';
import { useTranslation } from '../services/LanguageContext';
import { fetchAddressByCep, maskCEP, maskPhone, maskCPF, maskRG } from '../services/cep';
import { authService } from '@/features/auth/services/authService';
import { academyService } from '@/features/settings/services/academyService';
import { api, setApiToken } from '@/lib/api';
import { DateSelectInput } from '@/components/ui';
import {
  Trophy,
  Mail,
  Lock,
  ArrowRight,
  Users,
  Award,
  ChevronLeft,
  Camera,
  User as UserIcon,
  X,
  Plus,
  Minus,
  ArrowLeft,
  MapPin,
  Phone,
  Activity,
  GraduationCap,
  Heart,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Upload
} from 'lucide-react';
import { BELT_COLORS } from '../constants';

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

const compressImage = (base64Str: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_SIZE = 400;
      let w = img.width, h = img.height;
      if (w > h) { if (w > MAX_SIZE) { h *= MAX_SIZE / w; w = MAX_SIZE; } }
      else { if (h > MAX_SIZE) { w *= MAX_SIZE / h; h = MAX_SIZE; } }
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
  });
};

interface LoginViewProps {
  onLogin: (user: User, token: string, academy: Academy | null) => void;
}

type AuthView = 'login' | 'choice' | 'signup-academy' | 'signup-student' | 'signup-instructor' | 'forgot-password';

const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const { t, showNotification } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { alias } = useParams<{ alias?: string }>();

  const view: AuthView =
    pathname.includes('/forgot-password') ? 'forgot-password' :
    pathname.includes('/register/academy') ? 'signup-academy' :
    pathname.includes('/register/student') ? 'signup-student' :
    pathname.includes('/register/instructor') ? 'signup-instructor' :
    pathname.includes('/register') ? 'choice' :
    'login';

  const setView = (v: AuthView) => {
    const base = alias ? `/login/${alias}` : '/login';
    const paths: Record<AuthView, string> = {
      login: base,
      'forgot-password': `${base}/forgot-password`,
      choice: `${base}/register`,
      'signup-academy': '/login/register/academy',
      'signup-student': `${base}/register/student`,
      'signup-instructor': `${base}/register/instructor`,
    };
    navigate(paths[v]);
  };

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [regPassword, setRegPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Senha temporária: dados pendentes enquanto o usuário define nova senha
  const [pendingAuth, setPendingAuth] = useState<{ user: User; token: string; academy: Academy | null } | null>(null);
  const [newPass, setNewPass] = useState('');
  const [confirmNewPass, setConfirmNewPass] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [_isFromSharedLink, setIsFromSharedLink] = useState(false);
  const [linkedAcademy, setLinkedAcademy] = useState<Academy | null>(null);
  const [academyPlans, setAcademyPlans] = useState<AcademyPlan[]>([]);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      showNotification('Informe o e-mail cadastrado', 'error');
      return;
    }
    setIsSendingReset(true);
    try {
      await authService.forgotPassword(forgotEmail.trim());
      setForgotSent(true);
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Não foi possível enviar o link agora. Tente novamente em alguns minutos.';
      showNotification(msg, 'error');
    } finally {
      setIsSendingReset(false);
    }
  };

  // Redireciona cadastro de aluno/instrutor sem alias (academia obrigatória na URL)
  React.useEffect(() => {
    if ((view === 'signup-student' || view === 'signup-instructor') && !alias) {
      navigate('/login');
    }
  }, [view, alias, navigate]);

  // Reset terms when switching signup views
  React.useEffect(() => {
    if (view.startsWith('signup-')) {
      setAcceptedTerms(false);
    }
  }, [view]);

  // Detecção de academia via alias de rota
  React.useEffect(() => {
    if (!alias) return;

    api.get<Academy>(`/academies/by-alias/${alias}`)
      .then(r => {
        const found = r.data;
        setLinkedAcademy(found);
        setIsFromSharedLink(true);
        setStudentData(prev => ({ ...prev, academyId: found.id }));
        setInstructorData(prev => ({ ...prev, academyId: found.id }));
        setStaffData(prev => ({ ...prev, academyId: found.id }));

        api.get<{ data: AcademyPlan[] }>(`/plans/public?academyId=${found.id}`)
          .then(pr => setAcademyPlans(pr.data.data ?? []))
          .catch(() => setAcademyPlans([]));
      })
      .catch(() => {
        // alias não encontrado — sem branding
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alias]);

  const [academyData, setAcademyData] = useState({
    name: '',
    logo: 'https://images.unsplash.com/photo-1511884642898-4c92249e20b6?q=80&w=400&h=400&auto=format&fit=crop',
    owner: '',
    email: '',
    password: '',
    cep: '',
    address: '',
    addressNumber: '',
    phone: ''
  });
  const [studentData, setStudentData] = useState<Partial<Student>>({
    name: '', belt: Belt.WHITE, stripes: 0, birthDate: '', status: 'Pending',
    academyId: '',
    joinDate: new Date().toISOString(), totalClasses: 0, totalHours: 0,
    absentCount: 0, gender: 'Masculino', weight: '', height: '',
    bloodType: '', emergencyContact: '', emergencyPhone: '', lastGraduationDate: '',
    cep: '', address: '', addressNumber: '', planId: undefined
  });
  const [instructorData, setInstructorData] = useState<Partial<Instructor>>({
    name: '', belt: Belt.BLACK, stripes: 0, birthDate: '', status: 'Pending',
    academyId: '',
    joinDate: new Date().toISOString(), gender: 'Masculino', cpf: '', rg: '',
    maritalStatus: 'Solteiro', lastGraduationDate: '', specialties: '',
    cep: '', address: '', addressNumber: ''
  });
  const [_staffData, setStaffData] = useState<Partial<Staff>>({
    name: '', birthDate: '', status: 'Pending', joinDate: new Date().toISOString(),
    academyId: '',
    gender: 'Masculino', cpf: '', rg: '', position: '',
    cep: '', address: '', addressNumber: '',
    medicalNotes: ''
  });

  const photoRef = useRef<HTMLInputElement>(null);
  const photoCameraRef = useRef<HTMLInputElement>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      const { token, user } = await authService.login({ email, password });
      setApiToken(token);
      let academy: Academy | null = null;
      if (user.academyId) {
        try {
          academy = await academyService.get(user.academyId);
        } catch {
          // academia não encontrada — prosseguir sem branding
        }
      }
      if ((user as any).requiresPasswordChange) {
        setPendingAuth({ user: user as unknown as User, token, academy });
        return;
      }
      onLogin(user as unknown as User, token, academy);
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'E-mail ou senha incorretos.';
      showNotification(msg, 'error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingAuth) return;
    if (newPass.length < 6) {
      showNotification('A nova senha deve ter no mínimo 6 caracteres.', 'error');
      return;
    }
    if (newPass !== confirmNewPass) {
      showNotification('As senhas não coincidem.', 'error');
      return;
    }
    setIsSavingPassword(true);
    try {
      await authService.changePassword(newPass);
      const updatedUser = { ...pendingAuth.user, requiresPasswordChange: false };
      onLogin(updatedUser, pendingAuth.token, pendingAuth.academy);
    } catch (err: any) {
      showNotification(err?.response?.data?.error || 'Erro ao alterar senha.', 'error');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleRegisterAcademy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!academyData.name || !academyData.owner || !academyData.email) {
      const missing: string[] = [];
      if (!academyData.owner) missing.push('Seu Nome');
      if (!academyData.name) missing.push('Nome da Unidade');
      if (!academyData.email) missing.push('E-mail de Contato');
      showNotification(`Preencha os campos obrigatórios: ${missing.join(', ')}.`, 'error');
      return;
    }
    if (!academyData.password) {
      showNotification("Defina uma senha para o administrador.", 'error');
      return;
    }
    if (academyData.password !== confirmPassword) {
      showNotification("As senhas não coincidem.", 'error');
      return;
    }
    if (!acceptedTerms) {
      showNotification("Você precisa aceitar os Termos de Responsabilidade.", 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/auth/register/academy', {
        name: academyData.name,
        ownerName: academyData.owner,
        email: academyData.email,
        password: academyData.password,
        logo: academyData.logo,
        cep: academyData.cep,
        address: academyData.address,
        addressNumber: academyData.addressNumber,
        phone: academyData.phone,
      });
      showNotification("Academia criada com sucesso! Acesse com suas credenciais. OSS!");
      setView('login');
      setEmail(academyData.email);
    } catch (err: any) {
      showNotification(err?.response?.data?.error || 'Erro ao criar academia.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterStudent = async () => {
    if (!acceptedTerms) {
      showNotification("Você precisa aceitar os Termos de Responsabilidade.", 'error');
      return;
    }
    if (!studentData.name || !studentData.birthDate || !studentData.email || !regPassword || !studentData.academyId) {
      showNotification("Preencha todos os campos obrigatórios (*).", 'error');
      return;
    }
    const age = calculateAge(studentData.birthDate || '');
    if (age > 0 && age < 18 && (!studentData.guardianName || !studentData.guardianPhone)) {
      showNotification("Para menores de idade, preencha o Nome e o WhatsApp do Responsável Legal.", 'error');
      return;
    }
    if (regPassword !== confirmPassword) {
      showNotification("As senhas não coincidem.", 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/auth/register/student', {
        academyId: studentData.academyId,
        name: studentData.name,
        email: studentData.email,
        password: regPassword,
        belt: studentData.belt,
        stripes: studentData.stripes,
        birthDate: studentData.birthDate,
        gender: studentData.gender,
        phone: studentData.phone,
        cpf: studentData.cpf,
        rg: studentData.rg,
        weight: studentData.weight,
        height: studentData.height,
        bloodType: studentData.bloodType,
        emergencyContact: studentData.emergencyContact,
        emergencyPhone: studentData.emergencyPhone,
        cep: studentData.cep,
        address: studentData.address,
        addressNumber: studentData.addressNumber,
        guardianName: studentData.guardianName,
        guardianPhone: studentData.guardianPhone,
        guardianRelation: studentData.guardianRelation,
        guardianCpf: studentData.guardianCpf,
        medicalNotes: studentData.medicalNotes,
        lastGraduationDate: studentData.lastGraduationDate || undefined,
        photo: studentData.photo,
        planId: studentData.planId || undefined,
      });
      showNotification("Matrícula realizada com sucesso! Aguarde aprovação. OSS!");
      setView('login');
    } catch (err: any) {
      showNotification(err?.response?.data?.error || 'Erro ao realizar matrícula.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCepLookup = async (cep: string, setter: (cep: string, address: string) => void) => {
    const masked = maskCEP(cep);
    if (masked.replace(/\D/g, '').length === 8) {
      setIsLoadingCep(true);
      const data = await fetchAddressByCep(masked);
      if (data) {
        setter(masked, data.fullAddress);
      } else {
        setter(masked, '');
      }
      setIsLoadingCep(false);
    } else {
      setter(masked, '');
    }
  };

  const handleRegisterInstructor = async () => {
    if (!acceptedTerms) {
      showNotification("Você precisa aceitar os Termos de Responsabilidade.", 'error');
      return;
    }
    if (!instructorData.name || !instructorData.birthDate || !instructorData.email || !regPassword || !instructorData.academyId) {
      showNotification("Preencha todos os campos obrigatórios (*).", 'error');
      return;
    }
    if (regPassword !== confirmPassword) {
      showNotification("As senhas não coincidem.", 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/auth/register/instructor', {
        academyId: instructorData.academyId,
        name: instructorData.name,
        email: instructorData.email,
        password: regPassword,
        belt: instructorData.belt,
        stripes: instructorData.stripes,
        birthDate: instructorData.birthDate,
        gender: instructorData.gender,
        cpf: instructorData.cpf,
        rg: instructorData.rg,
        maritalStatus: instructorData.maritalStatus,
        lastGraduationDate: instructorData.lastGraduationDate,
        specialties: instructorData.specialties,
        cep: instructorData.cep,
        address: instructorData.address,
        addressNumber: instructorData.addressNumber,
        phone: instructorData.phone,
        photo: instructorData.photo,
      });
      showNotification("Ficha Técnica enviada! Aguarde aprovação. OSS!");
      setView('login');
    } catch (err: any) {
      showNotification(err?.response?.data?.error || 'Erro ao enviar ficha.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'student' | 'instructor' | 'staff') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const compressed = await compressImage(reader.result as string);
      if (type === 'student') setStudentData(prev => ({ ...prev, photo: compressed }));
      else if (type === 'instructor') setInstructorData(prev => ({ ...prev, photo: compressed }));
      else setStaffData(prev => ({ ...prev, photo: compressed }));
    };
    reader.readAsDataURL(file);
  };

  const studentAge = calculateAge(studentData.birthDate || '');
  const isMinor = studentAge > 0 && studentAge < 18;

  if (pendingAuth) {
    return (
      <div className="h-[100dvh] overflow-hidden relative login-app flex items-center justify-center">
        <div className="login-grain" />
        <div className="w-full max-w-md mx-auto px-6 z-10">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 flex flex-col gap-6">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                <ShieldCheck size={28} className="text-indigo-600" />
              </div>
              <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">Defina sua nova senha</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                O administrador redefiniu sua senha. Por segurança, escolha uma senha definitiva para continuar.
              </p>
            </div>

            <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1 flex items-center justify-between">
                  <span>Nova Senha <span className="text-red-500">*</span></span>
                  <button type="button" onClick={() => setShowNewPass(p => !p)} className="text-slate-400">
                    {showNewPass ? <EyeOff size={12} /> : <Eye size={12} />}
                  </button>
                </label>
                <input
                  type={showNewPass ? 'text' : 'password'}
                  value={newPass}
                  onChange={e => setNewPass(e.target.value)}
                  placeholder="Mín. 6 caracteres"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-900 dark:text-white placeholder:text-slate-400"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">
                  Confirmar Nova Senha <span className="text-red-500">*</span>
                </label>
                <input
                  type={showNewPass ? 'text' : 'password'}
                  value={confirmNewPass}
                  onChange={e => setConfirmNewPass(e.target.value)}
                  placeholder="Repita a senha"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-900 dark:text-white placeholder:text-slate-400"
                />
              </div>
              <button
                type="submit"
                disabled={isSavingPassword}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 uppercase tracking-widest mt-2"
              >
                {isSavingPassword ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                {isSavingPassword ? 'Salvando...' : 'Salvar e Entrar'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'login') {
    const academyInitials = linkedAcademy
      ? linkedAcademy.name.split(/\s+/).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
      : 'ND';

    return (
      <div className="h-[100dvh] overflow-hidden relative login-app">
        <div className="login-grain" />
        <div className="login-split">
          {/* ── Hero Panel ── */}
          <aside className="login-hero">
            <div className="login-hero-top">
              <div className="login-brand-card">
                <img
                  src="/logo.png"
                  alt="NexDojo"
                  className="login-brand-logo"
                />
              </div>
              <span className="login-brand-name">
                <span className="login-brand-nex">Nex</span><span className="login-brand-dojo">Dojo</span>
              </span>
            </div>

            {linkedAcademy && (
              <div className="login-academy-badge">
                <div className="login-academy-img">
                  {linkedAcademy.logo ? (
                    <img src={linkedAcademy.logo} alt={linkedAcademy.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                  ) : (
                    <span className="login-academy-initials">{academyInitials}</span>
                  )}
                  <div className="login-academy-ring" />
                </div>
                <div className="login-academy-meta">
                  <span className="login-academy-name">{linkedAcademy.name}</span>
                  {linkedAcademy.ownerName && (
                    <span className="login-academy-owner">{linkedAcademy.ownerName}</span>
                  )}
                  <span className="login-academy-tag">Academia verificada</span>
                </div>
              </div>
            )}

            <div className="login-hero-mid">
              <h1 className="login-hero-h1">
                Bem-vindo<br />de volta ao<br />
                <span className="login-hero-accent">tatame.</span>
              </h1>
              <p className="login-hero-lead">Gerencie sua academia de BJJ com precisão, eficiência e estilo.</p>
            </div>

            <p className="login-micro">◆ Mais de 320 academias confiam no NexDojo</p>
          </aside>

          {/* ── Form Panel ── */}
          <main className="login-form-side">
            <div className="login-form-shell">
              {/* Mobile-only brand: shown only when hero panel is hidden (< 960px) */}
              <div className="login-mobile-brand">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="login-brand-card" style={{ width: 32, height: 32, borderRadius: 8 }}>
                    <img src="/logo.png" alt="NexDojo" style={{ width: 20, height: 20, objectFit: 'contain' }} />
                  </div>
                  <span className="login-brand-name" style={{ fontSize: 18 }}>
                    <span className="login-brand-nex">Nex</span><span className="login-brand-dojo">Dojo</span>
                  </span>
                </div>
                {linkedAcademy && (
                  <div className="login-mobile-brand-academy">
                    <div style={{ width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', background: 'rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {linkedAcademy.logo ? (
                        <img src={linkedAcademy.logo} alt={linkedAcademy.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: 9, fontWeight: 900, color: '#818cf8' }}>{academyInitials}</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <span style={{ fontSize: 11, fontWeight: 900, color: 'rgba(255,255,255,0.75)', letterSpacing: '0.04em', lineHeight: 1.2 }}>{linkedAcademy.name}</span>
                      {linkedAcademy.ownerName && (
                        <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase', lineHeight: 1.2 }}>{linkedAcademy.ownerName}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
<h2 className="login-form-title">{t.accessPortal}</h2>
              <p className="login-form-sub">Entre com suas credenciais para continuar</p>

              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Email field */}
                <div className="login-field">
                  <label className="login-field-label">E-mail</label>
                  <div className="login-input-wrap">
                    <span className="login-input-icon"><Mail size={16} /></span>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="professor@academia.com"
                      className="login-input"
                      autoComplete="email"
                    />
                  </div>
                </div>

                {/* Password field */}
                <LoginPasswordField value={password} onChange={setPassword} />

                <button type="submit" className="login-btn-primary" disabled={isLoggingIn}>
                  {isLoggingIn ? <Loader2 size={18} className="animate-spin" /> : <>{t.enterMat} <ArrowRight size={18} /></>}
                </button>
              </form>

              <div className="login-below">
                <span className="login-below-a">{t.forgotPasswordLabel}?&nbsp;
                  <button type="button" onClick={() => setView('forgot-password')} className="login-lnk">{t.forgotPasswordLabel}</button>
                </span>
                <button type="button" onClick={() => setView('choice')} className="login-lnk" style={{ marginTop: '4px' }}>{t.newHereSignUp}</button>
              </div>

              <div className="login-footer-bar">
                <span>© 2026 NexDojo</span>
                <span style={{ margin: '0 6px' }}>·</span>
                <span>Termos</span>
                <span style={{ margin: '0 6px' }}>·</span>
                <span>Privacidade</span>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] h-[100dvh] overflow-y-auto login-app flex flex-col items-center justify-start py-8 px-4 relative custom-scrollbar">
      <div className="w-full max-w-5xl space-y-8 py-6 md:py-10">

        {/* Header Comum */}
        {view === 'choice' && (
          <div className="animate-in fade-in duration-700">
            {linkedAcademy ? (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="login-brand-card">
                    <img src="/logo.png" alt="NexDojo" className="login-brand-logo" />
                  </div>
                  <span className="login-brand-name">
                    <span className="login-brand-nex">Nex</span><span className="login-brand-dojo">Dojo</span>
                  </span>
                </div>
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-28 h-28 bg-indigo-600 rounded-full mb-6 shadow-2xl shadow-indigo-600/30 overflow-hidden ring-4 ring-slate-800/50">
                    {linkedAcademy.logo ? (
                      <img src={linkedAcademy.logo} alt={linkedAcademy.name} className="w-full h-full object-cover" />
                    ) : (
                      <Award className="text-white" size={40} />
                    )}
                  </div>
                  <h1 className="text-2xl md:text-4xl font-black text-white tracking-tighter uppercase leading-none">{linkedAcademy.name}</h1>
                  {linkedAcademy.ownerName && (
                    <p className="text-indigo-400 font-black text-xs uppercase tracking-[0.25em] mt-2">{linkedAcademy.ownerName}</p>
                  )}
                  <p className="text-slate-400 mt-3 font-bold text-xs uppercase tracking-[0.3em] opacity-80">{t.legacyContinues}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="login-brand-card">
                  <img src="/logo.png" alt="NexDojo" className="login-brand-logo" />
                </div>
                <span className="login-brand-name">
                  <span className="login-brand-nex">Nex</span><span className="login-brand-dojo">Dojo</span>
                </span>
              </div>
            )}
          </div>
        )}

        {/* VIEW: FORGOT PASSWORD */}
        {view === 'forgot-password' && (
          <div className="max-w-md mx-auto space-y-6 animate-in fade-in zoom-in duration-300">
            <button
              onClick={() => { setView('login'); setForgotSent(false); }}
              className="text-white flex items-center gap-2 mb-4 hover:text-indigo-400 transition-colors font-bold text-xs uppercase tracking-[0.2em]"
            >
              <ChevronLeft size={18} /> {t.backToLogin}
            </button>

            <div className="bg-white dark:bg-slate-900 rounded-[40px] p-8 md:p-10 shadow-2xl space-y-6">
              {!forgotSent ? (
                <>
                  <div className="text-center space-y-2">
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Recuperar Senha</h2>
                    <p className="text-sm text-slate-400 font-medium leading-relaxed">
                      Informe o e-mail cadastrado e enviaremos um link para você criar uma nova senha.
                    </p>
                  </div>

                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <Input
                      label="E-mail Cadastrado"
                      type="email"
                      value={forgotEmail}
                      onChange={setForgotEmail}
                      placeholder="seu@email.com"
                      icon={<Mail size={18} />}
                      autoComplete="email"
                      required
                    />

                    <button
                      type="submit"
                      disabled={isSendingReset}
                      className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-400 text-white font-black rounded-2xl shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:cursor-not-allowed"
                    >
                      {isSendingReset ? (
                        <><Loader2 size={20} className="animate-spin" /> Enviando…</>
                      ) : (
                        <>Enviar link de recuperação <ArrowRight size={20} /></>
                      )}
                    </button>
                  </form>
                </>
              ) : (
                <div className="space-y-6 text-center">
                  <div className="w-16 h-16 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <CheckCircle2 className="text-green-600 dark:text-green-400" size={36} />
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Verifique seu E-mail</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                      Se o e-mail informado estiver cadastrado, você receberá um link de recuperação em instantes.
                      O link é válido por <strong>30 minutos</strong>.
                    </p>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-left">
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      <strong className="text-slate-700 dark:text-slate-300">Não recebeu o e-mail?</strong><br />
                      Confira a caixa de spam ou aguarde alguns minutos antes de tentar novamente.
                    </p>
                  </div>

                  <button
                    onClick={() => { setView('login'); setForgotSent(false); setEmail(forgotEmail); }}
                    className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    Voltar ao Login <ArrowRight size={20} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW: CHOICE */}
        {view === 'choice' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <button onClick={() => setView('login')} className="text-white flex items-center gap-2 mb-4 hover:text-indigo-400 transition-colors font-bold text-xs uppercase tracking-[0.2em]">
              <ChevronLeft size={18} /> Voltar ao Login
            </button>
            <div className="flex justify-center">
              {!alias && (
                <div className="w-full max-w-xs">
                  <ChoiceCard icon={<Trophy size={28} />} title="Nova Academia" desc="Para instrutores e gestores." onClick={() => setView('signup-academy')} />
                </div>
              )}
              {alias && (
                <div className="flex flex-col sm:flex-row gap-4 w-full max-w-lg">
                  <div className="flex-1">
                    <ChoiceCard icon={<Users size={28} />} title="Sou Aluno" desc="Fazer matrícula agora." onClick={() => setView('signup-student')} />
                  </div>
                  <div className="flex-1">
                    <ChoiceCard icon={<Award size={28} />} title="Sou Instrutor" desc="Ficha técnica do instrutor." onClick={() => setView('signup-instructor')} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW: SIGNUP ACADEMY */}
        {view === 'signup-academy' && (
          <form onSubmit={handleRegisterAcademy} className="max-w-md mx-auto bg-white dark:bg-slate-900 rounded-[40px] p-6 md:p-10 shadow-2xl space-y-6 animate-in zoom-in duration-300 pb-32">
            <div className="flex items-center gap-4 mb-2 sticky top-0 bg-white dark:bg-slate-900 py-2 z-10 border-b dark:border-slate-800 mb-4">
              <button type="button" onClick={() => setView('choice')} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500"><ArrowLeft size={20} /></button>
              <h2 className="text-2xl font-black text-slate-800 dark:text-white">Criar Academia</h2>
            </div>
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-3 mb-6">
                  <div
                    onClick={() => photoRef.current?.click()}
                    className="w-32 h-32 bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-[32px] overflow-hidden flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 transition-all shadow-inner group relative"
                  >
                    {academyData.logo ? (
                      <img src={academyData.logo} className="w-full h-full object-contain p-2" />
                    ) : (
                      <div className="flex flex-col items-center text-slate-400 group-hover:scale-110 transition-transform">
                        <Camera size={32} />
                        <span className="text-[10px] font-black uppercase mt-1">Logo</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-indigo-600/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                      <span className="text-[10px] font-black uppercase italic bg-white dark:bg-slate-900 px-4 py-2 rounded-2xl shadow-sm border border-indigo-100 dark:border-indigo-800">Alterar</span>
                    </div>
                  </div>
                  <input
                    type="file"
                    ref={photoRef}
                    className="hidden"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = async () => {
                          const compressed = await compressImage(reader.result as string);
                          setAcademyData({...academyData, logo: compressed});
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Logo da sua Academia</p>
                </div>
                <Input label="Seu Nome" value={academyData.owner} onChange={v => setAcademyData({...academyData, owner: v})} placeholder="Mestre Hélio" autoComplete="name" />
                <Input label="Nome da Unidade" value={academyData.name} onChange={v => setAcademyData({...academyData, name: v})} placeholder="Ex: NexDojo" autoComplete="organization" />
                <div className="space-y-1">
                  <Input label="E-mail de Contato" type="email" value={academyData.email} onChange={v => setAcademyData({...academyData, email: v})} placeholder="ct@oss.com" autoComplete="email" />
                  <p className="text-[10px] text-slate-400 ml-1 font-bold">Usado para fazer login no sistema</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Definir Senha" type="password" value={academyData.password} onChange={v => setAcademyData({...academyData, password: v})} placeholder="••••••••" icon={<Lock size={18} />} autoComplete="new-password" />
                  <Input label="Confirmar Senha" type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="••••••••" icon={<Lock size={18} />} autoComplete="new-password" />
                </div>
                <Input label="WhatsApp / Telefone" value={academyData.phone} onChange={v => setAcademyData({...academyData, phone: maskPhone(v)})} placeholder="(00) 00000-0000" icon={<Phone size={16} />} inputMode="numeric" autoComplete="tel" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="CEP"
                    value={academyData.cep || ''}
                    onChange={v => handleCepLookup(v, (c, a) => setAcademyData(prev => ({...prev, cep: c, address: a})))}
                    placeholder="00000-000"
                    icon={isLoadingCep ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
                    inputMode="numeric"
                    autoComplete="postal-code"
                  />
                  <Input
                    label="Número"
                    value={academyData.addressNumber || ''}
                    onChange={v => setAcademyData({...academyData, addressNumber: v})}
                    placeholder="Ex: 123"
                    inputMode="numeric"
                    autoComplete="off"
                  />
                </div>
                <Input
                  label="Endereço (Auto)"
                  value={academyData.address || ''}
                  onChange={v => setAcademyData({...academyData, address: v})}
                  placeholder="Rua, Bairro, Cidade..."
                  autoComplete="street-address"
                />
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 md:p-6 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={acceptedTerms}
                    onChange={e => setAcceptedTerms(e.target.checked)}
                    className="mt-1 w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="terms" className="text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                    Li e concordo com o <button type="button" onClick={() => setShowTermsModal(true)} className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">Termo de Responsabilidade e Cessão de Imagem</button> desta unidade.
                  </label>
                </div>
              </div>

            <button type="submit" disabled={isSubmitting} className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-2">
              {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : 'Finalizar Cadastro'}
            </button>
          </form>
        )}

        {/* VIEW: SIGNUP STUDENT */}
        {view === 'signup-student' && (
          <div className="bg-white dark:bg-slate-900 rounded-[40px] p-6 md:p-12 shadow-2xl space-y-6 md:space-y-10 animate-in slide-in-from-bottom duration-500 pb-40">
            <header className="flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 py-4 z-20 border-b dark:border-slate-800 -mx-6 md:-mx-12 px-6 md:px-12">
              <div className="flex items-center gap-4">
                <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg shadow-indigo-600/20"><Users size={28} /></div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Nova Matrícula</h2>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Portal do Atleta</p>
                </div>
              </div>
              <button onClick={() => setView('choice')} className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-red-500 rounded-full transition-colors"><X size={24} /></button>
            </header>

            {!studentData.academyId && (
              <div className="bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-500/30 p-6 rounded-[32px] flex items-center gap-4 animate-in slide-in-from-top duration-500">
                <AlertCircle className="text-amber-500 shrink-0" size={24} />
                <div>
                  <h4 className="font-black text-amber-800 dark:text-amber-400 text-sm uppercase tracking-tight">Link da Unidade Necessário</h4>
                  <p className="text-amber-700/70 dark:text-amber-500/60 text-xs font-bold mt-1">Para realizar sua matrícula, você deve utilizar o link oficial enviado pela sua academia. Caso não possua, solicite-o ao seu instrutor. OSS!</p>
                </div>
              </div>
            )}

            {studentData.academyId && (
              <div className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/50 p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center shadow-sm">
                    {linkedAcademy?.logo ? (
                      <img src={linkedAcademy.logo} className="w-full h-full object-contain p-1.5" />
                    ) : (
                      <Award size={20} className="text-indigo-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1">Você está se matriculando na:</p>
                    <p className="text-sm font-black text-indigo-600 uppercase italic tracking-tight">{linkedAcademy?.name || 'Academia Selecionada'}</p>
                    {linkedAcademy?.ownerName && (
                      <p className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none mt-0.5">{linkedAcademy.ownerName}</p>
                    )}
                  </div>
                </div>
                <div className="bg-indigo-600 text-white p-1 rounded-full px-2 text-[8px] font-black uppercase tracking-tighter shadow-sm">Ativo</div>
              </div>
            )}

            <div className="space-y-8 md:space-y-12">
              <div className="flex flex-col items-center gap-4">
                <div className="w-28 h-28 sm:w-40 sm:h-40 rounded-[40px] bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 overflow-hidden relative group shadow-inner">
                  {studentData.photo ? <img src={studentData.photo} className="w-full h-full object-cover" /> : <div className="w-full h-full flex flex-col items-center justify-center text-slate-400"><Camera size={36} /><span className="text-[10px] font-black uppercase tracking-widest mt-2">Sua Foto</span></div>}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity text-white">
                    <button type="button" onClick={() => photoCameraRef.current?.click()} title="Tirar Foto" className="bg-indigo-600 p-2 rounded-full"><Camera size={18} /></button>
                    <button type="button" onClick={() => photoRef.current?.click()} title="Escolher da Galeria" className="bg-white/20 p-2 rounded-full"><Upload size={18} /></button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 w-40 sm:w-52">
                  <button type="button" onClick={() => photoCameraRef.current?.click()} className="text-[9px] font-black uppercase tracking-widest text-white bg-indigo-600 py-2 rounded-xl flex items-center justify-center gap-1.5"><Camera size={12} /> Câmera</button>
                  <button type="button" onClick={() => photoRef.current?.click()} className="text-[9px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 py-2 rounded-xl flex items-center justify-center gap-1.5"><Upload size={12} /> Galeria</button>
                </div>
                <input type="file" ref={photoRef} className="hidden" accept="image/*" onChange={e => handlePhotoUpload(e, 'student')} />
                <input type="file" ref={photoCameraRef} className="hidden" accept="image/*" capture="user" onChange={e => handlePhotoUpload(e, 'student')} />
              </div>

              <div className="space-y-6">
                <p className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] mb-4 bg-red-50 dark:bg-red-950/20 p-3 rounded-xl border border-red-100 dark:border-red-900/30">* Informações Obrigatórias para Matrícula</p>
                <SectionHeader icon={<UserIcon size={16} />} title="Informações Pessoais" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2">
                    <Input label="Nome Completo" required value={studentData.name || ''} onChange={v => setStudentData({...studentData, name: v})} placeholder="Digite seu nome" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 mb-1">Sexo <span className="text-red-500">*</span></label>
                    <select
                      value={studentData.gender || 'Masculino'}
                      onChange={e => setStudentData({...studentData, gender: e.target.value as any})}
                      className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none text-slate-800 dark:text-white transition-all font-bold text-sm"
                    >
                      <option value="Masculino">Masculino</option>
                      <option value="Feminino">Feminino</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                  <DateSelectInput label="Data de Nascimento *" value={studentData.birthDate || ''} onChange={v => setStudentData({...studentData, birthDate: v})} labelClassName="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 mb-1" />
                  <Input label="E-mail (Para Login)" required type="email" autoComplete="off" value={studentData.email || ''} onChange={v => setStudentData({...studentData, email: v})} placeholder="seu@email.com" />
                  <div className="md:col-span-1">
                    <Input label="Definir Senha" required type="password" autoComplete="new-password" value={regPassword} onChange={setRegPassword} placeholder="••••••••" icon={<Lock size={18} />} />
                  </div>
                  <div className="md:col-span-1">
                    <Input label="Confirmar Senha" required type="password" autoComplete="new-password" value={confirmPassword} onChange={setConfirmPassword} placeholder="••••••••" icon={<Lock size={18} />} />
                  </div>
                  <Input label="WhatsApp" value={studentData.phone || ''} onChange={v => setStudentData({...studentData, phone: maskPhone(v)})} placeholder="(00) 00000-0000" />
                  <Input label="CPF" value={studentData.cpf || ''} onChange={v => setStudentData({...studentData, cpf: maskCPF(v)})} placeholder="000.000.000-00" />
                  <Input label="RG" value={studentData.rg || ''} onChange={v => setStudentData({...studentData, rg: maskRG(v)})} placeholder="00.000.000-0" />
                  <Input label="Peso (kg)" value={studentData.weight || ''} onChange={v => setStudentData({...studentData, weight: v})} placeholder="Ex: 80" />
                  <Input label="Altura (cm)" value={studentData.height || ''} onChange={v => setStudentData({...studentData, height: v})} placeholder="Ex: 180" />
                  <Input label="Tipo Sanguíneo" value={studentData.bloodType || ''} onChange={v => setStudentData({...studentData, bloodType: v})} placeholder="Ex: O+" />
                  <div className="md:col-span-1">
                    <Input
                      label="CEP"
                      value={studentData.cep || ''}
                      onChange={v => handleCepLookup(v, (c, a) => setStudentData(prev => ({...prev, cep: c, address: a})))}
                      placeholder="00000-000"
                      icon={isLoadingCep ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
                    />
                  </div>
                  <div className="md:col-span-1">
                    <Input
                      label="Número"
                      value={studentData.addressNumber || ''}
                      onChange={v => setStudentData({...studentData, addressNumber: v})}
                      placeholder="Nº"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <Input
                      label="Endereço Completo (Auto)"
                      value={studentData.address || ''}
                      onChange={v => setStudentData({...studentData, address: v})}
                      placeholder="Rua, Bairro, Cidade..."
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <SectionHeader icon={<Activity size={16} />} title="Emergência" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input label="Contato de Emergência" value={studentData.emergencyContact || ''} onChange={v => setStudentData({...studentData, emergencyContact: v})} placeholder="Nome do contato" />
                  <Input label="Telefone de Emergência" value={studentData.emergencyPhone || ''} onChange={v => setStudentData({...studentData, emergencyPhone: maskPhone(v)})} placeholder="(00) 00000-0000" />
                </div>
              </div>

              <div className={`p-4 md:p-8 rounded-[32px] border-2 transition-all ${isMinor ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/30' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 opacity-60'}`}>
                <div className="flex items-center justify-between mb-6">
                  <SectionHeader icon={<Users size={16} />} title="Responsável Legal" />
                  {isMinor && <span className="bg-amber-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase animate-pulse">Obrigatório</span>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input label="Nome do Responsável" value={studentData.guardianName || ''} onChange={v => setStudentData({...studentData, guardianName: v})} placeholder="Nome completo" />
                  <Input label="WhatsApp do Responsável" value={studentData.guardianPhone || ''} onChange={v => setStudentData({...studentData, guardianPhone: maskPhone(v)})} placeholder="(00) 00000-0000" />
                  <Input label="Parentesco" value={studentData.guardianRelation || ''} onChange={v => setStudentData({...studentData, guardianRelation: v})} placeholder="Mãe, Pai, Tio..." />
                  <Input label="CPF Responsável" value={studentData.guardianCpf || ''} onChange={v => setStudentData({...studentData, guardianCpf: maskCPF(v)})} placeholder="000.000.000-00" />
                </div>
              </div>

              <div className="space-y-6">
                <SectionHeader icon={<GraduationCap size={16} />} title="Sua Graduação" />
                <div className="space-y-4">
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                    {[
                      Belt.WHITE,
                      Belt.GREY_WHITE, Belt.GREY, Belt.GREY_BLACK,
                      Belt.YELLOW_WHITE, Belt.YELLOW, Belt.YELLOW_BLACK,
                      Belt.ORANGE_WHITE, Belt.ORANGE, Belt.ORANGE_BLACK,
                      Belt.GREEN_WHITE, Belt.GREEN, Belt.GREEN_BLACK,
                      Belt.BLUE, Belt.PURPLE, Belt.BROWN, Belt.BLACK,
                    ].map(b => (
                      <button key={b} onClick={() => setStudentData({...studentData, belt: b, stripes: 0})} className={`py-4 rounded-2xl border-2 font-black text-[10px] uppercase transition-all ${studentData.belt === b ? `${BELT_COLORS[b]} scale-105 shadow-lg` : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-400'}`}>{b}</button>
                    ))}
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 md:p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Graus na Faixa</label>
                    <div className={`flex items-center justify-between border-2 transition-all rounded-2xl px-5 py-4 shadow-inner ${BELT_COLORS[studentData.belt || Belt.WHITE]}`}>
                      <button type="button" onClick={() => setStudentData({...studentData, stripes: Math.max(0, (studentData.stripes || 0) - 1)})} className="bg-black/30 hover:bg-black/50 border border-white/20 text-white rounded-xl p-2 transition-all outline-none"><Minus size={20} /></button>
                      <div className={`flex gap-1.5 p-1 rounded-md px-3 bg-opacity-90 ${studentData.belt === Belt.BLACK ? 'bg-red-600' : 'bg-zinc-900 shadow-lg'}`}>
                        {[...Array(studentData.belt === Belt.BLACK ? 6 : 4)].map((_, i) => (
                          <div
                            key={i}
                            className={`w-3 h-8 rounded-sm border transition-all ${i < (studentData.stripes || 0) ? 'bg-white border-white/20 shadow-md' : 'bg-white/10 border-transparent'}`}
                          />
                        ))}
                      </div>
                      <button type="button" onClick={() => setStudentData({...studentData, stripes: Math.min(studentData.belt === Belt.BLACK ? 6 : 4, (studentData.stripes || 0) + 1)})} className="bg-black/30 hover:bg-black/50 border border-white/20 text-white rounded-xl p-2 transition-all outline-none"><Plus size={20} /></button>
                    </div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-4 italic">
                      {studentData.belt === Belt.BLACK ? 'Faixa preta possui até 6 graus.' : 'Faixas coloridas possuem até 4 graus.'}
                    </p>
                  </div>
                  <DateSelectInput
                    label="Data da Última Graduação"
                    labelClassName="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 mb-1"
                    value={studentData.lastGraduationDate || ''}
                    onChange={v => setStudentData({...studentData, lastGraduationDate: v})}
                    yearFrom={2000}
                  />
                </div>
              </div>

              <div className="space-y-6">
                <SectionHeader icon={<Heart size={16} />} title="Saúde e Observações" />
                <textarea value={studentData.medicalNotes || ''} onChange={e => setStudentData({...studentData, medicalNotes: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-4 md:p-6 outline-none text-sm min-h-[120px] text-slate-700 dark:text-white" placeholder="Possui alguma lesão ou condição especial?" />
              </div>

              {academyPlans.length > 0 && (
                <div className="space-y-6">
                  <SectionHeader icon={<Award size={16} />} title="Plano de Aula" />
                  <p className="text-xs text-slate-500 dark:text-slate-400 -mt-2">Selecione o plano de aula que melhor se encaixa na sua rotina. (Opcional — o instrutor pode alterar depois.)</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {academyPlans.map(plan => {
                      const selected = studentData.planId === plan.id;
                      return (
                        <button
                          key={plan.id}
                          type="button"
                          onClick={() => setStudentData({ ...studentData, planId: selected ? undefined : plan.id })}
                          className={`text-left p-5 rounded-3xl border-2 transition-all ${
                            selected
                              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 shadow-lg shadow-indigo-500/10'
                              : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-indigo-300 dark:hover:border-indigo-700'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <span className={`text-sm font-black uppercase tracking-tight ${selected ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-white'}`}>{plan.name}</span>
                            {selected && <CheckCircle2 size={18} className="text-indigo-600 shrink-0 mt-0.5" />}
                          </div>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {plan.price != null && (
                              <span className="text-[10px] font-black bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full">
                                R$ {Number(plan.price).toFixed(2).replace('.', ',')}
                              </span>
                            )}
                            {plan.durationMonths && (
                              <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full">
                                {plan.durationMonths} {plan.durationMonths === 1 ? 'mês' : 'meses'}
                              </span>
                            )}
                            {plan.classesPerWeek && (
                              <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full">
                                {plan.classesPerWeek}x/semana
                              </span>
                            )}
                          </div>
                          {plan.description && (
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 leading-relaxed">{plan.description}</p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 md:p-6 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="terms-student"
                    checked={acceptedTerms}
                    onChange={e => setAcceptedTerms(e.target.checked)}
                    className="mt-1 w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="terms-student" className="text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                    Li e concordo com o <button type="button" onClick={() => setShowTermsModal(true)} className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">Termo de Responsabilidade e Cessão de Imagem</button> da academia. Declaro estar em perfeitas condições de saúde para a prática de artes marciais.
                  </label>
                </div>
              </div>

              <button onClick={handleRegisterStudent} disabled={isSubmitting} className="w-full py-6 bg-indigo-600 text-white font-black rounded-3xl shadow-2xl shadow-indigo-600/30 text-xl active:scale-95 transition-transform flex items-center justify-center gap-3">
                {isSubmitting ? <Loader2 size={24} className="animate-spin" /> : 'CONCLUIR MATRÍCULA OSS!'}
              </button>
            </div>
          </div>
        )}

        {/* VIEW: SIGNUP INSTRUCTOR */}
        {view === 'signup-instructor' && (
          <div className="bg-white dark:bg-slate-900 rounded-[40px] p-6 md:p-12 shadow-2xl space-y-6 md:space-y-10 animate-in slide-in-from-bottom duration-500 pb-40">
            <header className="flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 py-4 z-20 border-b dark:border-slate-800 -mx-6 md:-mx-12 px-6 md:px-12">
              <div className="flex items-center gap-4">
                <div className="bg-slate-900 dark:bg-slate-800 p-3 rounded-2xl text-white shadow-lg"><Award size={28} /></div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Ficha do Instrutor</h2>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Corpo Docente</p>
                </div>
              </div>
              <button onClick={() => setView('choice')} className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-red-500 rounded-full transition-colors"><X size={24} /></button>
            </header>

            {!instructorData.academyId && (
              <div className="bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-500/30 p-6 rounded-[32px] flex items-center gap-4 animate-in slide-in-from-top duration-500">
                <AlertCircle className="text-amber-500 shrink-0" size={24} />
                <div>
                  <h4 className="font-black text-amber-800 dark:text-amber-400 text-sm uppercase tracking-tight">Link da Unidade Necessário</h4>
                  <p className="text-amber-700/70 dark:text-amber-500/60 text-xs font-bold mt-1">Sua ficha profissional deve ser vinculada a uma academia. Utilize o link oficial da sua unidade para realizar o cadastro. OSS!</p>
                </div>
              </div>
            )}

            {instructorData.academyId && (
              <div className="bg-slate-900 dark:bg-slate-800 border border-slate-700 p-4 rounded-2xl flex items-center justify-between text-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shadow-sm">
                    {linkedAcademy?.logo ? (
                      <img src={linkedAcademy.logo} className="w-full h-full object-contain p-1.5" />
                    ) : (
                      <Trophy size={20} className="text-white" />
                    )}
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Vínculo Profissional com:</p>
                    <p className="text-sm font-black text-white uppercase italic tracking-tight">{linkedAcademy?.name || 'Academia Selecionada'}</p>
                    {linkedAcademy?.ownerName && (
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mt-0.5">{linkedAcademy.ownerName}</p>
                    )}
                  </div>
                </div>
                <div className="bg-emerald-500 text-white p-1 rounded-full px-2 text-[8px] font-black uppercase tracking-tighter shadow-sm">Confirmado</div>
              </div>
            )}

            <div className="space-y-8 md:space-y-12">
              <div className="flex flex-col items-center gap-4">
                <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-[40px] bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 overflow-hidden relative group shadow-inner">
                  {instructorData.photo ? <img src={instructorData.photo} className="w-full h-full object-cover" /> : <div className="w-full h-full flex flex-col items-center justify-center text-slate-400"><Camera size={36} /><span className="text-[10px] font-black uppercase tracking-widest mt-2">Sua Foto</span></div>}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity text-white">
                    <button type="button" onClick={() => photoCameraRef.current?.click()} title="Tirar Foto" className="bg-indigo-600 p-2 rounded-full"><Camera size={18} /></button>
                    <button type="button" onClick={() => photoRef.current?.click()} title="Escolher da Galeria" className="bg-white/20 p-2 rounded-full"><Upload size={18} /></button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 w-40 sm:w-52">
                  <button type="button" onClick={() => photoCameraRef.current?.click()} className="text-[9px] font-black uppercase tracking-widest text-white bg-indigo-600 py-2 rounded-xl flex items-center justify-center gap-1.5"><Camera size={12} /> Câmera</button>
                  <button type="button" onClick={() => photoRef.current?.click()} className="text-[9px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 py-2 rounded-xl flex items-center justify-center gap-1.5"><Upload size={12} /> Galeria</button>
                </div>
                <input type="file" ref={photoRef} className="hidden" accept="image/*" onChange={e => handlePhotoUpload(e, 'instructor')} />
                <input type="file" ref={photoCameraRef} className="hidden" accept="image/*" capture="user" onChange={e => handlePhotoUpload(e, 'instructor')} />
              </div>

              <div className="space-y-8">
                <SectionHeader icon={<UserIcon size={16} />} title="Dados do Instrutor" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2">
                    <Input label="Nome Completo" required value={instructorData.name || ''} onChange={v => setInstructorData({...instructorData, name: v})} placeholder="Ex: Prof. Hélio" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 mb-1">Sexo <span className="text-red-500">*</span></label>
                    <select
                      value={instructorData.gender || 'Masculino'}
                      onChange={e => setInstructorData({...instructorData, gender: e.target.value as any})}
                      className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none text-slate-800 dark:text-white transition-all font-bold text-sm"
                    >
                      <option value="Masculino">Masculino</option>
                      <option value="Feminino">Feminino</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                  <DateSelectInput label="Data de Nascimento *" value={instructorData.birthDate || ''} onChange={v => setInstructorData({...instructorData, birthDate: v})} labelClassName="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 mb-1" />
                  <Input label="E-mail (Para Login)" required type="email" autoComplete="off" value={instructorData.email || ''} onChange={v => setInstructorData({...instructorData, email: v})} placeholder="mestre@ct.com" />
                  <div className="md:col-span-1">
                    <Input label="Definir Senha" required type="password" autoComplete="new-password" value={regPassword} onChange={setRegPassword} placeholder="••••••••" icon={<Lock size={18} />} />
                  </div>
                  <div className="md:col-span-1">
                    <Input label="Confirmar Senha" required type="password" autoComplete="new-password" value={confirmPassword} onChange={setConfirmPassword} placeholder="••••••••" icon={<Lock size={18} />} />
                  </div>
                  <Input label="CPF" value={instructorData.cpf || ''} onChange={v => setInstructorData({...instructorData, cpf: maskCPF(v)})} placeholder="000.000.000-00" />
                  <Input label="RG" value={instructorData.rg || ''} onChange={v => setInstructorData({...instructorData, rg: maskRG(v)})} placeholder="00.000.000-0" />
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 mb-1">Estado Civil</label>
                    <select
                      value={instructorData.maritalStatus || 'Solteiro'}
                      onChange={e => setInstructorData({...instructorData, maritalStatus: e.target.value as any})}
                      className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none text-slate-800 dark:text-white transition-all font-bold text-sm"
                    >
                      <option value="Solteiro">Solteiro(a)</option>
                      <option value="Casado">Casado(a)</option>
                      <option value="Divorciado">Divorciado(a)</option>
                      <option value="Viúvo">Viúvo(a)</option>
                    </select>
                  </div>
                  <Input label="WhatsApp" value={instructorData.phone || ''} onChange={v => setInstructorData({...instructorData, phone: maskPhone(v)})} />
                  <div className="md:col-span-1">
                    <Input
                      label="CEP"
                      value={instructorData.cep || ''}
                      onChange={v => handleCepLookup(v, (c, a) => setInstructorData(prev => ({...prev, cep: c, address: a})))}
                      placeholder="00000-000"
                      icon={isLoadingCep ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
                    />
                  </div>
                  <div className="md:col-span-1">
                    <Input
                      label="Número"
                      value={instructorData.addressNumber || ''}
                      onChange={v => setInstructorData({...instructorData, addressNumber: v})}
                      placeholder="Nº"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <Input
                      label="Endereço Residencial (Auto)"
                      value={instructorData.address || ''}
                      onChange={v => setInstructorData({...instructorData, address: v})}
                      placeholder="Rua, Bairro, Cidade - UF"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <SectionHeader icon={<GraduationCap size={16} />} title="Carreira & Especialidades" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                  <div className="space-y-6">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Selecione sua Graduação</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[Belt.BLUE, Belt.PURPLE, Belt.BROWN, Belt.BLACK].map(b => (
                        <button key={b} onClick={() => setInstructorData({...instructorData, belt: b, stripes: 0})} className={`py-4 rounded-2xl border-2 font-black text-[10px] uppercase transition-all ${instructorData.belt === b ? `${BELT_COLORS[b]} scale-105 shadow-lg` : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-400'}`}>{b}</button>
                      ))}
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 md:p-6 rounded-3xl border border-slate-100 dark:border-slate-800 mt-4">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Graus na Faixa</label>
                    <div className={`flex items-center justify-between border-2 transition-all rounded-2xl px-5 py-4 shadow-inner ${BELT_COLORS[instructorData.belt || Belt.BLACK]}`}>
                        <button type="button" onClick={() => setInstructorData({...instructorData, stripes: Math.max(0, (instructorData.stripes || 0) - 1)})} className="text-white/50 hover:scale-125 transition-all outline-none"><Minus size={20} /></button>
                        <div className={`flex gap-1.5 p-1 rounded-md px-3 bg-opacity-90 ${instructorData.belt === Belt.BLACK ? 'bg-red-600' : 'bg-zinc-900 shadow-lg'}`}>
                          {[...Array(instructorData.belt === Belt.BLACK ? 6 : 4)].map((_, i) => (
                            <div
                              key={i}
                              className={`w-3 h-8 rounded-sm border transition-all ${i < (instructorData.stripes || 0) ? 'bg-white border-white/20 shadow-md' : 'bg-black/10 border-transparent'}`}
                            />
                          ))}
                        </div>
                        <button type="button" onClick={() => setInstructorData({...instructorData, stripes: Math.min(instructorData.belt === Belt.BLACK ? 6 : 4, (instructorData.stripes || 0) + 1)})} className="text-white/50 hover:scale-125 transition-all outline-none"><Plus size={20} /></button>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <Input label="Especialidades" value={instructorData.specialties || ''} onChange={v => setInstructorData({...instructorData, specialties: v})} placeholder="Ex: Kids, No-Gi, Competição" />
                    <DateSelectInput label="Data da Última Graduação" value={instructorData.lastGraduationDate || ''} onChange={v => setInstructorData({...instructorData, lastGraduationDate: v})} yearFrom={2000} labelClassName="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 mb-1" />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 md:p-6 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="terms-instructor"
                    checked={acceptedTerms}
                    onChange={e => setAcceptedTerms(e.target.checked)}
                    className="mt-1 w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="terms-instructor" className="text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                    Li e concordo com o <button type="button" onClick={() => setShowTermsModal(true)} className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">Termo de Responsabilidade e Cessão de Imagem</button> da academia. Declaro estar apto a ministrar aulas e seguir as diretrizes técnicas e éticas.
                  </label>
                </div>
              </div>

              <button onClick={handleRegisterInstructor} disabled={isSubmitting} className="w-full py-6 bg-slate-900 dark:bg-slate-800 text-white font-black rounded-3xl shadow-2xl text-xl active:scale-95 transition-transform border border-slate-700 flex items-center justify-center gap-3">
                {isSubmitting ? <Loader2 size={24} className="animate-spin" /> : 'ENVIAR FICHA TÉCNICA OSS!'}
              </button>
            </div>
          </div>
        )}

        {/* Modal de Termos */}
        {showTermsModal && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[3000] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-[95vw] sm:max-w-2xl rounded-[40px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in duration-300">
              <div className="p-4 sm:p-8 border-b dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-600 rounded-2xl text-white">
                    <ShieldCheck size={28} />
                  </div>
                  <h3 className="text-lg sm:text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight italic">Termos e Condições</h3>
                </div>
                <button onClick={() => setShowTermsModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="p-4 sm:p-8 overflow-y-auto custom-scrollbar prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-400 text-sm leading-relaxed space-y-6">
                <div>
                  <h4 className="font-black text-slate-800 dark:text-white uppercase text-xs tracking-widest mb-2 italic">1. Riscos da Atividade</h4>
                  <p>Compreendo que a prática de artes marciais (BJJ, Muay Thai, etc.) envolve contato físico intenso e riscos inerentes de lesões. Declaro estar em perfeitas condições físicas e mentais, não possuindo impedimento médico para tais atividades.</p>
                </div>

                <div>
                  <h4 className="font-black text-slate-800 dark:text-white uppercase text-xs tracking-widest mb-2 italic">2. Conduta e Respeito</h4>
                  <p>Comprometo-me a seguir as regras de etiqueta e conduta do tatame, respeitando superiores, colegas e as instalações da academia. Atitudes desrespeitosas podem resultar em suspensão do acesso.</p>
                </div>

                <div>
                  <h4 className="font-black text-slate-800 dark:text-white uppercase text-xs tracking-widest mb-2 italic">3. Cessão de Imagem</h4>
                  <p>Autorizo o uso de minha imagem e voz, captadas em fotos e vídeos durante treinos, eventos ou competições, para fins exclusivos de divulgação da academia em redes sociais, sites e materiais promocionais, por tempo indeterminado e sem custos.</p>
                </div>

                <div>
                  <h4 className="font-black text-slate-800 dark:text-white uppercase text-xs tracking-widest mb-2 italic">4. Responsabilidade Financeira</h4>
                  <p>Declaro estar ciente dos planos contratados e prazos de pagamento. O atraso nas mensalidades pode implicar na interrupção do registro de presenças e acesso às aulas.</p>
                </div>

                <div>
                  <h4 className="font-black text-slate-800 dark:text-white uppercase text-xs tracking-widest mb-2 italic">5. Proteção de Dados</h4>
                  <p>Meus dados pessoais coletados neste cadastro serão utilizados apenas para gestão administrativa e pedagógica no sistema NEXDOJO, seguindo as diretrizes de privacidade.</p>
                </div>

                <div className="bg-indigo-50 dark:bg-indigo-900/10 p-6 rounded-3xl border border-indigo-100 dark:border-indigo-800/50 italic font-medium">
                  "O tatame é um ambiente de respeito, disciplina e evolução. Ao prosseguir, você confirma que está de acordo com estes termos e pronto para o combate diário pela sua melhor versão. OSS!"
                </div>
              </div>

              <div className="p-4 sm:p-8 bg-slate-50 dark:bg-slate-800/50 border-t dark:border-slate-800">
                <button
                  onClick={() => {
                    setAcceptedTerms(true);
                    setShowTermsModal(false);
                  }}
                  className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-3"
                >
                  <CheckCircle2 size={24} /> LI E CONCORDO COM TUDO
                </button>
              </div>
            </div>
          </div>
        )}

        <p className="text-center text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">{linkedAcademy ? `${linkedAcademy.name} • O LEGADO CONTINUA` : 'NEXDOJO • O LEGADO CONTINUA'}</p>
      </div>
    </div>
  );
};

const SectionHeader: React.FC<{ icon: React.ReactNode; title: string }> = ({ icon, title }) => (
  <div className="flex items-center gap-2 mb-4">
    <div className="text-indigo-600 dark:text-indigo-400">{icon}</div>
    <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{title}</h3>
  </div>
);

const ChoiceCard: React.FC<{ icon: React.ReactNode; title: string; desc: string; onClick: () => void }> = ({ icon, title, desc, onClick }) => (
  <button onClick={onClick} className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 text-left hover:scale-105 hover:shadow-2xl transition-all group border-b-8 border-b-transparent hover:border-b-indigo-500 w-full">
    <div className="bg-indigo-50 dark:bg-indigo-900/20 w-16 h-16 rounded-2xl flex items-center justify-center text-indigo-600 mb-4 sm:mb-8 group-hover:bg-indigo-600 group-hover:text-white transition-colors">{icon}</div>
    <h3 className="font-black text-slate-800 dark:text-white text-xl tracking-tighter mb-2">{title}</h3>
    <p className="text-sm text-slate-400 dark:text-slate-500 font-medium leading-relaxed">{desc}</p>
  </button>
);

const Input: React.FC<{ label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; icon?: React.ReactNode; inputMode?: any; required?: boolean; autoComplete?: string }> = ({ label, value, onChange, type = 'text', placeholder, icon, inputMode, required, autoComplete }) => {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (show ? 'text' : 'password') : type;

  return (
    <div className="space-y-1">
      <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        {icon && <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">{icon}</div>}
        <input
          type={inputType}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          inputMode={inputMode}
          autoComplete={autoComplete}
          className={`w-full ${icon ? 'pl-12' : 'px-5'} ${isPassword ? 'pr-12' : 'pr-5'} py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none text-slate-800 dark:text-white transition-all font-bold text-sm`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 transition-colors"
          >
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
    </div>
  );
};

const LoginPasswordField: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => {
  const [show, setShow] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  return (
    <div className="login-field">
      <label className="login-field-label">Senha</label>
      <div className="login-input-wrap" style={{ position: 'relative' }}>
        <span className="login-input-icon"><Lock size={16} /></span>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="••••••••"
          className="login-input"
          autoComplete="current-password"
          onKeyUp={e => setCapsLock(e.getModifierState('CapsLock'))}
        />
        {capsLock && <span className="login-caps-pill">CAPS</span>}
        <button type="button" onClick={() => setShow(s => !s)} className="login-input-trail">
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
};

export default LoginView;
