
import { Student, Belt, Academy, User, ClassSession, ClassTemplate, AttendanceRecord } from '../types';

export const MOCK_ACADEMY: Academy = {
  id: 'mock_acad_1',
  name: 'NexDojo',
  logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTcDiOKOZSy0MCLzV0wFkySbFY3Y-f-S5dpNw&s',
  ownerName: 'Prof. Carlos Gracie Jr.',
  email: 'admin@oss.com',
  cep: '',
  address: '',
  addressNumber: '',
  phone: ''
};

export const MOCK_ACADEMIES: Academy[] = [
  MOCK_ACADEMY,
  {
    id: 'mock_acad_2',
    name: 'SAIKO',
    logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTcDiOKOZSy0MCLzV0wFkySbFY3Y-f-S5dpNw&s',
    ownerName: 'Leo Vieira',
    email: 'saiko@oss.com',
    cep: '04543-011',
    address: 'Rua Olimpíadas, Vila Olímpia, São Paulo - SP',
    addressNumber: '200'
  },
  {
    id: 'mock_acad_3',
    name: 'CHECKMAT',
    logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcThl9F99l477l7S9Zl9Xl9Xl9Xl9Xl9Xl9Xl9Xl9Xl9&s', // Placeholder
    ownerName: 'Leo Vieira',
    email: 'checkmat@oss.com',
    cep: '04543-011',
    address: 'Rua Olimpíadas, Vila Olímpia, São Paulo - SP',
    addressNumber: '200'
  }
];

export const MOCK_USER: User = {
  id: 'mock_user_1',
  academyId: 'mock_acad_1',
  role: 'admin',
  name: 'Admin Teste',
  email: 'admin@oss.com',
  password: 'oss123',
  status: 'Active'
};

export const MOCK_INSTRUCTOR_USER: User = {
  id: 'mock_instr_1',
  academyId: 'mock_acad_1',
  role: 'instructor',
  name: 'Prof. Renato Silva',
  email: 'instru@oss.com',
  password: 'oss123',
  status: 'Active'
};

export const MOCK_STAFF_USER: User = {
  id: 'mock_staff_1',
  academyId: 'mock_acad_1',
  role: 'staff',
  name: 'Ana Secretaria',
  email: 'colab@oss.com',
  password: 'oss123',
  status: 'Active'
};

export const MOCK_STUDENT_USER: User = {
  id: 'mock_student_user_1',
  academyId: 'mock_acad_1',
  role: 'student',
  name: 'Carlos Oliveira',
  email: 'aluno@oss.com',
  password: 'oss123',
  status: 'Active'
};

export const MOCK_SUPERUSER: User = {
  id: 'mock_superuser_1',
  academyId: 'global',
  role: 'superuser',
  name: 'Super User OSS',
  email: 'super@oss.com',
  password: 'super',
  status: 'Active'
};

export const MOCK_STUDENTS: Student[] = [
  { id: 's1', academyId: 'mock_acad_1', name: 'Carlos Oliveira', email: 'aluno@oss.com', belt: Belt.WHITE, stripes: 2, lastGraduationDate: '2024-01-10', birthDate: '1995-04-12', totalClasses: 45, totalHours: 67.5, absentCount: 0, status: 'Active', hasLoanedKimono: false, joinDate: '2023-10-01', phone: '11988887777', photo: 'https://picsum.photos/seed/s1/400/400' },
  { id: 's2', academyId: 'mock_acad_1', name: 'Juliana Santos', belt: Belt.BLUE, stripes: 1, lastGraduationDate: '2023-11-20', birthDate: '1998-08-22', totalClasses: 120, totalHours: 180, absentCount: 4, status: 'Active', hasLoanedKimono: true, joinDate: '2022-05-15', phone: '11977776666', photo: 'https://picsum.photos/seed/s2/400/400' },
  { id: 's3', academyId: 'mock_acad_1', name: 'Marcos Pereira', belt: Belt.PURPLE, stripes: 3, lastGraduationDate: '2023-06-15', birthDate: '1990-01-30', totalClasses: 350, totalHours: 525, absentCount: 0, status: 'Active', hasLoanedKimono: false, joinDate: '2020-02-10', phone: '11966665555', photo: 'https://picsum.photos/seed/s3/400/400' },
  { id: 's4', academyId: 'mock_acad_1', name: 'Arthur Silva', belt: Belt.GREY, stripes: 3, lastGraduationDate: '2024-03-05', birthDate: '2016-05-10', totalClasses: 30, totalHours: 30, absentCount: 0, status: 'Active', hasLoanedKimono: false, joinDate: '2023-12-01', guardianPhone: '11955554444', photo: 'https://picsum.photos/seed/s4/400/400' },
  { id: 's5', academyId: 'mock_acad_1', name: 'Mariana Costa', belt: Belt.YELLOW, stripes: 1, lastGraduationDate: '2024-02-12', birthDate: '2014-02-20', totalClasses: 80, totalHours: 80, absentCount: 0, status: 'Active', hasLoanedKimono: false, joinDate: '2023-01-15', guardianPhone: '11944443333', photo: 'https://picsum.photos/seed/s5/400/400' },
  { id: 's6', academyId: 'mock_acad_1', name: 'Ricardo Mendes', belt: Belt.BROWN, stripes: 0, lastGraduationDate: '2022-08-25', birthDate: '1988-11-05', totalClasses: 500, totalHours: 750, absentCount: 0, status: 'Active', hasLoanedKimono: false, joinDate: '2018-03-20', phone: '11933332222', photo: 'https://picsum.photos/seed/s6/400/400' },
  { id: 's7', academyId: 'mock_acad_1', name: 'Beatriz Lima', belt: Belt.BLACK, stripes: 1, lastGraduationDate: '2021-12-01', birthDate: '1985-07-14', totalClasses: 1200, totalHours: 1800, absentCount: 0, status: 'Active', hasLoanedKimono: false, joinDate: '2010-01-10', phone: '11922221111', photo: 'https://picsum.photos/seed/s7/400/400' },
  { id: 's8', academyId: 'mock_acad_1', name: 'Pedro Rocha', belt: Belt.ORANGE, stripes: 4, lastGraduationDate: '2023-10-15', birthDate: '2011-03-25', totalClasses: 150, totalHours: 150, absentCount: 5, status: 'Active', hasLoanedKimono: false, joinDate: '2021-06-12', guardianPhone: '11911110000', photo: 'https://picsum.photos/seed/s8/400/400' },
  { id: 's9', academyId: 'mock_acad_1', name: 'Sofia Amaral', belt: Belt.GREEN, stripes: 2, lastGraduationDate: '2023-12-20', birthDate: '2009-09-02', totalClasses: 210, totalHours: 210, absentCount: 0, status: 'Active', hasLoanedKimono: false, joinDate: '2020-11-05', guardianPhone: '11900009999', photo: 'https://picsum.photos/seed/s9/400/400' },
  { id: 's10', academyId: 'mock_acad_1', name: 'Lucas Ferreira', belt: Belt.WHITE, stripes: 0, birthDate: '2000-01-15', totalClasses: 5, totalHours: 7.5, absentCount: 0, status: 'Active', hasLoanedKimono: false, joinDate: '2024-02-01', phone: '11987654321', photo: 'https://picsum.photos/seed/s10/400/400' }
];

export const MOCK_TEMPLATES: ClassTemplate[] = [
  { id: 't1', academyId: 'mock_acad_1', name: 'Kids 5-9 anos (Seg/Qua)', durationMinutes: 60, assignedStudentIds: ['s4', 's5'] },
  { id: 't2', academyId: 'mock_acad_1', name: 'Kids 10-15 anos (Ter/Qui)', durationMinutes: 60, assignedStudentIds: ['s8', 's9'] },
  { id: 't3', academyId: 'mock_acad_1', name: 'Adulto Iniciante (Noite)', durationMinutes: 90, assignedStudentIds: ['s1', 's10', 's2'] },
  { id: 't4', academyId: 'mock_acad_1', name: 'Adulto Avançado / Competição', durationMinutes: 120, assignedStudentIds: ['s3', 's6', 's7'] }
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
    instructorId: 'mock_user_1',
    attendanceIds: ['s1'],
    status: 'In Progress'
  },
  {
    id: 'class_past_1',
    academyId: 'mock_acad_1',
    name: 'Kids 5-9 anos (Seg/Qua)',
    templateId: 't1',
    date: yesterday + 'T18:00:00Z',
    durationMinutes: 60,
    instructorId: 'mock_user_1',
    attendanceIds: ['s4', 's5'],
    status: 'Finalized'
  }
];

export const MOCK_ATTENDANCE: AttendanceRecord[] = [
  { id: 'att_1', academyId: 'mock_acad_1', studentId: 's4', classId: 'class_past_1', date: yesterday + 'T18:00:00Z', durationMinutes: 60, kimonoTaken: false },
  { id: 'att_2', academyId: 'mock_acad_1', studentId: 's5', classId: 'class_past_1', date: yesterday + 'T18:00:00Z', durationMinutes: 60, kimonoTaken: false }
];
