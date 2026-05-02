
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Academy, Student, Belt, CalendarEvent, User, Instructor, Staff, ClassTemplate, SystemPlan, SystemConfig } from '../types';
import { StorageService } from '../services/storage';
import { PrivacyValue } from '../components/PrivacyValue';
import { 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  Clock, 
  ChevronRight,
  Search,
  ShieldAlert,
  GraduationCap,
  Trophy,
  Medal,
  Award,
  Star,
  Calendar as CalendarIcon,
  AlertCircle,
  UserCheck,
  UserX,
  Check,
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
  PieChart as PieChartIcon,
  Share2,
  Smartphone
} from 'lucide-react';
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

const DashboardView: React.FC<{ academy: Academy | null; user: User; onSwitchAcademy?: (a: Academy) => void }> = ({ academy, user, onSwitchAcademy }) => {
  const [students, setStudents] = React.useState<Student[]>(academy ? StorageService.getStudents(academy.id) : []);
  const [instructors, setInstructors] = React.useState<Instructor[]>(academy ? StorageService.getInstructors(academy.id) : []);
  const [staff, setStaff] = React.useState<Staff[]>(academy ? StorageService.getStaff(academy.id) : []);
  const [users, setUsers] = React.useState<User[]>(
    user.role === 'superuser' 
      ? StorageService.getUsers() // Superuser vê todos
      : (academy ? StorageService.getUsers(academy.id) : [])
  );
  const [templates, setTemplates] = React.useState<ClassTemplate[]>(academy ? StorageService.getTemplates(academy.id) : []);
  const [selectedPending, setSelectedPending] = React.useState<{ user: User; details: any } | null>(null);
  const [lastReadChat, setLastReadChat] = React.useState<string>(academy ? localStorage.getItem(`oss_chat_last_read_${academy.id}`) || '' : '');

  React.useEffect(() => {
    if (academy) {
      setStudents(StorageService.getStudents(academy.id));
      setInstructors(StorageService.getInstructors(academy.id));
      setStaff(StorageService.getStaff(academy.id));
      
      const allAcademyUsers = StorageService.getUsers(academy.id);
      if (user.role === 'superuser') {
        const allUsers = StorageService.getUsers();
        setUsers(allUsers);
      } else {
        setUsers(allAcademyUsers);
      }
      
      setTemplates(StorageService.getTemplates(academy.id));
      setLastReadChat(localStorage.getItem(`oss_chat_last_read_${academy.id}`) || '');
    }
  }, [academy?.id, user.role]);

  const chatMessages = useMemo(() => academy ? StorageService.getChatMessages(academy.id) : [], [academy?.id]);
  
  const hasNewMessages = useMemo(() => {
    if (chatMessages.length === 0) return false;
    const latestTimestamp = chatMessages[chatMessages.length - 1].timestamp;
    return latestTimestamp > lastReadChat;
  }, [chatMessages, lastReadChat]);

  const getBeltColor = (belt: Belt) => {
    switch (belt) {
      case Belt.WHITE: return 'bg-white text-slate-900 border-slate-200';
      case Belt.GREY: return 'bg-slate-400 text-white border-slate-500';
      case Belt.YELLOW: return 'bg-yellow-400 text-slate-900 border-yellow-500';
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
      case Belt.WHITE: return { text: 'text-slate-400', bg: 'bg-slate-400', border: 'border-slate-100', shadow: 'shadow-slate-100' };
      case Belt.GREY: return { text: 'text-slate-500', bg: 'bg-slate-500', border: 'border-slate-100', shadow: 'shadow-slate-200' };
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

  const attendance = useMemo(() => academy ? StorageService.getAttendance(academy.id) : [], [academy?.id]);
  const calendarEvents = useMemo(() => academy ? StorageService.getCalendarEvents(academy.id) : [], [academy?.id]);
  const finances = useMemo(() => academy ? StorageService.getFinances(academy.id) : [], [academy?.id]);

  const pendingUsers = useMemo(() => users.filter(u => u.status === 'Pending'), [users]);

  const planExpiration = useMemo(() => {
    if (!academy || !academy.planExpirationDate) return null;
    const exp = new Date(academy.planExpirationDate + 'T23:59:59');
    const today = new Date();
    const diff = exp.getTime() - today.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return { days, date: academy.planExpirationDate };
  }, [academy?.planExpirationDate]);

  const handleApprove = (pendingUser: User) => {
    // 1. Ativar o Usuário (Acesso ao Sistema)
    const updatedUsers = users.map(u => u.id === pendingUser.id ? { ...u, status: 'Active' as const } : u);
    setUsers(updatedUsers);
    StorageService.saveUsers(updatedUsers);

    // 2. Ativar o Perfil Correspondente (Ficha Técnica)
    if (pendingUser.role === 'instructor') {
      const updated = instructors.map(i => i.email === pendingUser.email ? { ...i, status: 'Active' as const } : i);
      setInstructors(updated);
      StorageService.saveInstructors(updated);
    } else if (pendingUser.role === 'student') {
      // Ativar perfil de aluno - CRITICAL: Busca por email
      const updatedStudents = students.map(s => s.email === pendingUser.email ? { ...s, status: 'Active' as const } : s);
      setStudents(updatedStudents);
      StorageService.saveStudents(updatedStudents);
    } else if (pendingUser.role === 'staff') {
      // Ativar perfil de staff
      const updatedStaff = staff.map(st => st.email === pendingUser.email ? { ...st, status: 'Active' as const } : st);
      setStaff(updatedStaff);
      StorageService.saveStaff(updatedStaff);
    }
  };

  const handleReject = (pendingUser: User) => {
    // Remover usuário e perfil
    const updatedUsers = users.filter(u => u.id !== pendingUser.id);
    setUsers(updatedUsers);
    StorageService.saveUsers(updatedUsers);

    if (pendingUser.role === 'instructor') {
      const updated = instructors.filter(i => i.email !== pendingUser.email);
      setInstructors(updated);
      StorageService.saveInstructors(updated);
    } else {
      const updatedStudents = students.filter(s => s.email !== pendingUser.email);
      setStudents(updatedStudents);
      StorageService.saveStudents(updatedStudents);

      const updatedStaff = staff.filter(st => st.email !== pendingUser.email);
      setStaff(updatedStaff);
      StorageService.saveStaff(updatedStaff);
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

  const todayStr = new Date().toISOString().split('T')[0];
  
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

  const stats = {
    total: students.length,
    active: students.filter(s => s.status === 'Active').length,
    todayAttendance: attendance.filter(a => a.date.startsWith(todayStr)).length,
    alerts: students.filter(s => s.absentCount >= getEffectiveAbsenceLimit(s)).length
  };

  const [refreshKey, setRefreshKey] = useState(0);
  const triggerRefresh = () => setRefreshKey(prev => prev + 1);

  const globalStats = useMemo(() => {
    if (user.role !== 'superuser') return null;
    const allAcademies = StorageService.getAcademies();
    const allStudents = StorageService.getStudents();
    const allAttendance = StorageService.getAttendance();
    const allTransactions = StorageService.getFinances();
    
    // Contagem por plano
    const plansCount = allAcademies.reduce((acc, a) => {
      const plan = a.currentPlan || 'Free';
      acc[plan] = (acc[plan] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      academiesCount: allAcademies.length,
      studentsCount: allStudents.length,
      activeStudentsCount: allStudents.filter(s => s.status === 'Active').length,
      todayAttendanceCount: allAttendance.filter(a => a.date.startsWith(todayStr)).length,
      totalIncome: allTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0),
      totalMensalidades: allTransactions.filter(t => t.type === 'income' && (t.category === 'Mensalidade' || t.description.toLowerCase().includes('mensalidade'))).reduce((acc, t) => acc + t.amount, 0),
      totalExpense: allTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0),
      plansCount,
      allAcademies
    };
  }, [user.role, todayStr, refreshKey]);

  const [selectedAcademy, setSelectedAcademy] = React.useState<Academy | null>(null);
  const [isManageModalOpen, setIsManageModalOpen] = React.useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [academySearch, setAcademySearch] = React.useState('');
  
  const [systemConfig, setSystemConfig] = React.useState(StorageService.getSystemConfig());

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } }
  };

  if (!academy && user.role === 'superuser') {
    const allAcademies = StorageService.getAcademies();
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
        </motion.header>

        {globalStats && (
          <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={<Award size={22} className="text-indigo-600" />} label="Academias" value={globalStats.academiesCount} />
            <StatCard icon={<Users size={22} className="text-blue-600" />} label="Alunos Totais" value={globalStats.studentsCount} />
            <StatCard icon={<Wallet size={22} className="text-emerald-600" />} label="Rec. Mensalidades" value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(globalStats.totalMensalidades)} />
            <StatCard icon={<TrendingUp size={22} className="text-indigo-600" />} label="Receita Geral" value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(globalStats.totalIncome)} />
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
                   <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:rotate-12 transition-transform shadow-inner">
                      {a.logo ? <img src={a.logo} className="w-full h-full rounded-2xl object-cover" /> : <Award size={24} />}
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
  const [isPlanEditModalOpen, setIsPlanEditModalOpen] = React.useState(false);
  const [editingPlan, setEditingPlan] = React.useState<SystemPlan | null>(null);

  const handleUpdatePlan = (updates: Partial<SystemPlan>) => {
    if (!editingPlan) return;
    const updatedPlans = systemConfig.plans.map(p => p.id === editingPlan.id ? { ...p, ...updates } : p);
    const newConfig = { ...systemConfig, plans: updatedPlans };
    setSystemConfig(newConfig);
    StorageService.saveSystemConfig(newConfig);
    setEditingPlan(null);
    setIsPlanEditModalOpen(false);
  };

  const handleUpdateAcademyStatus = (academyId: string, updates: Partial<Academy>) => {
    const all = StorageService.getAcademies();
    const updated = all.map(a => a.id === academyId ? { ...a, ...updates } : a);
    StorageService.saveAcademies(updated);
    setIsManageModalOpen(false);
    setSelectedAcademy(null);
    triggerRefresh();
  };

  const handleDeleteAcademy = (academyId: string) => {
    StorageService.deleteAcademy(academyId);
    setIsConfirmingDelete(false);
    setIsManageModalOpen(false);
    setSelectedAcademy(null);
    triggerRefresh();
  };

  const graduationAlerts = useMemo(() => {
    return students.filter(s => {
      const age = calculateAge(s.birthDate);
      if (age < 16) return false;
      
      if (s.belt === Belt.WHITE) {
        return s.totalClasses >= 80 || (s.totalClasses >= 20 && Math.floor(s.totalClasses / 20) > s.stripes);
      }
      if ([Belt.BLUE, Belt.PURPLE, Belt.BROWN].includes(s.belt)) {
        return s.totalClasses >= 160 || (s.totalClasses >= 40 && Math.floor(s.totalClasses / 40) > s.stripes);
      }
      return false;
    }).map(s => {
      let type: 'STRIPE' | 'BELT' = 'STRIPE';
      let message = '';
      
      if (s.belt === Belt.WHITE) {
        if (s.totalClasses >= 80) {
          type = 'BELT';
          message = 'Elegível para Faixa Azul (80 aulas)';
        } else {
          const expectedStripes = Math.floor(s.totalClasses / 20);
          type = 'STRIPE';
          message = `Elegível para o ${expectedStripes}º Grau`;
        }
      } else {
        if (s.totalClasses >= 160) {
          type = 'BELT';
          message = 'Elegível para Próxima Faixa (160 aulas)';
        } else {
          const expectedStripes = Math.floor(s.totalClasses / 40);
          type = 'STRIPE';
          message = `Elegível para o ${expectedStripes}º Grau`;
        }
      }
      return { ...s, alertType: type, alertMessage: message };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [students]);

  const birthdaysToday = useMemo(() => {
    const today = new Date();
    const currentMonthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return students.filter(s => s.birthDate && s.birthDate.substring(5) === currentMonthDay);
  }, [students]);

  const financialSummary = useMemo(() => {
    const income = finances.filter(f => f.type === 'income').reduce((acc, f) => acc + f.amount, 0);
    const expense = finances.filter(f => f.type === 'expense').reduce((acc, f) => acc + f.amount, 0);
    const pendingIncome = finances.filter(f => f.type === 'income' && f.status === 'pending').reduce((acc, f) => acc + f.amount, 0);
    return { income, expense, balance: income - expense, pendingIncome };
  }, [finances]);

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
          studentBelt: student?.belt || Belt.WHITE 
        };
      });
  }, [attendance, students]);

  const studentProfile = useMemo(() => {
      if (user.role === 'student') {
        return students.find(s => s.email === user.email);
      }
      return null;
    }, [user, students]);

    const monthlyClasses = useMemo(() => {
      if (!studentProfile) return 0;
      const firstDayOfMonth = new Date();
      firstDayOfMonth.setDate(1);
      firstDayOfMonth.setHours(0,0,0,0);
      
      return attendance.filter(a => 
        a.studentId === studentProfile.id && 
        new Date(a.date) >= firstDayOfMonth
      ).length;
    }, [attendance, studentProfile]);

    const instructorProfile = useMemo(() => {
    if (user.role === 'instructor') {
      return instructors.find(i => i.email === user.email);
    }
    return null;
  }, [user, instructors]);

  const staffProfile = useMemo(() => {
    if (user.role === 'staff') {
      return staff.find(s => s.email === user.email);
    }
    return null;
  }, [user, staff]);

  if (user.role === 'student') {
    // Busca o perfil do aluno logado
    const profileFound = students.find(s => s.email === user.email);
    
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
    
    return (
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-8 pb-12 p-2"
      >
        <motion.header variants={itemVariants} className="px-2 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter uppercase italic leading-none">
              BOM DIA, {user.name.split(' ')[0]}!
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-bold mt-2 uppercase text-[10px] tracking-[0.2em]">Sua evolução no Tatame da {academy?.name}</p>
          </div>
          <Link to="/profile" className="hidden md:flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2 rounded-2xl border border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:border-indigo-200 transition-all shadow-sm">
            Ficha Completa
            <ChevronRight size={14} />
          </Link>
        </motion.header>

        {/* BENTO GRID - STUDENT */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 px-2">
          
          {/* CARTÃO VIRTUAL - DESTAQUE */}
          <motion.div variants={itemVariants} className="md:col-span-4 space-y-4">
             <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-[40px] text-white shadow-2xl relative overflow-hidden group h-full">
               <div className="relative z-10 flex flex-col justify-between h-full min-h-[220px]">
                 <div className="flex justify-between items-start">
                   <div>
                     <h2 className="text-2xl font-black italic tracking-tighter uppercase leading-none">ID DIGITAL</h2>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">{academy?.name}</p>
                   </div>
                   <Trophy size={32} className="text-indigo-400 opacity-50" />
                 </div>

                 <div className="mt-8">
                   <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Atleta</p>
                   <h3 className="text-xl font-black uppercase italic tracking-tight">{profile.name}</h3>
                   <div className="mt-2 flex items-center gap-2">
                     <BeltBadge belt={profile.belt} stripes={profile.stripes} />
                     <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Status: {profile.status === 'Active' ? 'Ativo' : 'Pendente'}</span>
                   </div>
                 </div>

                 <div className="absolute right-4 bottom-4 bg-white p-2 rounded-2xl shadow-xl transform rotate-3 group-hover:rotate-0 transition-transform duration-500">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=oss_id_${profile.id}`} 
                      alt="QR Entry" 
                      className="w-16 h-16 md:w-20 md:h-20 grayscale hover:grayscale-0 transition-all"
                    />
                 </div>
               </div>
               <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
             </div>
          </motion.div>

          {/* ESTATÍSTICAS E PROGRESSO */}
          <div className="md:col-span-8 flex flex-col gap-6">
            <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <StatCard 
                icon={<TrendingUp className="text-indigo-600" />} 
                label="Total de Aulas" 
                value={profile.totalClasses} 
                trend="OSS!" 
              />
              <StatCard 
                icon={<CheckCircle2 className="text-emerald-500" />} 
                label="Treinos no Mês" 
                value={monthlyClasses} 
                trend="Foco total" 
              />
              <StatCard 
                icon={<Clock className="text-blue-500" />} 
                label="Horas Roladas" 
                value={`${profile.totalHours}h`} 
              />
              <StatCard 
                icon={<AlertTriangle className={profile.absentCount >= (academy.absenceLimit || 3) ? 'text-red-500' : 'text-amber-500'} />} 
                label="Faltas Consec." 
                value={profile.absentCount} 
                highlight={profile.absentCount >= (academy.absenceLimit || 3)}
              />
              <motion.button 
                whileHover={{ scale: 1.05 }}
                onClick={() => window.location.hash = '#/schedules'}
                className="bg-white dark:bg-slate-900 p-5 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm transition-all text-left flex flex-col justify-between group h-full cursor-pointer"
              >
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 group-hover:rotate-12 transition-transform">
                  <Calendar size={20} />
                </div>
                <div className="mt-4">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Horários</p>
                  <p className="text-xs font-black text-slate-800 dark:text-white uppercase italic leading-tight">Grade de Aulas</p>
                </div>
              </motion.button>
            </motion.div>

            {/* PROGRESSO DE GRADUAÇÃO */}
            <motion.div variants={itemVariants}>
              {(() => {
                const theme = getBeltTheme(profile.belt);
                const target = profile.belt === Belt.WHITE ? 80 : 160;
                const progress = Math.min(100, Math.floor((profile.totalClasses / target) * 100));
                
                return (
                  <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden relative group">
                    <div className="relative z-10 text-left">
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase italic tracking-tight flex items-center gap-2">
                          <GraduationCap size={24} className="text-indigo-600" />
                          Jornada de Graduação
                        </h2>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          {profile.totalClasses} / {target} Aulas
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="flex items-center gap-6">
                          <div className={`w-20 h-20 rounded-3xl shrink-0 flex items-center justify-center transition-all ${getBeltColor(profile.belt)} shadow-xl ${theme.shadow} dark:shadow-none`}>
                             <Medal size={40} className="opacity-80" />
                          </div>
                          <div className="flex-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Próximo Grau / Faixa</p>
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
                              {target - profile.totalClasses > 0 
                                ? `Mantenha a constância! Faltam ${target - profile.totalClasses} treinos para sua evolução.`
                                : 'Meta de aulas atingida! Aguarde a avaliação técnica.'}
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
    );
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 max-w-5xl mx-auto transition-colors pb-10 p-2"
    >
      <motion.header variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
        <div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter uppercase italic leading-none">
            BOM DIA, {user.role === 'superuser' ? 'MASTER' : user.role === 'admin' ? academy?.ownerName?.split(' ')[0] : user.name.split(' ')[0]}!
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold mt-2 uppercase text-[10px] tracking-[0.2em]">
            {user.role === 'superuser' ? 'Visão Global do Ecossistema' : `Controle total da ${academy?.name}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {user.role === 'superuser' && (
            <div className="flex items-center gap-3 bg-indigo-600 p-3 rounded-2xl text-white shadow-lg shadow-indigo-600/20">
              <ShieldCheck size={20} />
              <div className="hidden xs:block">
                <p className="text-[9px] font-black uppercase tracking-widest leading-none mb-1 opacity-80">Permissão</p>
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
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Meu Perfil</p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-800 dark:text-white uppercase">{user.role === 'instructor' ? 'Mestre' : 'Colaborador'}</span>
                  {instructorProfile && <BeltBadge belt={instructorProfile.belt} stripes={instructorProfile.stripes} />}
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
              <span className="hidden sm:inline">Marcar Recesso</span>
              <span className="sm:hidden">Recesso</span>
            </Link>
          )}
        </div>
      </motion.header>

      {/* AVISO DE MENSAGENS NO MURAL */}
      {hasNewMessages && (
        <motion.div variants={itemVariants}>
          <Link 
            to="/chat"
            className="bg-indigo-600 p-4 rounded-[32px] text-white shadow-xl shadow-indigo-500/20 flex items-center justify-between group hover:bg-indigo-700 transition-all px-6"
          >
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-2xl group-hover:scale-110 transition-transform">
                <MessageSquare size={24} />
              </div>
              <div>
                <h3 className="font-black text-sm uppercase tracking-tight">Novas Mensagens no Mural</h3>
                <p className="text-[11px] text-indigo-100 font-medium">Existem novos avisos da equipe aguardando sua leitura.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-3 py-1.5 rounded-full">Ver agora</span>
              <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
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
                {planExpiration.days <= 0 ? 'Licença Expirada!' : 'Atenção ao Vencimento'}
              </h3>
              <p className="text-[11px] opacity-90 font-medium">
                {planExpiration.days <= 0 
                  ? 'Sua licença expirou em ' + new Date(planExpiration.date + 'T12:00:00').toLocaleDateString('pt-BR') 
                  : `Sua licença vencerá em ${planExpiration.days} ${planExpiration.days === 1 ? 'dia' : 'dias'}. Renove sua assinatura.`}
              </p>
            </div>
          </div>
          <button 
            onClick={() => alert(`Entre em contato com o administrador do sistema para renovar seu plano ${academy?.currentPlan}.`)}
            className="bg-white text-slate-900 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm active:scale-95 transition-all shrink-0 ml-4"
          >
            Falar com Suporte
          </button>
        </motion.div>
      )}

      {/* LINK DE MATRÍCULA (Apenas para Admin e Superuser) */}
      {(user.role === 'admin' || user.role === 'superuser') && academy && (
        <motion.div variants={itemVariants} className="px-2">
          <div className="bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/30 rounded-[28px] sm:rounded-[32px] p-4 sm:p-6 shadow-xl shadow-indigo-500/5 overflow-hidden relative group">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 relative z-10">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 shadow-inner">
                  <Smartphone size={20} className="sm:size-[24px]" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-slate-800 dark:text-white uppercase italic tracking-tight truncate text-sm sm:text-base">Compartilhar Matrícula</h3>
                  <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">Envie o link de convite p/ novos alunos</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto">
                <div className="hidden lg:block bg-slate-50 dark:bg-slate-800 px-4 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 max-w-[200px] xl:max-w-[250px]">
                  <p className="text-[9px] font-mono text-slate-400 truncate tracking-tighter">
                    {`${window.location.origin}/#/?academyId=${academy.id}`}
                  </p>
                </div>
                <button 
                  onClick={() => {
                    const link = `${window.location.origin}/#/?academyId=${academy.id}`;
                    navigator.clipboard.writeText(link);
                  }}
                  className="p-3.5 sm:p-4 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-indigo-600 rounded-2xl transition-all active:scale-95 border border-slate-100 dark:border-slate-800 shrink-0"
                  title="Copiar Link"
                >
                  <Plus size={18} className="sm:size-[20px]" />
                </button>
                <a 
                  href={`https://wa.me/?text=${encodeURIComponent(`Olá! Faça sua matrícula na ${academy.name} através do link: ${window.location.origin}/#/?academyId=${academy.id}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 md:flex-none bg-[#25D366] hover:bg-[#128C7E] text-white px-5 sm:px-8 py-3.5 sm:py-4 rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest flex items-center justify-center gap-2 sm:gap-3 shadow-lg shadow-green-500/20 transition-all active:scale-95"
                >
                  <Share2 size={16} className="sm:size-[18px]" />
                  <span className="hidden xs:inline">WhatsApp</span>
                  <span className="xs:hidden">Enviar</span>
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
          {upcomingOffDays.map((offDay, index) => {
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
                      {isToday ? 'Atenção: Sem Aula Hoje' : `Sem Aula: ${dayName}`}
                    </h3>
                    <p className={`${isToday ? 'text-red-100' : 'text-amber-50'} font-medium opacity-90`}>
                      {offDay.reason} ({new Date(offDay.date + 'T12:00:00').toLocaleDateString('pt-BR')})
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
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${plan.color || 'bg-slate-100 text-slate-600'}`}>
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
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold uppercase shrink-0">
                        {acc.logo ? <img src={acc.logo} className="w-full h-full rounded-2xl object-cover" /> : acc.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-slate-800 dark:text-white text-sm uppercase truncate italic">{acc.name}</p>
                        <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">{acc.ownerName}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-[10px]">
                      <span className={`px-2 py-1 rounded-lg font-black uppercase tracking-tighter ${
                        acc.currentPlan === 'Black Belt' ? 'bg-slate-900 text-white' : 
                        acc.currentPlan === 'Gold' ? 'bg-yellow-100 text-yellow-700' : 
                        'bg-slate-100 text-slate-600'
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
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold uppercase">
                              {acc.logo ? <img src={acc.logo} className="w-full h-full rounded-xl object-cover" /> : acc.name.charAt(0)}
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
                            acc.currentPlan === 'Black Belt' ? 'bg-slate-900 text-white' : 
                            acc.currentPlan === 'Gold' ? 'bg-yellow-100 text-yellow-700' : 
                            'bg-slate-100 text-slate-600'
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
              <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[40px] shadow-2xl p-8 space-y-8 animate-in zoom-in-95 duration-300">
                <header className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-3xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                      {selectedAcademy.logo ? (
                        <img src={selectedAcademy.logo} className="w-full h-full rounded-3xl object-cover" />
                      ) : (
                        <ShieldCheck size={32} />
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase italic">{selectedAcademy.name}</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gestão de SaaS / Licenciamento</p>
                    </div>
                  </div>
                  <button onClick={() => setIsManageModalOpen(false)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 hover:text-red-500">
                    <X size={24} />
                  </button>
                </header>

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
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prazo de Vencimento (Licença)</label>
                    <input 
                      type="date"
                      value={selectedAcademy.planExpirationDate || ''}
                      onChange={(e) => setSelectedAcademy({ ...selectedAcademy, planExpirationDate: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-600/20 transition-all font-mono"
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
                      onClick={() => selectedAcademy && handleUpdateAcademyStatus(selectedAcademy.id, selectedAcademy)}
                      className="flex-1 py-4 bg-slate-800 text-white font-black rounded-2xl text-xs uppercase tracking-widest active:scale-95 transition-all"
                    >
                      Salvar
                    </button>
                  )}
                </div>

                {isConfirmingDelete ? (
                  <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-3xl border border-red-100 dark:border-red-900/30 animate-in slide-in-from-bottom-2 duration-300">
                    <p className="text-xs font-black text-red-600 dark:text-red-400 uppercase tracking-widest mb-4">Confirmar Exclusão Permanente?</p>
                    <div className="flex gap-2">
                       <button 
                         onClick={() => handleDeleteAcademy(selectedAcademy.id)}
                         className="flex-1 bg-red-600 text-white font-black py-4 rounded-xl text-[10px] uppercase tracking-widest shadow-lg shadow-red-600/20 active:scale-95 transition-all"
                       >
                         Sim, Excluir
                       </button>
                       <button 
                         onClick={() => setIsConfirmingDelete(false)}
                         className="flex-1 bg-white dark:bg-slate-800 text-slate-500 font-bold py-4 rounded-xl text-[10px] uppercase tracking-widest border border-slate-100 dark:border-slate-700 active:scale-95 transition-all"
                       >
                         Cancelar
                       </button>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => setIsConfirmingDelete(true)}
                    className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-black py-4 rounded-2xl active:scale-95 transition-all text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                    <Trash2 size={16} />
                    Excluir Unidade Permanentemente
                  </button>
                )}
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
                          'bg-slate-100 text-slate-600'
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
        <StatCard icon={<CheckCircle2 size={22} className="text-green-500" />} label="Presenças Hoje" value={stats.todayAttendance} />
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
              <div className="h-full bg-white w-[72%] rounded-full" />
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
                  <div key={att.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 group hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        {att.studentPhoto ? (
                          <img src={att.studentPhoto} className="w-12 h-12 rounded-2xl object-cover" />
                        ) : (
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg ${BELT_COLORS[att.studentBelt].split(' ')[0]}`}>
                            {att.studentName.charAt(0)}
                          </div>
                        )}
                        <div className="absolute -right-1 -bottom-1 bg-green-500 w-4 h-4 rounded-full border-2 border-white dark:border-slate-800" />
                      </div>
                      <div>
                        <h4 className="font-black text-slate-800 dark:text-white text-sm leading-tight uppercase italic">{att.studentName}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <BeltBadge belt={att.studentBelt} stripes={0} />
                          <span className="text-[10px] font-bold text-slate-400 capitalize">
                            {new Date(att.date).toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] font-black text-indigo-600 uppercase tracking-tighter">Check-in Realizado</p>
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
                      {student.photo ? <img src={student.photo} className="w-12 h-12 rounded-2xl object-cover" alt="" /> : <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg ${BELT_COLORS[student.belt].split(' ')[0]}`}>{student.name.charAt(0)}</div>}
                      <div>
                        <h4 className="font-black text-slate-800 dark:text-slate-100 text-sm leading-tight uppercase italic">{student.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <BeltBadge belt={student.belt} stripes={student.stripes} />
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
                <div className="col-span-2 bg-slate-50 dark:bg-slate-900/50 p-10 rounded-[40px] text-center text-slate-400 dark:text-slate-600 text-xs border border-dashed border-slate-200 dark:border-slate-800">
                  Nenhum atleta atingiu a meta de frequência ainda. OSS!
                </div>
              )}
            </div>
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

          {birthdaysToday.length > 0 && (
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-emerald-100 dark:border-emerald-900/30 shadow-xl shadow-emerald-500/5 relative overflow-hidden group">
              <div className="relative z-10">
                <h3 className="text-lg font-black text-emerald-600 uppercase italic tracking-tight mb-6 flex items-center gap-3">
                  <Medal size={24} />
                  Dia de Celebração
                </h3>
                <div className="space-y-4">
                  {birthdaysToday.map(s => (
                    <div key={s.id} className="flex items-center gap-4 bg-emerald-50/50 dark:bg-emerald-900/20 p-4 rounded-3xl border border-emerald-100 dark:border-emerald-900/30">
                      <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-black text-xl shadow-sm">
                        {s.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-black text-slate-800 dark:text-white uppercase italic tracking-tight leading-none mb-1">{s.name.split(' ')[0]}</p>
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">{calculateAge(s.birthDate)} Aniversário</p>
                      </div>
                    </div>
                  ))}
                </div>
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
                   {academy && StorageService.getTemplates(academy.id)
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
                   {(!academy || StorageService.getTemplates(academy.id).filter(t => t.schedules && t.schedules.some(s => s.dayOfWeek === new Date().getDay())).length === 0) && (
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
                      {student.photo ? <img src={student.photo} className="w-12 h-12 rounded-2xl object-cover" alt="" /> : <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg ${BELT_COLORS[student.belt].split(' ')[0]}`}>{student.name.charAt(0)}</div>}
                      <div>
                        <h4 className="font-black text-slate-800 dark:text-slate-100 text-sm leading-tight uppercase italic">{student.name}</h4>
                        <div className="flex items-center gap-2">
                          <BeltBadge belt={student.belt} stripes={student.stripes} />
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
                <div className="bg-slate-50 dark:bg-slate-900/50 p-10 rounded-[40px] text-center text-slate-400 dark:text-slate-600 text-xs border border-dashed border-slate-200 dark:border-slate-800 italic">
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
              {[Belt.WHITE, Belt.GREY, Belt.YELLOW, Belt.ORANGE, Belt.GREEN, Belt.BLUE, Belt.PURPLE, Belt.BROWN, Belt.BLACK].map(belt => {
                const count = (students || []).filter(s => s.belt === belt && s.status === 'Active').length;
                if (count === 0) return null;
                const isLightBelt = belt === Belt.WHITE || belt === Belt.YELLOW;
                return (
                  <div key={belt} className={`flex flex-col md:flex-row items-center justify-between px-3 md:px-4 py-3 rounded-2xl border ${BELT_COLORS[belt]} shadow-sm transition-transform hover:scale-[1.02] cursor-default gap-2`}>
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
                        { name: 'Dropout', value: students.filter(s => s.status === 'Dropout').length }
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
                        { name: 'Dropout', color: '#ef4444' }
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
                  { label: 'Dropout', count: students.filter(s => s.status === 'Dropout').length, color: 'bg-red-500', text: 'text-red-500' }
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
