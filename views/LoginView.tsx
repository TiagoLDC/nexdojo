
import React, { useState, useRef } from 'react';
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
  Save,
  X,
  Plus,
  ArrowLeft,
  MapPin,
  Phone,
  Briefcase,
  Activity,
  GraduationCap,
  CalendarClock,
  Heart,
  Send,
  UserCheck,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { BELT_COLORS } from '../constants';

// Funções de máscara removidas e unificadas em services/cep.ts

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
  onLogin: (user: User, academy: Academy) => void;
}

type AuthView = 'login' | 'choice' | 'signup-academy' | 'signup-student' | 'signup-instructor' | 'forgot-password';

const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [view, setView] = useState<AuthView>('login');
  const [email, setEmail] = useState('admin@oss.com');
  const [password, setPassword] = useState('oss123');
  const [forgotEmail, setForgotEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isLoadingCep, setIsLoadingCep] = useState(false);

  // Detecção de AcademyId via URL para branding e pré-seleção
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search || window.location.hash.split('?')[1]);
    const academyIdFromUrl = params.get('academyId');
    
    if (academyIdFromUrl) {
      const found = StorageService.getAcademyById(academyIdFromUrl);
      if (found) {
        setAcademyData(prev => ({ 
          ...prev, 
          name: found.name, 
          logo: found.logo || prev.logo 
        }));
        setStudentData(prev => ({ ...prev, academyId: academyIdFromUrl }));
        setInstructorData(prev => ({ ...prev, academyId: academyIdFromUrl }));
        setStaffData(prev => ({ ...prev, academyId: academyIdFromUrl }));
      }
    }
  }, []);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };
  
  // Estados para cadastros públicos completos
  const academies = StorageService.getAcademies();
  const [academyData, setAcademyData] = useState({ 
    name: '', 
    logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcThl9F99l477l7S9Zl9Xl9Xl9Xl9Xl9Xl9Xl9Xl9Xl9&s', 
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
    academyId: '', // Adicionado campo de academyId
    joinDate: new Date().toISOString(), totalClasses: 0, totalHours: 0, 
    absentCount: 0, hasLoanedKimono: false, gender: 'M', weight: '', height: '',
    bloodType: '', emergencyContact: '', emergencyPhone: '', lastGraduationDate: '',
    cep: '', address: '', addressNumber: ''
  });
  const [instructorData, setInstructorData] = useState<Partial<Instructor>>({ 
    name: '', belt: Belt.BLACK, stripes: 0, birthDate: '', status: 'Pending', 
    academyId: '', // Adicionado campo de academyId
    joinDate: new Date().toISOString(), gender: 'M', cpf: '', rg: '',
    maritalStatus: 'Solteiro', lastGraduationDate: '', specialties: '',
    cep: '', address: '', addressNumber: ''
  });
  const [staffData, setStaffData] = useState<Partial<Staff>>({
    name: '', birthDate: '', status: 'Pending', joinDate: new Date().toISOString(),
    academyId: '', // Adicionado campo de academyId
    gender: 'M', cpf: '', rg: '', maritalStatus: 'Solteiro',
    emergencyContact: '', emergencyPhone: '', position: '',
    cep: '', address: '', addressNumber: ''
  });

  const photoRef = useRef<HTMLInputElement>(null);

  const notifyAdmins = (type: 'student' | 'instructor' | 'staff', name: string, details: string, academyId: string) => {
    // 1. Enviar Notificação ao Mural Interno
    const systemMsg: ChatMessage = {
      id: 'sys_' + Math.random().toString(36).substr(2, 9),
      academyId,
      senderId: 'system',
      senderName: 'SISTEMA OSS',
      senderRole: 'admin',
      content: `🔔 NOVO CADASTRO: Um novo ${type === 'student' ? 'aluno' : type === 'instructor' ? 'instrutor' : 'colaborador'} (${name}) acaba de realizar a matrícula pelo portal público. Detalhes: ${details}. Verifique no painel administrativo.`,
      timestamp: new Date().toISOString()
    };
    const messages = StorageService.getChatMessages();
    StorageService.saveChatMessages([...messages, systemMsg]);

    // 2. Tentar disparar e-mail via mailto
    const academyEmail = StorageService.getAcademyById(academyId)?.email || 'contato@ct.com';
    const typeLabel = type === 'student' ? 'Aluno' : type === 'instructor' ? 'Instrutor' : 'Colaborador';
    const subject = encodeURIComponent(`[OSS] Novo Cadastro de ${typeLabel}`);
    const body = encodeURIComponent(`Olá Professor/Adm,\n\nUm novo cadastro foi realizado no sistema ${MOCK_ACADEMY.name}:\n\nNome: ${name}\nTipo: ${typeLabel.toUpperCase()}\nData: ${new Date().toLocaleDateString()}\n\nAcesse o sistema para validar a ficha.\n\nOSS!`);
    
    window.open(`mailto:${academyEmail}?subject=${subject}&body=${body}`, '_blank');
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Assegura que as academias existem
    const allAcademies = StorageService.getAcademies();
    if (allAcademies.length === 0) {
      StorageService.saveAcademies([MOCK_ACADEMY]);
    }

    const users = StorageService.getUsers();
    let foundUser = users.find(u => u.email === email && u.password === password);

    // Permitir sempre o acesso do superuser de demonstração
    if (!foundUser && email === 'super@oss.com' && password === 'super') {
      foundUser = MOCK_SUPERUSER;
    }

    // Permitir acesso do instrutor de demonstração
    if (!foundUser && email === 'instru@oss.com' && password === 'oss123') {
      foundUser = MOCK_INSTRUCTOR_USER;
    }

    // Permitir acesso do colaborador de demonstração
    if (!foundUser && email === 'colab@oss.com' && password === 'oss123') {
      foundUser = MOCK_STAFF_USER;
    }

    // Permitir acesso do aluno de demonstração
    if (!foundUser && email === 'aluno@oss.com' && password === 'oss123') {
      foundUser = MOCK_STUDENT_USER;
    }

    // Permitir sempre o acesso do admin de demonstração
    if (!foundUser && email === 'admin@oss.com' && password === 'oss123') {
      // Se for o primeiro acesso real (sem nenhum usuário), inicializa os dados mock
      if (users.length === 0) {
        StorageService.saveStudents(MOCK_STUDENTS);
        StorageService.saveTemplates(MOCK_TEMPLATES);
        StorageService.saveClasses(MOCK_CLASSES);
        StorageService.saveAttendance(MOCK_ATTENDANCE);
      } else {
        // Se já existem usuários, garante que os estudantes mock tenham as fotos atualizadas
        const currentStudents = StorageService.getStudents();
        const updatedStudents = currentStudents.map(s => {
          const mock = MOCK_STUDENTS.find(m => m.id === s.id);
          if (mock && !s.photo) return { ...s, photo: mock.photo };
          return s;
        });
        StorageService.saveStudents(updatedStudents);
      }
      
      // Garante que o MOCK_USER esteja na lista de usuários para futuras consultas
      if (!users.find(u => u.email === 'admin@oss.com')) {
        StorageService.saveUsers([...users, MOCK_USER]);
      }
      
      foundUser = MOCK_USER;
    }

    if (!foundUser) {
      showNotification("E-mail ou senha incorretos.", 'error');
      return;
    }

    if (foundUser.status === 'Pending') {
      showNotification("Seu acesso ainda está pendente de aprovação. OSS!", 'error');
      return;
    }

    if (foundUser.status === 'Blocked') {
      showNotification("Seu acesso foi bloqueado. Entre em contato com a administração.", 'error');
      return;
    }

    const academy = StorageService.getAcademyById(foundUser.academyId) || StorageService.getAcademy();
    onLogin(foundUser, academy || MOCK_ACADEMY);
  };

  const handleRegisterAcademy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!academyData.password) {
      showNotification("Defina uma senha para o administrador.", 'error');
      return;
    }
    
    if (academyData.password !== confirmPassword) {
      showNotification("As senhas não coincidem.", 'error');
      return;
    }
    
    const academyId = 'acad_' + Math.random().toString(36).substr(2, 5);
    const userId = 'user_' + Math.random().toString(36).substr(2, 5);
    const academy: Academy = { 
      id: academyId, 
      name: academyData.name, 
      logo: academyData.logo,
      ownerName: academyData.owner, 
      email: academyData.email,
      cep: academyData.cep,
      address: academyData.address,
      addressNumber: academyData.addressNumber,
      phone: academyData.phone
    };
    const user: User = { 
      id: userId, 
      academyId, 
      role: 'admin', 
      name: academyData.owner, 
      email: academyData.email, 
      password: academyData.password,
      status: 'Active' // O criador da academia já nasce ativo
    };
    
    StorageService.saveAcademy(academy);
    StorageService.saveUsers([user]);
    onLogin(user, academy);
  };

  const handleRegisterStudent = () => {
    if (!studentData.name || !studentData.birthDate || !studentData.email || !regPassword || !studentData.academyId) {
      showNotification("Preencha todos os campos obrigatórios (*).", 'error');
      return;
    }

    if (regPassword !== confirmPassword) {
      showNotification("As senhas não coincidem.", 'error');
      return;
    }
    
    const newStudent = { ...studentData, id: 's_pub_' + Math.random().toString(36).substr(2, 7) } as Student;
    const newUser: User = {
      id: 'u_s_' + Math.random().toString(36).substr(2, 7),
      academyId: studentData.academyId,
      role: 'student', // Papel padrão para alunos
      name: newStudent.name,
      email: newStudent.email!,
      password: regPassword,
      status: 'Pending'
    };

    const currentStudents = StorageService.getStudents();
    StorageService.saveStudents([...currentStudents, newStudent]);
    
    const currentUsers = StorageService.getUsers();
    StorageService.saveUsers([...currentUsers, newUser]);

    notifyAdmins('student', newStudent.name, `Unidade: ${StorageService.getAcademyById(studentData.academyId!)?.name || 'N/A'}, Faixa ${newStudent.belt}`, studentData.academyId!);
    showNotification("Matrícula realizada com sucesso! Aguarde aprovação. OSS!");
    setView('login');
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

  const handleRegisterInstructor = () => {
    if (!instructorData.name || !instructorData.birthDate || !instructorData.email || !regPassword || !instructorData.academyId) {
      showNotification("Preencha todos os campos obrigatórios (*).", 'error');
      return;
    }

    if (regPassword !== confirmPassword) {
      showNotification("As senhas não coincidem.", 'error');
      return;
    }
    
    const newInst = { ...instructorData, id: 'i_pub_' + Math.random().toString(36).substr(2, 7) } as Instructor;
    const newUser: User = {
      id: 'u_i_' + Math.random().toString(36).substr(2, 7),
      academyId: instructorData.academyId,
      role: 'instructor',
      name: newInst.name,
      email: newInst.email!,
      password: regPassword,
      status: 'Pending'
    };

    const currentInstructors = StorageService.getInstructors();
    StorageService.saveInstructors([...currentInstructors, newInst]);
    
    const currentUsers = StorageService.getUsers();
    StorageService.saveUsers([...currentUsers, newUser]);

    notifyAdmins('instructor', newInst.name, `Unidade: ${StorageService.getAcademyById(instructorData.academyId!)?.name || 'N/A'}, Especialidade: ${newInst.specialties || 'Geral'}`, instructorData.academyId!);
    showNotification("Ficha Técnica enviada! Aguarde aprovação. OSS!");
    setView('login');
  };

  const handleRegisterStaff = () => {
    if (!staffData.name || !staffData.birthDate || !staffData.email || !regPassword || !staffData.academyId) {
      showNotification("Preencha todos os campos obrigatórios (*).", 'error');
      return;
    }

    if (regPassword !== confirmPassword) {
      showNotification("As senhas não coincidem.", 'error');
      return;
    }
    
    const newStaff = { ...staffData, id: 'st_pub_' + Math.random().toString(36).substr(2, 7) } as Staff;
    const newUser: User = {
      id: 'u_st_' + Math.random().toString(36).substr(2, 7),
      academyId: staffData.academyId,
      role: 'staff',
      name: newStaff.name,
      email: newStaff.email!,
      password: regPassword,
      status: 'Pending'
    };

    const currentStaff = StorageService.getStaff();
    StorageService.saveStaff([...currentStaff, newStaff]);
    
    const currentUsers = StorageService.getUsers();
    StorageService.saveUsers([...currentUsers, newUser]);

    notifyAdmins('staff', newStaff.name, `Unidade: ${StorageService.getAcademyById(staffData.academyId!)?.name || 'N/A'}, Cargo: ${newStaff.position || 'Geral'}`, staffData.academyId!);
    showNotification("Ficha de Colaborador enviada! Aguarde aprovação. OSS!");
    setView('login');
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

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 transition-colors relative">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-top duration-300 ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span className="font-bold text-sm tracking-tight">{toast.message}</span>
        </div>
      )}

      <div className="w-full max-w-5xl space-y-8 py-10">
        
        {/* Header Comum */}
        {(view === 'login' || view === 'choice') && (
          <div className="text-center animate-in fade-in duration-700">
            <div className="inline-flex items-center justify-center w-28 h-28 bg-indigo-600 rounded-[32px] mb-6 shadow-2xl shadow-indigo-600/30 overflow-hidden ring-4 ring-slate-800/50">
              {academyData.logo || MOCK_ACADEMY.logo ? (
                <img 
                  src={academyData.logo || MOCK_ACADEMY.logo} 
                  alt={academyData.name || MOCK_ACADEMY.name} 
                  className="w-full h-full object-contain p-2"
                />
              ) : (
                <Award className="text-white" size={40} />
              )}
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic leading-none">{academyData.name || MOCK_ACADEMY.name}</h1>
            <p className="text-slate-400 mt-3 font-bold text-xs uppercase tracking-[0.3em] opacity-80">O LEGADO CONTINUA</p>
          </div>
        )}

        {/* VIEW: LOGIN */}
        {view === 'login' && (
          <div className="max-w-md mx-auto space-y-6">
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
                <Input label="E-mail" type="email" value={email} onChange={setEmail} placeholder="professor@oss.com" icon={<Mail size={18} />} />
                <Input label="Senha" type="password" value={password} onChange={setPassword} placeholder="••••••••" icon={<Lock size={18} />} />
              </div>
              <button type="submit" className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 active:scale-95">
                Entrar no Tatame <ArrowRight size={20} />
              </button>
              <div className="pt-2 flex flex-col items-center gap-3">
                <button type="button" onClick={() => setView('forgot-password')} className="text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors">Esqueci minha senha</button>
                <button type="button" onClick={() => setView('choice')} className="text-sm font-bold text-indigo-600 hover:text-indigo-400 transition-colors">Novo por aqui? Cadastre-se</button>
              </div>
            </form>
          </div>
        )}

        {/* VIEW: FORGOT PASSWORD */}
        {view === 'forgot-password' && (
          <div className="max-w-md mx-auto space-y-6 animate-in fade-in zoom-in duration-300">
            <button onClick={() => setView('login')} className="text-white flex items-center gap-2 mb-4 hover:text-indigo-400 transition-colors font-bold text-xs uppercase tracking-[0.2em]">
              <ChevronLeft size={18} /> Voltar ao Login
            </button>
            
            <div className="bg-white dark:bg-slate-900 rounded-[40px] p-8 md:p-10 shadow-2xl space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Recuperar Senha</h2>
                <p className="text-sm text-slate-400 font-medium leading-relaxed">Insira seu e-mail cadastrado para receber as instruções de recuperação.</p>
              </div>

              <div className="space-y-4">
                <Input 
                  label="E-mail Cadastrado" 
                  type="email" 
                  value={forgotEmail} 
                  onChange={setForgotEmail} 
                  placeholder="professor@oss.com" 
                  icon={<Mail size={18} />} 
                />
              </div>

              <button 
                onClick={() => {
                  if (!forgotEmail) {
                    showNotification("Por favor, insira seu e-mail.", 'error');
                    return;
                  }
                  showNotification("E-mail de recuperação enviado com sucesso! Verifique sua caixa de entrada.");
                  setView('login');
                }} 
                className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                Enviar Instruções <Send size={20} />
              </button>
            </div>
          </div>
        )}

        {/* VIEW: CHOICE */}
        {view === 'choice' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <button onClick={() => setView('login')} className="text-white flex items-center gap-2 mb-4 hover:text-indigo-400 transition-colors font-bold text-xs uppercase tracking-[0.2em]">
              <ChevronLeft size={18} /> Voltar ao Login
            </button>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <ChoiceCard icon={<Trophy size={28} />} title="Nova Academia" desc="Para professores e gestores." onClick={() => setView('signup-academy')} />
              <ChoiceCard icon={<Users size={28} />} title="Sou Aluno" desc="Fazer matrícula agora." onClick={() => setView('signup-student')} />
              <ChoiceCard icon={<Award size={28} />} title="Sou Instrutor" desc="Ficha técnica do mestre." onClick={() => setView('signup-instructor')} />
            </div>
          </div>
        )}

        {/* VIEW: SIGNUP ACADEMY */}
        {view === 'signup-academy' && (
          <form onSubmit={handleRegisterAcademy} className="max-w-md mx-auto bg-white dark:bg-slate-900 rounded-[40px] p-6 md:p-10 shadow-2xl space-y-6 animate-in zoom-in duration-300 max-h-[90vh] overflow-y-auto pb-32">
            <div className="flex items-center gap-4 mb-2 sticky top-0 bg-white dark:bg-slate-900 py-2 z-10">
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
                <Input label="Seu Nome" value={academyData.owner} onChange={v => setAcademyData({...academyData, owner: v})} placeholder="Mestre Hélio" />
                <Input label="Nome da Unidade" value={academyData.name} onChange={v => setAcademyData({...academyData, name: v})} placeholder="Ex: NexDojo" />
                <Input label="E-mail de Contato" type="email" value={academyData.email} onChange={v => setAcademyData({...academyData, email: v})} placeholder="ct@oss.com" />
                <Input label="WhatsApp / Telefone" value={academyData.phone} onChange={v => setAcademyData({...academyData, phone: maskPhone(v)})} placeholder="(00) 00000-0000" icon={<Phone size={16} />} inputMode="numeric" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input 
                    label="CEP" 
                    value={academyData.cep || ''} 
                    onChange={v => handleCepLookup(v, (c, a) => setAcademyData({...academyData, cep: c, address: a}))} 
                    placeholder="00000-000"
                    icon={isLoadingCep ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
                    inputMode="numeric"
                  />
                  <Input 
                    label="Número" 
                    value={academyData.addressNumber || ''} 
                    onChange={v => setAcademyData({...academyData, addressNumber: v})} 
                    placeholder="Ex: 123" 
                    inputMode="numeric"
                  />
                </div>
                <Input 
                  label="Endereço (Auto)" 
                  value={academyData.address || ''} 
                  onChange={v => setAcademyData({...academyData, address: v})} 
                  placeholder="Rua, Bairro, Cidade..." 
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Definir Senha Admin" type="password" value={academyData.password} onChange={v => setAcademyData({...academyData, password: v})} placeholder="••••••••" icon={<Lock size={18} />} />
                  <Input label="Confirmar Senha" type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="••••••••" icon={<Lock size={18} />} />
                </div>
              </div>
            <button type="submit" className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-transform">Finalizar Cadastro</button>
          </form>
        )}

        {/* VIEW: SIGNUP STUDENT */}
        {view === 'signup-student' && (
          <div className="bg-white dark:bg-slate-900 rounded-[40px] p-6 md:p-12 shadow-2xl space-y-10 animate-in slide-in-from-bottom duration-500 max-h-[92vh] md:max-h-[90vh] overflow-y-auto custom-scrollbar pb-40">
            <header className="flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 py-4 z-20 border-b dark:border-slate-800 -mx-6 md:-mx-12 px-6 md:px-12">
              <div className="flex items-center gap-4">
                <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg shadow-indigo-600/20"><Users size={28} /></div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Nova Matrícula</h2>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Portal do Atleta</p>
                </div>
              </div>
              <button onClick={() => setView('choice')} className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-red-500 rounded-full transition-colors"><X size={24} /></button>
            </header>

            <div className="space-y-12">
              <div className="flex flex-col items-center gap-4">
                <div onClick={() => photoRef.current?.click()} className="w-40 h-40 rounded-[40px] bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 overflow-hidden relative group cursor-pointer shadow-inner">
                  {studentData.photo ? <img src={studentData.photo} className="w-full h-full object-cover" /> : <div className="w-full h-full flex flex-col items-center justify-center text-slate-400"><Camera size={40} /><span className="text-[10px] font-black uppercase tracking-widest mt-2">Sua Foto</span></div>}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"><Camera size={24} /></div>
                </div>
                <input type="file" ref={photoRef} className="hidden" accept="image/*" onChange={e => handlePhotoUpload(e, 'student')} />
              </div>

              <div className="space-y-6">
                <SectionHeader icon={<UserIcon size={16} />} title="Informações Pessoais" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-3">
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 mb-1 font-bold">Unidade (Academia) *</label>
                    <select 
                      value={studentData.academyId || ''} 
                      onChange={e => setStudentData({...studentData, academyId: e.target.value})}
                      disabled={!!studentData.academyId && !!new URLSearchParams(window.location.search || window.location.hash.split('?')[1]).get('academyId')}
                      className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none text-slate-800 dark:text-white transition-all font-bold text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">Escolha a Academia...</option>
                      {academies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    {!!new URLSearchParams(window.location.search || window.location.hash.split('?')[1]).get('academyId') && (
                      <p className="text-[10px] text-indigo-600 font-bold mt-1 ml-1 uppercase">Acesso direto à esta unidade ativado via link.</p>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <Input label="Nome Completo *" value={studentData.name || ''} onChange={v => setStudentData({...studentData, name: v})} placeholder="Digite seu nome" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 mb-1">Sexo</label>
                    <select 
                      value={studentData.gender || 'M'} 
                      onChange={e => setStudentData({...studentData, gender: e.target.value as any})}
                      className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none text-slate-800 dark:text-white transition-all font-bold text-sm"
                    >
                      <option value="M">Masculino</option>
                      <option value="F">Feminino</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                  <Input label="Data de Nascimento *" type="date" value={studentData.birthDate || ''} onChange={v => setStudentData({...studentData, birthDate: v})} />
                  <Input label="E-mail (Para Login) *" type="email" value={studentData.email || ''} onChange={v => setStudentData({...studentData, email: v})} placeholder="seu@email.com" />
                  <div className="md:col-span-1">
                    <Input label="Definir Senha *" type="password" value={regPassword} onChange={setRegPassword} placeholder="••••••••" icon={<Lock size={18} />} />
                  </div>
                  <div className="md:col-span-1">
                    <Input label="Confirmar Senha *" type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="••••••••" icon={<Lock size={18} />} />
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
                      onChange={v => handleCepLookup(v, (c, a) => setStudentData({...studentData, cep: c, address: a}))} 
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

              <div className={`p-8 rounded-[32px] border-2 transition-all ${isMinor ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/30' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 opacity-60'}`}>
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
                <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                  {[Belt.WHITE, Belt.BLUE, Belt.PURPLE, Belt.BROWN, Belt.BLACK].map(b => (
                    <button key={b} onClick={() => setStudentData({...studentData, belt: b})} className={`py-4 rounded-2xl border-2 font-black text-[10px] uppercase transition-all ${studentData.belt === b ? `${BELT_COLORS[b]} scale-105 shadow-lg` : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-400'}`}>{b}</button>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <SectionHeader icon={<Heart size={16} />} title="Saúde e Observações" />
                <textarea value={studentData.medicalNotes || ''} onChange={e => setStudentData({...studentData, medicalNotes: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 outline-none text-sm min-h-[120px] text-slate-700 dark:text-white" placeholder="Possui alguma lesão ou condição especial?" />
              </div>

              <button onClick={handleRegisterStudent} className="w-full py-6 bg-indigo-600 text-white font-black rounded-3xl shadow-2xl shadow-indigo-600/30 text-xl active:scale-95 transition-transform">CONCLUIR MATRÍCULA OSS!</button>
            </div>
          </div>
        )}

        {/* VIEW: SIGNUP INSTRUCTOR */}
        {view === 'signup-instructor' && (
          <div className="bg-white dark:bg-slate-900 rounded-[40px] p-6 md:p-12 shadow-2xl space-y-10 animate-in slide-in-from-bottom duration-500 max-h-[92vh] md:max-h-[90vh] overflow-y-auto custom-scrollbar pb-40">
            <header className="flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 py-4 z-20 border-b dark:border-slate-800 -mx-6 md:-mx-12 px-6 md:px-12">
              <div className="flex items-center gap-4">
                <div className="bg-slate-900 dark:bg-slate-800 p-3 rounded-2xl text-white shadow-lg"><Award size={28} /></div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Ficha do Professor</h2>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Corpo Docente</p>
                </div>
              </div>
              <button onClick={() => setView('choice')} className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-red-500 rounded-full transition-colors"><X size={24} /></button>
            </header>

            <div className="space-y-12">
              <div className="flex flex-col items-center gap-4">
                <div onClick={() => photoRef.current?.click()} className="w-40 h-40 rounded-[40px] bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 overflow-hidden relative group cursor-pointer shadow-inner">
                  {instructorData.photo ? <img src={instructorData.photo} className="w-full h-full object-cover" /> : <div className="w-full h-full flex flex-col items-center justify-center text-slate-400"><Camera size={40} /><span className="text-[10px] font-black uppercase tracking-widest mt-2">Sua Foto</span></div>}
                </div>
                <input type="file" ref={photoRef} className="hidden" accept="image/*" onChange={e => handlePhotoUpload(e, 'instructor')} />
              </div>

              <div className="space-y-8">
                <SectionHeader icon={<UserIcon size={16} />} title="Dados do Professor" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-3">
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 mb-1 font-bold">Unidade de Atuação *</label>
                    <select 
                      value={instructorData.academyId || ''} 
                      onChange={e => setInstructorData({...instructorData, academyId: e.target.value})}
                      disabled={!!instructorData.academyId && !!new URLSearchParams(window.location.search || window.location.hash.split('?')[1]).get('academyId')}
                      className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none text-slate-800 dark:text-white transition-all font-bold text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">Escolha a Academia...</option>
                      {academies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <Input label="Nome Completo *" value={instructorData.name || ''} onChange={v => setInstructorData({...instructorData, name: v})} placeholder="Ex: Prof. Hélio" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 mb-1">Sexo</label>
                    <select 
                      value={instructorData.gender || 'M'} 
                      onChange={e => setInstructorData({...instructorData, gender: e.target.value as any})}
                      className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none text-slate-800 dark:text-white transition-all font-bold text-sm"
                    >
                      <option value="M">Masculino</option>
                      <option value="F">Feminino</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                  <Input label="Data de Nascimento *" type="date" value={instructorData.birthDate || ''} onChange={v => setInstructorData({...instructorData, birthDate: v})} />
                  <Input label="E-mail (Para Login) *" type="email" value={instructorData.email || ''} onChange={v => setInstructorData({...instructorData, email: v})} placeholder="mestre@ct.com" />
                  <div className="md:col-span-1">
                    <Input label="Definir Senha *" type="password" value={regPassword} onChange={setRegPassword} placeholder="••••••••" icon={<Lock size={18} />} />
                  </div>
                  <div className="md:col-span-1">
                    <Input label="Confirmar Senha *" type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="••••••••" icon={<Lock size={18} />} />
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
                      onChange={v => handleCepLookup(v, (c, a) => setInstructorData({...instructorData, cep: c, address: a}))} 
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Selecione sua Graduação</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[Belt.BLUE, Belt.PURPLE, Belt.BROWN, Belt.BLACK].map(b => (
                        <button key={b} onClick={() => setInstructorData({...instructorData, belt: b})} className={`py-4 rounded-2xl border-2 font-black text-[10px] uppercase transition-all ${instructorData.belt === b ? `${BELT_COLORS[b]} scale-105 shadow-lg` : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-400'}`}>{b}</button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-6">
                    <Input label="Especialidades" value={instructorData.specialties || ''} onChange={v => setInstructorData({...instructorData, specialties: v})} placeholder="Ex: Kids, No-Gi, Competição" />
                    <Input label="Data da Última Graduação" type="date" value={instructorData.lastGraduationDate || ''} onChange={v => setInstructorData({...instructorData, lastGraduationDate: v})} />
                  </div>
                </div>
              </div>

              <button onClick={handleRegisterInstructor} className="w-full py-6 bg-slate-900 dark:bg-slate-800 text-white font-black rounded-3xl shadow-2xl text-xl active:scale-95 transition-transform border border-slate-700">ENVIAR FICHA TÉCNICA OSS!</button>
            </div>
          </div>
        )}

        <p className="text-center text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">{(academies[0]?.name || MOCK_ACADEMY.name)} • O LEGADO CONTINUA</p>
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
  <button onClick={onClick} className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 text-left hover:scale-105 hover:shadow-2xl transition-all group border-b-8 border-b-transparent hover:border-b-indigo-500">
    <div className="bg-indigo-50 dark:bg-indigo-900/20 w-16 h-16 rounded-2xl flex items-center justify-center text-indigo-600 mb-8 group-hover:bg-indigo-600 group-hover:text-white transition-colors">{icon}</div>
    <h3 className="font-black text-slate-800 dark:text-white text-xl tracking-tighter mb-2">{title}</h3>
    <p className="text-sm text-slate-400 dark:text-slate-500 font-medium leading-relaxed">{desc}</p>
  </button>
);

const Input: React.FC<{ label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; icon?: React.ReactNode; inputMode?: any }> = ({ label, value, onChange, type = 'text', placeholder, icon, inputMode }) => {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (show ? 'text' : 'password') : type;

  return (
    <div className="space-y-1">
      <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">{label}</label>
      <div className="relative">
        {icon && <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">{icon}</div>}
        <input 
          type={inputType} 
          value={value} 
          onChange={e => onChange(e.target.value)} 
          placeholder={placeholder} 
          inputMode={inputMode}
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

export default LoginView;
