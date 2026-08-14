
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import jsQR from 'jsqr';
import { Academy, Student, Belt, CalendarEvent, User, Instructor, Staff, ClassTemplate, SystemPlan, SystemConfig } from '../types';
import { useTranslation } from '../services/LanguageContext';
import { studentService } from '@/features/students/services/studentService';
import { instructorService } from '@/features/instructors/services/instructorService';
import { staffService } from '@/features/staff/services/staffService';
import { templateService } from '@/features/schedules/services/templateService';
import { attendanceService } from '@/features/attendance/services/attendanceService';
import { financeService } from '@/features/finances/services/financeService';
import { calendarService } from '@/features/calendar/services/calendarService';
import { chatService } from '@/features/chat/services/chatService';
import { academyService } from '@/features/settings/services/academyService';
import { PrivacyValue } from '../components/PrivacyValue';
import { calculateAge, getNextRank, isReadyForGraduationByBeltRank, getGraduationProgressByBeltRank, isCloseToGraduationByBeltRank, BELT_LIST } from '../services/graduation';
import { useAcademyBeltRanks } from '@/features/settings/hooks/useAcademyBeltRanks';
import {
  Users,
  TrendingUp,
  AlertTriangle,
  Clock,
  ChevronRight,
  Search,
  ShieldAlert,
  GraduationCap,
  Activity,
  Trophy,
  Medal,
  Award,
  Star,
  Calendar as CalendarIcon,
  AlertCircle,
  UserCheck,
  X as XIcon,
  Plus,
  Wallet,
  CreditCard,
  CheckCircle2,
  Trash2,
  MessageSquare,
  ShieldCheck,
  Zap,
  X,
  Calendar,
  Share2,
  Smartphone,
  Copy,
  Eye,
  EyeOff,
  Lock,
  Loader2,
  KeyRound,
  Shirt
} from 'lucide-react';
import { authService } from '@/features/auth/services/authService';
import { StorageService } from '../services/storage';
import { advancePaymentDate } from '@/utils/paymentUtils';
import { getTodayBrasilia } from '@/utils/date';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { BeltBadge } from '../components/BeltBadge';
import { getBeltClassName } from '../constants';
import { DateSelectInput, ConfirmDialog, Spinner } from '@/components/ui';
import { QRCodeSVG } from 'qrcode.react';
import { useProfileStore, getActiveProfile } from '@/stores/profileStore';


const DashboardView: React.FC<{ academy: Academy | null; user: User; onSwitchAcademy?: (a: Academy) => void }> = ({ academy, user, onSwitchAcademy }) => {
  const { t, language, showNotification } = useTranslation();
  const { getBeltConfig } = useAcademyBeltRanks(academy?.id);
  const [students, setStudents] = React.useState<Student[]>([]);
  const [instructors, setInstructors] = React.useState<Instructor[]>([]);
  const [staff, setStaff] = React.useState<Staff[]>([]);
  const [users, setUsers] = React.useState<User[]>([]);
  const [templates, setTemplates] = React.useState<ClassTemplate[]>([]);
  const [attendance, setAttendance] = React.useState<any[]>([]);
  const [finances, setFinances] = React.useState<any[]>([]);
  const [calendarEvents, setCalendarEvents] = React.useState<CalendarEvent[]>([]);
  const [chatMessages, setChatMessages] = React.useState<any[]>([]);
  const [allAcademies, setAllAcademies] = React.useState<Academy[]>([]);
  const [sessions, setSessions] = React.useState<any[]>([]);
  const [_isLoading, setIsLoading] = React.useState(true);
  const [selectedPending, setSelectedPending] = React.useState<{ user: User; details: any } | null>(null);
  const [lastReadChat, setLastReadChat] = React.useState<string>(academy ? localStorage.getItem(`oss_chat_last_read_${academy.id}`) || '' : '');
  const { profiles: switcherProfiles, activeProfileId } = useProfileStore();
  const activeProfile = getActiveProfile(switcherProfiles, activeProfileId);
  // Responsável gerenciando um dependente-aluno: vale independente do role da própria
  // conta (ex.: instrutor que também é responsável por um filho aluno).
  const isViewingDependentProfile = activeProfile?.kind === 'guardian' && activeProfile.entityType === 'student';

  React.useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        if (academy) {
          // GET /transactions responde 403 para role='guardian' sem studentId (a API bloqueia
          // responsável de ver o financeiro geral da academia — só o de um aluno vinculado
          // específico). Como estava dentro do mesmo Promise.all, essa única rejeição derrubava
          // TODAS as outras buscas (inclusive a lista de alunos), fazendo a dashboard do
          // dependente cair no perfil padrão (dados da própria conta do responsável).
          const isGuardian = (user.role as string) === 'guardian';
          const [
            studentsRes,
            instructorsRes,
            staffRes,
            templatesRes,
            attendanceRes,
            financesRes,
            calendarRes,
            chatRes,
            sessionsRes,
          ] = await Promise.all([
            studentService.getAll(academy.id, { limit: 1000 }),
            instructorService.getAll(academy.id, { limit: 1000 }),
            staffService.getAll(academy.id, { limit: 1000 }),
            templateService.getAll(academy.id, { limit: 1000 }),
            attendanceService.getRecords(academy.id, { limit: 1000 }),
            isGuardian ? Promise.resolve({ data: [] }) : financeService.getAll(academy.id, { limit: 1000 }),
            calendarService.getEvents(academy.id, { limit: 1000 }),
            chatService.getMessages(academy.id, { limit: 100 }),
            attendanceService.getSessions(academy.id, { limit: 100 }),
          ]);
          setStudents(studentsRes.data);
          setInstructors(instructorsRes.data);
          setStaff(staffRes.data);
          setTemplates(templatesRes.data);
          setAttendance(attendanceRes.data);
          setFinances(financesRes.data);
          setCalendarEvents(calendarRes.data);
          setChatMessages(chatRes.data);
          setSessions(sessionsRes.data);
          setLastReadChat(localStorage.getItem(`oss_chat_last_read_${academy.id}`) || '');
        }
        if (user.role === 'superuser') {
          const academiesRes = await academyService.getAll();
          setAllAcademies(Array.isArray(academiesRes) ? academiesRes : []);
        }
      } catch (err) {
        console.error('Erro ao carregar dados do dashboard:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [academy?.id, user.role]);
  
  const hasNewMessages = useMemo(() => {
    const visibleMessages = user.role === 'student'
      ? chatMessages.filter(m => m.senderId !== 'system')
      : chatMessages;
    if (visibleMessages.length === 0) return false;
    const latestTimestamp = visibleMessages[visibleMessages.length - 1].timestamp;
    return latestTimestamp > lastReadChat;
  }, [chatMessages, lastReadChat, user.role]);

  const getBeltColor = (belt: Belt) => {
    switch (belt) {
      case Belt.WHITE: return 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-200 dark:border-slate-700';
      case Belt.GREY: return 'bg-slate-400 text-white border-slate-500';
      case Belt.YELLOW: return 'bg-yellow-400 text-slate-900 dark:text-white border-yellow-500';
      case Belt.ORANGE: return 'bg-orange-500 text-white border-orange-600';
      case Belt.GREEN: return 'bg-green-600 text-white border-green-700';
      case Belt.BLUE: return 'bg-blue-600 text-white border-blue-400';
      case Belt.PURPLE: return 'bg-purple-700 text-white border-purple-500';
      case Belt.BROWN: return 'bg-amber-900 text-white border-amber-800';
      case Belt.BLACK: return 'bg-slate-950 text-white border-slate-800';
      case Belt.CORAL: return 'bg-gradient-to-r from-red-600 to-slate-900 text-white border-red-700';
      case Belt.RED: return 'bg-red-700 text-white border-red-800';
      default: return 'bg-indigo-600 text-white border-indigo-400';
    }
  };

  const getBeltTheme = (belt: Belt) => {
    switch (belt) {
      case Belt.WHITE: return { text: 'text-slate-400', bg: 'bg-slate-400', border: 'border-slate-100 dark:border-slate-700/50', shadow: 'shadow-slate-100' };
      case Belt.GREY: return { text: 'text-slate-500', bg: 'bg-slate-500', border: 'border-slate-100 dark:border-slate-700/50', shadow: 'shadow-slate-200' };
      case Belt.YELLOW: return { text: 'text-yellow-500', bg: 'bg-yellow-500', border: 'border-yellow-100', shadow: 'shadow-yellow-100' };
      case Belt.ORANGE: return { text: 'text-orange-500', bg: 'bg-orange-500', border: 'border-orange-100', shadow: 'shadow-orange-100' };
      case Belt.GREEN: return { text: 'text-green-600', bg: 'bg-green-600', border: 'border-green-100', shadow: 'shadow-green-100' };
      case Belt.BLUE: return { text: 'text-blue-600', bg: 'bg-blue-600', border: 'border-blue-100', shadow: 'shadow-blue-100' };
      case Belt.PURPLE: return { text: 'text-purple-700', bg: 'bg-purple-700', border: 'border-purple-100', shadow: 'shadow-purple-100' };
      case Belt.BROWN: return { text: 'text-amber-800', bg: 'bg-amber-800', border: 'border-amber-100', shadow: 'shadow-amber-100' };
      case Belt.BLACK: return { text: 'text-slate-900 dark:text-slate-100', bg: 'bg-slate-900', border: 'border-slate-800', shadow: 'shadow-slate-900/10' };
      case Belt.CORAL: return { text: 'text-red-600', bg: 'bg-red-600', border: 'border-red-100', shadow: 'shadow-red-100' };
      case Belt.RED: return { text: 'text-red-700', bg: 'bg-red-700', border: 'border-red-100', shadow: 'shadow-red-100' };
      default: return { text: 'text-indigo-600', bg: 'bg-indigo-600', border: 'border-indigo-100', shadow: 'shadow-indigo-100' };
    }
  };

  const pendingUsers = useMemo(() => users.filter(u => u.status === 'Pending'), [users]);

  const planExpiration = useMemo(() => {
    if (!academy || !academy.planExpirationDate) return null;
    const exp = new Date(academy.planExpirationDate + 'T23:59:59');
    const today = new Date();
    const diff = exp.getTime() - today.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return { days, date: academy.planExpirationDate };
  }, [academy?.planExpirationDate]);

  const handleApprove = async (pendingUser: User) => {
    try {
      if (pendingUser.role === 'instructor') {
        const found = instructors.find(i => i.email === pendingUser.email);
        if (!found) throw new Error('Instrutor não encontrado.');
        const updated = await instructorService.update(found.id, { status: 'Active' } as any);
        setInstructors(prev => prev.map(i => i.id === updated.id ? updated : i));
      } else if (pendingUser.role === 'student') {
        const found = students.find(s => s.email === pendingUser.email);
        if (!found) throw new Error('Aluno não encontrado.');
        const updated = await studentService.update(found.id, { status: 'Active' } as any);
        setStudents(prev => prev.map(s => s.id === updated.id ? updated : s));
      } else if (pendingUser.role === 'staff') {
        const found = staff.find(st => st.email === pendingUser.email);
        if (!found) throw new Error('Staff não encontrado.');
        const updated = await staffService.update(found.id, { status: 'Active' } as any);
        setStaff(prev => prev.map(st => st.id === updated.id ? updated : st));
      }
      setUsers(prev => prev.map(u => u.id === pendingUser.id ? { ...u, status: 'Active' as const } : u));
      showNotification(`${pendingUser.name} aprovado com sucesso!`);
    } catch (e: any) {
      console.error(e);
      showNotification(e?.message || 'Erro ao aprovar cadastro. Tente novamente.', 'error');
    }
  };

  const handleReject = async (pendingUser: User) => {
    setUsers(prev => prev.filter(u => u.id !== pendingUser.id));

    if (pendingUser.role === 'instructor') {
      const found = instructors.find(i => i.email === pendingUser.email);
      if (found) {
        try { await instructorService.delete(found.id); } catch {}
        setInstructors(prev => prev.filter(i => i.email !== pendingUser.email));
      }
    } else if (pendingUser.role === 'student') {
      const found = students.find(s => s.email === pendingUser.email);
      if (found) {
        try { await studentService.delete(found.id); } catch {}
        setStudents(prev => prev.filter(s => s.email !== pendingUser.email));
      }
    } else if (pendingUser.role === 'staff') {
      const found = staff.find(st => st.email === pendingUser.email);
      if (found) {
        try { await staffService.delete(found.id); } catch {}
        setStaff(prev => prev.filter(st => st.email !== pendingUser.email));
      }
    }

    if (selectedPending?.user.id === pendingUser.id) setSelectedPending(null);
  };

  const openDetails = (pendingUser: User) => {
    let details = null;
    if (pendingUser.role === 'instructor') {
      details = instructors.find(i => i.email === pendingUser.email);
    } else {
      details = students.find(s => s.email === pendingUser.email) || staff.find(st => st.email === pendingUser.email);
    }
    setSelectedPending({ user: pendingUser, details });
  };

  const todayStr = getTodayBrasilia();
  
  const upcomingOffDays = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(today.getDate() + 3);
    threeDaysFromNow.setHours(23, 59, 59, 999);

    return calendarEvents
      .filter(e => e.type === 'no-class')
      .filter(e => {
        const eventDate = new Date(e.date + 'T12:00:00');
        return eventDate >= today && eventDate <= threeDaysFromNow;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [calendarEvents]);

  const getEffectiveAbsenceLimit = (student: Student) => {
    if (student.absenceLimit) return student.absenceLimit;
    const studentTemplates = templates.filter(t => t.assignedStudentIds.includes(student.id));
    const classLimits = studentTemplates
      .map(t => t.absenceLimit)
      .filter((limit): limit is number => limit !== undefined && limit !== null);
    if (classLimits.length > 0) return Math.min(...classLimits);
    return academy?.absenceLimit || 3;
  };

  const growthData = useMemo(() => {
    if (!students || students.length === 0) return [];
    
    // Agrupar por mês de entrada
    const months: Record<string, number> = {};
    const last6Months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthYear = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      last6Months.push(monthYear);
      months[monthYear] = 0;
    }
    
    students.forEach(s => {
      if (s.createdAt) {
        const d = new Date(s.createdAt);
        const my = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
        if (months[my] !== undefined) {
          months[my]++;
        }
      }
    });

    return last6Months.map(month => ({
      name: month,
      alunos: months[month]
    }));
  }, [students]);

  const stats = useMemo(() => {
    const todaySessions = sessions.filter((c: any) => c.date && c.date.startsWith(todayStr));
    const onMatCount = todaySessions.filter((c: any) => c.status === 'In Progress').reduce((acc: number, c: any) => acc + (c.attendanceIds?.length || 0), 0);

    return {
      total: students.length,
      active: students.filter(s => s.status === 'Active').length,
      todayAttendance: attendance.filter((a: any) => a.date && a.date.startsWith(todayStr)).length,
      onMat: onMatCount,
      alerts: students.filter(s => s.absentCount >= getEffectiveAbsenceLimit(s)).length
    };
  }, [students, attendance, sessions, todayStr, templates]);

  const upcomingPayments = useMemo(() => {
    if (user.role !== 'admin') return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return students
      .filter(s => s.status === 'Active' && s.nextPaymentDate)
      .map(s => {
        const paymentDate = new Date(s.nextPaymentDate! + 'T12:00:00');
        paymentDate.setHours(0, 0, 0, 0);
        const diffDays = Math.round((paymentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const plan = academy?.plans?.find(p => p.id === s.planId);
        return { student: s, diffDays, price: plan?.price as number | undefined, planName: plan?.name as string | undefined };
      })
      .filter(({ diffDays, price }) => diffDays <= 30 && (price ?? 0) > 0)
      .sort((a, b) => a.diffDays - b.diffDays);
  }, [students, user.role, academy?.plans]);

  const [markingPaymentId, setMarkingPaymentId] = React.useState<string | null>(null);

  const markPaymentAsPaid = async (student: Student) => {
    if (!student.nextPaymentDate) return;
    const oldDueDate = student.nextPaymentDate;
    const plan = academy?.plans?.find((p: any) => p.id === student.planId);
    setMarkingPaymentId(student.id);
    try {
      const nextDate = advancePaymentDate(oldDueDate);
      const updated = await studentService.update(student.id, { nextPaymentDate: nextDate } as any);
      const newFinance = await financeService.create(academy!.id, {
        description: plan?.name ?? 'Mensalidade',
        amount: plan?.price ?? 0,
        type: 'income',
        category: 'Mensalidade',
        date: getTodayBrasilia(),
        paymentMethod: 'Admin',
        status: 'paid',
        studentId: student.id,
        dueDate: oldDueDate,
      });
      setStudents(prev => prev.map(s => s.id === updated.id ? updated : s));
      setFinances(prev => [...prev, newFinance]);
      showNotification(
        `Mensalidade de ${student.name} registrada. Próx. vencimento: ${new Date(nextDate + 'T12:00:00').toLocaleDateString('pt-BR')}`
      );
    } catch {
      showNotification('Erro ao registrar pagamento.', 'error');
    } finally {
      setMarkingPaymentId(null);
    }
  };

  const [refreshKey, setRefreshKey] = useState(0);
  const triggerRefresh = () => setRefreshKey(prev => prev + 1);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPass, setNewPass] = useState('');
  const [confirmNewPass, setConfirmNewPass] = useState('');
  const [showPassVisibility, setShowPassVisibility] = useState(false);
  const [isSavingPass, setIsSavingPass] = useState(false);

  // QR Check-in states
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [qrScanStatus, setQrScanStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [qrScanMessage, setQrScanMessage] = useState('');
  const [qrManualCode, setQrManualCode] = useState('');
  const [isQrCheckinLoading, setIsQrCheckinLoading] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const scanIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const stopQrCamera = () => {
    if (scanIntervalRef.current) { clearInterval(scanIntervalRef.current); scanIntervalRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
  };

  const closeQrScanner = () => {
    stopQrCamera();
    setShowQrScanner(false);
    setQrScanStatus('idle');
    setQrScanMessage('');
    setQrManualCode('');
  };

  const performQrCheckin = async (code: string) => {
    if (!code.trim() || isQrCheckinLoading) return;
    setIsQrCheckinLoading(true);
    stopQrCamera();
    try {
      await attendanceService.qrCheckin(code.trim(), isViewingDependentProfile ? studentProfile?.id : undefined);
      setQrScanStatus('success');
      setQrScanMessage('Presença registrada com sucesso! OSS!');
      // Recarrega presenças após check-in
      if (academy) {
        const attRes = await attendanceService.getRecords(academy.id, { limit: 1000 });
        setAttendance(attRes.data);
      }
    } catch (err: any) {
      setQrScanStatus('error');
      setQrScanMessage(err?.response?.data?.error || 'Código inválido ou presença já registrada.');
    } finally {
      setIsQrCheckinLoading(false);
    }
  };

  const startQrCamera = async () => {
    setQrScanStatus('scanning');
    setQrScanMessage('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // BarcodeDetector não existe em nenhum navegador iOS (WebKit nunca implementou a API),
      // então usamos jsQR (JS puro) como fallback universal de decodificação via canvas.
      const hasBarcodeDetector = 'BarcodeDetector' in window;
      // @ts-ignore
      const detector = hasBarcodeDetector ? new BarcodeDetector({ formats: ['qr_code'] }) : null;

      scanIntervalRef.current = setInterval(async () => {
        const video = videoRef.current;
        if (!video || video.readyState < 2) return;
        try {
          let code: string | null = null;
          if (detector) {
            const barcodes = await detector.detect(video);
            if (barcodes.length > 0) code = barcodes[0].rawValue;
          } else {
            const canvas = canvasRef.current;
            if (!canvas) return;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const result = jsQR(imageData.data, imageData.width, imageData.height);
            if (result?.data) code = result.data;
          }
          if (code) {
            clearInterval(scanIntervalRef.current!);
            scanIntervalRef.current = null;
            await performQrCheckin(code);
          }
        } catch {}
      }, 300);
    } catch (err: any) {
      setQrScanStatus('error');
      setQrScanMessage('Não foi possível acessar a câmera. Use o campo de texto abaixo.');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass.length < 6) {
      showNotification('A nova senha deve ter no mínimo 6 caracteres.', 'error');
      return;
    }
    if (newPass !== confirmNewPass) {
      showNotification('As senhas não coincidem.', 'error');
      return;
    }
    setIsSavingPass(true);
    try {
      await authService.changePassword(newPass);
      showNotification('Senha alterada com sucesso!');
      setShowPasswordModal(false);
      setNewPass('');
      setConfirmNewPass('');
    } catch (err: any) {
      showNotification(err?.response?.data?.error || 'Erro ao alterar senha.', 'error');
    } finally {
      setIsSavingPass(false);
    }
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h >= 4 && h < 12) return t.goodMorning;
    if (h >= 12 && h < 19) return t.goodAfternoon;
    return t.goodEvening;
  };

  const handleShare = async () => {
    const shareData = {
      title: 'OSS! - Gestão de Academia',
      text: 'Confira este sistema de gestão para academias de artes marciais!',
      url: window.location.origin,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.origin);
        showNotification(language === 'pt' ? 'Link copiado para a área de transferência!' : 'Link copied to clipboard!', 'success');
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  const globalStats = useMemo(() => {
    if (user.role !== 'superuser') return null;

    // Contagem por plano usando academias carregadas
    const plansCount = allAcademies.reduce((acc, a) => {
      const plan = a.currentPlan || 'Free';
      acc[plan] = (acc[plan] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      academiesCount: allAcademies.length,
      studentsCount: students.length,
      activeStudentsCount: students.filter(s => s.status === 'Active').length,
      todayAttendanceCount: attendance.filter((a: any) => a.date && a.date.startsWith(todayStr)).length,
      totalIncome: finances.filter((t: any) => t.type === 'income').reduce((acc: number, t: any) => acc + Number(t.amount), 0),
      totalMensalidades: finances.filter((t: any) => t.type === 'income' && (t.category === 'Mensalidade' || (t.description && t.description.toLowerCase().includes('mensalidade')))).reduce((acc: number, t: any) => acc + Number(t.amount), 0),
      totalExpense: finances.filter((t: any) => t.type === 'expense').reduce((acc: number, t: any) => acc + Number(t.amount), 0),
      plansCount,
      allAcademies
    };
  }, [user.role, todayStr, refreshKey, allAcademies, students, attendance, finances]);

  const [selectedAcademy, setSelectedAcademy] = React.useState<Academy | null>(null);
  const [isManageModalOpen, setIsManageModalOpen] = React.useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [aliasError, setAliasError] = useState('');
  const [academySearch, setAcademySearch] = React.useState('');
  const [isPlanEditModalOpen, setIsPlanEditModalOpen] = React.useState(false);
  const [editingPlan, setEditingPlan] = React.useState<SystemPlan | null>(null);
  
  const [systemConfig, setSystemConfig] = React.useState<SystemConfig>({
    plans: [
      { id: 'free', name: 'Free', price: 0, description: 'Grátis para sempre', features: ['Gestão Básica'], color: 'bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300' },
      { id: 'silver', name: 'Silver', price: 49.90, description: 'Ideal para academias pequenas', features: ['Alunos Ilimitados', 'Chamada Digital'], color: 'bg-slate-400 text-white' },
      { id: 'gold', name: 'Gold', price: 99.90, description: 'Para academias em crescimento', features: ['Financeiro Completo', 'Relatórios Avançados'], color: 'bg-yellow-400 text-slate-900 dark:text-white' },
      { id: 'blackbelt', name: 'Black Belt', price: 199.90, description: 'Para redes de academias', features: ['Multi-unidades', 'White-label'], color: 'bg-slate-950 text-white' },
    ]
  } as any);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: 'spring' as const, stiffness: 100 } }
  };

  const graduationAlerts = useMemo(() => {
    return students.filter(s => {
      const { readyForBelt, readyForStripe } = isReadyForGraduationByBeltRank(s, getBeltConfig(s.belt));
      return readyForBelt || readyForStripe;
    }).map(s => {
      const { readyForBelt } = isReadyForGraduationByBeltRank(s, getBeltConfig(s.belt));
      let type: 'STRIPE' | 'BELT' = readyForBelt ? 'BELT' : 'STRIPE';
      let message = readyForBelt ? 'Elegível para Próxima Faixa' : 'Elegível para Próximo Grau';
      return { ...s, alertType: type, alertMessage: message };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [students, getBeltConfig]);

  // Alunos "quase lá" (dentro da margem de aviso antecipado configurada por faixa),
  // mas ainda não elegíveis — ver PLANO_GRADUACAO.md. Complementa graduationAlerts (prontos).
  const closeToGraduationAlerts = useMemo(() => {
    return students
      .filter(s => isCloseToGraduationByBeltRank(s, getBeltConfig(s.belt)))
      .map(s => ({ ...s, progress: getGraduationProgressByBeltRank(s, getBeltConfig(s.belt)) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [students, getBeltConfig]);

  const currentMonthDay = useMemo(() => {
    const today = new Date();
    return `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  }, []);

  const studentBirthdaysToday = useMemo(() => {
    return students.filter(s => s.birthDate && s.birthDate.substring(5) === currentMonthDay);
  }, [students, currentMonthDay]);

  const instructorBirthdaysToday = useMemo(() => {
    return instructors.filter(i => i.birthDate && i.birthDate.substring(5) === currentMonthDay);
  }, [instructors, currentMonthDay]);

  const financialSummary = useMemo(() => {
    const currentYearMonth = todayStr.slice(0, 7);
    const currentMonthFinances = finances.filter(f => typeof f.date === 'string' && f.date.startsWith(currentYearMonth));
    const income = currentMonthFinances.filter(f => f.type === 'income').reduce((acc, f) => acc + Number(f.amount), 0);
    const expense = currentMonthFinances.filter(f => f.type === 'expense').reduce((acc, f) => acc + Number(f.amount), 0);
    const pendingIncome = currentMonthFinances.filter(f => f.type === 'income' && f.status === 'pending').reduce((acc, f) => acc + Number(f.amount), 0);
    return { income, expense, balance: income - expense, pendingIncome };
  }, [finances, todayStr]);

  const absenceAlerts = useMemo(() => {
    return students
      .filter(s => s.status === 'Active' && s.absentCount > 0)
      .map(s => ({
        ...s,
        effectiveLimit: getEffectiveAbsenceLimit(s)
      }))
      .sort((a, b) => b.absentCount - a.absentCount);
  }, [students, templates, academy?.id]);

  const recentActivity = useMemo(() => {
    return attendance
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5)
      .map(att => {
        const student = students.find(s => s.id === att.studentId);
        return {
          ...att,
          studentName: student?.name || 'Desconhecido',
          studentPhoto: student?.photo,
          studentBelt: student?.belt || Belt.WHITE,
          studentStripes: student?.stripes || 0
        };
      });
  }, [attendance, students]);

  const studentProfile = useMemo(() => {
    // Segue o dependente selecionado no "Alternar Perfil"; sem seleção, resolve por userId
    // (não por e-mail — evita pegar o aluno errado quando duas fichas compartilham o mesmo e-mail).
    if (isViewingDependentProfile) return students.find(s => s.id === activeProfile!.entityId) ?? null;
    if (user.role !== 'student') return null;
    return students.find((s: any) => s.userId === (user as any).id) ?? students.find(s => s.email === user.email) ?? null;
  }, [user, students, activeProfile, isViewingDependentProfile]);

  const monthlyClasses = useMemo(() => {
    if (!studentProfile) return 0;
    const currentYearMonth = todayStr.slice(0, 7);
    return attendance.filter(a =>
      a.studentId === studentProfile.id &&
      typeof a.date === 'string' && a.date.startsWith(currentYearMonth)
    ).length;
  }, [attendance, studentProfile, todayStr]);

  const instructorProfile = useMemo(() => {
    if (user.role === 'instructor') {
      return instructors.find((i: any) => i.userId === (user as any).id) ?? instructors.find(i => i.email === user.email) ?? null;
    }
    return null;
  }, [user, instructors]);

  const staffProfile = useMemo(() => {
    if (user.role === 'staff') {
      return staff.find((s: any) => s.userId === (user as any).id) ?? staff.find(s => s.email === user.email) ?? null;
    }
    return null;
  }, [user, staff]);

  if (!academy && user.role === 'superuser') {
    const sortedAcademies = [...allAcademies].sort((a, b) => a.name.localeCompare(b.name));
    
    return (
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-6xl mx-auto space-y-8 pb-24 p-2 sm:p-4"
      >
        <motion.header variants={itemVariants} className="flex flex-col items-center text-center space-y-4 pt-4">
           <div className="w-16 h-16 sm:w-20 sm:h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-indigo-600/20">
              <ShieldCheck size={32} className="sm:size-[40px]" />
           </div>
           <div className="space-y-1">
             <h1 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white uppercase italic tracking-tighter leading-tight">Gestão Master</h1>
             <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px] sm:text-xs">Acompanhamento Global • Ecossistema OSS!</p>
           </div>
           <button 
             onClick={handleShare}
             className="mt-4 flex items-center gap-2 bg-emerald-600 text-white px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer active:scale-95"
           >
             <Share2 size={14} />
             {language === 'pt' ? 'Compartilhar Sistema' : 'Share System'}
           </button>
        </motion.header>

        {globalStats && (
          <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={<Award size={22} className="text-indigo-600" />} label={t.unitInfo} value={globalStats.academiesCount} />
            <StatCard icon={<Users size={22} className="text-blue-600" />} label={t.totalStudents} value={globalStats.studentsCount} />
            <StatCard icon={<Wallet size={22} className="text-emerald-600" />} label="Rec. Mensalidades" value={new Intl.NumberFormat(language === 'pt' ? 'pt-BR' : 'en-US', { style: 'currency', currency: language === 'pt' ? 'BRL' : 'USD', maximumFractionDigits: 0 }).format(globalStats.totalMensalidades)} />
            <StatCard icon={<TrendingUp size={22} className="text-indigo-600" />} label="Receita Geral" value={new Intl.NumberFormat(language === 'pt' ? 'pt-BR' : 'en-US', { style: 'currency', currency: language === 'pt' ? 'BRL' : 'USD', maximumFractionDigits: 0 }).format(globalStats.totalIncome)} />
          </motion.div>
        )}

        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Selecione uma unidade</h2>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input 
                type="text"
                placeholder="Filtrar unidade..."
                value={academySearch}
                onChange={(e) => setAcademySearch(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl py-3 pl-10 pr-4 text-[10px] font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition-all"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
            {sortedAcademies
              .filter(a => a.name.toLowerCase().includes(academySearch.toLowerCase()) || a.ownerName.toLowerCase().includes(academySearch.toLowerCase()))
              .map(a => (
              <motion.button 
                variants={itemVariants}
                whileHover={{ scale: 1.02, y: -4 }}
                whileTap={{ scale: 0.98 }}
                key={a.id}
                onClick={() => onSwitchAcademy?.(a)}
                className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-[32px] sm:rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all group text-left w-full h-full cursor-pointer relative overflow-hidden"
              >
                 <div className="flex items-start justify-between mb-6">
                   <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600 group-hover:rotate-12 transition-transform overflow-hidden">
                      {a.logo ? <img src={a.logo} className="w-full h-full object-cover" /> : <Award size={24} />}
                   </div>
                   <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${a.planStatus === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                     {a.planStatus || 'Trial'}
                   </div>
                 </div>
                 <h3 className="font-black text-slate-800 dark:text-white uppercase italic text-lg leading-tight mb-2 group-hover:text-indigo-600 transition-colors">{a.name}</h3>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 leading-none">{a.ownerName}</p>
                 <div className="flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-2 text-indigo-600 font-black text-[9px] uppercase tracking-widest">
                       Acessar Painel <ChevronRight size={14} />
                    </div>
                    <span className="text-[9px] font-bold text-slate-300 uppercase">{a.currentPlan || 'Free'}</span>
                 </div>
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  if (!academy) return null;

  const handleUpdatePlan = (updates: Partial<SystemPlan>) => {

    if (!editingPlan) return;
    const updatedPlans = (systemConfig as any).plans.map((p: SystemPlan) => p.id === editingPlan.id ? { ...p, ...updates } : p);
    const newConfig = { ...systemConfig, plans: updatedPlans };
    setSystemConfig(newConfig as any);
    setEditingPlan(null);
    setIsPlanEditModalOpen(false);
  };

  const handleAliasChange = (val: string) => {
    const cleaned = val.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSelectedAcademy(prev => prev ? { ...prev, alias: cleaned } : prev);
    if (cleaned.length > 0 && cleaned.length < 3) {
      setAliasError('Mínimo 3 caracteres');
    } else if (cleaned.length >= 3) {
      const conflict = allAcademies.find(a => a.alias?.toLowerCase() === cleaned && a.id !== selectedAcademy?.id);
      setAliasError(conflict ? 'Este alias já está em uso por outra academia' : '');
    } else {
      setAliasError('');
    }
  };

  const handleUpdateAcademyStatus = async (academyId: string, updates: Partial<Academy>) => {
    try {
      await academyService.update(academyId, updates as any);
      setAllAcademies(prev => prev.map(a => a.id === academyId ? { ...a, ...updates } : a));
      const stored = StorageService.getAcademies();
      StorageService.saveAcademies(stored.map(a => a.id === academyId ? { ...a, ...updates } : a));
      if (academy?.id === academyId) {
        onSwitchAcademy?.({ ...academy, ...updates } as Academy);
      }
      showNotification('Academia atualizada com sucesso!');
    } catch (err: any) {
      console.error('Erro ao atualizar academia:', err);
      showNotification(err?.response?.data?.error || 'Erro ao salvar academia. Tente novamente.', 'error');
      return;
    }
    setIsManageModalOpen(false);
    setSelectedAcademy(null);
    setAliasError('');
    triggerRefresh();
  };

  const handleDeleteAcademy = async (academyId: string) => {
    try {
      await academyService.delete(academyId);
      setAllAcademies(prev => prev.filter(a => a.id !== academyId));
    } catch (err) {
      console.error('Erro ao excluir academia:', err);
    }
    setIsConfirmingDelete(false);
    setIsManageModalOpen(false);
    setSelectedAcademy(null);
    triggerRefresh();
  };


  if (user.role === 'student' || isViewingDependentProfile) {
    // Reaproveita o mesmo cálculo do memo `studentProfile` acima (já considera o dependente
    // selecionado no "Alternar Perfil" e resolve por userId, não por e-mail)
    const isViewingDependent = isViewingDependentProfile;
    const profileFound = studentProfile;

    // Enquanto os alunos da academia ainda estão carregando, não é possível saber se o dependente
    // será encontrado — mostrar o fallback (dados da própria conta logada) nesse meio-tempo faria
    // um responsável ver o próprio nome/e-mail piscando no lugar do filho. Aguarda carregar.
    if (isViewingDependent && !profileFound && _isLoading) {
      return (
        <div className="flex items-center justify-center h-full min-h-[300px]">
          <Spinner size="lg" className="text-indigo-500" />
        </div>
      );
    }

    // Perfil padrão caso não encontre nada (evita mostrar dados de outro aluno)
    const profile: any = profileFound || {
      name: user.name,
      belt: Belt.WHITE,
      stripes: 0,
      totalClasses: 0,
      totalHours: 0,
      absentCount: 0,
      email: user.email,
      status: 'Active',
      birthDate: '2000-01-01'
    };

    const paymentPlan = academy?.plans?.find((p: any) => p.id === profile.planId);
    const paymentAlertData = (() => {
      if (!profile.nextPaymentDate) return null;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const paymentDate = new Date(profile.nextPaymentDate + 'T12:00:00');
      paymentDate.setHours(0, 0, 0, 0);
      const diffDays = Math.round((paymentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 7) return null;
      if (!((paymentPlan?.price ?? 0) > 0)) return null;
      return { diffDays, price: paymentPlan?.price as number | undefined, planName: paymentPlan?.name as string | undefined };
    })();
    const beltConfig = getBeltConfig(profile.belt);
    const graduationProgress = getGraduationProgressByBeltRank(profile, beltConfig);
    const { readyForBelt: profileReadyForBelt, readyForStripe: profileReadyForStripe } = isReadyForGraduationByBeltRank(profile, beltConfig);
    const isReadyToGraduate = profileReadyForBelt || profileReadyForStripe;
    const graduationWarning = isCloseToGraduationByBeltRank(profile, beltConfig) && graduationProgress
      ? { remaining: Math.max(0, graduationProgress.target - graduationProgress.current), unit: graduationProgress.unit }
      : null;
    const studentNextRank = getNextRank(profile.belt, profile.stripes);

    return (
      <>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-8 pb-12 p-2"
      >
        <motion.header variants={itemVariants} className="px-2 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white tracking-tighter uppercase italic leading-none">
              {getGreeting()}, {(isViewingDependent ? profile.name : user.name).split(' ')[0]}!
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-bold mt-2 uppercase text-[10px] tracking-[0.2em]">{t.trainingJourney} {academy?.name}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {academy?.qrCodePresenca && (
              <button
                onClick={() => { setShowQrScanner(true); setQrScanStatus('idle'); }}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all shadow-lg shadow-emerald-600/20 cursor-pointer active:scale-95"
              >
                <UserCheck size={14} />
                <span>Registre sua Presença</span>
              </button>
            )}
            <button
              onClick={handleShare}
              className="flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2 rounded-2xl border border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:border-emerald-200 transition-all shadow-sm cursor-pointer"
            >
              <Share2 size={14} />
              <span className="hidden sm:inline">{language === 'pt' ? 'Compartilhar Sistema' : 'Share System'}</span>
            </button>
            <button
              onClick={() => setShowPasswordModal(true)}
              className="flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2 rounded-2xl border border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:border-slate-300 transition-all shadow-sm cursor-pointer"
            >
              <KeyRound size={14} />
              <span className="hidden md:inline">Alterar Senha</span>
            </button>
            <Link to="/profile" className="hidden md:flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2 rounded-2xl border border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:border-indigo-200 transition-all shadow-sm">
              Meus Dados
              <ChevronRight size={14} />
            </Link>
          </div>
        </motion.header>

        {/* KIMONO EMPRESTADO */}
        {academy?.kimonoLoanEnabled && !!profile.hasLoanedKimono && (
          <motion.div variants={itemVariants} className="px-2">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-[32px] text-white shadow-xl shadow-blue-500/20 flex items-center gap-5 relative overflow-hidden">
              <div className="bg-white/20 p-4 rounded-2xl shrink-0 relative z-10">
                <Shirt size={28} />
              </div>
              <div className="relative z-10">
                <h3 className="font-black text-lg uppercase italic tracking-tight leading-none">Kimono Emprestado</h3>
                <p className="text-[11px] text-blue-100 font-bold uppercase tracking-wider mt-1 opacity-90">
                  {profile.kimonoLoanDate ? `Desde ${new Date(profile.kimonoLoanDate + 'T12:00:00').toLocaleDateString('pt-BR')}` : 'Empréstimo ativo'}
                </p>
              </div>
              <Shirt size={140} className="absolute -right-8 -bottom-8 text-white/10 pointer-events-none" />
            </div>
          </motion.div>
        )}

        {/* AVISO DE MENSAGENS NO MURAL */}
        {hasNewMessages && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="px-2"
          >
            <Link
              to="/chat"
              className="bg-indigo-600 p-6 rounded-[32px] text-white shadow-xl shadow-indigo-500/20 flex items-center justify-between group hover:bg-indigo-700 transition-all border border-indigo-500 relative overflow-hidden"
            >
              <div className="flex items-center gap-5 relative z-10">
                <div className="bg-white/20 p-4 rounded-2xl group-hover:scale-110 transition-transform relative">
                  <MessageSquare size={28} />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
                </div>
                <div>
                  <h3 className="font-black text-lg uppercase italic tracking-tight leading-none">{t.muralNewMessagesTitle}</h3>
                  <p className="text-[11px] text-indigo-100 font-bold uppercase tracking-wider mt-1 opacity-80">{t.muralNewMessagesDesc}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 relative z-10 shrink-0 ml-4">
                <span className="hidden sm:block text-[10px] font-black uppercase tracking-widest bg-white/20 px-4 py-2 rounded-full">{t.seeNow}</span>
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center group-hover:translate-x-1 transition-transform">
                  <ChevronRight size={20} />
                </div>
              </div>
              <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                <MessageSquare size={160} />
              </div>
            </Link>
          </motion.div>
        )}

        {/* ALERTAS DE CALENDÁRIO */}
        {upcomingOffDays.length > 0 && (
          <motion.div variants={itemVariants} className="space-y-3 px-2">
            {upcomingOffDays.map((offDay) => {
              const isToday = offDay.date === todayStr;
              const eventDate = new Date(offDay.date + 'T12:00:00');
              const dayName = eventDate.toLocaleDateString('pt-BR', { weekday: 'long' });
              return (
                <div
                  key={offDay.id}
                  className={`bg-gradient-to-r ${isToday ? 'from-red-600 to-red-700' : 'from-amber-500 to-amber-600'} p-6 rounded-[32px] text-white shadow-xl flex items-center justify-between`}
                >
                  <div className="flex items-center gap-5">
                    <div className="bg-white/20 p-4 rounded-2xl">
                      <AlertCircle size={32} />
                    </div>
                    <div>
                      <h3 className="font-black text-xl uppercase tracking-tight">
                        {isToday ? t.noClassesToday : t.noClassesDay.replace('{day}', dayName)}
                      </h3>
                      <p className={`${isToday ? 'text-red-100' : 'text-amber-50'} font-medium opacity-90`}>
                        {offDay.reason} ({new Date(offDay.date + 'T12:00:00').toLocaleDateString(language === 'pt' ? 'pt-BR' : language === 'en' ? 'en-US' : 'es-ES')})
                      </p>
                    </div>
                  </div>
                  <div className="hidden md:block">
                    <CalendarIcon size={48} className="opacity-20" />
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}

        {/* ALERTA DE VENCIMENTO DE MENSALIDADE */}
        {paymentAlertData && (
          <motion.div variants={itemVariants} className="px-2">
            <div
              className={`bg-gradient-to-r ${
                paymentAlertData.diffDays < 0
                  ? 'from-red-600 to-red-700'
                  : 'from-amber-500 to-amber-600'
              } p-6 rounded-[32px] text-white shadow-xl flex items-center justify-between relative overflow-hidden`}
            >
              <div className="flex items-center gap-5 relative z-10">
                <div className={`bg-white/20 p-4 rounded-2xl ${paymentAlertData.diffDays < 0 ? 'animate-pulse' : ''}`}>
                  {paymentAlertData.diffDays < 0 ? <AlertTriangle size={32} /> : <CreditCard size={32} />}
                </div>
                <div>
                  <h3 className="font-black text-xl uppercase tracking-tight leading-none">
                    {paymentAlertData.diffDays < 0
                      ? `Mensalidade Vencida há ${Math.abs(paymentAlertData.diffDays)} dia${Math.abs(paymentAlertData.diffDays) !== 1 ? 's' : ''}!`
                      : paymentAlertData.diffDays === 0
                      ? 'Sua Mensalidade Vence Hoje!'
                      : `Mensalidade Vence em ${paymentAlertData.diffDays} Dia${paymentAlertData.diffDays !== 1 ? 's' : ''}`}
                  </h3>
                  <p className={`${paymentAlertData.diffDays < 0 ? 'text-red-100' : 'text-amber-50'} font-medium opacity-90 mt-1 text-sm`}>
                    {paymentAlertData.price != null
                      ? `Valor: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(paymentAlertData.price)}${paymentAlertData.planName ? ` — ${paymentAlertData.planName}` : ''}`
                      : paymentAlertData.diffDays < 0
                      ? 'Entre em contato com a academia para regularizar.'
                      : 'Entre em contato com a academia para mais informações.'}
                  </p>
                </div>
              </div>
              <div className="hidden md:block relative z-10 shrink-0 ml-4">
                {paymentAlertData.diffDays < 0 ? <AlertTriangle size={48} className="opacity-20" /> : <CreditCard size={48} className="opacity-20" />}
              </div>
              {paymentAlertData.diffDays < 0 && (
                <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none">
                  <AlertTriangle size={160} />
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* FELICITAÇÕES DO ALUNO */}
        {profile.birthDate && profile.birthDate.substring(5) === currentMonthDay && (
          <motion.div variants={itemVariants} className="px-2">
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-[32px] text-white shadow-xl shadow-emerald-500/20 relative overflow-hidden">
              <div className="flex items-center gap-5 relative z-10">
                <div className="bg-white/20 p-4 rounded-2xl shrink-0">
                  <Trophy size={32} />
                </div>
                <div>
                  <h3 className="font-black text-xl uppercase italic tracking-tight leading-none">Feliz Aniversário, {profile.name.split(' ')[0]}!</h3>
                  <p className="text-emerald-100 font-medium opacity-90 mt-1 text-sm">Que este dia seja tão especial quanto você é para o nosso dojo!</p>
                </div>
              </div>
              <Star size={160} className="absolute -right-12 -bottom-12 text-white/10 pointer-events-none" />
            </div>
          </motion.div>
        )}

        {/* PRONTO PARA GRADUAR */}
        {isReadyToGraduate && (
          <motion.div variants={itemVariants} className="px-2">
            <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-6 rounded-[32px] text-white shadow-2xl shadow-amber-500/30 relative overflow-hidden">
              <div className="relative z-10 flex items-start gap-4">
                <div className="relative shrink-0">
                  <div className="bg-white/20 p-4 rounded-2xl">
                    <Trophy size={32} className="text-white" />
                  </div>
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap size={11} className="text-white shrink-0" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/70">
                      {profileReadyForBelt ? 'Pronto para a Próxima Faixa!' : 'Pronto para o Próximo Grau!'}
                    </span>
                  </div>
                  <h3 className="font-black text-xl sm:text-2xl uppercase italic tracking-tight leading-none">
                    Você já pode graduar!
                  </h3>
                  <p className="text-white/85 font-semibold text-sm mt-1">
                    Fale com seu professor para marcar sua promoção — OSS!
                  </p>
                </div>
              </div>
              <div className="relative z-10 mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 bg-white/10 rounded-2xl p-4">
                <div className="flex flex-col items-center gap-2">
                  <span className="text-[8px] font-black text-white/60 uppercase tracking-widest">Sua faixa</span>
                  <BeltBadge belt={profile.belt} stripes={profile.stripes} colorKey={getBeltConfig(profile.belt)?.colorKey} showText={false} />
                  <span className="text-[9px] font-bold text-white/80 uppercase">{profile.belt}</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <ChevronRight size={22} className="text-white" />
                </div>
                <div className="flex flex-col items-center gap-2">
                  <span className="text-[8px] font-black text-white uppercase tracking-widest">Próximo rank</span>
                  <BeltBadge belt={studentNextRank.nextBelt} stripes={studentNextRank.nextStripes} colorKey={getBeltConfig(studentNextRank.nextBelt)?.colorKey} showText={false} />
                  <span className="text-[9px] font-bold text-white/80 uppercase">{studentNextRank.nextBelt}</span>
                </div>
              </div>
              <Star size={180} className="absolute -right-14 -bottom-14 text-white/10 pointer-events-none" />
              <Award size={80} className="absolute -left-6 -top-6 text-white/10 pointer-events-none" />
            </div>
          </motion.div>
        )}

        {/* AVISO DE GRADUAÇÃO PRÓXIMA (só quando ainda não está pronto) */}
        {graduationWarning && (
          <motion.div variants={itemVariants} className="px-2">
            <div className="bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-700 p-6 rounded-[32px] text-white shadow-2xl shadow-indigo-500/30 relative overflow-hidden">
              <div className="relative z-10 flex items-start gap-4">
                <div className="relative shrink-0">
                  <div className="bg-white/20 p-4 rounded-2xl">
                    <Trophy size={32} className="text-yellow-300" />
                  </div>
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-300 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-300" />
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap size={11} className="text-yellow-300 shrink-0" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/70">Graduação Próxima!</span>
                  </div>
                  <h3 className="font-black text-xl sm:text-2xl uppercase italic tracking-tight leading-none">
                    {graduationWarning.remaining === 1
                      ? `Falta só 1 ${graduationWarning.unit === 'meses' ? 'mês' : 'aula'}!`
                      : `Faltam ${graduationWarning.remaining} ${graduationWarning.unit}!`}
                  </h3>
                  <p className="text-white/75 font-semibold text-sm mt-1">
                    Avise seu professor — você está quase lá!
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[8px] font-black text-white/60 uppercase tracking-widest">Faltam</p>
                  <p className="text-3xl sm:text-4xl font-black text-yellow-300 leading-none">{graduationWarning.remaining}</p>
                  <p className="text-[9px] font-black text-white/60 uppercase tracking-widest">{graduationWarning.unit}</p>
                </div>
              </div>
              <div className="relative z-10 mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 bg-white/10 rounded-2xl p-4">
                <div className="flex flex-col items-center gap-2">
                  <span className="text-[8px] font-black text-white/60 uppercase tracking-widest">Sua faixa</span>
                  <BeltBadge belt={profile.belt} stripes={profile.stripes} colorKey={getBeltConfig(profile.belt)?.colorKey} showText={false} />
                  <span className="text-[9px] font-bold text-white/80 uppercase">{profile.belt}</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <ChevronRight size={22} className="text-yellow-300" />
                </div>
                <div className="flex flex-col items-center gap-2">
                  <span className="text-[8px] font-black text-yellow-300 uppercase tracking-widest">Próximo rank</span>
                  <BeltBadge belt={studentNextRank.nextBelt} stripes={studentNextRank.nextStripes} colorKey={getBeltConfig(studentNextRank.nextBelt)?.colorKey} showText={false} />
                  <span className="text-[9px] font-bold text-white/80 uppercase">{studentNextRank.nextBelt}</span>
                </div>
              </div>
              <Star size={180} className="absolute -right-14 -bottom-14 text-white/5 pointer-events-none" />
              <Award size={80} className="absolute -left-6 -top-6 text-white/5 pointer-events-none" />
            </div>
          </motion.div>
        )}

        {/* BENTO GRID - STUDENT */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 px-2">
          
          {/* CARTÃO VIRTUAL - DESTAQUE */}
          <motion.div variants={itemVariants} className="md:col-span-4 space-y-4">
             <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-[40px] text-white shadow-2xl relative overflow-hidden group h-full">
               <div className="relative z-10 flex flex-col gap-4 h-full min-h-[220px]">
                 <div className="flex justify-between items-start">
                   <div>
                     <h2 className="text-xl font-black italic tracking-tighter uppercase leading-none">{t.digitalId}</h2>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">{academy?.name}</p>
                   </div>
                   <Trophy size={28} className="text-indigo-400 opacity-50 shrink-0" />
                 </div>

                 <div>
                   <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{t.students.slice(0, -1)}</p>
                   <h3 className="text-lg font-black uppercase italic tracking-tight leading-none">{profile.name}</h3>
                   <div className="mt-2 flex items-center gap-2 flex-wrap">
                     <BeltBadge belt={profile.belt} stripes={profile.stripes} colorKey={getBeltConfig(profile.belt)?.colorKey} />
                     <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Status: {profile.status === 'Active' ? (language === 'pt' ? 'Ativo' : 'Active') : (language === 'pt' ? 'Pendente' : 'Pending')}</span>
                   </div>
                 </div>

                 <div className="flex-1 flex items-center justify-center py-2">
                   <div className="bg-white p-2 rounded-2xl shadow-xl">
                     <QRCodeSVG value={profile.id} size={120} level="M" includeMargin={true} style={{ maxWidth: '100%', height: 'auto', display: 'block' }} />
                   </div>
                 </div>
               </div>
               <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
             </div>
          </motion.div>

          {/* ESTATÍSTICAS E PROGRESSO */}
          <div className="md:col-span-8 flex flex-col gap-6">
            <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <StatCard 
                icon={<TrendingUp className="text-indigo-600" />} 
                label={t.totalClasses} 
                value={profile.totalClasses} 
                trend="OSS!" 
              />
              <StatCard 
                icon={<CheckCircle2 className="text-emerald-500" />} 
                label={t.monthlyTraining} 
                value={monthlyClasses} 
                trend="Foco total" 
              />
              <StatCard 
                icon={<Clock className="text-blue-500" />} 
                label={t.totalHours} 
                value={`${profile.totalHours}h`} 
              />
              <StatCard 
                icon={<AlertTriangle className={profile.absentCount >= (academy.absenceLimit || 3) ? 'text-red-500' : 'text-amber-500'} />} 
                label={t.absences} 
                value={profile.absentCount} 
                highlight={profile.absentCount >= (academy.absenceLimit || 3)}
              />
              <StatCard
                icon={<Activity className="text-purple-500" />}
                label={language === 'pt' ? 'Aulas Nessa Faixa' : 'Classes on This Belt'}
                value={profile.classesSinceGraduation ?? 0}
              />
            </motion.div>

            {/* PROGRESSO DE GRADUAÇÃO */}
            <motion.div variants={itemVariants}>
              {(() => {
                const theme = getBeltTheme(profile.belt);
                const progressData = getGraduationProgressByBeltRank(profile, getBeltConfig(profile.belt));
                const target = progressData?.target ?? 0;
                const current = progressData?.current ?? 0;
                const unit = progressData?.unit === 'meses' ? 'Meses' : 'Aulas';

                const progress = target > 0 ? Math.min(100, Math.floor((current / target) * 100)) : 0;
                const remaining = Math.max(0, target - current);

                return (
                  <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden relative group">
                    <div className="relative z-10 text-left">
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase italic tracking-tight flex items-center gap-2">
                          <GraduationCap size={24} className="text-indigo-600" />
                          {t.graduationJourney}
                        </h2>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          {current} / {target} {unit}
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="flex items-center gap-6">
                          <div className={`w-20 h-20 rounded-3xl shrink-0 flex items-center justify-center transition-all ${getBeltColor(profile.belt)} shadow-xl ${theme.shadow} dark:shadow-none`}>
                             <Medal size={40} className="opacity-80" />
                          </div>
                          <div className="flex-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t.nextRank}</p>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-lg font-black text-slate-800 dark:text-white italic uppercase tracking-tight">Frequência Necessária</span>
                              <span className="text-sm font-black text-indigo-600">{progress}%</span>
                            </div>
                            <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-1 shadow-inner">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 1.5, ease: 'easeOut' }}
                                className={`h-full ${theme.bg} rounded-full shadow-lg`}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-center">
                           <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tight">
                              {remaining > 0
                                ? (language === 'pt' ? `Mantenha a constância! Faltam ${remaining} ${unit.toLowerCase()} para sua evolução.` : `Keep it up! ${remaining} ${unit.toLowerCase()} left for your evolution.`)
                                : (language === 'pt' ? 'Meta atingida! Aguarde a avaliação técnica.' : 'Goal reached! Wait for technical evaluation.')}
                           </p>
                        </div>
                      </div>
                    </div>
                    <Star size={120} className="absolute -bottom-10 -right-10 text-slate-100 dark:text-slate-800/20 group-hover:scale-110 transition-transform duration-700" />
                  </div>
                );
              })()}
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Modal: QR Scanner de Presença */}
      {showQrScanner && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-[9000] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl shadow-2xl p-6 flex flex-col gap-5 animate-in zoom-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                  <UserCheck size={20} className="text-emerald-600" />
                </div>
                <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Registrar Presença</h2>
              </div>
              <button onClick={closeQrScanner} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
                <X size={20} />
              </button>
            </div>

            {qrScanStatus === 'success' && (
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                  <CheckCircle2 size={44} className="text-emerald-600" />
                </div>
                <div className="text-center">
                  <p className="font-black text-slate-800 dark:text-white text-lg uppercase">OSS!</p>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{qrScanMessage}</p>
                </div>
                <button onClick={closeQrScanner} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-2xl uppercase tracking-widest text-sm transition-all active:scale-95">
                  Fechar
                </button>
              </div>
            )}

            {qrScanStatus !== 'success' && (
              <>
                {qrScanStatus === 'idle' && (
                  <div className="flex flex-col gap-3">
                    <p className="text-sm text-slate-500 dark:text-slate-400 text-center">Aponte a câmera para o QR Code exibido na academia.</p>
                    <button
                      onClick={startQrCamera}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-2xl uppercase tracking-widest text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      <UserCheck size={16} />
                      Abrir Câmera
                    </button>
                  </div>
                )}

                {qrScanStatus === 'scanning' && (
                  <div className="space-y-3">
                    <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-slate-950">
                      <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                      <canvas ref={canvasRef} className="hidden" />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-48 h-48 border-2 border-emerald-400 rounded-2xl opacity-80">
                          <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                          <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                          <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />
                        </div>
                      </div>
                      {isQrCheckinLoading && (
                        <div className="absolute inset-0 bg-slate-950/70 flex items-center justify-center">
                          <Loader2 size={40} className="text-emerald-400 animate-spin" />
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest">Aponte para o QR Code da academia</p>
                  </div>
                )}

                {qrScanStatus === 'error' && (
                  <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 p-4 rounded-2xl flex items-start gap-3">
                    <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700 dark:text-red-400 font-medium">{qrScanMessage}</p>
                  </div>
                )}

                {/* Fallback manual */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ou digite o código manualmente</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={qrManualCode}
                      onChange={e => setQrManualCode(e.target.value)}
                      placeholder="Digite o código de presença"
                      className="flex-1 pl-4 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium text-slate-900 dark:text-white placeholder:text-slate-400 text-sm"
                      onKeyDown={e => { if (e.key === 'Enter') performQrCheckin(qrManualCode); }}
                    />
                    <button
                      onClick={() => performQrCheckin(qrManualCode)}
                      disabled={!qrManualCode.trim() || isQrCheckinLoading}
                      className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black px-4 rounded-xl transition-all active:scale-95 flex items-center"
                    >
                      {isQrCheckinLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal: Alterar Senha */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[9000] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl p-8 flex flex-col gap-6 animate-in zoom-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                  <KeyRound size={20} className="text-indigo-600" />
                </div>
                <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Alterar Minha Senha</h2>
              </div>
              <button onClick={() => { setShowPasswordModal(false); setNewPass(''); setConfirmNewPass(''); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1 flex items-center justify-between">
                  <span>Nova Senha <span className="text-red-500">*</span></span>
                  <button type="button" onClick={() => setShowPassVisibility(p => !p)} className="text-slate-400">
                    {showPassVisibility ? <EyeOff size={12} /> : <Eye size={12} />}
                  </button>
                </label>
                <div className="relative">
                  <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassVisibility ? 'text' : 'password'}
                    value={newPass}
                    onChange={e => setNewPass(e.target.value)}
                    placeholder="Mín. 6 caracteres"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-900 dark:text-white placeholder:text-slate-400"
                    autoFocus
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">
                  Confirmar Nova Senha <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassVisibility ? 'text' : 'password'}
                    value={confirmNewPass}
                    onChange={e => setConfirmNewPass(e.target.value)}
                    placeholder="Repita a senha"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-900 dark:text-white placeholder:text-slate-400"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isSavingPass}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-black py-3 rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-[11px] mt-2"
              >
                {isSavingPass ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                {isSavingPass ? 'Salvando...' : 'Salvar Nova Senha'}
              </button>
            </form>
          </div>
        </div>
      )}
      </>
    );
  }

  return (
    <>
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 transition-colors pb-10 p-2"
    >
      <motion.header variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white tracking-tighter uppercase italic leading-none">
            {getGreeting()}, {user.role === 'superuser' ? 'MASTER' : user.role === 'admin' ? academy?.ownerName?.split(' ')[0] : user.name.split(' ')[0]}!
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold mt-2 uppercase text-[10px] tracking-[0.2em]">
            {user.role === 'superuser' ? t.activeMasterMode : `${t.manageAccess} ${academy?.name}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {user.role === 'superuser' && (
            <div className="flex items-center gap-3 bg-indigo-600 p-3 rounded-2xl text-white shadow-lg shadow-indigo-600/20">
              <ShieldCheck size={20} />
              <div className="hidden xs:block">
                <p className="text-[9px] font-black uppercase tracking-widest leading-none mb-1 opacity-80">{language === 'pt' ? 'Permissão' : 'Permission'}</p>
                <p className="text-[10px] font-black uppercase italic">Master</p>
              </div>
            </div>
          )}
          {(instructorProfile || staffProfile) && (
            <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                <UserCheck size={20} />
              </div>
              <div className="hidden xs:block">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{t.profile}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-800 dark:text-white uppercase">{user.role === 'instructor' ? t.instructors.slice(0, -1) : 'Staff'}</span>
                  {instructorProfile && <BeltBadge belt={instructorProfile.belt} stripes={instructorProfile.stripes} colorKey={getBeltConfig(instructorProfile.belt)?.colorKey} />}
                </div>
              </div>
            </div>
          )}
          {(user.role === 'admin' || user.role === 'superuser') && (
            <Link 
              to="/calendar" 
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 sm:px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">{t.calendar}</span>
              <span className="sm:hidden">{t.calendar}</span>
            </Link>
          )}
          <button
            onClick={handleShare}
            className="flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2 rounded-2xl border border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:border-emerald-200 transition-all shadow-sm cursor-pointer"
          >
            <Share2 size={14} />
            <span className="hidden sm:inline">{language === 'pt' ? 'Compartilhar Sistema' : 'Share System'}</span>
          </button>
          <button
            onClick={() => setShowPasswordModal(true)}
            className="flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2 rounded-2xl border border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:border-slate-300 transition-all shadow-sm cursor-pointer"
          >
            <KeyRound size={14} />
            <span className="hidden md:inline">Alterar Senha</span>
          </button>
          {user.role === 'instructor' && (
            <Link
              to="/instructor-profile"
              className="hidden md:flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2 rounded-2xl border border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
            >
              Meus Dados
              <ChevronRight size={14} />
            </Link>
          )}
        </div>
      </motion.header>

      {/* ALERTAS DE GRADUAÇÃO (ADMIN/INSTRUCTOR) */}
      {(user.role === 'admin' || user.role === 'superuser' || user.role === 'instructor') && graduationAlerts.length > 0 && (
        <motion.div variants={itemVariants} className="px-2">
          <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-[40px] p-8 text-white shadow-2xl relative overflow-hidden group">
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex items-center gap-6">
                <div className="bg-white/20 p-5 rounded-3xl backdrop-blur-sm group-hover:scale-110 transition-transform">
                  <Trophy size={40} className="text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-black italic tracking-tighter uppercase leading-none">{t.graduationAlertTitle}</h2>
                  <p className="text-[11px] font-bold text-amber-100 uppercase tracking-[0.2em] mt-2">
                    {graduationAlerts.length} {t.graduationAlertText}
                  </p>
                </div>
              </div>
              <Link
                to="/students"
                state={{ openGraduationCenter: true }}
                className="w-full md:w-auto bg-white dark:bg-slate-800 text-amber-600 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.1em] shadow-xl hover:scale-105 active:scale-95 transition-all text-center"
              >
                {t.manageGraduations}
              </Link>
            </div>
            
            {/* Atalho Rápido - Lista Horizontal */}
            <div className="relative z-10 mt-8 flex gap-3 overflow-x-auto no-scrollbar pb-2">
              {graduationAlerts.slice(0, 10).map(s => (
                <div key={s.id} className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10 flex items-center gap-3 shrink-0">
                  <div className="relative">
                    {s.photo ? (
                      <img src={s.photo} className="w-8 h-8 rounded-lg object-cover" />
                    ) : (
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${getBeltClassName(s.belt, getBeltConfig(s.belt)?.colorKey)}`}>
                        {s.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase truncate max-w-[100px] leading-tight">{s.name.split(' ')[0]}</p>
                    <p className="text-[8px] font-bold text-amber-100 uppercase tracking-widest">{s.alertType === 'BELT' ? 'Próx. Faixa' : 'Próx. Grau'}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32" />
          </div>
        </motion.div>
      )}

      {/* ALUNOS QUASE LÁ (ADMIN/INSTRUCTOR) — aviso antecipado por faixa, ainda não elegíveis */}
      {(user.role === 'admin' || user.role === 'superuser' || user.role === 'instructor') && closeToGraduationAlerts.length > 0 && (
        <motion.div variants={itemVariants} className="px-2">
          <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-[40px] p-8 text-white shadow-2xl relative overflow-hidden group">
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex items-center gap-6">
                <div className="bg-white/20 p-5 rounded-3xl backdrop-blur-sm group-hover:scale-110 transition-transform">
                  <Zap size={40} className="text-yellow-300" />
                </div>
                <div>
                  <h2 className="text-2xl font-black italic tracking-tighter uppercase leading-none">Quase Lá</h2>
                  <p className="text-[11px] font-bold text-indigo-100 uppercase tracking-[0.2em] mt-2">
                    {closeToGraduationAlerts.length} {closeToGraduationAlerts.length === 1 ? 'atleta prestes a graduar' : 'atletas prestes a graduar'}
                  </p>
                </div>
              </div>
              <Link
                to="/students"
                state={{ openGraduationCenter: true }}
                className="w-full md:w-auto bg-white dark:bg-slate-800 text-indigo-600 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.1em] shadow-xl hover:scale-105 active:scale-95 transition-all text-center"
              >
                {t.manageGraduations}
              </Link>
            </div>

            {/* Atalho Rápido - Lista Horizontal */}
            <div className="relative z-10 mt-8 flex gap-3 overflow-x-auto no-scrollbar pb-2">
              {closeToGraduationAlerts.slice(0, 10).map(s => (
                <div key={s.id} className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10 flex items-center gap-3 shrink-0">
                  <div className="relative">
                    {s.photo ? (
                      <img src={s.photo} className="w-8 h-8 rounded-lg object-cover" />
                    ) : (
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${getBeltClassName(s.belt, getBeltConfig(s.belt)?.colorKey)}`}>
                        {s.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase truncate max-w-[100px] leading-tight">{s.name.split(' ')[0]}</p>
                    <p className="text-[8px] font-bold text-indigo-100 uppercase tracking-widest">
                      {s.progress ? `${s.progress.current}/${s.progress.target} ${s.progress.unit}` : 'Quase lá'}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32" />
          </div>
        </motion.div>
      )}

      {/* FELICITAÇÕES DO INSTRUTOR */}
      {user.role === 'instructor' && instructorProfile?.birthDate && instructorProfile.birthDate.substring(5) === currentMonthDay && (
        <motion.div variants={itemVariants} className="px-2">
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-[32px] text-white shadow-xl shadow-emerald-500/20 relative overflow-hidden">
            <div className="flex items-center gap-5 relative z-10">
              <div className="bg-white/20 p-4 rounded-2xl shrink-0">
                <Trophy size={32} />
              </div>
              <div>
                <h3 className="font-black text-xl uppercase italic tracking-tight leading-none">Feliz Aniversário, {instructorProfile.name.split(' ')[0]}!</h3>
                <p className="text-emerald-100 font-medium opacity-90 mt-1 text-sm">Que este dia seja tão especial quanto você é para o nosso dojo!</p>
              </div>
            </div>
            <Star size={160} className="absolute -right-12 -bottom-12 text-white/10 pointer-events-none" />
          </div>
        </motion.div>
      )}

      {/* KIMONO EMPRESTADO (INSTRUTOR) */}
      {user.role === 'instructor' && academy?.kimonoLoanEnabled && !!instructorProfile?.hasLoanedKimono && (
        <motion.div variants={itemVariants} className="px-2">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-[32px] text-white shadow-xl shadow-blue-500/20 flex items-center gap-5 relative overflow-hidden">
            <div className="bg-white/20 p-4 rounded-2xl shrink-0 relative z-10">
              <Shirt size={28} />
            </div>
            <div className="relative z-10">
              <h3 className="font-black text-lg uppercase italic tracking-tight leading-none">Kimono Emprestado</h3>
              <p className="text-[11px] text-blue-100 font-bold uppercase tracking-wider mt-1 opacity-90">
                {instructorProfile.kimonoLoanDate ? `Desde ${new Date(instructorProfile.kimonoLoanDate + 'T12:00:00').toLocaleDateString('pt-BR')}` : 'Empréstimo ativo'}
              </p>
            </div>
            <Shirt size={140} className="absolute -right-8 -bottom-8 text-white/10 pointer-events-none" />
          </div>
        </motion.div>
      )}

      {/* AVISO DE MENSAGENS NO MURAL */}
      {hasNewMessages && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="px-2"
        >
          <Link 
            to="/chat"
            className="bg-indigo-600 p-6 rounded-[32px] text-white shadow-xl shadow-indigo-500/20 flex items-center justify-between group hover:bg-indigo-700 transition-all border border-indigo-500 relative overflow-hidden"
          >
            <div className="flex items-center gap-5 relative z-10">
              <div className="bg-white/20 p-4 rounded-2xl group-hover:scale-110 transition-transform relative">
                <MessageSquare size={28} />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
              </div>
              <div>
                <h3 className="font-black text-lg uppercase italic tracking-tight leading-none">{t.muralNewMessagesTitle}</h3>
                <p className="text-[11px] text-indigo-100 font-bold uppercase tracking-wider mt-1 opacity-80">{t.muralNewMessagesDesc}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 relative z-10 shrink-0 ml-4">
              <span className="hidden sm:block text-[10px] font-black uppercase tracking-widest bg-white/20 px-4 py-2 rounded-full">{t.seeNow}</span>
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center group-hover:translate-x-1 transition-transform">
                <ChevronRight size={20} />
              </div>
            </div>
            {/* Efeito decorativo */}
            <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
              <MessageSquare size={160} />
            </div>
          </Link>
        </motion.div>
      )}

      {/* AVISO DE VENCIMENTO DO PLANO */}
      {user.role === 'admin' && planExpiration && planExpiration.days <= 7 && (
        <motion.div 
          variants={itemVariants}
          className={`p-4 rounded-[32px] text-white shadow-xl flex items-center justify-between px-6 ${
            planExpiration.days <= 0 ? 'bg-red-600 shadow-red-500/20' : 'bg-amber-500 shadow-amber-500/20'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-2xl">
              <ShieldAlert size={24} />
            </div>
            <div>
              <h3 className="font-black text-sm uppercase tracking-tight">
                {planExpiration.days <= 0 ? t.licenseExpired : t.licenseWarning}
              </h3>
              <p className="text-[11px] opacity-90 font-medium">
                {planExpiration.days <= 0 
                  ? t.licenseExpiredText.replace('{date}', new Date(planExpiration.date + 'T12:00:00').toLocaleDateString(language === 'pt' ? 'pt-BR' : language === 'en' ? 'en-US' : 'es-ES'))
                  : t.licenseWarningText
                      .replace('{days}', planExpiration.days.toString())
                      .replace('{unit}', planExpiration.days === 1 ? (language === 'pt' ? 'dia' : language === 'en' ? 'day' : 'día') : (language === 'pt' ? 'dias' : language === 'en' ? 'days' : 'días'))
                }
              </p>
            </div>
          </div>
          <button 
            onClick={() => showNotification(t.supportText.replace('{plan}', academy?.currentPlan || ''), 'info')}
            className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm active:scale-95 transition-all shrink-0 ml-4"
          >
            {t.supportTitle}
          </button>
        </motion.div>
      )}

      {/* LINK DE MATRÍCULA (Apenas para Admin e Superuser) */}
      {(user.role === 'admin' || user.role === 'superuser') && academy && (
        <motion.div variants={itemVariants} className="px-2">
          <div className="bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/30 rounded-[28px] sm:rounded-[32px] p-4 sm:p-6 shadow-xl shadow-indigo-500/5 overflow-hidden relative group">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 lg:gap-6 relative z-10">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 shadow-inner">
                  <Smartphone size={20} className="sm:size-[24px]" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-slate-800 dark:text-white uppercase italic tracking-tight truncate text-sm sm:text-base">{t.shareEnrollment}</h3>
                  <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{t.sendInviteLink}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 w-full lg:w-auto">
                <div className="hidden xl:block bg-slate-50 dark:bg-slate-800 px-4 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 max-w-[200px] xl:max-w-[250px]">
                  <p className="text-[9px] font-mono text-slate-400 truncate tracking-tighter">
                    {`${window.location.origin}/login/${academy.alias || academy.id}`}
                  </p>
                </div>
                <button
                  onClick={() => {
                    const link = `${window.location.origin}/login/${academy.alias || academy.id}`;
                    navigator.clipboard.writeText(link);
                    showNotification(t.linkCopied, 'success');
                  }}
                  className="p-3.5 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-indigo-600 rounded-2xl transition-all active:scale-95 border border-slate-100 dark:border-slate-800 shrink-0"
                  title={t.copyLink}
                >
                  <Copy size={18} />
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(t.whatsappShareText.replace('{academy}', academy.name).replace('{link}', `${window.location.origin}/login/${academy.alias || academy.id}`))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 lg:flex-none bg-[#25D366] hover:bg-[#128C7E] text-white px-5 py-3.5 rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 transition-all active:scale-95"
                >
                  <Share2 size={16} />
                  <span>WhatsApp</span>
                </a>
              </div>
            </div>
            
            <div className="absolute -right-10 -bottom-10 opacity-[0.03] dark:opacity-[0.05] pointer-events-none group-hover:scale-110 transition-transform duration-1000">
              <Share2 size={180} />
            </div>
          </div>
        </motion.div>
      )}

      {/* ALERTAS DE CALENDÁRIO */}
      {upcomingOffDays.length > 0 && (
        <motion.div variants={itemVariants} className="space-y-3">
          {upcomingOffDays.map((offDay) => {
            const isToday = offDay.date === todayStr;
            const eventDate = new Date(offDay.date + 'T12:00:00');
            const dayName = eventDate.toLocaleDateString('pt-BR', { weekday: 'long' });
            
            return (
              <div 
                key={offDay.id} 
                className={`bg-gradient-to-r ${isToday ? 'from-red-600 to-red-700' : 'from-amber-500 to-amber-600'} p-6 rounded-[32px] text-white shadow-xl flex items-center justify-between`}
              >
                <div className="flex items-center gap-5">
                  <div className="bg-white/20 p-4 rounded-2xl">
                    <AlertCircle size={32} />
                  </div>
                  <div>
                    <h3 className="font-black text-xl uppercase tracking-tight">
                      {isToday ? t.noClassesToday : t.noClassesDay.replace('{day}', dayName)}
                    </h3>
                    <p className={`${isToday ? 'text-red-100' : 'text-amber-50'} font-medium opacity-90`}>
                      {offDay.reason} ({new Date(offDay.date + 'T12:00:00').toLocaleDateString(language === 'pt' ? 'pt-BR' : language === 'en' ? 'en-US' : 'es-ES')})
                    </p>
                  </div>
                </div>
                <div className="hidden md:block">
                  <CalendarIcon size={48} className="opacity-20" />
                </div>
              </div>
            );
          })}
        </motion.div>
      )}

      {/* PRÓXIMOS VENCIMENTOS DE MENSALIDADE (Admin) */}
      {user.role === 'admin' && upcomingPayments.length > 0 && (
        <motion.div variants={itemVariants} className="px-2">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 p-6 sm:p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2 uppercase italic tracking-tight">
                <CreditCard size={24} className="text-emerald-600" />
                Vencimentos de Mensalidade
              </h2>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-full">
                {upcomingPayments.length} aluno{upcomingPayments.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="space-y-2">
              {upcomingPayments.map(({ student, diffDays, price }) => (
                <div
                  key={student.id}
                  className={`flex items-center justify-between p-3 sm:p-4 rounded-3xl border transition-all ${
                    diffDays < 0
                      ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30'
                      : diffDays === 0
                      ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-2xl shrink-0 flex items-center justify-center font-black text-base overflow-hidden ${getBeltClassName(student.belt, getBeltConfig(student.belt)?.colorKey) || 'bg-slate-200 text-slate-700'}`}>
                      {student.photo
                        ? <img src={student.photo} className="w-full h-full object-cover" />
                        : student.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-slate-800 dark:text-white text-sm uppercase italic truncate leading-none">{student.name}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${
                          diffDays < 0 ? 'text-red-500' : diffDays === 0 ? 'text-amber-500' : 'text-slate-400'
                        }`}>
                          {diffDays < 0
                            ? `Vencido há ${Math.abs(diffDays)} dia${Math.abs(diffDays) !== 1 ? 's' : ''}`
                            : diffDays === 0
                            ? 'Vence hoje'
                            : `Vence em ${diffDays} dia${diffDays !== 1 ? 's' : ''}`}
                        </span>
                        {price != null && (
                          <span className="text-[10px] text-slate-400 font-bold">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    disabled={markingPaymentId === student.id}
                    onClick={() => markPaymentAsPaid(student)}
                    className="shrink-0 ml-3 flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 px-3 sm:px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-60 border border-emerald-100 dark:border-emerald-900/30 cursor-pointer"
                  >
                    {markingPaymentId === student.id
                      ? <Loader2 size={14} className="animate-spin" />
                      : <CheckCircle2 size={14} />}
                    <span className="hidden sm:inline">Marcar Pago</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Visão Global para Superuser */}
      {user.role === 'superuser' && globalStats && (
        <section className="space-y-8 animate-in fade-in duration-700">
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2 uppercase italic tracking-tight">
                <TrendingUp size={22} className="text-indigo-600" />
                Métricas Globais do Sistema
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 px-2">
              <StatCard icon={<Award size={22} className="text-indigo-600" />} label="Academias" value={globalStats.academiesCount} />
              <StatCard icon={<Users size={22} className="text-blue-600" />} label="Alunos" value={globalStats.studentsCount} trend={`${globalStats.activeStudentsCount} ativos`} />
              <StatCard icon={<TrendingUp size={22} className="text-green-600" />} label="Presenças" value={globalStats.todayAttendanceCount} />
              <StatCard icon={<Wallet size={22} className="text-emerald-600" />} label="Faturamento" value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(globalStats.totalMensalidades)} />
              <StatCard icon={<TrendingUp size={22} className="text-indigo-600" />} label="Receita Geral" value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(globalStats.totalIncome)} />
            </div>
          </div>

          {/* PLANOS DO SISTEMA */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2 uppercase italic tracking-tight">
                <CreditCard size={22} className="text-indigo-600" />
                Modelos de Assinatura (Planos)
              </h2>
              {user.role === 'superuser' && (
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Clique no preço para editar</p>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-2">
              {systemConfig.plans.map(plan => (
                <div 
                  key={plan.id} 
                  className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col gap-3 group relative hover:border-indigo-200 transition-all cursor-pointer"
                  onClick={() => {
                    setEditingPlan(plan);
                    setIsPlanEditModalOpen(true);
                  }}
                >
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${plan.color || 'bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300'}`}>
                    {plan.name === 'Free' ? <Medal size={20} /> : plan.name === 'Silver' ? <Award size={20} /> : plan.name === 'Gold' ? <Star size={20} /> : <Trophy size={20} />}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800 dark:text-white text-sm uppercase italic">{plan.name}</h4>
                    <p className="text-lg font-black text-indigo-600">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(plan.price)}
                      <span className="text-[10px] text-slate-400 font-bold">/mês</span>
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-50 dark:border-slate-800 mt-2 flex items-center justify-between">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{globalStats.plansCount[plan.name] || 0} Academias</p>
                    <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Plus size={14} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* LISTA DE ACADEMIAS PARA GESTÃO */}
          <div className="space-y-4 px-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2 uppercase italic tracking-tight">
                <Users size={22} className="text-indigo-600" />
                Gestão de Academias
              </h2>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Pesquisar academia..." 
                  className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3 pl-12 rounded-2xl text-[10px] font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-indigo-600/20 w-full sm:w-64 transition-all shadow-sm"
                  value={academySearch}
                  onChange={(e) => setAcademySearch(e.target.value)}
                />
              </div>
            </div>
            
            {/* Mobile View: Cards */}
            <div className="grid grid-cols-1 md:hidden gap-4">
              {globalStats.allAcademies
                .filter(acc => 
                  acc.name.toLowerCase().includes(academySearch.toLowerCase()) || 
                  acc.ownerName.toLowerCase().includes(academySearch.toLowerCase())
                )
                .map(acc => (
                  <div key={acc.id} className="bg-white dark:bg-slate-900 p-5 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold uppercase shrink-0 overflow-hidden">
                        {acc.logo ? <img src={acc.logo} className="w-full h-full object-cover" /> : acc.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-slate-800 dark:text-white text-sm uppercase truncate italic">{acc.name}</p>
                        <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">{acc.ownerName}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-[10px]">
                      <span className={`px-2 py-1 rounded-lg font-black uppercase tracking-tighter ${
                        acc.currentPlan === 'VIP' ? 'bg-purple-700 text-white' :
                        acc.currentPlan === 'Black Belt' ? 'bg-slate-900 text-white' :
                        acc.currentPlan === 'Gold' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300'
                      }`}>
                        {acc.currentPlan || 'Free'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${acc.planStatus === 'Active' ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="font-bold text-slate-500 uppercase tracking-widest">{acc.planStatus || 'Trial'}</span>
                      </div>
                    </div>

                    <button 
                      className="w-full bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border border-slate-100 dark:border-slate-800"
                      onClick={() => {
                        setSelectedAcademy(acc);
                        setIsManageModalOpen(true);
                        setAliasError('');
                      }}
                    >
                      Gerenciar Unidade
                    </button>
                  </div>
                ))}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden md:block bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-50 dark:border-slate-800">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Academia / Unidade</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsável</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Plano Atual</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {globalStats.allAcademies
                      .filter(acc => 
                        acc.name.toLowerCase().includes(academySearch.toLowerCase()) || 
                        acc.ownerName.toLowerCase().includes(academySearch.toLowerCase())
                      )
                      .map(acc => (
                      <tr key={acc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold uppercase overflow-hidden">
                              {acc.logo ? <img src={acc.logo} className="w-full h-full object-cover" /> : acc.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 dark:text-white text-sm uppercase">{acc.name}</p>
                              <p className="text-[10px] text-slate-400 lowercase">{acc.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-700 dark:text-slate-300 text-xs">{acc.ownerName}</p>
                          <p className="text-[10px] text-slate-400">{acc.phone || 'Sem fone'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                            acc.currentPlan === 'VIP' ? 'bg-purple-700 text-white' :
                            acc.currentPlan === 'Black Belt' ? 'bg-slate-900 text-white' :
                            acc.currentPlan === 'Gold' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300'
                          }`}>
                            {acc.currentPlan || 'Free'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${acc.planStatus === 'Active' ? 'bg-green-500' : 'bg-red-500'}`} />
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{acc.planStatus || 'Trial'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <button 
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                            onClick={() => {
                              setSelectedAcademy(acc);
                              setIsManageModalOpen(true);
                              setAliasError('');
                            }}
                          >
                            Gerenciar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* MODAL DE GERENCIAMENTO DE ACADEMIA (SUPERUSER) */}
          {isManageModalOpen && selectedAcademy && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[32px] md:rounded-[40px] shadow-2xl p-4 md:p-8 space-y-4 md:space-y-8 animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar">
                <header className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 overflow-hidden">
                      {selectedAcademy.logo ? (
                        <img src={selectedAcademy.logo} className="w-full h-full object-cover" />
                      ) : (
                        <ShieldCheck size={32} />
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase italic">{selectedAcademy.name}</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gestão de SaaS / Licenciamento</p>
                    </div>
                  </div>
                  <button onClick={() => { setIsManageModalOpen(false); setAliasError(''); }} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 hover:text-red-500">
                    <X size={24} />
                  </button>
                </header>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome da Academia</label>
                    <input
                      type="text"
                      value={selectedAcademy.name}
                      onChange={(e) => setSelectedAcademy({ ...selectedAcademy, name: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-600/20 transition-all"
                      placeholder="Nome da academia"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      ID Personalizado (Link de Acesso)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={selectedAcademy.alias || ''}
                        onChange={(e) => handleAliasChange(e.target.value)}
                        className={`w-full bg-slate-50 dark:bg-slate-800 border rounded-2xl p-4 text-sm font-mono font-bold outline-none focus:ring-2 transition-all ${aliasError ? 'border-red-400 focus:ring-red-400/20 text-red-600' : 'border-slate-100 dark:border-slate-800 focus:ring-indigo-600/20'}`}
                        placeholder="minha-academia"
                        maxLength={40}
                      />
                    </div>
                    {aliasError ? (
                      <p className="text-[10px] font-bold text-red-500 ml-1">{aliasError}</p>
                    ) : selectedAcademy.alias ? (
                      <p className="text-[10px] font-mono text-indigo-500 ml-1">
                        nexdojo.com.br/login/<span className="font-black">{selectedAcademy.alias}</span>
                      </p>
                    ) : (
                      <p className="text-[10px] text-slate-400 ml-1">Apenas letras minúsculas, números e hífens</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Plano do Sistema</label>
                    <select 
                      value={selectedAcademy.currentPlan || 'Free'}
                      onChange={(e) => setSelectedAcademy({ ...selectedAcademy, currentPlan: e.target.value as any })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 text-sm font-bold appearance-none"
                    >
                      <option value="Free">Free</option>
                      <option value="Silver">Silver (R$ 99)</option>
                      <option value="Gold">Gold (R$ 199)</option>
                      <option value="Black Belt">Black Belt (R$ 399)</option>
                      <option value="VIP">VIP</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status da Conta</label>
                    <select 
                      value={selectedAcademy.planStatus || 'Active'}
                      onChange={(e) => setSelectedAcademy({ ...selectedAcademy, planStatus: e.target.value as any })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 text-sm font-bold appearance-none"
                    >
                      <option value="Active">Ativo</option>
                      <option value="Trial">Em Teste</option>
                      <option value="Suspended">Suspenso</option>
                      <option value="Canceled">Cancelado</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <DateSelectInput
                      label="Prazo de Vencimento (Licença)"
                      labelClassName="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block mb-2"
                      value={selectedAcademy.planExpirationDate || ''}
                      onChange={v => setSelectedAcademy({ ...selectedAcademy, planExpirationDate: v })}
                      yearFrom={new Date().getFullYear()}
                      yearTo={new Date().getFullYear() + 10}
                    />
                  </div>
                </div>

                <div className="bg-indigo-50 dark:bg-indigo-900/10 p-6 rounded-3xl space-y-2">
                  <h4 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                    <Zap size={14} /> Ativação de Recursos
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed uppercase font-bold">
                    Ao alterar o plano para <span className="text-indigo-600">Black Belt</span>, todos os recursos premium (Marketing, Gestão Avançada, Integrações) serão desbloqueados automaticamente para esta unidade.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      setIsManageModalOpen(false);
                      setIsConfirmingDelete(false);
                      setAliasError('');
                    }}
                    className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 font-black rounded-2xl text-xs uppercase tracking-widest"
                  >
                    Fechar
                  </button>
                  {onSwitchAcademy && !isConfirmingDelete && (
                    <button 
                      onClick={() => {
                        onSwitchAcademy(selectedAcademy);
                        setIsManageModalOpen(false);
                      }}
                      className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-lg shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <Zap size={16} />
                      Acessar Painel
                    </button>
                  )}
                  {!isConfirmingDelete && (
                    <button
                      onClick={() => selectedAcademy && !aliasError && handleUpdateAcademyStatus(selectedAcademy.id, selectedAcademy)}
                      disabled={!!aliasError}
                      className="flex-1 py-4 bg-slate-800 text-white font-black rounded-2xl text-xs uppercase tracking-widest active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Salvar
                    </button>
                  )}
                </div>

                  <button
                    onClick={() => setIsConfirmingDelete(true)}
                    className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-black py-4 rounded-2xl active:scale-95 transition-all text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                    <Trash2 size={16} />
                    Excluir Unidade Permanentemente
                  </button>
              </div>
            </div>
          )}

          {/* MODAL DE EDIÇÃO DE PLANO DO SISTEMA (SUPERUSER) */}
          {isPlanEditModalOpen && editingPlan && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[40px] shadow-2xl p-8 space-y-8 animate-in zoom-in-95 duration-300">
                <header className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl ${editingPlan.color} flex items-center justify-center`}>
                      {editingPlan.name === 'Free' ? <Medal size={28} /> : editingPlan.name === 'Silver' ? <Award size={28} /> : editingPlan.name === 'Gold' ? <Star size={28} /> : <Trophy size={28} />}
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase italic">Plano {editingPlan.name}</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Configuração do Sistema</p>
                    </div>
                  </div>
                  <button onClick={() => setIsPlanEditModalOpen(false)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 hover:text-red-500">
                    <X size={24} />
                  </button>
                </header>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Preço Mensal (R$)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">R$</span>
                      <input 
                        type="number"
                        value={editingPlan.price}
                        onChange={(e) => setEditingPlan({ ...editingPlan, price: Number(e.target.value) })}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 pl-12 text-lg font-black outline-none focus:ring-2 focus:ring-indigo-600/20 transition-all font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição</label>
                    <textarea 
                      value={editingPlan.description}
                      onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-600/20 transition-all min-h-[100px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Recursos (Separados por vírgula)</label>
                    <textarea 
                      value={editingPlan.features.join(', ')}
                      onChange={(e) => setEditingPlan({ ...editingPlan, features: e.target.value.split(',').map(f => f.trim()) })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 text-[10px] font-bold outline-none focus:ring-2 focus:ring-indigo-600/20 transition-all uppercase tracking-widest leading-relaxed"
                      placeholder="Ex: Alunos Ilimitados, Gestão Avançada, App Mobile"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => setIsPlanEditModalOpen(false)}
                    className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 font-black rounded-2xl text-xs uppercase tracking-widest"
                  >
                    Descartar
                  </button>
                  <button 
                    onClick={() => handleUpdatePlan(editingPlan)}
                    className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* SALA DE ESPERA (Prioridade máxima no topo se houver alguém) */}
      {(user.role === 'admin' || user.role === 'superuser') && pendingUsers.length > 0 && (
        <motion.section 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 px-2 mb-8"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2 uppercase italic tracking-tight">
              <ShieldAlert size={26} className="text-red-500 animate-pulse" />
              Sala de Espera
              <span className="bg-red-500 text-white text-xs px-3 py-1 rounded-full not-italic ml-2 shadow-lg shadow-red-500/20">{pendingUsers.length}</span>
            </h2>
            <div className="hidden md:flex flex-col items-end">
              <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">Ações Necessárias</p>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Novos cadastros aguardando aprovação</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingUsers.map(pendingUser => (
              <motion.div 
                whileHover={{ y: -5 }}
                key={pendingUser.id} 
                className="bg-white dark:bg-slate-900 p-5 rounded-[32px] border-2 border-red-100 dark:border-red-900/30 shadow-xl shadow-red-500/5 flex flex-col justify-between group hover:border-red-500 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-600 dark:text-red-400 font-black text-xl">
                      {pendingUser.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-slate-800 dark:text-white text-sm uppercase leading-tight truncate max-w-[150px]">{pendingUser.name}</h4>
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tighter ${
                          pendingUser.role === 'student' ? 'bg-blue-100 text-blue-600' :
                          pendingUser.role === 'instructor' ? 'bg-indigo-100 text-indigo-600' :
                          'bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300'
                        }`}>
                          {pendingUser.role === 'student' ? 'Aluno' : pendingUser.role === 'instructor' ? 'Mestre' : 'Staff'}
                        </span>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{pendingUser.email}</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => openDetails(pendingUser)}
                    className="flex-1 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 py-3 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 border border-slate-100 dark:border-slate-800"
                  >
                    <Search size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest leading-none">Ver Ficha</span>
                  </button>
                  <button 
                    onClick={() => handleApprove(pendingUser)}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black text-[10px] uppercase tracking-widest py-3 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-red-600/20"
                  >
                    <CheckCircle2 size={16} />
                    Aprovar
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>
      )}

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-2">
        <StatCard icon={<Users size={22} className="text-blue-500" />} label={user.role === 'superuser' ? "Alunos (Unidade)" : "Total Alunos"} value={stats.total} trend={`${stats.active} ativos`} />
        <StatCard 
          icon={<CheckCircle2 size={22} className="text-green-500" />} 
          label="Presenças Hoje" 
          value={stats.todayAttendance} 
          trend={stats.onMat > 0 ? `${stats.onMat} no tatame` : undefined}
        />
        {user.role === 'instructor' ? (
          <StatCard icon={<Users size={22} className="text-indigo-600" />} label="Alunos Ativos" value={stats.active} />
        ) : (
          <StatCard icon={<Wallet size={22} className="text-emerald-500" />} label="Balancete Mensal" value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(financialSummary.balance)} />
        )}
        <StatCard icon={<AlertTriangle size={22} className="text-red-500" />} label="Alertas Evasão" value={stats.alerts} highlight={stats.alerts > 0} />
      </div>

      {/* Growth Chart & Financial Preview */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-2">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-500/5">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="font-black text-slate-800 dark:text-white uppercase italic tracking-tight flex items-center gap-2">
                <TrendingUp size={20} className="text-emerald-500" />
                Matrículas nos últimos meses
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Crescimento da unidade</p>
            </div>
            <Link to="/reports" className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-[8px] font-black uppercase text-indigo-600 tracking-widest hover:bg-indigo-50 transition-colors">
              Ver Relatório Detalhado
            </Link>
          </div>
          
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthData}>
                <defs>
                  <linearGradient id="colorAlunos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    fontSize: '12px',
                    fontWeight: 700,
                    textTransform: 'uppercase'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="alunos" 
                  stroke="#4f46e5" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorAlunos)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-indigo-600 rounded-[40px] p-8 text-white relative overflow-hidden shadow-2xl shadow-indigo-600/30 flex flex-col justify-between">
          <div className="relative z-10">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-md">
              <ShieldCheck size={32} />
            </div>
            <h3 className="text-2xl font-black italic tracking-tighter uppercase mb-2">Plano Ativo</h3>
            <p className="text-indigo-100 text-sm font-medium leading-relaxed">
              Você está aproveitando todos os recursos do plano <span className="text-white font-black">{academy?.currentPlan || 'Premium'}</span>.
            </p>
          </div>
          
          <div className="relative z-10 mt-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Uso de Armazenamento</span>
              <span className="text-[10px] font-black uppercase tracking-widest">72%</span>
            </div>
            <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white dark:bg-slate-800 w-[72%] rounded-full" />
            </div>
          </div>

          {/* Efeito de decoração */}
          <div className="absolute -right-10 -bottom-10 opacity-20 pointer-events-none">
            <Award size={200} />
          </div>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lado Esquerdo - Atividade e Alertas */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* ÚLTIMAS PRESENÇAS (Activity Feed) - NOVO */}
          <section className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2 uppercase italic tracking-tight">
                <Clock size={24} className="text-indigo-600" />
                Atividade Recente (Treinos)
              </h2>
              <Link to="/attendance" className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">Ver Chamada</Link>
            </div>
            
            <div className="space-y-4">
              {recentActivity.length > 0 ? (
                recentActivity.map(att => (
                  <div key={att.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 group hover:shadow-md transition-all gap-2">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="relative shrink-0">
                        {att.studentPhoto ? (
                          <img src={att.studentPhoto} className="w-12 h-12 rounded-2xl object-cover" />
                        ) : (
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg border ${getBeltClassName(att.studentBelt, getBeltConfig(att.studentBelt)?.colorKey) ?? 'bg-slate-400 text-white border-slate-500'}`}>
                            {att.studentName.charAt(0)}
                          </div>
                        )}
                        <div className="absolute -right-1 -bottom-1 bg-green-500 w-4 h-4 rounded-full border-2 border-white dark:border-slate-800" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-black text-slate-800 dark:text-white text-sm leading-tight uppercase italic truncate">{att.studentName}</h4>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <BeltBadge belt={att.studentBelt} stripes={att.studentStripes} colorKey={getBeltConfig(att.studentBelt)?.colorKey} />
                          <span className="text-[10px] font-bold text-slate-400 capitalize">
                            {new Date(att.date).toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                       <p className="text-[10px] font-black text-indigo-600 uppercase tracking-tighter whitespace-nowrap">Check-in Realizado</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-slate-400 italic text-sm">Nenhuma atividade registrada ainda hoje.</div>
              )}
            </div>
          </section>

          {/* Prontos para Graduar */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2 uppercase italic tracking-tight">
                <Star size={24} className="text-amber-500 fill-amber-500" />
                Maturação de Atletas
              </h2>
              <Link to="/reports" className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:underline">Análise de Horas</Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {graduationAlerts.length > 0 ? (
                graduationAlerts.slice(0, 4).map(student => (
                  <div key={student.id} className="bg-white dark:bg-slate-900 p-5 rounded-[32px] border border-slate-100 dark:border-slate-800 flex items-center justify-between group hover:shadow-md transition-all">
                    <div className="flex items-center gap-3">
                      {student.photo ? <img src={student.photo} className="w-12 h-12 rounded-2xl object-cover" alt="" /> : <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg border ${getBeltClassName(student.belt, getBeltConfig(student.belt)?.colorKey)}`}>{student.name.charAt(0)}</div>}
                      <div>
                        <h4 className="font-black text-slate-800 dark:text-slate-100 text-sm leading-tight uppercase italic">{student.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <BeltBadge belt={student.belt} stripes={student.stripes} colorKey={getBeltConfig(student.belt)?.colorKey} />
                          <p className={`text-[10px] font-black uppercase tracking-wider ${student.alertType === 'BELT' ? 'text-indigo-600' : 'text-amber-600'}`}>
                            {student.alertMessage}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className={student.alertType === 'BELT' ? 'text-indigo-600' : 'text-amber-500'}>
                      {student.alertType === 'BELT' ? <Trophy size={20} /> : <Medal size={20} />}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 bg-slate-50 dark:bg-slate-900/50 p-5 md:p-10 rounded-[32px] md:rounded-[40px] text-center text-slate-400 dark:text-slate-600 text-xs border border-dashed border-slate-200 dark:border-slate-800">
                  Nenhum atleta atingiu a meta de frequência ainda. OSS!
                </div>
              )}
            </div>

            {closeToGraduationAlerts.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Quase Lá</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {closeToGraduationAlerts.slice(0, 4).map(student => (
                    <div key={student.id} className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                      {student.photo ? <img src={student.photo} className="w-9 h-9 rounded-xl object-cover" alt="" /> : <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm border ${getBeltClassName(student.belt, getBeltConfig(student.belt)?.colorKey)}`}>{student.name.charAt(0)}</div>}
                      <div className="min-w-0">
                        <h4 className="font-black text-slate-700 dark:text-slate-200 text-xs leading-tight uppercase italic truncate">{student.name}</h4>
                        <p className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                          {student.progress ? `${student.progress.current}/${student.progress.target} ${student.progress.unit}` : 'Quase lá'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Lado Direito - Financeiro e Alertas Rápidos */}
        <div className="space-y-6">
          {(user.role === 'admin' || user.role === 'superuser') && (
            <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 p-8 rounded-[40px] text-white shadow-2xl relative overflow-hidden group">
              <div className="relative z-10 flex flex-col justify-between h-full min-h-[160px]">
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-2">Resumo Financeiro</h3>
                  <p className="text-4xl font-black italic tracking-tighter leading-none">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(financialSummary.income)}
                  </p>
                  <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest mt-2">{new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-white/10">
                  <div>
                    <p className="text-xs font-black text-indigo-300">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(financialSummary.expense)}</p>
                    <p className="text-[9px] font-bold opacity-40 uppercase tracking-tighter italic">Despesas</p>
                  </div>
                  <div>
                    <p className="text-xs font-black text-amber-400">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(financialSummary.pendingIncome)}</p>
                    <p className="text-[9px] font-bold opacity-40 uppercase tracking-tighter italic">À Receber</p>
                  </div>
                </div>
              </div>
              <Wallet size={160} className="absolute -bottom-16 -right-16 text-white/5 group-hover:scale-110 transition-transform duration-700" />
            </div>
          )}

          {(studentBirthdaysToday.length > 0 || instructorBirthdaysToday.length > 0) && (
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-emerald-100 dark:border-emerald-900/30 shadow-xl shadow-emerald-500/5 relative overflow-hidden group">
              <div className="relative z-10">
                <h3 className="text-lg font-black text-emerald-600 uppercase italic tracking-tight mb-2 flex items-center gap-3">
                  <Medal size={24} />
                  Dia de Celebração
                </h3>
                <div className="flex gap-3 mb-5">
                  {studentBirthdaysToday.length > 0 && (
                    <span className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                      {studentBirthdaysToday.length} Aluno{studentBirthdaysToday.length !== 1 ? 's' : ''}
                    </span>
                  )}
                  {instructorBirthdaysToday.length > 0 && (
                    <span className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                      {instructorBirthdaysToday.length} Instrutor{instructorBirthdaysToday.length !== 1 ? 'es' : ''}
                    </span>
                  )}
                </div>
                {studentBirthdaysToday.length > 0 && (
                  <div className="space-y-3 mb-4">
                    {instructorBirthdaysToday.length > 0 && (
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Alunos</p>
                    )}
                    {studentBirthdaysToday.map(s => (
                      <div key={s.id} className="flex items-center gap-4 bg-emerald-50/50 dark:bg-emerald-900/20 p-4 rounded-3xl border border-emerald-100 dark:border-emerald-900/30">
                        <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-black text-xl shadow-sm">
                          {s.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-black text-slate-800 dark:text-white uppercase italic tracking-tight leading-none mb-1">{s.name.split(' ')[0]}</p>
                          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">{calculateAge(s.birthDate)}º Aniversário</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {instructorBirthdaysToday.length > 0 && (
                  <div className="space-y-3">
                    {studentBirthdaysToday.length > 0 && (
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Instrutores</p>
                    )}
                    {instructorBirthdaysToday.map(i => (
                      <div key={i.id} className="flex items-center gap-4 bg-indigo-50/50 dark:bg-indigo-900/20 p-4 rounded-3xl border border-indigo-100 dark:border-indigo-900/30">
                        <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-xl shadow-sm">
                          {i.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-black text-slate-800 dark:text-white uppercase italic tracking-tight leading-none mb-1">{i.name.split(' ')[0]}</p>
                          <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">{calculateAge(i.birthDate)}º Aniversário</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Trophy size={140} className="absolute -bottom-20 -right-20 text-emerald-50 dark:text-emerald-900/10 -rotate-12 group-hover:rotate-0 transition-all duration-700" />
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2 uppercase italic tracking-tight">
                <Calendar size={24} className="text-indigo-600" />
                Grade de Horários
              </h2>
              <Link to="/schedules" className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">Ver Tabela Completa</Link>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Próximas Aulas de Hoje</p>
                <div className="space-y-3">
                   {templates
                     .filter(t => t.schedules && t.schedules.some(s => s.dayOfWeek === new Date().getDay()))
                     .map(template => (
                       <div key={template.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-3">
                             <div className="w-14 h-12 rounded-xl bg-white dark:bg-slate-900 flex flex-col items-center justify-center text-indigo-600 font-black text-[9px] shadow-sm p-1">
                                <span className="leading-none">{template.schedules?.find(s => s.dayOfWeek === new Date().getDay())?.startTime}</span>
                                <div className="h-0.5 w-3 bg-indigo-100 dark:bg-indigo-900 my-0.5 rounded-full" />
                                <span className="leading-none opacity-60">{template.schedules?.find(s => s.dayOfWeek === new Date().getDay())?.endTime}</span>
                             </div>
                             <div>
                                <p className="text-xs font-black text-slate-800 dark:text-white uppercase italic">{template.name}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase">{template.durationMinutes} min</p>
                             </div>
                          </div>
                          <Users size={14} className="text-slate-300" />
                       </div>
                   ))}
                   {templates.filter(t => t.schedules && t.schedules.some(s => s.dayOfWeek === new Date().getDay())).length === 0 && (
                     <p className="text-[10px] font-bold text-slate-400 uppercase italic text-center py-4">Nenhuma aula para hoje</p>
                   )}
                </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2 uppercase italic tracking-tight">
                <AlertTriangle size={24} className="text-red-500" />
                Atenção: Evasão
              </h2>
              <Link to="/students" className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">Ver Relatório</Link>
            </div>
            <div className="space-y-3">
              {absenceAlerts.length > 0 ? (
                absenceAlerts.slice(0, 4).map(student => (
                  <div key={student.id} className="bg-white dark:bg-slate-900 p-5 rounded-[32px] border border-slate-100 dark:border-slate-800 flex items-center justify-between group hover:shadow-md transition-all shadow-sm">
                    <div className="flex items-center gap-3">
                      {student.photo ? <img src={student.photo} className="w-12 h-12 rounded-2xl object-cover" alt="" /> : <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg border ${getBeltClassName(student.belt, getBeltConfig(student.belt)?.colorKey)}`}>{student.name.charAt(0)}</div>}
                      <div>
                        <h4 className="font-black text-slate-800 dark:text-slate-100 text-sm leading-tight uppercase italic">{student.name}</h4>
                        <div className="flex items-center gap-2">
                          <BeltBadge belt={student.belt} stripes={student.stripes} colorKey={getBeltConfig(student.belt)?.colorKey} />
                          <span className={`text-[10px] font-black uppercase ${student.absentCount >= student.effectiveLimit ? 'text-red-600' : 'text-amber-600'}`}>
                            {student.absentCount} Faltas
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className={student.absentCount >= student.effectiveLimit ? 'text-red-500' : 'text-amber-500'}>
                      <AlertTriangle size={20} className={student.absentCount >= student.effectiveLimit ? 'animate-pulse' : ''} />
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-slate-50 dark:bg-slate-900/50 p-5 md:p-10 rounded-[32px] md:rounded-[40px] text-center text-slate-400 dark:text-slate-600 text-xs border border-dashed border-slate-200 dark:border-slate-800 italic">
                  Todos os atletas estão vindo treinar. Que beleza! OSS!
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <section className="space-y-4 px-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2 uppercase italic tracking-tight">
            <Trophy size={24} className="text-indigo-600" />
            Composição do Tatame
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Atletas por Graduação</p>
            <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-4 overflow-y-auto max-h-[300px] md:max-h-none pr-1 custom-scrollbar">
              {BELT_LIST.map(belt => {
                const count = (students || []).filter(s => s.belt === belt && s.status === 'Active').length;
                if (count === 0) return null;
                const isLightBelt = [Belt.WHITE, Belt.YELLOW, Belt.GREY_WHITE, Belt.YELLOW_WHITE, Belt.ORANGE_WHITE, Belt.GREEN_WHITE].includes(belt);
                return (
                  <div key={belt} className={`flex flex-col md:flex-row items-center justify-between px-3 md:px-4 py-3 rounded-2xl border ${getBeltClassName(belt, getBeltConfig(belt)?.colorKey)} shadow-sm transition-transform hover:scale-[1.02] cursor-default gap-2`}>
                    <span className={`text-[9px] md:text-[10px] font-black uppercase tracking-tight ${isLightBelt ? 'text-slate-900' : 'text-white'} truncate w-full md:w-auto text-center md:text-left`}>{belt}</span>
                    <span className={`px-2 py-0.5 rounded-lg text-[9px] md:text-[10px] font-black ${isLightBelt ? 'bg-slate-900 text-white' : 'bg-white/20 text-white'}`}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Engajamento Hoje</p>
            
            <div className="flex-1 flex flex-col md:flex-row items-center gap-4">
              <div className="w-full h-64 md:h-72 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Ativos', value: students.filter(s => s.status === 'Active').length },
                        { name: 'Inativos', value: students.filter(s => s.status === 'Inactive').length },
                        { name: 'Dropped', value: students.filter(s => s.status === 'Dropped').length }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius="60%"
                      outerRadius="90%"
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {[
                        { name: 'Ativos', color: '#22c55e' },
                        { name: 'Inativos', color: '#f59e0b' },
                        { name: 'Dropped', color: '#ef4444' }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '16px', 
                        border: 'none', 
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        textTransform: 'uppercase'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="w-full space-y-3">
                {[
                  { label: 'Ativos', count: students.filter(s => s.status === 'Active').length, color: 'bg-green-500', text: 'text-green-600' },
                  { label: 'Inativos', count: students.filter(s => s.status === 'Inactive').length, color: 'bg-amber-500', text: 'text-amber-600' },
                  { label: 'Dropped', count: students.filter(s => s.status === 'Dropped').length, color: 'bg-red-500', text: 'text-red-500' }
                ].map(st => (
                  <div key={st.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${st.color}`} />
                      <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-tight">{st.label}</span>
                    </div>
                    <span className={`text-xs font-black ${st.text}`}>{st.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modal de Detalhes do Cadastro Pendente */}
      {selectedPending && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[200] flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[40px] p-8 animate-in zoom-in duration-300 shadow-2xl border border-slate-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto custom-scrollbar relative">
            <button onClick={() => setSelectedPending(null)} className="absolute top-6 right-6 p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 hover:text-red-500 transition-colors">
              <XIcon size={24} />
            </button>
            
            <div className="flex items-center gap-4 mb-8">
              <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg">
                <UserCheck size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight uppercase italic leading-none">Análise de Cadastro</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Valide antes de liberar o acesso</p>
              </div>
            </div>

            {selectedPending.details ? (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DetailItem label="Nome" value={selectedPending.details.name} />
                  <DetailItem label="WhatsApp" value={selectedPending.details.phone} />
                  <DetailItem label="Graduação" value={`${selectedPending.details.belt} ${selectedPending.details.stripes}º G`} />
                  <DetailItem label="Nascimento" value={new Date(selectedPending.details.birthDate).toLocaleDateString()} />
                </div>
                
                <div className="flex gap-4">
                  <button 
                    onClick={() => { handleApprove(selectedPending.user); setSelectedPending(null); }}
                    className="flex-1 bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-600/20 active:scale-95 transition-all text-xs uppercase tracking-widest"
                  >
                    Confirmar Aluno
                  </button>
                  <button 
                    onClick={() => { handleReject(selectedPending.user); setSelectedPending(null); }}
                    className="flex-1 bg-red-50 text-red-600 font-black py-4 rounded-2xl hover:bg-red-100 active:scale-95 transition-all text-xs uppercase tracking-widest"
                  >
                    Rejeitar
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-slate-400">Processando dados...</div>
            )}
          </div>
        </div>
      )}
    </motion.div>

    {/* Modal: Alterar Senha */}
    {showPasswordModal && (
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[9000] flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl p-8 flex flex-col gap-6 animate-in zoom-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                <KeyRound size={20} className="text-indigo-600" />
              </div>
              <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Alterar Minha Senha</h2>
            </div>
            <button onClick={() => { setShowPasswordModal(false); setNewPass(''); setConfirmNewPass(''); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
              <X size={20} />
            </button>
          </div>
          <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1 flex items-center justify-between">
                <span>Nova Senha <span className="text-red-500">*</span></span>
                <button type="button" onClick={() => setShowPassVisibility(p => !p)} className="text-slate-400">
                  {showPassVisibility ? <EyeOff size={12} /> : <Eye size={12} />}
                </button>
              </label>
              <div className="relative">
                <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassVisibility ? 'text' : 'password'}
                  value={newPass}
                  onChange={e => setNewPass(e.target.value)}
                  placeholder="Mín. 6 caracteres"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-900 dark:text-white placeholder:text-slate-400"
                  autoFocus
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">
                Confirmar Nova Senha <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassVisibility ? 'text' : 'password'}
                  value={confirmNewPass}
                  onChange={e => setConfirmNewPass(e.target.value)}
                  placeholder="Repita a senha"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-900 dark:text-white placeholder:text-slate-400"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isSavingPass}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-black py-3 rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-[11px] mt-2"
            >
              {isSavingPass ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              {isSavingPass ? 'Salvando...' : 'Salvar Nova Senha'}
            </button>
          </form>
        </div>
      </div>
    )}
      <ConfirmDialog
        open={isConfirmingDelete && !!selectedAcademy}
        onClose={() => setIsConfirmingDelete(false)}
        onConfirm={() => selectedAcademy && handleDeleteAcademy(selectedAcademy.id)}
        title="Excluir Unidade Permanentemente?"
        message={<>Esta ação não pode ser desfeita. Todos os dados da unidade <strong className="text-slate-900 dark:text-white">{selectedAcademy?.name}</strong> serão removidos definitivamente.</>}
        confirmLabel="Sim, Excluir"
      />
    </>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string | number; trend?: string; highlight?: boolean; }> = ({ icon, label, value, trend, highlight }) => (
  <motion.div 
    whileHover={{ y: -5, scale: 1.02 }}
    className={`bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-[32px] border shadow-sm transition-all hover:shadow-xl ${highlight ? 'border-red-200 dark:border-red-900 ring-2 ring-red-100 dark:ring-red-900/20' : 'border-slate-100 dark:border-slate-800'}`}
  >
    <div className="bg-slate-50 dark:bg-slate-800 w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center mb-4 sm:mb-6 transition-colors shadow-inner">{icon}</div>
    <p className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] sm:tracking-[0.2em] leading-none mb-2">{label}</p>
    <div className="flex items-end justify-between gap-1.5 overflow-hidden">
      <h3 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white transition-colors italic tracking-tighter leading-tight shrink-0">{value}</h3>
      {trend && <span className="text-[8px] sm:text-[10px] font-black text-emerald-500 dark:text-emerald-400 mb-1 uppercase tracking-widest whitespace-nowrap shrink-0">{trend}</span>}
    </div>
  </motion.div>
);

const DetailItem: React.FC<{ label: string; value: string; isSensitive?: boolean; maskType?: 'cpf' | 'rg' | 'generic' }> = ({ label, value, isSensitive, maskType = 'generic' }) => (
  <div>
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
    {isSensitive ? (
      <PrivacyValue value={value} maskType={maskType} className="text-base" />
    ) : (
      <p className="text-base font-bold text-slate-800 dark:text-white">{value}</p>
    )}
  </div>
);

export default DashboardView;
