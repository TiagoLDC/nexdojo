
import { Student, Instructor, Staff, AttendanceRecord, Academy, User, ClassSession, KimonoLoan, ClassTemplate, ChatMessage, CalendarEvent, RecycleBinItem, FinanceTransaction, SystemConfig, SystemPlan } from '../types';
import { MOCK_ACADEMY, MOCK_ACADEMIES } from './mockData';

const KEYS = {
  ACADEMY: 'oss_academy',
  ACADEMIES: 'oss_academies',
  STUDENTS: 'oss_students',
  INSTRUCTORS: 'oss_instructors',
  STAFF: 'oss_staff',
  ATTENDANCE: 'oss_attendance',
  USER: 'oss_user',
  CLASSES: 'oss_classes',
  KIMONOS: 'oss_kimono_loans',
  TEMPLATES: 'oss_class_templates',
  CHAT: 'oss_chat_messages',
  CALENDAR: 'oss_calendar_events',
  THEME: 'oss_theme_mode',
  RECYCLE_BIN: 'oss_recycle_bin',
  FINANCES: 'oss_finances',
  USERS: 'oss_users',
  SYSTEM_CONFIG: 'oss_system_config',
};

const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  plans: [
    { id: 'p1', name: 'Free', price: 0, description: 'Plano básico para iniciantes', features: ['Até 20 alunos', 'Chamada básica', 'Relatórios simples'], color: 'bg-slate-100 text-slate-600' },
    { id: 'p2', name: 'Silver', price: 99, description: 'Para academias em crescimento', features: ['Até 100 alunos', 'Financeiro básico', 'Gestão de Kimonos'], color: 'bg-slate-300 text-slate-800' },
    { id: 'p3', name: 'Gold', price: 199, description: 'Recursos avançados de gestão', features: ['Alunos ilimitados', 'Financeiro completo', 'Chat interno'], color: 'bg-yellow-100 text-yellow-700' },
    { id: 'p4', name: 'Black Belt', price: 399, description: 'A experiência completa do sistema', features: ['Consultoria VIP', 'IA de Marketing', 'Branding customizado'], color: 'bg-slate-900 text-white' },
  ],
  maintenanceMode: false,
  supportEmail: 'suporte@sistematna.com'
};

export const StorageService = {
  getSystemConfig: (): SystemConfig => {
    const data = localStorage.getItem(KEYS.SYSTEM_CONFIG);
    return data ? JSON.parse(data) : DEFAULT_SYSTEM_CONFIG;
  },
  saveSystemConfig: (config: SystemConfig) => {
    localStorage.setItem(KEYS.SYSTEM_CONFIG, JSON.stringify(config));
  },

  getAcademy: (): Academy | null => {
    const data = localStorage.getItem(KEYS.ACADEMY);
    return data ? JSON.parse(data) : null;
  },
  saveAcademy: (academy: Academy) => {
    localStorage.setItem(KEYS.ACADEMY, JSON.stringify(academy));
    // Também salva na lista de todas as academias se não existir
    const all = StorageService.getAcademies();
    if (!all.find(a => a.id === academy.id)) {
      StorageService.saveAcademies([...all, academy]);
    }
  },

  getAcademies: (): Academy[] => {
    const data = localStorage.getItem(KEYS.ACADEMIES);
    if (!data) return MOCK_ACADEMIES; // Retorna as academias mockadas por padrão
    return JSON.parse(data);
  },
  saveAcademies: (academies: Academy[]) => {
    localStorage.setItem(KEYS.ACADEMIES, JSON.stringify(academies));
  },

  getAcademyById: (id: string): Academy | null => {
    const all = StorageService.getAcademies();
    return all.find(a => a.id === id) || null;
  },
  
  getStudents: (academyId?: string): Student[] => {
    const data = localStorage.getItem(KEYS.STUDENTS);
    const all = data ? JSON.parse(data) : [];
    return academyId ? all.filter((s: Student) => s.academyId === academyId) : all;
  },
  saveStudents: (students: Student[]) => {
    // Para salvar, precisamos manter os alunos de outras academias
    const data = localStorage.getItem(KEYS.STUDENTS);
    const allExceptCurrent = data ? JSON.parse(data).filter((s: Student) => !students.some(ns => ns.id === s.id)) : [];
    localStorage.setItem(KEYS.STUDENTS, JSON.stringify([...allExceptCurrent, ...students]));
  },

  getInstructors: (academyId?: string): Instructor[] => {
    const data = localStorage.getItem(KEYS.INSTRUCTORS);
    const all = data ? JSON.parse(data) : [];
    return academyId ? all.filter((i: Instructor) => i.academyId === academyId) : all;
  },
  saveInstructors: (instructors: Instructor[]) => {
    const data = localStorage.getItem(KEYS.INSTRUCTORS);
    const allExceptCurrent = data ? JSON.parse(data).filter((i: Instructor) => !instructors.some(ni => ni.id === i.id)) : [];
    localStorage.setItem(KEYS.INSTRUCTORS, JSON.stringify([...allExceptCurrent, ...instructors]));
  },

  getStaff: (academyId?: string): Staff[] => {
    const data = localStorage.getItem(KEYS.STAFF);
    const all = data ? JSON.parse(data) : [];
    return academyId ? all.filter((s: Staff) => s.academyId === academyId) : all;
  },
  saveStaff: (staff: Staff[]) => {
    const data = localStorage.getItem(KEYS.STAFF);
    const allExceptCurrent = data ? JSON.parse(data).filter((s: Staff) => !staff.some(ns => ns.id === s.id)) : [];
    localStorage.setItem(KEYS.STAFF, JSON.stringify([...allExceptCurrent, ...staff]));
  },

  getAttendance: (academyId?: string): AttendanceRecord[] => {
    const data = localStorage.getItem(KEYS.ATTENDANCE);
    const all = data ? JSON.parse(data) : [];
    return academyId ? all.filter((r: AttendanceRecord) => r.academyId === academyId) : all;
  },
  saveAttendance: (records: AttendanceRecord[]) => {
    const data = localStorage.getItem(KEYS.ATTENDANCE);
    const allExceptCurrent = data ? JSON.parse(data).filter((r: AttendanceRecord) => !records.some(nr => nr.id === r.id)) : [];
    localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify([...allExceptCurrent, ...records]));
  },

  getClasses: (academyId?: string): ClassSession[] => {
    const data = localStorage.getItem(KEYS.CLASSES);
    const all = data ? JSON.parse(data) : [];
    return academyId ? all.filter((c: ClassSession) => c.academyId === academyId) : all;
  },
  saveClasses: (classes: ClassSession[]) => {
    const data = localStorage.getItem(KEYS.CLASSES);
    const allExceptCurrent = data ? JSON.parse(data).filter((c: ClassSession) => !classes.some(nc => nc.id === c.id)) : [];
    localStorage.setItem(KEYS.CLASSES, JSON.stringify([...allExceptCurrent, ...classes]));
  },

  getTemplates: (academyId?: string): ClassTemplate[] => {
    const data = localStorage.getItem(KEYS.TEMPLATES);
    const all = data ? JSON.parse(data) : [];
    return academyId ? all.filter((t: ClassTemplate) => t.academyId === academyId) : all;
  },
  saveTemplates: (templates: ClassTemplate[]) => {
    const data = localStorage.getItem(KEYS.TEMPLATES);
    const allExceptCurrent = data ? JSON.parse(data).filter((t: ClassTemplate) => !templates.some(nt => nt.id === t.id)) : [];
    localStorage.setItem(KEYS.TEMPLATES, JSON.stringify([...allExceptCurrent, ...templates]));
  },

  getKimonoLoans: (academyId?: string): KimonoLoan[] => {
    const data = localStorage.getItem(KEYS.KIMONOS);
    const all = data ? JSON.parse(data) : [];
    return academyId ? all.filter((l: KimonoLoan) => l.academyId === academyId) : all;
  },
  saveKimonoLoans: (loans: KimonoLoan[]) => {
    const data = localStorage.getItem(KEYS.KIMONOS);
    const allExceptCurrent = data ? JSON.parse(data).filter((l: KimonoLoan) => !loans.some(nl => nl.id === l.id)) : [];
    localStorage.setItem(KEYS.KIMONOS, JSON.stringify([...allExceptCurrent, ...loans]));
  },

  getChatMessages: (academyId?: string): ChatMessage[] => {
    const data = localStorage.getItem(KEYS.CHAT);
    const all = data ? JSON.parse(data) : [];
    return academyId ? all.filter((m: ChatMessage) => m.academyId === academyId) : all;
  },
  saveChatMessages: (messages: ChatMessage[]) => {
    const data = localStorage.getItem(KEYS.CHAT);
    const allExceptCurrent = data ? JSON.parse(data).filter((m: ChatMessage) => !messages.some(nm => nm.id === m.id)) : [];
    localStorage.setItem(KEYS.CHAT, JSON.stringify([...allExceptCurrent, ...messages]));
  },

  getCalendarEvents: (academyId?: string): CalendarEvent[] => {
    const data = localStorage.getItem(KEYS.CALENDAR);
    const all = data ? JSON.parse(data) : [];
    return academyId ? all.filter((e: CalendarEvent) => e.academyId === academyId) : all;
  },
  saveCalendarEvents: (events: CalendarEvent[]) => {
    const data = localStorage.getItem(KEYS.CALENDAR);
    const allExceptCurrent = data ? JSON.parse(data).filter((e: CalendarEvent) => !events.some(ne => ne.id === e.id)) : [];
    localStorage.setItem(KEYS.CALENDAR, JSON.stringify([...allExceptCurrent, ...events]));
  },

  getRecycleBin: (academyId?: string): RecycleBinItem[] => {
    const data = localStorage.getItem(KEYS.RECYCLE_BIN);
    const all = data ? JSON.parse(data) : [];
    // Nota: RecycleBinItem deve ter academyId. Se não tiver no originalData, precisamos garantir no moveToBin
    return academyId ? all.filter((i: RecycleBinItem) => i.academyId === academyId) : all;
  },
  saveRecycleBin: (items: RecycleBinItem[]) => {
    const data = localStorage.getItem(KEYS.RECYCLE_BIN);
    const allExceptCurrent = data ? JSON.parse(data).filter((i: RecycleBinItem) => !items.some(ni => ni.id === i.id)) : [];
    localStorage.setItem(KEYS.RECYCLE_BIN, JSON.stringify([...allExceptCurrent, ...items]));
  },

  getFinances: (academyId?: string): FinanceTransaction[] => {
    const data = localStorage.getItem(KEYS.FINANCES);
    const all = data ? JSON.parse(data) : [];
    return academyId ? all.filter((t: FinanceTransaction) => t.academyId === academyId) : all;
  },
  saveFinances: (transactions: FinanceTransaction[]) => {
    const data = localStorage.getItem(KEYS.FINANCES);
    const allExceptCurrent = data ? JSON.parse(data).filter((t: FinanceTransaction) => !transactions.some(nt => nt.id === t.id)) : [];
    localStorage.setItem(KEYS.FINANCES, JSON.stringify([...allExceptCurrent, ...transactions]));
  },
  
  getUsers: (academyId?: string): User[] => {
    const data = localStorage.getItem(KEYS.USERS);
    const all = data ? JSON.parse(data) : [];
    return academyId ? all.filter((u: User) => u.academyId === academyId) : all;
  },
  saveUsers: (users: User[]) => {
    const data = localStorage.getItem(KEYS.USERS);
    const allExceptCurrent = data ? JSON.parse(data).filter((u: User) => !users.some(nu => nu.id === u.id)) : [];
    localStorage.setItem(KEYS.USERS, JSON.stringify([...allExceptCurrent, ...users]));
  },

  moveToBin: (type: RecycleBinItem['type'], originalData: any, academyId: string) => {
    const items = StorageService.getRecycleBin();
    const newItem: RecycleBinItem = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      originalData,
      academyId, // Garantindo academyId na lixeira
      deletedAt: new Date().toISOString()
    };
    StorageService.saveRecycleBin([newItem, ...items]);
  },

  getCurrentUser: (): User | null => {
    const data = localStorage.getItem(KEYS.USER);
    return data ? JSON.parse(data) : null;
  },
  saveCurrentUser: (user: User) => {
    localStorage.setItem(KEYS.USER, JSON.stringify(user));
  },

  getTheme: (): 'light' | 'dark' => {
    return (localStorage.getItem(KEYS.THEME) as 'light' | 'dark') || 'light';
  },
  saveTheme: (theme: 'light' | 'dark') => {
    localStorage.setItem(KEYS.THEME, theme);
  },
  
  clear: () => localStorage.clear(),
};
