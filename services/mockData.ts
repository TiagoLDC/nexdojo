
import { Student, Instructor, Staff, Belt, Academy, User, ClassSession, ClassTemplate, AttendanceRecord, FinanceTransaction, CalendarEvent, ChatMessage, Product } from '../types';

const today      = new Date().toISOString().split('T')[0];
const yesterday  = new Date(Date.now() -  1 * 86400000).toISOString().split('T')[0];
const twoDaysAgo = new Date(Date.now() -  2 * 86400000).toISOString().split('T')[0];
const oneWeekAgo = new Date(Date.now() -  7 * 86400000).toISOString().split('T')[0];
const lastMonth  = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
const tomorrow   = new Date(Date.now() +  1 * 86400000).toISOString().split('T')[0];
const nextWeek   = new Date(Date.now() +  7 * 86400000).toISOString().split('T')[0];
const nextMonth  = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
const curYM  = today.slice(0, 7);
const lastYM = lastMonth.slice(0, 7);

// ═══════════════════════════════════════════════════════════════════════════
// ACADEMIA 1 — Academia NexFight
// ═══════════════════════════════════════════════════════════════════════════

export const MOCK_ACADEMY: Academy = {
  id: 'mock_acad_1',
  name: 'Academia NexFight',
  logo: 'https://images.unsplash.com/photo-1552072092-7f9b8d63efcb?q=80&w=400&h=400&auto=format&fit=crop',
  ownerName: 'Prof. Carlos Gracie Jr.',
  email: 'admin@oss.com',
  phone: '11999990000',
  cep: '01310-100',
  address: 'Av. Paulista',
  addressNumber: '1000',
  absenceLimit: 4,
  pixKey: 'admin@oss.com',
  pixType: 'E-mail',
  plans: [
    { id: 'ap1', name: 'Mensal Adulto',   durationMonths: 1, classesPerWeek: 3, price: 150, category: 'Adultos' },
    { id: 'ap2', name: 'Semestral Elite', durationMonths: 6, classesPerWeek: 5, price: 800, category: 'Adultos' },
    { id: 'ap3', name: 'Plano Kids',      durationMonths: 1, classesPerWeek: 2, price: 120, category: 'Crianças' },
  ],
  currentPlan: 'Gold',
  planStatus: 'Active',
};

// ── Usuários ──
export const MOCK_USER: User = { id: 'mock_user_1', academyId: 'mock_acad_1', role: 'admin',      name: 'Admin NexFight',     email: 'admin@oss.com',  status: 'Active', ...{ password: 'oss123' } } as any;
export const MOCK_INSTRUCTOR_USER: User = { id: 'mock_instr_1', academyId: 'mock_acad_1', role: 'instructor', name: 'Prof. Renato Silva',  email: 'instru@oss.com', status: 'Active', ...{ password: 'oss123' } } as any;
export const MOCK_STAFF_USER: User      = { id: 'mock_staff_1', academyId: 'mock_acad_1', role: 'staff',      name: 'Ana Secretaria',      email: 'colab@oss.com',  status: 'Active', ...{ password: 'oss123' } } as any;
export const MOCK_STUDENT_USER: User    = { id: 'mock_student_user_1', academyId: 'mock_acad_1', role: 'student', name: 'Carlos Oliveira',   email: 'aluno@oss.com',  status: 'Active', ...{ password: 'oss123' } } as any;
export const MOCK_SUPERUSER: User       = { id: 'mock_superuser_1',    academyId: 'global',       role: 'superuser', name: 'Super User OSS',  email: 'super@oss.com',  status: 'Active', ...{ password: 'super'  } } as any;

// ── Alunos ──
export const MOCK_STUDENTS: Student[] = [
  { id: 's1',  academyId: 'mock_acad_1', name: 'Carlos Oliveira',  email: 'aluno@oss.com', phone: '11988887777', belt: Belt.WHITE,  stripes: 2, birthDate: '1995-04-12', totalClasses: 45,   totalHours: 67.5,  absentCount: 1, status: 'Active',   joinDate: '2023-10-01', photo: 'https://picsum.photos/seed/s1/400/400',  planId: 'ap1', lastGraduationDate: '2024-01-10', nextPaymentDate: nextWeek },
  { id: 's2',  academyId: 'mock_acad_1', name: 'Juliana Santos',   phone: '11977776666',                        belt: Belt.BLUE,   stripes: 1, birthDate: '1998-08-22', totalClasses: 120,  totalHours: 180,   absentCount: 4, status: 'Active',   joinDate: '2022-05-15', photo: 'https://picsum.photos/seed/s2/400/400',  planId: 'ap2', lastGraduationDate: '2023-11-20', nextPaymentDate: nextWeek },
  { id: 's3',  academyId: 'mock_acad_1', name: 'Marcos Pereira',   phone: '11966665555',                        belt: Belt.PURPLE, stripes: 3, birthDate: '1990-01-30', totalClasses: 350,  totalHours: 525,   absentCount: 0, status: 'Active',   joinDate: '2020-02-10', photo: 'https://picsum.photos/seed/s3/400/400',  planId: 'ap2', lastGraduationDate: '2023-06-15' },
  { id: 's4',  academyId: 'mock_acad_1', name: 'Arthur Silva',     guardianPhone: '11955554444',                belt: Belt.GREY,   stripes: 3, birthDate: '2016-05-10', totalClasses: 30,   totalHours: 30,    absentCount: 0, status: 'Active',   joinDate: '2023-12-01', photo: 'https://picsum.photos/seed/s4/400/400',  planId: 'ap3', lastGraduationDate: '2024-03-05', nextPaymentDate: nextWeek },
  { id: 's5',  academyId: 'mock_acad_1', name: 'Mariana Costa',    guardianPhone: '11944443333',                belt: Belt.YELLOW, stripes: 1, birthDate: '2014-02-20', totalClasses: 80,   totalHours: 80,    absentCount: 2, status: 'Active',   joinDate: '2023-01-15', photo: 'https://picsum.photos/seed/s5/400/400',                lastGraduationDate: '2024-02-12' },
  { id: 's6',  academyId: 'mock_acad_1', name: 'Ricardo Mendes',   phone: '11933332222',                        belt: Belt.BROWN,  stripes: 0, birthDate: '1988-11-05', totalClasses: 500,  totalHours: 750,   absentCount: 0, status: 'Active',   joinDate: '2018-03-20', photo: 'https://picsum.photos/seed/s6/400/400',                lastGraduationDate: '2022-08-25' },
  { id: 's7',  academyId: 'mock_acad_1', name: 'Beatriz Lima',     phone: '11922221111',                        belt: Belt.BLACK,  stripes: 1, birthDate: '1985-07-14', totalClasses: 1200, totalHours: 1800,  absentCount: 0, status: 'Active',   joinDate: '2010-01-10', photo: 'https://picsum.photos/seed/s7/400/400',                lastGraduationDate: '2021-12-01' },
  { id: 's8',  academyId: 'mock_acad_1', name: 'Pedro Rocha',      guardianPhone: '11911110000',                belt: Belt.ORANGE, stripes: 4, birthDate: '2011-03-25', totalClasses: 150,  totalHours: 150,   absentCount: 5, status: 'Active',   joinDate: '2021-06-12', photo: 'https://picsum.photos/seed/s8/400/400',                lastGraduationDate: '2023-10-15', nextPaymentDate: nextWeek },
  { id: 's9',  academyId: 'mock_acad_1', name: 'Sofia Amaral',     guardianPhone: '11900009999',                belt: Belt.GREEN,  stripes: 2, birthDate: '2009-09-02', totalClasses: 210,  totalHours: 210,   absentCount: 1, status: 'Active',   joinDate: '2020-11-05', photo: 'https://picsum.photos/seed/s9/400/400',                lastGraduationDate: '2023-12-20', nextPaymentDate: nextWeek },
  { id: 's10', academyId: 'mock_acad_1', name: 'Lucas Ferreira',   phone: '11987654321',                        belt: Belt.WHITE,  stripes: 0, birthDate: '2000-01-15', totalClasses: 5,    totalHours: 7.5,   absentCount: 0, status: 'Active',   joinDate: '2024-02-01', photo: 'https://picsum.photos/seed/s10/400/400',               nextPaymentDate: nextWeek },
  { id: 's11', academyId: 'mock_acad_1', name: 'Fernanda Gomes',   phone: '11976543210',                        belt: Belt.BLUE,   stripes: 2, birthDate: '1993-06-18', totalClasses: 95,   totalHours: 142.5, absentCount: 12, status: 'Inactive', joinDate: '2021-08-01', photo: 'https://picsum.photos/seed/s11/400/400',               lastGraduationDate: '2023-02-14' },
  { id: 's12', academyId: 'mock_acad_1', name: 'Rafael Nascimento', phone: '11965432109',                       belt: Belt.WHITE,  stripes: 0, birthDate: '2002-11-03', totalClasses: 0,    totalHours: 0,     absentCount: 0, status: 'Pending',  joinDate: today,        photo: 'https://picsum.photos/seed/s12/400/400' },
];

// ── Instrutores ──
export const MOCK_INSTRUCTORS: Instructor[] = [
  { id: 'i1', academyId: 'mock_acad_1', name: 'Prof. Renato Silva',  email: 'instru@oss.com', phone: '11999998888', belt: Belt.BLACK,  stripes: 2, birthDate: '1980-05-15', status: 'Active', joinDate: '2010-01-01', specialties: 'No-Gi, Competição, Adultos', photo: 'https://picsum.photos/seed/i1/400/400', lastGraduationDate: '2020-03-10' },
  { id: 'i2', academyId: 'mock_acad_1', name: 'Prof. Ana Carolina', email: 'ana@oss.com',    phone: '11988887777', belt: Belt.PURPLE, stripes: 4, birthDate: '1992-03-22', status: 'Active', joinDate: '2015-06-01', specialties: 'Kids, Iniciantes, Feminino', photo: 'https://picsum.photos/seed/i2/400/400', lastGraduationDate: '2023-08-15' },
];

// ── Staff ──
export const MOCK_STAFF: Staff[] = [
  { id: 'st1', academyId: 'mock_acad_1', name: 'Ana Secretaria', email: 'colab@oss.com', phone: '11977776666', birthDate: '1995-07-10', status: 'Active', joinDate: '2022-01-15', position: 'Secretária', photo: 'https://picsum.photos/seed/st1/400/400' },
  { id: 'st2', academyId: 'mock_acad_1', name: 'Bruno Limpeza',  email: 'bruno@oss.com',  phone: '11966665555', birthDate: '1988-12-05', status: 'Active', joinDate: '2023-03-01', position: 'Auxiliar de Serviços', photo: 'https://picsum.photos/seed/st2/400/400' },
];

// ── Templates ──
export const MOCK_TEMPLATES: ClassTemplate[] = [
  { id: 't1', academyId: 'mock_acad_1', name: 'Kids 5-9 anos',    durationMinutes: 60,  assignedStudentIds: ['s4','s5'],       schedules: [{ dayOfWeek: 1, startTime: '18:00', endTime: '19:00' }, { dayOfWeek: 3, startTime: '18:00', endTime: '19:00' }] },
  { id: 't2', academyId: 'mock_acad_1', name: 'Kids 10-15 anos',  durationMinutes: 60,  assignedStudentIds: ['s8','s9'],       schedules: [{ dayOfWeek: 2, startTime: '18:00', endTime: '19:00' }, { dayOfWeek: 4, startTime: '18:00', endTime: '19:00' }] },
  { id: 't3', academyId: 'mock_acad_1', name: 'Adulto Iniciante', durationMinutes: 90,  assignedStudentIds: ['s1','s10','s2'], schedules: [{ dayOfWeek: 1, startTime: '19:30', endTime: '21:00' }, { dayOfWeek: 3, startTime: '19:30', endTime: '21:00' }, { dayOfWeek: 5, startTime: '19:00', endTime: '20:30' }] },
  { id: 't4', academyId: 'mock_acad_1', name: 'Adulto Avançado',  durationMinutes: 120, assignedStudentIds: ['s3','s6','s7'],  schedules: [{ dayOfWeek: 2, startTime: '19:30', endTime: '21:30' }, { dayOfWeek: 4, startTime: '19:30', endTime: '21:30' }, { dayOfWeek: 6, startTime: '10:00', endTime: '12:00' }] },
];

// ── Sessões ──
export const MOCK_CLASSES: ClassSession[] = [
  { id: 'class_active_1', academyId: 'mock_acad_1', name: 'Adulto Iniciante (Noite)',  templateId: 't3', date: today + 'T19:30:00Z',       durationMinutes: 90,  instructorId: 'i1', attendanceIds: ['s1','s2'], status: 'In Progress' },
  { id: 'class_past_1',   academyId: 'mock_acad_1', name: 'Kids 5-9 anos (Seg/Qua)',   templateId: 't1', date: yesterday + 'T18:00:00Z',   durationMinutes: 60,  instructorId: 'i2', attendanceIds: ['s4','s5'], status: 'Finalized' },
  { id: 'class_past_2',   academyId: 'mock_acad_1', name: 'Adulto Avançado',            templateId: 't4', date: twoDaysAgo + 'T19:30:00Z',  durationMinutes: 120, instructorId: 'i1', attendanceIds: ['s3','s6','s7'], status: 'Finalized' },
  { id: 'class_past_3',   academyId: 'mock_acad_1', name: 'Kids 10-15 anos',            templateId: 't2', date: oneWeekAgo + 'T18:00:00Z',  durationMinutes: 60,  instructorId: 'i2', attendanceIds: ['s8','s9'], status: 'Finalized' },
];

// ── Presenças ──
export const MOCK_ATTENDANCE: AttendanceRecord[] = [
  { id: 'att_1', academyId: 'mock_acad_1', studentId: 's4', classId: 'class_past_1', date: yesterday + 'T18:00:00Z',  durationMinutes: 60 },
  { id: 'att_2', academyId: 'mock_acad_1', studentId: 's5', classId: 'class_past_1', date: yesterday + 'T18:00:00Z',  durationMinutes: 60 },
  { id: 'att_3', academyId: 'mock_acad_1', studentId: 's3', classId: 'class_past_2', date: twoDaysAgo + 'T19:30:00Z', durationMinutes: 120 },
  { id: 'att_4', academyId: 'mock_acad_1', studentId: 's6', classId: 'class_past_2', date: twoDaysAgo + 'T19:30:00Z', durationMinutes: 120 },
  { id: 'att_5', academyId: 'mock_acad_1', studentId: 's7', classId: 'class_past_2', date: twoDaysAgo + 'T19:30:00Z', durationMinutes: 120 },
];

// ── Finanças ──
export const MOCK_FINANCES: FinanceTransaction[] = [
  { id: 'tx1',  academyId: 'mock_acad_1', description: 'Mensalidade - Carlos Oliveira', amount: 150,  type: 'income',  category: 'Mensalidade',      date: curYM + '-01', paymentMethod: 'PIX',              status: 'paid',    studentId: 's1' },
  { id: 'tx2',  academyId: 'mock_acad_1', description: 'Mensalidade - Juliana Santos',  amount: 800,  type: 'income',  category: 'Mensalidade',      date: curYM + '-02', paymentMethod: 'PIX',              status: 'paid',    studentId: 's2' },
  { id: 'tx3',  academyId: 'mock_acad_1', description: 'Mensalidade - Marcos Pereira',  amount: 800,  type: 'income',  category: 'Mensalidade',      date: curYM + '-03', paymentMethod: 'Cartão de Crédito',status: 'paid',    studentId: 's3' },
  { id: 'tx4',  academyId: 'mock_acad_1', description: 'Plano Kids - Arthur Silva',     amount: 120,  type: 'income',  category: 'Mensalidade',      date: curYM + '-03', paymentMethod: 'PIX',              status: 'paid',    studentId: 's4' },
  { id: 'tx5',  academyId: 'mock_acad_1', description: 'Aluguel do espaço',             amount: 2500, type: 'expense', category: 'Aluguel',          date: curYM + '-05', paymentMethod: 'Transferência',    status: 'paid' },
  { id: 'tx6',  academyId: 'mock_acad_1', description: 'Energia elétrica',              amount: 420,  type: 'expense', category: 'Energia/Água',     date: curYM + '-07', paymentMethod: 'Débito Automático', status: 'paid' },
  { id: 'tx7',  academyId: 'mock_acad_1', description: 'Mensalidade - Lucas Ferreira',  amount: 150,  type: 'income',  category: 'Mensalidade',      date: curYM + '-08', paymentMethod: 'Dinheiro',         status: 'pending', studentId: 's10' },
  { id: 'tx8',  academyId: 'mock_acad_1', description: 'Venda - Kimono adulto A2',      amount: 280,  type: 'income',  category: 'Venda de Produto', date: curYM + '-10', paymentMethod: 'PIX',              status: 'paid' },
  { id: 'tx9',  academyId: 'mock_acad_1', description: 'Manutenção tatame',             amount: 350,  type: 'expense', category: 'Manutenção',       date: lastYM + '-20', paymentMethod: 'Dinheiro',        status: 'paid' },
  { id: 'tx10', academyId: 'mock_acad_1', description: 'Salário - Prof. Ana Carolina',  amount: 1800, type: 'expense', category: 'Salários',         date: lastYM + '-30', paymentMethod: 'Transferência',   status: 'paid' },
  { id: 'tx11', academyId: 'mock_acad_1', description: 'Matrícula - Rafael Nascimento', amount: 80,   type: 'income',  category: 'Matrícula',        date: today,         paymentMethod: 'PIX',              status: 'paid' },
  { id: 'tx12', academyId: 'mock_acad_1', description: 'Plano Kids - Pedro Rocha',      amount: 120,  type: 'income',  category: 'Mensalidade',      date: curYM + '-06', paymentMethod: 'PIX',              status: 'pending', studentId: 's8' },
];

// ── Calendário ──
export const MOCK_CALENDAR: CalendarEvent[] = [
  { id: 'ev1', academyId: 'mock_acad_1', date: curYM + '-15', reason: 'Feriado Nacional — Sem aula', type: 'no-class' },
  { id: 'ev2', academyId: 'mock_acad_1', date: curYM + '-22', reason: 'Seminário — Prof. Renato', type: 'event' },
  { id: 'ev3', academyId: 'mock_acad_1', date: nextWeek,       reason: 'Graduação de alunos — cerimônia', type: 'event' },
  { id: 'ev4', academyId: 'mock_acad_1', date: nextMonth,      reason: 'Copa Interna NexFight 2026', type: 'event' },
];

// ── Chat ──
export const MOCK_CHAT: ChatMessage[] = [
  { id: 'msg1', academyId: 'mock_acad_1', senderId: 'mock_user_1',  senderName: 'Admin NexFight',      senderRole: 'admin',      content: 'Pessoal, amanhã teremos treino extra às 7h! OSS!', timestamp: yesterday + 'T08:00:00Z' },
  { id: 'msg2', academyId: 'mock_acad_1', senderId: 'mock_instr_1', senderName: 'Prof. Renato Silva',  senderRole: 'instructor', content: 'Sábado haverá seminário com visitante especial. Não percam!', timestamp: yesterday + 'T14:30:00Z' },
  { id: 'msg3', academyId: 'mock_acad_1', senderId: 'mock_user_1',  senderName: 'Admin NexFight',      senderRole: 'admin',      content: 'Parabéns à Juliana Santos pela faixa azul! OSS! 🥋', timestamp: today + 'T09:15:00Z' },
  { id: 'msg4', academyId: 'mock_acad_1', senderId: 'mock_instr_1', senderName: 'Prof. Renato Silva',  senderRole: 'instructor', content: 'No-Gi toda sexta a partir das 20h. Todos bem-vindos!', timestamp: today + 'T11:00:00Z' },
  { id: 'msg5', academyId: 'mock_acad_1', senderId: 'mock_staff_1', senderName: 'Ana Secretaria',      senderRole: 'staff',      content: 'Pagamentos com vencimento dia 15. Dúvidas, me chamem!', timestamp: today + 'T12:30:00Z' },
];

// ── Produtos ──
export const MOCK_PRODUCTS: Product[] = [
  { id: 'prod1', academyId: 'mock_acad_1', name: 'Kimono Adulto A2',          price: 280, stock: 5,  category: 'Kimonos',    createdAt: lastMonth },
  { id: 'prod2', academyId: 'mock_acad_1', name: 'Kimono Kids M2',            price: 220, stock: 3,  category: 'Kimonos',    createdAt: lastMonth },
  { id: 'prod3', academyId: 'mock_acad_1', name: 'Camiseta NexFight',         price: 65,  stock: 12, category: 'Vestuário',  createdAt: lastMonth },
  { id: 'prod4', academyId: 'mock_acad_1', name: 'Caneca OSS',                price: 35,  stock: 8,  category: 'Acessórios', createdAt: lastMonth },
  { id: 'prod5', academyId: 'mock_acad_1', name: 'Protetor Bucal',            price: 45,  stock: 0,  category: 'Proteções',  createdAt: lastMonth },
  { id: 'prod6', academyId: 'mock_acad_1', name: 'Kimono Adulto A3 (Azul)',   price: 295, stock: 2,  category: 'Kimonos',    createdAt: lastMonth },
  { id: 'prod7', academyId: 'mock_acad_1', name: 'Faixa (várias cores)',      price: 30,  stock: 20, category: 'Acessórios', createdAt: lastMonth },
];

// ═══════════════════════════════════════════════════════════════════════════
// ACADEMIA 2 — Samurai BJJ
// ═══════════════════════════════════════════════════════════════════════════

export const MOCK_ACADEMY_2: Academy = {
  id: 'mock_acad_2',
  name: 'Samurai BJJ',
  logo: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=400&h=400&auto=format&fit=crop',
  ownerName: 'Prof. Takeshi Nakamura',
  email: 'admin@samurai.com',
  phone: '11888880000',
  cep: '04101-300',
  address: 'Rua das Flores',
  addressNumber: '500',
  absenceLimit: 3,
  pixKey: '11888880000',
  pixType: 'Telefone',
  plans: [
    { id: 'a2p1', name: 'Mensal Individual',  durationMonths: 1, classesPerWeek: 3, price: 180, category: 'Adultos'  },
    { id: 'a2p2', name: 'Trimestral Família', durationMonths: 3, classesPerWeek: 5, price: 450, category: 'Família'  },
    { id: 'a2p3', name: 'Plano Juvenil',      durationMonths: 1, classesPerWeek: 2, price: 130, category: 'Crianças' },
  ],
  currentPlan: 'Silver',
  planStatus: 'Active',
};

export const MOCK_USERS_A2: User[] = [
  { id: 'a2_admin_1',        academyId: 'mock_acad_2', role: 'admin',      name: 'Admin Samurai',        email: 'admin@samurai.com',  status: 'Active', ...{ password: 'sam123' } } as any,
  { id: 'a2_instr_1',        academyId: 'mock_acad_2', role: 'instructor', name: 'Prof. Kenji Nakamura', email: 'kenji@samurai.com',  status: 'Active', ...{ password: 'sam123' } } as any,
  { id: 'a2_instr_2',        academyId: 'mock_acad_2', role: 'instructor', name: 'Prof. Camila Sousa',   email: 'camila@samurai.com', status: 'Active', ...{ password: 'sam123' } } as any,
  { id: 'a2_staff_1',        academyId: 'mock_acad_2', role: 'staff',      name: 'Carlos Recepção',      email: 'sec@samurai.com',    status: 'Active', ...{ password: 'sam123' } } as any,
  { id: 'a2_student_user_1', academyId: 'mock_acad_2', role: 'student',    name: 'Rodrigo Tanaka',       email: 'aluno@samurai.com',  status: 'Active', ...{ password: 'sam123' } } as any,
];

export const MOCK_STUDENTS_A2: Student[] = [
  { id: 'a2_s1', academyId: 'mock_acad_2', name: 'Rodrigo Tanaka',     email: 'aluno@samurai.com', phone: '11877776666', belt: Belt.WHITE,  stripes: 3, birthDate: '1996-07-22', totalClasses: 38,   totalHours: 57,   absentCount: 1, status: 'Active',   joinDate: '2024-01-10', photo: 'https://picsum.photos/seed/a2s1/400/400', planId: 'a2p1', lastGraduationDate: oneWeekAgo,       nextPaymentDate: nextWeek },
  { id: 'a2_s2', academyId: 'mock_acad_2', name: 'Fernanda Kobayashi', phone: '11866665555',                             belt: Belt.BLUE,   stripes: 2, birthDate: '1999-03-14', totalClasses: 145,  totalHours: 217,  absentCount: 3, status: 'Active',   joinDate: '2022-09-20', photo: 'https://picsum.photos/seed/a2s2/400/400', planId: 'a2p1', lastGraduationDate: '2024-02-20',     nextPaymentDate: nextWeek },
  { id: 'a2_s3', academyId: 'mock_acad_2', name: 'Thiago Nakamura',    phone: '11855554444',                             belt: Belt.PURPLE, stripes: 1, birthDate: '1991-11-08', totalClasses: 280,  totalHours: 420,  absentCount: 0, status: 'Active',   joinDate: '2020-06-15', photo: 'https://picsum.photos/seed/a2s3/400/400', planId: 'a2p2', lastGraduationDate: '2023-08-10' },
  { id: 'a2_s4', academyId: 'mock_acad_2', name: 'Isabela Morita',     guardianPhone: '11844443333',                     belt: Belt.GREY,   stripes: 2, birthDate: '2017-01-30', totalClasses: 50,   totalHours: 50,   absentCount: 0, status: 'Active',   joinDate: '2024-03-01', photo: 'https://picsum.photos/seed/a2s4/400/400', planId: 'a2p3', lastGraduationDate: oneWeekAgo,       nextPaymentDate: nextWeek },
  { id: 'a2_s5', academyId: 'mock_acad_2', name: 'Eduardo Yamamoto',   guardianPhone: '11833332222',                     belt: Belt.ORANGE, stripes: 0, birthDate: '2012-08-15', totalClasses: 110,  totalHours: 110,  absentCount: 2, status: 'Active',   joinDate: '2022-04-10', photo: 'https://picsum.photos/seed/a2s5/400/400', planId: 'a2p3', lastGraduationDate: '2024-01-08' },
  { id: 'a2_s6', academyId: 'mock_acad_2', name: 'Camila Tanaka',      phone: '11822221111',                             belt: Belt.BROWN,  stripes: 2, birthDate: '1987-05-22', totalClasses: 480,  totalHours: 720,  absentCount: 0, status: 'Active',   joinDate: '2017-02-01', photo: 'https://picsum.photos/seed/a2s6/400/400', planId: 'a2p2', lastGraduationDate: '2023-05-20' },
  { id: 'a2_s7', academyId: 'mock_acad_2', name: 'André Lima',         phone: '11811110000',                             belt: Belt.BLACK,  stripes: 0, birthDate: '1982-09-30', totalClasses: 980,  totalHours: 1470, absentCount: 0, status: 'Active',   joinDate: '2008-05-10', photo: 'https://picsum.photos/seed/a2s7/400/400', planId: 'a2p2', lastGraduationDate: '2020-07-12' },
  { id: 'a2_s8', academyId: 'mock_acad_2', name: 'Marina Souza',       guardianPhone: '11800009999',                     belt: Belt.YELLOW, stripes: 3, birthDate: '2013-04-05', totalClasses: 72,   totalHours: 72,   absentCount: 1, status: 'Active',   joinDate: '2023-02-20', photo: 'https://picsum.photos/seed/a2s8/400/400', planId: 'a2p3', lastGraduationDate: oneWeekAgo,       nextPaymentDate: nextWeek },
  { id: 'a2_s9', academyId: 'mock_acad_2', name: 'Gabriel Oliveira',   phone: '11799998888',                             belt: Belt.WHITE,  stripes: 1, birthDate: '2001-12-10', totalClasses: 12,   totalHours: 18,   absentCount: 8, status: 'Inactive', joinDate: '2024-05-01', photo: 'https://picsum.photos/seed/a2s9/400/400' },
  { id: 'a2_s10',academyId: 'mock_acad_2', name: 'Vanessa Rodrigues',  phone: '11788887777',                             belt: Belt.WHITE,  stripes: 0, birthDate: '1997-08-28', totalClasses: 0,    totalHours: 0,    absentCount: 0, status: 'Pending',  joinDate: today,        photo: 'https://picsum.photos/seed/a2s10/400/400' },
];

export const MOCK_INSTRUCTORS_A2: Instructor[] = [
  { id: 'a2_i1', academyId: 'mock_acad_2', name: 'Prof. Kenji Nakamura', email: 'kenji@samurai.com',  phone: '11877778888', belt: Belt.BLACK,  stripes: 3, birthDate: '1978-11-10', status: 'Active', joinDate: '2008-01-15', specialties: 'Competição, No-Gi, Adultos', photo: 'https://picsum.photos/seed/a2i1/400/400', lastGraduationDate: '2021-09-25' },
  { id: 'a2_i2', academyId: 'mock_acad_2', name: 'Prof. Camila Sousa',   email: 'camila@samurai.com', phone: '11866667777', belt: Belt.PURPLE, stripes: 2, birthDate: '1994-07-08', status: 'Active', joinDate: '2018-03-01', specialties: 'Kids, Juvenil, Feminino',     photo: 'https://picsum.photos/seed/a2i2/400/400', lastGraduationDate: '2024-01-10' },
];

export const MOCK_STAFF_A2: Staff[] = [
  { id: 'a2_st1', academyId: 'mock_acad_2', name: 'Carlos Recepção', email: 'sec@samurai.com', phone: '11855556666', birthDate: '1991-04-18', status: 'Active', joinDate: '2021-11-01', position: 'Recepcionista', photo: 'https://picsum.photos/seed/a2st1/400/400' },
];

export const MOCK_TEMPLATES_A2: ClassTemplate[] = [
  { id: 'a2_t1', academyId: 'mock_acad_2', name: 'Infantil A (5-12)',  durationMinutes: 60,  assignedStudentIds: ['a2_s4','a2_s5','a2_s8'], schedules: [{ dayOfWeek: 1, startTime: '17:30', endTime: '18:30' }, { dayOfWeek: 3, startTime: '17:30', endTime: '18:30' }] },
  { id: 'a2_t2', academyId: 'mock_acad_2', name: 'Infantil B (13-17)', durationMinutes: 75,  assignedStudentIds: [],                        schedules: [{ dayOfWeek: 2, startTime: '17:00', endTime: '18:15' }, { dayOfWeek: 4, startTime: '17:00', endTime: '18:15' }] },
  { id: 'a2_t3', academyId: 'mock_acad_2', name: 'Adulto Básico',      durationMinutes: 90,  assignedStudentIds: ['a2_s1','a2_s2'],         schedules: [{ dayOfWeek: 1, startTime: '20:00', endTime: '21:30' }, { dayOfWeek: 3, startTime: '20:00', endTime: '21:30' }, { dayOfWeek: 5, startTime: '19:30', endTime: '21:00' }] },
  { id: 'a2_t4', academyId: 'mock_acad_2', name: 'Competição',         durationMinutes: 120, assignedStudentIds: ['a2_s3','a2_s6','a2_s7'], schedules: [{ dayOfWeek: 2, startTime: '19:00', endTime: '21:00' }, { dayOfWeek: 4, startTime: '19:00', endTime: '21:00' }, { dayOfWeek: 6, startTime: '09:00', endTime: '11:00' }] },
];

export const MOCK_CLASSES_A2: ClassSession[] = [
  { id: 'a2_cls_active', academyId: 'mock_acad_2', name: 'Adulto Básico (Noite)', templateId: 'a2_t3', date: today + 'T20:00:00Z',       durationMinutes: 90,  instructorId: 'a2_i1', attendanceIds: ['a2_s1','a2_s2'], status: 'In Progress' },
  { id: 'a2_cls_past_1', academyId: 'mock_acad_2', name: 'Infantil A',             templateId: 'a2_t1', date: yesterday + 'T17:30:00Z',   durationMinutes: 60,  instructorId: 'a2_i2', attendanceIds: ['a2_s4','a2_s5','a2_s8'], status: 'Finalized' },
  { id: 'a2_cls_past_2', academyId: 'mock_acad_2', name: 'Competição (Noite)',     templateId: 'a2_t4', date: twoDaysAgo + 'T19:00:00Z',  durationMinutes: 120, instructorId: 'a2_i1', attendanceIds: ['a2_s3','a2_s6','a2_s7'], status: 'Finalized' },
  { id: 'a2_cls_past_3', academyId: 'mock_acad_2', name: 'Adulto Básico (Noite)', templateId: 'a2_t3', date: oneWeekAgo + 'T20:00:00Z',  durationMinutes: 90,  instructorId: 'a2_i1', attendanceIds: ['a2_s1','a2_s3'], status: 'Finalized' },
];

export const MOCK_ATTENDANCE_A2: AttendanceRecord[] = [
  { id: 'a2_att_1', academyId: 'mock_acad_2', studentId: 'a2_s4', classId: 'a2_cls_past_1', date: yesterday + 'T17:30:00Z',  durationMinutes: 60 },
  { id: 'a2_att_2', academyId: 'mock_acad_2', studentId: 'a2_s5', classId: 'a2_cls_past_1', date: yesterday + 'T17:30:00Z',  durationMinutes: 60 },
  { id: 'a2_att_3', academyId: 'mock_acad_2', studentId: 'a2_s8', classId: 'a2_cls_past_1', date: yesterday + 'T17:30:00Z',  durationMinutes: 60 },
  { id: 'a2_att_4', academyId: 'mock_acad_2', studentId: 'a2_s3', classId: 'a2_cls_past_2', date: twoDaysAgo + 'T19:00:00Z', durationMinutes: 120 },
  { id: 'a2_att_5', academyId: 'mock_acad_2', studentId: 'a2_s6', classId: 'a2_cls_past_2', date: twoDaysAgo + 'T19:00:00Z', durationMinutes: 120 },
];

export const MOCK_FINANCES_A2: FinanceTransaction[] = [
  { id: 'a2_tx1',  academyId: 'mock_acad_2', description: 'Mensalidade - Rodrigo Tanaka',     amount: 180,  type: 'income',  category: 'Mensalidade',      date: curYM + '-01', paymentMethod: 'PIX',              status: 'paid',    studentId: 'a2_s1' },
  { id: 'a2_tx2',  academyId: 'mock_acad_2', description: 'Mensalidade - Fernanda Kobayashi', amount: 180,  type: 'income',  category: 'Mensalidade',      date: curYM + '-02', paymentMethod: 'PIX',              status: 'paid',    studentId: 'a2_s2' },
  { id: 'a2_tx3',  academyId: 'mock_acad_2', description: 'Pacote Família - Thiago Nakamura', amount: 450,  type: 'income',  category: 'Mensalidade',      date: curYM + '-02', paymentMethod: 'Cartão de Crédito',status: 'paid',    studentId: 'a2_s3' },
  { id: 'a2_tx4',  academyId: 'mock_acad_2', description: 'Plano Juvenil - Isabela Morita',   amount: 130,  type: 'income',  category: 'Mensalidade',      date: curYM + '-03', paymentMethod: 'PIX',              status: 'paid',    studentId: 'a2_s4' },
  { id: 'a2_tx5',  academyId: 'mock_acad_2', description: 'Aluguel da academia',              amount: 3200, type: 'expense', category: 'Aluguel',          date: curYM + '-05', paymentMethod: 'Transferência',    status: 'paid' },
  { id: 'a2_tx6',  academyId: 'mock_acad_2', description: 'Salário - Prof. Camila Sousa',     amount: 2200, type: 'expense', category: 'Salários',         date: lastYM + '-30', paymentMethod: 'Transferência',   status: 'paid' },
  { id: 'a2_tx7',  academyId: 'mock_acad_2', description: 'Energia elétrica',                 amount: 580,  type: 'expense', category: 'Energia/Água',     date: curYM + '-08', paymentMethod: 'Débito Automático', status: 'paid' },
  { id: 'a2_tx8',  academyId: 'mock_acad_2', description: 'Venda - Kimono Kids M2',           amount: 220,  type: 'income',  category: 'Venda de Produto', date: curYM + '-10', paymentMethod: 'Dinheiro',         status: 'paid' },
  { id: 'a2_tx9',  academyId: 'mock_acad_2', description: 'Matrícula - Vanessa Rodrigues',    amount: 80,   type: 'income',  category: 'Matrícula',        date: today,         paymentMethod: 'PIX',              status: 'paid' },
  { id: 'a2_tx10', academyId: 'mock_acad_2', description: 'Plano Juvenil - Eduardo Yamamoto', amount: 130,  type: 'income',  category: 'Mensalidade',      date: curYM + '-04', paymentMethod: 'PIX',              status: 'pending', studentId: 'a2_s5' },
];

export const MOCK_CALENDAR_A2: CalendarEvent[] = [
  { id: 'a2_ev1', academyId: 'mock_acad_2', date: curYM + '-15', reason: 'Feriado Nacional — Academia fechada', type: 'no-class' },
  { id: 'a2_ev2', academyId: 'mock_acad_2', date: curYM + '-29', reason: 'Exame de Graduação — Samurai BJJ', type: 'event' },
  { id: 'a2_ev3', academyId: 'mock_acad_2', date: nextWeek,       reason: 'Treino especial — Prof. Convidado', type: 'event' },
];

export const MOCK_CHAT_A2: ChatMessage[] = [
  { id: 'a2_msg1', academyId: 'mock_acad_2', senderId: 'a2_admin_1', senderName: 'Admin Samurai',        senderRole: 'admin',      content: 'Samurai BJJ com novas turmas abertas! Indique seus amigos. OSS!', timestamp: yesterday + 'T09:00:00Z' },
  { id: 'a2_msg2', academyId: 'mock_acad_2', senderId: 'a2_instr_1', senderName: 'Prof. Kenji Nakamura', senderRole: 'instructor', content: 'Treino de competição nessa semana na quinta às 19h. Venham preparados!', timestamp: yesterday + 'T16:00:00Z' },
  { id: 'a2_msg3', academyId: 'mock_acad_2', senderId: 'a2_instr_2', senderName: 'Prof. Camila Sousa',   senderRole: 'instructor', content: 'Turma Kids: ensaio de graduação no próximo sábado! Traga os responsáveis.', timestamp: today + 'T08:00:00Z' },
  { id: 'a2_msg4', academyId: 'mock_acad_2', senderId: 'a2_admin_1', senderName: 'Admin Samurai',        senderRole: 'admin',      content: 'Parabéns Rodrigo Tanaka pelas 3 fitas na branca! OSS', timestamp: today + 'T10:30:00Z' },
];

export const MOCK_PRODUCTS_A2: Product[] = [
  { id: 'a2_prod1', academyId: 'mock_acad_2', name: 'Kimono Samurai A2',     price: 310, stock: 4,  category: 'Kimonos',    createdAt: lastMonth },
  { id: 'a2_prod2', academyId: 'mock_acad_2', name: 'Rashguard Manga Curta', price: 95,  stock: 8,  category: 'Vestuário',  createdAt: lastMonth },
  { id: 'a2_prod3', academyId: 'mock_acad_2', name: 'Shorts de No-Gi',       price: 80,  stock: 6,  category: 'Vestuário',  createdAt: lastMonth },
  { id: 'a2_prod4', academyId: 'mock_acad_2', name: 'Joelheira Compressão',  price: 55,  stock: 0,  category: 'Proteções',  createdAt: lastMonth },
  { id: 'a2_prod5', academyId: 'mock_acad_2', name: 'Bolsa Samurai BJJ',     price: 120, stock: 3,  category: 'Acessórios', createdAt: lastMonth },
];

// ═══════════════════════════════════════════════════════════════════════════
// ACADEMIA 3 — Dragão Fight
// ═══════════════════════════════════════════════════════════════════════════

export const MOCK_ACADEMY_3: Academy = {
  id: 'mock_acad_3',
  name: 'Dragão Fight',
  logo: 'https://images.unsplash.com/photo-1517438476312-10d79c077509?q=80&w=400&h=400&auto=format&fit=crop',
  ownerName: 'Prof. Rodrigo Dragão',
  email: 'admin@dragao.com',
  phone: '21977770000',
  cep: '20040-020',
  address: 'Av. das Nações',
  addressNumber: '250',
  absenceLimit: 5,
  pixKey: '12345678000190',
  pixType: 'CNPJ',
  plans: [
    { id: 'a3p1', name: 'Mensal Standard',  durationMonths: 1, classesPerWeek: 3, price: 160, category: 'Adultos'  },
    { id: 'a3p2', name: 'Plano Família',    durationMonths: 1, classesPerWeek: 5, price: 280, category: 'Família'  },
    { id: 'a3p3', name: 'Trimestral Elite', durationMonths: 3, classesPerWeek: 5, price: 420, category: 'Adultos'  },
    { id: 'a3p4', name: 'Plano Kids',       durationMonths: 1, classesPerWeek: 2, price: 110, category: 'Crianças' },
  ],
  currentPlan: 'Black Belt',
  planStatus: 'Active',
};

export const MOCK_USERS_A3: User[] = [
  { id: 'a3_admin_1',        academyId: 'mock_acad_3', role: 'admin',      name: 'Admin Dragão',        email: 'admin@dragao.com',   status: 'Active', ...{ password: 'drg123' } } as any,
  { id: 'a3_instr_1',        academyId: 'mock_acad_3', role: 'instructor', name: 'Prof. Diego Rocha',   email: 'diego@dragao.com',   status: 'Active', ...{ password: 'drg123' } } as any,
  { id: 'a3_instr_2',        academyId: 'mock_acad_3', role: 'instructor', name: 'Prof. Leticia Vaz',   email: 'leticia@dragao.com', status: 'Active', ...{ password: 'drg123' } } as any,
  { id: 'a3_staff_1',        academyId: 'mock_acad_3', role: 'staff',      name: 'Bruno Atendimento',   email: 'atend@dragao.com',   status: 'Active', ...{ password: 'drg123' } } as any,
  { id: 'a3_student_user_1', academyId: 'mock_acad_3', role: 'student',    name: 'Amanda Ferreira',     email: 'aluno@dragao.com',   status: 'Active', ...{ password: 'drg123' } } as any,
];

export const MOCK_STUDENTS_A3: Student[] = [
  { id: 'a3_s1',  academyId: 'mock_acad_3', name: 'Diego Rocha',    email: 'aluno@dragao.com', phone: '21988887777', belt: Belt.WHITE,  stripes: 1, birthDate: '1997-02-14', totalClasses: 22,   totalHours: 33,   absentCount: 0, status: 'Active',   joinDate: '2024-02-01', photo: 'https://picsum.photos/seed/a3s1/400/400',  planId: 'a3p1', lastGraduationDate: oneWeekAgo, nextPaymentDate: nextWeek },
  { id: 'a3_s2',  academyId: 'mock_acad_3', name: 'Amanda Ferreira',phone: '21977776666',                            belt: Belt.BLUE,   stripes: 3, birthDate: '2000-06-20', totalClasses: 195,  totalHours: 292,  absentCount: 2, status: 'Active',   joinDate: '2022-11-10', photo: 'https://picsum.photos/seed/a3s2/400/400',  planId: 'a3p3', lastGraduationDate: '2024-03-15',nextPaymentDate: nextWeek },
  { id: 'a3_s3',  academyId: 'mock_acad_3', name: 'Felipe Castro',  phone: '21966665555',                            belt: Belt.PURPLE, stripes: 2, birthDate: '1989-09-17', totalClasses: 320,  totalHours: 480,  absentCount: 1, status: 'Active',   joinDate: '2020-03-15', photo: 'https://picsum.photos/seed/a3s3/400/400',  planId: 'a3p3', lastGraduationDate: '2023-09-05' },
  { id: 'a3_s4',  academyId: 'mock_acad_3', name: 'Larissa Pinto',  guardianPhone: '21955554444',                    belt: Belt.GREY,   stripes: 4, birthDate: '2015-12-03', totalClasses: 65,   totalHours: 65,   absentCount: 1, status: 'Active',   joinDate: '2023-08-10', photo: 'https://picsum.photos/seed/a3s4/400/400',  planId: 'a3p4', lastGraduationDate: lastMonth,    nextPaymentDate: nextWeek },
  { id: 'a3_s5',  academyId: 'mock_acad_3', name: 'Gabriel Melo',   guardianPhone: '21944443333',                    belt: Belt.YELLOW, stripes: 2, birthDate: '2013-07-11', totalClasses: 88,   totalHours: 88,   absentCount: 3, status: 'Active',   joinDate: '2022-12-01', photo: 'https://picsum.photos/seed/a3s5/400/400',  planId: 'a3p4', lastGraduationDate: '2024-01-25' },
  { id: 'a3_s6',  academyId: 'mock_acad_3', name: 'Juliana Ramos',  phone: '21933332222',                            belt: Belt.BROWN,  stripes: 1, birthDate: '1986-04-30', totalClasses: 460,  totalHours: 690,  absentCount: 0, status: 'Active',   joinDate: '2016-07-01', photo: 'https://picsum.photos/seed/a3s6/400/400',  planId: 'a3p2', lastGraduationDate: '2023-03-10' },
  { id: 'a3_s7',  academyId: 'mock_acad_3', name: 'Pedro Monteiro', phone: '21922221111',                            belt: Belt.BLACK,  stripes: 2, birthDate: '1984-01-20', totalClasses: 1100, totalHours: 1650, absentCount: 0, status: 'Active',   joinDate: '2007-09-15', photo: 'https://picsum.photos/seed/a3s7/400/400',  planId: 'a3p3', lastGraduationDate: '2022-11-20' },
  { id: 'a3_s8',  academyId: 'mock_acad_3', name: 'Gustavo Santos', guardianPhone: '21911110000',                    belt: Belt.ORANGE, stripes: 3, birthDate: '2010-05-18', totalClasses: 140,  totalHours: 140,  absentCount: 4, status: 'Active',   joinDate: '2021-09-20', photo: 'https://picsum.photos/seed/a3s8/400/400',  planId: 'a3p4', lastGraduationDate: '2023-11-30',nextPaymentDate: nextWeek, absenceLimit: 6 },
  { id: 'a3_s9',  academyId: 'mock_acad_3', name: 'Natália Costa',  guardianPhone: '21900009999',                    belt: Belt.GREEN,  stripes: 0, birthDate: '2008-10-22', totalClasses: 190,  totalHours: 190,  absentCount: 2, status: 'Active',   joinDate: '2020-07-15', photo: 'https://picsum.photos/seed/a3s9/400/400',  planId: 'a3p4', lastGraduationDate: '2024-04-05',nextPaymentDate: nextWeek },
  { id: 'a3_s10', academyId: 'mock_acad_3', name: 'Rafael Alves',   phone: '21889998888',                            belt: Belt.WHITE,  stripes: 2, birthDate: '1995-03-08', totalClasses: 30,   totalHours: 45,   absentCount: 10,status: 'Inactive', joinDate: '2023-06-01', photo: 'https://picsum.photos/seed/a3s10/400/400' },
  { id: 'a3_s11', academyId: 'mock_acad_3', name: 'Marcela Dias',   phone: '21878887777',                            belt: Belt.BLUE,   stripes: 0, birthDate: '1994-11-15', totalClasses: 60,   totalHours: 90,   absentCount: 15,status: 'Dropped',  joinDate: '2023-01-10', photo: 'https://picsum.photos/seed/a3s11/400/400' },
];

export const MOCK_INSTRUCTORS_A3: Instructor[] = [
  { id: 'a3_i1', academyId: 'mock_acad_3', name: 'Prof. Diego Rocha Jr.', email: 'diego@dragao.com',   phone: '21977778888', belt: Belt.BLACK, stripes: 4, birthDate: '1976-08-25', status: 'Active', joinDate: '2005-04-01', specialties: 'Adultos, Competição, No-Gi', photo: 'https://picsum.photos/seed/a3i1/400/400', lastGraduationDate: '2023-06-30' },
  { id: 'a3_i2', academyId: 'mock_acad_3', name: 'Prof. Leticia Vaz',     email: 'leticia@dragao.com', phone: '21966667777', belt: Belt.BROWN, stripes: 3, birthDate: '1990-02-16', status: 'Active', joinDate: '2014-08-01', specialties: 'Kids, Feminino, Iniciantes',  photo: 'https://picsum.photos/seed/a3i2/400/400', lastGraduationDate: '2024-02-28' },
];

export const MOCK_STAFF_A3: Staff[] = [
  { id: 'a3_st1', academyId: 'mock_acad_3', name: 'Bruno Atendimento', email: 'atend@dragao.com', phone: '21955556666', birthDate: '1993-09-27', status: 'Active', joinDate: '2022-05-10', position: 'Atendente', photo: 'https://picsum.photos/seed/a3st1/400/400' },
];

export const MOCK_TEMPLATES_A3: ClassTemplate[] = [
  { id: 'a3_t1', academyId: 'mock_acad_3', name: 'Kids Dragon (6-11)', durationMinutes: 60,  assignedStudentIds: ['a3_s4','a3_s5','a3_s8'], schedules: [{ dayOfWeek: 1, startTime: '17:00', endTime: '18:00' }, { dayOfWeek: 3, startTime: '17:00', endTime: '18:00' }] },
  { id: 'a3_t2', academyId: 'mock_acad_3', name: 'Juvenil Dragon',     durationMinutes: 75,  assignedStudentIds: ['a3_s9'],                 schedules: [{ dayOfWeek: 2, startTime: '17:30', endTime: '18:45' }, { dayOfWeek: 5, startTime: '17:30', endTime: '18:45' }] },
  { id: 'a3_t3', academyId: 'mock_acad_3', name: 'Adulto Dragon',      durationMinutes: 90,  assignedStudentIds: ['a3_s1','a3_s2','a3_s3'], schedules: [{ dayOfWeek: 1, startTime: '20:00', endTime: '21:30' }, { dayOfWeek: 3, startTime: '20:00', endTime: '21:30' }, { dayOfWeek: 5, startTime: '20:00', endTime: '21:30' }] },
  { id: 'a3_t4', academyId: 'mock_acad_3', name: 'Elite / Competição', durationMinutes: 120, assignedStudentIds: ['a3_s6','a3_s7'],         schedules: [{ dayOfWeek: 2, startTime: '19:00', endTime: '21:00' }, { dayOfWeek: 4, startTime: '19:00', endTime: '21:00' }, { dayOfWeek: 6, startTime: '08:00', endTime: '10:00' }] },
];

export const MOCK_CLASSES_A3: ClassSession[] = [
  { id: 'a3_cls_active', academyId: 'mock_acad_3', name: 'Adulto Dragon (Noite)', templateId: 'a3_t3', date: today + 'T20:00:00Z',       durationMinutes: 90,  instructorId: 'a3_i1', attendanceIds: ['a3_s2','a3_s3'], status: 'In Progress' },
  { id: 'a3_cls_past_1', academyId: 'mock_acad_3', name: 'Kids Dragon',            templateId: 'a3_t1', date: yesterday + 'T17:00:00Z',   durationMinutes: 60,  instructorId: 'a3_i2', attendanceIds: ['a3_s4','a3_s5','a3_s8'], status: 'Finalized' },
  { id: 'a3_cls_past_2', academyId: 'mock_acad_3', name: 'Elite / Competição',     templateId: 'a3_t4', date: twoDaysAgo + 'T19:00:00Z',  durationMinutes: 120, instructorId: 'a3_i1', attendanceIds: ['a3_s6','a3_s7'], status: 'Finalized' },
  { id: 'a3_cls_past_3', academyId: 'mock_acad_3', name: 'Adulto Dragon (Noite)', templateId: 'a3_t3', date: oneWeekAgo + 'T20:00:00Z',  durationMinutes: 90,  instructorId: 'a3_i1', attendanceIds: ['a3_s1','a3_s2','a3_s3'], status: 'Finalized' },
];

export const MOCK_ATTENDANCE_A3: AttendanceRecord[] = [
  { id: 'a3_att_1', academyId: 'mock_acad_3', studentId: 'a3_s4', classId: 'a3_cls_past_1', date: yesterday + 'T17:00:00Z',  durationMinutes: 60 },
  { id: 'a3_att_2', academyId: 'mock_acad_3', studentId: 'a3_s5', classId: 'a3_cls_past_1', date: yesterday + 'T17:00:00Z',  durationMinutes: 60 },
  { id: 'a3_att_3', academyId: 'mock_acad_3', studentId: 'a3_s8', classId: 'a3_cls_past_1', date: yesterday + 'T17:00:00Z',  durationMinutes: 60 },
  { id: 'a3_att_4', academyId: 'mock_acad_3', studentId: 'a3_s6', classId: 'a3_cls_past_2', date: twoDaysAgo + 'T19:00:00Z', durationMinutes: 120 },
  { id: 'a3_att_5', academyId: 'mock_acad_3', studentId: 'a3_s7', classId: 'a3_cls_past_2', date: twoDaysAgo + 'T19:00:00Z', durationMinutes: 120 },
];

export const MOCK_FINANCES_A3: FinanceTransaction[] = [
  { id: 'a3_tx1',  academyId: 'mock_acad_3', description: 'Mensalidade - Amanda Ferreira',   amount: 420,  type: 'income',  category: 'Mensalidade',      date: curYM + '-01', paymentMethod: 'PIX',              status: 'paid',    studentId: 'a3_s2' },
  { id: 'a3_tx2',  academyId: 'mock_acad_3', description: 'Mensalidade - Felipe Castro',     amount: 420,  type: 'income',  category: 'Mensalidade',      date: curYM + '-02', paymentMethod: 'PIX',              status: 'paid',    studentId: 'a3_s3' },
  { id: 'a3_tx3',  academyId: 'mock_acad_3', description: 'Plano Família - Juliana Ramos',   amount: 280,  type: 'income',  category: 'Mensalidade',      date: curYM + '-03', paymentMethod: 'Cartão de Crédito',status: 'paid',    studentId: 'a3_s6' },
  { id: 'a3_tx4',  academyId: 'mock_acad_3', description: 'Plano Kids - Larissa Pinto',      amount: 110,  type: 'income',  category: 'Mensalidade',      date: curYM + '-03', paymentMethod: 'PIX',              status: 'paid',    studentId: 'a3_s4' },
  { id: 'a3_tx5',  academyId: 'mock_acad_3', description: 'Aluguel do espaço',               amount: 4000, type: 'expense', category: 'Aluguel',          date: curYM + '-05', paymentMethod: 'Transferência',    status: 'paid' },
  { id: 'a3_tx6',  academyId: 'mock_acad_3', description: 'Salário - Prof. Leticia Vaz',     amount: 2500, type: 'expense', category: 'Salários',         date: lastYM + '-30', paymentMethod: 'Transferência',   status: 'paid' },
  { id: 'a3_tx7',  academyId: 'mock_acad_3', description: 'Energia / Água',                  amount: 720,  type: 'expense', category: 'Energia/Água',     date: curYM + '-07', paymentMethod: 'Débito Automático', status: 'paid' },
  { id: 'a3_tx8',  academyId: 'mock_acad_3', description: 'Mensalidade - Diego Rocha',       amount: 160,  type: 'income',  category: 'Mensalidade',      date: curYM + '-04', paymentMethod: 'Dinheiro',         status: 'pending', studentId: 'a3_s1' },
  { id: 'a3_tx9',  academyId: 'mock_acad_3', description: 'Venda - Kit proteção',            amount: 160,  type: 'income',  category: 'Venda de Produto', date: curYM + '-09', paymentMethod: 'PIX',              status: 'paid' },
  { id: 'a3_tx10', academyId: 'mock_acad_3', description: 'Plano Kids - Gustavo Santos',     amount: 110,  type: 'income',  category: 'Mensalidade',      date: curYM + '-06', paymentMethod: 'PIX',              status: 'pending', studentId: 'a3_s8' },
];

export const MOCK_CALENDAR_A3: CalendarEvent[] = [
  { id: 'a3_ev1', academyId: 'mock_acad_3', date: curYM + '-15', reason: 'Feriado Nacional — Sem treino', type: 'no-class' },
  { id: 'a3_ev2', academyId: 'mock_acad_3', date: tomorrow,       reason: 'Open Dragão — Campeonato Interno', type: 'event' },
  { id: 'a3_ev3', academyId: 'mock_acad_3', date: nextMonth,      reason: 'Seminário com Mestre Rodrigo', type: 'event' },
];

export const MOCK_CHAT_A3: ChatMessage[] = [
  { id: 'a3_msg1', academyId: 'mock_acad_3', senderId: 'a3_admin_1', senderName: 'Admin Dragão',          senderRole: 'admin',      content: 'Open Dragão amanhã! Todos os alunos confirmados? Contamos com vocês!', timestamp: yesterday + 'T10:00:00Z' },
  { id: 'a3_msg2', academyId: 'mock_acad_3', senderId: 'a3_instr_1', senderName: 'Prof. Diego Rocha Jr.', senderRole: 'instructor', content: 'Pessoal da competição: revisão de posições hoje às 20h. Obrigatória!', timestamp: yesterday + 'T17:00:00Z' },
  { id: 'a3_msg3', academyId: 'mock_acad_3', senderId: 'a3_instr_2', senderName: 'Prof. Leticia Vaz',     senderRole: 'instructor', content: 'Kids: novos tatames chegaram! Aula de sábado no salão principal.', timestamp: today + 'T07:30:00Z' },
  { id: 'a3_msg4', academyId: 'mock_acad_3', senderId: 'a3_admin_1', senderName: 'Admin Dragão',          senderRole: 'admin',      content: 'Parabéns Amanda Ferreira pelas 3 fitas na azul! OSS 🥋', timestamp: today + 'T13:00:00Z' },
];

export const MOCK_PRODUCTS_A3: Product[] = [
  { id: 'a3_prod1', academyId: 'mock_acad_3', name: 'Kimono Dragão A1',       price: 290, stock: 6,  category: 'Kimonos',    createdAt: lastMonth },
  { id: 'a3_prod2', academyId: 'mock_acad_3', name: 'Kimono Dragão Kids P1',  price: 230, stock: 4,  category: 'Kimonos',    createdAt: lastMonth },
  { id: 'a3_prod3', academyId: 'mock_acad_3', name: 'Moletom Dragão Fight',   price: 110, stock: 5,  category: 'Vestuário',  createdAt: lastMonth },
  { id: 'a3_prod4', academyId: 'mock_acad_3', name: 'Bandagem Elástica 5m',   price: 20,  stock: 15, category: 'Proteções',  createdAt: lastMonth },
  { id: 'a3_prod5', academyId: 'mock_acad_3', name: 'Squeeze Dragão 700ml',   price: 40,  stock: 0,  category: 'Acessórios', createdAt: lastMonth },
];

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT CONSOLIDADO
// ═══════════════════════════════════════════════════════════════════════════

export const MOCK_ACADEMIES: Academy[] = [MOCK_ACADEMY, MOCK_ACADEMY_2, MOCK_ACADEMY_3];
