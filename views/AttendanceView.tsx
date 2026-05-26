
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Student, User, Belt, Academy, AttendanceRecord } from '../types';
import { useTranslation } from '../services/LanguageContext';
import { attendanceService } from '@/features/attendance/services/attendanceService';
import { studentService } from '@/features/students/services/studentService';
import {
  Search,
  CheckCircle,
  QrCode,
  X,
  Zap,
  Monitor,
  Trophy,
  Star,
  Loader2,
  User as UserIcon,
  History,
  Calendar,
  Users,
  ChevronLeft,
  AlertCircle,
  RefreshCw,
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
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

const getGraduationMilestone = (student: Student, t: any) => {
  const nextTotal = student.totalClasses + 1;
  if (student.belt === Belt.WHITE) {
    if (nextTotal === 80) return t.eligibleNewBelt;
    if (nextTotal % 20 === 0 && student.stripes < 4) return t.milestoneStripe?.replace('{stripe}', (nextTotal / 20).toString());
  } else if ([Belt.GREY, Belt.YELLOW, Belt.ORANGE, Belt.GREEN].includes(student.belt)) {
    if (nextTotal === 100) return t.eligibleNewBelt;
    if (nextTotal % 25 === 0 && student.stripes < 4) return t.milestoneStripe?.replace('{stripe}', (nextTotal / 25).toString());
  } else if ([Belt.BLUE, Belt.PURPLE, Belt.BROWN].includes(student.belt)) {
    if (nextTotal === 160) return t.eligibleNewBelt;
    if (nextTotal % 40 === 0 && student.stripes < 4) return t.milestoneStripe?.replace('{stripe}', (nextTotal / 40).toString());
  } else if (student.belt === Belt.BLACK) {
    if (nextTotal % 300 === 0 && student.stripes < 6) return t.milestoneStripe?.replace('{stripe}', (nextTotal / 300).toString());
  }
  return null;
};

type AttendanceRecordWithName = AttendanceRecord & { studentName?: string };

const AttendanceView: React.FC<{ academy: Academy; user: User }> = ({ academy, user: _user }) => {
  const { t, language } = useTranslation();

  // Data
  const [students, setStudents] = useState<Student[]>([]);
  const [todayAttendances, setTodayAttendances] = useState<AttendanceRecordWithName[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkInError, setCheckInError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Search modal state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [confirmingStudent, setConfirmingStudent] = useState<Student | null>(null);

  // Scanner / kiosk
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isKioskMode, setIsKioskMode] = useState(false);
  const [lastScannedStudent, setLastScannedStudent] = useState<Student | null>(null);
  const [graduationMilestone, setGraduationMilestone] = useState<string | null>(null);
  const [recentScans, setRecentScans] = useState<Student[]>([]);
  const [scanError, setScanError] = useState<string | null>(null);

  // History
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [historyRecords, setHistoryRecords] = useState<AttendanceRecordWithName[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyDateFilter, setHistoryDateFilter] = useState('');

  const html5QrCodeRef = useRef<any>(null);
  const scanTimeoutRef = useRef<any>(null);
  const lastScannedIdRef = useRef<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const loadData = async () => {
    if (!academy) return;
    setIsLoading(true);
    try {
      const [studentsRes, attendancesRes] = await Promise.all([
        studentService.getAll(academy.id, { limit: 1000 }),
        attendanceService.getRecords(academy.id, { dateFrom: todayStr, dateTo: todayStr, limit: 1000 } as any),
      ]);
      setStudents((studentsRes.data || []).filter((s: Student) => s.status === 'Active'));
      setTodayAttendances(attendancesRes.data || []);
    } catch (err) {
      console.error('Erro ao carregar dados de chamada:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [academy]);

  const loadHistory = async () => {
    if (!academy) return;
    setIsLoadingHistory(true);
    try {
      const res = await attendanceService.getRecords(academy.id, { limit: 200 } as any);
      setHistoryRecords(res.data || []);
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const checkedIds = useMemo(() => new Set(todayAttendances.map(a => a.studentId)), [todayAttendances]);

  const filteredStudents = useMemo(() => {
    if (!search.trim()) return students;
    return students
      .filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [students, search]);

  const doCheckIn = async (student: Student): Promise<boolean> => {
    if (isProcessing) return false;
    setIsProcessing(true);
    setCheckInError(null);
    try {
      const record = await attendanceService.createRecord(academy.id, {
        studentId: student.id,
        date: todayStr,
      });
      setTodayAttendances(prev => [...prev, record as AttendanceRecordWithName]);
      // optimistically update student totalClasses for milestone calc
      setStudents(prev => prev.map(s => s.id === student.id ? { ...s, totalClasses: s.totalClasses + 1 } : s));
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Erro ao registrar presença.';
      setCheckInError(msg);
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmStudent = async () => {
    if (!confirmingStudent) return;
    const ok = await doCheckIn(confirmingStudent);
    if (ok) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      setConfirmingStudent(null);
      setIsSearchOpen(false);
      setSearch('');
    }
  };

  // QR scanner logic
  const stopScanner = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        await html5QrCodeRef.current.clear();
        html5QrCodeRef.current = null;
      } catch (err) {
        console.warn('Erro ao parar scanner:', err);
      }
    }
  };

  useEffect(() => {
    let isMounted = true;

    if (isScannerOpen || isKioskMode) {
      const startCamera = async () => {
        await new Promise(resolve => setTimeout(resolve, 300));
        const qrElement = document.getElementById('qr-reader');
        if (!qrElement) return;
        try {
          if (html5QrCodeRef.current) return;
          const html5QrCode = new Html5Qrcode('qr-reader');
          html5QrCodeRef.current = html5QrCode;

          const qrBoxFunction = (w: number, h: number) => {
            const minEdge = Math.min(w, h);
            const size = Math.floor(minEdge * 0.7);
            return { width: size, height: size };
          };

          const onScanSuccess = async (decodedText: string) => {
            if (lastScannedIdRef.current === decodedText && scanTimeoutRef.current) return;

            const student = students.find(s => s.id === decodedText);
            if (!student) return;

            // Already checked in today
            if (checkedIds.has(student.id)) {
              setScanError(`${student.name} já marcou presença hoje.`);
              if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
              scanTimeoutRef.current = setTimeout(() => {
                if (isMounted) setScanError(null);
                scanTimeoutRef.current = null;
              }, 3000);
              return;
            }

            lastScannedIdRef.current = student.id;
            if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);

            const ok = await doCheckIn(student);
            if (ok) {
              const milestone = getGraduationMilestone(student, t);
              setLastScannedStudent(student);
              setGraduationMilestone(milestone);
              setScanError(null);
              setRecentScans(prev => {
                const already = prev.some(s => s.id === student.id);
                if (already) return prev;
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
            } else {
              // show error briefly then allow rescan
              scanTimeoutRef.current = setTimeout(() => {
                if (isMounted) {
                  lastScannedIdRef.current = null;
                  setScanError(null);
                  scanTimeoutRef.current = null;
                }
              }, 4000);
            }
          };

          await html5QrCode.start(
            { facingMode: 'environment' },
            { fps: 15, qrbox: qrBoxFunction, disableFlip: false },
            onScanSuccess,
            () => {}
          );
        } catch (err) {
          console.error('Erro ao iniciar câmera:', err);
        }
      };
      startCamera();
    }

    return () => {
      isMounted = false;
      if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
      stopScanner();
    };
  }, [isScannerOpen, isKioskMode, students]);

  const todayLabel = new Date(todayStr + 'T12:00:00').toLocaleDateString(
    language === 'pt' ? 'pt-BR' : language === 'es' ? 'es-ES' : 'en-US',
    { weekday: 'long', day: 'numeric', month: 'long' }
  );

  // ── Main view ──────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 animate-in fade-in duration-300">
      {/* Header */}
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white uppercase italic tracking-tight">
              Chamada
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Calendar size={14} className="text-indigo-500" />
              <p className="text-xs font-bold text-slate-400 capitalize">{todayLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setIsKioskMode(true); setScanError(null); }}
              className="flex items-center gap-2 bg-slate-900 dark:bg-indigo-600 text-white px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
            >
              <Monitor size={16} />
              <span className="hidden sm:inline">Totem</span>
            </button>
            <button
              onClick={() => { setIsScannerOpen(true); setScanError(null); }}
              className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-900/50 active:scale-95 transition-all"
            >
              <QrCode size={16} />
              <span className="hidden sm:inline">QR</span>
            </button>
            <button
              onClick={() => loadData()}
              className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl hover:bg-slate-200 transition-all active:scale-95"
              title="Atualizar"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Success toast */}
      {showSuccess && (
        <div className="bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-5 py-4 rounded-[24px] flex items-center gap-3 animate-in slide-in-from-top duration-300">
          <CheckCircle size={20} />
          <span className="font-bold text-sm">Presença registrada com sucesso!</span>
        </div>
      )}

      {/* Mark attendance button */}
      <button
        onClick={() => { setIsSearchOpen(true); setSearch(''); setCheckInError(null); }}
        className="w-full bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 rounded-[32px] text-white shadow-xl shadow-indigo-200 dark:shadow-indigo-900/30 text-left hover:scale-[1.01] active:scale-[0.99] transition-all"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-indigo-200 text-[10px] font-black uppercase tracking-widest mb-1">Marcar presença</p>
            <h3 className="font-black text-xl leading-tight">Buscar aluno</h3>
            <p className="text-indigo-200 text-sm mt-1 font-medium">Toque para pesquisar pelo nome</p>
          </div>
          <div className="bg-white/20 w-14 h-14 rounded-2xl flex items-center justify-center">
            <Search size={28} />
          </div>
        </div>
      </button>

      {/* Today's attendees */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Presentes hoje</h2>
            <span className="bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-[10px] font-black px-2 py-0.5 rounded-full">
              {todayAttendances.length}
            </span>
          </div>
          <button
            onClick={() => { setShowFullHistory(true); loadHistory(); }}
            className="flex items-center gap-1.5 text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:underline"
          >
            <History size={12} /> Histórico
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-indigo-500" />
          </div>
        ) : todayAttendances.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-12 rounded-[32px] border border-dashed border-slate-200 dark:border-slate-800 text-center">
            <Users size={40} className="mx-auto mb-4 text-slate-200" />
            <p className="text-sm font-bold text-slate-400 italic">Nenhuma presença registrada hoje</p>
            <p className="text-[10px] text-slate-400 mt-1">Use "Buscar aluno" ou o leitor QR para marcar presença</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todayAttendances.map(record => {
              const student = students.find(s => s.id === record.studentId);
              const name = (record as any).studentName || student?.name || 'Aluno';
              const checkInTime = (record as any).checkInTime
                ? String((record as any).checkInTime).substring(0, 5)
                : null;

              return (
                <div key={record.id} className="bg-white dark:bg-slate-900 flex items-center justify-between p-4 rounded-[24px] border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {student?.photo ? (
                        <img src={student.photo} className="w-10 h-10 rounded-xl object-cover" />
                      ) : (
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${student ? BELT_COLORS[student.belt] : 'bg-slate-100'}`}>
                          <UserIcon size={18} className="opacity-40" />
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 bg-green-500 text-white p-0.5 rounded-full border border-white dark:border-slate-900">
                        <CheckCircle size={8} />
                      </div>
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-800 dark:text-white leading-tight">{name}</p>
                      {student && <BeltBadge belt={student.belt} stripes={student.stripes} />}
                    </div>
                  </div>
                  {checkInTime && (
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{checkInTime}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Search modal ─────────────────────────────────────────────────────── */}
      {isSearchOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[150] flex items-end md:items-center justify-center p-0 md:p-6">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg md:rounded-[40px] rounded-t-[40px] p-6 md:p-8 animate-in slide-in-from-bottom md:zoom-in duration-300 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase italic tracking-tight">Buscar aluno</h2>
              <button onClick={() => { setIsSearchOpen(false); setCheckInError(null); }} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 hover:text-red-500 transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                autoFocus
                type="text"
                placeholder="Nome do aluno..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl pl-12 pr-4 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
              />
            </div>

            {checkInError && (
              <div className="flex items-start gap-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 p-4 rounded-2xl mb-4">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <p className="text-sm font-bold leading-snug">{checkInError}</p>
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pb-2">
              {search.trim().length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Search size={32} className="mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-bold">Digite o nome para pesquisar</p>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <p className="text-sm font-bold">Nenhum aluno encontrado</p>
                </div>
              ) : (
                filteredStudents.slice(0, 20).map(student => {
                  const alreadyChecked = checkedIds.has(student.id);
                  return (
                    <button
                      key={student.id}
                      onClick={() => {
                        if (alreadyChecked) return;
                        setConfirmingStudent(student);
                        setCheckInError(null);
                      }}
                      disabled={alreadyChecked}
                      className={`w-full flex items-center justify-between p-4 rounded-[20px] border transition-all text-left ${
                        alreadyChecked
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 cursor-default'
                          : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-indigo-400 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          {student.photo ? (
                            <img src={student.photo} className="w-10 h-10 rounded-xl object-cover" />
                          ) : (
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${BELT_COLORS[student.belt]}`}>
                              <UserIcon size={18} className="opacity-40" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className={`font-bold text-sm leading-tight ${alreadyChecked ? 'text-green-700 dark:text-green-400' : 'text-slate-800 dark:text-white'}`}>
                            {student.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <BeltBadge belt={student.belt} stripes={student.stripes} />
                            <span className="text-[9px] text-slate-400 font-bold">
                              {calculateAge(student.birthDate)} anos
                            </span>
                          </div>
                        </div>
                      </div>
                      {alreadyChecked ? (
                        <span className="flex items-center gap-1 text-[10px] font-black text-green-600 dark:text-green-400 uppercase tracking-widest">
                          <CheckCircle size={14} /> Presente
                        </span>
                      ) : (
                        <div className="w-8 h-8 rounded-xl border-2 border-slate-200 dark:border-slate-600 flex items-center justify-center bg-slate-50 dark:bg-slate-700">
                          <CheckCircle size={16} className="text-slate-300 dark:text-slate-500" />
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm check-in modal ──────────────────────────────────────────── */}
      {confirmingStudent && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[40px] p-8 animate-in zoom-in duration-300 shadow-2xl text-center">
            <div className={`w-20 h-20 rounded-[28px] flex items-center justify-center mx-auto mb-6 ${BELT_COLORS[confirmingStudent.belt]}`}>
              {confirmingStudent.photo ? (
                <img src={confirmingStudent.photo} className="w-full h-full rounded-[28px] object-cover" />
              ) : (
                <UserIcon size={36} className="opacity-40" />
              )}
            </div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-1 tracking-tight">Confirmar Presença?</h2>
            <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mb-2">{confirmingStudent.name}</p>
            <BeltBadge belt={confirmingStudent.belt} stripes={confirmingStudent.stripes} />

            {checkInError && (
              <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-2xl mt-4 text-left">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <p className="text-xs font-bold leading-snug">{checkInError}</p>
              </div>
            )}

            <div className="flex flex-col gap-3 mt-8">
              <button
                onClick={handleConfirmStudent}
                disabled={isProcessing}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white font-black py-5 rounded-3xl shadow-xl shadow-green-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {isProcessing ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle size={20} />}
                {isProcessing ? 'Aguarde...' : 'Confirmar'}
              </button>
              <button
                onClick={() => { setConfirmingStudent(null); setCheckInError(null); }}
                disabled={isProcessing}
                className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold py-5 rounded-3xl transition-all active:scale-95"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Full History modal ──────────────────────────────────────────────── */}
      {showFullHistory && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[150] flex items-end md:items-center justify-center p-0 md:p-6">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl md:rounded-[40px] rounded-t-[40px] p-6 md:p-8 animate-in slide-in-from-bottom md:zoom-in duration-300 shadow-2xl flex flex-col max-h-[90vh] md:max-h-[85vh]">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase italic tracking-tight">Histórico</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Todos os registros de presença</p>
              </div>
              <button onClick={() => setShowFullHistory(false)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 hover:text-red-500 transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input
                  type="text"
                  placeholder="Buscar aluno..."
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl pl-9 pr-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
                />
              </div>
              <input
                type="date"
                value={historyDateFilter}
                onChange={e => setHistoryDateFilter(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar pb-4">
              {isLoadingHistory ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 size={28} className="animate-spin text-indigo-500" />
                </div>
              ) : (() => {
                const filtered = historyRecords.filter(r => {
                  const name = (r as any).studentName || students.find(s => s.id === r.studentId)?.name || '';
                  const matchName = !historySearch || name.toLowerCase().includes(historySearch.toLowerCase());
                  const matchDate = !historyDateFilter || r.date?.startsWith(historyDateFilter);
                  return matchName && matchDate;
                });

                if (filtered.length === 0) return (
                  <div className="text-center py-20">
                    <History size={40} className="mx-auto mb-4 text-slate-200" />
                    <p className="text-slate-400 font-bold italic text-sm">Nenhum registro encontrado</p>
                  </div>
                );

                return filtered.map(record => {
                  const student = students.find(s => s.id === record.studentId);
                  const name = (record as any).studentName || student?.name || 'Aluno';
                  const dateStr = record.date
                    ? new Date(record.date + 'T12:00:00').toLocaleDateString(
                        language === 'pt' ? 'pt-BR' : language === 'es' ? 'es-ES' : 'en-US',
                        { day: '2-digit', month: 'short', year: 'numeric' }
                      )
                    : '—';
                  const checkInTime = (record as any).checkInTime
                    ? String((record as any).checkInTime).substring(0, 5)
                    : null;

                  return (
                    <div key={record.id} className="bg-slate-50 dark:bg-slate-800 flex items-center justify-between p-4 rounded-[20px]">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${student ? BELT_COLORS[student.belt] : 'bg-slate-200 dark:bg-slate-700'}`}>
                          {student?.photo ? (
                            <img src={student.photo} className="w-full h-full rounded-xl object-cover" />
                          ) : (
                            <UserIcon size={18} className="opacity-40" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-800 dark:text-white leading-tight">{name}</p>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5">{dateStr}{checkInTime ? ` às ${checkInTime}` : ''}</p>
                        </div>
                      </div>
                      <div className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 p-2 rounded-full">
                        <CheckCircle size={14} />
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ── QR Scanner / Kiosk ─────────────────────────────────────────────── */}
      {(isScannerOpen || isKioskMode) && (
        <div className="fixed inset-0 bg-slate-950 z-[100] flex flex-col md:flex-row overflow-hidden">
          <button
            onClick={async () => {
              await stopScanner();
              setIsScannerOpen(false);
              setIsKioskMode(false);
              setScanError(null);
            }}
            className="absolute top-3 right-3 md:top-6 md:right-6 z-[110] bg-white/10 hover:bg-white/20 backdrop-blur-md text-white p-2.5 md:p-4 rounded-full border border-white/20 transition-all active:scale-90"
          >
            <X size={20} className="md:hidden" />
            <X size={24} className="hidden md:block" />
          </button>

          <div className="flex-none h-[55vh] md:flex-[3] md:h-auto relative flex flex-col">
            <div className="absolute top-4 left-4 right-4 md:right-auto md:top-8 md:left-8 z-20 flex flex-col gap-3 md:gap-4">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 p-3 md:p-5 rounded-2xl md:rounded-3xl text-white md:min-w-[240px]">
                {scanError ? (
                  <div className="flex items-center gap-3 animate-in slide-in-from-left duration-300">
                    <AlertCircle size={20} className="text-red-400 shrink-0" />
                    <p className="text-sm font-bold text-red-300 leading-snug">{scanError}</p>
                  </div>
                ) : (
                  <>
                    <h2 className="text-base md:text-2xl font-black italic flex items-center gap-2 md:gap-3 tracking-tighter text-white">
                      <Zap size={18} className="md:hidden fill-white animate-pulse" />
                      <Zap size={24} className="hidden md:block fill-white animate-pulse" />
                      Aguardando leitura
                    </h2>
                    <p className="text-white/60 text-[11px] md:text-sm font-medium mt-1">Aproxime o QR Code da câmera</p>
                  </>
                )}
              </div>
              <div className="flex items-center gap-3 self-start">
                <div className="bg-indigo-600 px-3 py-2 md:p-4 rounded-2xl md:rounded-3xl text-white shadow-xl shadow-indigo-600/20 flex items-center gap-2 md:block">
                  <p className="text-white/40 text-[9px] md:text-[10px] font-black uppercase tracking-widest leading-none md:mb-1">Presentes</p>
                  <p className="text-lg md:text-3xl font-black leading-none">{todayAttendances.length}</p>
                </div>
              </div>
            </div>

            <div className="flex-1 bg-black flex items-center justify-center relative overflow-hidden">
              <div id="qr-reader" className="w-full h-full [&>video]:object-cover"></div>
              <div className="absolute border-4 border-white/20 w-[60%] aspect-square max-w-[280px] rounded-[40px] md:rounded-[60px] pointer-events-none z-10">
                <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-indigo-500 -mt-1 -ml-1 rounded-tl-[15px]" />
                <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-indigo-500 -mt-1 -mr-1 rounded-tr-[15px]" />
                <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-indigo-500 -mb-1 -ml-1 rounded-bl-[15px]" />
                <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-indigo-500 -mb-1 -mr-1 rounded-br-[15px]" />
              </div>

              {/* Last scan result — compact bar at bottom, never blocks camera */}
              {lastScannedStudent && !scanError && (
                <div className={`absolute bottom-0 left-0 right-0 z-20 animate-in slide-in-from-bottom duration-300 ${graduationMilestone ? 'bg-amber-500/90' : 'bg-green-600/90'} backdrop-blur-sm px-4 py-3`}>
                  <div className="flex items-center gap-3 max-w-sm mx-auto">
                    <div className="relative shrink-0">
                      {lastScannedStudent.photo ? (
                        <img src={lastScannedStudent.photo} className="w-10 h-10 rounded-xl object-cover border-2 border-white/30" />
                      ) : (
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 border-white/30 ${BELT_COLORS[lastScannedStudent.belt]}`}>
                          <UserIcon size={18} className="opacity-60" />
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 bg-white text-green-600 rounded-full p-0.5">
                        <CheckCircle size={10} />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-black text-sm leading-tight truncate">{lastScannedStudent.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <BeltBadge belt={lastScannedStudent.belt} stripes={lastScannedStudent.stripes} />
                        {graduationMilestone && (
                          <span className="text-white/90 text-[10px] font-black flex items-center gap-1">
                            <Star size={10} fill="currentColor" /> {graduationMilestone}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-white/70 text-[10px] font-black uppercase tracking-widest">{graduationMilestone ? 'Marco!' : 'OSS!'}</p>
                      {graduationMilestone ? (
                        <Trophy size={20} className="text-white mt-0.5 mx-auto" />
                      ) : (
                        <CheckCircle size={20} className="text-white mt-0.5 mx-auto" />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 min-h-0 bg-slate-900 p-4 md:p-8 flex flex-col border-t md:border-t-0 md:border-l border-white/5 md:max-h-full">
            <h3 className="text-white/40 font-black uppercase tracking-widest text-[10px] md:text-xs mb-4 md:mb-8 flex items-center gap-2">
              <Users size={16} /> No tatame hoje
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
                  <p className="font-bold text-sm">Aguardando...</p>
                </div>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-white/5 shrink-0">
              <button
                onClick={async () => {
                  await stopScanner();
                  setIsScannerOpen(false);
                  setIsKioskMode(false);
                  setScanError(null);
                }}
                className="w-full bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-900 dark:text-white font-black py-4 md:py-5 rounded-3xl transition-all flex items-center justify-center gap-2 active:scale-95 shadow-xl"
              >
                <ChevronLeft size={20} /> Voltar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceView;
