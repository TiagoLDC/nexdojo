
import React, { useState, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { User, Academy, Student, Instructor, Staff, Belt, ChatMessage } from '../types';
import { StorageService } from '../services/storage';
import { useTranslation } from '../services/LanguageContext';
import { fetchAddressByCep, maskCEP, maskPhone, maskCPF, maskRG } from '../services/cep';
import {
  MOCK_ACADEMY, MOCK_USER, MOCK_SUPERUSER, MOCK_INSTRUCTOR_USER, MOCK_STAFF_USER, MOCK_STUDENT_USER,
  MOCK_STUDENTS, MOCK_CLASSES, MOCK_TEMPLATES, MOCK_ATTENDANCE,
  MOCK_INSTRUCTORS, MOCK_STAFF, MOCK_FINANCES, MOCK_CALENDAR, MOCK_CHAT, MOCK_PRODUCTS,
  MOCK_ACADEMY_2, MOCK_USERS_A2, MOCK_STUDENTS_A2, MOCK_INSTRUCTORS_A2, MOCK_STAFF_A2,
  MOCK_TEMPLATES_A2, MOCK_CLASSES_A2, MOCK_ATTENDANCE_A2, MOCK_FINANCES_A2, MOCK_CALENDAR_A2, MOCK_CHAT_A2, MOCK_PRODUCTS_A2,
  MOCK_ACADEMY_3, MOCK_USERS_A3, MOCK_STUDENTS_A3, MOCK_INSTRUCTORS_A3, MOCK_STAFF_A3,
  MOCK_TEMPLATES_A3, MOCK_CLASSES_A3, MOCK_ATTENDANCE_A3, MOCK_FINANCES_A3, MOCK_CALENDAR_A3, MOCK_CHAT_A3, MOCK_PRODUCTS_A3,
} from '../services/mockData';
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
  Minus,
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
  Loader2,
  ShieldCheck
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
  const { t, showNotification } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { alias } = useParams<{ alias?: string }>();

  const view: AuthView =
    pathname.includes('/esqueci-senha') ? 'forgot-password' :
    pathname.includes('/cadastro/academia') ? 'signup-academy' :
    pathname.includes('/cadastro/aluno') ? 'signup-student' :
    pathname.includes('/cadastro/instrutor') ? 'signup-instructor' :
    pathname.includes('/cadastro') ? 'choice' :
    'login';

  const setView = (v: AuthView) => {
    const base = alias ? `/login/${alias}` : '/login';
    const paths: Record<AuthView, string> = {
      login: base,
      'forgot-password': `${base}/esqueci-senha`,
      choice: `${base}/cadastro`,
      'signup-academy': '/login/cadastro/academia',
      'signup-student': `${base}/cadastro/aluno`,
      'signup-instructor': `${base}/cadastro/instrutor`,
    };
    navigate(paths[v]);
  };
  const [email, setEmail] = useState('admin@oss.com');
  const [password, setPassword] = useState('oss123');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStep, setForgotStep] = useState(1);
  const [newPassword, setNewPassword] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [isFromSharedLink, setIsFromSharedLink] = useState(false);
  const [linkedAcademy, setLinkedAcademy] = useState<Academy | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Reset terms when switching signup views
  React.useEffect(() => {
    if (view.startsWith('signup-')) {
      setAcceptedTerms(false);
    }
  }, [view]);

  // Detecção de academia via alias de rota OU query param legado ?academyId=
  React.useEffect(() => {
    // Inicializa academias mock para garantir que existam no localStorage
    StorageService.getAcademies();

    let found: Academy | null = null;
    let redirectToChoice = false;

    if (alias) {
      // Rota /login/:alias — mostra branding da academia mas fica no login
      found = StorageService.getAcademyByAlias(alias) || StorageService.getAcademyById(alias);
    }

    if (!found) {
      // Suporte legado a ?academyId= — redireciona para cadastro
      const params = new URLSearchParams(window.location.search);
      const academyIdFromUrl = params.get('academyId');
      if (academyIdFromUrl) {
        found = StorageService.getAcademyById(academyIdFromUrl);
        redirectToChoice = true;
      }
    }

    if (found) {
      setLinkedAcademy(found);
      setIsFromSharedLink(true);
      setStudentData(prev => ({ ...prev, academyId: found!.id }));
      setInstructorData(prev => ({ ...prev, academyId: found!.id }));
      setStaffData(prev => ({ ...prev, academyId: found!.id }));
      if (redirectToChoice && view === 'login') {
        const slug = found!.alias || found!.id;
        navigate(`/login/${slug}/cadastro`, { replace: true });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alias]);

  // Estados para cadastros públicos completos
  const academies = StorageService.getAcademies();
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
    const messages = StorageService.getChatMessages(academyId);
    StorageService.saveChatMessages([...messages, systemMsg], academyId);

    // 2. Tentar disparar e-mail via mailto
    const academyEmail = StorageService.getAcademyById(academyId)?.email || 'contato@ct.com';
    const typeLabel = type === 'student' ? 'Aluno' : type === 'instructor' ? 'Instrutor' : 'Colaborador';
    const subject = encodeURIComponent(`[OSS] Novo Cadastro de ${typeLabel}`);
    const body = encodeURIComponent(`Olá Instrutor/Adm,\n\nUm novo cadastro foi realizado no sistema ${MOCK_ACADEMY.name}:\n\nNome: ${name}\nTipo: ${typeLabel.toUpperCase()}\nData: ${new Date().toLocaleDateString()}\n\nAcesse o sistema para validar a ficha.\n\nOSS!`);
    
    window.open(`mailto:${academyEmail}?subject=${subject}&body=${body}`, '_blank');
  };

  // Inicializa dados mockados de uma academia se ainda não existirem no localStorage
  const initAcademyData = (
    academyId: string,
    students: any[], instructors: any[], staff: any[], users: any[],
    templates: any[], classes: any[], attendance: any[],
    finances: any[], calendar: any[], chat: any[], products: any[],
  ) => {
    if (StorageService.getStudents(academyId).length === 0)
      StorageService.saveStudents(students, academyId);
    if (StorageService.getInstructors(academyId).length === 0)
      StorageService.saveInstructors(instructors, academyId);
    if (StorageService.getStaff(academyId).length === 0)
      StorageService.saveStaff(staff, academyId);
    if (StorageService.getUsers(academyId).length === 0)
      StorageService.saveUsers(users, academyId);
    if (StorageService.getTemplates(academyId).length === 0)
      StorageService.saveTemplates(templates, academyId);
    if (StorageService.getClasses(academyId).length === 0)
      StorageService.saveClasses(classes, academyId);
    if (StorageService.getAttendance(academyId).length === 0)
      StorageService.saveAttendance(attendance, academyId);
    if (StorageService.getFinances(academyId).length === 0)
      StorageService.saveFinances(finances, academyId);
    if (StorageService.getCalendarEvents(academyId).length === 0)
      StorageService.saveCalendarEvents(calendar, academyId);
    if (StorageService.getChatMessages(academyId).length === 0)
      StorageService.saveChatMessages(chat, academyId);
    if (StorageService.getProducts(academyId).length === 0)
      StorageService.saveProducts(products, academyId);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    // Assegura que as 3 academias existem na lista
    StorageService.getAcademies();

    // Inicializa dados de TODAS as academias em qualquer login (necessário para o superuser)
    initAcademyData(
      MOCK_ACADEMY.id,
      MOCK_STUDENTS, MOCK_INSTRUCTORS, MOCK_STAFF,
      [MOCK_USER, MOCK_INSTRUCTOR_USER, MOCK_STAFF_USER, MOCK_STUDENT_USER],
      MOCK_TEMPLATES, MOCK_CLASSES, MOCK_ATTENDANCE,
      MOCK_FINANCES, MOCK_CALENDAR, MOCK_CHAT, MOCK_PRODUCTS,
    );
    initAcademyData(
      MOCK_ACADEMY_2.id,
      MOCK_STUDENTS_A2, MOCK_INSTRUCTORS_A2, MOCK_STAFF_A2, MOCK_USERS_A2,
      MOCK_TEMPLATES_A2, MOCK_CLASSES_A2, MOCK_ATTENDANCE_A2,
      MOCK_FINANCES_A2, MOCK_CALENDAR_A2, MOCK_CHAT_A2, MOCK_PRODUCTS_A2,
    );
    initAcademyData(
      MOCK_ACADEMY_3.id,
      MOCK_STUDENTS_A3, MOCK_INSTRUCTORS_A3, MOCK_STAFF_A3, MOCK_USERS_A3,
      MOCK_TEMPLATES_A3, MOCK_CLASSES_A3, MOCK_ATTENDANCE_A3,
      MOCK_FINANCES_A3, MOCK_CALENDAR_A3, MOCK_CHAT_A3, MOCK_PRODUCTS_A3,
    );

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

    // ── Academia 1: admin de demonstração ──
    if (!foundUser && email === 'admin@oss.com' && password === 'oss123') {
      initAcademyData(
        MOCK_ACADEMY.id,
        MOCK_STUDENTS, MOCK_INSTRUCTORS, MOCK_STAFF,
        [MOCK_USER, MOCK_INSTRUCTOR_USER, MOCK_STAFF_USER, MOCK_STUDENT_USER],
        MOCK_TEMPLATES, MOCK_CLASSES, MOCK_ATTENDANCE,
        MOCK_FINANCES, MOCK_CALENDAR, MOCK_CHAT, MOCK_PRODUCTS,
      );
      foundUser = MOCK_USER;
    }

    // ── Academia 2: Samurai BJJ ──
    if (!foundUser && email === 'admin@samurai.com' && password === 'sam123') {
      initAcademyData(
        MOCK_ACADEMY_2.id,
        MOCK_STUDENTS_A2, MOCK_INSTRUCTORS_A2, MOCK_STAFF_A2, MOCK_USERS_A2,
        MOCK_TEMPLATES_A2, MOCK_CLASSES_A2, MOCK_ATTENDANCE_A2,
        MOCK_FINANCES_A2, MOCK_CALENDAR_A2, MOCK_CHAT_A2, MOCK_PRODUCTS_A2,
      );
      foundUser = MOCK_USERS_A2.find((u: any) => u.role === 'admin') as any;
    }
    if (!foundUser && email === 'kenji@samurai.com' && password === 'sam123') {
      initAcademyData(
        MOCK_ACADEMY_2.id,
        MOCK_STUDENTS_A2, MOCK_INSTRUCTORS_A2, MOCK_STAFF_A2, MOCK_USERS_A2,
        MOCK_TEMPLATES_A2, MOCK_CLASSES_A2, MOCK_ATTENDANCE_A2,
        MOCK_FINANCES_A2, MOCK_CALENDAR_A2, MOCK_CHAT_A2, MOCK_PRODUCTS_A2,
      );
      foundUser = MOCK_USERS_A2.find((u: any) => u.id === 'a2_instr_1') as any;
    }
    if (!foundUser && email === 'camila@samurai.com' && password === 'sam123') {
      initAcademyData(
        MOCK_ACADEMY_2.id,
        MOCK_STUDENTS_A2, MOCK_INSTRUCTORS_A2, MOCK_STAFF_A2, MOCK_USERS_A2,
        MOCK_TEMPLATES_A2, MOCK_CLASSES_A2, MOCK_ATTENDANCE_A2,
        MOCK_FINANCES_A2, MOCK_CALENDAR_A2, MOCK_CHAT_A2, MOCK_PRODUCTS_A2,
      );
      foundUser = MOCK_USERS_A2.find((u: any) => u.id === 'a2_instr_2') as any;
    }
    if (!foundUser && email === 'sec@samurai.com' && password === 'sam123') {
      initAcademyData(
        MOCK_ACADEMY_2.id,
        MOCK_STUDENTS_A2, MOCK_INSTRUCTORS_A2, MOCK_STAFF_A2, MOCK_USERS_A2,
        MOCK_TEMPLATES_A2, MOCK_CLASSES_A2, MOCK_ATTENDANCE_A2,
        MOCK_FINANCES_A2, MOCK_CALENDAR_A2, MOCK_CHAT_A2, MOCK_PRODUCTS_A2,
      );
      foundUser = MOCK_USERS_A2.find((u: any) => u.id === 'a2_staff_1') as any;
    }
    if (!foundUser && email === 'aluno@samurai.com' && password === 'sam123') {
      initAcademyData(
        MOCK_ACADEMY_2.id,
        MOCK_STUDENTS_A2, MOCK_INSTRUCTORS_A2, MOCK_STAFF_A2, MOCK_USERS_A2,
        MOCK_TEMPLATES_A2, MOCK_CLASSES_A2, MOCK_ATTENDANCE_A2,
        MOCK_FINANCES_A2, MOCK_CALENDAR_A2, MOCK_CHAT_A2, MOCK_PRODUCTS_A2,
      );
      foundUser = MOCK_USERS_A2.find((u: any) => u.id === 'a2_student_user_1') as any;
    }

    // ── Academia 3: Dragão Fight ──
    if (!foundUser && email === 'admin@dragao.com' && password === 'drg123') {
      initAcademyData(
        MOCK_ACADEMY_3.id,
        MOCK_STUDENTS_A3, MOCK_INSTRUCTORS_A3, MOCK_STAFF_A3, MOCK_USERS_A3,
        MOCK_TEMPLATES_A3, MOCK_CLASSES_A3, MOCK_ATTENDANCE_A3,
        MOCK_FINANCES_A3, MOCK_CALENDAR_A3, MOCK_CHAT_A3, MOCK_PRODUCTS_A3,
      );
      foundUser = MOCK_USERS_A3.find((u: any) => u.role === 'admin') as any;
    }
    if (!foundUser && email === 'diego@dragao.com' && password === 'drg123') {
      initAcademyData(
        MOCK_ACADEMY_3.id,
        MOCK_STUDENTS_A3, MOCK_INSTRUCTORS_A3, MOCK_STAFF_A3, MOCK_USERS_A3,
        MOCK_TEMPLATES_A3, MOCK_CLASSES_A3, MOCK_ATTENDANCE_A3,
        MOCK_FINANCES_A3, MOCK_CALENDAR_A3, MOCK_CHAT_A3, MOCK_PRODUCTS_A3,
      );
      foundUser = MOCK_USERS_A3.find((u: any) => u.id === 'a3_instr_1') as any;
    }
    if (!foundUser && email === 'leticia@dragao.com' && password === 'drg123') {
      initAcademyData(
        MOCK_ACADEMY_3.id,
        MOCK_STUDENTS_A3, MOCK_INSTRUCTORS_A3, MOCK_STAFF_A3, MOCK_USERS_A3,
        MOCK_TEMPLATES_A3, MOCK_CLASSES_A3, MOCK_ATTENDANCE_A3,
        MOCK_FINANCES_A3, MOCK_CALENDAR_A3, MOCK_CHAT_A3, MOCK_PRODUCTS_A3,
      );
      foundUser = MOCK_USERS_A3.find((u: any) => u.id === 'a3_instr_2') as any;
    }
    if (!foundUser && email === 'atend@dragao.com' && password === 'drg123') {
      initAcademyData(
        MOCK_ACADEMY_3.id,
        MOCK_STUDENTS_A3, MOCK_INSTRUCTORS_A3, MOCK_STAFF_A3, MOCK_USERS_A3,
        MOCK_TEMPLATES_A3, MOCK_CLASSES_A3, MOCK_ATTENDANCE_A3,
        MOCK_FINANCES_A3, MOCK_CALENDAR_A3, MOCK_CHAT_A3, MOCK_PRODUCTS_A3,
      );
      foundUser = MOCK_USERS_A3.find((u: any) => u.id === 'a3_staff_1') as any;
    }
    if (!foundUser && email === 'aluno@dragao.com' && password === 'drg123') {
      initAcademyData(
        MOCK_ACADEMY_3.id,
        MOCK_STUDENTS_A3, MOCK_INSTRUCTORS_A3, MOCK_STAFF_A3, MOCK_USERS_A3,
        MOCK_TEMPLATES_A3, MOCK_CLASSES_A3, MOCK_ATTENDANCE_A3,
        MOCK_FINANCES_A3, MOCK_CALENDAR_A3, MOCK_CHAT_A3, MOCK_PRODUCTS_A3,
      );
      foundUser = MOCK_USERS_A3.find((u: any) => u.id === 'a3_student_user_1') as any;
    }

    if (!foundUser) {
      showNotification("E-mail ou senha incorretos.", 'error');
      return;
    }

    if (foundUser.status === 'Pending' && foundUser.role !== 'admin' && foundUser.role !== 'superuser') {
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
    
    if (!acceptedTerms) {
      showNotification("Você precisa aceitar os Termos de Responsabilidade.", 'error');
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
    StorageService.saveUsers([user], academyId);
    onLogin(user, academy);
  };

  const handleRegisterStudent = () => {
    if (!acceptedTerms) {
      showNotification("Você precisa aceitar os Termos de Responsabilidade.", 'error');
      return;
    }

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

    const currentStudents = StorageService.getStudents(studentData.academyId);
    StorageService.saveStudents([...currentStudents, newStudent], studentData.academyId);
    
    const currentUsers = StorageService.getUsers(studentData.academyId);
    StorageService.saveUsers([...currentUsers, newUser], studentData.academyId);

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

    const currentInstructors = StorageService.getInstructors(instructorData.academyId);
    StorageService.saveInstructors([...currentInstructors, newInst], instructorData.academyId);
    
    const currentUsers = StorageService.getUsers(instructorData.academyId);
    StorageService.saveUsers([...currentUsers, newUser], instructorData.academyId);

    notifyAdmins('instructor', newInst.name, `Unidade: ${StorageService.getAcademyById(instructorData.academyId!)?.name || 'N/A'}, Especialidade: ${newInst.specialties || 'Geral'}`, instructorData.academyId!);
    showNotification("Ficha Técnica enviada! Aguarde aprovação. OSS!");
    setView('login');
  };

  const handleRegisterStaff = () => {
    if (!acceptedTerms) {
      showNotification("Você precisa aceitar os Termos de Responsabilidade.", 'error');
      return;
    }

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

    const currentStaff = StorageService.getStaff(staffData.academyId);
    StorageService.saveStaff([...currentStaff, newStaff], staffData.academyId);
    
    const currentUsers = StorageService.getUsers(staffData.academyId);
    StorageService.saveUsers([...currentUsers, newUser], staffData.academyId);

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
    <div className="min-h-[100dvh] h-[100dvh] overflow-y-auto bg-slate-900 flex flex-col items-center justify-start py-8 px-4 transition-colors relative custom-scrollbar">
      <div className="w-full max-w-5xl space-y-8 py-10">
        
        {/* Header Comum */}
        {(view === 'login' || view === 'choice') && (
          <div className="text-center animate-in fade-in duration-700">
            {linkedAcademy ? (
              <>
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-4">NEXDOJO</p>
                <div className="inline-flex items-center justify-center w-28 h-28 bg-indigo-600 rounded-[32px] mb-6 shadow-2xl shadow-indigo-600/30 overflow-hidden ring-4 ring-slate-800/50">
                  {linkedAcademy.logo ? (
                    <img src={linkedAcademy.logo} alt={linkedAcademy.name} className="w-full h-full object-contain p-2" />
                  ) : (
                    <Award className="text-white" size={40} />
                  )}
                </div>
                <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic leading-none">{linkedAcademy.name}</h1>
                <p className="text-slate-400 mt-3 font-bold text-xs uppercase tracking-[0.3em] opacity-80">{t.legacyContinues}</p>
              </>
            ) : (
              <>
                <div className="inline-flex items-center justify-center w-28 h-28 bg-indigo-600 rounded-[32px] mb-6 shadow-2xl shadow-indigo-600/30 overflow-hidden ring-4 ring-slate-800/50">
                  <Trophy className="text-white" size={40} />
                </div>
                <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic leading-none">NEXDOJO</h1>
                <p className="text-slate-400 mt-3 font-bold text-xs uppercase tracking-[0.3em] opacity-80">{t.legacyContinues}</p>
              </>
            )}
          </div>
        )}

        {/* VIEW: LOGIN */}
        {view === 'login' && (
          <div className="max-w-md mx-auto space-y-6 w-full pb-10">
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 flex items-start gap-3">
              <div className="bg-amber-500/20 p-2 rounded-xl"><Info className="text-amber-500" size={20} /></div>
              <div>
                <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">{t.demoMode}</p>
                <p className="text-xs text-slate-400 mt-1 italic">{t.demoCredentials}</p>
              </div>
            </div>

            <form onSubmit={handleLogin} className="bg-white dark:bg-slate-900 rounded-[40px] p-8 md:p-10 shadow-2xl space-y-6 animate-in fade-in zoom-in duration-300">
              <h2 className="text-2xl font-black text-slate-800 dark:text-white text-center tracking-tight">{t.accessPortal}</h2>
              <div className="space-y-4">
                <Input label="E-mail" type="email" value={email} onChange={setEmail} placeholder="professor@oss.com" icon={<Mail size={18} />} />
                <Input label="Senha" type="password" value={password} onChange={setPassword} placeholder="••••••••" icon={<Lock size={18} />} />
              </div>
              <button type="submit" className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 active:scale-95">
                {t.enterMat} <ArrowRight size={20} />
              </button>
              <div className="pt-2 flex flex-col items-center gap-3">
                <button type="button" onClick={() => setView('forgot-password')} className="text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors">{t.forgotPasswordLabel}</button>
                <button type="button" onClick={() => setView('choice')} className="text-sm font-bold text-indigo-600 hover:text-indigo-400 transition-colors">{t.newHereSignUp}</button>
              </div>
            </form>
          </div>
        )}

        {/* VIEW: FORGOT PASSWORD */}
        {view === 'forgot-password' && (
          <div className="max-w-md mx-auto space-y-6 animate-in fade-in zoom-in duration-300">
            <button onClick={() => { setView('login'); setForgotStep(1); }} className="text-white flex items-center gap-2 mb-4 hover:text-indigo-400 transition-colors font-bold text-xs uppercase tracking-[0.2em]">
              <ChevronLeft size={18} /> {t.backToLogin}
            </button>
            
            <div className="bg-white dark:bg-slate-900 rounded-[40px] p-8 md:p-10 shadow-2xl space-y-6">
              {forgotStep === 1 ? (
                <>
                  <div className="text-center space-y-2">
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">{t.createOrRecoverPassword}</h2>
                    <p className="text-sm text-slate-400 font-medium leading-relaxed">{t.enterRegisteredEmail}</p>
                  </div>

                  <div className="space-y-4">
                    <Input 
                      label="E-mail Cadastrado" 
                      type="email" 
                      value={forgotEmail} 
                      onChange={setForgotEmail} 
                      placeholder="seu@email.com" 
                      icon={<Mail size={18} />} 
                    />
                  </div>

                  <button 
                    onClick={() => {
                      if (!forgotEmail) {
                        showNotification(t.enterEmailPlease, 'error');
                        return;
                      }

                      const allUsers = StorageService.getUsers();
                      const user = allUsers.find(u => u.email.toLowerCase() === forgotEmail.toLowerCase());

                      if (!user) {
                        showNotification(t.emailNotFound, 'error');
                        return;
                      }

                      setForgotStep(2);
                      showNotification(t.emailValidated);
                    }} 
                    className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    {t.validateEmail} <ArrowRight size={20} />
                  </button>
                </>
              ) : (
                <>
                  <div className="text-center space-y-2">
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">{t.setPasswordTitle}</h2>
                    <p className="text-sm text-slate-400 font-medium leading-relaxed">{t.createStrongPassword}</p>
                  </div>

                  <div className="space-y-4">
                    <Input 
                      label="Nova Senha" 
                      type="password" 
                      value={newPassword} 
                      onChange={setNewPassword} 
                      placeholder="••••••••" 
                      icon={<Lock size={18} />} 
                    />
                    <Input 
                      label="Confirmar Senha" 
                      type="password" 
                      value={confirmPassword} 
                      onChange={setConfirmPassword} 
                      placeholder="••••••••" 
                      icon={<CheckCircle2 size={18} />} 
                    />
                  </div>

                  <button 
                    onClick={() => {
                      if (newPassword.length < 4) {
                        showNotification(t.passwordTooShort, 'error');
                        return;
                      }
                      if (newPassword !== confirmPassword) {
                        showNotification(t.passwordsMismatch, 'error');
                        return;
                      }

                      const allUsers = StorageService.getUsers();
                      const updatedUsers = allUsers.map(u => 
                        u.email.toLowerCase() === forgotEmail.toLowerCase() 
                          ? { ...u, password: newPassword } 
                          : u
                      );
                      
                      // Salvar em todas as academias (mock generalizado) ou na específica
                      const user = allUsers.find(u => u.email.toLowerCase() === forgotEmail.toLowerCase());
                      if (user) {
                        StorageService.saveUsers(updatedUsers, user.academyId);
                      }
                      
                      showNotification(t.passwordSetSuccess);
                      setView('login');
                      setForgotStep(1);
                      setEmail(forgotEmail);
                      setPassword(newPassword);
                    }} 
                    className="w-full py-5 bg-green-600 hover:bg-green-500 text-white font-black rounded-2xl shadow-xl shadow-green-600/20 transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    {t.saveAndEnter} <Trophy size={20} />
                  </button>
                </>
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
            <div className={`grid grid-cols-1 ${isFromSharedLink ? 'sm:grid-cols-2' : 'sm:grid-cols-3'} gap-4`}>
              {!isFromSharedLink && <ChoiceCard icon={<Trophy size={28} />} title="Nova Academia" desc="Para instrutores e gestores." onClick={() => setView('signup-academy')} />}
              <ChoiceCard icon={<Users size={28} />} title="Sou Aluno" desc="Fazer matrícula agora." onClick={() => setView('signup-student')} />
              <ChoiceCard icon={<Award size={28} />} title="Sou Instrutor" desc="Ficha técnica do instrutor." onClick={() => setView('signup-instructor')} />
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

              <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-4">
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

            <button type="submit" className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-transform">Finalizar Cadastro</button>
          </form>
        )}

        {/* VIEW: SIGNUP STUDENT */}
        {view === 'signup-student' && (
          <div className="bg-white dark:bg-slate-900 rounded-[40px] p-6 md:p-12 shadow-2xl space-y-10 animate-in slide-in-from-bottom duration-500 pb-40">
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
                    {StorageService.getAcademyById(studentData.academyId!)?.logo ? (
                      <img src={StorageService.getAcademyById(studentData.academyId!)?.logo} className="w-full h-full object-contain p-1.5" />
                    ) : (
                      <Award size={20} className="text-indigo-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1">Você está se matriculando na:</p>
                    <p className="text-sm font-black text-indigo-600 uppercase italic tracking-tight">{StorageService.getAcademyById(studentData.academyId!)?.name || 'Academia Selecionada'}</p>
                  </div>
                </div>
                <div className="bg-indigo-600 text-white p-1 rounded-full px-2 text-[8px] font-black uppercase tracking-tighter shadow-sm">Ativo</div>
              </div>
            )}

            <div className="space-y-12">
              <div className="flex flex-col items-center gap-4">
                <div onClick={() => photoRef.current?.click()} className="w-40 h-40 rounded-[40px] bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 overflow-hidden relative group cursor-pointer shadow-inner">
                  {studentData.photo ? <img src={studentData.photo} className="w-full h-full object-cover" /> : <div className="w-full h-full flex flex-col items-center justify-center text-slate-400"><Camera size={40} /><span className="text-[10px] font-black uppercase tracking-widest mt-2">Sua Foto</span></div>}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"><Camera size={24} /></div>
                </div>
                <input type="file" ref={photoRef} className="hidden" accept="image/*" onChange={e => handlePhotoUpload(e, 'student')} />
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
                      value={studentData.gender || 'M'} 
                      onChange={e => setStudentData({...studentData, gender: e.target.value as any})}
                      className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none text-slate-800 dark:text-white transition-all font-bold text-sm"
                    >
                      <option value="M">Masculino</option>
                      <option value="F">Feminino</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                  <Input label="Data de Nascimento" required type="date" value={studentData.birthDate || ''} onChange={v => setStudentData({...studentData, birthDate: v})} />
                  <Input label="E-mail (Para Login)" required type="email" value={studentData.email || ''} onChange={v => setStudentData({...studentData, email: v})} placeholder="seu@email.com" />
                  <div className="md:col-span-1">
                    <Input label="Definir Senha" required type="password" value={regPassword} onChange={setRegPassword} placeholder="••••••••" icon={<Lock size={18} />} />
                  </div>
                  <div className="md:col-span-1">
                    <Input label="Confirmar Senha" required type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="••••••••" icon={<Lock size={18} />} />
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
                <div className="space-y-4">
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                    {[Belt.WHITE, Belt.GREY, Belt.YELLOW, Belt.ORANGE, Belt.GREEN, Belt.BLUE, Belt.PURPLE, Belt.BROWN, Belt.BLACK].map(b => (
                      <button key={b} onClick={() => setStudentData({...studentData, belt: b, stripes: 0})} className={`py-4 rounded-2xl border-2 font-black text-[10px] uppercase transition-all ${studentData.belt === b ? `${BELT_COLORS[b]} scale-105 shadow-lg` : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-400'}`}>{b}</button>
                    ))}
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Graus na Faixa</label>
                    <div className={`flex items-center justify-between border-2 transition-all rounded-2xl px-5 py-4 shadow-inner ${BELT_COLORS[studentData.belt || Belt.WHITE]}`}>
                      <button type="button" onClick={() => setStudentData({...studentData, stripes: Math.max(0, (studentData.stripes || 0) - 1)})} className="text-white/50 hover:scale-125 transition-all outline-none md:p-2"><Minus size={20} /></button>
                      <div className={`flex gap-1.5 p-1 rounded-md px-3 bg-opacity-90 ${studentData.belt === Belt.BLACK ? 'bg-red-600' : 'bg-zinc-900 shadow-lg'}`}>
                        {[...Array(studentData.belt === Belt.BLACK ? 6 : 4)].map((_, i) => (
                          <div 
                            key={i} 
                            className={`w-3 h-8 rounded-sm border transition-all ${i < (studentData.stripes || 0) ? 'bg-white border-white/20 shadow-md' : 'bg-white/10 border-transparent'}`} 
                          />
                        ))}
                      </div>
                      <button type="button" onClick={() => setStudentData({...studentData, stripes: Math.min(studentData.belt === Belt.BLACK ? 6 : 4, (studentData.stripes || 0) + 1)})} className="text-white/50 hover:scale-125 transition-all outline-none md:p-2"><Plus size={20} /></button>
                    </div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-4 italic">
                      {studentData.belt === Belt.BLACK ? 'Faixa preta possui até 6 graus.' : 'Faixas coloridas possuem até 4 graus.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <SectionHeader icon={<Heart size={16} />} title="Saúde e Observações" />
                <textarea value={studentData.medicalNotes || ''} onChange={e => setStudentData({...studentData, medicalNotes: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 outline-none text-sm min-h-[120px] text-slate-700 dark:text-white" placeholder="Possui alguma lesão ou condição especial?" />
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-4">
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

              <button onClick={handleRegisterStudent} className="w-full py-6 bg-indigo-600 text-white font-black rounded-3xl shadow-2xl shadow-indigo-600/30 text-xl active:scale-95 transition-transform">CONCLUIR MATRÍCULA OSS!</button>
            </div>
          </div>
        )}

        {/* VIEW: SIGNUP INSTRUCTOR */}
        {view === 'signup-instructor' && (
          <div className="bg-white dark:bg-slate-900 rounded-[40px] p-6 md:p-12 shadow-2xl space-y-10 animate-in slide-in-from-bottom duration-500 pb-40">
            <header className="flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 py-4 z-20 border-b dark:border-slate-800 -mx-6 md:-mx-12 px-6 md:px-12">
              <div className="flex items-center gap-4">
                <div className="bg-slate-900 dark:bg-slate-800 p-3 rounded-2xl text-white shadow-lg"><Award size={28} /></div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Ficha do Instrutor</h2>
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
                    {StorageService.getAcademyById(instructorData.academyId!)?.logo ? (
                      <img src={StorageService.getAcademyById(instructorData.academyId!)?.logo} className="w-full h-full object-contain p-1.5" />
                    ) : (
                      <Trophy size={20} className="text-white" />
                    )}
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Vínculo Profissional com:</p>
                    <p className="text-sm font-black text-white uppercase italic tracking-tight">{StorageService.getAcademyById(instructorData.academyId!)?.name || 'Academia Selecionada'}</p>
                  </div>
                </div>
                <div className="bg-emerald-500 text-white p-1 rounded-full px-2 text-[8px] font-black uppercase tracking-tighter shadow-sm">Confirmado</div>
              </div>
            )}

            <div className="space-y-12">
              <div className="flex flex-col items-center gap-4">
                <div onClick={() => photoRef.current?.click()} className="w-40 h-40 rounded-[40px] bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 overflow-hidden relative group cursor-pointer shadow-inner">
                  {instructorData.photo ? <img src={instructorData.photo} className="w-full h-full object-cover" /> : <div className="w-full h-full flex flex-col items-center justify-center text-slate-400"><Camera size={40} /><span className="text-[10px] font-black uppercase tracking-widest mt-2">Sua Foto</span></div>}
                </div>
                <input type="file" ref={photoRef} className="hidden" accept="image/*" onChange={e => handlePhotoUpload(e, 'instructor')} />
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
                      value={instructorData.gender || 'M'} 
                      onChange={e => setInstructorData({...instructorData, gender: e.target.value as any})}
                      className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none text-slate-800 dark:text-white transition-all font-bold text-sm"
                    >
                      <option value="M">Masculino</option>
                      <option value="F">Feminino</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                  <Input label="Data de Nascimento" required type="date" value={instructorData.birthDate || ''} onChange={v => setInstructorData({...instructorData, birthDate: v})} />
                  <Input label="E-mail (Para Login)" required type="email" value={instructorData.email || ''} onChange={v => setInstructorData({...instructorData, email: v})} placeholder="mestre@ct.com" />
                  <div className="md:col-span-1">
                    <Input label="Definir Senha" required type="password" value={regPassword} onChange={setRegPassword} placeholder="••••••••" icon={<Lock size={18} />} />
                  </div>
                  <div className="md:col-span-1">
                    <Input label="Confirmar Senha" required type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="••••••••" icon={<Lock size={18} />} />
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
                        <button key={b} onClick={() => setInstructorData({...instructorData, belt: b, stripes: 0})} className={`py-4 rounded-2xl border-2 font-black text-[10px] uppercase transition-all ${instructorData.belt === b ? `${BELT_COLORS[b]} scale-105 shadow-lg` : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-400'}`}>{b}</button>
                      ))}
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 mt-4">
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
                    <Input label="Data da Última Graduação" type="date" value={instructorData.lastGraduationDate || ''} onChange={v => setInstructorData({...instructorData, lastGraduationDate: v})} />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-4">
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

              <button onClick={handleRegisterInstructor} className="w-full py-6 bg-slate-900 dark:bg-slate-800 text-white font-black rounded-3xl shadow-2xl text-xl active:scale-95 transition-transform border border-slate-700">ENVIAR FICHA TÉCNICA OSS!</button>
            </div>
          </div>
        )}

        {/* Modal de Termos */}
        {showTermsModal && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[3000] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[40px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in duration-300">
              <div className="p-8 border-b dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-600 rounded-2xl text-white">
                    <ShieldCheck size={28} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight italic">Termos e Condições</h3>
                </div>
                <button onClick={() => setShowTermsModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-8 overflow-y-auto custom-scrollbar prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-400 text-sm leading-relaxed space-y-6">
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

              <div className="p-8 bg-slate-50 dark:bg-slate-800/50 border-t dark:border-slate-800">
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
  <button onClick={onClick} className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 text-left hover:scale-105 hover:shadow-2xl transition-all group border-b-8 border-b-transparent hover:border-b-indigo-500">
    <div className="bg-indigo-50 dark:bg-indigo-900/20 w-16 h-16 rounded-2xl flex items-center justify-center text-indigo-600 mb-8 group-hover:bg-indigo-600 group-hover:text-white transition-colors">{icon}</div>
    <h3 className="font-black text-slate-800 dark:text-white text-xl tracking-tighter mb-2">{title}</h3>
    <p className="text-sm text-slate-400 dark:text-slate-500 font-medium leading-relaxed">{desc}</p>
  </button>
);

const Input: React.FC<{ label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; icon?: React.ReactNode; inputMode?: any; required?: boolean }> = ({ label, value, onChange, type = 'text', placeholder, icon, inputMode, required }) => {
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
