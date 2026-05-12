import {
  Belt,
  Gender,
  MaritalStatus,
  StudentStatus,
  MemberStatus,
  SenderRole,
  SystemPlanName,
  PlanStatus,
  PixType,
  CalendarEventType,
  ClassSessionStatus,
  RecycleBinItemType,
  TransactionType,
  TransactionStatus,
} from './common';

// ── Shared ────────────────────────────────────────────────────────────────

export interface ClassSchedule {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

// ── Documents & Graduation ────────────────────────────────────────────────

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

// ── Student ───────────────────────────────────────────────────────────────

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
  gender?: Gender;
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
  status: StudentStatus;
  joinDate: string;
  absenceLimit?: number;
  nextPaymentDate?: string;
  planId?: string;
}

// ── Instructor ────────────────────────────────────────────────────────────

export interface Instructor {
  id: string;
  academyId: string;
  name: string;
  photo?: string;
  belt: Belt;
  stripes: number;
  birthDate: string;
  gender?: Gender;
  maritalStatus?: MaritalStatus;
  phone?: string;
  email?: string;
  cpf?: string;
  rg?: string;
  cep?: string;
  address?: string;
  addressNumber?: string;
  medicalNotes?: string;
  documents?: StudentDocument[];
  status: MemberStatus;
  joinDate: string;
  specialties?: string;
  lastGraduationDate?: string;
  graduationHistory?: GraduationHistoryItem[];
}

// ── Staff ─────────────────────────────────────────────────────────────────

export interface Staff {
  id: string;
  academyId: string;
  name: string;
  photo?: string;
  birthDate: string;
  gender?: Gender;
  phone?: string;
  email?: string;
  cpf?: string;
  rg?: string;
  cep?: string;
  address?: string;
  addressNumber?: string;
  status: MemberStatus;
  joinDate: string;
  position?: string;
  medicalNotes?: string;
  documents?: StudentDocument[];
}

// ── Classes & Attendance ──────────────────────────────────────────────────

export interface ClassTemplate {
  id: string;
  academyId: string;
  name: string;
  schedules?: ClassSchedule[];
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
  status: ClassSessionStatus;
}

export interface AttendanceRecord {
  id: string;
  academyId: string;
  studentId: string;
  classId: string;
  date: string;
  durationMinutes: number;
}

// ── Chat ──────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  academyId: string;
  senderId: string;
  senderName: string;
  senderRole: SenderRole;
  content: string;
  timestamp: string;
}

// ── Calendar ──────────────────────────────────────────────────────────────

export interface CalendarEvent {
  id: string;
  academyId: string;
  date: string;
  reason: string;
  type: CalendarEventType;
}

// ── Academy & Plans ───────────────────────────────────────────────────────

export interface AcademyPlan {
  id: string;
  name: string;
  durationMonths: number;
  classesPerWeek: number;
  price: number;
  category: string;
  description?: string;
}

export interface Academy {
  id: string;
  name: string;
  alias?: string;
  logo?: string;
  ownerName: string;
  email: string;
  cep?: string;
  address?: string;
  addressNumber?: string;
  phone?: string;
  absenceLimit?: number;
  pixKey?: string;
  pixType?: PixType;
  bankName?: string;
  bankAgency?: string;
  bankAccount?: string;
  currentPlan?: SystemPlanName;
  planStatus?: PlanStatus;
  planExpirationDate?: string;
  paymentWarningDays?: number;
  plans?: AcademyPlan[];
}

export interface SystemPlan {
  id: string;
  name: SystemPlanName;
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

// ── Inventory ─────────────────────────────────────────────────────────────

export interface Product {
  id: string;
  academyId: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  category?: string;
  image?: string;
  createdAt: string;
}

// ── Finances ──────────────────────────────────────────────────────────────

export interface FinanceTransaction {
  id: string;
  academyId: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: string;
  paymentMethod: string;
  status: TransactionStatus;
  studentId?: string;
}

// ── Recycle Bin ───────────────────────────────────────────────────────────

export interface RecycleBinItem {
  id: string;
  academyId: string;
  type: RecycleBinItemType;
  originalData: Student | Instructor | ClassTemplate;
  deletedAt: string;
}
