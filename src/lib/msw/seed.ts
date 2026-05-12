import { Belt } from '@/types';
import type {
  Academy, Student, Instructor, Staff, User,
  ClassTemplate, ClassSession, AttendanceRecord,
  FinanceTransaction, CalendarEvent, ChatMessage, Product, RecycleBinItem,
} from '@/types';

const today        = new Date().toISOString().split('T')[0];
const yesterday    = new Date(Date.now() -  1 * 86400000).toISOString().split('T')[0];
const twoDaysAgo   = new Date(Date.now() -  2 * 86400000).toISOString().split('T')[0];
const threeDaysAgo = new Date(Date.now() -  3 * 86400000).toISOString().split('T')[0];
const oneWeekAgo   = new Date(Date.now() -  7 * 86400000).toISOString().split('T')[0];
const twoWeeksAgo  = new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0];
const lastMonth    = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
const twoMonthsAgo = new Date(Date.now() - 60 * 86400000).toISOString().split('T')[0];
const tomorrow     = new Date(Date.now() +  1 * 86400000).toISOString().split('T')[0];
const nextWeek     = new Date(Date.now() +  7 * 86400000).toISOString().split('T')[0];
const nextMonth    = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
const twoMonthsFwd = new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0];

const curYM  = today.slice(0, 7); // e.g. "2026-05"
const lastYM = lastMonth.slice(0, 7);
const prev2YM = twoMonthsAgo.slice(0, 7);

// ═══════════════════════════════════════════════════════════════════════════
// ACADEMIAS
// ═══════════════════════════════════════════════════════════════════════════

const ACAD_1 = 'mock_acad_1';
const ACAD_2 = 'mock_acad_2';
const ACAD_3 = 'mock_acad_3';

// ── Academia 1 — Academia NexFight (São Paulo) ────────────────────────────

const ACADEMY_1: Academy = {
  id: ACAD_1,
  name: 'Academia NexFight',
  alias: 'nexfight',
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
  bankName: 'Nubank',
  bankAgency: '0001',
  bankAccount: '123456-7',
  paymentWarningDays: 5,
  plans: [
    { id: 'ap1', name: 'Mensal Adulto',    durationMonths: 1, classesPerWeek: 3, price: 150, category: 'Adultos',  description: 'Acesso 3x/semana para adultos' },
    { id: 'ap2', name: 'Semestral Elite',  durationMonths: 6, classesPerWeek: 5, price: 800, category: 'Adultos',  description: 'Acesso ilimitado por 6 meses' },
    { id: 'ap3', name: 'Plano Kids',       durationMonths: 1, classesPerWeek: 2, price: 120, category: 'Crianças', description: 'Turmas infantis 2x/semana' },
  ],
  currentPlan: 'Gold',
  planStatus: 'Active',
  planExpirationDate: twoMonthsFwd,
};

// ── Academia 2 — Samurai BJJ (São Paulo) ─────────────────────────────────

const ACADEMY_2: Academy = {
  id: ACAD_2,
  name: 'Samurai BJJ',
  alias: 'samurai',
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
  bankName: 'Itaú',
  bankAgency: '0274',
  bankAccount: '987654-1',
  paymentWarningDays: 7,
  plans: [
    { id: 'a2p1', name: 'Mensal Individual',  durationMonths: 1, classesPerWeek: 3, price: 180, category: 'Adultos',   description: 'Treino 3x por semana' },
    { id: 'a2p2', name: 'Trimestral Família',  durationMonths: 3, classesPerWeek: 5, price: 450, category: 'Família',   description: 'Pacote familiar trimestral' },
    { id: 'a2p3', name: 'Plano Juvenil',       durationMonths: 1, classesPerWeek: 2, price: 130, category: 'Crianças',  description: 'Para crianças e adolescentes' },
  ],
  currentPlan: 'Silver',
  planStatus: 'Active',
  planExpirationDate: nextMonth,
};

// ── Academia 3 — Dragão Fight (Rio de Janeiro) ────────────────────────────

const ACADEMY_3: Academy = {
  id: ACAD_3,
  name: 'Dragão Fight',
  alias: 'dragao',
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
  bankName: 'Bradesco',
  bankAgency: '1234',
  bankAccount: '56789-0',
  paymentWarningDays: 3,
  plans: [
    { id: 'a3p1', name: 'Mensal Standard',   durationMonths: 1, classesPerWeek: 3, price: 160, category: 'Adultos',  description: 'Acesso padrão para adultos' },
    { id: 'a3p2', name: 'Plano Família',      durationMonths: 1, classesPerWeek: 5, price: 280, category: 'Família',  description: 'Até 3 membros da família' },
    { id: 'a3p3', name: 'Trimestral Elite',   durationMonths: 3, classesPerWeek: 5, price: 420, category: 'Adultos',  description: 'Acesso ilimitado trimestral' },
    { id: 'a3p4', name: 'Plano Kids',         durationMonths: 1, classesPerWeek: 2, price: 110, category: 'Crianças', description: 'Turma infantil 2x/semana' },
  ],
  currentPlan: 'Black Belt',
  planStatus: 'Active',
  planExpirationDate: twoMonthsFwd,
};

export const SEED_ACADEMY   = ACADEMY_1; // compatibilidade legada
export const SEED_ACADEMIES: Academy[] = [ACADEMY_1, ACADEMY_2, ACADEMY_3];

// ═══════════════════════════════════════════════════════════════════════════
// USUÁRIOS (contas de acesso)
// ═══════════════════════════════════════════════════════════════════════════

export const SEED_USERS: User[] = [
  // ── Academia 1 ──
  { id: 'mock_user_1',         academyId: ACAD_1, role: 'admin',      name: 'Admin NexFight',      email: 'admin@oss.com',         status: 'Active' },
  { id: 'mock_instr_1',        academyId: ACAD_1, role: 'instructor', name: 'Prof. Renato Silva',   email: 'instru@oss.com',        status: 'Active' },
  { id: 'mock_staff_1',        academyId: ACAD_1, role: 'staff',      name: 'Ana Secretaria',       email: 'colab@oss.com',         status: 'Active' },
  { id: 'mock_student_user_1', academyId: ACAD_1, role: 'student',    name: 'Carlos Oliveira',      email: 'aluno@oss.com',         status: 'Active' },
  // ── Academia 2 ──
  { id: 'a2_admin_1',          academyId: ACAD_2, role: 'admin',      name: 'Admin Samurai',        email: 'admin@samurai.com',     status: 'Active' },
  { id: 'a2_instr_1',          academyId: ACAD_2, role: 'instructor', name: 'Prof. Kenji Nakamura', email: 'kenji@samurai.com',     status: 'Active' },
  { id: 'a2_instr_2',          academyId: ACAD_2, role: 'instructor', name: 'Prof. Camila Sousa',   email: 'camila@samurai.com',    status: 'Active' },
  { id: 'a2_staff_1',          academyId: ACAD_2, role: 'staff',      name: 'Carlos Recepção',      email: 'sec@samurai.com',       status: 'Active' },
  { id: 'a2_student_user_1',   academyId: ACAD_2, role: 'student',    name: 'Rodrigo Tanaka',       email: 'aluno@samurai.com',     status: 'Active' },
  // ── Academia 3 ──
  { id: 'a3_admin_1',          academyId: ACAD_3, role: 'admin',      name: 'Admin Dragão',         email: 'admin@dragao.com',      status: 'Active' },
  { id: 'a3_instr_1',          academyId: ACAD_3, role: 'instructor', name: 'Prof. Diego Rocha',    email: 'diego@dragao.com',      status: 'Active' },
  { id: 'a3_instr_2',          academyId: ACAD_3, role: 'instructor', name: 'Prof. Leticia Vaz',    email: 'leticia@dragao.com',    status: 'Active' },
  { id: 'a3_staff_1',          academyId: ACAD_3, role: 'staff',      name: 'Bruno Atendimento',    email: 'atend@dragao.com',      status: 'Active' },
  { id: 'a3_student_user_1',   academyId: ACAD_3, role: 'student',    name: 'Amanda Ferreira',      email: 'aluno@dragao.com',      status: 'Active' },
  // ── Superuser global ──
  { id: 'mock_superuser_1',    academyId: 'global', role: 'superuser', name: 'Super User OSS',      email: 'super@oss.com',         status: 'Active' },
];

export const SEED_PASSWORDS: Record<string, string> = {
  // Academia 1
  'admin@oss.com':    'oss123',
  'instru@oss.com':   'oss123',
  'colab@oss.com':    'oss123',
  'aluno@oss.com':    'oss123',
  // Academia 2
  'admin@samurai.com':  'sam123',
  'kenji@samurai.com':  'sam123',
  'camila@samurai.com': 'sam123',
  'sec@samurai.com':    'sam123',
  'aluno@samurai.com':  'sam123',
  // Academia 3
  'admin@dragao.com':   'drg123',
  'diego@dragao.com':   'drg123',
  'leticia@dragao.com': 'drg123',
  'atend@dragao.com':   'drg123',
  'aluno@dragao.com':   'drg123',
  // Superuser
  'super@oss.com': 'super',
};

// ═══════════════════════════════════════════════════════════════════════════
// ALUNOS
// ═══════════════════════════════════════════════════════════════════════════

// ── Academia 1 — NexDojo ─────────────────────────────────────────────────

export const SEED_STUDENTS: Student[] = [
  {
    id: 's1', academyId: ACAD_1,
    name: 'Carlos Oliveira', email: 'aluno@oss.com', phone: '11988887777',
    belt: Belt.WHITE, stripes: 2, birthDate: '1995-04-12', gender: 'M',
    cpf: '123.456.789-00', rg: '12.345.678-9', weight: '82', height: '178', bloodType: 'O+',
    address: 'Rua das Acácias', addressNumber: '45', cep: '01310-200',
    emergencyContact: 'Maria Oliveira', emergencyPhone: '11988880001',
    totalClasses: 45, totalHours: 67.5, absentCount: 1, status: 'Active',
    joinDate: '2023-10-01', planId: 'ap1', nextPaymentDate: tomorrow,
    lastGraduationDate: '2024-01-10', lastAttendance: yesterday,
    graduationHistory: [
      { id: 'gh_s1_1', previousBelt: Belt.WHITE, newBelt: Belt.WHITE, previousStripes: 0, newStripes: 1, date: '2023-12-01', instructorId: 'i1', notes: '1ª fita' },
      { id: 'gh_s1_2', previousBelt: Belt.WHITE, newBelt: Belt.WHITE, previousStripes: 1, newStripes: 2, date: '2024-01-10', instructorId: 'i1', notes: '2ª fita — excelente dedicação' },
    ],
    photo: 'https://picsum.photos/seed/s1/400/400',
  },
  {
    id: 's2', academyId: ACAD_1,
    name: 'Juliana Santos', phone: '11977776666',
    belt: Belt.BLUE, stripes: 1, birthDate: '1998-08-22', gender: 'F',
    cpf: '234.567.890-11', rg: '23.456.789-0', weight: '60', height: '165', bloodType: 'A+',
    address: 'Av. Rebouças', addressNumber: '200', cep: '05401-300',
    emergencyContact: 'Paulo Santos', emergencyPhone: '11977770002',
    totalClasses: 120, totalHours: 180, absentCount: 4, status: 'Active',
    joinDate: '2022-05-15', planId: 'ap2', nextPaymentDate: nextWeek,
    lastGraduationDate: '2023-11-20', lastAttendance: twoDaysAgo,
    graduationHistory: [
      { id: 'gh_s2_1', previousBelt: Belt.WHITE, newBelt: Belt.WHITE, previousStripes: 0, newStripes: 2, date: '2022-10-10', instructorId: 'i1', notes: '2 fitas rápidas' },
      { id: 'gh_s2_2', previousBelt: Belt.WHITE, newBelt: Belt.WHITE, previousStripes: 2, newStripes: 4, date: '2023-03-05', instructorId: 'i1', notes: '4 fitas' },
      { id: 'gh_s2_3', previousBelt: Belt.WHITE, newBelt: Belt.BLUE,  previousStripes: 4, newStripes: 0, date: '2023-09-15', instructorId: 'i1', notes: 'Graduação para azul!' },
      { id: 'gh_s2_4', previousBelt: Belt.BLUE,  newBelt: Belt.BLUE,  previousStripes: 0, newStripes: 1, date: '2023-11-20', instructorId: 'i2', notes: '1ª fita na azul' },
    ],
    photo: 'https://picsum.photos/seed/s2/400/400',
  },
  {
    id: 's3', academyId: ACAD_1,
    name: 'Marcos Pereira', phone: '11966665555',
    belt: Belt.PURPLE, stripes: 3, birthDate: '1990-01-30', gender: 'M',
    cpf: '345.678.901-22', weight: '90', height: '182', bloodType: 'B+',
    address: 'Rua Haddock Lobo', addressNumber: '789', cep: '01414-001',
    emergencyContact: 'Cláudia Pereira', emergencyPhone: '11966660003',
    totalClasses: 350, totalHours: 525, absentCount: 0, status: 'Active',
    joinDate: '2020-02-10', planId: 'ap2', nextPaymentDate: twoMonthsFwd,
    lastGraduationDate: '2023-06-15', lastAttendance: today,
    graduationHistory: [
      { id: 'gh_s3_1', previousBelt: Belt.WHITE,  newBelt: Belt.BLUE,   previousStripes: 4, newStripes: 0, date: '2021-01-20', instructorId: 'i1', notes: 'Graduação para azul' },
      { id: 'gh_s3_2', previousBelt: Belt.BLUE,   newBelt: Belt.BLUE,   previousStripes: 0, newStripes: 4, date: '2022-05-10', instructorId: 'i1', notes: 'Azul 4 fitas' },
      { id: 'gh_s3_3', previousBelt: Belt.BLUE,   newBelt: Belt.PURPLE, previousStripes: 4, newStripes: 0, date: '2022-12-03', instructorId: 'i1', notes: 'Roxa! Campeão regional' },
      { id: 'gh_s3_4', previousBelt: Belt.PURPLE, newBelt: Belt.PURPLE, previousStripes: 0, newStripes: 3, date: '2023-06-15', instructorId: 'i1', notes: '3 fitas na roxa' },
    ],
    photo: 'https://picsum.photos/seed/s3/400/400',
  },
  {
    id: 's4', academyId: ACAD_1,
    name: 'Arthur Silva', guardianPhone: '11955554444',
    belt: Belt.GREY, stripes: 3, birthDate: '2016-05-10', gender: 'M',
    guardianName: 'Roberto Silva', guardianRelation: 'Pai', guardianCpf: '456.789.012-33',
    totalClasses: 30, totalHours: 30, absentCount: 0, status: 'Active',
    joinDate: '2023-12-01', planId: 'ap3', nextPaymentDate: nextWeek,
    lastGraduationDate: '2024-03-05', lastAttendance: oneWeekAgo,
    graduationHistory: [
      { id: 'gh_s4_1', previousBelt: Belt.WHITE, newBelt: Belt.GREY, previousStripes: 0, newStripes: 0, date: '2024-01-15', instructorId: 'i2', notes: 'Faixa cinza!' },
      { id: 'gh_s4_2', previousBelt: Belt.GREY,  newBelt: Belt.GREY, previousStripes: 0, newStripes: 3, date: '2024-03-05', instructorId: 'i2', notes: '3 fitas' },
    ],
    photo: 'https://picsum.photos/seed/s4/400/400',
  },
  {
    id: 's5', academyId: ACAD_1,
    name: 'Mariana Costa', guardianPhone: '11944443333',
    belt: Belt.YELLOW, stripes: 1, birthDate: '2014-02-20', gender: 'F',
    guardianName: 'Ana Costa', guardianRelation: 'Mãe', guardianEmail: 'ana.costa@email.com',
    totalClasses: 80, totalHours: 80, absentCount: 2, status: 'Active',
    joinDate: '2023-01-15', nextPaymentDate: nextMonth,
    lastGraduationDate: '2024-02-12', lastAttendance: threeDaysAgo,
    graduationHistory: [
      { id: 'gh_s5_1', previousBelt: Belt.WHITE,  newBelt: Belt.GREY,   previousStripes: 0, newStripes: 0, date: '2023-04-10', instructorId: 'i2', notes: 'Cinza' },
      { id: 'gh_s5_2', previousBelt: Belt.GREY,   newBelt: Belt.YELLOW, previousStripes: 4, newStripes: 0, date: '2023-10-20', instructorId: 'i2', notes: 'Amarela!' },
      { id: 'gh_s5_3', previousBelt: Belt.YELLOW, newBelt: Belt.YELLOW, previousStripes: 0, newStripes: 1, date: '2024-02-12', instructorId: 'i2', notes: '1ª fita' },
    ],
    photo: 'https://picsum.photos/seed/s5/400/400',
  },
  {
    id: 's6', academyId: ACAD_1,
    name: 'Ricardo Mendes', phone: '11933332222',
    belt: Belt.BROWN, stripes: 0, birthDate: '1988-11-05', gender: 'M',
    cpf: '567.890.123-44', weight: '88', height: '175', bloodType: 'AB-',
    address: 'Rua Oscar Freire', addressNumber: '321', cep: '01426-001',
    emergencyContact: 'Carla Mendes', emergencyPhone: '11933330004',
    totalClasses: 500, totalHours: 750, absentCount: 0, status: 'Active',
    joinDate: '2018-03-20', nextPaymentDate: twoMonthsFwd,
    lastGraduationDate: '2022-08-25', lastAttendance: today,
    graduationHistory: [
      { id: 'gh_s6_1', previousBelt: Belt.PURPLE, newBelt: Belt.BROWN, previousStripes: 4, newStripes: 0, date: '2022-08-25', instructorId: 'i1', notes: 'Marrom — campeão masters' },
    ],
    photo: 'https://picsum.photos/seed/s6/400/400',
  },
  {
    id: 's7', academyId: ACAD_1,
    name: 'Beatriz Lima', phone: '11922221111',
    belt: Belt.BLACK, stripes: 1, birthDate: '1985-07-14', gender: 'F',
    cpf: '678.901.234-55', weight: '58', height: '162', bloodType: 'A-',
    address: 'Al. Lorena', addressNumber: '100', cep: '01424-001',
    emergencyContact: 'Paulo Lima', emergencyPhone: '11922220005',
    totalClasses: 1200, totalHours: 1800, absentCount: 0, status: 'Active',
    joinDate: '2010-01-10', nextPaymentDate: nextMonth,
    lastGraduationDate: '2021-12-01', lastAttendance: yesterday,
    graduationHistory: [
      { id: 'gh_s7_1', previousBelt: Belt.BROWN, newBelt: Belt.BLACK, previousStripes: 4, newStripes: 0, date: '2019-11-15', instructorId: 'i1', notes: 'Faixa preta! 9 anos de dedicação' },
      { id: 'gh_s7_2', previousBelt: Belt.BLACK, newBelt: Belt.BLACK, previousStripes: 0, newStripes: 1, date: '2021-12-01', instructorId: 'i1', notes: '1º grau' },
    ],
    photo: 'https://picsum.photos/seed/s7/400/400',
  },
  {
    id: 's8', academyId: ACAD_1,
    name: 'Pedro Rocha', guardianPhone: '11911110000',
    belt: Belt.ORANGE, stripes: 4, birthDate: '2011-03-25', gender: 'M',
    guardianName: 'José Rocha', guardianRelation: 'Pai', guardianProfession: 'Engenheiro',
    totalClasses: 150, totalHours: 150, absentCount: 5, status: 'Active',
    joinDate: '2021-06-12', absenceLimit: 6, nextPaymentDate: tomorrow,
    lastGraduationDate: '2023-10-15', lastAttendance: oneWeekAgo,
    graduationHistory: [
      { id: 'gh_s8_1', previousBelt: Belt.GREY,   newBelt: Belt.YELLOW, previousStripes: 4, newStripes: 0, date: '2022-04-10', instructorId: 'i2', notes: 'Amarela' },
      { id: 'gh_s8_2', previousBelt: Belt.YELLOW, newBelt: Belt.ORANGE, previousStripes: 4, newStripes: 0, date: '2023-01-20', instructorId: 'i2', notes: 'Laranja!' },
      { id: 'gh_s8_3', previousBelt: Belt.ORANGE, newBelt: Belt.ORANGE, previousStripes: 0, newStripes: 4, date: '2023-10-15', instructorId: 'i2', notes: '4 fitas' },
    ],
    photo: 'https://picsum.photos/seed/s8/400/400',
  },
  {
    id: 's9', academyId: ACAD_1,
    name: 'Sofia Amaral', guardianPhone: '11900009999',
    belt: Belt.GREEN, stripes: 2, birthDate: '2009-09-02', gender: 'F',
    guardianName: 'Marta Amaral', guardianRelation: 'Mãe', guardianEmail: 'marta@email.com',
    totalClasses: 210, totalHours: 210, absentCount: 1, status: 'Active',
    joinDate: '2020-11-05', nextPaymentDate: nextWeek,
    lastGraduationDate: '2023-12-20', lastAttendance: twoDaysAgo,
    graduationHistory: [
      { id: 'gh_s9_1', previousBelt: Belt.ORANGE, newBelt: Belt.GREEN, previousStripes: 4, newStripes: 0, date: '2023-06-10', instructorId: 'i2', notes: 'Verde!' },
      { id: 'gh_s9_2', previousBelt: Belt.GREEN,  newBelt: Belt.GREEN, previousStripes: 0, newStripes: 2, date: '2023-12-20', instructorId: 'i2', notes: '2 fitas' },
    ],
    photo: 'https://picsum.photos/seed/s9/400/400',
  },
  {
    id: 's10', academyId: ACAD_1,
    name: 'Lucas Ferreira', phone: '11987654321',
    belt: Belt.WHITE, stripes: 0, birthDate: '2000-01-15', gender: 'M',
    address: 'Rua Consolação', addressNumber: '99', cep: '01301-000',
    totalClasses: 5, totalHours: 7.5, absentCount: 0, status: 'Active',
    joinDate: '2024-02-01', nextPaymentDate: nextWeek,
    photo: 'https://picsum.photos/seed/s10/400/400',
  },
  // Aluno inativo
  {
    id: 's11', academyId: ACAD_1,
    name: 'Fernanda Gomes', phone: '11976543210',
    belt: Belt.BLUE, stripes: 2, birthDate: '1993-06-18', gender: 'F',
    cpf: '789.012.345-66', totalClasses: 95, totalHours: 142.5, absentCount: 12,
    status: 'Inactive', joinDate: '2021-08-01',
    lastGraduationDate: '2023-02-14', lastAttendance: twoMonthsAgo,
    photo: 'https://picsum.photos/seed/s11/400/400',
  },
  // Aluno pendente (aguardando confirmação)
  {
    id: 's12', academyId: ACAD_1,
    name: 'Rafael Nascimento', phone: '11965432109',
    belt: Belt.WHITE, stripes: 0, birthDate: '2002-11-03', gender: 'M',
    totalClasses: 0, totalHours: 0, absentCount: 0,
    status: 'Pending', joinDate: today,
    photo: 'https://picsum.photos/seed/s12/400/400',
  },

  // ── Academia 2 — Samurai BJJ ─────────────────────────────────────────────

  {
    id: 'a2_s1', academyId: ACAD_2,
    name: 'Rodrigo Tanaka', email: 'aluno@samurai.com', phone: '11877776666',
    belt: Belt.WHITE, stripes: 3, birthDate: '1996-07-22', gender: 'M',
    cpf: '111.222.333-44', weight: '85', height: '180', bloodType: 'O+',
    address: 'Rua Liberdade', addressNumber: '310', cep: '01503-000',
    emergencyContact: 'Keiko Tanaka', emergencyPhone: '11877770001',
    totalClasses: 38, totalHours: 57, absentCount: 1, status: 'Active',
    joinDate: '2024-01-10', planId: 'a2p1', nextPaymentDate: tomorrow,
    lastGraduationDate: oneWeekAgo, lastAttendance: yesterday,
    graduationHistory: [
      { id: 'gh_a2s1_1', previousBelt: Belt.WHITE, newBelt: Belt.WHITE, previousStripes: 0, newStripes: 3, date: oneWeekAgo, instructorId: 'a2_i1', notes: '3 fitas — ótima evolução' },
    ],
    photo: 'https://picsum.photos/seed/a2s1/400/400',
  },
  {
    id: 'a2_s2', academyId: ACAD_2,
    name: 'Fernanda Kobayashi', phone: '11866665555',
    belt: Belt.BLUE, stripes: 2, birthDate: '1999-03-14', gender: 'F',
    cpf: '222.333.444-55', weight: '55', height: '160', bloodType: 'A+',
    address: 'Av. São João', addressNumber: '450', cep: '01035-000',
    emergencyContact: 'Hiroshi Kobayashi', emergencyPhone: '11866660002',
    totalClasses: 145, totalHours: 217.5, absentCount: 3, status: 'Active',
    joinDate: '2022-09-20', planId: 'a2p1', nextPaymentDate: nextWeek,
    lastGraduationDate: '2024-02-20', lastAttendance: today,
    graduationHistory: [
      { id: 'gh_a2s2_1', previousBelt: Belt.WHITE, newBelt: Belt.BLUE,  previousStripes: 4, newStripes: 0, date: '2023-10-05', instructorId: 'a2_i1', notes: 'Graduação azul!' },
      { id: 'gh_a2s2_2', previousBelt: Belt.BLUE,  newBelt: Belt.BLUE,  previousStripes: 0, newStripes: 2, date: '2024-02-20', instructorId: 'a2_i1', notes: '2 fitas' },
    ],
    photo: 'https://picsum.photos/seed/a2s2/400/400',
  },
  {
    id: 'a2_s3', academyId: ACAD_2,
    name: 'Thiago Nakamura', phone: '11855554444',
    belt: Belt.PURPLE, stripes: 1, birthDate: '1991-11-08', gender: 'M',
    cpf: '333.444.555-66', weight: '78', height: '172', bloodType: 'B-',
    address: 'Rua 25 de Março', addressNumber: '88', cep: '01021-100',
    totalClasses: 280, totalHours: 420, absentCount: 0, status: 'Active',
    joinDate: '2020-06-15', planId: 'a2p2', nextPaymentDate: nextMonth,
    lastGraduationDate: '2023-08-10', lastAttendance: today,
    graduationHistory: [
      { id: 'gh_a2s3_1', previousBelt: Belt.BLUE,   newBelt: Belt.PURPLE, previousStripes: 4, newStripes: 0, date: '2023-01-15', instructorId: 'a2_i1', notes: 'Roxa!' },
      { id: 'gh_a2s3_2', previousBelt: Belt.PURPLE, newBelt: Belt.PURPLE, previousStripes: 0, newStripes: 1, date: '2023-08-10', instructorId: 'a2_i1', notes: '1ª fita' },
    ],
    photo: 'https://picsum.photos/seed/a2s3/400/400',
  },
  {
    id: 'a2_s4', academyId: ACAD_2,
    name: 'Isabela Morita', guardianPhone: '11844443333',
    belt: Belt.GREY, stripes: 2, birthDate: '2017-01-30', gender: 'F',
    guardianName: 'Yuki Morita', guardianRelation: 'Mãe', guardianEmail: 'yuki@email.com',
    totalClasses: 50, totalHours: 50, absentCount: 0, status: 'Active',
    joinDate: '2024-03-01', planId: 'a2p3', nextPaymentDate: nextWeek,
    lastGraduationDate: twoWeeksAgo, lastAttendance: yesterday,
    graduationHistory: [
      { id: 'gh_a2s4_1', previousBelt: Belt.WHITE, newBelt: Belt.GREY, previousStripes: 0, newStripes: 0, date: twoMonthsAgo, instructorId: 'a2_i2', notes: 'Cinza!' },
      { id: 'gh_a2s4_2', previousBelt: Belt.GREY,  newBelt: Belt.GREY, previousStripes: 0, newStripes: 2, date: twoWeeksAgo,  instructorId: 'a2_i2', notes: '2 fitas' },
    ],
    photo: 'https://picsum.photos/seed/a2s4/400/400',
  },
  {
    id: 'a2_s5', academyId: ACAD_2,
    name: 'Eduardo Yamamoto', guardianPhone: '11833332222',
    belt: Belt.ORANGE, stripes: 0, birthDate: '2012-08-15', gender: 'M',
    guardianName: 'Hiroshi Yamamoto', guardianRelation: 'Pai',
    totalClasses: 110, totalHours: 110, absentCount: 2, status: 'Active',
    joinDate: '2022-04-10', planId: 'a2p3', nextPaymentDate: nextMonth,
    lastGraduationDate: '2024-01-08', lastAttendance: threeDaysAgo,
    graduationHistory: [
      { id: 'gh_a2s5_1', previousBelt: Belt.YELLOW, newBelt: Belt.ORANGE, previousStripes: 4, newStripes: 0, date: '2024-01-08', instructorId: 'a2_i2', notes: 'Laranja!' },
    ],
    photo: 'https://picsum.photos/seed/a2s5/400/400',
  },
  {
    id: 'a2_s6', academyId: ACAD_2,
    name: 'Camila Tanaka', phone: '11822221111',
    belt: Belt.BROWN, stripes: 2, birthDate: '1987-05-22', gender: 'F',
    cpf: '444.555.666-77', weight: '62', height: '163', bloodType: 'A-',
    address: 'Rua Vergueiro', addressNumber: '1500', cep: '01504-001',
    totalClasses: 480, totalHours: 720, absentCount: 0, status: 'Active',
    joinDate: '2017-02-01', planId: 'a2p2', nextPaymentDate: twoMonthsFwd,
    lastGraduationDate: '2023-05-20', lastAttendance: today,
    photo: 'https://picsum.photos/seed/a2s6/400/400',
  },
  {
    id: 'a2_s7', academyId: ACAD_2,
    name: 'André Lima', phone: '11811110000',
    belt: Belt.BLACK, stripes: 0, birthDate: '1982-09-30', gender: 'M',
    cpf: '555.666.777-88', weight: '92', height: '184', bloodType: 'O-',
    address: 'Rua Frei Caneca', addressNumber: '233', cep: '01307-001',
    totalClasses: 980, totalHours: 1470, absentCount: 0, status: 'Active',
    joinDate: '2008-05-10', planId: 'a2p2', nextPaymentDate: nextMonth,
    lastGraduationDate: '2020-07-12', lastAttendance: yesterday,
    photo: 'https://picsum.photos/seed/a2s7/400/400',
  },
  {
    id: 'a2_s8', academyId: ACAD_2,
    name: 'Marina Souza', guardianPhone: '11800009999',
    belt: Belt.YELLOW, stripes: 3, birthDate: '2013-04-05', gender: 'F',
    guardianName: 'Claudia Souza', guardianRelation: 'Mãe',
    totalClasses: 72, totalHours: 72, absentCount: 1, status: 'Active',
    joinDate: '2023-02-20', planId: 'a2p3', nextPaymentDate: nextWeek,
    lastGraduationDate: twoWeeksAgo, lastAttendance: twoDaysAgo,
    photo: 'https://picsum.photos/seed/a2s8/400/400',
  },
  // Aluno inativo (excesso de faltas)
  {
    id: 'a2_s9', academyId: ACAD_2,
    name: 'Gabriel Oliveira', phone: '11799998888',
    belt: Belt.WHITE, stripes: 1, birthDate: '2001-12-10', gender: 'M',
    totalClasses: 12, totalHours: 18, absentCount: 8,
    status: 'Inactive', joinDate: '2024-05-01',
    lastAttendance: twoMonthsAgo,
    photo: 'https://picsum.photos/seed/a2s9/400/400',
  },
  // Aluno pendente
  {
    id: 'a2_s10', academyId: ACAD_2,
    name: 'Vanessa Rodrigues', phone: '11788887777',
    belt: Belt.WHITE, stripes: 0, birthDate: '1997-08-28', gender: 'F',
    totalClasses: 0, totalHours: 0, absentCount: 0,
    status: 'Pending', joinDate: today,
    photo: 'https://picsum.photos/seed/a2s10/400/400',
  },

  // ── Academia 3 — Dragão Fight ────────────────────────────────────────────

  {
    id: 'a3_s1', academyId: ACAD_3,
    name: 'Diego Rocha', phone: '21988887777',
    belt: Belt.WHITE, stripes: 1, birthDate: '1997-02-14', gender: 'M',
    cpf: '600.700.800-99', weight: '80', height: '177', bloodType: 'B+',
    address: 'Rua Bambina', addressNumber: '12', cep: '22251-050',
    emergencyContact: 'Sandra Rocha', emergencyPhone: '21988880001',
    totalClasses: 22, totalHours: 33, absentCount: 0, status: 'Active',
    joinDate: '2024-02-01', planId: 'a3p1', nextPaymentDate: tomorrow,
    lastGraduationDate: twoWeeksAgo, lastAttendance: yesterday,
    photo: 'https://picsum.photos/seed/a3s1/400/400',
  },
  {
    id: 'a3_s2', academyId: ACAD_3,
    name: 'Amanda Ferreira', email: 'aluno@dragao.com', phone: '21977776666',
    belt: Belt.BLUE, stripes: 3, birthDate: '2000-06-20', gender: 'F',
    cpf: '700.800.900-11', weight: '57', height: '164', bloodType: 'A+',
    address: 'Rua Voluntários da Pátria', addressNumber: '350', cep: '22270-000',
    emergencyContact: 'Marco Ferreira', emergencyPhone: '21977770002',
    totalClasses: 195, totalHours: 292.5, absentCount: 2, status: 'Active',
    joinDate: '2022-11-10', planId: 'a3p3', nextPaymentDate: nextWeek,
    lastGraduationDate: '2024-03-15', lastAttendance: today,
    graduationHistory: [
      { id: 'gh_a3s2_1', previousBelt: Belt.WHITE, newBelt: Belt.BLUE,  previousStripes: 4, newStripes: 0, date: '2023-08-20', instructorId: 'a3_i1', notes: 'Azul!' },
      { id: 'gh_a3s2_2', previousBelt: Belt.BLUE,  newBelt: Belt.BLUE,  previousStripes: 0, newStripes: 3, date: '2024-03-15', instructorId: 'a3_i1', notes: '3 fitas — Parabéns!' },
    ],
    photo: 'https://picsum.photos/seed/a3s2/400/400',
  },
  {
    id: 'a3_s3', academyId: ACAD_3,
    name: 'Felipe Castro', phone: '21966665555',
    belt: Belt.PURPLE, stripes: 2, birthDate: '1989-09-17', gender: 'M',
    cpf: '800.900.011-22', weight: '86', height: '179', bloodType: 'O+',
    address: 'Rua Dias da Cruz', addressNumber: '77', cep: '20720-120',
    totalClasses: 320, totalHours: 480, absentCount: 1, status: 'Active',
    joinDate: '2020-03-15', planId: 'a3p3', nextPaymentDate: nextMonth,
    lastGraduationDate: '2023-09-05', lastAttendance: today,
    photo: 'https://picsum.photos/seed/a3s3/400/400',
  },
  {
    id: 'a3_s4', academyId: ACAD_3,
    name: 'Larissa Pinto', guardianPhone: '21955554444',
    belt: Belt.GREY, stripes: 4, birthDate: '2015-12-03', gender: 'F',
    guardianName: 'Roberta Pinto', guardianRelation: 'Mãe',
    totalClasses: 65, totalHours: 65, absentCount: 1, status: 'Active',
    joinDate: '2023-08-10', planId: 'a3p4', nextPaymentDate: nextWeek,
    lastGraduationDate: lastMonth, lastAttendance: yesterday,
    photo: 'https://picsum.photos/seed/a3s4/400/400',
  },
  {
    id: 'a3_s5', academyId: ACAD_3,
    name: 'Gabriel Melo', guardianPhone: '21944443333',
    belt: Belt.YELLOW, stripes: 2, birthDate: '2013-07-11', gender: 'M',
    guardianName: 'Paulo Melo', guardianRelation: 'Pai',
    totalClasses: 88, totalHours: 88, absentCount: 3, status: 'Active',
    joinDate: '2022-12-01', planId: 'a3p4', nextPaymentDate: nextMonth,
    lastGraduationDate: '2024-01-25', lastAttendance: twoDaysAgo,
    photo: 'https://picsum.photos/seed/a3s5/400/400',
  },
  {
    id: 'a3_s6', academyId: ACAD_3,
    name: 'Juliana Ramos', phone: '21933332222',
    belt: Belt.BROWN, stripes: 1, birthDate: '1986-04-30', gender: 'F',
    cpf: '900.011.122-33', weight: '64', height: '166', bloodType: 'AB+',
    address: 'Rua Marquês de Abrantes', addressNumber: '55', cep: '22230-060',
    totalClasses: 460, totalHours: 690, absentCount: 0, status: 'Active',
    joinDate: '2016-07-01', planId: 'a3p2', nextPaymentDate: twoMonthsFwd,
    lastGraduationDate: '2023-03-10', lastAttendance: today,
    photo: 'https://picsum.photos/seed/a3s6/400/400',
  },
  {
    id: 'a3_s7', academyId: ACAD_3,
    name: 'Pedro Monteiro', phone: '21922221111',
    belt: Belt.BLACK, stripes: 2, birthDate: '1984-01-20', gender: 'M',
    cpf: '011.122.233-44', weight: '94', height: '186', bloodType: 'O-',
    address: 'Av. Ataulfo de Paiva', addressNumber: '620', cep: '22440-033',
    totalClasses: 1100, totalHours: 1650, absentCount: 0, status: 'Active',
    joinDate: '2007-09-15', planId: 'a3p3', nextPaymentDate: nextMonth,
    lastGraduationDate: '2022-11-20', lastAttendance: today,
    photo: 'https://picsum.photos/seed/a3s7/400/400',
  },
  {
    id: 'a3_s8', academyId: ACAD_3,
    name: 'Gustavo Santos', guardianPhone: '21911110000',
    belt: Belt.ORANGE, stripes: 3, birthDate: '2010-05-18', gender: 'M',
    guardianName: 'Cláudia Santos', guardianRelation: 'Mãe',
    totalClasses: 140, totalHours: 140, absentCount: 4, status: 'Active',
    joinDate: '2021-09-20', planId: 'a3p4', absenceLimit: 6,
    nextPaymentDate: tomorrow, lastGraduationDate: '2023-11-30', lastAttendance: oneWeekAgo,
    photo: 'https://picsum.photos/seed/a3s8/400/400',
  },
  {
    id: 'a3_s9', academyId: ACAD_3,
    name: 'Natália Costa', guardianPhone: '21900009999',
    belt: Belt.GREEN, stripes: 0, birthDate: '2008-10-22', gender: 'F',
    guardianName: 'Fernanda Costa', guardianRelation: 'Mãe',
    totalClasses: 190, totalHours: 190, absentCount: 2, status: 'Active',
    joinDate: '2020-07-15', planId: 'a3p4', nextPaymentDate: nextWeek,
    lastGraduationDate: '2024-04-05', lastAttendance: threeDaysAgo,
    photo: 'https://picsum.photos/seed/a3s9/400/400',
  },
  // Aluno inativo
  {
    id: 'a3_s10', academyId: ACAD_3,
    name: 'Rafael Alves', phone: '21889998888',
    belt: Belt.WHITE, stripes: 2, birthDate: '1995-03-08', gender: 'M',
    totalClasses: 30, totalHours: 45, absentCount: 10,
    status: 'Inactive', joinDate: '2023-06-01',
    lastAttendance: twoMonthsAgo,
    photo: 'https://picsum.photos/seed/a3s10/400/400',
  },
  // Aluno dropped
  {
    id: 'a3_s11', academyId: ACAD_3,
    name: 'Marcela Dias', phone: '21878887777',
    belt: Belt.BLUE, stripes: 0, birthDate: '1994-11-15', gender: 'F',
    totalClasses: 60, totalHours: 90, absentCount: 15,
    status: 'Dropped', joinDate: '2023-01-10',
    lastAttendance: twoMonthsAgo,
    photo: 'https://picsum.photos/seed/a3s11/400/400',
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// INSTRUTORES
// ═══════════════════════════════════════════════════════════════════════════

export const SEED_INSTRUCTORS: Instructor[] = [
  // ── Academia 1 ──
  {
    id: 'i1', academyId: ACAD_1,
    name: 'Prof. Renato Silva', email: 'instru@oss.com', phone: '11999998888',
    belt: Belt.BLACK, stripes: 2, birthDate: '1980-05-15', gender: 'M',
    maritalStatus: 'Casado', cpf: '100.200.300-40', rg: '10.203.040-5',
    address: 'Rua Bela Cintra', addressNumber: '200', cep: '01415-001',
    specialties: 'No-Gi, Competição, Adultos',
    status: 'Active', joinDate: '2010-01-01',
    lastGraduationDate: '2020-03-10',
    graduationHistory: [
      { id: 'gh_i1_1', previousBelt: Belt.BROWN, newBelt: Belt.BLACK, previousStripes: 4, newStripes: 0, date: '2015-06-20', instructorId: 'i1', notes: 'Faixa preta' },
      { id: 'gh_i1_2', previousBelt: Belt.BLACK, newBelt: Belt.BLACK, previousStripes: 0, newStripes: 2, date: '2020-03-10', notes: '2º grau' },
    ],
    photo: 'https://picsum.photos/seed/i1/400/400',
  },
  {
    id: 'i2', academyId: ACAD_1,
    name: 'Prof. Ana Carolina', email: 'ana@oss.com', phone: '11988887777',
    belt: Belt.PURPLE, stripes: 4, birthDate: '1992-03-22', gender: 'F',
    maritalStatus: 'Solteiro', cpf: '200.300.400-50',
    address: 'Rua Augusta', addressNumber: '500', cep: '01305-000',
    specialties: 'Kids, Iniciantes, Feminino',
    status: 'Active', joinDate: '2015-06-01',
    lastGraduationDate: '2023-08-15',
    photo: 'https://picsum.photos/seed/i2/400/400',
  },

  // ── Academia 2 — Samurai BJJ ─────────────────────────────────────────────
  {
    id: 'a2_i1', academyId: ACAD_2,
    name: 'Prof. Kenji Nakamura', email: 'kenji@samurai.com', phone: '11877778888',
    belt: Belt.BLACK, stripes: 3, birthDate: '1978-11-10', gender: 'M',
    maritalStatus: 'Casado', cpf: '300.400.500-60',
    address: 'Rua da Liberdade', addressNumber: '100', cep: '01503-001',
    specialties: 'Competição, No-Gi, Adultos, Defesa Pessoal',
    status: 'Active', joinDate: '2008-01-15',
    lastGraduationDate: '2021-09-25',
    graduationHistory: [
      { id: 'gh_a2i1_1', previousBelt: Belt.BROWN, newBelt: Belt.BLACK, previousStripes: 4, newStripes: 0, date: '2014-04-10', notes: 'Preta' },
      { id: 'gh_a2i1_2', previousBelt: Belt.BLACK, newBelt: Belt.BLACK, previousStripes: 0, newStripes: 3, date: '2021-09-25', notes: '3º grau' },
    ],
    photo: 'https://picsum.photos/seed/a2i1/400/400',
  },
  {
    id: 'a2_i2', academyId: ACAD_2,
    name: 'Prof. Camila Sousa', email: 'camila@samurai.com', phone: '11866667777',
    belt: Belt.PURPLE, stripes: 2, birthDate: '1994-07-08', gender: 'F',
    maritalStatus: 'Solteiro', cpf: '400.500.600-70',
    address: 'Av. Liberdade', addressNumber: '300', cep: '01502-000',
    specialties: 'Kids, Juvenil, Feminino, Iniciantes',
    status: 'Active', joinDate: '2018-03-01',
    lastGraduationDate: '2024-01-10',
    photo: 'https://picsum.photos/seed/a2i2/400/400',
  },

  // ── Academia 3 — Dragão Fight ────────────────────────────────────────────
  {
    id: 'a3_i1', academyId: ACAD_3,
    name: 'Prof. Diego Rocha Jr.', email: 'diego@dragao.com', phone: '21977778888',
    belt: Belt.BLACK, stripes: 4, birthDate: '1976-08-25', gender: 'M',
    maritalStatus: 'Casado', cpf: '500.600.700-80',
    address: 'Rua Senador Vergueiro', addressNumber: '40', cep: '22230-000',
    specialties: 'Adultos, Competição, No-Gi, Grapppling',
    status: 'Active', joinDate: '2005-04-01',
    lastGraduationDate: '2023-06-30',
    graduationHistory: [
      { id: 'gh_a3i1_1', previousBelt: Belt.BROWN, newBelt: Belt.BLACK, previousStripes: 4, newStripes: 0, date: '2012-03-15', notes: 'Preta' },
      { id: 'gh_a3i1_2', previousBelt: Belt.BLACK, newBelt: Belt.BLACK, previousStripes: 0, newStripes: 4, date: '2023-06-30', notes: '4º grau' },
    ],
    photo: 'https://picsum.photos/seed/a3i1/400/400',
  },
  {
    id: 'a3_i2', academyId: ACAD_3,
    name: 'Prof. Leticia Vaz', email: 'leticia@dragao.com', phone: '21966667777',
    belt: Belt.BROWN, stripes: 3, birthDate: '1990-02-16', gender: 'F',
    maritalStatus: 'Casado', cpf: '600.700.800-90',
    address: 'Rua Dias Ferreira', addressNumber: '190', cep: '22431-050',
    specialties: 'Kids, Feminino, Iniciantes',
    status: 'Active', joinDate: '2014-08-01',
    lastGraduationDate: '2024-02-28',
    photo: 'https://picsum.photos/seed/a3i2/400/400',
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// STAFF
// ═══════════════════════════════════════════════════════════════════════════

export const SEED_STAFF: Staff[] = [
  // ── Academia 1 ──
  {
    id: 'st1', academyId: ACAD_1,
    name: 'Ana Secretaria', email: 'colab@oss.com', phone: '11977776666',
    birthDate: '1995-07-10', gender: 'F', status: 'Active',
    joinDate: '2022-01-15', position: 'Secretária',
    address: 'Rua da Consolação', addressNumber: '300', cep: '01302-000',
    photo: 'https://picsum.photos/seed/st1/400/400',
  },
  {
    id: 'st2', academyId: ACAD_1,
    name: 'Bruno Limpeza', email: 'bruno@oss.com', phone: '11966665555',
    birthDate: '1988-12-05', gender: 'M', status: 'Active',
    joinDate: '2023-03-01', position: 'Auxiliar de Serviços',
    photo: 'https://picsum.photos/seed/st2/400/400',
  },
  // ── Academia 2 ──
  {
    id: 'a2_st1', academyId: ACAD_2,
    name: 'Carlos Recepção', email: 'sec@samurai.com', phone: '11855556666',
    birthDate: '1991-04-18', gender: 'M', status: 'Active',
    joinDate: '2021-11-01', position: 'Recepcionista',
    address: 'Rua da Mooca', addressNumber: '512', cep: '03104-000',
    photo: 'https://picsum.photos/seed/a2st1/400/400',
  },
  // ── Academia 3 ──
  {
    id: 'a3_st1', academyId: ACAD_3,
    name: 'Bruno Atendimento', email: 'atend@dragao.com', phone: '21955556666',
    birthDate: '1993-09-27', gender: 'M', status: 'Active',
    joinDate: '2022-05-10', position: 'Atendente',
    address: 'Rua Catete', addressNumber: '88', cep: '22220-000',
    photo: 'https://picsum.photos/seed/a3st1/400/400',
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// MODELOS DE TURMA (TEMPLATES)
// ═══════════════════════════════════════════════════════════════════════════

export const SEED_TEMPLATES: ClassTemplate[] = [
  // ── Academia 1 ──
  { id: 't1', academyId: ACAD_1, name: 'Kids 5-9 anos',    durationMinutes: 60,  assignedStudentIds: ['s4','s5'],       absenceLimit: 6, schedules: [{ dayOfWeek: 1, startTime: '18:00', endTime: '19:00' }, { dayOfWeek: 3, startTime: '18:00', endTime: '19:00' }] },
  { id: 't2', academyId: ACAD_1, name: 'Kids 10-15 anos',  durationMinutes: 60,  assignedStudentIds: ['s8','s9'],       absenceLimit: 5, schedules: [{ dayOfWeek: 2, startTime: '18:00', endTime: '19:00' }, { dayOfWeek: 4, startTime: '18:00', endTime: '19:00' }] },
  { id: 't3', academyId: ACAD_1, name: 'Adulto Iniciante', durationMinutes: 90,  assignedStudentIds: ['s1','s10','s2'], schedules: [{ dayOfWeek: 1, startTime: '19:30', endTime: '21:00' }, { dayOfWeek: 3, startTime: '19:30', endTime: '21:00' }, { dayOfWeek: 5, startTime: '19:00', endTime: '20:30' }] },
  { id: 't4', academyId: ACAD_1, name: 'Adulto Avançado',  durationMinutes: 120, assignedStudentIds: ['s3','s6','s7'],  schedules: [{ dayOfWeek: 2, startTime: '19:30', endTime: '21:30' }, { dayOfWeek: 4, startTime: '19:30', endTime: '21:30' }, { dayOfWeek: 6, startTime: '10:00', endTime: '12:00' }] },

  // ── Academia 2 ──
  { id: 'a2_t1', academyId: ACAD_2, name: 'Infantil A (5-12 anos)', durationMinutes: 60,  assignedStudentIds: ['a2_s4','a2_s5','a2_s8'], absenceLimit: 5, schedules: [{ dayOfWeek: 1, startTime: '17:30', endTime: '18:30' }, { dayOfWeek: 3, startTime: '17:30', endTime: '18:30' }] },
  { id: 'a2_t2', academyId: ACAD_2, name: 'Infantil B (13-17 anos)',durationMinutes: 75,  assignedStudentIds: [],                        schedules: [{ dayOfWeek: 2, startTime: '17:00', endTime: '18:15' }, { dayOfWeek: 4, startTime: '17:00', endTime: '18:15' }] },
  { id: 'a2_t3', academyId: ACAD_2, name: 'Adulto Básico',          durationMinutes: 90,  assignedStudentIds: ['a2_s1','a2_s2'],         schedules: [{ dayOfWeek: 1, startTime: '20:00', endTime: '21:30' }, { dayOfWeek: 3, startTime: '20:00', endTime: '21:30' }, { dayOfWeek: 5, startTime: '19:30', endTime: '21:00' }] },
  { id: 'a2_t4', academyId: ACAD_2, name: 'Competição',             durationMinutes: 120, assignedStudentIds: ['a2_s3','a2_s6','a2_s7'], schedules: [{ dayOfWeek: 2, startTime: '19:00', endTime: '21:00' }, { dayOfWeek: 4, startTime: '19:00', endTime: '21:00' }, { dayOfWeek: 6, startTime: '09:00', endTime: '11:00' }] },

  // ── Academia 3 ──
  { id: 'a3_t1', academyId: ACAD_3, name: 'Kids Dragon (6-11 anos)', durationMinutes: 60,  assignedStudentIds: ['a3_s4','a3_s5','a3_s8'], absenceLimit: 6, schedules: [{ dayOfWeek: 1, startTime: '17:00', endTime: '18:00' }, { dayOfWeek: 3, startTime: '17:00', endTime: '18:00' }] },
  { id: 'a3_t2', academyId: ACAD_3, name: 'Juvenil Dragon (12-17)',  durationMinutes: 75,  assignedStudentIds: ['a3_s9'],                 schedules: [{ dayOfWeek: 2, startTime: '17:30', endTime: '18:45' }, { dayOfWeek: 5, startTime: '17:30', endTime: '18:45' }] },
  { id: 'a3_t3', academyId: ACAD_3, name: 'Adulto Dragon',           durationMinutes: 90,  assignedStudentIds: ['a3_s1','a3_s2','a3_s3'], schedules: [{ dayOfWeek: 1, startTime: '20:00', endTime: '21:30' }, { dayOfWeek: 3, startTime: '20:00', endTime: '21:30' }, { dayOfWeek: 5, startTime: '20:00', endTime: '21:30' }] },
  { id: 'a3_t4', academyId: ACAD_3, name: 'Elite / Competição',      durationMinutes: 120, assignedStudentIds: ['a3_s6','a3_s7'],         schedules: [{ dayOfWeek: 2, startTime: '19:00', endTime: '21:00' }, { dayOfWeek: 4, startTime: '19:00', endTime: '21:00' }, { dayOfWeek: 6, startTime: '08:00', endTime: '10:00' }] },
];

// ═══════════════════════════════════════════════════════════════════════════
// SESSÕES DE AULA
// ═══════════════════════════════════════════════════════════════════════════

export const SEED_SESSIONS: ClassSession[] = [
  // ── Academia 1 ──
  { id: 'class_active_1',  academyId: ACAD_1, name: 'Adulto Iniciante (Noite)',   templateId: 't3', date: `${today}T19:30:00Z`,       durationMinutes: 90,  instructorId: 'i1', attendanceIds: ['s1','s2'], status: 'In Progress' },
  { id: 'class_past_1',    academyId: ACAD_1, name: 'Kids 5-9 anos (Seg/Qua)',    templateId: 't1', date: `${yesterday}T18:00:00Z`,   durationMinutes: 60,  instructorId: 'i2', attendanceIds: ['s4','s5'], status: 'Finalized' },
  { id: 'class_past_2',    academyId: ACAD_1, name: 'Adulto Avançado',            templateId: 't4', date: `${twoDaysAgo}T19:30:00Z`,  durationMinutes: 120, instructorId: 'i1', attendanceIds: ['s3','s6','s7'], status: 'Finalized' },
  { id: 'class_past_3',    academyId: ACAD_1, name: 'Kids 10-15 anos',            templateId: 't2', date: `${threeDaysAgo}T18:00:00Z`,durationMinutes: 60,  instructorId: 'i2', attendanceIds: ['s8','s9'], status: 'Finalized' },
  { id: 'class_past_4',    academyId: ACAD_1, name: 'Adulto Iniciante (Noite)',   templateId: 't3', date: `${oneWeekAgo}T19:30:00Z`,  durationMinutes: 90,  instructorId: 'i1', attendanceIds: ['s1','s2','s10'], status: 'Finalized' },

  // ── Academia 2 ──
  { id: 'a2_class_active_1', academyId: ACAD_2, name: 'Adulto Básico (Noite)',     templateId: 'a2_t3', date: `${today}T20:00:00Z`,       durationMinutes: 90,  instructorId: 'a2_i1', attendanceIds: ['a2_s1','a2_s2'], status: 'In Progress' },
  { id: 'a2_class_past_1',   academyId: ACAD_2, name: 'Infantil A',                templateId: 'a2_t1', date: `${yesterday}T17:30:00Z`,   durationMinutes: 60,  instructorId: 'a2_i2', attendanceIds: ['a2_s4','a2_s5','a2_s8'], status: 'Finalized' },
  { id: 'a2_class_past_2',   academyId: ACAD_2, name: 'Competição (Noite)',         templateId: 'a2_t4', date: `${twoDaysAgo}T19:00:00Z`,  durationMinutes: 120, instructorId: 'a2_i1', attendanceIds: ['a2_s3','a2_s6','a2_s7'], status: 'Finalized' },
  { id: 'a2_class_past_3',   academyId: ACAD_2, name: 'Adulto Básico (Noite)',     templateId: 'a2_t3', date: `${oneWeekAgo}T20:00:00Z`,  durationMinutes: 90,  instructorId: 'a2_i1', attendanceIds: ['a2_s1','a2_s3'], status: 'Finalized' },

  // ── Academia 3 ──
  { id: 'a3_class_active_1', academyId: ACAD_3, name: 'Adulto Dragon (Noite)',     templateId: 'a3_t3', date: `${today}T20:00:00Z`,       durationMinutes: 90,  instructorId: 'a3_i1', attendanceIds: ['a3_s2','a3_s3'], status: 'In Progress' },
  { id: 'a3_class_past_1',   academyId: ACAD_3, name: 'Kids Dragon',               templateId: 'a3_t1', date: `${yesterday}T17:00:00Z`,   durationMinutes: 60,  instructorId: 'a3_i2', attendanceIds: ['a3_s4','a3_s5','a3_s8'], status: 'Finalized' },
  { id: 'a3_class_past_2',   academyId: ACAD_3, name: 'Elite / Competição',        templateId: 'a3_t4', date: `${twoDaysAgo}T19:00:00Z`,  durationMinutes: 120, instructorId: 'a3_i1', attendanceIds: ['a3_s6','a3_s7'], status: 'Finalized' },
  { id: 'a3_class_past_3',   academyId: ACAD_3, name: 'Adulto Dragon (Noite)',     templateId: 'a3_t3', date: `${oneWeekAgo}T20:00:00Z`,  durationMinutes: 90,  instructorId: 'a3_i1', attendanceIds: ['a3_s1','a3_s2','a3_s3'], status: 'Finalized' },
];

// ═══════════════════════════════════════════════════════════════════════════
// REGISTROS DE PRESENÇA
// ═══════════════════════════════════════════════════════════════════════════

export const SEED_ATTENDANCE: AttendanceRecord[] = [
  // ── Academia 1 ──
  { id: 'att_1',  academyId: ACAD_1, studentId: 's4',  classId: 'class_past_1',  date: `${yesterday}T18:00:00Z`,   durationMinutes: 60 },
  { id: 'att_2',  academyId: ACAD_1, studentId: 's5',  classId: 'class_past_1',  date: `${yesterday}T18:00:00Z`,   durationMinutes: 60 },
  { id: 'att_3',  academyId: ACAD_1, studentId: 's3',  classId: 'class_past_2',  date: `${twoDaysAgo}T19:30:00Z`,  durationMinutes: 120 },
  { id: 'att_4',  academyId: ACAD_1, studentId: 's6',  classId: 'class_past_2',  date: `${twoDaysAgo}T19:30:00Z`,  durationMinutes: 120 },
  { id: 'att_5',  academyId: ACAD_1, studentId: 's7',  classId: 'class_past_2',  date: `${twoDaysAgo}T19:30:00Z`,  durationMinutes: 120 },
  { id: 'att_6',  academyId: ACAD_1, studentId: 's8',  classId: 'class_past_3',  date: `${threeDaysAgo}T18:00:00Z`,durationMinutes: 60 },
  { id: 'att_7',  academyId: ACAD_1, studentId: 's9',  classId: 'class_past_3',  date: `${threeDaysAgo}T18:00:00Z`,durationMinutes: 60 },
  { id: 'att_8',  academyId: ACAD_1, studentId: 's1',  classId: 'class_past_4',  date: `${oneWeekAgo}T19:30:00Z`,  durationMinutes: 90 },
  { id: 'att_9',  academyId: ACAD_1, studentId: 's2',  classId: 'class_past_4',  date: `${oneWeekAgo}T19:30:00Z`,  durationMinutes: 90 },
  { id: 'att_10', academyId: ACAD_1, studentId: 's10', classId: 'class_past_4',  date: `${oneWeekAgo}T19:30:00Z`,  durationMinutes: 90 },

  // ── Academia 2 ──
  { id: 'a2_att_1', academyId: ACAD_2, studentId: 'a2_s4', classId: 'a2_class_past_1', date: `${yesterday}T17:30:00Z`,  durationMinutes: 60 },
  { id: 'a2_att_2', academyId: ACAD_2, studentId: 'a2_s5', classId: 'a2_class_past_1', date: `${yesterday}T17:30:00Z`,  durationMinutes: 60 },
  { id: 'a2_att_3', academyId: ACAD_2, studentId: 'a2_s8', classId: 'a2_class_past_1', date: `${yesterday}T17:30:00Z`,  durationMinutes: 60 },
  { id: 'a2_att_4', academyId: ACAD_2, studentId: 'a2_s3', classId: 'a2_class_past_2', date: `${twoDaysAgo}T19:00:00Z`, durationMinutes: 120 },
  { id: 'a2_att_5', academyId: ACAD_2, studentId: 'a2_s6', classId: 'a2_class_past_2', date: `${twoDaysAgo}T19:00:00Z`, durationMinutes: 120 },
  { id: 'a2_att_6', academyId: ACAD_2, studentId: 'a2_s7', classId: 'a2_class_past_2', date: `${twoDaysAgo}T19:00:00Z`, durationMinutes: 120 },
  { id: 'a2_att_7', academyId: ACAD_2, studentId: 'a2_s1', classId: 'a2_class_past_3', date: `${oneWeekAgo}T20:00:00Z`, durationMinutes: 90 },
  { id: 'a2_att_8', academyId: ACAD_2, studentId: 'a2_s3', classId: 'a2_class_past_3', date: `${oneWeekAgo}T20:00:00Z`, durationMinutes: 90 },

  // ── Academia 3 ──
  { id: 'a3_att_1', academyId: ACAD_3, studentId: 'a3_s4', classId: 'a3_class_past_1', date: `${yesterday}T17:00:00Z`,  durationMinutes: 60 },
  { id: 'a3_att_2', academyId: ACAD_3, studentId: 'a3_s5', classId: 'a3_class_past_1', date: `${yesterday}T17:00:00Z`,  durationMinutes: 60 },
  { id: 'a3_att_3', academyId: ACAD_3, studentId: 'a3_s8', classId: 'a3_class_past_1', date: `${yesterday}T17:00:00Z`,  durationMinutes: 60 },
  { id: 'a3_att_4', academyId: ACAD_3, studentId: 'a3_s6', classId: 'a3_class_past_2', date: `${twoDaysAgo}T19:00:00Z`, durationMinutes: 120 },
  { id: 'a3_att_5', academyId: ACAD_3, studentId: 'a3_s7', classId: 'a3_class_past_2', date: `${twoDaysAgo}T19:00:00Z`, durationMinutes: 120 },
  { id: 'a3_att_6', academyId: ACAD_3, studentId: 'a3_s1', classId: 'a3_class_past_3', date: `${oneWeekAgo}T20:00:00Z`, durationMinutes: 90 },
  { id: 'a3_att_7', academyId: ACAD_3, studentId: 'a3_s2', classId: 'a3_class_past_3', date: `${oneWeekAgo}T20:00:00Z`, durationMinutes: 90 },
  { id: 'a3_att_8', academyId: ACAD_3, studentId: 'a3_s3', classId: 'a3_class_past_3', date: `${oneWeekAgo}T20:00:00Z`, durationMinutes: 90 },
];

// ═══════════════════════════════════════════════════════════════════════════
// TRANSAÇÕES FINANCEIRAS
// ═══════════════════════════════════════════════════════════════════════════

export const SEED_TRANSACTIONS: FinanceTransaction[] = [
  // ── Academia 1 — NexDojo ─────────────────────────────────────────────────
  { id: 'tx1',  academyId: ACAD_1, description: 'Mensalidade - Carlos Oliveira',  amount: 150,  type: 'income',  category: 'Mensalidade',      date: `${curYM}-01`,  paymentMethod: 'PIX',              status: 'paid',    studentId: 's1' },
  { id: 'tx2',  academyId: ACAD_1, description: 'Mensalidade - Juliana Santos',   amount: 800,  type: 'income',  category: 'Mensalidade',      date: `${curYM}-02`,  paymentMethod: 'PIX',              status: 'paid',    studentId: 's2' },
  { id: 'tx3',  academyId: ACAD_1, description: 'Mensalidade - Marcos Pereira',   amount: 800,  type: 'income',  category: 'Mensalidade',      date: `${curYM}-03`,  paymentMethod: 'Cartão de Crédito',status: 'paid',    studentId: 's3' },
  { id: 'tx4',  academyId: ACAD_1, description: 'Plano Kids - Arthur Silva',      amount: 120,  type: 'income',  category: 'Mensalidade',      date: `${curYM}-03`,  paymentMethod: 'PIX',              status: 'paid',    studentId: 's4' },
  { id: 'tx5',  academyId: ACAD_1, description: 'Aluguel do espaço',              amount: 2500, type: 'expense', category: 'Aluguel',          date: `${curYM}-05`,  paymentMethod: 'Transferência',    status: 'paid' },
  { id: 'tx6',  academyId: ACAD_1, description: 'Energia elétrica',               amount: 420,  type: 'expense', category: 'Energia/Água',     date: `${curYM}-07`,  paymentMethod: 'Débito Automático', status: 'paid' },
  { id: 'tx7',  academyId: ACAD_1, description: 'Mensalidade - Lucas Ferreira',   amount: 150,  type: 'income',  category: 'Mensalidade',      date: `${curYM}-08`,  paymentMethod: 'Dinheiro',         status: 'pending', studentId: 's10' },
  { id: 'tx8',  academyId: ACAD_1, description: 'Venda - Kimono adulto A2',       amount: 280,  type: 'income',  category: 'Venda de Produto', date: `${curYM}-10`,  paymentMethod: 'PIX',              status: 'paid' },
  { id: 'tx9',  academyId: ACAD_1, description: 'Manutenção tatame',              amount: 350,  type: 'expense', category: 'Manutenção',       date: `${lastYM}-20`, paymentMethod: 'Dinheiro',         status: 'paid' },
  { id: 'tx10', academyId: ACAD_1, description: 'Salário - Prof. Ana Carolina',   amount: 1800, type: 'expense', category: 'Salários',         date: `${lastYM}-30`, paymentMethod: 'Transferência',    status: 'paid' },
  { id: 'tx11', academyId: ACAD_1, description: 'Matrícula - Rafael Nascimento',  amount: 80,   type: 'income',  category: 'Matrícula',        date: today,          paymentMethod: 'PIX',              status: 'paid' },
  { id: 'tx12', academyId: ACAD_1, description: 'Mensalidade - Beatriz Lima',     amount: 150,  type: 'income',  category: 'Mensalidade',      date: `${curYM}-05`,  paymentMethod: 'PIX',              status: 'paid',    studentId: 's7' },
  { id: 'tx13', academyId: ACAD_1, description: 'Venda - Camiseta NexFight (x3)', amount: 195,  type: 'income',  category: 'Venda de Produto', date: `${curYM}-12`,  paymentMethod: 'Dinheiro',         status: 'paid' },
  { id: 'tx14', academyId: ACAD_1, description: 'Internet / Streaming',           amount: 150,  type: 'expense', category: 'Outros',           date: `${curYM}-10`,  paymentMethod: 'Débito Automático', status: 'paid' },
  { id: 'tx15', academyId: ACAD_1, description: 'Mensalidade - Ricardo Mendes',   amount: 150,  type: 'income',  category: 'Mensalidade',      date: `${curYM}-04`,  paymentMethod: 'Cartão de Débito',  status: 'paid',    studentId: 's6' },
  { id: 'tx16', academyId: ACAD_1, description: 'Plano Kids - Pedro Rocha',       amount: 120,  type: 'income',  category: 'Mensalidade',      date: `${curYM}-06`,  paymentMethod: 'PIX',              status: 'pending', studentId: 's8' },

  // ── Academia 2 — Samurai BJJ ─────────────────────────────────────────────
  { id: 'a2_tx1',  academyId: ACAD_2, description: 'Mensalidade - Rodrigo Tanaka',    amount: 180,  type: 'income',  category: 'Mensalidade',      date: `${curYM}-01`,  paymentMethod: 'PIX',              status: 'paid',    studentId: 'a2_s1' },
  { id: 'a2_tx2',  academyId: ACAD_2, description: 'Mensalidade - Fernanda Kobayashi',amount: 180,  type: 'income',  category: 'Mensalidade',      date: `${curYM}-02`,  paymentMethod: 'PIX',              status: 'paid',    studentId: 'a2_s2' },
  { id: 'a2_tx3',  academyId: ACAD_2, description: 'Pacote Família - Thiago Nakamura',amount: 450,  type: 'income',  category: 'Mensalidade',      date: `${curYM}-02`,  paymentMethod: 'Cartão de Crédito',status: 'paid',    studentId: 'a2_s3' },
  { id: 'a2_tx4',  academyId: ACAD_2, description: 'Plano Juvenil - Isabela Morita',  amount: 130,  type: 'income',  category: 'Mensalidade',      date: `${curYM}-03`,  paymentMethod: 'PIX',              status: 'paid',    studentId: 'a2_s4' },
  { id: 'a2_tx5',  academyId: ACAD_2, description: 'Aluguel da academia',             amount: 3200, type: 'expense', category: 'Aluguel',          date: `${curYM}-05`,  paymentMethod: 'Transferência',    status: 'paid' },
  { id: 'a2_tx6',  academyId: ACAD_2, description: 'Salário - Prof. Camila Sousa',    amount: 2200, type: 'expense', category: 'Salários',         date: `${lastYM}-30`, paymentMethod: 'Transferência',    status: 'paid' },
  { id: 'a2_tx7',  academyId: ACAD_2, description: 'Energia elétrica',                amount: 580,  type: 'expense', category: 'Energia/Água',     date: `${curYM}-08`,  paymentMethod: 'Débito Automático', status: 'paid' },
  { id: 'a2_tx8',  academyId: ACAD_2, description: 'Venda - Kimono Kids M2',          amount: 220,  type: 'income',  category: 'Venda de Produto', date: `${curYM}-10`,  paymentMethod: 'Dinheiro',         status: 'paid' },
  { id: 'a2_tx9',  academyId: ACAD_2, description: 'Matrícula - Vanessa Rodrigues',   amount: 80,   type: 'income',  category: 'Matrícula',        date: today,          paymentMethod: 'PIX',              status: 'paid' },
  { id: 'a2_tx10', academyId: ACAD_2, description: 'Mensalidade - Camila Tanaka',     amount: 450,  type: 'income',  category: 'Mensalidade',      date: `${curYM}-05`,  paymentMethod: 'PIX',              status: 'paid',    studentId: 'a2_s6' },
  { id: 'a2_tx11', academyId: ACAD_2, description: 'Plano Juvenil - Eduardo Yamamoto',amount: 130,  type: 'income',  category: 'Mensalidade',      date: `${curYM}-04`,  paymentMethod: 'PIX',              status: 'pending', studentId: 'a2_s5' },
  { id: 'a2_tx12', academyId: ACAD_2, description: 'Manutenção equipamentos',         amount: 400,  type: 'expense', category: 'Manutenção',       date: `${lastYM}-15`, paymentMethod: 'Dinheiro',         status: 'paid' },

  // ── Academia 3 — Dragão Fight ─────────────────────────────────────────────
  { id: 'a3_tx1',  academyId: ACAD_3, description: 'Mensalidade - Amanda Ferreira',   amount: 420,  type: 'income',  category: 'Mensalidade',      date: `${curYM}-01`,  paymentMethod: 'PIX',              status: 'paid',    studentId: 'a3_s2' },
  { id: 'a3_tx2',  academyId: ACAD_3, description: 'Mensalidade - Felipe Castro',     amount: 420,  type: 'income',  category: 'Mensalidade',      date: `${curYM}-02`,  paymentMethod: 'PIX',              status: 'paid',    studentId: 'a3_s3' },
  { id: 'a3_tx3',  academyId: ACAD_3, description: 'Plano Família - Juliana Ramos',   amount: 280,  type: 'income',  category: 'Mensalidade',      date: `${curYM}-03`,  paymentMethod: 'Cartão de Crédito',status: 'paid',    studentId: 'a3_s6' },
  { id: 'a3_tx4',  academyId: ACAD_3, description: 'Plano Kids - Larissa Pinto',      amount: 110,  type: 'income',  category: 'Mensalidade',      date: `${curYM}-03`,  paymentMethod: 'PIX',              status: 'paid',    studentId: 'a3_s4' },
  { id: 'a3_tx5',  academyId: ACAD_3, description: 'Aluguel do espaço',               amount: 4000, type: 'expense', category: 'Aluguel',          date: `${curYM}-05`,  paymentMethod: 'Transferência',    status: 'paid' },
  { id: 'a3_tx6',  academyId: ACAD_3, description: 'Salário - Prof. Leticia Vaz',     amount: 2500, type: 'expense', category: 'Salários',         date: `${lastYM}-30`, paymentMethod: 'Transferência',    status: 'paid' },
  { id: 'a3_tx7',  academyId: ACAD_3, description: 'Energia / Água',                  amount: 720,  type: 'expense', category: 'Energia/Água',     date: `${curYM}-07`,  paymentMethod: 'Débito Automático', status: 'paid' },
  { id: 'a3_tx8',  academyId: ACAD_3, description: 'Mensalidade - Diego Rocha',       amount: 160,  type: 'income',  category: 'Mensalidade',      date: `${curYM}-04`,  paymentMethod: 'Dinheiro',         status: 'pending', studentId: 'a3_s1' },
  { id: 'a3_tx9',  academyId: ACAD_3, description: 'Venda - Kit proteção',            amount: 160,  type: 'income',  category: 'Venda de Produto', date: `${curYM}-09`,  paymentMethod: 'PIX',              status: 'paid' },
  { id: 'a3_tx10', academyId: ACAD_3, description: 'Matrícula - Diego Rocha',         amount: 100,  type: 'income',  category: 'Matrícula',        date: '2024-02-01',   paymentMethod: 'PIX',              status: 'paid' },
  { id: 'a3_tx11', academyId: ACAD_3, description: 'Plano Kids - Gustavo Santos',     amount: 110,  type: 'income',  category: 'Mensalidade',      date: `${curYM}-06`,  paymentMethod: 'PIX',              status: 'pending', studentId: 'a3_s8' },
  { id: 'a3_tx12', academyId: ACAD_3, description: 'Seguro da academia',              amount: 800,  type: 'expense', category: 'Outros',           date: `${prev2YM}-01`,paymentMethod: 'Transferência',    status: 'paid' },
];

// ═══════════════════════════════════════════════════════════════════════════
// EVENTOS DO CALENDÁRIO
// ═══════════════════════════════════════════════════════════════════════════

export const SEED_CALENDAR: CalendarEvent[] = [
  // ── Academia 1 ──
  { id: 'ev1',    academyId: ACAD_1, date: `${curYM}-15`, reason: 'Feriado Nacional — Sem aula', type: 'no-class' },
  { id: 'ev2',    academyId: ACAD_1, date: `${curYM}-22`, reason: 'Seminário de Verão — Prof. Renato', type: 'event' },
  { id: 'ev3',    academyId: ACAD_1, date: nextWeek,       reason: 'Graduação de alunos — cerimônia completa', type: 'event' },
  { id: 'ev4',    academyId: ACAD_1, date: nextMonth,      reason: 'Copa Interna NexFight 2026', type: 'event' },

  // ── Academia 2 ──
  { id: 'a2_ev1', academyId: ACAD_2, date: `${curYM}-15`, reason: 'Feriado Nacional — Academia fechada', type: 'no-class' },
  { id: 'a2_ev2', academyId: ACAD_2, date: `${curYM}-29`, reason: 'Dia de Exame — Samurai BJJ', type: 'event' },
  { id: 'a2_ev3', academyId: ACAD_2, date: nextWeek,       reason: 'Treino especial — Prof. Convidado', type: 'event' },

  // ── Academia 3 ──
  { id: 'a3_ev1', academyId: ACAD_3, date: `${curYM}-15`, reason: 'Feriado Nacional — Sem treino', type: 'no-class' },
  { id: 'a3_ev2', academyId: ACAD_3, date: tomorrow,       reason: 'Open Dragão — Campeonato Interno', type: 'event' },
  { id: 'a3_ev3', academyId: ACAD_3, date: nextMonth,      reason: 'Seminário com Mestre Rodrigo', type: 'event' },
];

// ═══════════════════════════════════════════════════════════════════════════
// MENSAGENS DO CHAT
// ═══════════════════════════════════════════════════════════════════════════

export const SEED_CHAT: ChatMessage[] = [
  // ── Academia 1 ──
  { id: 'msg1', academyId: ACAD_1, senderId: 'mock_user_1',  senderName: 'Admin NexFight',       senderRole: 'admin',      content: 'Pessoal, amanhã teremos treino extra às 7h da manhã. Confirmem presença! OSS!', timestamp: `${yesterday}T08:00:00Z` },
  { id: 'msg2', academyId: ACAD_1, senderId: 'mock_instr_1', senderName: 'Prof. Renato Silva',   senderRole: 'instructor', content: 'Lembrando que no sábado haverá seminário com visitante especial. Não percam! OSS', timestamp: `${yesterday}T14:30:00Z` },
  { id: 'msg3', academyId: ACAD_1, senderId: 'mock_user_1',  senderName: 'Admin NexFight',       senderRole: 'admin',      content: 'Parabéns à Juliana Santos pela faixa azul! OSS! 🥋', timestamp: `${today}T09:15:00Z` },
  { id: 'msg4', academyId: ACAD_1, senderId: 'mock_instr_1', senderName: 'Prof. Renato Silva',   senderRole: 'instructor', content: 'Treino de No-Gi toda sexta a partir das 20h. Todos são bem-vindos!', timestamp: `${today}T11:00:00Z` },
  { id: 'msg5', academyId: ACAD_1, senderId: 'mock_staff_1', senderName: 'Ana Secretaria',       senderRole: 'staff',      content: 'Atenção: pagamentos de maio com vencimento dia 15. Qualquer dúvida, me chamem!', timestamp: `${today}T12:30:00Z` },

  // ── Academia 2 ──
  { id: 'a2_msg1', academyId: ACAD_2, senderId: 'a2_admin_1', senderName: 'Admin Samurai',         senderRole: 'admin',      content: 'Samurai BJJ está com novas turmas abertas! Indique seus amigos. OSS!', timestamp: `${yesterday}T09:00:00Z` },
  { id: 'a2_msg2', academyId: ACAD_2, senderId: 'a2_instr_1', senderName: 'Prof. Kenji Nakamura',  senderRole: 'instructor', content: 'Treino de competição nessa semana será na quinta às 19h. Venham preparados!', timestamp: `${yesterday}T16:00:00Z` },
  { id: 'a2_msg3', academyId: ACAD_2, senderId: 'a2_instr_2', senderName: 'Prof. Camila Sousa',    senderRole: 'instructor', content: 'Turma Kids: ensaio de graduação no próximo sábado! Traga os responsáveis.', timestamp: `${today}T08:00:00Z` },
  { id: 'a2_msg4', academyId: ACAD_2, senderId: 'a2_admin_1', senderName: 'Admin Samurai',         senderRole: 'admin',      content: 'Parabéns Rodrigo Tanaka pelas 3 fitas na branca! Continue evoluindo. OSS', timestamp: `${today}T10:30:00Z` },

  // ── Academia 3 ──
  { id: 'a3_msg1', academyId: ACAD_3, senderId: 'a3_admin_1', senderName: 'Admin Dragão',          senderRole: 'admin',      content: 'Open Dragão amanhã! Todos os alunos confirmados? Contamos com vocês!', timestamp: `${yesterday}T10:00:00Z` },
  { id: 'a3_msg2', academyId: ACAD_3, senderId: 'a3_instr_1', senderName: 'Prof. Diego Rocha Jr.', senderRole: 'instructor', content: 'Pessoal da competição: revisão de posições hoje às 20h. Presença obrigatória!', timestamp: `${yesterday}T17:00:00Z` },
  { id: 'a3_msg3', academyId: ACAD_3, senderId: 'a3_instr_2', senderName: 'Prof. Leticia Vaz',     senderRole: 'instructor', content: 'Kids: trouxemos novos tatames! Aula de sábado será no salão principal.', timestamp: `${today}T07:30:00Z` },
  { id: 'a3_msg4', academyId: ACAD_3, senderId: 'a3_admin_1', senderName: 'Admin Dragão',          senderRole: 'admin',      content: 'Parabéns Amanda Ferreira pelas 3 fitas na azul! Grande evolução! OSS 🥋', timestamp: `${today}T13:00:00Z` },
];

// ═══════════════════════════════════════════════════════════════════════════
// PRODUTOS (INVENTÁRIO)
// ═══════════════════════════════════════════════════════════════════════════

export const SEED_PRODUCTS: Product[] = [
  // ── Academia 1 — NexDojo ─────────────────────────────────────────────────
  { id: 'prod1', academyId: ACAD_1, name: 'Kimono Adulto A2',          price: 280, stock: 5,  category: 'Kimonos',    description: 'Kimono branco adulto tamanho A2', createdAt: lastMonth },
  { id: 'prod2', academyId: ACAD_1, name: 'Kimono Kids M2',            price: 220, stock: 3,  category: 'Kimonos',    description: 'Kimono infantil tamanho M2', createdAt: lastMonth },
  { id: 'prod3', academyId: ACAD_1, name: 'Camiseta NexFight',         price: 65,  stock: 12, category: 'Vestuário',  description: 'Camiseta oficial NexFight — dry fit', createdAt: lastMonth },
  { id: 'prod4', academyId: ACAD_1, name: 'Caneca OSS',                price: 35,  stock: 8,  category: 'Acessórios', description: 'Caneca personalizada OSS 350ml', createdAt: lastMonth },
  { id: 'prod5', academyId: ACAD_1, name: 'Protetor Bucal',            price: 45,  stock: 0,  category: 'Proteções',  description: 'Protetor bucal duplo — adulto', createdAt: lastMonth },
  { id: 'prod6', academyId: ACAD_1, name: 'Kimono Adulto A3 (Azul)',   price: 295, stock: 2,  category: 'Kimonos',    description: 'Kimono azul adulto tamanho A3', createdAt: twoWeeksAgo },
  { id: 'prod7', academyId: ACAD_1, name: 'Faixa Adulto (várias cores)',price: 30,  stock: 20, category: 'Acessórios', description: 'Faixas avulsas para reposição', createdAt: oneWeekAgo },

  // ── Academia 2 — Samurai BJJ ─────────────────────────────────────────────
  { id: 'a2_prod1', academyId: ACAD_2, name: 'Kimono Samurai A2',       price: 310, stock: 4,  category: 'Kimonos',    description: 'Kimono oficial Samurai BJJ A2', createdAt: lastMonth },
  { id: 'a2_prod2', academyId: ACAD_2, name: 'Rashguard Manga Curta',   price: 95,  stock: 8,  category: 'Vestuário',  description: 'Rashguard dry fit manga curta', createdAt: lastMonth },
  { id: 'a2_prod3', academyId: ACAD_2, name: 'Shorts de No-Gi',         price: 80,  stock: 6,  category: 'Vestuário',  description: 'Shorts para treino de No-Gi', createdAt: lastMonth },
  { id: 'a2_prod4', academyId: ACAD_2, name: 'Joelheira Compressão',    price: 55,  stock: 0,  category: 'Proteções',  description: 'Joelheira de compressão para treino', createdAt: twoWeeksAgo },
  { id: 'a2_prod5', academyId: ACAD_2, name: 'Bolsa Samurai BJJ',       price: 120, stock: 3,  category: 'Acessórios', description: 'Bolsa esportiva oficial', createdAt: oneWeekAgo },

  // ── Academia 3 — Dragão Fight ─────────────────────────────────────────────
  { id: 'a3_prod1', academyId: ACAD_3, name: 'Kimono Dragão A1',        price: 290, stock: 6,  category: 'Kimonos',    description: 'Kimono Dragão Fight tamanho A1', createdAt: lastMonth },
  { id: 'a3_prod2', academyId: ACAD_3, name: 'Kimono Dragão Kids P1',   price: 230, stock: 4,  category: 'Kimonos',    description: 'Kimono infantil tamanho P1', createdAt: lastMonth },
  { id: 'a3_prod3', academyId: ACAD_3, name: 'Moletom Dragão Fight',    price: 110, stock: 5,  category: 'Vestuário',  description: 'Moletom com capuz estampado', createdAt: lastMonth },
  { id: 'a3_prod4', academyId: ACAD_3, name: 'Bandagem Elástica',       price: 20,  stock: 15, category: 'Proteções',  description: 'Bandagem para mãos e punhos (5m)', createdAt: lastMonth },
  { id: 'a3_prod5', academyId: ACAD_3, name: 'Squeeze Dragão 700ml',    price: 40,  stock: 0,  category: 'Acessórios', description: 'Squeeze oficial com logo Dragão', createdAt: twoWeeksAgo },
];

// ═══════════════════════════════════════════════════════════════════════════
// LIXEIRA (itens pré-excluídos para testar restauração)
// ═══════════════════════════════════════════════════════════════════════════

export const SEED_RECYCLE_BIN: RecycleBinItem[] = [
  // Academia 1: aluno excluído
  {
    id: 'rb1',
    academyId: ACAD_1,
    type: 'student',
    deletedAt: twoWeeksAgo + 'T10:00:00Z',
    originalData: {
      id: 'rb_s1', academyId: ACAD_1,
      name: 'Jorge Cardoso', belt: Belt.WHITE, stripes: 1,
      birthDate: '1997-06-15', gender: 'M' as const,
      totalClasses: 10, totalHours: 15, absentCount: 8,
      status: 'Inactive' as const, joinDate: '2024-03-01',
    } as Student,
  },
  // Academia 1: template excluído
  {
    id: 'rb2',
    academyId: ACAD_1,
    type: 'template',
    deletedAt: oneWeekAgo + 'T14:00:00Z',
    originalData: {
      id: 'rb_t1', academyId: ACAD_1,
      name: 'No-Gi Especial', durationMinutes: 90,
      assignedStudentIds: [],
      schedules: [{ dayOfWeek: 5, startTime: '21:00', endTime: '22:30' }],
    } as ClassTemplate,
  },
  // Academia 2: instrutor excluído
  {
    id: 'rb3',
    academyId: ACAD_2,
    type: 'instructor',
    deletedAt: lastMonth + 'T09:30:00Z',
    originalData: {
      id: 'rb_i1', academyId: ACAD_2,
      name: 'Prof. Sergio Matos', belt: Belt.PURPLE, stripes: 2,
      birthDate: '1989-04-10', gender: 'M' as const,
      status: 'Inactive' as const, joinDate: '2020-08-01',
      specialties: 'Adultos, Iniciantes',
    } as Instructor,
  },
  // Academia 3: aluno excluído
  {
    id: 'rb4',
    academyId: ACAD_3,
    type: 'student',
    deletedAt: threeDaysAgo + 'T16:00:00Z',
    originalData: {
      id: 'rb_s2', academyId: ACAD_3,
      name: 'Caio Vasconcelos', belt: Belt.BLUE, stripes: 0,
      birthDate: '1998-01-25', gender: 'M' as const,
      totalClasses: 45, totalHours: 67.5, absentCount: 12,
      status: 'Dropped' as const, joinDate: '2023-04-15',
    } as Student,
  },
];
