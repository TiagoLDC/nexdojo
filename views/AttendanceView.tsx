
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Student, ClassSession, User, ClassTemplate, Belt, Academy } from '../types';
import { useTranslation } from '../services/LanguageContext';
import { attendanceService } from '@/features/attendance/services/attendanceService';
import { templateService } from '@/features/schedules/services/templateService';
import { studentService } from '@/features/students/services/studentService';
import {
  Search,
  CheckCircle,
  Plus,
  ChevronLeft,
  Users,
  QrCode,
  X,
  Zap,
  Monitor,
  Trophy,
  Star,
  Timer,
  RefreshCw,
  Globe,
  Loader2,
  User as UserIcon,
  History
} from 'lucide-react';
import { BeltBadge } from '../components/BeltBadge';
import { BELT_COLORS } from '../constants';

declare const Html5Qrcode: any;

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

const getGraduationMilestone = (student: Student, t: any) => {
  const nextTotal = student.totalClasses + 1;

  if (student.belt === Belt.WHITE) {
    if (nextTotal === 80) return t.eligibleNewBelt;
    if (nextTotal % 20 === 0 && student.stripes < 4) return t.milestoneStripe.replace('{stripe}', (nextTotal / 20).toString());
  } else if ([Belt.GREY, Belt.YELLOW, Belt.ORANGE, Belt.GREEN].includes(student.belt)) {
    if (nextTotal === 100) return t.eligibleNewBelt;
    if (nextTotal % 25 === 0 && student.stripes < 4) return t.milestoneStripe.replace('{stripe}', (nextTotal / 25).toString());
  } else if ([Belt.BLUE, Belt.PURPLE, Belt.BROWN].includes(student.belt)) {
    if (nextTotal === 160) return t.eligibleNewBelt;
    if (nextTotal % 40 === 0 && student.stripes < 4) return t.milestoneStripe.replace('{stripe}', (nextTotal / 40).toString());
  } else if (student.belt === Belt.BLACK) {
    if (nextTotal % 300 === 0 && student.stripes < 6) return t.milestoneStripe.replace('{stripe}', (nextTotal / 300).toString());
  }
  return null;
};

const AttendanceView: React.FC<{ academy: Academy; user: User }> = ({ academy, user }) => {
  const { t, language } = useTranslation();
  const [students, setStudents] = useState<Student[]>([]);
  const [templates, setTemplates] = useState<ClassTemplate[]>([]);
  const [allClasses, setAllClasses] = useState<ClassSession[]>([]);
  const [currentClass, setCurrentClass] = useState<ClassSession | null>(null);
  const [confirmingStudent, setConfirmingStudent] = useState<Student | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [showAllStudents, setShowAllStudents] = useState(false);

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isKioskMode, setIsKioskMode] = useState(false);
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [lastScannedStudent, setLastScannedStudent] = useState<Student | null>(null);
  const [graduationMilestone, setGraduationMilestone] = useState<string | null>(null);
  const [recentScans, setRecentScans] = useState<Student[]>([]);

  const [search, setSearch] = useState('');
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [_editingClassInitialIds, setEditingClassInitialIds] = useState<Set<string>>(new Set());
  const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  const html5QrCodeRef = useRef<any>(null);
  const scanTimeoutRef = useRef<any>(null);

  const [showFullHistory, setShowFullHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyDateFilter, setHistoryDateFilter] = useState('');

  const loadData = async () => {
    if (!academy) return;
    setIsLoading(true);
    try {
      const [studentsRes, templatesRes, sessionsRes] = await Promise.all([
        studentService.getAll(academy.id, { limit: 1000 }),
        templateService.getAll(academy.id, { limit: 1000 }),
        attendanceService.getSessions(academy.id, { limit: 1000 }),
      ]);
      setStudents((studentsRes.data || []).filter((s: Student) => s.status === 'Active'));
      setTemplates(templatesRes.data || []);
      setAllClasses(sessionsRes.data || []);
    } catch (err) {
      console.error('Erro ao carregar dados de chamada:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        setIsInputFocused(true);
      }
    };
    const handleBlur = () => {
      setIsInputFocused(false);
    };

    window.addEventListener('focusin', handleFocus);
    window.addEventListener('focusout', handleBlur);

    return () => {
      window.removeEventListener('focusin', handleFocus);
      window.removeEventListener('focusout', handleBlur);
    };
  }, []);

  useEffect(() => {
    loadData();
  }, [academy]);

  const handleCheckIn = (student: Student) => {
    const studentId = student.id;
    const isAlreadyChecked = checkedIds.has(studentId);
    const next = new Set(checkedIds);

    if (isAlreadyChecked) {
      next.delete(studentId);
    } else {
      next.add(studentId);
    }

    setCheckedIds(next);

    if (currentClass) {
      const attendanceIds = Array.from(next) as string[];
      const updatedClass = { ...currentClass, attendanceIds };
      setCurrentClass(updatedClass);
      // Update in allClasses list locally
      setAllClasses(prev => prev.map(c => c.id === currentClass.id ? updatedClass : c));
      // Persist to API (best-effort, non-blocking)
      attendanceService.updateSession(currentClass.id, { attendanceIds }).catch(err =>
        console.error('Erro ao atualizar sessão:', err)
      );
    }

    if (!isAlreadyChecked) {
      if (navigator.vibrate) navigator.vibrate(50);
    }
  };

  const handleSelectStudent = (student: Student) => {
    if (checkedIds.has(student.id)) {
      handleCheckIn(student);
    } else {
      setConfirmingStudent(student);
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        await html5QrCodeRef.current.clear();
        html5QrCodeRef.current = null;
      } catch (err) {
        console.warn("Erro ao parar scanner:", err);
      }
    }
  };

  const lastScannedIdRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    if ((isScannerOpen || isKioskMode) && currentClass) {
      const startCamera = async () => {
        await new Promise(resolve => setTimeout(resolve, 300));

        const qrElement = document.getElementById("qr-reader");
        if (!qrElement) return;

        try {
          if (html5QrCodeRef.current) return;

          const html5QrCode = new Html5Qrcode("qr-reader");
          html5QrCodeRef.current = html5QrCode;

          const qrBoxFunction = (viewfinderWidth: number, viewfinderHeight: number) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const qrboxSize = Math.floor(minEdge * 0.7);
            return {
              width: qrboxSize,
              height: qrboxSize
            };
          };

          const config = {
            fps: 15,
            qrbox: qrBoxFunction,
            disableFlip: false
          };

          const onScanSuccess = (decodedText: string) => {
            if (lastScannedIdRef.current === decodedText && scanTimeoutRef.current) {
              return;
            }

            const student = students.find(s => s.id === decodedText);
            if (student) {
              if (scanTimeoutRef.current) {
                clearTimeout(scanTimeoutRef.current);
              }

              handleCheckIn(student);

              const milestone = getGraduationMilestone(student, t);
              setLastScannedStudent(student);
              lastScannedIdRef.current = student.id;
              setGraduationMilestone(milestone);
              setRecentScans(prev => {
                const isAlreadyInRecent = prev.some(s => s.id === student.id);
                if (isAlreadyInRecent) return prev;
                return [student, ...prev.slice(0, 10)];
              });

              if (navigator.vibrate) milestone ? navigator.vibrate([100, 50, 200, 50, 300]) : navigator.vibrate(50);

              scanTimeoutRef.current = setTimeout(() => {
                if (isMounted) {
                  setLastScannedStudent(null);
                  lastScannedIdRef.current = null;
                  setGraduationMilestone(null);
                  scanTimeoutRef.current = null;
                }
              }, milestone ? 5000 : 2500);
            }
          };

          await html5QrCode.start(
            { facingMode: "environment" },
            config,
            onScanSuccess,
            () => {}
          );
        } catch (err) {
          console.error("Erro ao iniciar câmera:", err);
        }
      };

      startCamera();
    }

    return () => {
      isMounted = false;
      if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
      stopScanner();
    };
  }, [isScannerOpen, isKioskMode, currentClass, students]);

  const currentTemplate = useMemo(() => {
    if (!currentClass?.templateId) return null;
    return templates.find(t => t.id === currentClass.templateId);
  }, [currentClass, templates]);

  const filteredStudents = useMemo(() => {
    if (!currentClass) return [];

    let baseList = students;
    if (currentTemplate && !showAllStudents) {
      baseList = students.filter(s => currentTemplate.assignedStudentIds.includes(s.id));
    }

    return baseList
      .filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [currentClass, students, search, currentTemplate, showAllStudents]);

  const startClass = async (name: string, templateId?: string, duration = 60) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const existing = allClasses.find(c => {
      const classDate = c.date.split('T')[0];
      return classDate === todayStr && (templateId ? c.templateId === templateId : c.name === name);
    });

    if (existing) {
      if (confirm(t.duplicateAttendanceToday.replace('{name}', name))) {
        setCurrentClass(existing);
        setCheckedIds(new Set(existing.attendanceIds));
        setEditingClassInitialIds(new Set(existing.attendanceIds));
        setShowAllStudents(!templateId);
        return;
      }
    }

    try {
      const newSession = await attendanceService.createSession(academy.id, {
        name,
        templateId,
        date: new Date().toISOString(),
        durationMinutes: duration,
        instructorId: user.id,
        attendanceIds: [],
        status: 'In Progress',
      });
      setAllClasses(prev => [newSession, ...prev]);
      setCurrentClass(newSession);
      setCheckedIds(new Set());
      setEditingClassInitialIds(new Set());
      setShowAllStudents(!templateId);
    } catch (err) {
      console.error('Erro ao criar sessão:', err);
      alert('Erro ao iniciar treino. Tente novamente.');
    }
  };

  const handleEditClass = (session: ClassSession) => {
    setCurrentClass(session);
    setCheckedIds(new Set(session.attendanceIds));
    setEditingClassInitialIds(new Set(session.attendanceIds));
    setShowAllStudents(!session.templateId);
  };

  const handleDiscardClass = async () => {
    if (!currentClass) return;
    setCurrentClass(null);
    setIsDiscardModalOpen(false);
    setCheckedIds(new Set());
    setEditingClassInitialIds(new Set());
    await stopScanner();
  };

  const handleDeleteCurrentClass = async () => {
    if (!currentClass) return;

    if (confirm(t.confirmDeleteClass || "Tem certeza que deseja apagar esta aula e todos os registros nela?")) {
      try {
        await attendanceService.updateSession(currentClass.id, { status: 'Deleted' as any });
        setAllClasses(prev => prev.filter(c => c.id !== currentClass.id));
        setCurrentClass(null);
        setIsDiscardModalOpen(false);
        setCheckedIds(new Set());
        setEditingClassInitialIds(new Set());
        await stopScanner();
      } catch (err) {
        console.error('Erro ao excluir sessão:', err);
        alert(t.errorDeletingClass || 'Erro ao excluir aula. Tente novamente.');
      }
    }
  };

  const handleFinishClass = async () => {
    if (!currentClass || isProcessing) return;
    setIsProcessing(true);

    try {
      await stopScanner();
      setIsScannerOpen(false);
      setIsKioskMode(false);

      await new Promise(resolve => setTimeout(resolve, 300));

      const currentAttendanceIds = Array.from(checkedIds) as string[];

      // Update session to Finalized with final attendanceIds
      await attendanceService.updateSession(currentClass.id, {
        attendanceIds: currentAttendanceIds,
        status: 'Finalized',
      });

      // Create attendance records for each checked student
      const date = currentClass.date;
      await Promise.all(
        currentAttendanceIds.map(studentId =>
          attendanceService.createRecord(academy.id, {
            studentId,
            classId: currentClass.id,
            date,
            durationMinutes: currentClass.durationMinutes,
          }).catch(err => console.warn('Erro ao criar registro de presença:', err))
        )
      );

      setAllClasses(prev =>
        prev.map(c => c.id === currentClass.id ? { ...c, attendanceIds: currentAttendanceIds, status: 'Finalized' } : c)
      );

      setShowSuccess(true);
      setCheckedIds(new Set());
      setEditingClassInitialIds(new Set());
      setCurrentClass(null);
      setIsFinishModalOpen(false);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error("Erro ao encerrar aula:", error);
      alert("Ocorreu um erro ao finalizar o treino. Por favor, tente novamente.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuickFinalize = async (session: ClassSession) => {
    if (isProcessing || !session) return;

    const attendanceIds = session.attendanceIds || [];
    const attendanceCount = attendanceIds.length;

    if (attendanceCount === 0) {
      if (!confirm(`O treino "${session.name}" não possui alunos registrados no tatame. Deseja finalizar assim mesmo?`)) {
        return;
      }
    } else {
      const confirmMessage = t.confirmFinishTraining
        ?.replace('{name}', session.name || '')
        ?.replace('{count}', attendanceCount.toString()) ||
        `Deseja finalizar o treino "${session.name}" agora? As presenças de ${attendanceCount} alunos serão computadas.`;

      if (!confirm(confirmMessage)) return;
    }

    setIsProcessing(true);

    try {
      // Update session status to Finalized
      await attendanceService.updateSession(session.id, { status: 'Finalized' });

      // Create attendance records
      const date = session.date || new Date().toISOString();
      await Promise.all(
        attendanceIds.map((studentId: string) =>
          attendanceService.createRecord(academy.id, {
            studentId,
            classId: session.id,
            date,
            durationMinutes: session.durationMinutes || 60,
          }).catch(err => console.warn('Erro ao criar registro de presença:', err))
        )
      );

      setAllClasses(prev =>
        prev.map(c => c.id === session.id ? { ...c, status: 'Finalized' as const } : c)
      );

      if (currentClass && currentClass.id === session.id) {
        setCurrentClass(prev => prev ? { ...prev, status: 'Finalized' } : null);
      }

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error("Erro ao finalizar rapidamente:", error);
      alert("Ocorreu um erro ao processar. Tente novamente.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!currentClass) {
    return (
      <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-300 pb-10">
        <header>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight dark:text-white">{t.selectTraining}</h1>
          <p className="text-slate-500 font-medium">{t.chooseClass}</p>
        </header>

        {showSuccess && (
          <div className="bg-green-100 border border-green-200 text-green-700 px-5 py-4 rounded-[24px] flex items-center gap-3 animate-bounce">
            <CheckCircle size={24} />
            <span className="font-bold">{t.attendanceSuccess}</span>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-indigo-500" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => startClass(t.generalAttendance, undefined, 60)}
                className="col-span-full bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 rounded-[32px] text-white shadow-xl shadow-indigo-200 text-left hover:scale-[1.02] transition-all group"
              >
                <div className="bg-white/20 w-12 h-12 rounded-2xl flex items-center justify-center mb-4">
                  <Globe size={24} />
                </div>
                <h4 className="font-black text-xl leading-tight">{t.generalAttendance}</h4>
                <p className="text-indigo-100 text-sm mt-1 font-medium">{t.listAllStudents}</p>
              </button>

              <h3 className="col-span-full text-xs font-black text-slate-400 uppercase tracking-widest px-1 mt-4">{t.registeredClasses}</h3>

              {templates.map(t => (
                <button key={t.id} onClick={() => startClass(t.name, t.id, t.durationMinutes)} className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm text-left hover:border-indigo-400 hover:shadow-md transition-all group">
                  <div className="bg-indigo-50 dark:bg-indigo-950/30 w-12 h-12 rounded-2xl flex items-center justify-center text-indigo-600 mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <Users size={24} />
                  </div>
                  <h4 className="font-bold text-slate-800 dark:text-white leading-tight mb-1">{t.name}</h4>
                  <p className="text-xs text-slate-400 font-medium">{t.durationMinutes} minutos</p>
                </button>
              ))}

              <button onClick={() => startClass(t.singleClass)} className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-[32px] border border-dashed border-slate-300 dark:border-slate-800 text-left hover:bg-slate-100 transition-all flex flex-col justify-center">
                <Plus size={24} className="text-slate-400 mb-4" />
                <h4 className="font-bold text-slate-500 italic">{t.singleClass}</h4>
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-tighter mt-1">{t.manual}</p>
              </button>
            </div>

            {/* Chamadas Recentes / Hoje */}
            <div className="space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">{t.recentTrainings}</h3>
              <div className="space-y-3">
                {allClasses.slice(0, 5).map(c => (
                  <div key={c.id} className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-center justify-between group hover:border-indigo-300 dark:hover:border-indigo-500 transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`p-4 rounded-2xl flex flex-col items-center justify-center min-w-[60px] ${c.status === 'Finalized' ? 'bg-green-50 dark:bg-green-950/20 text-green-600' : 'bg-amber-50 dark:bg-amber-950/20 text-amber-600'}`}>
                        <span className="text-[10px] font-black uppercase leading-none mb-1 opacity-60">
                          {new Date(c.date).toLocaleDateString(language === 'pt' ? 'pt-BR' : language === 'es' ? 'es-ES' : 'en-US', { month: 'short' })}
                        </span>
                        <span className="text-lg font-black leading-none">
                          {new Date(c.date).getDate()}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 dark:text-white text-base leading-tight">{c.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest whitespace-nowrap">
                            {new Date(c.date).toLocaleTimeString(language === 'pt' ? 'pt-BR' : language === 'es' ? 'es-ES' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ring-1 ${
                            c.status === 'Finalized'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-600 ring-green-200 dark:ring-green-900/50'
                              : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 ring-amber-200 dark:ring-amber-900/50'
                          }`}>
                            {c.status === 'Finalized' ? t.finalized : t.inProgress}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {c.status === 'In Progress' && (
                        <button
                          onClick={() => handleQuickFinalize(c)}
                          disabled={isProcessing}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-green-600/20"
                        >
                          {t.computeAttendance}
                        </button>
                      )}
                      <button
                        onClick={() => handleEditClass(c)}
                        className="bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-100 transition-all active:scale-95 shadow-sm"
                      >
                        {t.edit}
                      </button>
                    </div>
                  </div>
                ))}
                {allClasses.length > 5 && (
                  <button
                    onClick={() => setShowFullHistory(true)}
                    className="w-full py-4 text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] hover:underline"
                  >
                    {t.fullHistory}
                  </button>
                )}
                {allClasses.length === 0 && (
                  <p className="text-center py-6 text-slate-400 text-sm italic">{t.noTrainingsYet}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal de Histórico Completo */}
        {showFullHistory && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[150] flex items-end md:items-center justify-center p-0 md:p-6">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl md:rounded-[40px] rounded-t-[40px] p-6 md:p-8 animate-in slide-in-from-bottom md:zoom-in duration-500 md:duration-300 shadow-2xl flex flex-col max-h-[95vh] md:max-h-[85vh]">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase italic tracking-tight">{t.trainingHistory}</h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{t.allCallsMade}</p>
                </div>
                <button onClick={() => setShowFullHistory(false)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 hover:text-red-500 transition-all active:scale-90">
                  <X size={24} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder={t.searchClass}
                    value={historySearch}
                    onChange={e => setHistorySearch(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl pl-10 pr-4 py-3.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="date"
                    value={historyDateFilter}
                    onChange={e => setHistoryDateFilter(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl pl-10 pr-4 py-3.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar pb-6">
                {allClasses
                  .filter(c => {
                    const matchesSearch = c.name.toLowerCase().includes(historySearch.toLowerCase());
                    const matchesDate = historyDateFilter ? c.date.startsWith(historyDateFilter) : true;
                    return matchesSearch && matchesDate;
                  })
                  .map(c => (
                    <div key={c.id} className="bg-slate-50 dark:bg-slate-800 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-center justify-between hover:bg-white dark:hover:bg-slate-700 transition-all group">
                      <div className="flex items-center gap-4">
                        <div className={`p-4 rounded-2xl flex flex-col items-center justify-center min-w-[60px] ${c.status === 'Finalized' ? 'bg-green-100 dark:bg-green-950 text-green-600' : 'bg-amber-100 dark:bg-amber-950 text-amber-600'}`}>
                          <span className="text-[10px] font-black uppercase leading-none mb-1 opacity-60">
                            {new Date(c.date).toLocaleDateString(language === 'pt' ? 'pt-BR' : language === 'es' ? 'es-ES' : 'en-US', { month: 'short' })}
                          </span>
                          <span className="text-lg font-black leading-none">
                            {new Date(c.date).getDate()}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 dark:text-white text-sm leading-tight">{c.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest block">
                              {new Date(c.date).toLocaleDateString(language === 'pt' ? 'pt-BR' : language === 'es' ? 'es-ES' : 'en-US')} às {new Date(c.date).toLocaleTimeString(language === 'pt' ? 'pt-BR' : language === 'es' ? 'es-ES' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md ${
                              c.status === 'Finalized' ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600'
                            }`}>
                              {c.status === 'Finalized' ? t.finalized : t.inProgress}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {c.status === 'In Progress' && (
                          <button
                            onClick={() => {
                              handleQuickFinalize(c);
                              setShowFullHistory(false);
                            }}
                            disabled={isProcessing}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:shadow-lg transition-all"
                          >
                            {t.computeAttendance}
                          </button>
                        )}
                        <button
                          onClick={() => {
                            handleEditClass(c);
                            setShowFullHistory(false);
                          }}
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                        >
                          {t.edit}
                        </button>
                      </div>
                    </div>
                  ))}
                {allClasses.length === 0 && (
                  <div className="text-center py-20">
                    <History size={48} className="mx-auto mb-4 text-slate-300" />
                    <p className="text-slate-400 font-bold italic">{t.noTrainingsYet}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-40 animate-in fade-in duration-300">
      <header className="sticky top-0 bg-slate-50 dark:bg-slate-950 pt-2 z-10 space-y-4 pb-4 px-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDiscardModalOpen(true)}
              className="bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:bg-slate-100 transition-colors flex items-center gap-2"
            >
              <X size={20} />
              <span className="font-bold text-xs">{t.exit}</span>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-slate-800 dark:text-white leading-tight truncate max-w-[150px]">{currentClass.name}</h1>
                <div className={`w-2 h-2 rounded-full ${currentClass.status === 'Finalized' ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`} />
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  {new Date(currentClass.date).toLocaleDateString(language === 'pt' ? 'pt-BR' : language === 'es' ? 'es-ES' : 'en-US')}
                </div>
                <span className="text-slate-200">|</span>
                <p className="text-[9px] text-indigo-500 font-black uppercase tracking-widest">{checkedIds.size} {t.onMat}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFinishModalOpen(true)}
              className="hidden sm:flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-2xl font-bold text-xs shadow-lg shadow-green-600/20 active:scale-95 transition-all"
            >
              <CheckCircle size={18} /> {t.computeAttendance}
            </button>
            <button onClick={() => setIsKioskMode(true)} className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-4 py-3 rounded-2xl font-bold text-xs border border-indigo-100 dark:border-indigo-900/50 shadow-sm"><Monitor size={18} /> {t.totem}</button>
            <button onClick={() => setIsScannerOpen(true)} className="bg-slate-900 dark:bg-indigo-600 text-white p-3 rounded-2xl shadow-lg hover:bg-slate-800 transition-all active:scale-95"><QrCode size={20} /></button>
          </div>
        </div>

        <div className="space-y-3">
          {currentClass.templateId && (
            <div className="flex bg-slate-200/50 dark:bg-slate-900 p-1 rounded-2xl">
              <button
                onClick={() => setShowAllStudents(false)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${!showAllStudents ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-400'}`}
              >
                <Users size={14} /> {t.thisClass}
              </button>
              <button
                onClick={() => setShowAllStudents(true)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${showAllStudents ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-400'}`}
              >
                <Globe size={14} /> {t.allStudents}
              </button>
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder={t.searchStudentEntry} value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl pl-12 pr-4 py-4 outline-none shadow-sm focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white" />
          </div>
        </div>
      </header>

      <div className={`space-y-2 pb-60 md:pb-0 ${isInputFocused ? 'opacity-40 pointer-events-none' : ''}`}>
        {filteredStudents.length > 0 ? filteredStudents.map(student => {
          const isChecked = checkedIds.has(student.id);
          const isGuest = currentTemplate && !currentTemplate.assignedStudentIds.includes(student.id);

          return (
            <div key={student.id} onClick={() => handleSelectStudent(student)}
              className={`flex items-center justify-between p-4 rounded-[28px] border transition-all cursor-pointer ${isChecked ? 'bg-green-100 dark:bg-green-900/30 border-green-400 dark:border-green-700 ring-1 ring-green-400/20 shadow-sm shadow-green-100' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-300'}`}>
              <div className="flex items-center gap-4">
                <div className="relative">
                  {student.photo ? (
                    <img src={student.photo} className="w-12 h-12 rounded-2xl object-cover border-2 border-white dark:border-slate-800 shadow-sm" />
                  ) : (
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 border-white dark:border-slate-800 shadow-sm ${BELT_COLORS[student.belt]}`}>
                      <UserIcon size={24} className="opacity-40" />
                    </div>
                  )}
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-800 ${BELT_COLORS[student.belt].split(' ')[0]}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className={`font-bold text-sm ${isChecked ? 'text-green-800 dark:text-green-400' : 'text-slate-800 dark:text-white'}`}>{student.name}</h4>
                    {isGuest && <span className="text-[8px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded-full font-black uppercase">Visitante</span>}
                  </div>
                  <BeltBadge belt={student.belt} stripes={student.stripes} />
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{student.totalClasses} aulas</p>
                    <span className="text-slate-300">•</span>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{calculateAge(student.birthDate)} anos</p>
                    {student.lastAttendance && (
                      <>
                        <span className="text-slate-300">•</span>
                        <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Até {new Date(student.lastAttendance).toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US')}</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className={`w-10 h-10 rounded-2xl border-2 flex items-center justify-center transition-all ${isChecked ? 'bg-green-500 border-green-500 shadow-xl shadow-green-500/40 scale-105' : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800'}`}>
                {isChecked ? <CheckCircle size={20} className="text-white" /> : <Plus size={18} className="text-slate-300" />}
              </div>
            </div>
          );
        }) : (
          <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-[32px] border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
            <Users size={40} className="mx-auto mb-4 opacity-10" />
            <p className="text-sm font-medium">{t.noStudentsFound}</p>
          </div>
        )}
      </div>

      {!isInputFocused && (
        <div className="fixed bottom-28 left-4 right-4 md:relative md:bottom-0 md:left-0 md:right-0 z-[100] transition-all duration-300">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-[40px] shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col gap-3">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <Timer size={18} className="text-slate-400" />
                <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{t.openTraining}</span>
              </div>
              <button onClick={() => setCurrentClass(null)} className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase flex items-center gap-1 hover:underline">
                <RefreshCw size={12} /> {t.changeClass}
              </button>
            </div>
            <button
              onClick={() => setIsFinishModalOpen(true)}
              disabled={isProcessing}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white font-black py-5 rounded-[30px] shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95"
            >
              {isProcessing ? <Loader2 size={24} className="animate-spin" /> : <CheckCircle size={24} />}
              {isProcessing ? t.processing : t.computeAttendance}
            </button>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Descarte */}
      {isDiscardModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[40px] p-8 animate-in zoom-in duration-300 shadow-2xl text-center">
            <div className="bg-amber-100 dark:bg-amber-950/30 w-20 h-20 rounded-full flex items-center justify-center text-amber-600 dark:text-amber-400 mx-auto mb-6">
              <RefreshCw size={40} />
            </div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2 tracking-tight">{t.exitTrainingQuestion}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-8 leading-relaxed">
              {t.exitTrainingText}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleDiscardClass}
                className="w-full bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-black py-5 rounded-3xl transition-all active:scale-95"
              >
                {t.exitKeepingDraft || 'Sair e manter rascunho'}
              </button>
              <button
                onClick={handleDeleteCurrentClass}
                className="w-full bg-red-50 dark:bg-red-900/10 text-red-600 font-bold py-4 rounded-3xl transition-all active:scale-95"
              >
                {t.deleteClass}
              </button>
              <button
                onClick={() => setIsDiscardModalOpen(false)}
                className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold py-4 rounded-3xl transition-all active:scale-95"
              >
                {t.backToTraining}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Presença Individual */}
      {confirmingStudent && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[210] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[40px] p-8 animate-in zoom-in duration-300 shadow-2xl text-center">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 relative ${BELT_COLORS[confirmingStudent.belt]}`}>
              {confirmingStudent.photo ? (
                <img src={confirmingStudent.photo} className="w-full h-full rounded-full object-cover border-4 border-white dark:border-slate-800" />
              ) : (
                <UserIcon size={40} className="opacity-40" />
              )}
              <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white dark:border-slate-800 ${BELT_COLORS[confirmingStudent.belt].split(' ')[0]}`} />
            </div>

            <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-1 tracking-tight">{t.computeAttendanceQuestion || 'Confirmar Presença?'}</h2>
            <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mb-8">{confirmingStudent.name}</p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  handleCheckIn(confirmingStudent);
                  setConfirmingStudent(null);
                }}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-5 rounded-3xl shadow-xl shadow-green-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <CheckCircle size={24} /> {t.confirm}
              </button>
              <button
                onClick={() => setConfirmingStudent(null)}
                className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold py-5 rounded-3xl transition-all active:scale-95"
              >
                {t.back}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Encerramento */}
      {isFinishModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[40px] p-8 animate-in zoom-in duration-300 shadow-2xl text-center">
            <div className="bg-green-100 dark:bg-green-950/30 w-20 h-20 rounded-full flex items-center justify-center text-green-600 dark:text-green-400 mx-auto mb-6">
              <CheckCircle size={40} />
            </div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2 tracking-tight">{t.computeAttendanceQuestion}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-8 leading-relaxed">
              {checkedIds.size === 0
                ? t.noStudentsOnMatText
                : t.computeAttendanceCountText.replace('{count}', checkedIds.size.toString())}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleFinishClass}
                disabled={isProcessing}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white font-black py-5 rounded-3xl shadow-xl shadow-green-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {isProcessing && <Loader2 size={18} className="animate-spin" />}
                {isProcessing ? t.processing : t.computeNow}
              </button>
              <button
                onClick={() => setIsFinishModalOpen(false)}
                disabled={isProcessing}
                className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold py-5 rounded-3xl transition-all active:scale-95"
              >
                {t.backToMat}
              </button>
            </div>
          </div>
        </div>
      )}

      {(isScannerOpen || isKioskMode) && (
        <div className="fixed inset-0 bg-slate-950 z-[100] flex flex-col md:flex-row overflow-hidden">
          {/* Botão de Fechar Flutuante */}
          <button
            onClick={async () => {
              await stopScanner();
              setIsScannerOpen(false);
              setIsKioskMode(false);
            }}
            className="absolute top-3 right-3 md:top-6 md:right-6 z-[110] bg-white/10 hover:bg-white/20 backdrop-blur-md text-white p-2.5 md:p-4 rounded-full border border-white/20 transition-all active:scale-90"
          >
            <X size={20} className="md:hidden" />
            <X size={24} className="hidden md:block" />
          </button>

          <div className="flex-none h-[55vh] md:flex-[3] md:h-auto relative flex flex-col">
            <div className="absolute top-4 left-4 right-4 md:right-auto md:top-8 md:left-8 z-20 flex flex-col gap-3 md:gap-4">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 p-3 md:p-5 rounded-2xl md:rounded-3xl text-white md:min-w-[240px]">
                {lastScannedStudent ? (
                  <div className="flex items-center gap-4 animate-in slide-in-from-left duration-300">
                    <div className="relative">
                      {lastScannedStudent.photo ? (
                        <img src={lastScannedStudent.photo} className="w-12 h-12 rounded-2xl object-cover border-2 border-white/20 shadow-lg" />
                      ) : (
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 border-white/20 ${BELT_COLORS[lastScannedStudent.belt]}`}>
                          <UserIcon size={20} className="opacity-40" />
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 bg-green-500 text-white p-1 rounded-full border border-white/20">
                        <CheckCircle size={10} />
                      </div>
                    </div>
                    <div>
                      <h2 className="text-xl font-black italic text-green-400 leading-none tracking-tighter uppercase">{t.accessGranted}</h2>
                      <p className="text-white/60 text-xs font-medium mt-1 truncate max-w-[150px]">{lastScannedStudent.name}</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <h2 className="text-base md:text-2xl font-black italic flex items-center gap-2 md:gap-3 tracking-tighter text-white">
                      <Zap size={18} className="md:hidden fill-white animate-pulse" />
                      <Zap size={24} className="hidden md:block fill-white animate-pulse" />
                      {t.waitingScan}
                    </h2>
                    <p className="text-white/60 text-[11px] md:text-sm font-medium mt-1">{t.bringQrCode}</p>
                  </>
                )}
              </div>
              <div className="flex items-center gap-3 self-start">
                <div className="bg-indigo-600 px-3 py-2 md:p-4 rounded-2xl md:rounded-3xl text-white shadow-xl shadow-indigo-600/20 flex items-center gap-2 md:block">
                  <p className="text-white/40 text-[9px] md:text-[10px] font-black uppercase tracking-widest leading-none md:mb-1">{t.presentCount}</p>
                  <p className="text-lg md:text-3xl font-black leading-none">{checkedIds.size}</p>
                </div>
              </div>
            </div>

            <div className="flex-1 bg-black flex items-center justify-center relative overflow-hidden">
              <div id="qr-reader" className="w-full h-full [&>video]:object-cover"></div>

              <div className="absolute border-4 border-white/20 w-[60%] aspect-square max-w-[280px] rounded-[40px] md:rounded-[60px] pointer-events-none z-10 transition-all">
                <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-indigo-500 -mt-1 -ml-1 rounded-tl-[15px]" />
                <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-indigo-500 -mt-1 -mr-1 rounded-tr-[15px]" />
                <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-indigo-500 -mb-1 -ml-1 rounded-bl-[15px]" />
                <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-indigo-500 -mb-1 -mr-1 rounded-br-[15px]" />
              </div>

              {lastScannedStudent && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 md:p-8 z-30 animate-in zoom-in fade-in duration-300 backdrop-blur-sm bg-black/40 overflow-y-auto">
                  <div className={`p-1 border-2 md:border-4 rounded-[40px] md:rounded-[60px] shadow-2xl w-full max-w-xs md:max-w-sm ${graduationMilestone ? 'border-amber-400' : 'border-indigo-600'}`}>
                    <div className="bg-white dark:bg-slate-900 p-4 md:p-10 rounded-[36px] md:rounded-[54px] flex flex-col items-center text-center">
                      {graduationMilestone ? (
                        <div className="bg-amber-100 text-amber-600 p-4 md:p-8 rounded-full mb-3 md:mb-6 animate-bounce border-4 border-amber-200">
                          <Trophy size={48} className="md:hidden" />
                          <Trophy size={100} className="hidden md:block" />
                        </div>
                      ) : (
                        <div className="bg-green-100 text-green-600 p-4 md:p-8 rounded-full mb-3 md:mb-6">
                          <CheckCircle size={48} className="md:hidden" />
                          <CheckCircle size={100} className="hidden md:block" />
                        </div>
                      )}
                      <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-[10px] md:text-xs mb-2">{t.welcomeCaps}</p>
                      <div className="mb-3 md:mb-6 relative">
                        {lastScannedStudent.photo ? (
                          <div className="relative">
                            <img src={lastScannedStudent.photo} className="w-24 h-24 md:w-56 md:h-56 rounded-[32px] md:rounded-[60px] border-4 md:border-8 border-slate-50 dark:border-slate-800 shadow-2xl object-cover animate-in zoom-in duration-500" />
                            <div className="absolute -bottom-2 -right-2 md:-bottom-4 md:-right-4 bg-green-500 text-white p-2 md:p-4 rounded-full shadow-xl border-2 md:border-4 border-white dark:border-slate-900">
                              <CheckCircle size={16} className="md:hidden" />
                              <CheckCircle size={32} className="hidden md:block" />
                            </div>
                          </div>
                        ) : (
                          <div className={`w-24 h-24 md:w-40 md:h-40 rounded-[32px] md:rounded-[50px] flex items-center justify-center shadow-2xl ${BELT_COLORS[lastScannedStudent.belt]}`}>
                            <div className="text-center">
                              <UserIcon size={36} className="opacity-40 mx-auto md:hidden" />
                              <UserIcon size={80} className="opacity-40 mx-auto hidden md:block" />
                              <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest mt-1 md:mt-2 opacity-40">Sem Foto</p>
                            </div>
                          </div>
                        )}
                      </div>
                      <h2 className="text-xl md:text-5xl font-black text-slate-900 dark:text-white leading-tight mb-2 tracking-tighter">{lastScannedStudent.name}</h2>
                      <BeltBadge belt={lastScannedStudent.belt} stripes={lastScannedStudent.stripes} className="mb-2 md:mb-4" />
                      {graduationMilestone && <p className="text-amber-600 font-black text-sm md:text-xl mb-3 md:mb-6 flex items-center gap-2"><Star size={18} fill="currentColor" /> {graduationMilestone}</p>}
                      <p className="text-3xl md:text-6xl font-black text-indigo-600 italic">OSS!</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 min-h-0 bg-slate-900 p-4 md:p-8 flex flex-col border-t md:border-t-0 md:border-l border-white/5 md:max-h-full">
            <h3 className="text-white/40 font-black uppercase tracking-widest text-[10px] md:text-xs mb-4 md:mb-8 flex items-center gap-2">
              <Users size={16} /> {t.onMatNow}
            </h3>

            <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
              {recentScans.map((s, idx) => (
                <div key={`${s.id}-${idx}`} className="bg-white/5 border border-white/10 p-4 rounded-3xl flex items-center gap-4 animate-in slide-in-from-right duration-300">
                  {s.photo ? (
                    <img src={s.photo} className="w-10 h-10 md:w-12 md:h-12 rounded-2xl object-cover" />
                  ) : (
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center ${BELT_COLORS[s.belt]}`}>
                      <UserIcon size={20} className="opacity-40" />
                    </div>
                  )}
                  <div className="overflow-hidden text-left flex-1">
                    <p className="text-white font-bold leading-tight truncate text-sm">{s.name}</p>
                    <BeltBadge belt={s.belt} stripes={s.stripes} />
                  </div>
                  <div className="bg-green-500/20 text-green-500 p-2 rounded-full"><CheckCircle size={14} /></div>
                </div>
              ))}
              {recentScans.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-white/10 py-10">
                  <Users size={48} className="mb-4 opacity-50" />
                  <p className="font-bold text-sm">{t.waiting}</p>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-white/5 space-y-3 shrink-0">
              <button
                onClick={async () => {
                  await stopScanner();
                  setIsScannerOpen(false);
                  setIsKioskMode(false);
                }}
                className="w-full bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-900 dark:text-white font-black py-4 md:py-5 rounded-3xl transition-all flex items-center justify-center gap-2 active:scale-95 shadow-xl"
              >
                <ChevronLeft size={20} />
                {t.backToDashboard}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceView;
