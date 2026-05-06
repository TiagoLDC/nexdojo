
import { Student, Belt, Academy, User, ClassSession, ClassTemplate, AttendanceRecord, KimonoLoan, ChatMessage, FinanceTransaction, CalendarEvent } from '../types';

export const MOCK_ACADEMY: Academy = {
  id: 'mock_acad_1',
  name: 'NexDojo HQ',
  logo: 'https://images.unsplash.com/photo-1552072092-7f9b8d63efcb?q=80&w=400&h=400&auto=format&fit=crop',
  ownerName: 'Mestre Carlos Gracie',
  email: 'hq@nexdojo.com',
  cep: '01001-000',
  address: 'Av. Paulista',
  addressNumber: '1000',
  phone: '11999998888',
  plans: [
    { id: 'ap1', name: 'Mensal Adulto', durationMonths: 1, classesPerWeek: 3, price: 150, category: 'Adultos' },
    { id: 'ap2', name: 'Semestral Elite', durationMonths: 6, classesPerWeek: 5, price: 800, category: 'Adultos' },
    { id: 'ap3', name: 'Plano Kids', durationMonths: 1, classesPerWeek: 2, price: 120, category: 'Crianças' }
  ]
};

export const MOCK_ACADEMIES: Academy[] = [
  MOCK_ACADEMY,
  {
    id: 'mock_acad_2',
    name: 'Alliance São Paulo',
    ownerName: 'Fabio Gurgel',
    email: 'sp@alliance.com',
    logo: 'https://images.unsplash.com/photo-1599058917232-d750c1859d7c?q=80&w=400&h=400&auto=format&fit=crop',
    phone: '11988887777',
    plans: []
  },
  {
    id: 'mock_acad_3',
    name: 'Gracie Barra Rio',
    ownerName: 'Jefferson Moura',
    email: 'rio@graciebarra.com',
    logo: 'https://images.unsplash.com/photo-1549476464-37392f717551?q=80&w=400&h=400&auto=format&fit=crop',
    phone: '21977776666',
    plans: []
  }
];

export const MOCK_USER: User = {
  id: 'u_admin_1',
  academyId: 'mock_acad_1',
  role: 'admin',
  name: 'Tiago Admin',
  email: 'admin@nexdojo.com',
  password: 'oss123',
  status: 'Active'
};

export const MOCK_INSTRUCTOR_USER: User = {
  id: 'u_inst_1',
  academyId: 'mock_acad_1',
  role: 'instructor',
  name: 'Prof. Renato',
  email: 'renato@nexdojo.com',
  password: 'oss123',
  status: 'Active'
};

export const MOCK_STAFF_USER: User = {
  id: 'u_staff_1',
  academyId: 'mock_acad_1',
  role: 'staff',
  name: 'Ana Secretaria',
  email: 'ana@nexdojo.com',
  password: 'oss123',
  status: 'Active'
};

export const MOCK_STUDENT_USER: User = {
  id: 'u_stud_1',
  academyId: 'mock_acad_1',
  role: 'student',
  name: 'Carlos Aluno',
  email: 'carlos@student.com',
  password: 'oss123',
  status: 'Active'
};

export const MOCK_SUPERUSER: User = {
  id: 'u_super',
  academyId: 'global',
  role: 'superuser',
  name: 'Super Admin OSS',
  email: 'super@oss.com',
  password: 'super',
  status: 'Active'
};

export const MOCK_STUDENTS: Student[] = Array.from({ length: 25 }, (_, i) => ({
  id: `s_mock_${i + 1}`,
  academyId: 'mock_acad_1',
  name: `Aluno Exemplo ${i + 1}`,
  email: `aluno${i + 1}@exemplo.com`,
  belt: [Belt.WHITE, Belt.BLUE, Belt.PURPLE, Belt.BROWN, Belt.BLACK][Math.floor(Math.random() * 5)],
  stripes: Math.floor(Math.random() * 5),
  lastGraduationDate: '2024-01-10',
  birthDate: '1995-04-12',
  totalClasses: Math.floor(Math.random() * 200),
  totalHours: Math.floor(Math.random() * 300),
  absentCount: Math.floor(Math.random() * 5),
  status: 'Active',
  hasLoanedKimono: Math.random() > 0.8,
  joinDate: '2023-10-01',
  phone: '11988887777',
  photo: `https://picsum.photos/seed/s_mock_${i+1}/400/400`,
  planId: i % 3 === 0 ? 'ap1' : 'ap2'
}));

export const MOCK_TEMPLATES: ClassTemplate[] = [
  { id: 't1', academyId: 'mock_acad_1', name: 'Kids 5-9 anos', durationMinutes: 60, assignedStudentIds: ['s_mock_1', 's_mock_2'], schedules: [{ dayOfWeek: 1, startTime: '18:00', endTime: '19:00' }, { dayOfWeek: 3, startTime: '18:00', endTime: '19:00' }] },
  { id: 't2', academyId: 'mock_acad_1', name: 'Kids 10-15 anos', durationMinutes: 60, assignedStudentIds: ['s_mock_3', 's_mock_4'], schedules: [{ dayOfWeek: 2, startTime: '18:00', endTime: '19:00' }, { dayOfWeek: 4, startTime: '18:00', endTime: '19:00' }] },
  { id: 't3', academyId: 'mock_acad_1', name: 'Adulto Iniciante', durationMinutes: 90, assignedStudentIds: ['s_mock_5', 's_mock_6', 's_mock_7'], schedules: [{ dayOfWeek: 1, startTime: '19:30', endTime: '21:00' }, { dayOfWeek: 3, startTime: '19:30', endTime: '21:00' }, { dayOfWeek: 5, startTime: '19:00', endTime: '20:30' }] },
  { id: 't4', academyId: 'mock_acad_1', name: 'Adulto Avançado', durationMinutes: 120, assignedStudentIds: ['s_mock_8', 's_mock_9', 's_mock_10'], schedules: [{ dayOfWeek: 2, startTime: '19:30', endTime: '21:30' }, { dayOfWeek: 4, startTime: '19:30', endTime: '21:30' }, { dayOfWeek: 6, startTime: '10:00', endTime: '12:00' }] }
];

const today = new Date().toISOString().split('T')[0];
const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

export const MOCK_CLASSES: ClassSession[] = [
  {
    id: 'class_active_1',
    academyId: 'mock_acad_1',
    name: 'Adulto Iniciante (Noite)',
    templateId: 't3',
    date: new Date().toISOString(),
    durationMinutes: 90,
    instructorId: 'u_inst_1',
    attendanceIds: ['s_mock_5'],
    status: 'In Progress'
  },
  {
    id: 'class_past_1',
    academyId: 'mock_acad_1',
    name: 'Kids 5-9 anos (Seg/Qua)',
    templateId: 't1',
    date: yesterday + 'T18:00:00Z',
    durationMinutes: 60,
    instructorId: 'u_inst_1',
    attendanceIds: ['s_mock_1', 's_mock_2'],
    status: 'Finalized'
  }
];

export const MOCK_ATTENDANCE: AttendanceRecord[] = [
  { id: 'att_1', academyId: 'mock_acad_1', studentId: 's_mock_1', classId: 'class_past_1', date: yesterday + 'T18:00:00Z', durationMinutes: 60, kimonoTaken: false },
  { id: 'att_2', academyId: 'mock_acad_1', studentId: 's_mock_2', classId: 'class_past_1', date: yesterday + 'T18:00:00Z', durationMinutes: 60, kimonoTaken: false }
];

export const MOCK_KIMONO_LOANS: KimonoLoan[] = [
  { id: 'loan_1', academyId: 'mock_acad_1', studentId: 's_mock_2', borrowedAt: yesterday + 'T18:05:00Z', status: 'Active' },
  { id: 'loan_2', academyId: 'mock_acad_1', studentId: 's_mock_10', borrowedAt: today + 'T10:00:00Z', status: 'Active' }
];

export const MOCK_CHAT_MESSAGES: ChatMessage[] = [
  { id: 'msg_1', academyId: 'mock_acad_1', senderId: 'u_admin_1', senderName: 'Tiago Admin', senderRole: 'admin', content: 'Pessoal, lembrando do seminário neste sábado!', timestamp: yesterday + 'T14:00:00Z' },
  { id: 'msg_2', academyId: 'mock_acad_1', senderId: 'u_inst_1', senderName: 'Prof. Renato', senderRole: 'instructor', content: 'OSS! Estaremos lá.', timestamp: yesterday + 'T14:30:00Z' },
  { id: 'msg_msg_3', academyId: 'mock_acad_1', senderId: 'u_staff_1', senderName: 'Ana Secretaria', senderRole: 'staff', content: 'As inscrições podem ser feitas na recepção.', timestamp: today + 'T09:00:00Z' }
];

export const MOCK_FINANCES: FinanceTransaction[] = [
  { id: 'f1', academyId: 'mock_acad_1', description: 'Mensalidade - Aluno Exemplo 1', amount: 150, type: 'income', category: 'Mensalidade', date: today, paymentMethod: 'Pix', status: 'paid', studentId: 's_mock_1' },
  { id: 'f2', academyId: 'mock_acad_1', description: 'Aluguel do Tatame', amount: 2500, type: 'expense', category: 'Infraestrutura', date: yesterday, paymentMethod: 'Boleto', status: 'paid' },
  { id: 'f3', academyId: 'mock_acad_1', description: 'Venda de Kimono', amount: 350, type: 'income', category: 'Vendas', date: today, paymentMethod: 'Cartão', status: 'pending' }
];

export const MOCK_CALENDAR: CalendarEvent[] = [
  { id: 'e1', academyId: 'mock_acad_1', date: today, reason: 'Treino Aberto', type: 'event' },
  { id: 'e2', academyId: 'mock_acad_1', date: '2026-05-10', reason: 'Feriado Local', type: 'no-class' }
];
;
