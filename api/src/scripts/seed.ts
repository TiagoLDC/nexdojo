import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const d = (ms: number) => new Date(Date.now() + ms).toISOString().split('T')[0];
const today        = d(0);
const yesterday    = d(-1  * 86400000);
const twoDaysAgo   = d(-2  * 86400000);
const threeDaysAgo = d(-3  * 86400000);
const oneWeekAgo   = d(-7  * 86400000);
const twoWeeksAgo  = d(-14 * 86400000);
const lastMonth    = d(-30 * 86400000);
const twoMonthsAgo = d(-60 * 86400000);
const tomorrow     = d(  1 * 86400000);
const nextWeek     = d(  7 * 86400000);
const nextMonth    = d( 30 * 86400000);
const twoMonthsFwd = d( 60 * 86400000);
const curYM   = today.slice(0, 7);
const lastYM  = lastMonth.slice(0, 7);
const prev2YM = twoMonthsAgo.slice(0, 7);

const ACAD_1 = 'mock_acad_1';
const ACAD_2 = 'mock_acad_2';
const ACAD_3 = 'mock_acad_3';

const B = {
  WHITE: 'Branca',
  GREY_WHITE: 'Cinza e Branca', GREY: 'Cinza', GREY_BLACK: 'Cinza e Preta',
  YELLOW_WHITE: 'Amarela e Branca', YELLOW: 'Amarela', YELLOW_BLACK: 'Amarela e Preta',
  ORANGE_WHITE: 'Laranja e Branca', ORANGE: 'Laranja', ORANGE_BLACK: 'Laranja e Preta',
  GREEN_WHITE: 'Verde e Branca', GREEN: 'Verde', GREEN_BLACK: 'Verde e Preta',
  BLUE: 'Azul', PURPLE: 'Roxa', BROWN: 'Marrom',
  BLACK: 'Preta', CORAL: 'Coral', RED: 'Vermelha',
};

const G = (g?: string) => g === 'M' ? 'Masculino' : g === 'F' ? 'Feminino' : g === 'Outro' ? 'Outro' : null;
const onlyDate = (s?: string) => s ? s.split('T')[0] : null;

// ─────────────────────────────────────────────────────────────────────────────
// DDL
// ─────────────────────────────────────────────────────────────────────────────

const DROP_TABLES = [
  'recycle_bin', 'products', 'chat_messages', 'calendar_events',
  'finance_transactions', 'attendance_records', 'class_sessions',
  'class_template_assigned_students', 'class_template_schedules', 'class_templates',
  'graduation_history', 'student_documents', 'students', 'instructors',
  'staff', 'users', 'academy_plans', 'academies',
];

const CREATE_STATEMENTS = [
  `CREATE TABLE academies (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    alias VARCHAR(100) UNIQUE,
    logo LONGTEXT,
    owner_name VARCHAR(255),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    cep VARCHAR(10),
    address VARCHAR(255),
    address_number VARCHAR(20),
    absence_limit INT DEFAULT 3,
    pix_key VARCHAR(255),
    pix_type ENUM('CPF','CNPJ','E-mail','Telefone','Aleatória'),
    bank_name VARCHAR(100),
    bank_agency VARCHAR(20),
    bank_account VARCHAR(30),
    current_plan ENUM('Free','Silver','Gold','Black Belt') DEFAULT 'Free',
    plan_status ENUM('Active','Expired','Trial','Suspended','Canceled') DEFAULT 'Trial',
    plan_expiration_date DATE,
    payment_warning_days INT DEFAULT 5,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE academy_plans (
    id VARCHAR(36) PRIMARY KEY,
    academy_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    duration_months INT NOT NULL,
    classes_per_week INT,
    price DECIMAL(10,2) NOT NULL,
    category VARCHAR(100),
    description TEXT,
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    academy_id VARCHAR(36),
    role ENUM('superuser','admin','instructor','staff','student','guest') NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    status ENUM('Active','Pending','Blocked') DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE SET NULL
  )`,
  `CREATE TABLE students (
    id VARCHAR(36) PRIMARY KEY,
    academy_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    belt ENUM('Branca','Cinza e Branca','Cinza','Cinza e Preta','Amarela e Branca','Amarela','Amarela e Preta','Laranja e Branca','Laranja','Laranja e Preta','Verde e Branca','Verde','Verde e Preta','Azul','Roxa','Marrom','Preta','Coral','Vermelha') DEFAULT 'Branca',
    stripes TINYINT DEFAULT 0,
    birth_date DATE,
    gender ENUM('Masculino','Feminino','Outro'),
    photo LONGTEXT,
    cpf VARCHAR(14),
    rg VARCHAR(20),
    weight DECIMAL(5,2),
    height DECIMAL(5,2),
    blood_type VARCHAR(5),
    emergency_contact VARCHAR(255),
    emergency_phone VARCHAR(20),
    cep VARCHAR(10),
    address VARCHAR(255),
    address_number VARCHAR(20),
    guardian_name VARCHAR(255),
    guardian_phone VARCHAR(20),
    guardian_email VARCHAR(255),
    guardian_cpf VARCHAR(14),
    guardian_rg VARCHAR(20),
    guardian_relation VARCHAR(100),
    guardian_profession VARCHAR(100),
    medical_notes TEXT,
    total_classes INT DEFAULT 0,
    total_hours INT DEFAULT 0,
    last_attendance DATE,
    absent_count INT DEFAULT 0,
    status ENUM('Active','Inactive','Dropped','Pending') DEFAULT 'Active',
    join_date DATE,
    last_graduation_date DATE,
    plan_id VARCHAR(36),
    next_payment_date DATE,
    absence_limit INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (plan_id) REFERENCES academy_plans(id) ON DELETE SET NULL
  )`,
  `CREATE TABLE student_documents (
    id VARCHAR(36) PRIMARY KEY,
    student_id VARCHAR(36) NOT NULL,
    name VARCHAR(255),
    url LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE graduation_history (
    id VARCHAR(36) PRIMARY KEY,
    student_id VARCHAR(36) NOT NULL,
    previous_belt VARCHAR(50),
    new_belt VARCHAR(50),
    previous_stripes TINYINT,
    new_stripes TINYINT,
    date DATE,
    instructor_id VARCHAR(36),
    notes TEXT,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE instructors (
    id VARCHAR(36) PRIMARY KEY,
    academy_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    belt ENUM('Branca','Cinza e Branca','Cinza','Cinza e Preta','Amarela e Branca','Amarela','Amarela e Preta','Laranja e Branca','Laranja','Laranja e Preta','Verde e Branca','Verde','Verde e Preta','Azul','Roxa','Marrom','Preta','Coral','Vermelha') DEFAULT 'Branca',
    stripes TINYINT DEFAULT 0,
    birth_date DATE,
    gender ENUM('Masculino','Feminino','Outro'),
    photo LONGTEXT,
    cpf VARCHAR(14),
    rg VARCHAR(20),
    weight DECIMAL(5,2),
    height DECIMAL(5,2),
    blood_type VARCHAR(5),
    marital_status VARCHAR(50),
    emergency_contact VARCHAR(255),
    emergency_phone VARCHAR(20),
    cep VARCHAR(10),
    address VARCHAR(255),
    address_number VARCHAR(20),
    specialties TEXT,
    medical_notes TEXT,
    status ENUM('Active','Inactive','Dropped','Pending') DEFAULT 'Active',
    join_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  )`,
  `CREATE TABLE staff (
    id VARCHAR(36) PRIMARY KEY,
    academy_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    photo LONGTEXT,
    birth_date DATE,
    gender ENUM('Masculino','Feminino','Outro'),
    position VARCHAR(100),
    cpf VARCHAR(14),
    rg VARCHAR(20),
    cep VARCHAR(10),
    address VARCHAR(255),
    address_number VARCHAR(20),
    medical_notes TEXT,
    status ENUM('Active','Inactive','Dropped','Pending') DEFAULT 'Active',
    join_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  )`,
  `CREATE TABLE class_templates (
    id VARCHAR(36) PRIMARY KEY,
    academy_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    duration_minutes INT NOT NULL,
    absence_limit INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE class_template_schedules (
    id VARCHAR(36) PRIMARY KEY,
    template_id VARCHAR(36) NOT NULL,
    day_of_week TINYINT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    FOREIGN KEY (template_id) REFERENCES class_templates(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE class_template_assigned_students (
    template_id VARCHAR(36) NOT NULL,
    student_id VARCHAR(36) NOT NULL,
    PRIMARY KEY (template_id, student_id),
    FOREIGN KEY (template_id) REFERENCES class_templates(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE class_sessions (
    id VARCHAR(36) PRIMARY KEY,
    academy_id VARCHAR(36) NOT NULL,
    name VARCHAR(255),
    template_id VARCHAR(36),
    date DATE NOT NULL,
    duration_minutes INT,
    instructor_id VARCHAR(36),
    status ENUM('In Progress','Finalized') DEFAULT 'In Progress',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES class_templates(id) ON DELETE SET NULL,
    FOREIGN KEY (instructor_id) REFERENCES instructors(id) ON DELETE SET NULL
  )`,
  `CREATE TABLE attendance_records (
    id VARCHAR(36) PRIMARY KEY,
    academy_id VARCHAR(36) NOT NULL,
    student_id VARCHAR(36) NOT NULL,
    class_id VARCHAR(36),
    date DATE NOT NULL,
    duration_minutes INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES class_sessions(id) ON DELETE SET NULL
  )`,
  `CREATE TABLE finance_transactions (
    id VARCHAR(36) PRIMARY KEY,
    academy_id VARCHAR(36) NOT NULL,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    type ENUM('income','expense') NOT NULL,
    category VARCHAR(100),
    date DATE NOT NULL,
    payment_method VARCHAR(100),
    status ENUM('paid','pending') DEFAULT 'paid',
    student_id VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL
  )`,
  `CREATE TABLE calendar_events (
    id VARCHAR(36) PRIMARY KEY,
    academy_id VARCHAR(36) NOT NULL,
    date DATE NOT NULL,
    reason VARCHAR(255),
    type ENUM('no-class','event') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE chat_messages (
    id VARCHAR(36) PRIMARY KEY,
    academy_id VARCHAR(36) NOT NULL,
    sender_id VARCHAR(36) NOT NULL,
    sender_name VARCHAR(255),
    sender_role ENUM('superuser','admin','instructor','staff') NOT NULL,
    content TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE products (
    id VARCHAR(36) PRIMARY KEY,
    academy_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    stock INT DEFAULT 0,
    category VARCHAR(100),
    image LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE recycle_bin (
    id VARCHAR(36) PRIMARY KEY,
    academy_id VARCHAR(36) NOT NULL,
    type ENUM('student','instructor','staff','template') NOT NULL,
    original_data LONGTEXT NOT NULL,
    deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE
  )`,
];

// ─────────────────────────────────────────────────────────────────────────────
// SEED DATA
// ─────────────────────────────────────────────────────────────────────────────

const ACADEMIES = [
  { id: ACAD_1, name: 'Academia NexFight', alias: 'nexfight', logo: 'https://images.unsplash.com/photo-1552072092-7f9b8d63efcb?q=80&w=400&h=400&auto=format&fit=crop', owner_name: 'Prof. Carlos Gracie Jr.', email: 'admin@oss.com', phone: '11999990000', cep: '01310-100', address: 'Av. Paulista', address_number: '1000', absence_limit: 4, pix_key: 'admin@oss.com', pix_type: 'E-mail', bank_name: 'Nubank', bank_agency: '0001', bank_account: '123456-7', current_plan: 'Gold', plan_status: 'Active', plan_expiration_date: twoMonthsFwd, payment_warning_days: 5 },
  { id: ACAD_2, name: 'Samurai BJJ', alias: 'samurai', logo: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=400&h=400&auto=format&fit=crop', owner_name: 'Prof. Takeshi Nakamura', email: 'admin@samurai.com', phone: '11888880000', cep: '04101-300', address: 'Rua das Flores', address_number: '500', absence_limit: 3, pix_key: '11888880000', pix_type: 'Telefone', bank_name: 'Itaú', bank_agency: '0274', bank_account: '987654-1', current_plan: 'Silver', plan_status: 'Active', plan_expiration_date: nextMonth, payment_warning_days: 7 },
  { id: ACAD_3, name: 'Dragão Fight', alias: 'dragao', logo: 'https://images.unsplash.com/photo-1517438476312-10d79c077509?q=80&w=400&h=400&auto=format&fit=crop', owner_name: 'Prof. Rodrigo Dragão', email: 'admin@dragao.com', phone: '21977770000', cep: '20040-020', address: 'Av. das Nações', address_number: '250', absence_limit: 5, pix_key: '12345678000190', pix_type: 'CNPJ', bank_name: 'Bradesco', bank_agency: '1234', bank_account: '56789-0', current_plan: 'Black Belt', plan_status: 'Active', plan_expiration_date: twoMonthsFwd, payment_warning_days: 3 },
];

const PLANS = [
  { id: 'ap1',  academy_id: ACAD_1, name: 'Mensal Adulto',     duration_months: 1, classes_per_week: 3, price: 150, category: 'Adultos',  description: 'Acesso 3x/semana para adultos' },
  { id: 'ap2',  academy_id: ACAD_1, name: 'Semestral Elite',   duration_months: 6, classes_per_week: 5, price: 800, category: 'Adultos',  description: 'Acesso ilimitado por 6 meses' },
  { id: 'ap3',  academy_id: ACAD_1, name: 'Plano Kids',        duration_months: 1, classes_per_week: 2, price: 120, category: 'Crianças', description: 'Turmas infantis 2x/semana' },
  { id: 'a2p1', academy_id: ACAD_2, name: 'Mensal Individual', duration_months: 1, classes_per_week: 3, price: 180, category: 'Adultos',  description: 'Treino 3x por semana' },
  { id: 'a2p2', academy_id: ACAD_2, name: 'Trimestral Família',duration_months: 3, classes_per_week: 5, price: 450, category: 'Família',  description: 'Pacote familiar trimestral' },
  { id: 'a2p3', academy_id: ACAD_2, name: 'Plano Juvenil',     duration_months: 1, classes_per_week: 2, price: 130, category: 'Crianças', description: 'Para crianças e adolescentes' },
  { id: 'a3p1', academy_id: ACAD_3, name: 'Mensal Standard',   duration_months: 1, classes_per_week: 3, price: 160, category: 'Adultos',  description: 'Acesso padrão para adultos' },
  { id: 'a3p2', academy_id: ACAD_3, name: 'Plano Família',     duration_months: 1, classes_per_week: 5, price: 280, category: 'Família',  description: 'Até 3 membros da família' },
  { id: 'a3p3', academy_id: ACAD_3, name: 'Trimestral Elite',  duration_months: 3, classes_per_week: 5, price: 420, category: 'Adultos',  description: 'Acesso ilimitado trimestral' },
  { id: 'a3p4', academy_id: ACAD_3, name: 'Plano Kids',        duration_months: 1, classes_per_week: 2, price: 110, category: 'Crianças', description: 'Turma infantil 2x/semana' },
];

const USERS_RAW = [
  { id: 'mock_user_1',         academy_id: ACAD_1, role: 'admin',      name: 'Admin NexFight',       email: 'admin@oss.com',         password: 'oss123' },
  { id: 'mock_instr_1',        academy_id: ACAD_1, role: 'instructor', name: 'Prof. Renato Silva',   email: 'instru@oss.com',        password: 'oss123' },
  { id: 'mock_staff_1',        academy_id: ACAD_1, role: 'staff',      name: 'Ana Secretaria',       email: 'colab@oss.com',         password: 'oss123' },
  { id: 'mock_student_user_1', academy_id: ACAD_1, role: 'student',    name: 'Carlos Oliveira',      email: 'aluno@oss.com',         password: 'oss123' },
  { id: 'a2_admin_1',          academy_id: ACAD_2, role: 'admin',      name: 'Admin Samurai',        email: 'admin@samurai.com',     password: 'sam123' },
  { id: 'a2_instr_1',          academy_id: ACAD_2, role: 'instructor', name: 'Prof. Kenji Nakamura', email: 'kenji@samurai.com',     password: 'sam123' },
  { id: 'a2_instr_2',          academy_id: ACAD_2, role: 'instructor', name: 'Prof. Camila Sousa',   email: 'camila@samurai.com',    password: 'sam123' },
  { id: 'a2_staff_1',          academy_id: ACAD_2, role: 'staff',      name: 'Carlos Recepção',      email: 'sec@samurai.com',       password: 'sam123' },
  { id: 'a2_student_user_1',   academy_id: ACAD_2, role: 'student',    name: 'Rodrigo Tanaka',       email: 'aluno@samurai.com',     password: 'sam123' },
  { id: 'a3_admin_1',          academy_id: ACAD_3, role: 'admin',      name: 'Admin Dragão',         email: 'admin@dragao.com',      password: 'drg123' },
  { id: 'a3_instr_1',          academy_id: ACAD_3, role: 'instructor', name: 'Prof. Diego Rocha',    email: 'diego@dragao.com',      password: 'drg123' },
  { id: 'a3_instr_2',          academy_id: ACAD_3, role: 'instructor', name: 'Prof. Leticia Vaz',    email: 'leticia@dragao.com',    password: 'drg123' },
  { id: 'a3_staff_1',          academy_id: ACAD_3, role: 'staff',      name: 'Bruno Atendimento',    email: 'atend@dragao.com',      password: 'drg123' },
  { id: 'a3_student_user_1',   academy_id: ACAD_3, role: 'student',    name: 'Amanda Ferreira',      email: 'aluno@dragao.com',      password: 'drg123' },
  { id: 'mock_superuser_1',    academy_id: null,   role: 'superuser',  name: 'Super User OSS',       email: 'super@oss.com',         password: 'super' },
];

type StudentSeed = {
  id: string; academy_id: string; name: string; email?: string | null; phone?: string | null;
  belt: string; stripes: number; birth_date?: string | null; gender?: string | null;
  cpf?: string | null; rg?: string | null; weight?: string | null; height?: string | null; blood_type?: string | null;
  address?: string | null; address_number?: string | null; cep?: string | null;
  emergency_contact?: string | null; emergency_phone?: string | null;
  guardian_name?: string | null; guardian_phone?: string | null; guardian_email?: string | null;
  guardian_cpf?: string | null; guardian_relation?: string | null; guardian_profession?: string | null;
  total_classes: number; total_hours: number; absent_count: number; status: string;
  join_date?: string | null; plan_id?: string | null; next_payment_date?: string | null;
  last_graduation_date?: string | null; last_attendance?: string | null;
  absence_limit?: number | null; photo?: string | null;
  graduation_history?: Array<{ id: string; previous_belt: string; new_belt: string; previous_stripes: number; new_stripes: number; date: string; instructor_id?: string | null; notes?: string | null }>;
};

const STUDENTS: StudentSeed[] = [
  // ── Academia 1 ──
  { id: 's1', academy_id: ACAD_1, name: 'Carlos Oliveira', email: 'aluno@oss.com', phone: '11988887777', belt: B.WHITE, stripes: 2, birth_date: '1995-04-12', gender: 'Masculino', cpf: '123.456.789-00', rg: '12.345.678-9', weight: '82', height: '178', blood_type: 'O+', address: 'Rua das Acácias', address_number: '45', cep: '01310-200', emergency_contact: 'Maria Oliveira', emergency_phone: '11988880001', total_classes: 45, total_hours: 68, absent_count: 1, status: 'Active', join_date: '2023-10-01', plan_id: 'ap1', next_payment_date: tomorrow, last_graduation_date: '2024-01-10', last_attendance: yesterday, photo: 'https://picsum.photos/seed/s1/400/400',
    graduation_history: [
      { id: 'gh_s1_1', previous_belt: B.WHITE, new_belt: B.WHITE, previous_stripes: 0, new_stripes: 1, date: '2023-12-01', instructor_id: 'i1', notes: '1ª fita' },
      { id: 'gh_s1_2', previous_belt: B.WHITE, new_belt: B.WHITE, previous_stripes: 1, new_stripes: 2, date: '2024-01-10', instructor_id: 'i1', notes: '2ª fita — excelente dedicação' },
    ] },
  { id: 's2', academy_id: ACAD_1, name: 'Juliana Santos', phone: '11977776666', belt: B.BLUE, stripes: 1, birth_date: '1998-08-22', gender: 'Feminino', cpf: '234.567.890-11', rg: '23.456.789-0', weight: '60', height: '165', blood_type: 'A+', address: 'Av. Rebouças', address_number: '200', cep: '05401-300', emergency_contact: 'Paulo Santos', emergency_phone: '11977770002', total_classes: 120, total_hours: 180, absent_count: 4, status: 'Active', join_date: '2022-05-15', plan_id: 'ap2', next_payment_date: nextWeek, last_graduation_date: '2023-11-20', last_attendance: twoDaysAgo, photo: 'https://picsum.photos/seed/s2/400/400',
    graduation_history: [
      { id: 'gh_s2_1', previous_belt: B.WHITE, new_belt: B.WHITE, previous_stripes: 0, new_stripes: 2, date: '2022-10-10', instructor_id: 'i1', notes: '2 fitas rápidas' },
      { id: 'gh_s2_2', previous_belt: B.WHITE, new_belt: B.WHITE, previous_stripes: 2, new_stripes: 4, date: '2023-03-05', instructor_id: 'i1', notes: '4 fitas' },
      { id: 'gh_s2_3', previous_belt: B.WHITE, new_belt: B.BLUE,  previous_stripes: 4, new_stripes: 0, date: '2023-09-15', instructor_id: 'i1', notes: 'Graduação para azul!' },
      { id: 'gh_s2_4', previous_belt: B.BLUE,  new_belt: B.BLUE,  previous_stripes: 0, new_stripes: 1, date: '2023-11-20', instructor_id: 'i2', notes: '1ª fita na azul' },
    ] },
  { id: 's3', academy_id: ACAD_1, name: 'Marcos Pereira', phone: '11966665555', belt: B.PURPLE, stripes: 3, birth_date: '1990-01-30', gender: 'Masculino', cpf: '345.678.901-22', weight: '90', height: '182', blood_type: 'B+', address: 'Rua Haddock Lobo', address_number: '789', cep: '01414-001', emergency_contact: 'Cláudia Pereira', emergency_phone: '11966660003', total_classes: 350, total_hours: 525, absent_count: 0, status: 'Active', join_date: '2020-02-10', plan_id: 'ap2', next_payment_date: twoMonthsFwd, last_graduation_date: '2023-06-15', last_attendance: today, photo: 'https://picsum.photos/seed/s3/400/400',
    graduation_history: [
      { id: 'gh_s3_1', previous_belt: B.WHITE,  new_belt: B.BLUE,   previous_stripes: 4, new_stripes: 0, date: '2021-01-20', instructor_id: 'i1', notes: 'Graduação para azul' },
      { id: 'gh_s3_2', previous_belt: B.BLUE,   new_belt: B.BLUE,   previous_stripes: 0, new_stripes: 4, date: '2022-05-10', instructor_id: 'i1', notes: 'Azul 4 fitas' },
      { id: 'gh_s3_3', previous_belt: B.BLUE,   new_belt: B.PURPLE, previous_stripes: 4, new_stripes: 0, date: '2022-12-03', instructor_id: 'i1', notes: 'Roxa! Campeão regional' },
      { id: 'gh_s3_4', previous_belt: B.PURPLE, new_belt: B.PURPLE, previous_stripes: 0, new_stripes: 3, date: '2023-06-15', instructor_id: 'i1', notes: '3 fitas na roxa' },
    ] },
  { id: 's4', academy_id: ACAD_1, name: 'Arthur Silva', guardian_phone: '11955554444', belt: B.GREY, stripes: 3, birth_date: '2016-05-10', gender: 'Masculino', guardian_name: 'Roberto Silva', guardian_relation: 'Pai', guardian_cpf: '456.789.012-33', total_classes: 30, total_hours: 30, absent_count: 0, status: 'Active', join_date: '2023-12-01', plan_id: 'ap3', next_payment_date: nextWeek, last_graduation_date: '2024-03-05', last_attendance: oneWeekAgo, photo: 'https://picsum.photos/seed/s4/400/400',
    graduation_history: [
      { id: 'gh_s4_1', previous_belt: B.WHITE, new_belt: B.GREY, previous_stripes: 0, new_stripes: 0, date: '2024-01-15', instructor_id: 'i2', notes: 'Faixa cinza!' },
      { id: 'gh_s4_2', previous_belt: B.GREY,  new_belt: B.GREY, previous_stripes: 0, new_stripes: 3, date: '2024-03-05', instructor_id: 'i2', notes: '3 fitas' },
    ] },
  { id: 's5', academy_id: ACAD_1, name: 'Mariana Costa', guardian_phone: '11944443333', belt: B.YELLOW, stripes: 1, birth_date: '2014-02-20', gender: 'Feminino', guardian_name: 'Ana Costa', guardian_relation: 'Mãe', guardian_email: 'ana.costa@email.com', total_classes: 80, total_hours: 80, absent_count: 2, status: 'Active', join_date: '2023-01-15', next_payment_date: nextMonth, last_graduation_date: '2024-02-12', last_attendance: threeDaysAgo, photo: 'https://picsum.photos/seed/s5/400/400',
    graduation_history: [
      { id: 'gh_s5_1', previous_belt: B.WHITE,  new_belt: B.GREY,   previous_stripes: 0, new_stripes: 0, date: '2023-04-10', instructor_id: 'i2', notes: 'Cinza' },
      { id: 'gh_s5_2', previous_belt: B.GREY,   new_belt: B.YELLOW, previous_stripes: 4, new_stripes: 0, date: '2023-10-20', instructor_id: 'i2', notes: 'Amarela!' },
      { id: 'gh_s5_3', previous_belt: B.YELLOW, new_belt: B.YELLOW, previous_stripes: 0, new_stripes: 1, date: '2024-02-12', instructor_id: 'i2', notes: '1ª fita' },
    ] },
  { id: 's6', academy_id: ACAD_1, name: 'Ricardo Mendes', phone: '11933332222', belt: B.BROWN, stripes: 0, birth_date: '1988-11-05', gender: 'Masculino', cpf: '567.890.123-44', weight: '88', height: '175', blood_type: 'AB-', address: 'Rua Oscar Freire', address_number: '321', cep: '01426-001', emergency_contact: 'Carla Mendes', emergency_phone: '11933330004', total_classes: 500, total_hours: 750, absent_count: 0, status: 'Active', join_date: '2018-03-20', next_payment_date: twoMonthsFwd, last_graduation_date: '2022-08-25', last_attendance: today, photo: 'https://picsum.photos/seed/s6/400/400',
    graduation_history: [
      { id: 'gh_s6_1', previous_belt: B.PURPLE, new_belt: B.BROWN, previous_stripes: 4, new_stripes: 0, date: '2022-08-25', instructor_id: 'i1', notes: 'Marrom — campeão masters' },
    ] },
  { id: 's7', academy_id: ACAD_1, name: 'Beatriz Lima', phone: '11922221111', belt: B.BLACK, stripes: 1, birth_date: '1985-07-14', gender: 'Feminino', cpf: '678.901.234-55', weight: '58', height: '162', blood_type: 'A-', address: 'Al. Lorena', address_number: '100', cep: '01424-001', emergency_contact: 'Paulo Lima', emergency_phone: '11922220005', total_classes: 1200, total_hours: 1800, absent_count: 0, status: 'Active', join_date: '2010-01-10', next_payment_date: nextMonth, last_graduation_date: '2021-12-01', last_attendance: yesterday, photo: 'https://picsum.photos/seed/s7/400/400',
    graduation_history: [
      { id: 'gh_s7_1', previous_belt: B.BROWN, new_belt: B.BLACK, previous_stripes: 4, new_stripes: 0, date: '2019-11-15', instructor_id: 'i1', notes: 'Faixa preta! 9 anos de dedicação' },
      { id: 'gh_s7_2', previous_belt: B.BLACK, new_belt: B.BLACK, previous_stripes: 0, new_stripes: 1, date: '2021-12-01', instructor_id: 'i1', notes: '1º grau' },
    ] },
  { id: 's8', academy_id: ACAD_1, name: 'Pedro Rocha', guardian_phone: '11911110000', belt: B.ORANGE, stripes: 4, birth_date: '2011-03-25', gender: 'Masculino', guardian_name: 'José Rocha', guardian_relation: 'Pai', guardian_profession: 'Engenheiro', total_classes: 150, total_hours: 150, absent_count: 5, status: 'Active', join_date: '2021-06-12', absence_limit: 6, next_payment_date: tomorrow, last_graduation_date: '2023-10-15', last_attendance: oneWeekAgo, photo: 'https://picsum.photos/seed/s8/400/400',
    graduation_history: [
      { id: 'gh_s8_1', previous_belt: B.GREY,   new_belt: B.YELLOW, previous_stripes: 4, new_stripes: 0, date: '2022-04-10', instructor_id: 'i2', notes: 'Amarela' },
      { id: 'gh_s8_2', previous_belt: B.YELLOW, new_belt: B.ORANGE, previous_stripes: 4, new_stripes: 0, date: '2023-01-20', instructor_id: 'i2', notes: 'Laranja!' },
      { id: 'gh_s8_3', previous_belt: B.ORANGE, new_belt: B.ORANGE, previous_stripes: 0, new_stripes: 4, date: '2023-10-15', instructor_id: 'i2', notes: '4 fitas' },
    ] },
  { id: 's9', academy_id: ACAD_1, name: 'Sofia Amaral', guardian_phone: '11900009999', belt: B.GREEN, stripes: 2, birth_date: '2009-09-02', gender: 'Feminino', guardian_name: 'Marta Amaral', guardian_relation: 'Mãe', guardian_email: 'marta@email.com', total_classes: 210, total_hours: 210, absent_count: 1, status: 'Active', join_date: '2020-11-05', next_payment_date: nextWeek, last_graduation_date: '2023-12-20', last_attendance: twoDaysAgo, photo: 'https://picsum.photos/seed/s9/400/400',
    graduation_history: [
      { id: 'gh_s9_1', previous_belt: B.ORANGE, new_belt: B.GREEN, previous_stripes: 4, new_stripes: 0, date: '2023-06-10', instructor_id: 'i2', notes: 'Verde!' },
      { id: 'gh_s9_2', previous_belt: B.GREEN,  new_belt: B.GREEN, previous_stripes: 0, new_stripes: 2, date: '2023-12-20', instructor_id: 'i2', notes: '2 fitas' },
    ] },
  { id: 's10', academy_id: ACAD_1, name: 'Lucas Ferreira', phone: '11987654321', belt: B.WHITE, stripes: 0, birth_date: '2000-01-15', gender: 'Masculino', address: 'Rua Consolação', address_number: '99', cep: '01301-000', total_classes: 5, total_hours: 8, absent_count: 0, status: 'Active', join_date: '2024-02-01', next_payment_date: nextWeek, photo: 'https://picsum.photos/seed/s10/400/400' },
  { id: 's11', academy_id: ACAD_1, name: 'Fernanda Gomes', phone: '11976543210', belt: B.BLUE, stripes: 2, birth_date: '1993-06-18', gender: 'Feminino', cpf: '789.012.345-66', total_classes: 95, total_hours: 143, absent_count: 12, status: 'Inactive', join_date: '2021-08-01', last_graduation_date: '2023-02-14', last_attendance: twoMonthsAgo, photo: 'https://picsum.photos/seed/s11/400/400' },
  { id: 's12', academy_id: ACAD_1, name: 'Rafael Nascimento', phone: '11965432109', belt: B.WHITE, stripes: 0, birth_date: '2002-11-03', gender: 'Masculino', total_classes: 0, total_hours: 0, absent_count: 0, status: 'Pending', join_date: today, photo: 'https://picsum.photos/seed/s12/400/400' },

  // ── Academia 2 ──
  { id: 'a2_s1', academy_id: ACAD_2, name: 'Rodrigo Tanaka', email: 'aluno@samurai.com', phone: '11877776666', belt: B.WHITE, stripes: 3, birth_date: '1996-07-22', gender: 'Masculino', cpf: '111.222.333-44', weight: '85', height: '180', blood_type: 'O+', address: 'Rua Liberdade', address_number: '310', cep: '01503-000', emergency_contact: 'Keiko Tanaka', emergency_phone: '11877770001', total_classes: 38, total_hours: 57, absent_count: 1, status: 'Active', join_date: '2024-01-10', plan_id: 'a2p1', next_payment_date: tomorrow, last_graduation_date: oneWeekAgo, last_attendance: yesterday, photo: 'https://picsum.photos/seed/a2s1/400/400',
    graduation_history: [
      { id: 'gh_a2s1_1', previous_belt: B.WHITE, new_belt: B.WHITE, previous_stripes: 0, new_stripes: 3, date: oneWeekAgo, instructor_id: 'a2_i1', notes: '3 fitas — ótima evolução' },
    ] },
  { id: 'a2_s2', academy_id: ACAD_2, name: 'Fernanda Kobayashi', phone: '11866665555', belt: B.BLUE, stripes: 2, birth_date: '1999-03-14', gender: 'Feminino', cpf: '222.333.444-55', weight: '55', height: '160', blood_type: 'A+', address: 'Av. São João', address_number: '450', cep: '01035-000', emergency_contact: 'Hiroshi Kobayashi', emergency_phone: '11866660002', total_classes: 145, total_hours: 218, absent_count: 3, status: 'Active', join_date: '2022-09-20', plan_id: 'a2p1', next_payment_date: nextWeek, last_graduation_date: '2024-02-20', last_attendance: today, photo: 'https://picsum.photos/seed/a2s2/400/400',
    graduation_history: [
      { id: 'gh_a2s2_1', previous_belt: B.WHITE, new_belt: B.BLUE, previous_stripes: 4, new_stripes: 0, date: '2023-10-05', instructor_id: 'a2_i1', notes: 'Graduação azul!' },
      { id: 'gh_a2s2_2', previous_belt: B.BLUE,  new_belt: B.BLUE, previous_stripes: 0, new_stripes: 2, date: '2024-02-20', instructor_id: 'a2_i1', notes: '2 fitas' },
    ] },
  { id: 'a2_s3', academy_id: ACAD_2, name: 'Thiago Nakamura', phone: '11855554444', belt: B.PURPLE, stripes: 1, birth_date: '1991-11-08', gender: 'Masculino', cpf: '333.444.555-66', weight: '78', height: '172', blood_type: 'B-', address: 'Rua 25 de Março', address_number: '88', cep: '01021-100', total_classes: 280, total_hours: 420, absent_count: 0, status: 'Active', join_date: '2020-06-15', plan_id: 'a2p2', next_payment_date: nextMonth, last_graduation_date: '2023-08-10', last_attendance: today, photo: 'https://picsum.photos/seed/a2s3/400/400',
    graduation_history: [
      { id: 'gh_a2s3_1', previous_belt: B.BLUE,   new_belt: B.PURPLE, previous_stripes: 4, new_stripes: 0, date: '2023-01-15', instructor_id: 'a2_i1', notes: 'Roxa!' },
      { id: 'gh_a2s3_2', previous_belt: B.PURPLE, new_belt: B.PURPLE, previous_stripes: 0, new_stripes: 1, date: '2023-08-10', instructor_id: 'a2_i1', notes: '1ª fita' },
    ] },
  { id: 'a2_s4', academy_id: ACAD_2, name: 'Isabela Morita', guardian_phone: '11844443333', belt: B.GREY, stripes: 2, birth_date: '2017-01-30', gender: 'Feminino', guardian_name: 'Yuki Morita', guardian_relation: 'Mãe', guardian_email: 'yuki@email.com', total_classes: 50, total_hours: 50, absent_count: 0, status: 'Active', join_date: '2024-03-01', plan_id: 'a2p3', next_payment_date: nextWeek, last_graduation_date: twoWeeksAgo, last_attendance: yesterday, photo: 'https://picsum.photos/seed/a2s4/400/400',
    graduation_history: [
      { id: 'gh_a2s4_1', previous_belt: B.WHITE, new_belt: B.GREY, previous_stripes: 0, new_stripes: 0, date: twoMonthsAgo, instructor_id: 'a2_i2', notes: 'Cinza!' },
      { id: 'gh_a2s4_2', previous_belt: B.GREY,  new_belt: B.GREY, previous_stripes: 0, new_stripes: 2, date: twoWeeksAgo,  instructor_id: 'a2_i2', notes: '2 fitas' },
    ] },
  { id: 'a2_s5', academy_id: ACAD_2, name: 'Eduardo Yamamoto', guardian_phone: '11833332222', belt: B.ORANGE, stripes: 0, birth_date: '2012-08-15', gender: 'Masculino', guardian_name: 'Hiroshi Yamamoto', guardian_relation: 'Pai', total_classes: 110, total_hours: 110, absent_count: 2, status: 'Active', join_date: '2022-04-10', plan_id: 'a2p3', next_payment_date: nextMonth, last_graduation_date: '2024-01-08', last_attendance: threeDaysAgo, photo: 'https://picsum.photos/seed/a2s5/400/400',
    graduation_history: [
      { id: 'gh_a2s5_1', previous_belt: B.YELLOW, new_belt: B.ORANGE, previous_stripes: 4, new_stripes: 0, date: '2024-01-08', instructor_id: 'a2_i2', notes: 'Laranja!' },
    ] },
  { id: 'a2_s6', academy_id: ACAD_2, name: 'Camila Tanaka', phone: '11822221111', belt: B.BROWN, stripes: 2, birth_date: '1987-05-22', gender: 'Feminino', cpf: '444.555.666-77', weight: '62', height: '163', blood_type: 'A-', address: 'Rua Vergueiro', address_number: '1500', cep: '01504-001', total_classes: 480, total_hours: 720, absent_count: 0, status: 'Active', join_date: '2017-02-01', plan_id: 'a2p2', next_payment_date: twoMonthsFwd, last_graduation_date: '2023-05-20', last_attendance: today, photo: 'https://picsum.photos/seed/a2s6/400/400' },
  { id: 'a2_s7', academy_id: ACAD_2, name: 'André Lima', phone: '11811110000', belt: B.BLACK, stripes: 0, birth_date: '1982-09-30', gender: 'Masculino', cpf: '555.666.777-88', weight: '92', height: '184', blood_type: 'O-', address: 'Rua Frei Caneca', address_number: '233', cep: '01307-001', total_classes: 980, total_hours: 1470, absent_count: 0, status: 'Active', join_date: '2008-05-10', plan_id: 'a2p2', next_payment_date: nextMonth, last_graduation_date: '2020-07-12', last_attendance: yesterday, photo: 'https://picsum.photos/seed/a2s7/400/400' },
  { id: 'a2_s8', academy_id: ACAD_2, name: 'Marina Souza', guardian_phone: '11800009999', belt: B.YELLOW, stripes: 3, birth_date: '2013-04-05', gender: 'Feminino', guardian_name: 'Claudia Souza', guardian_relation: 'Mãe', total_classes: 72, total_hours: 72, absent_count: 1, status: 'Active', join_date: '2023-02-20', plan_id: 'a2p3', next_payment_date: nextWeek, last_graduation_date: twoWeeksAgo, last_attendance: twoDaysAgo, photo: 'https://picsum.photos/seed/a2s8/400/400' },
  { id: 'a2_s9', academy_id: ACAD_2, name: 'Gabriel Oliveira', phone: '11799998888', belt: B.WHITE, stripes: 1, birth_date: '2001-12-10', gender: 'Masculino', total_classes: 12, total_hours: 18, absent_count: 8, status: 'Inactive', join_date: '2024-05-01', last_attendance: twoMonthsAgo, photo: 'https://picsum.photos/seed/a2s9/400/400' },
  { id: 'a2_s10', academy_id: ACAD_2, name: 'Vanessa Rodrigues', phone: '11788887777', belt: B.WHITE, stripes: 0, birth_date: '1997-08-28', gender: 'Feminino', total_classes: 0, total_hours: 0, absent_count: 0, status: 'Pending', join_date: today, photo: 'https://picsum.photos/seed/a2s10/400/400' },

  // ── Academia 3 ──
  { id: 'a3_s1', academy_id: ACAD_3, name: 'Diego Rocha', phone: '21988887777', belt: B.WHITE, stripes: 1, birth_date: '1997-02-14', gender: 'Masculino', cpf: '600.700.800-99', weight: '80', height: '177', blood_type: 'B+', address: 'Rua Bambina', address_number: '12', cep: '22251-050', emergency_contact: 'Sandra Rocha', emergency_phone: '21988880001', total_classes: 22, total_hours: 33, absent_count: 0, status: 'Active', join_date: '2024-02-01', plan_id: 'a3p1', next_payment_date: tomorrow, last_graduation_date: twoWeeksAgo, last_attendance: yesterday, photo: 'https://picsum.photos/seed/a3s1/400/400' },
  { id: 'a3_s2', academy_id: ACAD_3, name: 'Amanda Ferreira', email: 'aluno@dragao.com', phone: '21977776666', belt: B.BLUE, stripes: 3, birth_date: '2000-06-20', gender: 'Feminino', cpf: '700.800.900-11', weight: '57', height: '164', blood_type: 'A+', address: 'Rua Voluntários da Pátria', address_number: '350', cep: '22270-000', emergency_contact: 'Marco Ferreira', emergency_phone: '21977770002', total_classes: 195, total_hours: 293, absent_count: 2, status: 'Active', join_date: '2022-11-10', plan_id: 'a3p3', next_payment_date: nextWeek, last_graduation_date: '2024-03-15', last_attendance: today, photo: 'https://picsum.photos/seed/a3s2/400/400',
    graduation_history: [
      { id: 'gh_a3s2_1', previous_belt: B.WHITE, new_belt: B.BLUE, previous_stripes: 4, new_stripes: 0, date: '2023-08-20', instructor_id: 'a3_i1', notes: 'Azul!' },
      { id: 'gh_a3s2_2', previous_belt: B.BLUE,  new_belt: B.BLUE, previous_stripes: 0, new_stripes: 3, date: '2024-03-15', instructor_id: 'a3_i1', notes: '3 fitas — Parabéns!' },
    ] },
  { id: 'a3_s3', academy_id: ACAD_3, name: 'Felipe Castro', phone: '21966665555', belt: B.PURPLE, stripes: 2, birth_date: '1989-09-17', gender: 'Masculino', cpf: '800.900.011-22', weight: '86', height: '179', blood_type: 'O+', address: 'Rua Dias da Cruz', address_number: '77', cep: '20720-120', total_classes: 320, total_hours: 480, absent_count: 1, status: 'Active', join_date: '2020-03-15', plan_id: 'a3p3', next_payment_date: nextMonth, last_graduation_date: '2023-09-05', last_attendance: today, photo: 'https://picsum.photos/seed/a3s3/400/400' },
  { id: 'a3_s4', academy_id: ACAD_3, name: 'Larissa Pinto', guardian_phone: '21955554444', belt: B.GREY, stripes: 4, birth_date: '2015-12-03', gender: 'Feminino', guardian_name: 'Roberta Pinto', guardian_relation: 'Mãe', total_classes: 65, total_hours: 65, absent_count: 1, status: 'Active', join_date: '2023-08-10', plan_id: 'a3p4', next_payment_date: nextWeek, last_graduation_date: lastMonth, last_attendance: yesterday, photo: 'https://picsum.photos/seed/a3s4/400/400' },
  { id: 'a3_s5', academy_id: ACAD_3, name: 'Gabriel Melo', guardian_phone: '21944443333', belt: B.YELLOW, stripes: 2, birth_date: '2013-07-11', gender: 'Masculino', guardian_name: 'Paulo Melo', guardian_relation: 'Pai', total_classes: 88, total_hours: 88, absent_count: 3, status: 'Active', join_date: '2022-12-01', plan_id: 'a3p4', next_payment_date: nextMonth, last_graduation_date: '2024-01-25', last_attendance: twoDaysAgo, photo: 'https://picsum.photos/seed/a3s5/400/400' },
  { id: 'a3_s6', academy_id: ACAD_3, name: 'Juliana Ramos', phone: '21933332222', belt: B.BROWN, stripes: 1, birth_date: '1986-04-30', gender: 'Feminino', cpf: '900.011.122-33', weight: '64', height: '166', blood_type: 'AB+', address: 'Rua Marquês de Abrantes', address_number: '55', cep: '22230-060', total_classes: 460, total_hours: 690, absent_count: 0, status: 'Active', join_date: '2016-07-01', plan_id: 'a3p2', next_payment_date: twoMonthsFwd, last_graduation_date: '2023-03-10', last_attendance: today, photo: 'https://picsum.photos/seed/a3s6/400/400' },
  { id: 'a3_s7', academy_id: ACAD_3, name: 'Pedro Monteiro', phone: '21922221111', belt: B.BLACK, stripes: 2, birth_date: '1984-01-20', gender: 'Masculino', cpf: '011.122.233-44', weight: '94', height: '186', blood_type: 'O-', address: 'Av. Ataulfo de Paiva', address_number: '620', cep: '22440-033', total_classes: 1100, total_hours: 1650, absent_count: 0, status: 'Active', join_date: '2007-09-15', plan_id: 'a3p3', next_payment_date: nextMonth, last_graduation_date: '2022-11-20', last_attendance: today, photo: 'https://picsum.photos/seed/a3s7/400/400' },
  { id: 'a3_s8', academy_id: ACAD_3, name: 'Gustavo Santos', guardian_phone: '21911110000', belt: B.ORANGE, stripes: 3, birth_date: '2010-05-18', gender: 'Masculino', guardian_name: 'Cláudia Santos', guardian_relation: 'Mãe', total_classes: 140, total_hours: 140, absent_count: 4, status: 'Active', join_date: '2021-09-20', plan_id: 'a3p4', absence_limit: 6, next_payment_date: tomorrow, last_graduation_date: '2023-11-30', last_attendance: oneWeekAgo, photo: 'https://picsum.photos/seed/a3s8/400/400' },
  { id: 'a3_s9', academy_id: ACAD_3, name: 'Natália Costa', guardian_phone: '21900009999', belt: B.GREEN, stripes: 0, birth_date: '2008-10-22', gender: 'Feminino', guardian_name: 'Fernanda Costa', guardian_relation: 'Mãe', total_classes: 190, total_hours: 190, absent_count: 2, status: 'Active', join_date: '2020-07-15', plan_id: 'a3p4', next_payment_date: nextWeek, last_graduation_date: '2024-04-05', last_attendance: threeDaysAgo, photo: 'https://picsum.photos/seed/a3s9/400/400' },
  { id: 'a3_s10', academy_id: ACAD_3, name: 'Rafael Alves', phone: '21889998888', belt: B.WHITE, stripes: 2, birth_date: '1995-03-08', gender: 'Masculino', total_classes: 30, total_hours: 45, absent_count: 10, status: 'Inactive', join_date: '2023-06-01', last_attendance: twoMonthsAgo, photo: 'https://picsum.photos/seed/a3s10/400/400' },
  { id: 'a3_s11', academy_id: ACAD_3, name: 'Marcela Dias', phone: '21878887777', belt: B.BLUE, stripes: 0, birth_date: '1994-11-15', gender: 'Feminino', total_classes: 60, total_hours: 90, absent_count: 15, status: 'Dropped', join_date: '2023-01-10', last_attendance: twoMonthsAgo, photo: 'https://picsum.photos/seed/a3s11/400/400' },
];

const INSTRUCTORS = [
  { id: 'i1', academy_id: ACAD_1, name: 'Prof. Renato Silva', email: 'instru@oss.com', phone: '11999998888', belt: B.BLACK, stripes: 2, birth_date: '1980-05-15', gender: 'Masculino', marital_status: 'Casado', cpf: '100.200.300-40', rg: '10.203.040-5', address: 'Rua Bela Cintra', address_number: '200', cep: '01415-001', specialties: 'No-Gi, Competição, Adultos', status: 'Active', join_date: '2010-01-01', photo: 'https://picsum.photos/seed/i1/400/400' },
  { id: 'i2', academy_id: ACAD_1, name: 'Prof. Ana Carolina', email: 'ana@oss.com', phone: '11988887777', belt: B.PURPLE, stripes: 4, birth_date: '1992-03-22', gender: 'Feminino', marital_status: 'Solteiro', cpf: '200.300.400-50', address: 'Rua Augusta', address_number: '500', cep: '01305-000', specialties: 'Kids, Iniciantes, Feminino', status: 'Active', join_date: '2015-06-01', photo: 'https://picsum.photos/seed/i2/400/400' },
  { id: 'a2_i1', academy_id: ACAD_2, name: 'Prof. Kenji Nakamura', email: 'kenji@samurai.com', phone: '11877778888', belt: B.BLACK, stripes: 3, birth_date: '1978-11-10', gender: 'Masculino', marital_status: 'Casado', cpf: '300.400.500-60', address: 'Rua da Liberdade', address_number: '100', cep: '01503-001', specialties: 'Competição, No-Gi, Adultos, Defesa Pessoal', status: 'Active', join_date: '2008-01-15', photo: 'https://picsum.photos/seed/a2i1/400/400' },
  { id: 'a2_i2', academy_id: ACAD_2, name: 'Prof. Camila Sousa', email: 'camila@samurai.com', phone: '11866667777', belt: B.PURPLE, stripes: 2, birth_date: '1994-07-08', gender: 'Feminino', marital_status: 'Solteiro', cpf: '400.500.600-70', address: 'Av. Liberdade', address_number: '300', cep: '01502-000', specialties: 'Kids, Juvenil, Feminino, Iniciantes', status: 'Active', join_date: '2018-03-01', photo: 'https://picsum.photos/seed/a2i2/400/400' },
  { id: 'a3_i1', academy_id: ACAD_3, name: 'Prof. Diego Rocha Jr.', email: 'diego@dragao.com', phone: '21977778888', belt: B.BLACK, stripes: 4, birth_date: '1976-08-25', gender: 'Masculino', marital_status: 'Casado', cpf: '500.600.700-80', address: 'Rua Senador Vergueiro', address_number: '40', cep: '22230-000', specialties: 'Adultos, Competição, No-Gi, Grappling', status: 'Active', join_date: '2005-04-01', photo: 'https://picsum.photos/seed/a3i1/400/400' },
  { id: 'a3_i2', academy_id: ACAD_3, name: 'Prof. Leticia Vaz', email: 'leticia@dragao.com', phone: '21966667777', belt: B.BROWN, stripes: 3, birth_date: '1990-02-16', gender: 'Feminino', marital_status: 'Casado', cpf: '600.700.800-90', address: 'Rua Dias Ferreira', address_number: '190', cep: '22431-050', specialties: 'Kids, Feminino, Iniciantes', status: 'Active', join_date: '2014-08-01', photo: 'https://picsum.photos/seed/a3i2/400/400' },
];

const STAFFS = [
  { id: 'st1',    academy_id: ACAD_1, name: 'Ana Secretaria',     email: 'colab@oss.com',   phone: '11977776666', birth_date: '1995-07-10', gender: 'Feminino', status: 'Active', join_date: '2022-01-15', position: 'Secretária',         address: 'Rua da Consolação', address_number: '300', cep: '01302-000', photo: 'https://picsum.photos/seed/st1/400/400' },
  { id: 'st2',    academy_id: ACAD_1, name: 'Bruno Limpeza',      email: 'bruno@oss.com',   phone: '11966665555', birth_date: '1988-12-05', gender: 'Masculino', status: 'Active', join_date: '2023-03-01', position: 'Auxiliar de Serviços', photo: 'https://picsum.photos/seed/st2/400/400' },
  { id: 'a2_st1', academy_id: ACAD_2, name: 'Carlos Recepção',    email: 'sec@samurai.com', phone: '11855556666', birth_date: '1991-04-18', gender: 'Masculino', status: 'Active', join_date: '2021-11-01', position: 'Recepcionista',       address: 'Rua da Mooca', address_number: '512', cep: '03104-000', photo: 'https://picsum.photos/seed/a2st1/400/400' },
  { id: 'a3_st1', academy_id: ACAD_3, name: 'Bruno Atendimento',  email: 'atend@dragao.com',phone: '21955556666', birth_date: '1993-09-27', gender: 'Masculino', status: 'Active', join_date: '2022-05-10', position: 'Atendente',           address: 'Rua Catete', address_number: '88', cep: '22220-000', photo: 'https://picsum.photos/seed/a3st1/400/400' },
];

type TemplateSeed = {
  id: string; academy_id: string; name: string; duration_minutes: number; absence_limit?: number | null;
  assigned: string[];
  schedules: Array<{ day_of_week: number; start_time: string; end_time: string }>;
};

const TEMPLATES: TemplateSeed[] = [
  { id: 't1', academy_id: ACAD_1, name: 'Kids 5-9 anos',    duration_minutes: 60,  absence_limit: 6, assigned: ['s4','s5'],       schedules: [{ day_of_week: 1, start_time: '18:00', end_time: '19:00' }, { day_of_week: 3, start_time: '18:00', end_time: '19:00' }] },
  { id: 't2', academy_id: ACAD_1, name: 'Kids 10-15 anos',  duration_minutes: 60,  absence_limit: 5, assigned: ['s8','s9'],       schedules: [{ day_of_week: 2, start_time: '18:00', end_time: '19:00' }, { day_of_week: 4, start_time: '18:00', end_time: '19:00' }] },
  { id: 't3', academy_id: ACAD_1, name: 'Adulto Iniciante', duration_minutes: 90,                    assigned: ['s1','s10','s2'], schedules: [{ day_of_week: 1, start_time: '19:30', end_time: '21:00' }, { day_of_week: 3, start_time: '19:30', end_time: '21:00' }, { day_of_week: 5, start_time: '19:00', end_time: '20:30' }] },
  { id: 't4', academy_id: ACAD_1, name: 'Adulto Avançado',  duration_minutes: 120,                   assigned: ['s3','s6','s7'],  schedules: [{ day_of_week: 2, start_time: '19:30', end_time: '21:30' }, { day_of_week: 4, start_time: '19:30', end_time: '21:30' }, { day_of_week: 6, start_time: '10:00', end_time: '12:00' }] },
  { id: 'a2_t1', academy_id: ACAD_2, name: 'Infantil A (5-12 anos)',  duration_minutes: 60,  absence_limit: 5, assigned: ['a2_s4','a2_s5','a2_s8'], schedules: [{ day_of_week: 1, start_time: '17:30', end_time: '18:30' }, { day_of_week: 3, start_time: '17:30', end_time: '18:30' }] },
  { id: 'a2_t2', academy_id: ACAD_2, name: 'Infantil B (13-17 anos)', duration_minutes: 75,                    assigned: [],                        schedules: [{ day_of_week: 2, start_time: '17:00', end_time: '18:15' }, { day_of_week: 4, start_time: '17:00', end_time: '18:15' }] },
  { id: 'a2_t3', academy_id: ACAD_2, name: 'Adulto Básico',           duration_minutes: 90,                    assigned: ['a2_s1','a2_s2'],         schedules: [{ day_of_week: 1, start_time: '20:00', end_time: '21:30' }, { day_of_week: 3, start_time: '20:00', end_time: '21:30' }, { day_of_week: 5, start_time: '19:30', end_time: '21:00' }] },
  { id: 'a2_t4', academy_id: ACAD_2, name: 'Competição',              duration_minutes: 120,                   assigned: ['a2_s3','a2_s6','a2_s7'], schedules: [{ day_of_week: 2, start_time: '19:00', end_time: '21:00' }, { day_of_week: 4, start_time: '19:00', end_time: '21:00' }, { day_of_week: 6, start_time: '09:00', end_time: '11:00' }] },
  { id: 'a3_t1', academy_id: ACAD_3, name: 'Kids Dragon (6-11 anos)', duration_minutes: 60,  absence_limit: 6, assigned: ['a3_s4','a3_s5','a3_s8'], schedules: [{ day_of_week: 1, start_time: '17:00', end_time: '18:00' }, { day_of_week: 3, start_time: '17:00', end_time: '18:00' }] },
  { id: 'a3_t2', academy_id: ACAD_3, name: 'Juvenil Dragon (12-17)',  duration_minutes: 75,                    assigned: ['a3_s9'],                 schedules: [{ day_of_week: 2, start_time: '17:30', end_time: '18:45' }, { day_of_week: 5, start_time: '17:30', end_time: '18:45' }] },
  { id: 'a3_t3', academy_id: ACAD_3, name: 'Adulto Dragon',           duration_minutes: 90,                    assigned: ['a3_s1','a3_s2','a3_s3'], schedules: [{ day_of_week: 1, start_time: '20:00', end_time: '21:30' }, { day_of_week: 3, start_time: '20:00', end_time: '21:30' }, { day_of_week: 5, start_time: '20:00', end_time: '21:30' }] },
  { id: 'a3_t4', academy_id: ACAD_3, name: 'Elite / Competição',      duration_minutes: 120,                   assigned: ['a3_s6','a3_s7'],         schedules: [{ day_of_week: 2, start_time: '19:00', end_time: '21:00' }, { day_of_week: 4, start_time: '19:00', end_time: '21:00' }, { day_of_week: 6, start_time: '08:00', end_time: '10:00' }] },
];

const SESSIONS = [
  { id: 'class_active_1',    academy_id: ACAD_1, name: 'Adulto Iniciante (Noite)', template_id: 't3',    date: today,        duration_minutes: 90,  instructor_id: 'i1',    status: 'In Progress' },
  { id: 'class_past_1',      academy_id: ACAD_1, name: 'Kids 5-9 anos (Seg/Qua)',  template_id: 't1',    date: yesterday,    duration_minutes: 60,  instructor_id: 'i2',    status: 'Finalized' },
  { id: 'class_past_2',      academy_id: ACAD_1, name: 'Adulto Avançado',          template_id: 't4',    date: twoDaysAgo,   duration_minutes: 120, instructor_id: 'i1',    status: 'Finalized' },
  { id: 'class_past_3',      academy_id: ACAD_1, name: 'Kids 10-15 anos',          template_id: 't2',    date: threeDaysAgo, duration_minutes: 60,  instructor_id: 'i2',    status: 'Finalized' },
  { id: 'class_past_4',      academy_id: ACAD_1, name: 'Adulto Iniciante (Noite)', template_id: 't3',    date: oneWeekAgo,   duration_minutes: 90,  instructor_id: 'i1',    status: 'Finalized' },
  { id: 'a2_class_active_1', academy_id: ACAD_2, name: 'Adulto Básico (Noite)',    template_id: 'a2_t3', date: today,        duration_minutes: 90,  instructor_id: 'a2_i1', status: 'In Progress' },
  { id: 'a2_class_past_1',   academy_id: ACAD_2, name: 'Infantil A',               template_id: 'a2_t1', date: yesterday,    duration_minutes: 60,  instructor_id: 'a2_i2', status: 'Finalized' },
  { id: 'a2_class_past_2',   academy_id: ACAD_2, name: 'Competição (Noite)',       template_id: 'a2_t4', date: twoDaysAgo,   duration_minutes: 120, instructor_id: 'a2_i1', status: 'Finalized' },
  { id: 'a2_class_past_3',   academy_id: ACAD_2, name: 'Adulto Básico (Noite)',    template_id: 'a2_t3', date: oneWeekAgo,   duration_minutes: 90,  instructor_id: 'a2_i1', status: 'Finalized' },
  { id: 'a3_class_active_1', academy_id: ACAD_3, name: 'Adulto Dragon (Noite)',    template_id: 'a3_t3', date: today,        duration_minutes: 90,  instructor_id: 'a3_i1', status: 'In Progress' },
  { id: 'a3_class_past_1',   academy_id: ACAD_3, name: 'Kids Dragon',              template_id: 'a3_t1', date: yesterday,    duration_minutes: 60,  instructor_id: 'a3_i2', status: 'Finalized' },
  { id: 'a3_class_past_2',   academy_id: ACAD_3, name: 'Elite / Competição',       template_id: 'a3_t4', date: twoDaysAgo,   duration_minutes: 120, instructor_id: 'a3_i1', status: 'Finalized' },
  { id: 'a3_class_past_3',   academy_id: ACAD_3, name: 'Adulto Dragon (Noite)',    template_id: 'a3_t3', date: oneWeekAgo,   duration_minutes: 90,  instructor_id: 'a3_i1', status: 'Finalized' },
];

const ATTENDANCE = [
  { id: 'att_1',  academy_id: ACAD_1, student_id: 's4',  class_id: 'class_past_1', date: yesterday,    duration_minutes: 60 },
  { id: 'att_2',  academy_id: ACAD_1, student_id: 's5',  class_id: 'class_past_1', date: yesterday,    duration_minutes: 60 },
  { id: 'att_3',  academy_id: ACAD_1, student_id: 's3',  class_id: 'class_past_2', date: twoDaysAgo,   duration_minutes: 120 },
  { id: 'att_4',  academy_id: ACAD_1, student_id: 's6',  class_id: 'class_past_2', date: twoDaysAgo,   duration_minutes: 120 },
  { id: 'att_5',  academy_id: ACAD_1, student_id: 's7',  class_id: 'class_past_2', date: twoDaysAgo,   duration_minutes: 120 },
  { id: 'att_6',  academy_id: ACAD_1, student_id: 's8',  class_id: 'class_past_3', date: threeDaysAgo, duration_minutes: 60 },
  { id: 'att_7',  academy_id: ACAD_1, student_id: 's9',  class_id: 'class_past_3', date: threeDaysAgo, duration_minutes: 60 },
  { id: 'att_8',  academy_id: ACAD_1, student_id: 's1',  class_id: 'class_past_4', date: oneWeekAgo,   duration_minutes: 90 },
  { id: 'att_9',  academy_id: ACAD_1, student_id: 's2',  class_id: 'class_past_4', date: oneWeekAgo,   duration_minutes: 90 },
  { id: 'att_10', academy_id: ACAD_1, student_id: 's10', class_id: 'class_past_4', date: oneWeekAgo,   duration_minutes: 90 },
  { id: 'a2_att_1', academy_id: ACAD_2, student_id: 'a2_s4', class_id: 'a2_class_past_1', date: yesterday,  duration_minutes: 60 },
  { id: 'a2_att_2', academy_id: ACAD_2, student_id: 'a2_s5', class_id: 'a2_class_past_1', date: yesterday,  duration_minutes: 60 },
  { id: 'a2_att_3', academy_id: ACAD_2, student_id: 'a2_s8', class_id: 'a2_class_past_1', date: yesterday,  duration_minutes: 60 },
  { id: 'a2_att_4', academy_id: ACAD_2, student_id: 'a2_s3', class_id: 'a2_class_past_2', date: twoDaysAgo, duration_minutes: 120 },
  { id: 'a2_att_5', academy_id: ACAD_2, student_id: 'a2_s6', class_id: 'a2_class_past_2', date: twoDaysAgo, duration_minutes: 120 },
  { id: 'a2_att_6', academy_id: ACAD_2, student_id: 'a2_s7', class_id: 'a2_class_past_2', date: twoDaysAgo, duration_minutes: 120 },
  { id: 'a2_att_7', academy_id: ACAD_2, student_id: 'a2_s1', class_id: 'a2_class_past_3', date: oneWeekAgo, duration_minutes: 90 },
  { id: 'a2_att_8', academy_id: ACAD_2, student_id: 'a2_s3', class_id: 'a2_class_past_3', date: oneWeekAgo, duration_minutes: 90 },
  { id: 'a3_att_1', academy_id: ACAD_3, student_id: 'a3_s4', class_id: 'a3_class_past_1', date: yesterday,  duration_minutes: 60 },
  { id: 'a3_att_2', academy_id: ACAD_3, student_id: 'a3_s5', class_id: 'a3_class_past_1', date: yesterday,  duration_minutes: 60 },
  { id: 'a3_att_3', academy_id: ACAD_3, student_id: 'a3_s8', class_id: 'a3_class_past_1', date: yesterday,  duration_minutes: 60 },
  { id: 'a3_att_4', academy_id: ACAD_3, student_id: 'a3_s6', class_id: 'a3_class_past_2', date: twoDaysAgo, duration_minutes: 120 },
  { id: 'a3_att_5', academy_id: ACAD_3, student_id: 'a3_s7', class_id: 'a3_class_past_2', date: twoDaysAgo, duration_minutes: 120 },
  { id: 'a3_att_6', academy_id: ACAD_3, student_id: 'a3_s1', class_id: 'a3_class_past_3', date: oneWeekAgo, duration_minutes: 90 },
  { id: 'a3_att_7', academy_id: ACAD_3, student_id: 'a3_s2', class_id: 'a3_class_past_3', date: oneWeekAgo, duration_minutes: 90 },
  { id: 'a3_att_8', academy_id: ACAD_3, student_id: 'a3_s3', class_id: 'a3_class_past_3', date: oneWeekAgo, duration_minutes: 90 },
];

const TRANSACTIONS = [
  { id: 'tx1',  academy_id: ACAD_1, description: 'Mensalidade - Carlos Oliveira',   amount: 150,  type: 'income',  category: 'Mensalidade',      date: `${curYM}-01`, payment_method: 'PIX',               status: 'paid',    student_id: 's1' },
  { id: 'tx2',  academy_id: ACAD_1, description: 'Mensalidade - Juliana Santos',    amount: 800,  type: 'income',  category: 'Mensalidade',      date: `${curYM}-02`, payment_method: 'PIX',               status: 'paid',    student_id: 's2' },
  { id: 'tx3',  academy_id: ACAD_1, description: 'Mensalidade - Marcos Pereira',    amount: 800,  type: 'income',  category: 'Mensalidade',      date: `${curYM}-03`, payment_method: 'Cartão de Crédito', status: 'paid',    student_id: 's3' },
  { id: 'tx4',  academy_id: ACAD_1, description: 'Plano Kids - Arthur Silva',       amount: 120,  type: 'income',  category: 'Mensalidade',      date: `${curYM}-03`, payment_method: 'PIX',               status: 'paid',    student_id: 's4' },
  { id: 'tx5',  academy_id: ACAD_1, description: 'Aluguel do espaço',               amount: 2500, type: 'expense', category: 'Aluguel',          date: `${curYM}-05`, payment_method: 'Transferência',     status: 'paid' },
  { id: 'tx6',  academy_id: ACAD_1, description: 'Energia elétrica',                amount: 420,  type: 'expense', category: 'Energia/Água',     date: `${curYM}-07`, payment_method: 'Débito Automático', status: 'paid' },
  { id: 'tx7',  academy_id: ACAD_1, description: 'Mensalidade - Lucas Ferreira',    amount: 150,  type: 'income',  category: 'Mensalidade',      date: `${curYM}-08`, payment_method: 'Dinheiro',          status: 'pending', student_id: 's10' },
  { id: 'tx8',  academy_id: ACAD_1, description: 'Venda - Kimono adulto A2',        amount: 280,  type: 'income',  category: 'Venda de Produto', date: `${curYM}-10`, payment_method: 'PIX',               status: 'paid' },
  { id: 'tx9',  academy_id: ACAD_1, description: 'Manutenção tatame',               amount: 350,  type: 'expense', category: 'Manutenção',       date: `${lastYM}-20`,payment_method: 'Dinheiro',          status: 'paid' },
  { id: 'tx10', academy_id: ACAD_1, description: 'Salário - Prof. Ana Carolina',    amount: 1800, type: 'expense', category: 'Salários',         date: `${lastYM}-28`,payment_method: 'Transferência',     status: 'paid' },
  { id: 'tx11', academy_id: ACAD_1, description: 'Matrícula - Rafael Nascimento',   amount: 80,   type: 'income',  category: 'Matrícula',        date: today,         payment_method: 'PIX',               status: 'paid' },
  { id: 'tx12', academy_id: ACAD_1, description: 'Mensalidade - Beatriz Lima',      amount: 150,  type: 'income',  category: 'Mensalidade',      date: `${curYM}-05`, payment_method: 'PIX',               status: 'paid',    student_id: 's7' },
  { id: 'tx13', academy_id: ACAD_1, description: 'Venda - Camiseta NexFight (x3)',  amount: 195,  type: 'income',  category: 'Venda de Produto', date: `${curYM}-12`, payment_method: 'Dinheiro',          status: 'paid' },
  { id: 'tx14', academy_id: ACAD_1, description: 'Internet / Streaming',            amount: 150,  type: 'expense', category: 'Outros',           date: `${curYM}-10`, payment_method: 'Débito Automático', status: 'paid' },
  { id: 'tx15', academy_id: ACAD_1, description: 'Mensalidade - Ricardo Mendes',    amount: 150,  type: 'income',  category: 'Mensalidade',      date: `${curYM}-04`, payment_method: 'Cartão de Débito',  status: 'paid',    student_id: 's6' },
  { id: 'tx16', academy_id: ACAD_1, description: 'Plano Kids - Pedro Rocha',        amount: 120,  type: 'income',  category: 'Mensalidade',      date: `${curYM}-06`, payment_method: 'PIX',               status: 'pending', student_id: 's8' },
  { id: 'a2_tx1',  academy_id: ACAD_2, description: 'Mensalidade - Rodrigo Tanaka',     amount: 180,  type: 'income',  category: 'Mensalidade',      date: `${curYM}-01`, payment_method: 'PIX',               status: 'paid',    student_id: 'a2_s1' },
  { id: 'a2_tx2',  academy_id: ACAD_2, description: 'Mensalidade - Fernanda Kobayashi', amount: 180,  type: 'income',  category: 'Mensalidade',      date: `${curYM}-02`, payment_method: 'PIX',               status: 'paid',    student_id: 'a2_s2' },
  { id: 'a2_tx3',  academy_id: ACAD_2, description: 'Pacote Família - Thiago Nakamura', amount: 450,  type: 'income',  category: 'Mensalidade',      date: `${curYM}-02`, payment_method: 'Cartão de Crédito', status: 'paid',    student_id: 'a2_s3' },
  { id: 'a2_tx4',  academy_id: ACAD_2, description: 'Plano Juvenil - Isabela Morita',   amount: 130,  type: 'income',  category: 'Mensalidade',      date: `${curYM}-03`, payment_method: 'PIX',               status: 'paid',    student_id: 'a2_s4' },
  { id: 'a2_tx5',  academy_id: ACAD_2, description: 'Aluguel da academia',              amount: 3200, type: 'expense', category: 'Aluguel',          date: `${curYM}-05`, payment_method: 'Transferência',     status: 'paid' },
  { id: 'a2_tx6',  academy_id: ACAD_2, description: 'Salário - Prof. Camila Sousa',     amount: 2200, type: 'expense', category: 'Salários',         date: `${lastYM}-28`,payment_method: 'Transferência',     status: 'paid' },
  { id: 'a2_tx7',  academy_id: ACAD_2, description: 'Energia elétrica',                 amount: 580,  type: 'expense', category: 'Energia/Água',     date: `${curYM}-08`, payment_method: 'Débito Automático', status: 'paid' },
  { id: 'a2_tx8',  academy_id: ACAD_2, description: 'Venda - Kimono Kids M2',           amount: 220,  type: 'income',  category: 'Venda de Produto', date: `${curYM}-10`, payment_method: 'Dinheiro',          status: 'paid' },
  { id: 'a2_tx9',  academy_id: ACAD_2, description: 'Matrícula - Vanessa Rodrigues',    amount: 80,   type: 'income',  category: 'Matrícula',        date: today,         payment_method: 'PIX',               status: 'paid' },
  { id: 'a2_tx10', academy_id: ACAD_2, description: 'Mensalidade - Camila Tanaka',      amount: 450,  type: 'income',  category: 'Mensalidade',      date: `${curYM}-05`, payment_method: 'PIX',               status: 'paid',    student_id: 'a2_s6' },
  { id: 'a2_tx11', academy_id: ACAD_2, description: 'Plano Juvenil - Eduardo Yamamoto', amount: 130,  type: 'income',  category: 'Mensalidade',      date: `${curYM}-04`, payment_method: 'PIX',               status: 'pending', student_id: 'a2_s5' },
  { id: 'a2_tx12', academy_id: ACAD_2, description: 'Manutenção equipamentos',          amount: 400,  type: 'expense', category: 'Manutenção',       date: `${lastYM}-15`,payment_method: 'Dinheiro',          status: 'paid' },
  { id: 'a3_tx1',  academy_id: ACAD_3, description: 'Mensalidade - Amanda Ferreira',    amount: 420,  type: 'income',  category: 'Mensalidade',      date: `${curYM}-01`, payment_method: 'PIX',               status: 'paid',    student_id: 'a3_s2' },
  { id: 'a3_tx2',  academy_id: ACAD_3, description: 'Mensalidade - Felipe Castro',      amount: 420,  type: 'income',  category: 'Mensalidade',      date: `${curYM}-02`, payment_method: 'PIX',               status: 'paid',    student_id: 'a3_s3' },
  { id: 'a3_tx3',  academy_id: ACAD_3, description: 'Plano Família - Juliana Ramos',    amount: 280,  type: 'income',  category: 'Mensalidade',      date: `${curYM}-03`, payment_method: 'Cartão de Crédito', status: 'paid',    student_id: 'a3_s6' },
  { id: 'a3_tx4',  academy_id: ACAD_3, description: 'Plano Kids - Larissa Pinto',       amount: 110,  type: 'income',  category: 'Mensalidade',      date: `${curYM}-03`, payment_method: 'PIX',               status: 'paid',    student_id: 'a3_s4' },
  { id: 'a3_tx5',  academy_id: ACAD_3, description: 'Aluguel do espaço',                amount: 4000, type: 'expense', category: 'Aluguel',          date: `${curYM}-05`, payment_method: 'Transferência',     status: 'paid' },
  { id: 'a3_tx6',  academy_id: ACAD_3, description: 'Salário - Prof. Leticia Vaz',      amount: 2500, type: 'expense', category: 'Salários',         date: `${lastYM}-28`,payment_method: 'Transferência',     status: 'paid' },
  { id: 'a3_tx7',  academy_id: ACAD_3, description: 'Energia / Água',                   amount: 720,  type: 'expense', category: 'Energia/Água',     date: `${curYM}-07`, payment_method: 'Débito Automático', status: 'paid' },
  { id: 'a3_tx8',  academy_id: ACAD_3, description: 'Mensalidade - Diego Rocha',        amount: 160,  type: 'income',  category: 'Mensalidade',      date: `${curYM}-04`, payment_method: 'Dinheiro',          status: 'pending', student_id: 'a3_s1' },
  { id: 'a3_tx9',  academy_id: ACAD_3, description: 'Venda - Kit proteção',             amount: 160,  type: 'income',  category: 'Venda de Produto', date: `${curYM}-09`, payment_method: 'PIX',               status: 'paid' },
  { id: 'a3_tx10', academy_id: ACAD_3, description: 'Matrícula - Diego Rocha',          amount: 100,  type: 'income',  category: 'Matrícula',        date: '2024-02-01',  payment_method: 'PIX',               status: 'paid' },
  { id: 'a3_tx11', academy_id: ACAD_3, description: 'Plano Kids - Gustavo Santos',      amount: 110,  type: 'income',  category: 'Mensalidade',      date: `${curYM}-06`, payment_method: 'PIX',               status: 'pending', student_id: 'a3_s8' },
  { id: 'a3_tx12', academy_id: ACAD_3, description: 'Seguro da academia',               amount: 800,  type: 'expense', category: 'Outros',           date: `${prev2YM}-01`,payment_method: 'Transferência',    status: 'paid' },
];

const CALENDAR = [
  { id: 'ev1',    academy_id: ACAD_1, date: `${curYM}-15`, reason: 'Feriado Nacional — Sem aula',          type: 'no-class' },
  { id: 'ev2',    academy_id: ACAD_1, date: `${curYM}-22`, reason: 'Seminário de Verão — Prof. Renato',    type: 'event' },
  { id: 'ev3',    academy_id: ACAD_1, date: nextWeek,      reason: 'Graduação de alunos — cerimônia completa', type: 'event' },
  { id: 'ev4',    academy_id: ACAD_1, date: nextMonth,     reason: 'Copa Interna NexFight 2026',           type: 'event' },
  { id: 'a2_ev1', academy_id: ACAD_2, date: `${curYM}-15`, reason: 'Feriado Nacional — Academia fechada',  type: 'no-class' },
  { id: 'a2_ev2', academy_id: ACAD_2, date: `${curYM}-29`, reason: 'Dia de Exame — Samurai BJJ',           type: 'event' },
  { id: 'a2_ev3', academy_id: ACAD_2, date: nextWeek,      reason: 'Treino especial — Prof. Convidado',    type: 'event' },
  { id: 'a3_ev1', academy_id: ACAD_3, date: `${curYM}-15`, reason: 'Feriado Nacional — Sem treino',        type: 'no-class' },
  { id: 'a3_ev2', academy_id: ACAD_3, date: tomorrow,      reason: 'Open Dragão — Campeonato Interno',     type: 'event' },
  { id: 'a3_ev3', academy_id: ACAD_3, date: nextMonth,     reason: 'Seminário com Mestre Rodrigo',         type: 'event' },
];

const CHAT = [
  { id: 'msg1', academy_id: ACAD_1, sender_id: 'mock_user_1',  sender_name: 'Admin NexFight',       sender_role: 'admin',      content: 'Pessoal, amanhã teremos treino extra às 7h da manhã. Confirmem presença! OSS!' },
  { id: 'msg2', academy_id: ACAD_1, sender_id: 'mock_instr_1', sender_name: 'Prof. Renato Silva',   sender_role: 'instructor', content: 'Lembrando que no sábado haverá seminário com visitante especial. Não percam! OSS' },
  { id: 'msg3', academy_id: ACAD_1, sender_id: 'mock_user_1',  sender_name: 'Admin NexFight',       sender_role: 'admin',      content: 'Parabéns à Juliana Santos pela faixa azul! OSS! 🥋' },
  { id: 'msg4', academy_id: ACAD_1, sender_id: 'mock_instr_1', sender_name: 'Prof. Renato Silva',   sender_role: 'instructor', content: 'Treino de No-Gi toda sexta a partir das 20h. Todos são bem-vindos!' },
  { id: 'msg5', academy_id: ACAD_1, sender_id: 'mock_staff_1', sender_name: 'Ana Secretaria',       sender_role: 'staff',      content: 'Atenção: pagamentos de maio com vencimento dia 15. Qualquer dúvida, me chamem!' },
  { id: 'a2_msg1', academy_id: ACAD_2, sender_id: 'a2_admin_1', sender_name: 'Admin Samurai',        sender_role: 'admin',      content: 'Samurai BJJ está com novas turmas abertas! Indique seus amigos. OSS!' },
  { id: 'a2_msg2', academy_id: ACAD_2, sender_id: 'a2_instr_1', sender_name: 'Prof. Kenji Nakamura', sender_role: 'instructor', content: 'Treino de competição nessa semana será na quinta às 19h. Venham preparados!' },
  { id: 'a2_msg3', academy_id: ACAD_2, sender_id: 'a2_instr_2', sender_name: 'Prof. Camila Sousa',   sender_role: 'instructor', content: 'Turma Kids: ensaio de graduação no próximo sábado! Traga os responsáveis.' },
  { id: 'a2_msg4', academy_id: ACAD_2, sender_id: 'a2_admin_1', sender_name: 'Admin Samurai',        sender_role: 'admin',      content: 'Parabéns Rodrigo Tanaka pelas 3 fitas na branca! Continue evoluindo. OSS' },
  { id: 'a3_msg1', academy_id: ACAD_3, sender_id: 'a3_admin_1', sender_name: 'Admin Dragão',         sender_role: 'admin',      content: 'Open Dragão amanhã! Todos os alunos confirmados? Contamos com vocês!' },
  { id: 'a3_msg2', academy_id: ACAD_3, sender_id: 'a3_instr_1', sender_name: 'Prof. Diego Rocha Jr.',sender_role: 'instructor', content: 'Pessoal da competição: revisão de posições hoje às 20h. Presença obrigatória!' },
  { id: 'a3_msg3', academy_id: ACAD_3, sender_id: 'a3_instr_2', sender_name: 'Prof. Leticia Vaz',    sender_role: 'instructor', content: 'Kids: trouxemos novos tatames! Aula de sábado será no salão principal.' },
  { id: 'a3_msg4', academy_id: ACAD_3, sender_id: 'a3_admin_1', sender_name: 'Admin Dragão',         sender_role: 'admin',      content: 'Parabéns Amanda Ferreira pelas 3 fitas na azul! Grande evolução! OSS 🥋' },
];

const PRODUCTS = [
  { id: 'prod1', academy_id: ACAD_1, name: 'Kimono Adulto A2',           price: 280, stock: 5,  category: 'Kimonos',    description: 'Kimono branco adulto tamanho A2' },
  { id: 'prod2', academy_id: ACAD_1, name: 'Kimono Kids M2',             price: 220, stock: 3,  category: 'Kimonos',    description: 'Kimono infantil tamanho M2' },
  { id: 'prod3', academy_id: ACAD_1, name: 'Camiseta NexFight',          price: 65,  stock: 12, category: 'Vestuário',  description: 'Camiseta oficial NexFight — dry fit' },
  { id: 'prod4', academy_id: ACAD_1, name: 'Caneca OSS',                 price: 35,  stock: 8,  category: 'Acessórios', description: 'Caneca personalizada OSS 350ml' },
  { id: 'prod5', academy_id: ACAD_1, name: 'Protetor Bucal',             price: 45,  stock: 0,  category: 'Proteções',  description: 'Protetor bucal duplo — adulto' },
  { id: 'prod6', academy_id: ACAD_1, name: 'Kimono Adulto A3 (Azul)',    price: 295, stock: 2,  category: 'Kimonos',    description: 'Kimono azul adulto tamanho A3' },
  { id: 'prod7', academy_id: ACAD_1, name: 'Faixa Adulto (várias cores)',price: 30,  stock: 20, category: 'Acessórios', description: 'Faixas avulsas para reposição' },
  { id: 'a2_prod1', academy_id: ACAD_2, name: 'Kimono Samurai A2',       price: 310, stock: 4,  category: 'Kimonos',    description: 'Kimono oficial Samurai BJJ A2' },
  { id: 'a2_prod2', academy_id: ACAD_2, name: 'Rashguard Manga Curta',   price: 95,  stock: 8,  category: 'Vestuário',  description: 'Rashguard dry fit manga curta' },
  { id: 'a2_prod3', academy_id: ACAD_2, name: 'Shorts de No-Gi',         price: 80,  stock: 6,  category: 'Vestuário',  description: 'Shorts para treino de No-Gi' },
  { id: 'a2_prod4', academy_id: ACAD_2, name: 'Joelheira Compressão',    price: 55,  stock: 0,  category: 'Proteções',  description: 'Joelheira de compressão para treino' },
  { id: 'a2_prod5', academy_id: ACAD_2, name: 'Bolsa Samurai BJJ',       price: 120, stock: 3,  category: 'Acessórios', description: 'Bolsa esportiva oficial' },
  { id: 'a3_prod1', academy_id: ACAD_3, name: 'Kimono Dragão A1',        price: 290, stock: 6,  category: 'Kimonos',    description: 'Kimono Dragão Fight tamanho A1' },
  { id: 'a3_prod2', academy_id: ACAD_3, name: 'Kimono Dragão Kids P1',   price: 230, stock: 4,  category: 'Kimonos',    description: 'Kimono infantil tamanho P1' },
  { id: 'a3_prod3', academy_id: ACAD_3, name: 'Moletom Dragão Fight',    price: 110, stock: 5,  category: 'Vestuário',  description: 'Moletom com capuz estampado' },
  { id: 'a3_prod4', academy_id: ACAD_3, name: 'Bandagem Elástica',       price: 20,  stock: 15, category: 'Proteções',  description: 'Bandagem para mãos e punhos (5m)' },
  { id: 'a3_prod5', academy_id: ACAD_3, name: 'Squeeze Dragão 700ml',    price: 40,  stock: 0,  category: 'Acessórios', description: 'Squeeze oficial com logo Dragão' },
];

const RECYCLE_BIN = [
  { id: 'rb1', academy_id: ACAD_1, type: 'student',    original_data: { id: 'rb_s1', academy_id: ACAD_1, name: 'Jorge Cardoso', belt: B.WHITE, stripes: 1, birth_date: '1997-06-15', gender: G('M'), total_classes: 10, total_hours: 15, absent_count: 8, status: 'Inactive', join_date: '2024-03-01', documents: [], graduationHistory: [] } },
  { id: 'rb2', academy_id: ACAD_1, type: 'template',   original_data: { id: 'rb_t1', academy_id: ACAD_1, name: 'No-Gi Especial', duration_minutes: 90, absence_limit: null, assigned_student_ids: [], assignedStudentIds: [], schedules: [{ id: 'rb_sch1', day_of_week: 5, start_time: '21:00', end_time: '22:30' }] } },
  { id: 'rb3', academy_id: ACAD_2, type: 'instructor', original_data: { id: 'rb_i1', academy_id: ACAD_2, name: 'Prof. Sergio Matos', belt: B.PURPLE, stripes: 2, birth_date: '1989-04-10', gender: G('M'), status: 'Inactive', join_date: '2020-08-01', specialties: 'Adultos, Iniciantes' } },
  { id: 'rb4', academy_id: ACAD_3, type: 'student',    original_data: { id: 'rb_s2', academy_id: ACAD_3, name: 'Caio Vasconcelos', belt: B.BLUE, stripes: 0, birth_date: '1998-01-25', gender: G('M'), total_classes: 45, total_hours: 68, absent_count: 12, status: 'Dropped', join_date: '2023-04-15', documents: [], graduationHistory: [] } },
  { id: 'rb5', academy_id: ACAD_2, type: 'staff',      original_data: { id: 'rb_st1', academy_id: ACAD_2, name: 'Patricia Souza', email: 'patricia.rb@samurai.com', phone: '11988887777', position: 'Recepcionista', status: 'Inactive', join_date: '2023-01-10' } },
];

// ─────────────────────────────────────────────────────────────────────────────
// SEED EXECUTION
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 Iniciando seed do banco de dados...');

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
    timezone: '+00:00',
    charset: 'utf8mb4',
  });

  try {
    await conn.query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
    await conn.query("SET CHARACTER SET utf8mb4");

    console.log('🗑️  Dropping tables...');
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const t of DROP_TABLES) {
      await conn.query(`DROP TABLE IF EXISTS \`${t}\``);
    }
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('🏗️  Creating tables...');
    for (const stmt of CREATE_STATEMENTS) {
      const withCharset = stmt.replace(/\)$/, ') DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');
      await conn.query(withCharset);
    }

    // Academies
    console.log(`📚 Inserindo ${ACADEMIES.length} academias...`);
    for (const a of ACADEMIES) {
      await conn.execute(
        `INSERT INTO academies (id, name, alias, logo, owner_name, email, phone, cep, address, address_number, absence_limit, pix_key, pix_type, bank_name, bank_agency, bank_account, current_plan, plan_status, plan_expiration_date, payment_warning_days)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [a.id, a.name, a.alias, a.logo, a.owner_name, a.email, a.phone, a.cep, a.address, a.address_number, a.absence_limit, a.pix_key, a.pix_type, a.bank_name, a.bank_agency, a.bank_account, a.current_plan, a.plan_status, a.plan_expiration_date, a.payment_warning_days]
      );
    }

    // Plans
    console.log(`💰 Inserindo ${PLANS.length} planos...`);
    for (const p of PLANS) {
      await conn.execute(
        `INSERT INTO academy_plans (id, academy_id, name, duration_months, classes_per_week, price, category, description) VALUES (?,?,?,?,?,?,?,?)`,
        [p.id, p.academy_id, p.name, p.duration_months, p.classes_per_week, p.price, p.category, p.description]
      );
    }

    // Users (bcrypt)
    console.log(`👤 Inserindo ${USERS_RAW.length} usuários com senhas bcrypt...`);
    for (const u of USERS_RAW) {
      const hash = await bcrypt.hash(u.password, 10);
      await conn.execute(
        `INSERT INTO users (id, academy_id, role, name, email, password_hash, status) VALUES (?,?,?,?,?,?,?)`,
        [u.id, u.academy_id, u.role, u.name, u.email, hash, 'Active']
      );
    }

    // Students
    console.log(`🥋 Inserindo ${STUDENTS.length} alunos...`);
    for (const s of STUDENTS) {
      await conn.execute(
        `INSERT INTO students (id, academy_id, name, email, phone, belt, stripes, birth_date, gender, photo, cpf, rg, weight, height, blood_type, emergency_contact, emergency_phone, cep, address, address_number, guardian_name, guardian_phone, guardian_email, guardian_cpf, guardian_relation, guardian_profession, total_classes, total_hours, last_attendance, absent_count, status, join_date, last_graduation_date, plan_id, next_payment_date, absence_limit)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [s.id, s.academy_id, s.name, s.email ?? null, s.phone ?? null, s.belt, s.stripes, s.birth_date ?? null, s.gender ?? null, s.photo ?? null, s.cpf ?? null, s.rg ?? null, s.weight ?? null, s.height ?? null, s.blood_type ?? null, s.emergency_contact ?? null, s.emergency_phone ?? null, s.cep ?? null, s.address ?? null, s.address_number ?? null, s.guardian_name ?? null, s.guardian_phone ?? null, s.guardian_email ?? null, s.guardian_cpf ?? null, s.guardian_relation ?? null, s.guardian_profession ?? null, s.total_classes, s.total_hours, s.last_attendance ?? null, s.absent_count, s.status, s.join_date ?? null, s.last_graduation_date ?? null, s.plan_id ?? null, s.next_payment_date ?? null, s.absence_limit ?? null]
      );
    }

    // Graduation history
    let ghCount = 0;
    for (const s of STUDENTS) {
      if (s.graduation_history) {
        for (const g of s.graduation_history) {
          await conn.execute(
            `INSERT INTO graduation_history (id, student_id, previous_belt, new_belt, previous_stripes, new_stripes, date, instructor_id, notes) VALUES (?,?,?,?,?,?,?,?,?)`,
            [g.id, s.id, g.previous_belt, g.new_belt, g.previous_stripes, g.new_stripes, g.date, g.instructor_id ?? null, g.notes ?? null]
          );
          ghCount++;
        }
      }
    }
    console.log(`📜 Inseridas ${ghCount} graduações.`);

    // Instructors
    console.log(`👨‍🏫 Inserindo ${INSTRUCTORS.length} instrutores...`);
    for (const i of INSTRUCTORS) {
      await conn.execute(
        `INSERT INTO instructors (id, academy_id, name, email, phone, belt, stripes, birth_date, gender, photo, cpf, rg, marital_status, cep, address, address_number, specialties, status, join_date)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [i.id, i.academy_id, i.name, i.email, i.phone, i.belt, i.stripes, i.birth_date, i.gender, i.photo, i.cpf, (i as any).rg ?? null, i.marital_status, i.cep, i.address, i.address_number, i.specialties, i.status, i.join_date]
      );
    }

    // Staff
    console.log(`👥 Inserindo ${STAFFS.length} staff...`);
    for (const s of STAFFS) {
      await conn.execute(
        `INSERT INTO staff (id, academy_id, name, email, phone, photo, birth_date, gender, position, cep, address, address_number, status, join_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [s.id, s.academy_id, s.name, s.email, s.phone, s.photo, s.birth_date, s.gender, (s as any).position, (s as any).cep ?? null, (s as any).address ?? null, (s as any).address_number ?? null, s.status, s.join_date]
      );
    }

    // Templates
    console.log(`📋 Inserindo ${TEMPLATES.length} templates...`);
    for (const t of TEMPLATES) {
      await conn.execute(
        `INSERT INTO class_templates (id, academy_id, name, duration_minutes, absence_limit) VALUES (?,?,?,?,?)`,
        [t.id, t.academy_id, t.name, t.duration_minutes, t.absence_limit ?? null]
      );
      // schedules
      for (let idx = 0; idx < t.schedules.length; idx++) {
        const sc = t.schedules[idx];
        await conn.execute(
          `INSERT INTO class_template_schedules (id, template_id, day_of_week, start_time, end_time) VALUES (?,?,?,?,?)`,
          [`${t.id}_sc_${idx}`, t.id, sc.day_of_week, sc.start_time, sc.end_time]
        );
      }
      // assigned students
      for (const sid of t.assigned) {
        await conn.execute(
          `INSERT INTO class_template_assigned_students (template_id, student_id) VALUES (?,?)`,
          [t.id, sid]
        );
      }
    }

    // Sessions
    console.log(`📅 Inserindo ${SESSIONS.length} sessões...`);
    for (const s of SESSIONS) {
      await conn.execute(
        `INSERT INTO class_sessions (id, academy_id, name, template_id, date, duration_minutes, instructor_id, status) VALUES (?,?,?,?,?,?,?,?)`,
        [s.id, s.academy_id, s.name, s.template_id, s.date, s.duration_minutes, s.instructor_id, s.status]
      );
    }

    // Attendance
    console.log(`✅ Inserindo ${ATTENDANCE.length} presenças...`);
    for (const a of ATTENDANCE) {
      await conn.execute(
        `INSERT INTO attendance_records (id, academy_id, student_id, class_id, date, duration_minutes) VALUES (?,?,?,?,?,?)`,
        [a.id, a.academy_id, a.student_id, a.class_id, a.date, a.duration_minutes]
      );
    }

    // Finance
    console.log(`💵 Inserindo ${TRANSACTIONS.length} transações financeiras...`);
    for (const t of TRANSACTIONS) {
      await conn.execute(
        `INSERT INTO finance_transactions (id, academy_id, description, amount, type, category, date, payment_method, status, student_id) VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [t.id, t.academy_id, t.description, t.amount, t.type, t.category, t.date, t.payment_method, t.status, (t as any).student_id ?? null]
      );
    }

    // Calendar
    console.log(`📆 Inserindo ${CALENDAR.length} eventos de calendário...`);
    for (const e of CALENDAR) {
      await conn.execute(
        `INSERT INTO calendar_events (id, academy_id, date, reason, type) VALUES (?,?,?,?,?)`,
        [e.id, e.academy_id, e.date, e.reason, e.type]
      );
    }

    // Chat
    console.log(`💬 Inserindo ${CHAT.length} mensagens de chat...`);
    for (const c of CHAT) {
      await conn.execute(
        `INSERT INTO chat_messages (id, academy_id, sender_id, sender_name, sender_role, content) VALUES (?,?,?,?,?,?)`,
        [c.id, c.academy_id, c.sender_id, c.sender_name, c.sender_role, c.content]
      );
    }

    // Products
    console.log(`🛒 Inserindo ${PRODUCTS.length} produtos...`);
    for (const p of PRODUCTS) {
      await conn.execute(
        `INSERT INTO products (id, academy_id, name, description, price, stock, category) VALUES (?,?,?,?,?,?,?)`,
        [p.id, p.academy_id, p.name, p.description, p.price, p.stock, p.category]
      );
    }

    // Recycle bin
    console.log(`🗑️  Inserindo ${RECYCLE_BIN.length} itens na lixeira...`);
    for (const r of RECYCLE_BIN) {
      await conn.execute(
        `INSERT INTO recycle_bin (id, academy_id, type, original_data) VALUES (?,?,?,?)`,
        [r.id, r.academy_id, r.type, JSON.stringify(r.original_data)]
      );
    }

    console.log('\n✨ Seed concluído com sucesso!');
  } catch (err) {
    console.error('❌ Erro durante o seed:', err);
    throw err;
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
