import type {
  Academy, Student, Instructor, Staff, User,
  ClassTemplate, ClassSession, AttendanceRecord,
  FinanceTransaction, CalendarEvent, ChatMessage, Product, RecycleBinItem,
} from '@/types';
import {
  SEED_ACADEMY, SEED_ACADEMIES, SEED_USERS, SEED_STUDENTS, SEED_INSTRUCTORS,
  SEED_STAFF, SEED_TEMPLATES, SEED_SESSIONS, SEED_ATTENDANCE, SEED_TRANSACTIONS,
  SEED_CALENDAR, SEED_CHAT, SEED_PRODUCTS,
} from './seed';

const clone = <T>(arr: T[]): T[] => arr.map((item) => ({ ...item }));

let academies   = clone(SEED_ACADEMIES);
let users       = clone(SEED_USERS);
let students    = clone(SEED_STUDENTS);
let instructors = clone(SEED_INSTRUCTORS);
let staff       = clone(SEED_STAFF);
let templates   = clone(SEED_TEMPLATES);
let sessions    = clone(SEED_SESSIONS);
let attendance  = clone(SEED_ATTENDANCE);
let transactions= clone(SEED_TRANSACTIONS);
let calendar    = clone(SEED_CALENDAR);
let chat        = clone(SEED_CHAT);
let products    = clone(SEED_PRODUCTS);
let recycleBin: RecycleBinItem[] = [];

const uid = () => Math.random().toString(36).slice(2, 10);
const now = () => new Date().toISOString();

export const db = {
  // ── Academies ────────────────────────────────────────────────────────────
  academies: {
    getAll: () => academies,
    getById: (id: string) => academies.find((a) => a.id === id) ?? null,
    create: (data: Omit<Academy, 'id'>): Academy => {
      const item = { ...data, id: uid() };
      academies.push(item);
      return item;
    },
    update: (id: string, data: Partial<Academy>): Academy | null => {
      const idx = academies.findIndex((a) => a.id === id);
      if (idx === -1) return null;
      academies[idx] = { ...academies[idx], ...data };
      return academies[idx];
    },
    delete: (id: string) => { academies = academies.filter((a) => a.id !== id); },
    reset: () => { academies = clone(SEED_ACADEMIES); },
  },

  // ── Users ─────────────────────────────────────────────────────────────────
  users: {
    getAll: (academyId?: string) =>
      academyId ? users.filter((u) => u.academyId === academyId) : users,
    getByEmail: (email: string) => users.find((u) => u.email === email) ?? null,
    getById: (id: string) => users.find((u) => u.id === id) ?? null,
    create: (data: Omit<User, 'id'>): User => {
      const item = { ...data, id: uid() };
      users.push(item);
      return item;
    },
    update: (id: string, data: Partial<User>): User | null => {
      const idx = users.findIndex((u) => u.id === id);
      if (idx === -1) return null;
      users[idx] = { ...users[idx], ...data };
      return users[idx];
    },
  },

  // ── Students ──────────────────────────────────────────────────────────────
  students: {
    getAll: (academyId?: string) =>
      academyId ? students.filter((s) => s.academyId === academyId) : students,
    getById: (id: string) => students.find((s) => s.id === id) ?? null,
    create: (data: Omit<Student, 'id'>): Student => {
      const item = { ...data, id: uid() };
      students.push(item);
      return item;
    },
    update: (id: string, data: Partial<Student>): Student | null => {
      const idx = students.findIndex((s) => s.id === id);
      if (idx === -1) return null;
      students[idx] = { ...students[idx], ...data };
      return students[idx];
    },
    delete: (id: string): Student | null => {
      const item = students.find((s) => s.id === id) ?? null;
      students = students.filter((s) => s.id !== id);
      return item;
    },
  },

  // ── Instructors ───────────────────────────────────────────────────────────
  instructors: {
    getAll: (academyId?: string) =>
      academyId ? instructors.filter((i) => i.academyId === academyId) : instructors,
    getById: (id: string) => instructors.find((i) => i.id === id) ?? null,
    create: (data: Omit<Instructor, 'id'>): Instructor => {
      const item = { ...data, id: uid() };
      instructors.push(item);
      return item;
    },
    update: (id: string, data: Partial<Instructor>): Instructor | null => {
      const idx = instructors.findIndex((i) => i.id === id);
      if (idx === -1) return null;
      instructors[idx] = { ...instructors[idx], ...data };
      return instructors[idx];
    },
    delete: (id: string): Instructor | null => {
      const item = instructors.find((i) => i.id === id) ?? null;
      instructors = instructors.filter((i) => i.id !== id);
      return item;
    },
  },

  // ── Staff ─────────────────────────────────────────────────────────────────
  staff: {
    getAll: (academyId?: string) =>
      academyId ? staff.filter((s) => s.academyId === academyId) : staff,
    getById: (id: string) => staff.find((s) => s.id === id) ?? null,
    create: (data: Omit<Staff, 'id'>): Staff => {
      const item = { ...data, id: uid() };
      staff.push(item);
      return item;
    },
    update: (id: string, data: Partial<Staff>): Staff | null => {
      const idx = staff.findIndex((s) => s.id === id);
      if (idx === -1) return null;
      staff[idx] = { ...staff[idx], ...data };
      return staff[idx];
    },
    delete: (id: string): Staff | null => {
      const item = staff.find((s) => s.id === id) ?? null;
      staff = staff.filter((s) => s.id !== id);
      return item;
    },
  },

  // ── Templates ─────────────────────────────────────────────────────────────
  templates: {
    getAll: (academyId?: string) =>
      academyId ? templates.filter((t) => t.academyId === academyId) : templates,
    getById: (id: string) => templates.find((t) => t.id === id) ?? null,
    create: (data: Omit<ClassTemplate, 'id'>): ClassTemplate => {
      const item = { ...data, id: uid() };
      templates.push(item);
      return item;
    },
    update: (id: string, data: Partial<ClassTemplate>): ClassTemplate | null => {
      const idx = templates.findIndex((t) => t.id === id);
      if (idx === -1) return null;
      templates[idx] = { ...templates[idx], ...data };
      return templates[idx];
    },
    delete: (id: string): ClassTemplate | null => {
      const item = templates.find((t) => t.id === id) ?? null;
      templates = templates.filter((t) => t.id !== id);
      return item;
    },
  },

  // ── Sessions ──────────────────────────────────────────────────────────────
  sessions: {
    getAll: (academyId?: string) =>
      academyId ? sessions.filter((s) => s.academyId === academyId) : sessions,
    getById: (id: string) => sessions.find((s) => s.id === id) ?? null,
    create: (data: Omit<ClassSession, 'id' | 'attendanceIds' | 'status'>): ClassSession => {
      const item: ClassSession = { ...data, id: uid(), attendanceIds: [], status: 'In Progress' };
      sessions.push(item);
      return item;
    },
    update: (id: string, data: Partial<ClassSession>): ClassSession | null => {
      const idx = sessions.findIndex((s) => s.id === id);
      if (idx === -1) return null;
      sessions[idx] = { ...sessions[idx], ...data };
      return sessions[idx];
    },
    delete: (id: string) => { sessions = sessions.filter((s) => s.id !== id); },
  },

  // ── Attendance ────────────────────────────────────────────────────────────
  attendance: {
    getAll: (academyId?: string) =>
      academyId ? attendance.filter((r) => r.academyId === academyId) : attendance,
    create: (data: Omit<AttendanceRecord, 'id'>): AttendanceRecord => {
      const item = { ...data, id: uid() };
      attendance.push(item);
      return item;
    },
  },

  // ── Transactions ──────────────────────────────────────────────────────────
  transactions: {
    getAll: (academyId?: string) =>
      academyId ? transactions.filter((t) => t.academyId === academyId) : transactions,
    getById: (id: string) => transactions.find((t) => t.id === id) ?? null,
    create: (data: Omit<FinanceTransaction, 'id'>): FinanceTransaction => {
      const item = { ...data, id: uid() };
      transactions.push(item);
      return item;
    },
    update: (id: string, data: Partial<FinanceTransaction>): FinanceTransaction | null => {
      const idx = transactions.findIndex((t) => t.id === id);
      if (idx === -1) return null;
      transactions[idx] = { ...transactions[idx], ...data };
      return transactions[idx];
    },
    delete: (id: string) => { transactions = transactions.filter((t) => t.id !== id); },
  },

  // ── Calendar ──────────────────────────────────────────────────────────────
  calendar: {
    getAll: (academyId?: string) =>
      academyId ? calendar.filter((e) => e.academyId === academyId) : calendar,
    create: (data: Omit<CalendarEvent, 'id'>): CalendarEvent => {
      const item = { ...data, id: uid() };
      calendar.push(item);
      return item;
    },
    delete: (id: string) => { calendar = calendar.filter((e) => e.id !== id); },
  },

  // ── Chat ──────────────────────────────────────────────────────────────────
  chat: {
    getAll: (academyId?: string) =>
      academyId ? chat.filter((m) => m.academyId === academyId) : chat,
    create: (data: Omit<ChatMessage, 'id' | 'timestamp'>): ChatMessage => {
      const item = { ...data, id: uid(), timestamp: now() };
      chat.push(item);
      return item;
    },
    delete: (id: string) => { chat = chat.filter((m) => m.id !== id); },
  },

  // ── Products ──────────────────────────────────────────────────────────────
  products: {
    getAll: (academyId?: string) =>
      academyId ? products.filter((p) => p.academyId === academyId) : products,
    getById: (id: string) => products.find((p) => p.id === id) ?? null,
    create: (data: Omit<Product, 'id' | 'createdAt'>): Product => {
      const item = { ...data, id: uid(), createdAt: now().split('T')[0] };
      products.push(item);
      return item;
    },
    update: (id: string, data: Partial<Product>): Product | null => {
      const idx = products.findIndex((p) => p.id === id);
      if (idx === -1) return null;
      products[idx] = { ...products[idx], ...data };
      return products[idx];
    },
    delete: (id: string) => { products = products.filter((p) => p.id !== id); },
  },

  // ── Recycle Bin ───────────────────────────────────────────────────────────
  recycleBin: {
    getAll: (academyId?: string) =>
      academyId ? recycleBin.filter((i) => i.academyId === academyId) : recycleBin,
    add: (item: Omit<RecycleBinItem, 'id' | 'deletedAt'>): RecycleBinItem => {
      const entry = { ...item, id: uid(), deletedAt: now() };
      recycleBin.unshift(entry);
      return entry;
    },
    remove: (id: string): RecycleBinItem | null => {
      const item = recycleBin.find((i) => i.id === id) ?? null;
      recycleBin = recycleBin.filter((i) => i.id !== id);
      return item;
    },
    empty: (academyId: string) => {
      recycleBin = recycleBin.filter((i) => i.academyId !== academyId);
    },
  },

  // ── Helpers ───────────────────────────────────────────────────────────────
  uid,
  now,
  seed: SEED_ACADEMY,
};
