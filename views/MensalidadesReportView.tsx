import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  CreditCard,
  Search,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Clock,
  CalendarClock,
} from 'lucide-react';
import { Academy, Student, User } from '../types';
import { studentService } from '@/features/students/services/studentService';
import { financeService } from '@/features/finances/services/financeService';
import { useAcademyBeltRanks } from '@/features/settings/hooks/useAcademyBeltRanks';
import { getBeltClassName } from '../constants';
import { advancePaymentDate } from '@/utils/paymentUtils';
import { getTodayBrasilia } from '@/utils/date';
import { useTranslation } from '../services/LanguageContext';
import { Spinner } from '@/components/ui';

const WhatsAppIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.198.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
    <path fillRule="evenodd" clipRule="evenodd" d="M12.05 21.785h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.981.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.259c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

type PaymentFilter = 'all' | 'overdue' | 'today' | 'next7' | 'next30';

const MensalidadesReportView: React.FC<{ academy: Academy; user: User }> = ({ academy }) => {
  const { showNotification } = useTranslation();
  const { getBeltConfig } = useAcademyBeltRanks(academy?.id);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<PaymentFilter>('all');
  const [markingPaymentId, setMarkingPaymentId] = useState<string | null>(null);

  useEffect(() => {
    if (!academy?.id) return;
    setIsLoading(true);
    studentService.getAll(academy.id, { limit: 1000 })
      .then(res => setStudents(res.data))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [academy?.id]);

  const payments = useMemo(() => {
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
  }, [students, academy?.plans]);

  const summary = useMemo(() => ({
    overdue: payments.filter(p => p.diffDays < 0).length,
    today: payments.filter(p => p.diffDays === 0).length,
    next7: payments.filter(p => p.diffDays > 0 && p.diffDays <= 7).length,
    next30: payments.filter(p => p.diffDays > 7 && p.diffDays <= 30).length,
  }), [payments]);

  const filteredPayments = useMemo(() => {
    return payments
      .filter(({ diffDays }) => {
        if (filter === 'overdue') return diffDays < 0;
        if (filter === 'today') return diffDays === 0;
        if (filter === 'next7') return diffDays > 0 && diffDays <= 7;
        if (filter === 'next30') return diffDays > 7 && diffDays <= 30;
        return true;
      })
      .filter(({ student }) => student.name.toLowerCase().includes(search.toLowerCase()));
  }, [payments, filter, search]);

  const getPaymentWhatsappUrl = (student: Student, diffDays: number, price?: number) => {
    const contactPhone = student.phone || student.guardianPhone;
    if (!contactPhone) return null;

    const statusText = diffDays < 0
      ? `sua mensalidade está *vencida há ${Math.abs(diffDays)} dia${Math.abs(diffDays) !== 1 ? 's' : ''}*`
      : diffDays === 0
      ? 'sua mensalidade *vence hoje*'
      : `sua mensalidade *vence em ${diffDays} dia${diffDays !== 1 ? 's' : ''}*`;

    let text = `Olá ${student.name}! Tudo bem?\n\nPassando para avisar que ${statusText}${academy ? ` na ${academy.name}` : ''}.`;

    if (price != null) {
      text += `\n\nValor: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price)}`;
    }

    if (academy?.pixKey) {
      text += `\n\nPara realizar o pagamento, utilize a chave PIX (${academy.pixType}): ${academy.pixKey}\n\nApós o pagamento, por favor envie o comprovante por aqui pelo WhatsApp. Obrigado!`;
    }

    return `https://wa.me/55${contactPhone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
  };

  const markPaymentAsPaid = async (student: Student) => {
    if (!student.nextPaymentDate) return;
    const oldDueDate = student.nextPaymentDate;
    const plan = academy?.plans?.find((p: any) => p.id === student.planId);
    setMarkingPaymentId(student.id);
    try {
      const nextDate = advancePaymentDate(oldDueDate);
      const updated = await studentService.update(student.id, { nextPaymentDate: nextDate } as any);
      await financeService.create(academy!.id, {
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
      showNotification(
        `Mensalidade de ${student.name} registrada. Próx. vencimento: ${new Date(nextDate + 'T12:00:00').toLocaleDateString('pt-BR')}`
      );
    } catch {
      showNotification('Erro ao registrar pagamento.', 'error');
    } finally {
      setMarkingPaymentId(null);
    }
  };

  const filters: { key: PaymentFilter; label: string; count: number }[] = [
    { key: 'all', label: 'Todos', count: payments.length },
    { key: 'overdue', label: 'Vencidas', count: summary.overdue },
    { key: 'today', label: 'Vence Hoje', count: summary.today },
    { key: 'next7', label: 'Próx. 7 Dias', count: summary.next7 },
    { key: 'next30', label: 'Próx. 30 Dias', count: summary.next30 },
  ];

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
        <Link to="/dashnovo" className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 hover:text-indigo-600 uppercase tracking-widest w-fit transition-colors">
          <ArrowLeft size={14} />
          Voltar ao Dashboard
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white tracking-tighter uppercase italic leading-none flex items-center gap-3">
              <CreditCard size={28} className="text-emerald-600" />
              Relatório de Mensalidades
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
        <div className="bg-white dark:bg-slate-900 border border-red-100 dark:border-red-900/30 rounded-[24px] p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-red-500">
            <AlertTriangle size={16} />
            <p className="text-[9px] font-black uppercase tracking-widest">Vencidas</p>
          </div>
          <p className="text-2xl font-black text-red-600 dark:text-red-400 italic leading-none">{summary.overdue}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-amber-100 dark:border-amber-900/30 rounded-[24px] p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-amber-500">
            <Clock size={16} />
            <p className="text-[9px] font-black uppercase tracking-widest">Vence Hoje</p>
          </div>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 italic leading-none">{summary.today}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[24px] p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-slate-400">
            <CalendarClock size={16} />
            <p className="text-[9px] font-black uppercase tracking-widest">Próx. 7 Dias</p>
          </div>
          <p className="text-2xl font-black text-slate-700 dark:text-slate-200 italic leading-none">{summary.next7}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[24px] p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-slate-400">
            <CalendarClock size={16} />
            <p className="text-[9px] font-black uppercase tracking-widest">Próx. 30 Dias</p>
          </div>
          <p className="text-2xl font-black text-slate-700 dark:text-slate-200 italic leading-none">{summary.next30}</p>
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
        {filteredPayments.length === 0 ? (
          <div className="text-center py-16 text-slate-400 italic text-sm">Nenhuma mensalidade encontrada para este filtro.</div>
        ) : (
          <div className="space-y-2">
            {filteredPayments.map(({ student, diffDays, price }) => {
              const whatsappUrl = getPaymentWhatsappUrl(student, diffDays, price);
              return (
                <div
                  key={student.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-3xl border transition-all ${
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
                  <div className="shrink-0 flex items-center gap-2 ml-auto">
                    {whatsappUrl && (
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Cobrar pelo WhatsApp"
                        className="flex items-center justify-center bg-[#25D366] hover:bg-[#128C7E] text-white p-2.5 rounded-2xl transition-all active:scale-95 shadow-lg shadow-green-500/20"
                      >
                        <WhatsAppIcon size={14} />
                      </a>
                    )}
                    <button
                      disabled={markingPaymentId === student.id}
                      onClick={() => markPaymentAsPaid(student)}
                      className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 px-3 sm:px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-60 border border-emerald-100 dark:border-emerald-900/30 cursor-pointer"
                    >
                      {markingPaymentId === student.id
                        ? <Loader2 size={14} className="animate-spin" />
                        : <CheckCircle2 size={14} />}
                      <span>Marcar Pago</span>
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

export default MensalidadesReportView;
