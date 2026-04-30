
import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storage';
import { Academy, User, CalendarEvent } from '../types';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  AlertCircle, 
  Plus, 
  Trash2, 
  X, 
  CheckCircle2 
} from 'lucide-react';

const CalendarView: React.FC<{ academy: Academy; user: User }> = ({ academy, user }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [reason, setReason] = useState('');
  const [toast, setToast] = useState<{message: string, type: 'success' | 'delete'} | null>(null);

  useEffect(() => {
    if (academy) {
      setEvents(StorageService.getCalendarEvents(academy.id));
    }
  }, [academy?.id]);

  const showNotification = (message: string, type: 'success' | 'delete' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const handleAddNoClass = (dateStr: string) => {
    setSelectedDate(dateStr);
    setIsModalOpen(true);
  };

  const saveEvent = () => {
    if (!reason) return;
    const newEvent: CalendarEvent = {
      id: Math.random().toString(36).substr(2, 9),
      academyId: academy.id,
      date: selectedDate,
      reason,
      type: 'no-class'
    };
    const updated = [...events, newEvent];
    setEvents(updated);
    StorageService.saveCalendarEvents(updated);
    setIsModalOpen(false);
    setReason('');
    showNotification("Dia sem aula registrado!");
  };

  const removeEvent = (id: string) => {
    const updated = events.filter(e => e.id !== id);
    setEvents(updated);
    StorageService.saveCalendarEvents(updated);
    showNotification("Aula reativada para este dia.", 'delete');
  };

  const monthName = currentDate.toLocaleString('pt-BR', { month: 'long' });
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const days = [];
  const totalDays = daysInMonth(year, month);
  const startDay = firstDayOfMonth(year, month);

  // Preenchimento de dias vazios no início
  for (let i = 0; i < startDay; i++) {
    days.push(<div key={`empty-${i}`} className="h-24 bg-slate-50/50 border border-slate-100/50 rounded-2xl" />);
  }

  // Dias do mês
  for (let d = 1; d <= totalDays; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const event = events.find(e => e.date === dateStr);
    const isToday = new Date().toISOString().split('T')[0] === dateStr;

    days.push(
      <div 
        key={d} 
        onClick={() => user.role !== 'student' && !event && handleAddNoClass(dateStr)}
        className={`h-20 md:h-32 p-1.5 md:p-2 border rounded-2xl md:rounded-3xl transition-all relative overflow-hidden ${
          user.role !== 'student' ? 'cursor-pointer' : ''
        } ${
          event 
            ? 'bg-red-50 border-red-200 ring-2 ring-red-100' 
            : 'bg-white border-slate-100 hover:border-indigo-300 hover:shadow-md'
        } ${isToday ? 'ring-2 ring-indigo-500' : ''}`}
      >
        <span className={`text-xs md:text-sm font-black ${event ? 'text-red-600' : isToday ? 'text-indigo-600' : 'text-slate-400'}`}>
          {d}
        </span>
        
        {event ? (
          <div className="mt-0.5 md:mt-1">
            <div className="bg-red-600 text-white text-[7px] md:text-[10px] font-black uppercase px-1.5 md:px-2 py-0.5 md:py-1 rounded-full flex items-center gap-1 w-fit">
              <AlertCircle size={8} className="md:w-[10px] md:h-[10px]" /> <span className="hidden xs:inline">SEM AULA</span><span className="xs:hidden">OFF</span>
            </div>
            <p className="text-[8px] md:text-[11px] text-red-700 font-bold mt-0.5 md:mt-1 line-clamp-2 leading-tight">
              {event.reason}
            </p>
            {user.role !== 'student' && (
              <button 
                onClick={(e) => { e.stopPropagation(); removeEvent(event.id); }}
                className="absolute bottom-1 right-1 md:bottom-2 md:right-2 p-1 md:p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={10} className="md:w-[12px] md:h-[12px]" />
              </button>
            )}
          </div>
        ) : (
          user.role !== 'student' && (
            <div className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center h-full pb-4">
               <Plus size={14} className="text-indigo-300 md:w-[16px] md:h-[16px]" />
               <span className="text-[7px] md:text-[8px] font-black text-indigo-400 uppercase tracking-tighter">Marcar OFF</span>
            </div>
          )
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-top duration-300 ${
          toast.type === 'success' ? 'bg-indigo-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span className="font-bold text-sm tracking-tight">{toast.message}</span>
        </div>
      )}

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Calendário de Aulas</h1>
          <p className="text-slate-500">{user.role === 'student' ? 'Veja os dias de funcionamento e recessos.' : 'Planeje os recessos e avise os alunos.'}</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
          <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400"><ChevronLeft size={20} /></button>
          <span className="text-sm font-black text-slate-700 uppercase tracking-widest min-w-[140px] text-center">
            {monthName} {year}
          </span>
          <button onClick={handleNextMonth} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400"><ChevronRight size={20} /></button>
        </div>
      </header>

      <div className="grid grid-cols-7 gap-2 md:gap-4 mb-2">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
          <div key={d} className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest py-2">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2 md:gap-4">
        {days}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[40px] p-8 animate-in zoom-in duration-300 shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="bg-red-100 p-3 rounded-2xl text-red-600">
                  <CalendarIcon size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight">Suspender Aula</h2>
                  <p className="text-xs text-slate-400 font-bold uppercase">{new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="bg-slate-100 text-slate-400 p-3 rounded-full hover:bg-slate-200">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase mb-3 tracking-widest">Motivo do Recesso</label>
                <input 
                  type="text" 
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  autoFocus
                  placeholder="Ex: Feriado Nacional, Manutenção..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none transition-all font-bold text-slate-700"
                />
              </div>

              <button 
                onClick={saveEvent}
                disabled={!reason}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-5 rounded-3xl shadow-xl shadow-red-600/20 transition-all disabled:opacity-50"
              >
                Confirmar Suspensão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
