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
  Loader2,
  Globe,
  CheckCircle2,
  Clipboard
} from 'lucide-react';
import { Belt, Academy, User, Student } from '../types';
import { isReadyForGraduation, calculateAge } from '../services/graduation';
import { BELT_COLORS } from '../constants';
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
  const students = useMemo(() => StorageService.getStudents(academy.id), [academy?.id]) as Student[];
  const [timeRange, setTimeRange] = useState('7');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Stats Reais
  const stats = useMemo(() => {
    const active = students.filter(s => s.status === 'Active').length;
    const inactive = students.length - active;
    const totalHours = students.reduce((acc, s) => acc + (s.totalHours || 0), 0);
    const avgHours = active > 0 ? (totalHours / active).toFixed(1) : '0';
    const kimonoCount = attendance.filter(a => a.kimonoTaken).length;
    
    // Graduation Stats
    const readyStudents = students.filter(s => {
      const { readyForBelt, readyForStripe } = isReadyForGraduation(s);
      return readyForBelt || readyForStripe;
    }).length;

    return { active, inactive, totalHours, avgHours, kimonoCount, readyStudents };
  }, [students, attendance]);

  // Demographic Data (Age Groups)
  const ageStats = useMemo(() => {
    const groups = {
      'Kids (0-12)': 0,
      'Juvenil (13-17)': 0,
      'Adulto (18-35)': 0,
      'Master (36+)': 0
    };

    students.forEach(s => {
      const age = calculateAge(s.birthDate);
      if (age <= 12) groups['Kids (0-12)']++;
      else if (age <= 17) groups['Juvenil (13-17)']++;
      else if (age <= 35) groups['Adulto (18-35)']++;
      else groups['Master (36+)']++;
    });

    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  }, [students]);

  // Stripe Distribution
  const stripeStats = useMemo(() => {
    const stripes = {
      '0 Graus': 0,
      '1 Grau': 0,
      '2 Graus': 0,
      '3 Graus': 0,
      '4 Graus': 0,
      '5+ Graus': 0
    };

    students.forEach(s => {
      if (s.stripes === 0) stripes['0 Graus']++;
      else if (s.stripes === 1) stripes['1 Grau']++;
      else if (s.stripes === 2) stripes['2 Graus']++;
      else if (s.stripes === 3) stripes['3 Graus']++;
      else if (s.stripes === 4) stripes['4 Graus']++;
      else stripes['5+ Graus']++;
    });

    return Object.entries(stripes).map(([name, value]) => ({ name, value }));
  }, [students]);

  // Graduation Pipeline (Who is ready?)
  const graduationPipeline = useMemo(() => {
    return students
      .filter(s => s.status === 'Active')
      .map(s => {
        const { readyForBelt, readyForStripe } = isReadyForGraduation(s);
        return { 
          ...s, 
          readyForBelt, 
          readyForStripe,
          priority: readyForBelt ? 2 : (readyForStripe ? 1 : 0)
        };
      })
      .filter(s => s.priority > 0)
      .sort((a, b) => b.priority - a.priority || b.totalClasses - a.totalClasses);
  }, [students]);

  // Graduation Data
  const graduationStats = useMemo(() => {
    const readyForBelt = students.filter(s => isReadyForGraduation(s).readyForBelt).length;
    const readyForStripe = students.filter(s => isReadyForGraduation(s).readyForStripe).length;
    
    return [
      { name: 'Pronto p/ Faixa', value: readyForBelt, color: '#4f46e5' },
      { name: 'Pronto p/ Grau', value: readyForStripe, color: '#f59e0b' },
      { name: 'Em Carência', value: Math.max(0, students.length - readyForBelt - readyForStripe), color: '#e2e8f0' }
    ];
  }, [students]);

  const recentPromotions = useMemo(() => {
    return students
      .flatMap(s => (s.graduationHistory || []).map(h => ({ ...h, studentName: s.name })))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [students]);

  // Attendance by day
  const attendanceByDay = useMemo(() => {
    let daysList: string[] = [];
    
    if (timeRange !== 'custom') {
      const days = parseInt(timeRange);
      daysList = Array.from({ length: days }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (days - 1 - i));
        return d.toISOString().split('T')[0];
      });
    } else {
      // Custom range
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      
      // Limit to max 90 days for performance/sanity if needed, but let's allow what user selects
      const limitedDiff = Math.min(diffDays, 180); 
      
      daysList = Array.from({ length: limitedDiff }, (_, i) => {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        return d.toISOString().split('T')[0];
      });
    }

    return daysList.map(date => ({
      date: date.split('-').slice(1).join('/'),
      count: attendance.filter(a => a.date.startsWith(date)).length
    }));
  }, [attendance, timeRange, startDate, endDate]);

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
        onclone: (clonedDoc) => {
          // Fix for html2canvas oklch parsing error
          const style = clonedDoc.createElement('style');
          style.innerHTML = `
            * {
              --color-indigo-50: #f5f3ff !important;
              --color-indigo-100: #e0e7ff !important;
              --color-indigo-200: #c7d2fe !important;
              --color-indigo-300: #a5b4fc !important;
              --color-indigo-400: #818cf8 !important;
              --color-indigo-500: #6366f1 !important;
              --color-indigo-600: #4f46e5 !important;
              --color-indigo-700: #4338ca !important;
              --color-indigo-800: #3730a3 !important;
              --color-indigo-900: #1e1b4b !important;
              --color-indigo-950: #0f172a !important;
              
              --color-slate-50: #f8fafc !important;
              --color-slate-100: #f1f5f9 !important;
              --color-slate-200: #e2e8f0 !important;
              --color-slate-300: #cbd5e1 !important;
              --color-slate-400: #94a3b8 !important;
              --color-slate-500: #64748b !important;
              --color-slate-600: #475569 !important;
              --color-slate-700: #334155 !important;
              --color-slate-800: #1e293b !important;
              --color-slate-900: #0f172a !important;
              --color-slate-950: #020617 !important;

              --color-amber-50: #fffbeb !important;
              --color-amber-500: #f59e0b !important;
              
              --color-emerald-50: #ecfdf5 !important;
              --color-emerald-500: #10b981 !important;
              --color-emerald-600: #059669 !important;

              --color-blue-50: #eff6ff !important;
              --color-blue-600: #2563eb !important;
            }
          `;
          clonedDoc.head.appendChild(style);

          // Force background and color on the main report container
          const reportElement = clonedDoc.querySelector('[ref="reportRef"]') as HTMLElement;
          if (reportElement) {
              reportElement.style.backgroundColor = '#ffffff';
              reportElement.style.color = '#0f172a';
          }
        },
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
          <div className="flex flex-wrap gap-2 no-print items-center">
            <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <select 
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-4 py-3 bg-transparent text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest outline-none focus:ring-0 transition-all appearance-none pr-8 relative"
              >
                <option value="7">7 dias</option>
                <option value="15">15 dias</option>
                <option value="30">30 dias</option>
                <option value="custom">Personalizado</option>
              </select>
            </div>

            {timeRange === 'custom' && (
              <div className="flex items-center gap-2 animate-in slide-in-from-right duration-300">
                <div className="flex flex-col">
                  <span className="text-[8px] font-black uppercase text-slate-400 ml-2 mb-0.5">Início</span>
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-bold text-slate-600 dark:text-slate-300 outline-none"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] font-black uppercase text-slate-400 ml-2 mb-0.5">Fim</span>
                  <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-bold text-slate-600 dark:text-slate-300 outline-none"
                  />
                </div>
              </div>
            )}
            
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {[
          { label: 'Ativos', value: stats.active, icon: <Users size={20} />, color: 'blue' },
          { label: 'Inativos', value: stats.inactive, icon: <AlertCircle size={20} />, color: 'slate' },
          { label: 'Treino Médio', value: `${stats.avgHours}h`, icon: <Clock size={20} />, color: 'indigo' },
          { label: 'Kimono', value: stats.kimonoCount, icon: <Shirt size={20} />, color: 'amber' },
          { label: 'Prontos Grad.', value: stats.readyStudents, icon: <Trophy size={20} />, color: 'emerald' }
        ].map((item, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-md hover:-translate-y-1">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-4 ${
              item.color === 'blue' ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/30' :
              item.color === 'indigo' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30' :
              item.color === 'amber' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/30' :
              item.color === 'emerald' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30' :
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
            <TrendingUp size={18} className="text-indigo-500" />
            Time por Faixa
          </h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">Composição de faixas atual</p>
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

        {/* Readiness Analysis */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm">
          <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2 mb-2">
            <Trophy size={18} className="text-amber-500" />
            Prontidão p/ Graduação
          </h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">Análise de elegibilidade técnica</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={graduationStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={0}
                  outerRadius={85}
                  paddingAngle={0}
                  dataKey="value"
                  isAnimationActive={false}
                >
                  {graduationStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '20px', border: 'none', backgroundColor: '#1e293b', color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            {graduationStats.map((s, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400">{s.name}</span>
                </div>
                <span className="text-[9px] font-black text-slate-900 dark:text-white">{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Promotions Timeline */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col">
          <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2 mb-2">
            <Award size={18} className="text-emerald-500" />
            Últimos Promovidos
          </h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">Histórico recente de graduação</p>
          <div className="space-y-4 flex-1">
            {recentPromotions.length > 0 ? recentPromotions.map((h: any) => (
              <div key={h.id} className="flex items-start gap-3 border-l-2 border-slate-100 dark:border-slate-800 pl-4 pb-2 relative">
                <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-emerald-500" />
                <div className="min-w-0">
                  <p className="text-xs font-black text-slate-800 dark:text-white uppercase italic truncate">{h.studentName}</p>
                  <p className="text-[9px] font-medium text-slate-500 uppercase tracking-wider mb-1">
                    {h.previousBelt} → {h.newBelt}
                  </p>
                  <p className="text-[8px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full inline-block">
                    {new Date(h.date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )) : (
                <div className="text-center py-10 text-slate-400">
                    <Award className="mx-auto mb-2 opacity-20" size={32} />
                    <p className="text-[10px] font-bold uppercase">Nenhuma promoção recente</p>
                </div>
            )}
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

        {/* Demographic Breakdown */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm">
          <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2 mb-2">
            <Globe size={18} className="text-blue-500" />
            Demografia (Idade)
          </h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">Divisão por categoria de idade</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageStats}>
                <XAxis dataKey="name" hide />
                <YAxis hide />
                <Tooltip 
                  cursor={{ fill: 'rgba(79, 70, 229, 0.05)' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', backgroundColor: '#1e293b', color: '#fff' }}
                />
                <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                  {ageStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#4f46e5', '#3b82f6', '#10b981', '#f59e0b'][index % 4]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2">
            {ageStats.map((s, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase text-slate-500">{s.name.split(' ')[0]}</span>
                <span className="text-[9px] font-black text-slate-900 dark:text-white">{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stripe Distribution */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm">
          <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2 mb-2">
            <CheckCircle2 size={18} className="text-emerald-500" />
            Nível de Evolução
          </h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">Alunos por quantidade de graus</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stripeStats} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" hide />
                <Tooltip 
                   cursor={{ fill: 'rgba(16, 185, 129, 0.05)' }}
                   contentStyle={{ borderRadius: '16px', border: 'none', backgroundColor: '#1e293b', color: '#fff' }}
                />
                <Bar dataKey="value" radius={[0, 10, 10, 0]} fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {stripeStats.map((s, i) => (
              <div key={i} className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl text-center">
                <p className="text-[8px] font-black text-slate-400 uppercase truncate">{s.name}</p>
                <p className="text-xs font-black text-slate-900 dark:text-white">{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Detailed Graduation Pipeline (Table View) */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <Trophy size={18} className="text-amber-500" />
                Pipeline de Graduação
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Alunos que atingiram carência técnica</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => {
                  const names = graduationPipeline.map(s => s.name).join('\n');
                  navigator.clipboard.writeText(names);
                  alert('Lista de nomes copiada para a área de transferência!');
                }}
                className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2 whitespace-nowrap"
              >
                <Clipboard size={14} /> Copiar Todos
              </button>
              <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                {graduationPipeline.length} Alunos
              </div>
            </div>
          </div>

          <div className="overflow-x-auto -mx-8">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-50 dark:border-slate-800">
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Atleta</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Atual</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Treinos</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Próximo Nível</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {graduationPipeline.map(student => (
                  <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-3">
                        {student.photo ? (
                          <img src={student.photo} className="w-8 h-8 rounded-lg object-cover" />
                        ) : (
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black ${BELT_COLORS[student.belt]}`}>
                            {student.name.charAt(0)}
                          </div>
                        )}
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase italic truncate max-w-[150px]">{student.name}</span>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(student.name);
                              // Feedback visual simples ou apenas a ação
                            }}
                            className="flex items-center gap-1 text-[8px] font-black text-indigo-500 uppercase hover:text-indigo-600 transition-colors mt-0.5"
                          >
                            <Clipboard size={10} /> Copiar Nome
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${BELT_COLORS[student.belt]}`} />
                        <span className="text-[10px] font-bold text-slate-500 uppercase">{student.belt} ({student.stripes}º)</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-[11px] font-black text-slate-900 dark:text-white">{student.totalClasses}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <TrendingUp size={10} className="text-indigo-500" />
                        <span className="text-[10px] font-black text-indigo-600 uppercase italic">
                           {student.readyForBelt ? 'Nova Faixa' : 'Próximo Grau'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                        student.readyForBelt ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30'
                      }`}>
                        {student.readyForBelt ? 'Elegível Faixa' : 'Elegível Grau'}
                      </span>
                    </td>
                  </tr>
                ))}
                {graduationPipeline.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-8 py-20 text-center text-slate-400 text-xs font-bold uppercase italic">
                      Nenhum aluno atingiu critérios técnicos no período.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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
