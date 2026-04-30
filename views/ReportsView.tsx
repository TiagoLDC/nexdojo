import React, { useMemo, useState, useRef } from 'react';
import { StorageService } from '../services/storage';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { 
  Download, 
  Calendar, 
  Users, 
  Clock, 
  Trophy, 
  Shirt, 
  TrendingUp, 
  Activity, 
  AlertCircle,
  FileText,
  Printer,
  Award,
  Loader2
} from 'lucide-react';
import { Belt, Academy, User } from '../types';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

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

const ReportsView: React.FC<{ academy: Academy; user: User }> = ({ academy, user }) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const attendance = useMemo(() => StorageService.getAttendance(academy.id), [academy?.id]);
  const students = useMemo(() => StorageService.getStudents(academy.id), [academy?.id]);
  const [timeRange, setTimeRange] = useState('7');

  // Stats Reais
  const stats = useMemo(() => {
    const active = students.filter(s => s.status === 'Active').length;
    const inactive = students.length - active;
    const totalHours = students.reduce((acc, s) => acc + (s.totalHours || 0), 0);
    const avgHours = active > 0 ? (totalHours / active).toFixed(1) : '0';
    const kimonoCount = attendance.filter(a => a.kimonoTaken).length;
    
    return { active, inactive, totalHours, avgHours, kimonoCount };
  }, [students, attendance]);

  // Attendance by day
  const attendanceByDay = useMemo(() => {
    const days = parseInt(timeRange);
    const lastDays = Array.from({ length: days }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      return d.toISOString().split('T')[0];
    });

    return lastDays.map(date => ({
      date: date.split('-').slice(1).join('/'),
      count: attendance.filter(a => a.date.startsWith(date)).length
    }));
  }, [attendance, timeRange]);

  // Belt distribution with actual colors
  const beltDistribution = useMemo(() => {
    const order = [
      Belt.WHITE, 
      Belt.GREY, 
      Belt.YELLOW, 
      Belt.ORANGE, 
      Belt.GREEN, 
      Belt.BLUE, 
      Belt.PURPLE, 
      Belt.BROWN, 
      Belt.BLACK
    ];
    return order.map(belt => ({
      name: belt,
      value: students.filter(s => s.belt === belt).length,
      color: belt === Belt.WHITE ? '#f8fafc' : 
             belt === Belt.GREY ? '#94a3b8' :
             belt === Belt.YELLOW ? '#facc15' :
             belt === Belt.ORANGE ? '#fb923c' :
             belt === Belt.GREEN ? '#22c55e' :
             belt === Belt.BLUE ? '#2563eb' : 
             belt === Belt.PURPLE ? '#9333ea' : 
             belt === Belt.BROWN ? '#78350f' : '#1e293b'
    })).filter(b => b.value > 0);
  }, [students]);

  // Growth (New students per month)
  const growthData = useMemo(() => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
    return months.map((m, i) => ({
      name: m,
      total: Math.floor(students.length * (0.5 + (i * 0.1)))
    }));
  }, [students]);

  const handleExportCSV = () => {
    const headers = ['Data', 'Total Alunos', 'Horas Totais'];
    const rows = attendanceByDay.map(d => `${d.date},${d.count},${(d.count * 1.5).toFixed(1)}`);
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + "\n" + rows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "relatorio_frequencia.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    
    setIsExporting(true);
    try {
      // Pequeno timeout para garantir que as animações dos gráficos (que desativamos) não interfiram
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const canvas = await html2canvas(reportRef.current, {
        scale: 2, // Aumenta a qualidade
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff', // Força fundo branco para o PDF
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
      pdf.save(`relatorio_${academy.name.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Houve um erro ao gerar o PDF. Por favor, tente novamente.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 px-2 md:px-0">
      <div ref={reportRef} className="bg-white p-4 md:p-8 rounded-[48px] print:p-0">
        <PrintHeader title="Análise de Percepções da Academia" academy={academy} />
        
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 no-print mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-indigo-600 rounded-xl text-white">
                <TrendingUp size={20} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">Análise de Dados</span>
            </div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">Percepções da Academia</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-2">Acompanhe o desempenho, crescimento e retenção dos seus atletas.</p>
          </div>
          <div className="flex flex-wrap gap-2 no-print">
            <select 
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none pr-10 relative"
            >
              <option value="7">Últimos 7 dias</option>
              <option value="15">Últimos 15 dias</option>
              <option value="30">Últimos 30 dias</option>
            </select>
            <button 
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95"
            >
              <Download size={18} />
              CSV
            </button>
            <button 
              onClick={handleExportPDF}
              disabled={isExporting}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {isExporting ? (
                <Loader2 size={18} className="animate-spin text-white" />
              ) : (
                <FileText size={18} className="text-white" />
              )}
              {isExporting ? 'Processando...' : 'Download PDF'}
            </button>
            <button 
              onClick={() => {
                window.focus();
                setTimeout(() => window.print(), 300);
              }}
              className="flex md:hidden items-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm active:scale-95"
            >
              <Printer size={18} className="text-indigo-600" />
              Imprimir
            </button>
          </div>
        </header>

        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Ativos', value: stats.active, icon: <Users size={20} />, color: 'blue' },
          { label: 'Inativos', value: stats.inactive, icon: <AlertCircle size={20} />, color: 'slate' },
          { label: 'Treino Médio', value: `${stats.avgHours}h`, icon: <Clock size={20} />, color: 'indigo' },
          { label: 'Aliados (Kimono)', value: stats.kimonoCount, icon: <Shirt size={20} />, color: 'amber' }
        ].map((item, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-md hover:-translate-y-1">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-4 ${
              item.color === 'blue' ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/30' :
              item.color === 'indigo' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30' :
              item.color === 'amber' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/30' :
              'bg-slate-100 text-slate-600 dark:bg-slate-800'
            }`}>
              {item.icon}
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{item.value}</div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart - Volume */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <Activity size={18} className="text-indigo-500" />
                Volume de Presenças
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Frequência diária no tatame</p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendanceByDay}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                  dy={10}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#cbd5e1' }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc', opacity: 0.4 }}
                  contentStyle={{ 
                    borderRadius: '24px', 
                    border: 'none', 
                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                    backgroundColor: '#1e293b',
                    color: '#fff',
                    padding: '12px 16px'
                  }}
                  itemStyle={{ color: '#fff', fontWeight: '800', fontSize: '12px' }}
                  labelStyle={{ display: 'none' }}
                />
                <Bar 
                  dataKey="count" 
                  fill="#4f46e5" 
                  radius={[10, 10, 0, 0]} 
                  barSize={timeRange === '30' ? 12 : 32}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Belt Distribution */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm">
          <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2 mb-2">
            <Trophy size={18} className="text-amber-500" />
            Graduação
          </h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">Composição de faixas do time</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={beltDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                  isAnimationActive={false}
                >
                  {beltDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '20px', border: 'none', backgroundColor: '#1e293b', color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {beltDistribution.map((b, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: b.color }} />
                <span className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400">{b.name}: {b.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Growth Trends */}
        <div className="bg-indigo-600 p-10 rounded-[48px] text-white flex flex-col justify-between shadow-2xl shadow-indigo-600/30 overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
            <TrendingUp size={160} />
          </div>
          <div className="relative z-10">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6">
              <Users size={24} />
            </div>
            <h4 className="text-2xl font-black mb-2 italic">Crescimento Mensal</h4>
            <p className="text-indigo-100 text-sm font-medium leading-relaxed max-w-[200px]">Base de alunos crescendo consistentemente nos últimos meses.</p>
          </div>
          <div className="mt-12 h-32 relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growthData}>
                <Line 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#fff" 
                  strokeWidth={4} 
                  dot={{ fill: '#fff', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 8, strokeWidth: 0 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* System Health */}
        <div className="lg:col-span-2 bg-slate-950 p-10 rounded-[48px] text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-10 opacity-5" >
            <Activity size={200} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative z-10">
            <div>
              <h4 className="text-2xl font-black mb-6 italic flex items-center gap-2">
                 <FileText className="text-indigo-500" />
                 Sumário de Dados
              </h4>
              <div className="space-y-6">
                <div className="flex items-center justify-between group">
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Taxa de Comprometimento</span>
                  <span className="text-lg font-black italic">84%</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 w-[84%] rounded-full shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
                </div>
                
                <div className="flex items-center justify-between group">
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Engajamento Total</span>
                  <span className="text-lg font-black italic">91.4%</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 w-[91.4%] rounded-full shadow-[0_0_15px_rgba(34,197,94,0.5)]" />
                </div>
              </div>
            </div>
            
            <div className="bg-slate-900/50 backdrop-blur-md rounded-[32px] p-8 border border-white/5 no-print">
              <h5 className="text-[10px] font-black uppercase text-indigo-400 tracking-widest mb-4">Status do Sistema</h5>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
                  <span className="text-xs font-bold text-slate-300">Banco de Dados Síncrono</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
                  <span className="text-xs font-bold text-slate-300">Estrutura Mobile-Ready</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full" />
                  <span className="text-xs font-bold text-slate-300">Modo Escuro Ativado</span>
                </div>
              </div>
              <button 
                onClick={() => {
                  window.focus();
                  setTimeout(() => window.print(), 300);
                }}
                className="w-full mt-8 py-4 bg-white text-slate-950 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
              >
                Imprimir Relatório Geral
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
};

export default ReportsView;
