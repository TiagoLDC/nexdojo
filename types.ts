
export type Language = 'pt' | 'en' | 'es';

export enum Belt {
  // Kids (até 15 anos)
  WHITE = 'Branca',
  GREY = 'Cinza',
  YELLOW = 'Amarela',
  ORANGE = 'Laranja',
  GREEN = 'Verde',
  // Adultos (16+ anos)
  BLUE = 'Azul',
  PURPLE = 'Roxa',
  BROWN = 'Marrom',
  BLACK = 'Preta',
  CORAL = 'Coral',
  RED = 'Vermelha'
}

export interface StudentDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  base64: string;
  uploadedAt: string;
}

export interface GraduationHistoryItem {
  id: string;
  previousBelt: Belt;
  newBelt: Belt;
  previousStripes: number;
  newStripes: number;
  date: string;
  instructorId?: string;
  notes?: string;
}

export interface Student {
  id: string;
  academyId: string;
  name: string;
  photo?: string;
  belt: Belt;
  stripes: number;
  lastGraduationDate?: string;
  graduationHistory?: GraduationHistoryItem[];
  birthDate: string; 
  gender?: 'Masculino' | 'Feminino' | 'Outro';
  phone?: string;
  email?: string;
  cpf?: string;
  rg?: string;
  weight?: string;
  height?: string;
  bloodType?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  cep?: string;
  address?: string;
  addressNumber?: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  guardianCpf?: string;
  guardianRg?: string;
  guardianRelation?: string;
  guardianProfession?: string;
  medicalNotes?: string;
  documents?: StudentDocument[];
  totalClasses: number;
  totalHours: number;
  lastAttendance?: string;
  absentCount: number; 
  status: 'Active' | 'Inactive' | 'Dropped' | 'Pending';
  joinDate: string;
  absenceLimit?: number;
  customAbsenceLimit?: string;
  nextPaymentDate?: string;
  planId?: string;
  createdAt?: string;
  degree?: number;
  addressCep?: string;
  addressCity?: string;
  addressState?: string;
  userId?: string | null;
  userStatus?: 'Active' | 'Pending' | 'Blocked' | null;
}

export interface Instructor {
  id: string;
  academyId: string;
  name: string;
  photo?: string;
  belt: Belt;
  stripes: number;
  birthDate: string;
  gender?: 'Masculino' | 'Feminino' | 'Outro';
  maritalStatus?: 'Solteiro' | 'Casado' | 'Divorciado' | 'Viúvo' | 'Outro';
  phone?: string;
  email?: string;
  cpf?: string;
  rg?: string;
  weight?: string;
  height?: string;
  bloodType?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  cep?: string;
  address?: string;
  addressNumber?: string;
  medicalNotes?: string;
  documents?: StudentDocument[];
  status: 'Active' | 'Inactive' | 'Pending';
  joinDate: string;
  specialties?: string;
  lastGraduationDate?: string;
  graduationHistory?: GraduationHistoryItem[];
  userId?: string | null;
  userStatus?: 'Active' | 'Pending' | 'Blocked' | null;
}

export interface Staff {
  id: string;
  academyId: string;
  name: string;
  photo?: string;
  birthDate: string;
  gender?: 'Masculino' | 'Feminino' | 'Outro';
  phone?: string;
  email?: string;
  cpf?: string;
  rg?: string;
  cep?: string;
  address?: string;
  addressNumber?: string;
  status: 'Active' | 'Inactive' | 'Pending';
  joinDate: string;
  position?: string;
  medicalNotes?: string;
  documents?: StudentDocument[];
}

export interface ClassTemplate {
  id: string;
  academyId: string;
  name: string;
  schedules?: { dayOfWeek: number; startTime: string; endTime: string }[];
  durationMinutes: number;
  assignedStudentIds: string[];
  absenceLimit?: number;
}

export interface ClassSession {
  id: string;
  academyId: string;
  name: string;
  templateId?: string;
  date: string;
  durationMinutes: number;
  instructorId: string;
  attendanceIds: string[]; 
  status: 'In Progress' | 'Finalized';
}

export interface AttendanceRecord {
  id: string;
  academyId: string;
  studentId: string;
  classId?: string;
  date: string;
  durationMinutes?: number;
}

export interface ChatMessage {
  id: string;
  academyId: string;
  senderId: string;
  senderName: string;
  senderRole: 'superuser' | 'admin' | 'instructor' | 'staff';
  content: string;
  timestamp: string;
}

export interface CalendarEvent {
  id: string;
  academyId: string;
  date: string; // YYYY-MM-DD
  reason: string;
  type: 'no-class' | 'event';
}

export interface SystemPlan {
  id: string;
  name: 'Free' | 'Silver' | 'Gold' | 'Black Belt';
  price: number;
  description: string;
  features: string[];
  color: string;
}

export interface SystemConfig {
  plans: SystemPlan[];
  maintenanceMode: boolean;
  supportEmail: string;
}

export interface PlanSchedule {
  id?: string;
  dayOfWeek: number;     // 0=Dom, 1=Seg, ..., 6=Sab
  startTime: string;     // 'HH:MM' ou 'HH:MM:SS'
  endTime: string;
}

export interface AcademyPlan {
  id: string;
  academyId?: string;
  name: string;
  durationMonths: number;
  classesPerWeek: number;
  price: number;
  category: string;
  description?: string;
  // Novos campos (Fase 1 — Reforma de Planos/Presença)
  minAge?: number;
  maxAge?: number;
  instructorId?: string;
  active?: boolean;
  toleranceBeforeMinutes?: number;
  toleranceAfterStartMinutes?: number;
  schedules?: PlanSchedule[];
}

export interface Academy {
  id: string;
  name: string;
  alias?: string;
  logo?: string; // Adicionado campo para logotipo Base64
  ownerName: string;
  email: string;
  cep?: string;
  address?: string;
  addressNumber?: string;
  phone?: string;
  absenceLimit?: number;
  pixKey?: string;
  pixType?: 'CPF' | 'CNPJ' | 'E-mail' | 'Telefone' | 'Aleatória';
  bankName?: string;
  bankAgency?: string;
  bankAccount?: string;
  currentPlan?: 'Free' | 'Silver' | 'Gold' | 'Black Belt';
  planStatus?: 'Active' | 'Expired' | 'Trial' | 'Suspended' | 'Canceled';
  planExpirationDate?: string;
  paymentWarningDays?: number;
  plans?: AcademyPlan[];
}

export interface Product {
  id: string;
  academyId: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  category?: string;
  image?: string; // Base64 or URL
  createdAt: string;
}

export interface User {
  id: string;
  academyId: string; // Para superusuario, pode ser 'global' ou o ID da academia atual
  role: 'superuser' | 'admin' | 'instructor' | 'staff' | 'student' | 'guest';
  name: string;
  email: string;
  password?: string;
  status: 'Active' | 'Pending' | 'Blocked';
}

export interface RecycleBinItem {
  id: string;
  academyId: string;
  type: 'student' | 'instructor' | 'template';
  originalData: any;
  deletedAt: string;
}

// Módulo Financeiro
export type TransactionType = 'income' | 'expense';

export interface FinanceTransaction {
  id: string;
  academyId: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: string;
  paymentMethod: string;
  status: 'paid' | 'pending';
  studentId?: string; // Para mensalidades vinculadas
}
