import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, Academy, Student, Instructor, Staff, Belt, ChatMessage } from '../types';
import { StorageService } from '../services/storage';
import { fetchAddressByCep, maskCEP, maskPhone, maskCPF, maskRG } from '../services/cep';
import { MOCK_ACADEMY, MOCK_USER, MOCK_SUPERUSER, MOCK_INSTRUCTOR_USER, MOCK_STAFF_USER, MOCK_STUDENT_USER, MOCK_STUDENTS, MOCK_CLASSES, MOCK_TEMPLATES, MOCK_ATTENDANCE } from '../services/mockData';
import { 
  Trophy, 
  Mail, 
  Lock, 
  ArrowRight, 
  Info, 
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
  Send,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { BELT_COLORS } from '../constants';
import Input from '../components/common/Input';
import { ChoiceCard, SectionHeader } from './auth/AuthComponents';

interface LoginViewProps {
  onLogin: (user: User, academy: Academy) => void;
}

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

const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Mapeamento de rotas para views
  const viewMap: Record<string, string> = {
    '/login': 'login',
    '/cadastro': 'choice',
    '/cadastro/aluno': 'signup-student',
    '/cadastro/academia': 'signup-academy',
    '/cadastro/instrutor': 'signup-instructor',
    '/esqueci-senha': 'forgot-password'
  };
  
  const view = viewMap[location.pathname] || 'login';

  const [email, setEmail] = useState('admin@oss.com');
  const [password, setPassword] = useState('oss123');
  const [forgotEmail, setForgotEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [isFromSharedLink, setIsFromSharedLink] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const photoRef = useRef<HTMLInputElement>(null);

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
    absentCount: 0, hasLoanedKimono: false, gender: 'M', weight: '', height: '',
    bloodType: '', emergencyContact: '', emergencyPhone: '', lastGraduationDate: '',
    cep: '', address: '', addressNumber: ''
  });
  
  const [instructorData, setInstructorData] = useState<Partial<Instructor>>({ 
    name: '', belt: Belt.BLACK, stripes: 0, birthDate: '', status: 'Pending', 
    academyId: '', 
    joinDate: new Date().toISOString(), gender: 'M', cpf: '', rg: '',
    maritalStatus: 'Solteiro', lastGraduationDate: '', specialties: '',
    cep: '', address: '', addressNumber: ''
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const academyIdFromUrl = params.get('academyId');
    
    if (academyIdFromUrl) {
      const found = StorageService.getAcademyById(academyIdFromUrl);
      if (found) {
        setIsFromSharedLink(true);
        setAcademyData(prev => ({ 
          ...prev, 
          name: found.name, 
          logo: found.logo || prev.logo 
        }));
        setStudentData(prev => ({ ...prev, academyId: academyIdFromUrl }));
        setInstructorData(prev => ({ ...prev, academyId: academyIdFromUrl }));
      }
    }
  }, [location]);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const users = StorageService.getUsers();
    let foundUser = users.find(u => u.email === email && u.password === password);

    if (!foundUser && email === 'admin@oss.com' && password === 'oss123') {
      if (users.length === 0) {
        StorageService.saveStudents(MOCK_STUDENTS);
        StorageService.saveTemplates(MOCK_TEMPLATES);
        StorageService.saveClasses(MOCK_CLASSES);
        StorageService.saveAttendance(MOCK_ATTENDANCE);
        StorageService.saveUsers([MOCK_USER]);
      }
      foundUser = MOCK_USER;
    }

    if (!foundUser) {
      showNotification("E-mail ou senha incorretos.", 'error');
      return;
    }

    if (foundUser.status === 'Pending' && foundUser.role !== 'admin' && foundUser.role !== 'superuser') {
      showNotification("Seu acesso ainda está pendente de aprovação. OSS!", 'error');
      return;
    }

    const academy = StorageService.getAcademyById(foundUser.academyId) || StorageService.getAcademy();
    onLogin(foundUser, academy || MOCK_ACADEMY);
    navigate('/');
  };

  const handleRegisterAcademy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!academyData.password || academyData.password !== confirmPassword) {
      showNotification("As senhas não coincidem ou são inválidas.", 'error');
      return;
    }
    
    const academyId = 'acad_' + Math.random().toString(36).substr(2, 5);
    const academy: Academy = { ...academyData, id: academyId, ownerName: academyData.owner };
    const user: User = { 
      id: 'user_' + Math.random().toString(36).substr(2, 5), 
      academyId, 
      role: 'admin', 
      name: academyData.owner, 
      email: academyData.email, 
      password: academyData.password,
      status: 'Active'
    };
    
    StorageService.saveAcademy(academy);
    StorageService.saveUsers([...StorageService.getUsers(), user]);
    onLogin(user, academy);
    navigate('/');
  };

  const handleCepLookup = async (cep: string, setter: (cep: string, address: string) => void) => {
    const masked = maskCEP(cep);
    if (masked.replace(/\D/g, '').length === 8) {
      setIsLoadingCep(true);
      const data = await fetchAddressByCep(masked);
      if (data) setter(masked, data.fullAddress);
      setIsLoadingCep(false);
    } else setter(masked, '');
  };

  const handleRegisterStudent = () => {
    if (!studentData.name || !studentData.email || !regPassword || !studentData.academyId) {
      showNotification("Preencha todos os campos obrigatórios.", 'error');
      return;
    }
    
    const newStudent = { ...studentData, id: 's_pub_' + Math.random().toString(36).substr(2, 7) } as Student;
    const newUser: User = {
      id: 'u_s_' + Math.random().toString(36).substr(2, 7),
      academyId: studentData.academyId,
      role: 'student',
      name: newStudent.name,
      email: newStudent.email!,
      password: regPassword,
      status: 'Pending'
    };

    StorageService.saveStudents([...StorageService.getStudents(), newStudent]);
    StorageService.saveUsers([...StorageService.getUsers(), newUser]);
    showNotification("Matrícula realizada com sucesso! Aguarde aprovação. OSS!");
    navigate('/login');
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'student' | 'instructor') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const compressed = await compressImage(reader.result as string);
      if (type === 'student') setStudentData(prev => ({ ...prev, photo: compressed }));
      else setInstructorData(prev => ({ ...prev, photo: compressed }));
    };
    reader.readAsDataURL(file);
  };

  const studentAge = calculateAge(studentData.birthDate || '');
  const isMinor = studentAge > 0 && studentAge < 18;

  return (
    <div className="min-h-[100dvh] h-[100dvh] overflow-y-auto bg-slate-900 flex flex-col items-center justify-start py-8 px-4 transition-colors relative custom-scrollbar">
      {toast && (
        <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-top duration-300 ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span className="font-bold text-sm tracking-tight">{toast.message}</span>
        </div>
      )}

      <div className="w-full max-w-5xl space-y-8 py-10">
        {(view === 'login' || view === 'choice') && (
          <div className="text-center animate-in fade-in duration-700">
            <div className="inline-flex items-center justify-center w-28 h-28 bg-indigo-600 rounded-[32px] mb-6 shadow-2xl shadow-indigo-600/30 overflow-hidden ring-4 ring-slate-800/50">
              {academyData.logo || MOCK_ACADEMY.logo ? (
                <img src={academyData.logo || MOCK_ACADEMY.logo} alt="Logo" className="w-full h-full object-contain p-2" />
              ) : (
                <Award className="text-white" size={40} />
              )}
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic leading-none">{academyData.name || MOCK_ACADEMY.name}</h1>
            <p className="text-slate-400 mt-3 font-bold text-xs uppercase tracking-[0.3em] opacity-80">O LEGADO CONTINUA</p>
          </div>
        )}

        {view === 'login' && (
          <div className="max-w-md mx-auto space-y-6 w-full pb-10">
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 flex items-start gap-3">
              <div className="bg-amber-500/20 p-2 rounded-xl"><Info className="text-amber-500" size={20} /></div>
              <div>
                <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Modo Demonstração</p>
                <p className="text-xs text-slate-400 mt-1 italic">Utilize admin@oss.com / oss123</p>
              </div>
            </div>

            <form onSubmit={handleLogin} className="bg-white dark:bg-slate-900 rounded-[40px] p-8 md:p-10 shadow-2xl space-y-6 animate-in fade-in zoom-in duration-300">
              <h2 className="text-2xl font-black text-slate-800 dark:text-white text-center tracking-tight">Acesse seu Portal</h2>
              <div className="space-y-4">
                <Input label="E-mail" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="professor@oss.com" icon={<Mail size={18} />} />
                <div className="relative">
                  <Input label="Senha" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" icon={<Lock size={18} />} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-[38px] text-slate-400 hover:text-indigo-600 transition-colors">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <button type="submit" className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 active:scale-95">
                Entrar no Tatame <ArrowRight size={20} />
              </button>
              <div className="pt-2 flex flex-col items-center gap-3">
                <button type="button" onClick={() => navigate('/esqueci-senha')} className="text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors">Esqueci minha senha</button>
                <button type="button" onClick={() => navigate('/cadastro')} className="text-sm font-bold text-indigo-600 hover:text-indigo-400 transition-colors">Novo por aqui? Cadastre-se</button>
              </div>
            </form>
          </div>
        )}

        {view === 'forgot-password' && (
          <div className="max-w-md mx-auto space-y-6 animate-in fade-in zoom-in duration-300">
            <button onClick={() => navigate('/login')} className="text-white flex items-center gap-2 mb-4 hover:text-indigo-400 transition-colors font-bold text-xs uppercase tracking-[0.2em]">
              <ChevronLeft size={18} /> Voltar ao Login
            </button>
            <div className="bg-white dark:bg-slate-900 rounded-[40px] p-8 md:p-10 shadow-2xl space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Recuperar Senha</h2>
                <p className="text-sm text-slate-400 font-medium leading-relaxed">Insira seu e-mail cadastrado para receber as instruções de recuperação.</p>
              </div>
              <Input label="E-mail Cadastrado" type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} placeholder="professor@oss.com" icon={<Mail size={18} />} />
              <button 
                onClick={() => {
                  if (!forgotEmail) { showNotification("Insira seu e-mail.", 'error'); return; }
                  showNotification("E-mail de recuperação enviado!");
                  navigate('/login');
                }} 
                className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                Enviar Instruções <Send size={20} />
              </button>
            </div>
          </div>
        )}

        {view === 'choice' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <button onClick={() => navigate('/login')} className="text-white flex items-center gap-2 mb-4 hover:text-indigo-400 transition-colors font-bold text-xs uppercase tracking-[0.2em]">
              <ChevronLeft size={18} /> Voltar ao Login
            </button>
            <div className={`grid grid-cols-1 ${isFromSharedLink ? 'sm:grid-cols-2' : 'sm:grid-cols-3'} gap-4`}>
              {!isFromSharedLink && <ChoiceCard icon={<Trophy size={28} />} title="Nova Academia" desc="Para professores e gestores." onClick={() => navigate('/cadastro/academia')} />}
              <ChoiceCard icon={<Users size={28} />} title="Sou Aluno" desc="Fazer matrícula agora." onClick={() => navigate('/cadastro/aluno')} />
              <ChoiceCard icon={<Award size={28} />} title="Sou Instrutor" desc="Ficha técnica do mestre." onClick={() => navigate('/cadastro/instrutor')} />
            </div>
          </div>
        )}

        {view === 'signup-academy' && (
          <form onSubmit={handleRegisterAcademy} className="max-w-md mx-auto bg-white dark:bg-slate-900 rounded-[40px] p-6 md:p-10 shadow-2xl space-y-6 animate-in zoom-in duration-300 pb-32">
            <div className="flex items-center gap-4 mb-4 sticky top-0 bg-white dark:bg-slate-900 py-2 z-10 border-b dark:border-slate-800">
              <button type="button" onClick={() => navigate('/cadastro')} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500"><ArrowLeft size={20} /></button>
              <h2 className="text-2xl font-black text-slate-800 dark:text-white">Criar Academia</h2>
            </div>
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3 mb-6">
                <div onClick={() => photoRef.current?.click()} className="w-32 h-32 bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-[32px] overflow-hidden flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 transition-all shadow-inner group relative">
                  {academyData.logo ? <img src={academyData.logo} className="w-full h-full object-contain p-2" /> : <Camera size={32} className="text-slate-400" />}
                </div>
                <input type="file" ref={photoRef} className="hidden" accept="image/*" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const compressed = await compressImage(await new Promise(r => {
                      const reader = new FileReader();
                      reader.onloadend = () => r(reader.result as string);
                      reader.readAsDataURL(file);
                    }));
                    setAcademyData({...academyData, logo: compressed});
                  }
                }} />
              </div>
              <Input label="Seu Nome" value={academyData.owner} onChange={e => setAcademyData({...academyData, owner: e.target.value})} placeholder="Mestre Hélio" />
              <Input label="Nome da Unidade" value={academyData.name} onChange={e => setAcademyData({...academyData, name: e.target.value})} placeholder="Ex: NexDojo" />
              <Input label="E-mail de Contato" type="email" value={academyData.email} onChange={e => setAcademyData({...academyData, email: e.target.value})} placeholder="ct@oss.com" />
              <Input label="WhatsApp / Telefone" value={academyData.phone} onChange={e => setAcademyData({...academyData, phone: maskPhone(e.target.value)})} placeholder="(00) 00000-0000" icon={<Phone size={16} />} />
              <div className="grid grid-cols-2 gap-4">
                <Input label="CEP" value={academyData.cep} onChange={e => handleCepLookup(e.target.value, (c, a) => setAcademyData({...academyData, cep: c, address: a}))} placeholder="00000-000" icon={isLoadingCep ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />} />
                <Input label="Número" value={academyData.addressNumber} onChange={e => setAcademyData({...academyData, addressNumber: e.target.value})} placeholder="Ex: 123" />
              </div>
              <Input label="Endereço (Auto)" value={academyData.address} onChange={e => setAcademyData({...academyData, address: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Definir Senha Admin" type="password" value={academyData.password} onChange={e => setAcademyData({...academyData, password: e.target.value})} />
                <Input label="Confirmar Senha" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
              </div>
            </div>
            <button type="submit" className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-transform">Finalizar Cadastro</button>
          </form>
        )}

        {view === 'signup-student' && (
          <div className="bg-white dark:bg-slate-900 rounded-[40px] p-6 md:p-12 shadow-2xl space-y-10 animate-in slide-in-from-bottom duration-500 pb-40">
            <header className="flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 py-4 z-20 border-b dark:border-slate-800 -mx-6 md:-mx-12 px-6 md:px-12">
              <div className="flex items-center gap-4">
                <div className="bg-indigo-600 p-3 rounded-2xl text-white"><Users size={28} /></div>
                <h2 className="text-2xl font-black text-slate-800 dark:text-white">Nova Matrícula</h2>
              </div>
              <button onClick={() => navigate('/cadastro')} className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full"><X size={24} /></button>
            </header>
            <div className="space-y-12">
              <div className="flex flex-col items-center gap-4">
                <div onClick={() => photoRef.current?.click()} className="w-40 h-40 rounded-[40px] bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 overflow-hidden relative cursor-pointer shadow-inner">
                  {studentData.photo ? <img src={studentData.photo} className="w-full h-full object-cover" /> : <Camera size={40} className="text-slate-400 m-auto mt-12" />}
                </div>
                <input type="file" ref={photoRef} className="hidden" accept="image/*" onChange={e => handlePhotoUpload(e, 'student')} />
              </div>
              <div className="space-y-6">
                <SectionHeader icon={<UserIcon size={16} />} title="Informações Pessoais" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2"><Input label="Nome Completo" required value={studentData.name || ''} onChange={e => setStudentData({...studentData, name: e.target.value})} /></div>
                  <Input label="Data de Nascimento" required type="date" value={studentData.birthDate || ''} onChange={e => setStudentData({...studentData, birthDate: e.target.value})} />
                  <Input label="E-mail (Para Login)" required type="email" value={studentData.email || ''} onChange={e => setStudentData({...studentData, email: e.target.value})} />
                  <Input label="Definir Senha" required type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} />
                  <Input label="Confirmar Senha" required type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                </div>
              </div>
              <button onClick={handleRegisterStudent} className="w-full py-6 bg-indigo-600 text-white font-black rounded-3xl shadow-2xl text-xl active:scale-95 transition-transform">CONCLUIR MATRÍCULA OSS!</button>
            </div>
          </div>
        )}

        <p className="text-center text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">{(academyData.name || MOCK_ACADEMY.name)} • O LEGADO CONTINUA</p>
      </div>
    </div>
  );
};

export default LoginView;
