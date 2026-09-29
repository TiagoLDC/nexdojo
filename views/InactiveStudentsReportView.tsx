import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  UserMinus,
  Search,
  ArrowLeft,
  UserX,
  PhoneOff,
  Users,
  CalendarOff,
  UserCheck,
  ShieldOff,
  Loader2,
} from 'lucide-react';
import { Academy, Student, User } from '../types';
import { studentService } from '@/features/students/services/studentService';
import { useAcademyBeltRanks } from '@/features/settings/hooks/useAcademyBeltRanks';
import { useStudentPhotos } from '@/features/students/hooks/useStudentPhotos';
import { getBeltClassName } from '../constants';
import { getInactiveStudents, getReturnWhatsappUrl } from '@/utils/inactiveStudents';
import { useTranslation } from '../services/LanguageContext';
import { Spinner, WhatsAppIcon } from '@/components/ui';

type InactiveFilter = 'all' | 'inactive' | 'dropped' | 'recent' | 'old';

const InactiveStudentsReportView: React.FC<{ academy: Academy; user: User }> = ({ academy }) => {
  const { getBeltConfig } = useAcademyBeltRanks(academy?.id);
  const { showNotification } = useTranslation();
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<InactiveFilter>('all');
  const [reactivatingId, setReactivatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!academy?.id) return;
    setIsLoading(true);
    // includePhoto: false — mesma razão do relatório de mensalidades: a foto de quem aparece
    // na página é buscada à parte, em lote, via useStudentPhotos.
    studentService.getAll(academy.id, { limit: 1000, includePhoto: false })
      .then(res => setStudents(res.data))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [academy?.id]);

  const inactiveStudents = useMemo(() => getInactiveStudents(students), [students]);

  const studentPhotos = useStudentPhotos(
    useMemo(() => inactiveStudents.map(i => i.student.id), [inactiveStudents])
  );

  const summary = useMemo(() => ({
    total: inactiveStudents.length,
    inactive: inactiveStudents.filter(i => i.student.status === 'Inactive').length,
    dropped: inactiveStudents.filter(i => i.student.status === 'Dropped').length,
    noContact: inactiveStudents.filter(i => !i.student.phone && !i.student.guardianPhone).length,
    recent: inactiveStudents.filter(i => i.daysSinceLastAttendance !== null && i.daysSinceLastAttendance <= 30).length,
    old: inactiveStudents.filter(i => i.daysSinceLastAttendance === null || i.daysSinceLastAttendance > 90).length,
  }), [inactiveStudents]);

  const filteredStudents = useMemo(() => {
    return inactiveStudents
      .filter(({ student, daysSinceLastAttendance }) => {
        if (filter === 'inactive') return student.status === 'Inactive';
        if (filter === 'dropped') return student.status === 'Dropped';
        if (filter === 'recent') return daysSinceLastAttendance !== null && daysSinceLastAttendance <= 30;
        if (filter === 'old') return daysSinceLastAttendance === null || daysSinceLastAttendance > 90;
        return true;
      })
      .filter(({ student }) => student.name.toLowerCase().includes(search.toLowerCase()));
  }, [inactiveStudents, filter, search]);

  const filters: { key: InactiveFilter; label: string; count: number }[] = [
    { key: 'all', label: 'Todos', count: summary.total },
    { key: 'inactive', label: 'Inativos', count: summary.inactive },
    { key: 'dropped', label: 'Evadidos', count: summary.dropped },
    { key: 'recent', label: 'Até 30 Dias', count: summary.recent },
    { key: 'old', label: '+90 Dias', count: summary.old },
  ];

  /**
   * Aluno voltou a treinar. Esta é a tela em que todos os afastados aparecem juntos, então é
   * o lugar natural para trazer alguém de volta — na lista de alunos o filtro padrão esconde
   * quem está inativo, e achar a ficha exige saber que é preciso filtrar por "Inativos".
   * `accessBlocked: false` tira também o bloqueio, e o backend reativa a conta de login junto,
   * para o aluno não voltar com a matrícula ativa e o login ainda barrado.
   */
  const handleReactivate = async (student: Student) => {
    setReactivatingId(student.id);
    try {
      await studentService.update(student.id, { status: 'Active', accessBlocked: false });
      setStudents(prev => prev.map(s => s.id === student.id
        ? { ...s, status: 'Active', accessBlocked: false }
        : s));
      showNotification(`${student.name} voltou para a lista de alunos ativos!`);
    } catch (e) {
      console.error(e);
      showNotification('Erro ao reativar aluno.', 'error');
    } finally {
      setReactivatingId(null);
    }
  };

  const formatLastAttendance = (student: Student, days: number | null) => {
    if (days === null || !student.lastAttendance) return 'Nunca treinou';
    const date = new Date(student.lastAttendance.slice(0, 10) + 'T12:00:00').toLocaleDateString('pt-BR');
    if (days === 0) return `Último treino hoje (${date})`;
    return `Sem treinar há ${days} dia${days !== 1 ? 's' : ''} (${date})`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[300px]">
        <Spinner size="lg" className="text-indigo-500" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto space-y-6 pb-16 p-2"
    >
      <header className="flex flex-col gap-4 px-2">
        <Link to="/" className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 hover:text-indigo-600 uppercase tracking-widest w-fit transition-colors">
          <ArrowLeft size={14} />
          Voltar ao Dashboard
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white tracking-tighter uppercase italic leading-none flex items-center gap-3">
              <UserMinus size={28} className="text-orange-600" />
              Alunos Inativados
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-bold mt-2 uppercase text-[10px] tracking-[0.2em]">{academy?.name}</p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Buscar aluno..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl py-3 pl-10 pr-4 text-[11px] font-bold outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition-all"
            />
          </div>
        </div>
      </header>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 px-2">
        <div className="bg-white dark:bg-slate-900 border border-orange-100 dark:border-orange-900/30 rounded-[24px] p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-orange-500">
            <Users size={16} />
            <p className="text-[9px] font-black uppercase tracking-widest">Total</p>
          </div>
          <p className="text-2xl font-black text-orange-600 dark:text-orange-400 italic leading-none">{summary.total}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-amber-100 dark:border-amber-900/30 rounded-[24px] p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-amber-500">
            <UserMinus size={16} />
            <p className="text-[9px] font-black uppercase tracking-widest">Inativos</p>
          </div>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 italic leading-none">{summary.inactive}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-red-100 dark:border-red-900/30 rounded-[24px] p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-red-500">
            <UserX size={16} />
            <p className="text-[9px] font-black uppercase tracking-widest">Evadidos</p>
          </div>
          <p className="text-2xl font-black text-red-600 dark:text-red-400 italic leading-none">{summary.dropped}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[24px] p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-slate-400">
            <PhoneOff size={16} />
            <p className="text-[9px] font-black uppercase tracking-widest">Sem Contato</p>
          </div>
          <p className="text-2xl font-black text-slate-700 dark:text-slate-200 italic leading-none">{summary.noContact}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar px-2 pb-1">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${
              filter === f.key
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-indigo-200'
            }`}
          >
            {f.label}
            <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${filter === f.key ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800'}`}>{f.count}</span>
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="bg-white dark:bg-slate-900 rounded-[32px] sm:rounded-[40px] border border-slate-100 dark:border-slate-800 p-4 sm:p-6 shadow-sm mx-2">
        {filteredStudents.length === 0 ? (
          <div className="text-center py-16 text-slate-400 italic text-sm">Nenhum aluno inativado para este filtro.</div>
        ) : (
          <div className="space-y-2">
            {filteredStudents.map(({ student, daysSinceLastAttendance }) => {
              const whatsappUrl = getReturnWhatsappUrl(student, academy?.name ?? '');
              const isDropped = student.status === 'Dropped';
              return (
                <div
                  key={student.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-3xl border transition-all ${
                    isDropped
                      ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30'
                      : 'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-2xl shrink-0 flex items-center justify-center font-black text-base overflow-hidden ${getBeltClassName(student.belt, getBeltConfig(student.belt)?.colorKey) || 'bg-slate-200 text-slate-700'}`}>
                      {studentPhotos[student.id]
                        ? <img src={studentPhotos[student.id]} className="w-full h-full object-cover" />
                        : student.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-slate-800 dark:text-white text-sm uppercase italic truncate leading-none">{student.name}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          isDropped
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                            : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                        }`}>
                          {isDropped ? 'Evadido' : 'Inativo'}
                        </span>
                        {student.accessBlocked && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300" title="Acesso bloqueado pela academia — não registra presença nem check-in">
                            <ShieldOff size={10} />
                            Bloqueado
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <CalendarOff size={11} />
                          {formatLastAttendance(student, daysSinceLastAttendance)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-2 ml-auto">
                    {whatsappUrl ? (
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Chamar de volta pelo WhatsApp"
                        className="flex items-center gap-1.5 bg-[#25D366] hover:bg-[#128C7E] text-white px-3 sm:px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-green-500/20"
                      >
                        <WhatsAppIcon size={14} />
                        <span>Chamar de Volta</span>
                      </a>
                    ) : (
                      <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 py-2.5">
                        <PhoneOff size={14} />
                        Sem telefone
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleReactivate(student)}
                      disabled={reactivatingId === student.id}
                      title="Voltou a treinar: reativa a matrícula, o acesso e a conta de login"
                      className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 px-3 sm:px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                    >
                      {reactivatingId === student.id
                        ? <Loader2 size={14} className="animate-spin" />
                        : <UserCheck size={14} />}
                      <span>Reativar</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default InactiveStudentsReportView;
