
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { StorageService } from '../services/storage';
import { FinanceTransaction, TransactionType, Student, Academy, User } from '../types';
import { 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  Search, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  CreditCard,
  Banknote,
  PieChart as PieChartIcon,
  Trash2,
  AlertTriangle,
  Loader2,
  Copy,
  ExternalLink,
  Share2,
  QrCode,
  Download,
  Printer,
  FileText
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const CATEGORIES = {
  income: ['Mensalidade', 'Exame de Faixa', 'Seminário', 'Venda de Equipamento', 'Outros'],
  expense: ['Aluguel', 'Energia/Água', 'Limpeza', 'Marketing', 'Salário Professores', 'Manutenção', 'Outros']
};

const PAYMENT_METHODS = ['Dinheiro', 'Pix', 'Cartão de Crédito', 'Cartão de Débito', 'Transferência'];

const PrintHeader: React.FC<{ title: string; academy: Academy }> = ({ title, academy }) => {
  return (
    <div className="hidden print:block mb-8 border-b-2 border-slate-900 pb-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900">{academy?.name || 'Academia'}</h1>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{academy?.address || ''}</p>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-black text-indigo-600 uppercase italic leading-none">{title}</h2>
          <p className="text-[10px] font-bold text-slate-400 mt-1">{new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</p>
        </div>
      </div>
    </div>
  );
};

const FinancesView: React.FC<{ academy: Academy; user: User }> = ({ academy, user }) => {
  const financeRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<FinanceTransaction | null>(null);
  
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  
  // Form State
  const [formData, setFormData] = useState<Partial<FinanceTransaction>>({
    type: 'income',
    amount: 0,
    description: '',
    category: 'Mensalidade',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'Pix',
    status: 'paid',
    studentId: undefined
  });

  const [toast, setToast] = useState<{message: string, type: 'success' | 'delete'} | null>(null);

  useEffect(() => {
    if (academy) {
      setTransactions(StorageService.getFinances(academy.id));
      setStudents(StorageService.getStudents(academy.id));
    }
  }, [academy]);

  const showNotification = (message: string, type: 'success' | 'delete' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const totals = useMemo(() => {
    return transactions.reduce((acc, t) => {
      const amount = Number(t.amount);
      if (t.type === 'income') acc.income += amount;
      else acc.expense += amount;
      return acc;
    }, { income: 0, expense: 0 });
  }, [transactions]);

  const chartData = useMemo(() => {
    const grouped = transactions.reduce((acc: any, t) => {
      acc[t.category] = (acc[t.category] || 0) + Number(t.amount);
      return acc;
    }, {});
    
    return Object.entries(grouped).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter(t => {
        const matchesSearch = t.description.toLowerCase().includes(search.toLowerCase()) || 
                             t.category.toLowerCase().includes(search.toLowerCase());
        const matchesType = typeFilter === 'All' || t.type === typeFilter;
        return matchesSearch && matchesType;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, search, typeFilter]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.description) return;

    const newTransaction: FinanceTransaction = {
      id: Math.random().toString(36).substr(2, 9),
      academyId: academy.id,
      ...formData as FinanceTransaction
    };

    setTransactions(prev => {
      const updated = [newTransaction, ...prev];
      StorageService.saveFinances(updated);
      return updated;
    });

    // Atualizar próxima mensalidade do aluno se for o caso
    if (newTransaction.type === 'income' && (newTransaction.category === 'Mensalidade' || newTransaction.description.toLowerCase().includes('mensalidade')) && newTransaction.studentId) {
      const allStudents = StorageService.getStudents();
      const student = allStudents.find(s => s.id === newTransaction.studentId);
      if (student) {
        // Pula 30 dias a partir da data do pagamento ou do vencimento atual (o que for maior ou apenas da data atual)
        const baseDate = student.nextPaymentDate ? new Date(student.nextPaymentDate + 'T12:00:00') : new Date();
        const today = new Date();
        const referenceValue = baseDate.getTime() > today.getTime() ? baseDate : today;
        
        referenceValue.setDate(referenceValue.getDate() + 30);
        const nextDate = referenceValue.toISOString().split('T')[0];
        
        const updatedStudents = allStudents.map(s => s.id === student.id ? { ...s, nextPaymentDate: nextDate } : s);
        StorageService.saveStudents(updatedStudents);
        setStudents(updatedStudents.filter(s => s.academyId === academy.id));
      }
    }

    setIsModalOpen(false);
    showNotification(newTransaction.type === 'income' ? "Entrada registrada!" : "Saída registrada!");
    
    setFormData({
      type: 'income',
      amount: 0,
      description: '',
      category: 'Mensalidade',
      date: new Date().toISOString().split('T')[0],
      paymentMethod: 'Pix',
      status: 'paid',
      studentId: undefined
    });
  };

  const handleCopyPix = () => {
    if (!academy.pixKey) return;
    navigator.clipboard.writeText(academy.pixKey);
    alert("Chave PIX copiada!");
  };

  const handleSharePayment = () => {
    const text = `*Informações para Pagamento - ${academy.name}*\n\nPIX (${academy.pixType}): ${academy.pixKey}\n\n${academy.bankName ? `Banco: ${academy.bankName}\nAgência: ${academy.bankAgency}\nConta: ${academy.bankAccount}\n` : ''}\nFavor enviar o comprovante após o pagamento. OSS!`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const confirmDelete = (transaction: FinanceTransaction) => {
    setTransactionToDelete(transaction);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = () => {
    if (!transactionToDelete) return;

    setTransactions(prev => {
      const updated = prev.filter(t => t.id !== transactionToDelete.id);
      StorageService.saveFinances(updated);
      return updated;
    });

    setIsDeleteModalOpen(false);
    setTransactionToDelete(null);
    showNotification("Lançamento removido.", 'delete');
  };

  const handleExportPDF = async () => {
    if (!financeRef.current) return;
    
    setIsExporting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const canvas = await html2canvas(financeRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        ignoreElements: (element) => {
          return element.classList.contains('no-print');
        }
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`financeiro_${academy.name.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Houve um erro ao gerar o PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-32 animate-in fade-in duration-500">
      <div ref={financeRef} className="bg-white p-4 md:p-8 rounded-[48px] print:p-0">
        <PrintHeader title="Relatório Financeiro e Fluxo de Caixa" academy={academy} />
        {toast && (
          <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[110] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-top duration-300 no-print ${
            toast.type === 'success' ? 'bg-indigo-600 text-white' : 'bg-red-600 text-white'
          }`}>
            {toast.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <span className="font-bold text-sm tracking-tight">{toast.message}</span>
          </div>
        )}

        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">Fluxo de Caixa</h1>
            <p className="text-slate-500 dark:text-slate-400">Controle financeiro e contabilidade da academia.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-4 rounded-3xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/20 transition-all active:scale-95"
            >
              <Plus size={20} />
              Novo
            </button>
            <button 
              onClick={handleExportPDF}
              disabled={isExporting}
              className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white px-6 py-4 rounded-3xl font-bold flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-800 shadow-sm transition-all active:scale-95 disabled:opacity-50"
            >
              {isExporting ? <Loader2 size={20} className="animate-spin" /> : <FileText size={20} className="text-indigo-500" />}
              {isExporting ? 'Processando...' : 'Relatório PDF'}
            </button>
            <button 
              onClick={() => setIsPaymentModalOpen(true)}
              className="hidden lg:flex bg-white dark:bg-slate-900 text-slate-800 dark:text-white px-6 py-4 rounded-3xl font-bold items-center justify-center gap-2 border border-slate-200 dark:border-slate-800 shadow-sm transition-all active:scale-95"
            >
              <QrCode size={20} className="text-indigo-500" />
              Cobrança
            </button>
          </div>
        </header>

        {/* Resumo Financeiro */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <FinanceCard 
          label="Saldo Total" 
          value={totals.income - totals.expense} 
          icon={<Wallet size={24} />} 
          variant="blue" 
        />
        <FinanceCard 
          label="Receitas (Total)" 
          value={totals.income} 
          icon={<ArrowUpRight size={24} />} 
          variant="green" 
        />
        <FinanceCard 
          label="Despesas (Total)" 
          value={totals.expense} 
          icon={<ArrowDownRight size={24} />} 
          variant="red" 
        />
        {/* Projeção do Mês baseada em alunos ativos */}
        <div className="bg-slate-900 dark:bg-slate-800 text-white p-6 rounded-[40px] shadow-xl relative overflow-hidden group border border-slate-700">
           <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-1">Projeção do Mês</p>
              <h3 className="text-2xl font-black">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(students.filter(s => s.status === 'Active').length * 150)}
              </h3>
              <p className="text-[8px] font-bold text-indigo-400 uppercase tracking-widest mt-1 italic">Expectativa vs Realidade</p>
           </div>
           <TrendingUp size={80} className="absolute -bottom-4 -right-4 text-white/5 opacity-20" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Gráfico */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
            <PieChartIcon size={20} className="text-indigo-500" />
            Distribuição por Categoria
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Bar dataKey="value" radius={[10, 10, 0, 0]} barSize={40} isAnimationActive={false}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#4f46e5' : '#10b981'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Filtros e Pesquisa */}
        <div className="space-y-6 no-print">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
            <h3 className="font-bold text-slate-800 dark:text-white mb-4">Filtrar Histórico</h3>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Pesquisar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none text-sm font-medium"
                />
              </div>
              <div className="flex gap-2">
                <FilterButton label="Todos" active={typeFilter === 'All'} onClick={() => setTypeFilter('All')} />
                <FilterButton label="Entradas" active={typeFilter === 'income'} onClick={() => setTypeFilter('income')} />
                <FilterButton label="Saídas" active={typeFilter === 'expense'} onClick={() => setTypeFilter('expense')} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de Lançamentos */}
      <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-slate-50 dark:divide-slate-800">
          {filteredTransactions.map(t => (
            <div key={t.id} className="p-6 flex flex-col gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(t.date).toLocaleDateString('pt-BR')}</span>
                <span className={`font-black text-sm ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                  {t.type === 'income' ? '+' : '-'} {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.amount)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-800 dark:text-white text-sm leading-tight">{t.description}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{t.paymentMethod} • {t.category}</p>
                </div>
                <button 
                  onClick={() => confirmDelete(t)} 
                  className="p-2 text-slate-300 hover:text-red-500 rounded-lg transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
          {filteredTransactions.length === 0 && (
            <div className="p-12 text-center text-slate-400 italic text-sm">Nenhum lançamento encontrado.</div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoria</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {filteredTransactions.map(t => (
                <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-8 py-5 text-sm font-bold text-slate-500 whitespace-nowrap">{new Date(t.date).toLocaleDateString('pt-BR')}</td>
                  <td className="px-8 py-5">
                    <p className="font-bold text-slate-800 dark:text-white text-sm leading-tight">{t.description}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{t.paymentMethod}</p>
                  </td>
                  <td className="px-8 py-5">
                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                      {t.category}
                    </span>
                  </td>
                  <td className={`px-8 py-5 font-black text-sm whitespace-nowrap ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {t.type === 'income' ? '+' : '-'} {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.amount)}
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button 
                      onClick={() => confirmDelete(t)} 
                      className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all active:scale-90"
                      title="Excluir Lançamento"
                    >
                      <Trash2 size={20} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-slate-400 italic">Nenhum lançamento encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Cobrança Digital */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[150] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[40px] p-8 animate-in zoom-in duration-300 shadow-2xl text-center">
            <header className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase italic tracking-tight">Cobrança Digital</h2>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400"><X size={24} /></button>
            </header>

            {academy.pixKey ? (
              <div className="space-y-6">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[32px] border border-dashed border-slate-200 dark:border-slate-700">
                  <div className="w-48 h-48 bg-white p-4 rounded-3xl mx-auto mb-4 border border-slate-100 flex items-center justify-center">
                    <QrCode size={120} className="text-slate-900" />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Chave PIX ({academy.pixType})</p>
                  <p className="font-mono font-bold text-xs text-slate-800 dark:text-white break-all">{academy.pixKey}</p>
                </div>

                {academy.bankName && (
                  <div className="text-left bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Dados Bancários</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{academy.bankName}</p>
                    <p className="text-xs text-slate-500 font-medium">Ag: {academy.bankAgency} • Cc: {academy.bankAccount}</p>
                  </div>
                )}

                <div className="flex flex-col gap-3 pt-2">
                  <button 
                    onClick={handleCopyPix}
                    className="w-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all text-sm"
                  >
                    <Copy size={20} />
                    Copiar Chave
                  </button>
                  <button 
                    onClick={handleSharePayment}
                    className="w-full bg-green-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-green-600/20 active:scale-95 transition-all uppercase tracking-widest text-sm"
                  >
                    <Share2 size={20} />
                    Enviar p/ Aluno
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-10">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 mx-auto mb-4">
                  <AlertCircle size={32} />
                </div>
                <p className="text-sm text-slate-500 font-medium mb-6 leading-relaxed">Você ainda não configurou seus dados de recebimento nas configurações.</p>
                <button 
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-xs"
                >
                  Voltar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Lançamento */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[150] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[40px] p-8 animate-in zoom-in duration-300 shadow-2xl flex flex-col max-h-[90vh]">
            <header className="flex items-center justify-between mb-8 shrink-0">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl text-white ${formData.type === 'income' ? 'bg-green-600' : 'bg-red-600'}`}>
                  {formData.type === 'income' ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Novo Lançamento</h2>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Contabilidade do Tatame</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="bg-slate-100 dark:bg-slate-800 text-slate-400 p-3 rounded-full"><X size={24} /></button>
            </header>

            <form onSubmit={handleSave} className="space-y-6 overflow-y-auto pr-2 custom-scrollbar pb-10">
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, type: 'income', category: CATEGORIES.income[0]})}
                  className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${formData.type === 'income' ? 'bg-white dark:bg-slate-700 text-green-600 shadow-sm' : 'text-slate-400'}`}
                >
                  Entrada
                </button>
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, type: 'expense', category: CATEGORIES.expense[0]})}
                  className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${formData.type === 'expense' ? 'bg-white dark:bg-slate-700 text-red-600 shadow-sm' : 'text-slate-400'}`}
                >
                  Saída
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Valor (R$)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    value={formData.amount || ''}
                    onChange={(e) => setFormData({...formData, amount: Number(e.target.value)})}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 outline-none font-black text-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Data</label>
                  <input 
                    type="date" 
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 outline-none font-bold text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Descrição</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: Mensalidade João Silva"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 outline-none font-bold text-slate-800 dark:text-white"
                />
              </div>

              {formData.type === 'income' && (formData.category === 'Mensalidade' || formData.description?.toLowerCase().includes('mensalidade')) && (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Vincular Aluno (Opcional)</label>
                  <select 
                    value={formData.studentId || ''}
                    onChange={(e) => {
                      const studentId = e.target.value;
                      setFormData({...formData, studentId});
                      if (studentId) {
                        const student = students.find(s => s.id === studentId);
                        if (student && (!formData.description || formData.description === 'Mensalidade')) {
                           setFormData(prev => ({...prev, studentId, description: `Mensalidade ${student.name}`}));
                        }
                      }
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 outline-none font-bold text-slate-700 dark:text-slate-300 appearance-none"
                  >
                    <option value="">Selecionar Aluno...</option>
                    {students.sort((a, b) => a.name.localeCompare(b.name)).map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Categoria</label>
                  <select 
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 outline-none font-bold text-slate-700 dark:text-slate-300 appearance-none"
                  >
                    {formData.type === 'income' 
                      ? CATEGORIES.income.map(c => <option key={c} value={c}>{c}</option>)
                      : CATEGORIES.expense.map(c => <option key={c} value={c}>{c}</option>)
                    }
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Pagamento</label>
                  <select 
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 outline-none font-bold text-slate-700 dark:text-slate-300 appearance-none"
                  >
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              <button 
                type="submit"
                className={`w-full py-6 rounded-3xl font-black text-xl text-white shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 ${formData.type === 'income' ? 'bg-green-600 shadow-green-600/20' : 'bg-red-600 shadow-red-600/20'}`}
              >
                <DollarSign size={24} />
                Registrar OSS!
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {isDeleteModalOpen && transactionToDelete && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[40px] p-8 animate-in zoom-in duration-300 shadow-2xl text-center">
            <div className="bg-red-100 dark:bg-red-950/30 w-20 h-20 rounded-full flex items-center justify-center text-red-600 dark:text-red-400 mx-auto mb-6">
              <AlertTriangle size={40} />
            </div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2 tracking-tight">Excluir Lançamento?</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-8 leading-relaxed">
              Deseja realmente remover o lançamento <span className="text-slate-900 dark:text-white font-bold italic">"{transactionToDelete.description}"</span>? 
              Esta ação não poderá ser desfeita.
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleDelete}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-5 rounded-3xl shadow-xl shadow-red-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                Sim, Remover Agora
              </button>
              <button 
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setTransactionToDelete(null);
                }}
                className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold py-5 rounded-3xl transition-all active:scale-95"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
  );
};

const FinanceCard: React.FC<{ label: string; value: number; icon: React.ReactNode; variant: 'blue' | 'green' | 'red'; trend?: string }> = ({ label, value, icon, variant, trend }) => {
  const colors = {
    blue: 'bg-indigo-600 text-white shadow-indigo-600/20',
    green: 'bg-green-600 text-white shadow-green-600/20',
    red: 'bg-red-600 text-white shadow-red-600/20'
  };

  return (
    <div className={`${colors[variant]} p-6 rounded-[40px] shadow-2xl relative overflow-hidden group transition-all hover:scale-105 hover:rotate-1`}>
      <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
        {icon}
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-1">{label}</p>
      <div className="flex items-end justify-between">
        <h3 className="text-2xl font-black">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}</h3>
        {trend && <span className="text-[10px] font-bold bg-white/20 px-2 py-1 rounded-full">{trend}</span>}
      </div>
    </div>
  );
};

const FilterButton: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex-1 py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
      active ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400'
    }`}
  >
    {label}
  </button>
);

export default FinancesView;
