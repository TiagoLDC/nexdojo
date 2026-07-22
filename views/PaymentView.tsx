
import React, { useMemo } from 'react';
import { Academy, Student, User, FinanceTransaction } from '../types';
import { studentService } from '@/features/students/services/studentService';
import { financeService } from '@/features/finances/services/financeService';
import { useProfileStore, getActiveProfile } from '@/stores/profileStore';
import {
  CreditCard,
  QrCode,
  Copy,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  DollarSign,
  TrendingUp,
  Calendar
} from 'lucide-react';

const PaymentView: React.FC<{ academy: Academy; user: User }> = ({ academy, user }) => {
  const [student, setStudent] = React.useState<Student | null>(null);
  const [transactions, setTransactions] = React.useState<FinanceTransaction[]>([]);
  const [showPixSuccess, setShowPixSuccess] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  const { profiles, activeProfileId } = useProfileStore();
  const activeProfile = getActiveProfile(profiles, activeProfileId);

  React.useEffect(() => {
    if (!academy || !user) return;

    setIsLoading(true);

    // Responsável gerenciando um dependente: busca direto pelo aluno selecionado.
    // Sem perfil ativo (fluxo padrão do aluno logado): resolve pelo próprio e-mail, como antes.
    const resolveProfile = activeProfile && activeProfile.entityType === 'student'
      ? studentService.getById(activeProfile.entityId)
      : studentService.getAll(academy.id, { email: user.email, limit: 1 })
          .then((res) => {
            const students = Array.isArray(res.data) ? res.data : [];
            return students.find(s => s.email?.toLowerCase() === user.email?.toLowerCase()) ?? null;
          });

    resolveProfile.then((profile) => {
      if (!profile) { setStudent(null); setTransactions([]); return; }
      setStudent(profile);
      return financeService.getAll(academy.id, { studentId: profile.id, limit: 1000 }).then((finRes) => {
        setTransactions(Array.isArray(finRes.data) ? finRes.data : []);
      });
    }).catch(() => {
      // profile not found or error — leave student as null
    }).finally(() => {
      setIsLoading(false);
    });
  }, [academy, user, activeProfile?.entityId, activeProfile?.entityType]);

  const handleCopyPix = () => {
    if (!academy.pixKey) return;
    navigator.clipboard.writeText(academy.pixKey);
    setShowPixSuccess(true);
    setTimeout(() => setShowPixSuccess(false), 2000);
  };

  const studentPayments = useMemo(() => {
    return transactions
      .filter(t => t.type === 'income')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions]);

  const planInfo = useMemo(() => {
    if (!student?.planId || !academy.plans) return null;
    return (academy.plans as any[]).find(p => p.id === student.planId) ?? null;
  }, [student?.planId, academy.plans]);

  // Status da mensalidade baseado em nextPaymentDate
  const paymentStatus = useMemo(() => {
    if (!student?.nextPaymentDate) return { state: 'unknown' as const, diffDays: 0 };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const paymentDate = new Date(student.nextPaymentDate + 'T12:00:00');
    paymentDate.setHours(0, 0, 0, 0);
    const diffDays = Math.round((paymentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    // Planos gratuitos (mensalidade R$ 0) nunca disparam aviso de vencimento
    if ((planInfo?.price ?? 0) <= 0) return { state: 'ok' as const, diffDays };
    if (diffDays < 0)  return { state: 'overdue'  as const, diffDays };
    if (diffDays === 0) return { state: 'dueToday' as const, diffDays };
    if (diffDays <= 7)  return { state: 'upcoming' as const, diffDays };
    return { state: 'ok' as const, diffDays };
  }, [student?.nextPaymentDate, planInfo]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Carregando informações...</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-6 text-center px-6">
        <div className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-[32px] text-amber-600">
          <AlertCircle size={48} />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase italic tracking-tight">Perfil de Aluno Não Encontrado</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs mx-auto">
            Não encontramos um cadastro de aluno vinculado ao seu e-mail (<b>{user.email}</b>).
          </p>
          <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mt-4">
            Apenas alunos cadastrados podem acessar esta área.
          </p>
        </div>
      </div>
    );
  }

  // Config visual do status
  const statusConfig = {
    ok:      { icon: <CheckCircle2 size={24} />, bg: 'bg-green-100 text-green-600',  label: 'EM DIA',        color: 'text-green-600' },
    upcoming:{ icon: <Clock size={24} />,        bg: 'bg-amber-100 text-amber-600',  label: 'A VENCER',      color: 'text-amber-600' },
    dueToday:{ icon: <Clock size={24} />,        bg: 'bg-amber-100 text-amber-600',  label: 'VENCE HOJE',    color: 'text-amber-600' },
    overdue: { icon: <AlertTriangle size={24} />,bg: 'bg-red-100 text-red-600',      label: 'VENCIDA',       color: 'text-red-600'   },
    unknown: { icon: <CheckCircle2 size={24} />, bg: 'bg-green-100 text-green-600',  label: student.status === 'Active' ? 'EM DIA' : 'PENDENTE', color: student.status === 'Active' ? 'text-green-600' : 'text-red-600' },
  }[paymentStatus.state];

  const statusSubtitle = {
    ok:       `Vence em ${paymentStatus.diffDays} dia${paymentStatus.diffDays !== 1 ? 's' : ''} — ${new Date(student.nextPaymentDate! + 'T12:00:00').toLocaleDateString('pt-BR')}`,
    upcoming: `Vence em ${paymentStatus.diffDays} dia${paymentStatus.diffDays !== 1 ? 's' : ''} — ${new Date(student.nextPaymentDate! + 'T12:00:00').toLocaleDateString('pt-BR')}`,
    dueToday: `Vence hoje — ${new Date(student.nextPaymentDate! + 'T12:00:00').toLocaleDateString('pt-BR')}`,
    overdue:  `Vencida há ${Math.abs(paymentStatus.diffDays)} dia${Math.abs(paymentStatus.diffDays) !== 1 ? 's' : ''} — ${new Date(student.nextPaymentDate! + 'T12:00:00').toLocaleDateString('pt-BR')}`,
    unknown:  studentPayments[0] ? new Date(studentPayments[0].date).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : 'N/A',
  }[paymentStatus.state];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-32 animate-in fade-in duration-700 px-2">
      <header>
        <h1 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white tracking-tighter uppercase italic leading-none">
          Pagamento & Mensalidade
        </h1>
        <p className="text-slate-500 dark:text-slate-400 font-bold mt-2 uppercase text-[10px] tracking-[0.2em]">
          Gerencie suas contribuições com a {academy.name}
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Card de Pagamento via PIX */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col">
          <div className="flex items-center gap-4 mb-8">
            <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg shadow-indigo-600/20">
              <QrCode size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight uppercase italic">Pagar via PIX</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Liberação automática após conferência</p>
            </div>
          </div>

          {academy.pixKey ? (
            <div className="flex-1 flex flex-col justify-center gap-8">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-[32px] border border-dashed border-slate-200 dark:border-slate-700 text-center relative group">
                <div className="w-48 h-48 bg-white dark:bg-slate-800 p-4 rounded-3xl mx-auto mb-6 border border-slate-100 dark:border-slate-700/50 flex items-center justify-center shadow-inner">
                  <QrCode size={140} className="text-slate-900 dark:text-white" />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chave PIX ({academy.pixType})</p>
                  <p className="font-mono font-bold text-sm text-slate-800 dark:text-white break-all">{academy.pixKey}</p>
                </div>

                {showPixSuccess && (
                  <div className="absolute inset-0 bg-indigo-600/95 backdrop-blur-sm rounded-[32px] flex flex-col items-center justify-center text-white animate-in fade-in zoom-in duration-300">
                    <CheckCircle2 size={48} className="mb-2" />
                    <span className="font-black uppercase tracking-widest text-xs">Chave Copiada!</span>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <button
                  onClick={handleCopyPix}
                  className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-700 dark:text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all text-sm uppercase tracking-widest"
                >
                  <Copy size={20} className="text-indigo-600" />
                  Copiar Chave PIX
                </button>
                <p className="text-[10px] text-slate-400 text-center font-medium px-6">
                  * Após o pagamento, encaminhe o comprovante para seu professor via WhatsApp ou Mural.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
              <AlertCircle size={48} className="text-slate-300 mb-4" />
              <p className="text-sm text-slate-500 font-medium max-w-[200px]">A academia ainda não configurou uma chave PIX.</p>
            </div>
          )}
        </div>

        {/* Informações e Status */}
        <div className="space-y-6">
          {/* STATUS DA MENSALIDADE — oculto para planos gratuitos (valor R$ 0) */}
          {(planInfo?.price ?? 1) > 0 && (
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm">
              <h3 className="text-lg font-black text-slate-800 dark:text-white mb-6 uppercase italic flex items-center gap-2">
                <DollarSign size={20} className="text-indigo-600" />
                Status da Mensalidade
              </h3>

              <div className={`p-6 rounded-3xl border ${
                paymentStatus.state === 'overdue'  ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/20' :
                paymentStatus.state === 'dueToday' || paymentStatus.state === 'upcoming' ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/20' :
                'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${statusConfig.bg}`}>
                      {statusConfig.icon}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Situação Atual</p>
                      <p className={`text-xl font-black uppercase italic ${statusConfig.color}`}>
                        {statusConfig.label}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                      {paymentStatus.state === 'unknown' ? 'Última Ref.' : 'Vencimento'}
                    </p>
                    <p className={`text-xs font-bold ${paymentStatus.state === 'overdue' ? 'text-red-600' : paymentStatus.state === 'dueToday' || paymentStatus.state === 'upcoming' ? 'text-amber-600' : 'text-slate-700 dark:text-slate-200'}`}>
                      {statusSubtitle}
                    </p>
                  </div>
                </div>

                {/* Plano + Valor */}
                {planInfo && (
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard size={14} className="text-slate-400" />
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{planInfo.name}</span>
                    </div>
                    <span className="text-sm font-black text-indigo-600">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(planInfo.price)}
                      <span className="text-[9px] text-slate-400 font-bold">/mês</span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* DADOS BANCÁRIOS */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm">
            <h3 className="text-lg font-black text-slate-800 dark:text-white mb-6 uppercase italic flex items-center gap-2">
              <CreditCard size={20} className="text-indigo-600" />
              Dados Bancários
            </h3>

            {academy.bankName ? (
              <div className="space-y-4">
                <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="grid grid-cols-2 gap-y-4">
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Banco</p>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{academy.bankName}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Agência</p>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{academy.bankAgency}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Número da Conta</p>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{academy.bankAccount}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic text-center py-4">Dados bancários não configurados.</p>
            )}
          </div>
        </div>
      </div>

      {/* HISTÓRICO DE PAGAMENTOS */}
      <section className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden transition-all">
        <header className="px-8 py-6 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase italic tracking-tight flex items-center gap-2">
            <TrendingUp size={24} className="text-indigo-600" />
            Meu Histórico
          </h2>
          <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest">
            {studentPayments.length} Registros
          </span>
        </header>

        <div className="overflow-x-auto">
          {studentPayments.length > 0 ? (
            <>
              {/* Desktop table */}
              <table className="w-full text-left hidden sm:table">
                <thead className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-50 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Plano de Aula</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vencimento</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Registro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {studentPayments.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-800 dark:text-white text-sm leading-tight uppercase italic">{p.description}</p>
                        {p.category && <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-0.5">{p.category}</p>}
                      </td>
                      <td className="px-6 py-4 text-right font-black text-sm text-green-600 whitespace-nowrap">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.amount)}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-500 whitespace-nowrap">
                        {p.dueDate
                          ? new Date(p.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')
                          : <span className="text-slate-300 italic text-[11px]">—</span>}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-500 whitespace-nowrap">
                        {new Date(p.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile cards */}
              <div className="sm:hidden divide-y divide-slate-50 dark:divide-slate-800">
                {studentPayments.map(p => (
                  <div key={p.id} className="px-6 py-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-slate-800 dark:text-white text-sm uppercase italic">{p.description}</p>
                        {p.category && <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-0.5">{p.category}</p>}
                      </div>
                      <span className="font-black text-sm text-green-600 shrink-0 ml-3">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.amount)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {p.dueDate && (
                        <span className="flex items-center gap-1">
                          <Calendar size={10} />
                          Venc. {new Date(p.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        Reg. {new Date(p.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="py-20 text-center text-slate-400 space-y-4">
              <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mx-auto">
                <Clock size={32} strokeWidth={1} />
              </div>
              <p className="text-sm font-medium italic">Nenhum histórico de pagamento registrado no sistema.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default PaymentView;
