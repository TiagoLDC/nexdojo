
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
  gender?: 'M' | 'F' | 'Outro';
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
  hasLoanedKimono: boolean;
  joinDate: string;
  absenceLimit?: number;
  nextPaymentDate?: string;
  planId?: string;
}

export interface Instructor {
  id: string;
  academyId: string;
  name: string;
  photo?: string;
  belt: Belt;
  stripes: number;
  birthDate: string;
  gender?: 'M' | 'F' | 'Outro';
  maritalStatus?: 'Solteiro' | 'Casado' | 'Divorciado' | 'Viúvo' | 'Outro';
  phone?: string;
  email?: string;
  cpf?: string;
  rg?: string;
  cep?: string;
  address?: string;
  addressNumber?: string;
  medicalNotes?: string;
  documents?: StudentDocument[];
  status: 'Active' | 'Inactive' | 'Pending';
  joinDate: string;
  specialties?: string;
  lastGraduationDate?: string;
}

export interface Staff {
  id: string;
  academyId: string;
  name: string;
  photo?: string;
  birthDate: string;
  gender?: 'M' | 'F' | 'Outro';
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

export interface KimonoLoan {
  id: string;
  academyId: string;
  studentId: string;
  borrowedAt: string;
  returnedAt?: string;
  status: 'Active' | 'Returned';
}

export interface AttendanceRecord {
  id: string;
  academyId: string;
  studentId: string;
  classId: string;
  date: string; 
  durationMinutes: number;
  kimonoTaken: boolean;
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

export interface AcademyPlan {
  id: string;
  name: string;
  durationMonths: number;
  classesPerWeek: number;
  price: number;
  category: string; // "Crianças", "Adolescentes", "Adultos", etc.
  description?: string;
}

export interface Academy {
  id: string;
  name: string;
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
