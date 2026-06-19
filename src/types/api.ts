import {
  Belt,
  Gender,
  MaritalStatus,
  StudentStatus,
  MemberStatus,
  TransactionType,
  TransactionStatus,
  CalendarEventType,
} from './common';
import type {
  ClassSchedule,
  GraduationHistoryItem,
  StudentDocument,
  AcademyPlan,
} from './entities';

// ── Infrastructure ────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  message: string;
  statusCode: number;
  errors?: Record<string, string[]>;
}

// ── Shared Params ─────────────────────────────────────────────────────────

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface SearchParams extends PaginationParams {
  search?: string;
}

// ── Student DTOs ──────────────────────────────────────────────────────────

export interface GetStudentsParams extends SearchParams {
  belt?: Belt;
  status?: StudentStatus;
  email?: string;
  userId?: string;
}

export interface CreateStudentDTO {
  name: string;
  belt: Belt;
  stripes: number;
  birthDate: string;
  status: StudentStatus;
  joinDate: string;
  email?: string;
  phone?: string;
  cpf?: string;
  rg?: string;
  gender?: Gender;
  weight?: string;
  height?: string;
  bloodType?: string;
  photo?: string;
  planId?: string;
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
  password?: string;
  nextPaymentDate?: string;
}

export type UpdateStudentDTO = Partial<CreateStudentDTO>;

export interface GraduateStudentDTO {
  newBelt: Belt;
  newStripes: number;
  date: string;
  instructorId?: string;
  notes?: string;
}

// ── Instructor DTOs ───────────────────────────────────────────────────────

export interface GetInstructorsParams extends SearchParams {
  status?: MemberStatus;
}

export interface CreateInstructorDTO {
  name: string;
  belt: Belt;
  stripes: number;
  birthDate: string;
  status: MemberStatus;
  joinDate: string;
  email?: string;
  phone?: string;
  cpf?: string;
  rg?: string;
  gender?: Gender;
  maritalStatus?: MaritalStatus;
  specialties?: string;
  cep?: string;
  address?: string;
  addressNumber?: string;
  medicalNotes?: string;
  photo?: string;
}

export type UpdateInstructorDTO = Partial<CreateInstructorDTO>;

// ── Staff DTOs ────────────────────────────────────────────────────────────

export interface GetStaffParams extends SearchParams {
  status?: MemberStatus;
}

export interface CreateStaffDTO {
  name: string;
  birthDate: string;
  status: MemberStatus;
  joinDate: string;
  position?: string;
  email?: string;
  phone?: string;
  cpf?: string;
  rg?: string;
  gender?: Gender;
  cep?: string;
  address?: string;
  addressNumber?: string;
  medicalNotes?: string;
  photo?: string;
}

export type UpdateStaffDTO = Partial<CreateStaffDTO>;

// ── Class Template DTOs ───────────────────────────────────────────────────

export interface CreateClassTemplateDTO {
  name: string;
  durationMinutes: number;
  assignedStudentIds: string[];
  schedules?: ClassSchedule[];
  absenceLimit?: number;
}

export type UpdateClassTemplateDTO = Partial<CreateClassTemplateDTO>;

// ── Class Session DTOs ────────────────────────────────────────────────────

export interface CreateClassSessionDTO {
  name: string;
  templateId?: string;
  date: string;
  durationMinutes: number;
  instructorId: string;
  attendanceIds?: string[];
  status?: string;
}

// ── Finance DTOs ──────────────────────────────────────────────────────────

export interface GetTransactionsParams extends SearchParams {
  type?: TransactionType;
  status?: TransactionStatus;
  dateFrom?: string;
  dateTo?: string;
}

export interface CreateTransactionDTO {
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

export type UpdateTransactionDTO = Partial<CreateTransactionDTO>;

// ── Calendar DTOs ─────────────────────────────────────────────────────────

export interface CreateCalendarEventDTO {
  date: string;
  reason: string;
  type: CalendarEventType;
}

// ── Academy DTOs ──────────────────────────────────────────────────────────

export interface UpdateAcademyDTO {
  name?: string;
  logo?: string;
  ownerName?: string;
  email?: string;
  phone?: string;
  cep?: string;
  address?: string;
  addressNumber?: string;
  absenceLimit?: number;
  pixKey?: string;
  pixType?: import('./common').PixType;
  bankName?: string;
  bankAgency?: string;
  bankAccount?: string;
  paymentWarningDays?: number;
  graduationRules?: import('./entities').GraduationRules | null;
  qrCodePresenca?: string;
  plans?: AcademyPlan[];
}

// ── Product DTOs ──────────────────────────────────────────────────────────

export interface GetProductsParams extends SearchParams {
  category?: string;
}

export interface CreateProductDTO {
  name: string;
  price: number;
  stock: number;
  description?: string;
  category?: string;
  image?: string;
}

export type UpdateProductDTO = Partial<CreateProductDTO>;

// ── Document DTOs ─────────────────────────────────────────────────────────

export interface UploadDocumentDTO {
  name: string;
  type: string;
  size: number;
  base64: string;
}

// ── Graduation DTOs ───────────────────────────────────────────────────────

export interface AddGraduationDTO extends GraduationHistoryItem {
  targetId: string;
  targetType: 'student' | 'instructor';
}

// ── Document Shared ───────────────────────────────────────────────────────

export type AddDocumentDTO = Omit<StudentDocument, 'id' | 'uploadedAt'>;
