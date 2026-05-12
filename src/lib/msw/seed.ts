import { Belt } from '@/types';
import type {
  Academy, Student, Instructor, Staff, User,
  ClassTemplate, ClassSession, AttendanceRecord,
  FinanceTransaction, CalendarEvent, ChatMessage, Product,
} from '@/types';

const today = new Date().toISOString().split('T')[0];
const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
const lastMonth = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

// ── Academy ───────────────────────────────────────────────────────────────

export const SEED_ACADEMY: Academy = {
  id: 'mock_acad_1',
  name: 'NexDojo',
  logo: 'https://images.unsplash.com/photo-1552072092-7f9b8d63efcb?q=80&w=400&h=400&auto=format&fit=crop',
  ownerName: 'Prof. Carlos Gracie Jr.',
  email: 'admin@oss.com',
  phone: '11999990000',
  cep: '01310-100',
  address: 'Av. Paulista, 1000',
  addressNumber: '1000',
  absenceLimit: 4,
  plans: [
    { id: 'ap1', name: 'Mensal Adulto', durationMonths: 1, classesPerWeek: 3, price: 150, category: 'Adultos' },
    { id: 'ap2', name: 'Semestral Elite', durationMonths: 6, classesPerWeek: 5, price: 800, category: 'Adultos' },
    { id: 'ap3', name: 'Plano Kids', durationMonths: 1, classesPerWeek: 2, price: 120, category: 'Crianças' },
  ],
  currentPlan: 'Gold',
  planStatus: 'Active',
};

export const SEED_ACADEMIES: Academy[] = [SEED_ACADEMY];

// ── Users ─────────────────────────────────────────────────────────────────

export const SEED_USERS: User[] = [
  { id: 'mock_user_1',         academyId: 'mock_acad_1', role: 'admin',      name: 'Admin Teste',       email: 'admin@oss.com',  status: 'Active' },
  { id: 'mock_instr_1',        academyId: 'mock_acad_1', role: 'instructor', name: 'Prof. Renato Silva', email: 'instru@oss.com', status: 'Active' },
  { id: 'mock_staff_1',        academyId: 'mock_acad_1', role: 'staff',      name: 'Ana Secretaria',    email: 'colab@oss.com',  status: 'Active' },
  { id: 'mock_student_user_1', academyId: 'mock_acad_1', role: 'student',    name: 'Carlos Oliveira',   email: 'aluno@oss.com',  status: 'Active' },
  { id: 'mock_superuser_1',    academyId: 'global',      role: 'superuser',  name: 'Super User OSS',    email: 'super@oss.com',  status: 'Active' },
];

// passwords (only used in MSW auth handler, never stored in client)
export const SEED_PASSWORDS: Record<string, string> = {
  'admin@oss.com':  'oss123',
  'instru@oss.com': 'oss123',
  'colab@oss.com':  'oss123',
  'aluno@oss.com':  'oss123',
  'super@oss.com':  'super',
};

// ── Students ──────────────────────────────────────────────────────────────

export const SEED_STUDENTS: Student[] = [
  { id: 's1',  academyId: 'mock_acad_1', name: 'Carlos Oliveira',  email: 'aluno@oss.com',   belt: Belt.WHITE,  stripes: 2, birthDate: '1995-04-12', totalClasses: 45,   totalHours: 67.5,  absentCount: 0, status: 'Active', joinDate: '2023-10-01', phone: '11988887777', photo: 'https://picsum.photos/seed/s1/400/400',  planId: 'ap1', lastGraduationDate: '2024-01-10' },
  { id: 's2',  academyId: 'mock_acad_1', name: 'Juliana Santos',   belt: Belt.BLUE,   stripes: 1, birthDate: '1998-08-22', totalClasses: 120,  totalHours: 180,   absentCount: 4, status: 'Active', joinDate: '2022-05-15', phone: '11977776666', photo: 'https://picsum.photos/seed/s2/400/400',  planId: 'ap2', lastGraduationDate: '2023-11-20' },
  { id: 's3',  academyId: 'mock_acad_1', name: 'Marcos Pereira',   belt: Belt.PURPLE, stripes: 3, birthDate: '1990-01-30', totalClasses: 350,  totalHours: 525,   absentCount: 0, status: 'Active', joinDate: '2020-02-10', phone: '11966665555', photo: 'https://picsum.photos/seed/s3/400/400',  planId: 'ap2', lastGraduationDate: '2023-06-15' },
  { id: 's4',  academyId: 'mock_acad_1', name: 'Arthur Silva',     belt: Belt.GREY,   stripes: 3, birthDate: '2016-05-10', totalClasses: 30,   totalHours: 30,    absentCount: 0, status: 'Active', joinDate: '2023-12-01', guardianPhone: '11955554444', photo: 'https://picsum.photos/seed/s4/400/400', planId: 'ap3', lastGraduationDate: '2024-03-05' },
  { id: 's5',  academyId: 'mock_acad_1', name: 'Mariana Costa',    belt: Belt.YELLOW, stripes: 1, birthDate: '2014-02-20', totalClasses: 80,   totalHours: 80,    absentCount: 0, status: 'Active', joinDate: '2023-01-15', guardianPhone: '11944443333', photo: 'https://picsum.photos/seed/s5/400/400', lastGraduationDate: '2024-02-12' },
  { id: 's6',  academyId: 'mock_acad_1', name: 'Ricardo Mendes',   belt: Belt.BROWN,  stripes: 0, birthDate: '1988-11-05', totalClasses: 500,  totalHours: 750,   absentCount: 0, status: 'Active', joinDate: '2018-03-20', phone: '11933332222', photo: 'https://picsum.photos/seed/s6/400/400',  lastGraduationDate: '2022-08-25' },
  { id: 's7',  academyId: 'mock_acad_1', name: 'Beatriz Lima',     belt: Belt.BLACK,  stripes: 1, birthDate: '1985-07-14', totalClasses: 1200, totalHours: 1800,  absentCount: 0, status: 'Active', joinDate: '2010-01-10', phone: '11922221111', photo: 'https://picsum.photos/seed/s7/400/400',  lastGraduationDate: '2021-12-01' },
  { id: 's8',  academyId: 'mock_acad_1', name: 'Pedro Rocha',      belt: Belt.ORANGE, stripes: 4, birthDate: '2011-03-25', totalClasses: 150,  totalHours: 150,   absentCount: 5, status: 'Active', joinDate: '2021-06-12', guardianPhone: '11911110000', photo: 'https://picsum.photos/seed/s8/400/400', lastGraduationDate: '2023-10-15' },
  { id: 's9',  academyId: 'mock_acad_1', name: 'Sofia Amaral',     belt: Belt.GREEN,  stripes: 2, birthDate: '2009-09-02', totalClasses: 210,  totalHours: 210,   absentCount: 0, status: 'Active', joinDate: '2020-11-05', guardianPhone: '11900009999', photo: 'https://picsum.photos/seed/s9/400/400', lastGraduationDate: '2023-12-20' },
  { id: 's10', academyId: 'mock_acad_1', name: 'Lucas Ferreira',   belt: Belt.WHITE,  stripes: 0, birthDate: '2000-01-15', totalClasses: 5,    totalHours: 7.5,   absentCount: 0, status: 'Active', joinDate: '2024-02-01', phone: '11987654321', photo: 'https://picsum.photos/seed/s10/400/400' },
];

// ── Instructors ───────────────────────────────────────────────────────────

export const SEED_INSTRUCTORS: Instructor[] = [
  { id: 'i1', academyId: 'mock_acad_1', name: 'Prof. Renato Silva', belt: Belt.BLACK,  stripes: 2, birthDate: '1980-05-15', status: 'Active', joinDate: '2010-01-01', email: 'instru@oss.com', phone: '11999998888', specialties: 'No-Gi, Competição, Adultos', photo: 'https://picsum.photos/seed/i1/400/400', lastGraduationDate: '2020-03-10' },
  { id: 'i2', academyId: 'mock_acad_1', name: 'Prof. Ana Carolina', belt: Belt.PURPLE, stripes: 4, birthDate: '1992-03-22', status: 'Active', joinDate: '2015-06-01', email: 'ana@oss.com',    phone: '11988887777', specialties: 'Kids, Iniciantes, Feminino', photo: 'https://picsum.photos/seed/i2/400/400', lastGraduationDate: '2023-08-15' },
];

// ── Staff ─────────────────────────────────────────────────────────────────

export const SEED_STAFF: Staff[] = [
  { id: 'st1', academyId: 'mock_acad_1', name: 'Ana Secretaria', birthDate: '1995-07-10', status: 'Active', joinDate: '2022-01-15', position: 'Secretária', email: 'colab@oss.com', phone: '11977776666', photo: 'https://picsum.photos/seed/st1/400/400' },
];

// ── Class Templates ───────────────────────────────────────────────────────

export const SEED_TEMPLATES: ClassTemplate[] = [
  { id: 't1', academyId: 'mock_acad_1', name: 'Kids 5-9 anos',    durationMinutes: 60,  assignedStudentIds: ['s4','s5'],       schedules: [{ dayOfWeek: 1, startTime: '18:00', endTime: '19:00' }, { dayOfWeek: 3, startTime: '18:00', endTime: '19:00' }] },
  { id: 't2', academyId: 'mock_acad_1', name: 'Kids 10-15 anos',  durationMinutes: 60,  assignedStudentIds: ['s8','s9'],       schedules: [{ dayOfWeek: 2, startTime: '18:00', endTime: '19:00' }, { dayOfWeek: 4, startTime: '18:00', endTime: '19:00' }] },
  { id: 't3', academyId: 'mock_acad_1', name: 'Adulto Iniciante', durationMinutes: 90,  assignedStudentIds: ['s1','s10','s2'], schedules: [{ dayOfWeek: 1, startTime: '19:30', endTime: '21:00' }, { dayOfWeek: 3, startTime: '19:30', endTime: '21:00' }, { dayOfWeek: 5, startTime: '19:00', endTime: '20:30' }] },
  { id: 't4', academyId: 'mock_acad_1', name: 'Adulto Avançado',  durationMinutes: 120, assignedStudentIds: ['s3','s6','s7'],  schedules: [{ dayOfWeek: 2, startTime: '19:30', endTime: '21:30' }, { dayOfWeek: 4, startTime: '19:30', endTime: '21:30' }, { dayOfWeek: 6, startTime: '10:00', endTime: '12:00' }] },
];

// ── Class Sessions ────────────────────────────────────────────────────────

export const SEED_SESSIONS: ClassSession[] = [
  { id: 'class_active_1', academyId: 'mock_acad_1', name: 'Adulto Iniciante (Noite)', templateId: 't3', date: `${today}T19:30:00Z`, durationMinutes: 90,  instructorId: 'i1', attendanceIds: ['s1'], status: 'In Progress' },
  { id: 'class_past_1',   academyId: 'mock_acad_1', name: 'Kids 5-9 anos (Seg/Qua)', templateId: 't1', date: `${yesterday}T18:00:00Z`, durationMinutes: 60, instructorId: 'i1', attendanceIds: ['s4','s5'], status: 'Finalized' },
];

// ── Attendance Records ────────────────────────────────────────────────────

export const SEED_ATTENDANCE: AttendanceRecord[] = [
  { id: 'att_1', academyId: 'mock_acad_1', studentId: 's4', classId: 'class_past_1', date: `${yesterday}T18:00:00Z`, durationMinutes: 60 },
  { id: 'att_2', academyId: 'mock_acad_1', studentId: 's5', classId: 'class_past_1', date: `${yesterday}T18:00:00Z`, durationMinutes: 60 },
];

// ── Finance Transactions ──────────────────────────────────────────────────

export const SEED_TRANSACTIONS: FinanceTransaction[] = [
  { id: 'tx1',  academyId: 'mock_acad_1', description: 'Mensalidade - Carlos Oliveira',  amount: 150,  type: 'income',  category: 'Mensalidade', date: `${today.slice(0,7)}-01`, paymentMethod: 'PIX',              status: 'paid',    studentId: 's1' },
  { id: 'tx2',  academyId: 'mock_acad_1', description: 'Mensalidade - Juliana Santos',   amount: 800,  type: 'income',  category: 'Mensalidade', date: `${today.slice(0,7)}-02`, paymentMethod: 'PIX',              status: 'paid',    studentId: 's2' },
  { id: 'tx3',  academyId: 'mock_acad_1', description: 'Mensalidade - Marcos Pereira',   amount: 800,  type: 'income',  category: 'Mensalidade', date: `${today.slice(0,7)}-03`, paymentMethod: 'Cartão de Crédito',status: 'paid',    studentId: 's3' },
  { id: 'tx4',  academyId: 'mock_acad_1', description: 'Plano Kids - Arthur Silva',      amount: 120,  type: 'income',  category: 'Mensalidade', date: `${today.slice(0,7)}-03`, paymentMethod: 'PIX',              status: 'paid',    studentId: 's4' },
  { id: 'tx5',  academyId: 'mock_acad_1', description: 'Aluguel do espaço',              amount: 2500, type: 'expense', category: 'Aluguel',     date: `${today.slice(0,7)}-05`, paymentMethod: 'Transferência',    status: 'paid' },
  { id: 'tx6',  academyId: 'mock_acad_1', description: 'Energia elétrica',               amount: 420,  type: 'expense', category: 'Energia/Água',date: `${today.slice(0,7)}-07`, paymentMethod: 'Débito Automático', status: 'paid' },
  { id: 'tx7',  academyId: 'mock_acad_1', description: 'Mensalidade - Lucas Ferreira',   amount: 150,  type: 'income',  category: 'Mensalidade', date: `${today.slice(0,7)}-08`, paymentMethod: 'Dinheiro',         status: 'pending', studentId: 's10' },
  { id: 'tx8',  academyId: 'mock_acad_1', description: 'Venda - Kimono adulto G',        amount: 280,  type: 'income',  category: 'Venda de Produto', date: `${today.slice(0,7)}-10`, paymentMethod: 'PIX',          status: 'paid' },
  { id: 'tx9',  academyId: 'mock_acad_1', description: 'Manutenção tatame',              amount: 350,  type: 'expense', category: 'Manutenção',  date: `${lastMonth.slice(0,7)}-20`, paymentMethod: 'Dinheiro',   status: 'paid' },
  { id: 'tx10', academyId: 'mock_acad_1', description: 'Salário - Prof. Ana Carolina',   amount: 1800, type: 'expense', category: 'Salários',    date: `${lastMonth.slice(0,7)}-30`, paymentMethod: 'Transferência', status: 'paid' },
];

// ── Calendar Events ───────────────────────────────────────────────────────

export const SEED_CALENDAR: CalendarEvent[] = [
  { id: 'ev1', academyId: 'mock_acad_1', date: `${today.slice(0,7)}-15`, reason: 'Feriado Nacional', type: 'no-class' },
  { id: 'ev2', academyId: 'mock_acad_1', date: `${today.slice(0,7)}-22`, reason: 'Seminário de Verão — Prof. Renato', type: 'event' },
];

// ── Chat Messages ─────────────────────────────────────────────────────────

export const SEED_CHAT: ChatMessage[] = [
  { id: 'msg1', academyId: 'mock_acad_1', senderId: 'mock_user_1',  senderName: 'Admin Teste',       senderRole: 'admin',      content: 'Pessoal, amanhã teremos treino extra às 7h da manhã. Confirmem presença! OSS!', timestamp: `${yesterday}T08:00:00Z` },
  { id: 'msg2', academyId: 'mock_acad_1', senderId: 'mock_instr_1', senderName: 'Prof. Renato Silva', senderRole: 'instructor', content: 'Lembrando que no sábado haverá o seminário com visitante especial. Não percam!', timestamp: `${yesterday}T14:30:00Z` },
  { id: 'msg3', academyId: 'mock_acad_1', senderId: 'mock_user_1',  senderName: 'Admin Teste',       senderRole: 'admin',      content: `Parabéns ao ${SEED_STUDENTS[1].name} pela faixa azul! OSS! 🥋`, timestamp: `${today}T09:15:00Z` },
];

// ── Products ──────────────────────────────────────────────────────────────

export const SEED_PRODUCTS: Product[] = [
  { id: 'prod1', academyId: 'mock_acad_1', name: 'Kimono Adulto A2', price: 280, stock: 5,  category: 'Kimonos',    createdAt: lastMonth },
  { id: 'prod2', academyId: 'mock_acad_1', name: 'Kimono Kids M2',   price: 220, stock: 3,  category: 'Kimonos',    createdAt: lastMonth },
  { id: 'prod3', academyId: 'mock_acad_1', name: 'Camiseta NexDojo', price: 65,  stock: 12, category: 'Vestuário',  createdAt: lastMonth },
  { id: 'prod4', academyId: 'mock_acad_1', name: 'Caneca OSS',       price: 35,  stock: 8,  category: 'Acessórios', createdAt: lastMonth },
  { id: 'prod5', academyId: 'mock_acad_1', name: 'Protetor Bucal',   price: 45,  stock: 0,  category: 'Proteções',  createdAt: lastMonth },
];
