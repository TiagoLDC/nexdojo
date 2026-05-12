
import { Student, Instructor, Staff, AttendanceRecord, Academy, User, ClassSession, ClassTemplate, ChatMessage, CalendarEvent, RecycleBinItem, FinanceTransaction, SystemConfig, SystemPlan, Language, Product } from '../types';
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
  LANGUAGE: 'oss_language',
  RECYCLE_BIN: 'oss_recycle_bin',
  FINANCES: 'oss_finances',
  USERS: 'oss_users',
  SYSTEM_CONFIG: 'oss_system_config',
  ACCENT_COLOR: 'oss_accent_color',
  PRODUCTS: 'oss_products',
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
    if (!data) return null;
    let academy = JSON.parse(data);
    
    // Migration: normaliza nome da academia mock_acad_1 para "Academia NexFight"
    const oldNames = ['Guerreiros', 'NexDojo', 'NexDojoACA'];
    if (academy.id === 'mock_acad_1' && oldNames.includes(academy.name)) {
      const targetLogo = 'https://images.unsplash.com/photo-1552072092-7f9b8d63efcb?q=80&w=400&h=400&auto=format&fit=crop';
      academy = { ...academy, name: 'Academia NexFight', logo: targetLogo };
      StorageService.saveAcademy(academy);
    }
    
    return academy;
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
    let academies: Academy[] = data ? JSON.parse(data) : [];

    // Garante que as 3 academias mock sempre existam na lista
    const existingIds = academies.map((a: Academy) => a.id);
    const missing = MOCK_ACADEMIES.filter((m: Academy) => !existingIds.includes(m.id));
    if (missing.length > 0) {
      academies = [...academies, ...missing];
      StorageService.saveAcademies(academies);
    }

    // Migration: normaliza nome da academia mock_acad_1 na lista
    const oldNames = ['Guerreiros', 'NexDojo', 'NexDojoACA'];
    const needsUpdate = academies.some((a: Academy) => a.id === 'mock_acad_1' && oldNames.includes(a.name));
    if (needsUpdate) {
      academies = academies.map((a: Academy) =>
        a.id === 'mock_acad_1' && oldNames.includes(a.name)
          ? { ...a, name: 'Academia NexFight' }
          : a
      );
      StorageService.saveAcademies(academies);
    }

    // Migration: sincroniza alias das academias mock que ainda não possuem o campo
    const needsAlias = academies.some((a: Academy) => {
      const mock = MOCK_ACADEMIES.find(m => m.id === a.id);
      return mock && mock.alias && !a.alias;
    });
    if (needsAlias) {
      academies = academies.map((a: Academy) => {
        const mock = MOCK_ACADEMIES.find(m => m.id === a.id);
        return mock && mock.alias && !a.alias ? { ...a, alias: mock.alias } : a;
      });
      StorageService.saveAcademies(academies);
    }

    return [...academies].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
  },
  saveAcademies: (academies: Academy[]) => {
    localStorage.setItem(KEYS.ACADEMIES, JSON.stringify(academies));
  },

  deleteAcademy: (id: string) => {
    const all = StorageService.getAcademies();
    const updated = all.filter(a => a.id !== id);
    StorageService.saveAcademies(updated);
    
    // Also remove from current academy if it's the one being deleted
    const current = StorageService.getAcademy();
    if (current && current.id === id) {
      if (updated.length > 0) {
        StorageService.saveAcademy(updated[0]);
      } else {
        localStorage.removeItem(KEYS.ACADEMY);
      }
    }
  },

  getAcademyById: (id: string): Academy | null => {
    const all = StorageService.getAcademies();
    return all.find(a => a.id === id) || null;
  },

  getAcademyByAlias: (alias: string): Academy | null => {
    const normalized = alias.toLowerCase().trim();
    const all = StorageService.getAcademies();
    return all.find(a => a.alias?.toLowerCase() === normalized) || null;
  },
  
  getStudents: (academyId?: string): Student[] => {
    const data = localStorage.getItem(KEYS.STUDENTS);
    const all: Student[] = data ? JSON.parse(data) : [];
    
    // Antigravity fix: Deduplicate students by ID to prevent React duplicate key errors (e.g. s4)
    const unique = Array.from(new Map(all.map(s => [s.id, s])).values());
    
    return academyId ? unique.filter((s: Student) => s.academyId === academyId) : unique;
  },
  saveStudents: (students: Student[], academyId: string) => {
    const data = localStorage.getItem(KEYS.STUDENTS);
    const allOtherAcademies = data ? JSON.parse(data).filter((s: Student) => s.academyId !== academyId) : [];
    localStorage.setItem(KEYS.STUDENTS, JSON.stringify([...allOtherAcademies, ...students]));
  },

  getInstructors: (academyId?: string): Instructor[] => {
    const data = localStorage.getItem(KEYS.INSTRUCTORS);
    const all = data ? JSON.parse(data) : [];
    return academyId ? all.filter((i: Instructor) => i.academyId === academyId) : all;
  },
  saveInstructors: (instructors: Instructor[], academyId: string) => {
    const data = localStorage.getItem(KEYS.INSTRUCTORS);
    const allOtherAcademies = data ? JSON.parse(data).filter((i: Instructor) => i.academyId !== academyId) : [];
    localStorage.setItem(KEYS.INSTRUCTORS, JSON.stringify([...allOtherAcademies, ...instructors]));
  },

  getStaff: (academyId?: string): Staff[] => {
    const data = localStorage.getItem(KEYS.STAFF);
    const all = data ? JSON.parse(data) : [];
    return academyId ? all.filter((s: Staff) => s.academyId === academyId) : all;
  },
  saveStaff: (staff: Staff[], academyId: string) => {
    const data = localStorage.getItem(KEYS.STAFF);
    const allOtherAcademies = data ? JSON.parse(data).filter((s: Staff) => s.academyId !== academyId) : [];
    localStorage.setItem(KEYS.STAFF, JSON.stringify([...allOtherAcademies, ...staff]));
  },

  getAttendance: (academyId?: string): AttendanceRecord[] => {
    const data = localStorage.getItem(KEYS.ATTENDANCE);
    const all = data ? JSON.parse(data) : [];
    return academyId ? all.filter((r: AttendanceRecord) => r.academyId === academyId) : all;
  },
  saveAttendance: (records: AttendanceRecord[], academyId: string) => {
    const data = localStorage.getItem(KEYS.ATTENDANCE);
    const allOtherAcademies = data ? JSON.parse(data).filter((r: AttendanceRecord) => r.academyId !== academyId) : [];
    localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify([...allOtherAcademies, ...records]));
  },

  getClasses: (academyId?: string): ClassSession[] => {
    const data = localStorage.getItem(KEYS.CLASSES);
    const all = data ? JSON.parse(data) : [];
    return academyId ? all.filter((c: ClassSession) => c.academyId === academyId) : all;
  },
  saveClasses: (classes: ClassSession[], academyId: string) => {
    const data = localStorage.getItem(KEYS.CLASSES);
    const allOtherAcademies = data ? JSON.parse(data).filter((c: ClassSession) => c.academyId !== academyId) : [];
    localStorage.setItem(KEYS.CLASSES, JSON.stringify([...allOtherAcademies, ...classes]));
  },

  getTemplates: (academyId?: string): ClassTemplate[] => {
    const data = localStorage.getItem(KEYS.TEMPLATES);
    const all = data ? JSON.parse(data) : [];
    return academyId ? all.filter((t: ClassTemplate) => t.academyId === academyId) : all;
  },
  saveTemplates: (templates: ClassTemplate[], academyId: string) => {
    const data = localStorage.getItem(KEYS.TEMPLATES);
    const allOtherAcademies = data ? JSON.parse(data).filter((t: ClassTemplate) => t.academyId !== academyId) : [];
    localStorage.setItem(KEYS.TEMPLATES, JSON.stringify([...allOtherAcademies, ...templates]));
  },

  getChatMessages: (academyId?: string): ChatMessage[] => {
    const data = localStorage.getItem(KEYS.CHAT);
    const all = data ? JSON.parse(data) : [];
    return academyId ? all.filter((m: ChatMessage) => m.academyId === academyId) : all;
  },
  saveChatMessages: (messages: ChatMessage[], academyId: string) => {
    const data = localStorage.getItem(KEYS.CHAT);
    const allOtherAcademies = data ? JSON.parse(data).filter((m: ChatMessage) => m.academyId !== academyId) : [];
    localStorage.setItem(KEYS.CHAT, JSON.stringify([...allOtherAcademies, ...messages]));
  },

  getCalendarEvents: (academyId?: string): CalendarEvent[] => {
    const data = localStorage.getItem(KEYS.CALENDAR);
    const all = data ? JSON.parse(data) : [];
    return academyId ? all.filter((e: CalendarEvent) => e.academyId === academyId) : all;
  },
  saveCalendarEvents: (events: CalendarEvent[], academyId: string) => {
    const data = localStorage.getItem(KEYS.CALENDAR);
    const allOtherAcademies = data ? JSON.parse(data).filter((e: CalendarEvent) => e.academyId !== academyId) : [];
    localStorage.setItem(KEYS.CALENDAR, JSON.stringify([...allOtherAcademies, ...events]));
  },

  getRecycleBin: (academyId?: string): RecycleBinItem[] => {
    const data = localStorage.getItem(KEYS.RECYCLE_BIN);
    const all = data ? JSON.parse(data) : [];
    return academyId ? all.filter((i: RecycleBinItem) => i.academyId === academyId) : all;
  },
  saveRecycleBin: (items: RecycleBinItem[], academyId: string) => {
    const data = localStorage.getItem(KEYS.RECYCLE_BIN);
    const allOtherAcademies = data ? JSON.parse(data).filter((i: RecycleBinItem) => i.academyId !== academyId) : [];
    localStorage.setItem(KEYS.RECYCLE_BIN, JSON.stringify([...allOtherAcademies, ...items]));
  },

  getFinances: (academyId?: string): FinanceTransaction[] => {
    const data = localStorage.getItem(KEYS.FINANCES);
    const all = data ? JSON.parse(data) : [];
    return academyId ? all.filter((t: FinanceTransaction) => t.academyId === academyId) : all;
  },
  saveFinances: (transactions: FinanceTransaction[], academyId: string) => {
    const data = localStorage.getItem(KEYS.FINANCES);
    const allOtherAcademies = data ? JSON.parse(data).filter((t: FinanceTransaction) => t.academyId !== academyId) : [];
    localStorage.setItem(KEYS.FINANCES, JSON.stringify([...allOtherAcademies, ...transactions]));
  },
  
  getUsers: (academyId?: string): User[] => {
    const data = localStorage.getItem(KEYS.USERS);
    const all = data ? JSON.parse(data) : [];
    return academyId ? all.filter((u: User) => u.academyId === academyId) : all;
  },
  saveUsers: (users: User[], academyId: string) => {
    const data = localStorage.getItem(KEYS.USERS);
    const allOtherAcademies = data ? JSON.parse(data).filter((u: User) => u.academyId !== academyId) : [];
    localStorage.setItem(KEYS.USERS, JSON.stringify([...allOtherAcademies, ...users]));
  },

  getProducts: (academyId?: string): Product[] => {
    const data = localStorage.getItem(KEYS.PRODUCTS);
    const all = data ? JSON.parse(data) : [];
    return academyId ? all.filter((p: Product) => p.academyId === academyId) : all;
  },
  saveProducts: (products: Product[], academyId: string) => {
    const data = localStorage.getItem(KEYS.PRODUCTS);
    const allOtherAcademies = data ? JSON.parse(data).filter((p: Product) => p.academyId !== academyId) : [];
    localStorage.setItem(KEYS.PRODUCTS, JSON.stringify([...allOtherAcademies, ...products]));
  },

  moveToBin: (type: RecycleBinItem['type'], originalData: any, academyId: string) => {
    const items = StorageService.getRecycleBin(academyId);
    const newItem: RecycleBinItem = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      originalData,
      academyId, // Garantindo academyId na lixeira
      deletedAt: new Date().toISOString()
    };
    StorageService.saveRecycleBin([newItem, ...items], academyId);
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

  getLanguage: (): Language => {
    return (localStorage.getItem(KEYS.LANGUAGE) as Language) || 'pt';
  },
  saveLanguage: (lang: Language) => {
    localStorage.setItem(KEYS.LANGUAGE, lang);
  },
  
  getAccentColor: (): string => {
    return localStorage.getItem(KEYS.ACCENT_COLOR) || 'indigo';
  },
  saveAccentColor: (color: string) => {
    localStorage.setItem(KEYS.ACCENT_COLOR, color);
  },
  
  clear: () => localStorage.clear(),
};
