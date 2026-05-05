
import React, { useState, useMemo, useEffect } from 'react';
import { Academy, User, Student, KimonoLoan } from '../types';
import { StorageService } from '../services/storage';
import { Search, Shirt, Plus, History, CheckCircle2, AlertCircle, X, ArrowLeftRight } from 'lucide-react';
import { BELT_COLORS } from '../constants';

const KimonoView: React.FC<{ academy: Academy; user: User }> = ({ academy, user }) => {
  const [loans, setLoans] = useState<KimonoLoan[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [isLending, setIsLending] = useState(false);
  
  // Sistema de Notificações
  const [toast, setToast] = useState<{message: string, type: 'success' | 'info'} | null>(null);

  useEffect(() => {
    if (academy) {
      const loadedLoans = StorageService.getKimonoLoans(academy.id);
      setLoans(Array.isArray(loadedLoans) ? loadedLoans : []);
      setStudents(StorageService.getStudents(academy.id).filter(s => s.status === 'Active'));
    }
  }, [academy]);

  const showNotification = (message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const activeLoans = useMemo(() => {
    if (!Array.isArray(loans)) return [];
    return loans.filter(l => l.status === 'Active');
  }, [loans]);
  
  const studentsToLend = useMemo(() => {
    return students
      .filter(s => 
        !activeLoans.find(l => l.studentId === s.id) && 
        s.name.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [students, activeLoans, search]);

  const handleLend = (studentId: string) => {
    const newLoan: KimonoLoan = {
      id: 'loan_' + Math.random().toString(36).substr(2, 9),
      academyId: academy.id,
      studentId,
      borrowedAt: new Date().toISOString(),
      status: 'Active'
    };

    const updatedLoans = [newLoan, ...loans];
    setLoans(updatedLoans);
    StorageService.saveKimonoLoans(updatedLoans);

    // Update student state
    const studentsOfAcademy = StorageService.getStudents(academy.id);
    const updatedStudents = studentsOfAcademy.map(s => s.id === studentId ? { ...s, hasLoanedKimono: true } : s);
    StorageService.saveStudents(updatedStudents);
    setStudents(updatedStudents.filter(s => s.status === 'Active'));

    setIsLending(false);
    showNotification("Quimono emprestado com sucesso!");
  };

  const handleReturn = (loanId: string) => {
    const loan = loans.find(l => l.id === loanId);
    if (!loan) return;

    const updatedLoans = loans.map(l => 
      l.id === loanId ? { ...l, status: 'Returned' as const, returnedAt: new Date().toISOString() } : l
    );
    setLoans(updatedLoans);
    StorageService.saveKimonoLoans(updatedLoans);

    // Update student state
    const studentsOfAcademy = StorageService.getStudents(academy.id);
    const updatedStudents = studentsOfAcademy.map(s => s.id === loan.studentId ? { ...s, hasLoanedKimono: false } : s);
    StorageService.saveStudents(updatedStudents);
    setStudents(updatedStudents.filter(s => s.status === 'Active'));
    
    showNotification("Quimono devolvido.", 'info');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 relative transition-colors">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-top duration-300 ${
          toast.type === 'success' ? 'bg-indigo-600 text-white' : 'bg-slate-800 dark:bg-slate-700 text-white'
        }`}>
          <CheckCircle2 size={20} />
          <span className="font-bold text-sm tracking-tight">{toast.message}</span>
        </div>
      )}

      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Quimonos</h1>
          <p className="text-slate-500 dark:text-slate-400">Controle de empréstimos e devoluções.</p>
        </div>
        <button 
          onClick={() => setIsLending(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-2xl shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 font-bold text-sm active:scale-95"
        >
          <Plus size={20} />
          Emprestar
        </button>
      </header>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Em uso</p>
          <p className="text-2xl font-black text-slate-800 dark:text-white">{activeLoans.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total histórico</p>
          <p className="text-2xl font-black text-slate-800 dark:text-white">{loans.length}</p>
        </div>
      </div>

      {/* Active Loans List */}
      <div className="space-y-4">
        <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-1 flex items-center gap-2">
          <AlertCircle size={14} className="text-amber-500" />
          Quimonos Pendentes
        </h3>
        
        <div className="space-y-2">
          {activeLoans.length > 0 ? (
            activeLoans.map(loan => {
              const student = students.find(s => s.id === loan.studentId);
              if (!student) return null;
              return (
                <div key={loan.id} className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-amber-100 dark:border-amber-900/30 flex items-center justify-between shadow-sm transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-10 rounded-full border shadow-sm ${BELT_COLORS[student.belt]}`} />
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-white">{student.name}</h4>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                        Retirado em: {new Date(loan.borrowedAt).toLocaleDateString('pt-BR')} • {new Date(loan.borrowedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit'})}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleReturn(loan.id)}
                    className="bg-slate-100 dark:bg-slate-800 hover:bg-green-100 dark:hover:bg-green-900/30 text-slate-600 dark:text-slate-400 hover:text-green-700 dark:hover:text-green-400 px-4 py-2.5 rounded-xl font-bold text-xs transition-all border border-transparent hover:border-green-200"
                  >
                    Devolver
                  </button>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center bg-slate-50 dark:bg-slate-900/30 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600">
              <Shirt className="mx-auto mb-3 opacity-20" size={48} />
              <p className="text-sm font-medium">Todos os quimonos foram devolvidos.</p>
            </div>
          )}
        </div>
      </div>

      {/* Lending Modal */}
      {isLending && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-t-3xl md:rounded-3xl p-6 md:p-8 animate-in slide-in-from-bottom duration-300 max-h-[90vh] flex flex-col shadow-2xl transition-colors">
            <div className="flex items-center justify-between mb-6 shrink-0">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <ArrowLeftRight className="text-indigo-600 dark:text-indigo-400" />
                Emprestar Quimono
              </h2>
              <button onClick={() => setIsLending(false)} className="text-slate-400 dark:text-slate-500 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={24} /></button>
            </div>

            <div className="relative mb-6 shrink-0">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text" 
                placeholder="Qual aluno está sem?"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-12 pr-4 py-4 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-white transition-all"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pb-4 custom-scrollbar">
              {studentsToLend.length > 0 ? (
                studentsToLend.map(s => (
                  <button 
                    key={s.id}
                    onClick={() => handleLend(s.id)}
                    className="w-full bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 flex items-center justify-between transition-all group text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-2 h-8 rounded-full ${BELT_COLORS[s.belt]}`} />
                      <div>
                        <p className="font-bold text-slate-800 dark:text-white text-sm">{s.name}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">{s.belt}</p>
                      </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 group-hover:bg-indigo-600 dark:group-hover:bg-indigo-500 group-hover:text-white w-8 h-8 rounded-full flex items-center justify-center transition-colors">
                      <Plus size={16} />
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-10 text-slate-400 dark:text-slate-600 italic">
                  Nenhum aluno disponível para empréstimo.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KimonoView;
