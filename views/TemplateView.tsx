
import React, { useState, useEffect, useMemo } from 'react';
import { Student, ClassTemplate, Academy, User } from '../types';
import { StorageService } from '../services/storage';
import { BeltBadge } from '../components/BeltBadge';
import { 
  Plus, 
  Users, 
  X, 
  Search, 
  Clock, 
  Check, 
  Calendar, 
  Bell, 
  Send,
  CheckCircle2,
  Info,
  Edit2,
  Trash2,
  AlertTriangle,
  Type,
  AlertCircle
} from 'lucide-react';

const TemplateView: React.FC<{ academy: Academy; user: User }> = ({ academy, user }) => {
  const [templates, setTemplates] = useState<ClassTemplate[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  
  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  
  const [notifyingTemplate, setNotifyingTemplate] = useState<ClassTemplate | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<ClassTemplate | null>(null);
  const [templateToRename, setTemplateToRename] = useState<ClassTemplate | null>(null);
  
  // Estado do Formulário (Criação/Edição)
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [duration, setDuration] = useState(60);
  const [absenceLimit, setAbsenceLimit] = useState<number | undefined>(undefined);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [schedules, setSchedules] = useState<{ dayOfWeek: number; startTime: string; endTime: string }[]>([]);
  
  const [search, setSearch] = useState('');
  const [notificationMsg, setNotificationMsg] = useState('');
  
  // Sistema de Notificações
  const [toast, setToast] = useState<{message: string, type: 'success' | 'delete'} | null>(null);

  const DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

  useEffect(() => {
    if (academy) {
      setTemplates(StorageService.getTemplates(academy.id));
      setStudents(StorageService.getStudents(academy.id));
    }
  }, [academy]);

  const showNotification = (message: string, type: 'success' | 'delete' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filteredStudents = useMemo(() => {
    return students
      .filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [students, search]);

  const toggleStudent = (id: string) => {
    const next = new Set(selectedStudents);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedStudents(next);
  };

  const openCreateModal = () => {
    setEditingTemplateId(null);
    setName('');
    setDuration(60);
    setAbsenceLimit(undefined);
    setSelectedStudents(new Set());
    setSchedules([]);
    setIsModalOpen(true);
  };

  const openEditModal = (template: ClassTemplate) => {
    setEditingTemplateId(template.id);
    setName(template.name);
    setDuration(template.durationMinutes);
    setAbsenceLimit(template.absenceLimit);
    setSelectedStudents(new Set(template.assignedStudentIds));
    setSchedules(template.schedules || []);
    setIsModalOpen(true);
  };

  const openRenameModal = (template: ClassTemplate) => {
    setTemplateToRename(template);
    setName(template.name);
    setIsRenameModalOpen(true);
  };

  const addSchedule = () => {
    // Calcula o término padrão com base na duração atual
    const start = '19:00';
    const [h, m] = start.split(':').map(Number);
    const date = new Date();
    date.setHours(h, m + duration, 0);
    const endTime = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    
    setSchedules([...schedules, { dayOfWeek: 1, startTime: start, endTime }]);
  };

  const removeSchedule = (index: number) => {
    setSchedules(schedules.filter((_, i) => i !== index));
  };

  const updateSchedule = (index: number, field: 'dayOfWeek' | 'startTime' | 'endTime', value: any) => {
    const next = [...schedules];
    next[index] = { ...next[index], [field]: value };
    
    // Sincroniza a duração se mudar o horário de início ou término do primeiro item (opcional, para conveniência)
    if (field === 'startTime' || field === 'endTime') {
      const [sh, sm] = next[index].startTime.split(':').map(Number);
      const [eh, em] = next[index].endTime.split(':').map(Number);
      const diff = (eh * 60 + em) - (sh * 60 + sm);
      if (diff > 0) {
        setDuration(diff);
      }
    }
    
    setSchedules(next);
  };

  const handleSave = () => {
    if (editingTemplateId) {
      const updated = templates.map(t => 
        t.id === editingTemplateId 
          ? { ...t, name, durationMinutes: duration, assignedStudentIds: Array.from(selectedStudents), absenceLimit, schedules }
          : t
      );
      setTemplates(updated);
      StorageService.saveTemplates(updated);
      showNotification("Configurações da turma salvas!");
    } else {
      const newTemplate: ClassTemplate = {
        id: 'temp_' + Math.random().toString(36).substr(2, 9),
        academyId: academy.id,
        name,
        durationMinutes: duration,
        assignedStudentIds: Array.from(selectedStudents),
        absenceLimit,
        schedules
      };
      const updated = [...templates, newTemplate];
      setTemplates(updated);
      StorageService.saveTemplates(updated);
      showNotification("Nova turma criada com sucesso!");
    }
    
    setIsModalOpen(false);
    resetForm();
  };

  const handleRenameOnly = () => {
    if (templateToRename && name) {
      const updated = templates.map(t => 
        t.id === templateToRename.id 
          ? { ...t, name }
          : t
      );
      setTemplates(updated);
      StorageService.saveTemplates(updated);
      setIsRenameModalOpen(false);
      setTemplateToRename(null);
      setName('');
      showNotification("Nome da turma alterado.");
    }
  };

  const resetForm = () => {
    setEditingTemplateId(null);
    setName('');
    setDuration(60);
    setAbsenceLimit(undefined);
    setSelectedStudents(new Set());
    setSearch('');
  };

  const confirmDelete = (template: ClassTemplate) => {
    setTemplateToDelete(template);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = () => {
    if (templateToDelete) {
      const updated = templates.filter(t => t.id !== templateToDelete.id);
      setTemplates(updated);
      StorageService.saveTemplates(updated);
      setIsDeleteModalOpen(false);
      setTemplateToDelete(null);
      showNotification("Turma removida do sistema.", 'delete');
    }
  };

  const openNotifyModal = (template: ClassTemplate) => {
    setNotifyingTemplate(template);
    setIsNotifyModalOpen(true);
    setNotificationMsg(`Olá pessoal da turma ${template.name}, passando para avisar que...`);
  };

  const handleSendNotification = () => {
    if (!notifyingTemplate) return;
    console.log(`Enviando para ${notifyingTemplate.assignedStudentIds.length} alunos: ${notificationMsg}`);
    setIsNotifyModalOpen(false);
    showNotification("Notificação enviada para os alunos!");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 relative">
      {/* Toast Notification */}
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
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Turmas & Horários</h1>
          <p className="text-slate-500 font-medium">Modelos de aula para chamadas rápidas.</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-4 rounded-3xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/20 transition-all active:scale-95"
        >
          <Plus size={20} />
          Nova Turma
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map(t => (
          <div key={t.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4 hover:border-indigo-300 hover:shadow-md transition-all group overflow-hidden">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-indigo-50 w-14 h-14 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <Users size={28} />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-lg leading-tight flex items-center gap-2">
                    {t.name}
                    <button onClick={() => openRenameModal(t)} className="text-slate-300 hover:text-indigo-600 transition-colors p-1">
                      <Type size={14} />
                    </button>
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="flex items-center gap-1 text-xs font-bold text-slate-400">
                      <Clock size={14} /> {t.durationMinutes} min
                    </span>
                    <span className="w-1 h-1 bg-slate-200 rounded-full" />
                    <span className="text-xs font-bold text-slate-400">
                      {t.assignedStudentIds.length} Atletas
                    </span>
                    {t.schedules && t.schedules.length > 0 && (
                      <>
                        <span className="w-1 h-1 bg-slate-200 rounded-full" />
                        <div className="flex flex-wrap gap-1">
                          {t.schedules.slice(0, 3).map((s, idx) => (
                            <span key={idx} className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md font-black italic">
                              {DAYS[s.dayOfWeek]} {s.startTime} - {s.endTime}
                            </span>
                          ))}
                          {t.schedules.length > 3 && (
                            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md font-black italic">
                              +{t.schedules.length - 3}
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t border-slate-50">
              <div className="flex -space-x-2">
                {t.assignedStudentIds.slice(0, 4).map(sid => {
                  const s = students.find(x => x.id === sid);
                  return (
                    <div key={sid} className="h-9 w-9 rounded-xl ring-2 ring-white bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 border border-slate-200 overflow-hidden" title={s?.name}>
                      {s?.photo ? <img src={s.photo} className="w-full h-full object-cover" /> : s?.name.charAt(0)}
                    </div>
                  );
                })}
                {t.assignedStudentIds.length > 4 && (
                  <div className="h-9 w-9 rounded-xl ring-2 ring-white bg-indigo-50 flex items-center justify-center text-[10px] font-black text-indigo-600 border border-indigo-100">
                    +{t.assignedStudentIds.length - 4}
                  </div>
                )}
                {t.assignedStudentIds.length === 0 && (
                  <span className="text-[10px] font-bold text-slate-300 italic uppercase">Sem alunos vinculados</span>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => openEditModal(t)}
                  className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                  title="Configurar Turma (Editar Tudo)"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => openNotifyModal(t)}
                  className="p-2.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
                  title="Notificar Turma"
                >
                  <Bell size={18} />
                </button>
                <button 
                  onClick={() => confirmDelete(t)}
                  className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  title="Excluir Turma"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {templates.length === 0 && (
          <div className="col-span-full py-20 text-center bg-slate-50 rounded-[40px] border border-dashed border-slate-200 text-slate-400">
            <Calendar className="mx-auto mb-4 opacity-10" size={80} />
            <h3 className="font-bold text-slate-500">Nenhuma Turma Criada</h3>
            <p className="text-sm max-w-xs mx-auto mt-2">Crie templates para facilitar a chamada dos horários fixos da sua academia.</p>
          </div>
        )}
      </div>

      {/* Modal Criar/Editar Turma (Completo) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white w-full max-w-2xl rounded-t-[40px] md:rounded-[40px] p-8 animate-in slide-in-from-bottom duration-300 max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between mb-8 shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-600 p-3 rounded-2xl text-white">
                  {editingTemplateId ? <Edit2 size={24} /> : <Plus size={24} />}
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                    {editingTemplateId ? 'Editar Turma' : 'Nova Turma'}
                  </h2>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Configurações Completas</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="bg-slate-100 text-slate-400 p-3 rounded-full hover:bg-slate-200 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-8 flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-xs font-black text-slate-400 uppercase mb-3 tracking-widest">Nome da Turma</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Kids 5-9 Sábado"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-3 tracking-widest">Duração (min)</label>
                  <select 
                    value={duration} 
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold text-slate-700 appearance-none"
                  >
                    <option value={45}>45 min</option>
                    <option value={60}>60 min</option>
                    <option value={90}>90 min</option>
                    <option value={120}>120 min</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase mb-3 tracking-widest">Limite de Faltas da Turma</label>
                <input 
                  type="number" 
                  min="0"
                  placeholder="Usar padrão da academia"
                  value={absenceLimit || ''}
                  onChange={(e) => setAbsenceLimit(parseInt(e.target.value) || undefined)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700"
                />
                <p className="text-[10px] text-slate-400 mt-2 font-medium italic">
                  * Deixe vazio para usar o limite padrão da academia. Alunos com limite individual ignoram este valor.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Horários de Aula</label>
                  <button 
                    onClick={addSchedule}
                    className="flex items-center gap-1.5 text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl hover:bg-indigo-100 transition-colors uppercase italic"
                  >
                    <Plus size={14} /> Adicionar Horário
                  </button>
                </div>
                
                <div className="space-y-3">
                  {schedules.map((schedule, idx) => (
                    <div key={idx} className="flex flex-wrap md:flex-nowrap items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 animate-in slide-in-from-left duration-200">
                      <div className="flex-1 min-w-[120px]">
                        <select 
                          value={schedule.dayOfWeek}
                          onChange={(e) => updateSchedule(idx, 'dayOfWeek', parseInt(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                        >
                          {DAYS.map((day, dIdx) => (
                            <option key={dIdx} value={dIdx}>{day}</option>
                          ))}
                        </select>
                      </div>
                    <div className="w-full md:w-32">
                      <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Início <span className="text-red-500">*</span></label>
                      <input 
                        type="time" 
                        value={schedule.startTime}
                        onChange={(e) => updateSchedule(idx, 'startTime', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                      />
                    </div>
                    <div className="w-full md:w-32">
                      <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Término <span className="text-red-500">*</span></label>
                      <input 
                        type="time" 
                        value={schedule.endTime}
                        onChange={(e) => updateSchedule(idx, 'endTime', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                      />
                    </div>
                      <button 
                        onClick={() => removeSchedule(idx)}
                        className="p-2.5 text-slate-300 hover:text-red-500 bg-white border border-slate-200 rounded-xl hover:bg-red-50 transition-all ml-auto"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {schedules.length === 0 && (
                    <div className="text-center py-6 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100">
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">Nenhum horário definido</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 block">
                  Vincular Atletas ({selectedStudents.size})
                </label>
                <div className="relative mb-4">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                  <input 
                    type="text"
                    placeholder="Pesquisar..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 md:max-h-96 overflow-y-auto pr-1 custom-scrollbar">
                  {filteredStudents.map(s => (
                    <button
                      key={s.id}
                      onClick={() => toggleStudent(s.id)}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all text-left group ${
                        selectedStudents.has(s.id) 
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                          : 'bg-white border-slate-100 hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 border ${selectedStudents.has(s.id) ? 'border-white/20' : 'border-slate-100'}`}>
                          {s.photo ? (
                            <img src={s.photo} className="w-full h-full object-cover" />
                          ) : (
                            <div className={`w-full h-full flex items-center justify-center font-black text-xs ${selectedStudents.has(s.id) ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'}`}>
                              {s.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold truncate leading-tight mb-1">{s.name}</p>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <Calendar size={12} className={selectedStudents.has(s.id) ? 'text-white/60' : 'text-slate-400'} />
                              <span className={`text-xs font-bold transition-colors ${selectedStudents.has(s.id) ? 'text-white/80' : 'text-slate-500'}`}>
                                {new Date(s.birthDate).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="scale-90 origin-left">
                              <BeltBadge belt={s.belt} stripes={s.stripes} />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0 ml-2">
                        {selectedStudents.has(s.id) ? (
                          <CheckCircle2 size={18} className="text-white" />
                        ) : (
                          <div className="w-6 h-6 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-colors">
                            <Plus size={14} className="text-slate-300 group-hover:text-indigo-600" />
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 pb-10 md:pb-2">
              <button 
                onClick={handleSave}
                disabled={!name}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-6 rounded-3xl shadow-2xl shadow-indigo-600/30 transition-all shrink-0 disabled:opacity-50 active:scale-95 flex items-center justify-center gap-3"
              >
                <SaveIcon size={20} />
                Salvar Turma
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal RENOMEAR */}
      {isRenameModalOpen && templateToRename && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[40px] p-8 animate-in zoom-in duration-300 shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-600">
                  <Type size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight">Renomear Turma</h2>
                  <p className="text-xs text-slate-400 font-bold uppercase">Título atual: {templateToRename.name}</p>
                </div>
              </div>
              <button onClick={() => setIsRenameModalOpen(false)} className="bg-slate-100 text-slate-400 p-3 rounded-full hover:bg-slate-200 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase mb-3 tracking-widest">Novo Nome da Turma</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  placeholder="Ex: Treino Competidores"
                  className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-6 py-5 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700 text-lg"
                />
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleRenameOnly}
                  disabled={!name || name === templateToRename.name}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-3xl shadow-xl shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  Confirmar Novo Nome
                </button>
                <button 
                  onClick={() => setIsRenameModalOpen(false)}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-5 rounded-3xl transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Notificar Turma */}
      {isNotifyModalOpen && notifyingTemplate && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white w-full max-w-lg rounded-t-[40px] md:rounded-[40px] p-8 animate-in slide-in-from-bottom duration-300 shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="bg-amber-100 p-3 rounded-2xl text-amber-600">
                  <Bell size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight">Avisar Turma</h2>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{notifyingTemplate.name}</p>
                </div>
              </div>
              <button onClick={() => setIsNotifyModalOpen(false)} className="bg-slate-100 text-slate-400 p-3 rounded-full hover:bg-slate-200 transition-colors">
                <X size={24} />
              </button>
            </div>

            <textarea 
              rows={4}
              value={notificationMsg}
              onChange={(e) => setNotificationMsg(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-[32px] px-6 py-5 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none font-medium text-slate-700 text-sm leading-relaxed mb-6"
              placeholder="Escreva seu aviso aqui..."
            />

            <button 
              onClick={handleSendNotification}
              disabled={!notificationMsg}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-6 rounded-[32px] shadow-2xl shadow-slate-900/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              <Send size={20} />
              Disparar Aviso OSS!
            </button>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {isDeleteModalOpen && templateToDelete && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[40px] p-8 animate-in zoom-in duration-300 shadow-2xl text-center">
            <div className="bg-red-100 w-20 h-20 rounded-full flex items-center justify-center text-red-600 mx-auto mb-6">
              <AlertTriangle size={40} />
            </div>
            
            <h2 className="text-2xl font-black text-slate-800 mb-2">Excluir Turma?</h2>
            <p className="text-sm text-slate-500 font-medium mb-8 leading-relaxed">
              Deseja realmente excluir a turma <span className="text-slate-800 font-bold">"{templateToDelete.name}"</span>? 
            </p>

            <div className="flex flex-col gap-3">
              <button 
                onClick={handleDelete}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-5 rounded-3xl shadow-xl shadow-red-600/20 transition-all active:scale-95"
              >
                Sim, Excluir Agora
              </button>
              <button 
                onClick={() => setIsDeleteModalOpen(false)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-5 rounded-3xl transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SaveIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </svg>
);

export default TemplateView;
