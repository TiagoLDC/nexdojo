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

// ── Sports & Belt Ranks (ver PLANO_GRADUACAO.md) ───────────────────────────
// GraduationRules/GraduationGroupRules (baldes fixos kids/white/intermediate/black,
// 1 métrica por academia) foram removidos em 12/08/2026 — substituídos por
// academy_belt_settings (meses/aulas por faixa individual). Zero consumidores
// restantes depois da migração das Fases 6-8.

export type BeltCategory = 'kids' | 'adult' | 'both';

export interface Sport {
  id: string;
  name: string;
  slug: string;
  active: boolean;
}

export interface BeltRank {
  id: string;
  sportId: string;
  name: string;
  colorKey: string;
  orderIndex: number;
  degreeCount: number;
  category: BeltCategory;
  minAge?: number;
  maxAge?: number;
}

export interface AcademyBeltSetting {
  id: string;
  academyId: string;
  beltRankId: string;
  monthsRequired?: number;
  classesRequired?: number;
  warnBeforeMonths?: number;
  warnBeforeClasses?: number;
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
  classesSinceGraduation: number;
  hoursSinceGraduation: number;
  lastAttendance?: string;
  absentCount: number;
  status: StudentStatus;
  joinDate: string;
  absenceLimit?: number;
  customAbsenceLimit?: string;
  nextPaymentDate?: string;
  planId?: string;
  createdAt?: string;
  addressCep?: string;
  addressCity?: string;
  addressState?: string;
  hasLoanedKimono?: boolean;
  kimonoLoanDate?: string | null;
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
  status: MemberStatus;
  joinDate: string;
  specialties?: string;
  lastGraduationDate?: string;
  graduationHistory?: GraduationHistoryItem[];
  hasLoanedKimono?: boolean;
  kimonoLoanDate?: string | null;
}

// ── Staff ─────────────────────────────────────────────────────────────────

export interface Staff {
  id: string;
  academyId: string;
  name: string;
  photo?: string;
  birthDate?: string;
  gender?: Gender;
  phone?: string;
  whatsapp?: string;
  inviteToken?: string;
  email?: string;
  cpf?: string;
  rg?: string;
  cep?: string;
  address?: string;
  addressNumber?: string;
  addressNeighborhood?: string;
  addressCity?: string;
  addressState?: string;
  status: MemberStatus;
  joinDate?: string;
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
  classId?: string;            // legado — opcional desde Fase 1
  date: string;
  durationMinutes: number;
  // Auditoria do novo fluxo de presença (Fase 1)
  checkInTime?: string;        // 'HH:MM:SS'
  matchedPlanId?: string;
  matchedScheduleId?: string;
  ageWarning?: boolean;
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
  freeSchedule?: boolean;
  freeDays?: boolean;
  freeAge?: boolean;
  toleranceBeforeMinutes?: number;
  toleranceAfterStartMinutes?: number;
  schedules?: PlanSchedule[];
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
  /** Definido só na criação da academia — imutável depois (ver PLANO_GRADUACAO.md D6). */
  sportId?: string;
  qrCodePresenca?: string;
  plans?: AcademyPlan[];
  kimonoLoanEnabled?: boolean;
}

// ── Kimono Loans ──────────────────────────────────────────────────────────

export interface KimonoLoan {
  id: string;
  academyId: string;
  personType: 'student' | 'instructor';
  personId: string;
  personName?: string;
  personPhoto?: string;
  personBelt?: Belt;
  personStripes?: number;
  borrowedAt: string;
  returnedAt?: string | null;
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
  dueDate?: string;
}

// ── Recycle Bin ───────────────────────────────────────────────────────────

export interface RecycleBinItem {
  id: string;
  academyId: string;
  type: RecycleBinItemType;
  originalData: Student | Instructor | ClassTemplate;
  deletedAt: string;
}
