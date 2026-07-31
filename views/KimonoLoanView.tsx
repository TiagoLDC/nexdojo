import React, { useEffect, useMemo, useState } from 'react';
import { Academy, User, Student, Instructor, KimonoLoan } from '../types';
import { kimonoLoanService } from '@/features/kimonoLoans/services/kimonoLoanService';
import { studentService } from '@/features/students/services/studentService';
import { instructorService } from '@/features/instructors/services/instructorService';
import { useTranslation } from '../services/LanguageContext';
import { Shirt, Search, Plus, X, RotateCcw, Loader2, UserCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BeltBadge } from '../components/BeltBadge';
import { BELT_COLORS } from '../constants';

const fmtDate = (d?: string | null) => {
  if (!d) return '—';
  const part = d.split('T')[0];
  const [y, m, day] = part.split('-');
  return `${day}/${m}/${y}`;
};

const KimonoLoanView: React.FC<{ academy: Academy; user: User }> = ({ academy }) => {
  const { showNotification } = useTranslation();
  const [loans, setLoans] = useState<KimonoLoan[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [isLendModalOpen, setIsLendModalOpen] = useState(false);
  const [lendTab, setLendTab] = useState<'student' | 'instructor'>('student');
  const [lendSearch, setLendSearch] = useState('');
  const [lendingId, setLendingId] = useState<string | null>(null);
  const [returningId, setReturningId] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [loansRes, studentsRes, instructorsRes] = await Promise.all([
        kimonoLoanService.getAll(academy.id, { status: 'active' }),
        studentService.getAll(academy.id, { status: 'Active', limit: 1000 } as any),
        instructorService.getAll(academy.id, { status: 'Active', limit: 1000 } as any),
      ]);
      setLoans(Array.isArray(loansRes.data) ? loansRes.data : []);
      setStudents(Array.isArray(studentsRes.data) ? studentsRes.data : []);
      setInstructors(Array.isArray(instructorsRes.data) ? instructorsRes.data : []);
    } catch {
      showNotification('Erro ao carregar empréstimos de kimono.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (academy) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [academy]);

  const eligibleStudents = useMemo(() => {
    return students
      .filter(s => !s.hasLoanedKimono && s.name.toLowerCase().includes(lendSearch.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [students, lendSearch]);

  const eligibleInstructors = useMemo(() => {
    return instructors
      .filter(i => !i.hasLoanedKimono && i.name.toLowerCase().includes(lendSearch.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [instructors, lendSearch]);

  const handleLend = async (personType: 'student' | 'instructor', personId: string) => {
    setLendingId(personId);
    try {
      await kimonoLoanService.lend(academy.id, { personType, personId });
      showNotification('Kimono emprestado com sucesso!');
      setIsLendModalOpen(false);
      setLendSearch('');
      await loadData();
    } catch {
      showNotification('Erro ao emprestar kimono.', 'error');
    } finally {
      setLendingId(null);
    }
  };

  const handleReturn = async (loan: KimonoLoan) => {
    setReturningId(loan.id);
    try {
      await kimonoLoanService.return(academy.id, { personType: loan.personType, personId: loan.personId });
      showNotification('Kimono devolvido com sucesso!');
      await loadData();
    } catch {
      showNotification('Erro ao devolver kimono.', 'error');
    } finally {
      setReturningId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-32 transition-colors">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white tracking-tight uppercase italic flex items-center gap-3">
            <Shirt className="text-indigo-600" size={28} />
            Empréstimo de Kimono
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-widest">
            {loans.length} {loans.length === 1 ? 'kimono emprestado' : 'kimonos emprestados'}
          </p>
        </div>
        <button
          onClick={() => { setLendTab('student'); setLendSearch(''); setIsLendModalOpen(true); }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-4 rounded-[24px] shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest active:scale-95 whitespace-nowrap"
        >
          <Plus size={18} />
          Emprestar Kimono
        </button>
      </header>

      {isLoading ? (
        <div className="py-32 flex items-center justify-center">
          <Loader2 className="animate-spin text-indigo-500" size={40} />
        </div>
      ) : loans.length === 0 ? (
        <div className="py-20 text-center bg-slate-50/50 dark:bg-slate-900/30 rounded-[40px] border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 flex flex-col items-center">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-[32px] shadow-xl shadow-slate-200/50 dark:shadow-none mb-6">
            <Shirt className="opacity-40" size={64} />
          </div>
          <p className="text-lg font-black uppercase italic tracking-tight">Nenhum kimono emprestado no momento</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loans.map(loan => (
            <motion.div
              key={loan.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-900 p-5 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4"
            >
              {loan.personPhoto ? (
                <img src={loan.personPhoto} className="w-16 h-16 rounded-2xl object-cover shrink-0 border border-slate-100 dark:border-slate-800" />
              ) : (
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl shrink-0 ${loan.personBelt ? BELT_COLORS[loan.personBelt] : 'bg-slate-100 text-slate-400'}`}>
                  {loan.personName?.charAt(0) || '?'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-black text-slate-800 dark:text-white uppercase italic truncate">{loan.personName || '—'}</h3>
                  <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                    {loan.personType === 'student' ? 'Aluno' : 'Instrutor'}
                  </span>
                </div>
                {loan.personBelt && <div className="mt-1"><BeltBadge belt={loan.personBelt} stripes={loan.personStripes || 0} /></div>}
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">
                  Emprestado em {fmtDate(loan.borrowedAt)}
                </p>
              </div>
              <button
                onClick={() => handleReturn(loan)}
                disabled={returningId === loan.id}
                className="shrink-0 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center gap-1.5"
              >
                {returningId === loan.id ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                Devolver
              </button>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {isLendModalOpen && (
          <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[32px] md:rounded-[40px] p-4 md:p-8 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-4 md:mb-6 shrink-0">
                <h2 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white uppercase italic tracking-tight">Emprestar Kimono</h2>
                <button onClick={() => setIsLendModalOpen(false)} className="bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full p-2 hover:bg-red-50 hover:text-red-500 transition-all">
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4 shrink-0">
                <button
                  onClick={() => setLendTab('student')}
                  className={`py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${lendTab === 'student' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
                >
                  Aluno
                </button>
                <button
                  onClick={() => setLendTab('instructor')}
                  className={`py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${lendTab === 'instructor' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
                >
                  Instrutor
                </button>
              </div>

              <div className="relative mb-4 shrink-0">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  autoFocus
                  placeholder="Buscar por nome..."
                  value={lendSearch}
                  onChange={(e) => setLendSearch(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl pl-12 pr-4 py-3 font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                {(lendTab === 'student' ? eligibleStudents : eligibleInstructors).map((person: Student | Instructor) => (
                  <button
                    key={person.id}
                    onClick={() => handleLend(lendTab, person.id)}
                    disabled={lendingId === person.id}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all disabled:opacity-50 text-left"
                  >
                    {person.photo ? (
                      <img src={person.photo} className="w-10 h-10 rounded-xl object-cover shrink-0" />
                    ) : (
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${BELT_COLORS[person.belt]}`}>
                        {person.name.charAt(0)}
                      </div>
                    )}
                    <span className="flex-1 min-w-0 font-bold text-sm text-slate-700 dark:text-white truncate">{person.name}</span>
                    {lendingId === person.id ? <Loader2 size={16} className="animate-spin text-indigo-500 shrink-0" /> : <UserCircle size={16} className="text-slate-300 shrink-0" />}
                  </button>
                ))}
                {(lendTab === 'student' ? eligibleStudents : eligibleInstructors).length === 0 && (
                  <p className="text-center text-slate-400 text-xs font-bold uppercase tracking-widest py-10">
                    Nenhum {lendTab === 'student' ? 'aluno' : 'instrutor'} disponível
                  </p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default KimonoLoanView;
