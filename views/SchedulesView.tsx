
import React, { useState, useEffect } from 'react';
import { Academy, ClassTemplate, User } from '../types';
import { StorageService } from '../services/storage';
import { Clock, Calendar, ChevronLeft, ChevronRight, Users, Info } from 'lucide-react';

const DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 06:00 to 22:00

const SchedulesView: React.FC<{ academy: Academy | null; user: User }> = ({ academy }) => {
  const [templates, setTemplates] = useState<ClassTemplate[]>([]);

  useEffect(() => {
    if (academy) {
      setTemplates(StorageService.getTemplates(academy.id));
    } else {
      setTemplates([]);
    }
  }, [academy]);

  const scheduleMap = React.useMemo(() => {
    const map: Record<number, { template: ClassTemplate; schedule: { dayOfWeek: number; startTime: string; endTime: string } }[]> = {};
    templates.forEach(t => {
      (t.schedules || []).forEach(s => {
        if (!map[s.dayOfWeek]) map[s.dayOfWeek] = [];
        map[s.dayOfWeek].push({ template: t, schedule: s });
      });
    });
    // Sort each day by time
    Object.keys(map).forEach(day => {
      map[Number(day)].sort((a, b) => a.schedule.startTime.localeCompare(b.schedule.startTime));
    });
    return map;
  }, [templates]);

  if (!academy) {
    return (
      <div className="max-w-5xl mx-auto py-20 text-center">
        <Clock size={64} className="mx-auto text-slate-200 mb-6" />
        <h2 className="text-2xl font-black text-slate-800 uppercase italic">Selecione uma Unidade</h2>
        <p className="text-slate-400 mt-2">Para visualizar a grade de horários, você precisa selecionar uma academia no menu superior.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight uppercase italic flex items-center gap-2">
            <Clock className="text-indigo-600" />
            Grade de Horários
          </h1>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Quadro semanal de aulas da {academy.name}</p>
        </div>
      </header>

      {/* Grid Semanal Desktop */}
      <div className="hidden lg:grid grid-cols-7 gap-4">
        {[1, 2, 3, 4, 5, 6, 0].map(dayIdx => (
          <div key={dayIdx} className="space-y-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center shadow-sm">
              <h3 className={`text-[10px] font-black uppercase tracking-widest ${[0, 6].includes(dayIdx) ? 'text-amber-500' : 'text-indigo-600'}`}>
                {DAYS[dayIdx]}
              </h3>
            </div>
            
            <div className="space-y-3">
              {(scheduleMap[dayIdx] || []).map((item, idx) => (
                <div key={idx} className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:border-indigo-300 transition-all group relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 font-mono mb-1">
                    {item.schedule.startTime} - {item.schedule.endTime}
                  </p>
                  <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase leading-tight">{item.template.name}</h4>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">{item.template.durationMinutes}m</span>
                    <span className="w-1 h-1 bg-slate-200 rounded-full" />
                    <div className="flex items-center gap-1 text-[9px] font-black text-slate-400">
                      <Users size={10} />
                      {item.template.assignedStudentIds.length}
                    </div>
                  </div>
                </div>
              ))}
              {(!scheduleMap[dayIdx] || scheduleMap[dayIdx].length === 0) && (
                <div className="py-10 text-center opacity-20 filter grayscale">
                   <Clock size={24} className="mx-auto text-slate-300" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Lista Mobile/Tablet */}
      <div className="lg:hidden space-y-8">
        {[1, 2, 3, 4, 5, 6, 0].map(dayIdx => {
          const daySchedules = scheduleMap[dayIdx] || [];
          if (daySchedules.length === 0) return null;

          return (
            <section key={dayIdx} className="space-y-4">
              <div className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full ${[0, 6].includes(dayIdx) ? 'bg-amber-500' : 'bg-indigo-600'}`} />
                <h3 className="text-base font-black text-slate-800 dark:text-white uppercase italic tracking-tight">
                  {DAYS[dayIdx]}
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {daySchedules.map((item, idx) => (
                  <div key={idx} className="bg-white dark:bg-slate-900 p-5 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                     <div className="bg-indigo-50 dark:bg-indigo-950/30 w-16 h-14 rounded-2xl flex flex-col items-center justify-center text-indigo-600 dark:text-indigo-400 p-1">
                        <span className="text-[10px] font-black font-mono leading-none tracking-tighter">{item.schedule.startTime}</span>
                        <div className="h-0.5 w-4 bg-indigo-200 dark:bg-indigo-800 my-1 rounded-full" />
                        <span className="text-[10px] font-black font-mono leading-none tracking-tighter opacity-60">{item.schedule.endTime}</span>
                     </div>
                       <div>
                          <h4 className="font-black text-slate-800 dark:text-white uppercase italic">{item.template.name}</h4>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.template.durationMinutes} min</span>
                            <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 dark:text-slate-400">
                              <Users size={12} className="text-indigo-400" />
                              {item.template.assignedStudentIds.length} Alunos
                            </div>
                          </div>
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}

        {templates.filter(t => (t.schedules || []).length > 0).length === 0 && (
          <div className="bg-white dark:bg-slate-900 p-12 rounded-[40px] border border-dashed border-slate-200 dark:border-slate-800 text-center">
            <Clock size={48} className="mx-auto text-slate-200 mb-4" />
            <h3 className="text-slate-400 font-bold uppercase tracking-widest italic text-sm">Nenhum horário configurado</h3>
            <p className="text-[10px] text-slate-400 mt-2">Vá em "Turmas" para definir os dias e horas de cada aula.</p>
          </div>
        )}
      </div>

      <div className="bg-indigo-50 dark:bg-indigo-950/20 p-6 rounded-[32px] border border-indigo-100 dark:border-indigo-900/30 flex items-start gap-4">
         <Info className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-1" size={20} />
         <div>
            <p className="text-xs font-bold text-indigo-900 dark:text-indigo-100 uppercase tracking-tight leading-relaxed">
              Configurando sua Grade
            </p>
            <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium mt-1 leading-relaxed">
              Os horários exibidos aqui são baseados nos templates de turmas. Para alterar um horário, acesse o menu de Turmas e edite a turma correspondente.
            </p>
         </div>
      </div>
    </div>
  );
};

export default SchedulesView;
