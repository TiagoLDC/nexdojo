import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: `${__dirname}/../../.env` });

const DDL_STATEMENTS = [
  // Limpar banco
  'SET FOREIGN_KEY_CHECKS = 0',
  'DROP TABLE IF EXISTS academy_belt_settings',
  'DROP TABLE IF EXISTS belt_ranks',
  'DROP TABLE IF EXISTS sports',
  'DROP TABLE IF EXISTS guardianships',
  'DROP TABLE IF EXISTS password_reset_tokens',
  'DROP TABLE IF EXISTS system_config',
  'DROP TABLE IF EXISTS recycle_bin',
  'DROP TABLE IF EXISTS products',
  'DROP TABLE IF EXISTS chat_messages',
  'DROP TABLE IF EXISTS calendar_events',
  'DROP TABLE IF EXISTS finance_transactions',
  'DROP TABLE IF EXISTS attendance_records',
  'DROP TABLE IF EXISTS class_sessions',
  'DROP TABLE IF EXISTS class_template_assigned_students',
  'DROP TABLE IF EXISTS class_template_schedules',
  'DROP TABLE IF EXISTS class_templates',
  'DROP TABLE IF EXISTS graduation_history',
  'DROP TABLE IF EXISTS instructor_documents',
  'DROP TABLE IF EXISTS student_documents',
  'DROP TABLE IF EXISTS students',
  'DROP TABLE IF EXISTS instructors',
  'DROP TABLE IF EXISTS staff',
  'DROP TABLE IF EXISTS users',
  'DROP TABLE IF EXISTS academy_plan_schedules',
  'DROP TABLE IF EXISTS academy_plans',
  'DROP TABLE IF EXISTS academies',
  'SET FOREIGN_KEY_CHECKS = 1',

  // Esportes/modalidades (cadastro global, gerenciado só pelo superuser)
  `CREATE TABLE sports (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  // Template de faixas/graus por esporte (gerenciado só pelo superuser)
  `CREATE TABLE belt_ranks (
    id VARCHAR(36) PRIMARY KEY,
    sport_id VARCHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    color_key VARCHAR(50) NOT NULL,
    order_index INT NOT NULL,
    degree_count TINYINT NOT NULL DEFAULT 4,
    category ENUM('kids','adult','both') NOT NULL DEFAULT 'adult',
    min_age INT NULL,
    max_age INT NULL,
    FOREIGN KEY (sport_id) REFERENCES sports(id) ON DELETE CASCADE,
    UNIQUE (sport_id, order_index)
  )`,

  // Seed do template padrão de Jiu-Jitsu (CBJJ) — mesma sequência hoje hardcoded em constants.ts/services/graduation.ts
  'SET @sport_jiujitsu = UUID()',
  `INSERT INTO sports (id, name, slug, active) VALUES (@sport_jiujitsu, 'Jiu-Jitsu', 'jiu-jitsu', 1)`,
  `INSERT INTO belt_ranks (id, sport_id, name, color_key, order_index, degree_count, category, min_age) VALUES
    (UUID(), @sport_jiujitsu, 'Branca', 'WHITE', 0, 4, 'both', NULL),
    (UUID(), @sport_jiujitsu, 'Cinza e Branca', 'GREY_WHITE', 1, 4, 'kids', NULL),
    (UUID(), @sport_jiujitsu, 'Cinza', 'GREY', 2, 4, 'kids', NULL),
    (UUID(), @sport_jiujitsu, 'Cinza e Preta', 'GREY_BLACK', 3, 4, 'kids', NULL),
    (UUID(), @sport_jiujitsu, 'Amarela e Branca', 'YELLOW_WHITE', 4, 4, 'kids', NULL),
    (UUID(), @sport_jiujitsu, 'Amarela', 'YELLOW', 5, 4, 'kids', NULL),
    (UUID(), @sport_jiujitsu, 'Amarela e Preta', 'YELLOW_BLACK', 6, 4, 'kids', NULL),
    (UUID(), @sport_jiujitsu, 'Laranja e Branca', 'ORANGE_WHITE', 7, 4, 'kids', NULL),
    (UUID(), @sport_jiujitsu, 'Laranja', 'ORANGE', 8, 4, 'kids', NULL),
    (UUID(), @sport_jiujitsu, 'Laranja e Preta', 'ORANGE_BLACK', 9, 4, 'kids', NULL),
    (UUID(), @sport_jiujitsu, 'Verde e Branca', 'GREEN_WHITE', 10, 4, 'kids', NULL),
    (UUID(), @sport_jiujitsu, 'Verde', 'GREEN', 11, 4, 'kids', NULL),
    (UUID(), @sport_jiujitsu, 'Verde e Preta', 'GREEN_BLACK', 12, 4, 'kids', NULL),
    (UUID(), @sport_jiujitsu, 'Azul', 'BLUE', 13, 4, 'adult', 16),
    (UUID(), @sport_jiujitsu, 'Roxa', 'PURPLE', 14, 4, 'adult', 16),
    (UUID(), @sport_jiujitsu, 'Marrom', 'BROWN', 15, 4, 'adult', 18),
    (UUID(), @sport_jiujitsu, 'Preta', 'BLACK', 16, 6, 'adult', 19),
    (UUID(), @sport_jiujitsu, 'Coral', 'CORAL', 17, 0, 'adult', NULL),
    (UUID(), @sport_jiujitsu, 'Vermelha', 'RED', 18, 0, 'adult', NULL)`,

  // Academias
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
    current_plan ENUM('Free','Silver','Gold','Black Belt','VIP') DEFAULT 'Free',
    plan_status ENUM('Active','Expired','Trial','Suspended','Canceled') DEFAULT 'Trial',
    plan_expiration_date DATE,
    payment_warning_days INT DEFAULT 5,
    graduation_rules JSON DEFAULT NULL,
    sport_id VARCHAR(36) NULL COMMENT 'Definido só na criação da academia — imutável depois (ver PLANO_GRADUACAO.md D6)',
    qr_code_presenca VARCHAR(500) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sport_id) REFERENCES sports(id) ON DELETE SET NULL
  )`,

  // Planos da academia (plano de aula: mensalidade, idade, tolerâncias de presença)
  `CREATE TABLE academy_plans (
    id VARCHAR(36) PRIMARY KEY,
    academy_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    duration_months INT NOT NULL,
    classes_per_week INT,
    price DECIMAL(10,2) NOT NULL,
    category VARCHAR(100),
    description TEXT,
    min_age INT NULL,
    max_age INT NULL,
    instructor_id VARCHAR(36) NULL COMMENT 'FK lógica para instructors.id (sem constraint pois instructors é criada depois neste DDL)',
    active TINYINT(1) DEFAULT 1,
    free_schedule TINYINT(1) DEFAULT 0 COMMENT 'Se 1, ignora validação de horário na presença',
    free_days TINYINT(1) DEFAULT 0 COMMENT 'Se 1, ignora limite de aulas por semana na presença',
    free_age TINYINT(1) DEFAULT 0 COMMENT 'Se 1, ignora validação de idade na presença',
    tolerance_before_minutes INT DEFAULT 15,
    tolerance_after_start_minutes INT DEFAULT 15,
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE
  )`,

  // Horários do plano de aula (1:N — vários horários por plano, vários por dia da semana)
  `CREATE TABLE academy_plan_schedules (
    id VARCHAR(36) PRIMARY KEY,
    plan_id VARCHAR(36) NOT NULL,
    day_of_week TINYINT NOT NULL COMMENT '0=Dom,1=Seg,...,6=Sab',
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    FOREIGN KEY (plan_id) REFERENCES academy_plans(id) ON DELETE CASCADE,
    INDEX idx_plan_day (plan_id, day_of_week)
  )`,

  // Configuração de meses/aulas necessários por faixa, por academia (substitui o JSON graduation_rules)
  `CREATE TABLE academy_belt_settings (
    id VARCHAR(36) PRIMARY KEY,
    academy_id VARCHAR(36) NOT NULL,
    belt_rank_id VARCHAR(36) NOT NULL,
    months_required INT NULL,
    classes_required INT NULL,
    warn_before_months INT NULL,
    warn_before_classes INT NULL,
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
    FOREIGN KEY (belt_rank_id) REFERENCES belt_ranks(id) ON DELETE CASCADE,
    UNIQUE (academy_id, belt_rank_id)
  )`,

  // Usuários do sistema
  `CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    academy_id VARCHAR(36),
    role ENUM('superuser','admin','instructor','staff','student','guest','guardian') NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    photo LONGTEXT,
    profile_data JSON,
    password_hash VARCHAR(255) NOT NULL,
    status ENUM('Active','Pending','Blocked') DEFAULT 'Active',
    requires_password_change TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE SET NULL
  )`,

  // Alunos
  `CREATE TABLE students (
    id VARCHAR(36) PRIMARY KEY,
    academy_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    belt ENUM('Branca','Cinza e Branca','Cinza','Cinza e Preta','Amarela e Branca','Amarela','Amarela e Preta','Laranja e Branca','Laranja','Laranja e Preta','Verde e Branca','Verde','Verde e Preta','Azul','Roxa','Marrom','Preta','Coral','Vermelha') DEFAULT 'Branca',
    belt_rank_id VARCHAR(36) NULL COMMENT 'Nova referência a belt_ranks — belt (ENUM) mantido até a migração de dados (Fase 3) e limpeza (Fase 9)',
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
    guardian_invite_token VARCHAR(100) UNIQUE,
    medical_notes TEXT,
    total_classes INT DEFAULT 0,
    total_hours INT DEFAULT 0,
    classes_since_graduation INT DEFAULT 0,
    hours_since_graduation INT DEFAULT 0,
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
    FOREIGN KEY (plan_id) REFERENCES academy_plans(id) ON DELETE SET NULL,
    FOREIGN KEY (belt_rank_id) REFERENCES belt_ranks(id) ON DELETE SET NULL,
    UNIQUE KEY uniq_academy_email (academy_id, email)
  )`,

  // Vínculo familiar: uma conta (users) pode gerenciar um ou mais alunos (students) como responsável
  `CREATE TABLE guardianships (
    id VARCHAR(36) PRIMARY KEY,
    guardian_user_id VARCHAR(36) NOT NULL,
    student_id VARCHAR(36) NOT NULL,
    relation VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guardian_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    UNIQUE KEY uniq_guardian_student (guardian_user_id, student_id)
  )`,

  // Documentos dos alunos
  `CREATE TABLE student_documents (
    id VARCHAR(36) PRIMARY KEY,
    student_id VARCHAR(36) NOT NULL,
    name VARCHAR(255),
    url LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
  )`,

  // Histórico de graduações
  `CREATE TABLE graduation_history (
    id VARCHAR(36) PRIMARY KEY,
    student_id VARCHAR(36) NOT NULL,
    previous_belt VARCHAR(50),
    previous_belt_rank_id VARCHAR(36) NULL COMMENT 'Snapshot textual (previous_belt) permanece autoritativo mesmo se a faixa for renomeada/removida depois',
    new_belt VARCHAR(50),
    belt_rank_id VARCHAR(36) NULL COMMENT 'Snapshot textual (new_belt) permanece autoritativo mesmo se a faixa for renomeada/removida depois',
    previous_stripes TINYINT,
    new_stripes TINYINT,
    date DATE,
    instructor_id VARCHAR(36),
    notes TEXT,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (previous_belt_rank_id) REFERENCES belt_ranks(id) ON DELETE SET NULL,
    FOREIGN KEY (belt_rank_id) REFERENCES belt_ranks(id) ON DELETE SET NULL
  )`,

  // Instrutores
  `CREATE TABLE instructors (
    id VARCHAR(36) PRIMARY KEY,
    academy_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    belt ENUM('Branca','Cinza e Branca','Cinza','Cinza e Preta','Amarela e Branca','Amarela','Amarela e Preta','Laranja e Branca','Laranja','Laranja e Preta','Verde e Branca','Verde','Verde e Preta','Azul','Roxa','Marrom','Preta','Coral','Vermelha') DEFAULT 'Branca',
    belt_rank_id VARCHAR(36) NULL COMMENT 'Nova referência a belt_ranks — belt (ENUM) mantido até a migração de dados (Fase 3) e limpeza (Fase 9)',
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
    last_graduation_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
    FOREIGN KEY (belt_rank_id) REFERENCES belt_ranks(id) ON DELETE SET NULL,
    UNIQUE KEY uniq_academy_email (academy_id, email)
  )`,

  // Documentos dos instrutores
  `CREATE TABLE instructor_documents (
    id VARCHAR(36) PRIMARY KEY,
    instructor_id VARCHAR(36) NOT NULL,
    name VARCHAR(255),
    url LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (instructor_id) REFERENCES instructors(id) ON DELETE CASCADE
  )`,

  // Staff
  `CREATE TABLE staff (
    id VARCHAR(36) PRIMARY KEY,
    academy_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    whatsapp VARCHAR(20),
    invite_token VARCHAR(100) UNIQUE,
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
    status ENUM('Active','Inactive','Dropped','Pending','PreCadastro') DEFAULT 'Active',
    join_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
    UNIQUE KEY uniq_academy_email (academy_id, email)
  )`,

  // Templates de aula
  `CREATE TABLE class_templates (
    id VARCHAR(36) PRIMARY KEY,
    academy_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    duration_minutes INT NOT NULL,
    absence_limit INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE
  )`,

  // Horários dos templates
  `CREATE TABLE class_template_schedules (
    id VARCHAR(36) PRIMARY KEY,
    template_id VARCHAR(36) NOT NULL,
    day_of_week TINYINT NOT NULL COMMENT '0=Dom,1=Seg,...,6=Sab',
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    FOREIGN KEY (template_id) REFERENCES class_templates(id) ON DELETE CASCADE
  )`,

  // Alunos atribuídos a templates
  `CREATE TABLE class_template_assigned_students (
    template_id VARCHAR(36) NOT NULL,
    student_id VARCHAR(36) NOT NULL,
    PRIMARY KEY (template_id, student_id),
    FOREIGN KEY (template_id) REFERENCES class_templates(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
  )`,

  // Sessões de aula
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
    FOREIGN KEY (template_id) REFERENCES class_templates(id) ON DELETE SET NULL
  )`,

  // Presenças
  `CREATE TABLE attendance_records (
    id VARCHAR(36) PRIMARY KEY,
    academy_id VARCHAR(36) NOT NULL,
    student_id VARCHAR(36) NOT NULL,
    class_id VARCHAR(36),
    date DATE NOT NULL,
    duration_minutes INT,
    check_in_time TIME NULL,
    matched_plan_id VARCHAR(36) NULL COMMENT 'Plano que permitiu a presença (auditoria)',
    matched_schedule_id VARCHAR(36) NULL COMMENT 'Horário do plano que bateu (auditoria)',
    age_warning TINYINT(1) DEFAULT 0 COMMENT 'Presença com divergência de idade confirmada manualmente',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES class_sessions(id) ON DELETE SET NULL,
    FOREIGN KEY (matched_plan_id) REFERENCES academy_plans(id) ON DELETE SET NULL,
    FOREIGN KEY (matched_schedule_id) REFERENCES academy_plan_schedules(id) ON DELETE SET NULL,
    INDEX idx_attendance_student_date (student_id, date)
  )`,

  // Transações financeiras
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

  // Eventos do calendário
  `CREATE TABLE calendar_events (
    id VARCHAR(36) PRIMARY KEY,
    academy_id VARCHAR(36) NOT NULL,
    date DATE NOT NULL,
    reason VARCHAR(255),
    type ENUM('no-class','event') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE
  )`,

  // Chat
  `CREATE TABLE chat_messages (
    id VARCHAR(36) PRIMARY KEY,
    academy_id VARCHAR(36) NOT NULL,
    sender_id VARCHAR(36) NOT NULL,
    sender_name VARCHAR(255),
    sender_role ENUM('admin','instructor','staff') NOT NULL,
    content TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE
  )`,

  // Produtos (inventário)
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

  // Lixeira
  `CREATE TABLE recycle_bin (
    id VARCHAR(36) PRIMARY KEY,
    academy_id VARCHAR(36) NOT NULL,
    type ENUM('student','instructor','staff','template') NOT NULL,
    original_data LONGTEXT NOT NULL COMMENT 'JSON serializado',
    deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE
  )`,

  // Configurações globais do sistema (superuser)
  `CREATE TABLE system_config (
    \`key\`      VARCHAR(100) NOT NULL,
    value      TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`key\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // Tokens de recuperação de senha
  `CREATE TABLE password_reset_tokens (
    id         VARCHAR(36) NOT NULL,
    user_id    VARCHAR(36) NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    expires_at DATETIME NOT NULL,
    used       TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_token_hash (token_hash),
    INDEX idx_user_id (user_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

async function migrate() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: false,
  });

  console.log('Conectado ao banco de dados.');
  console.log(`Host: ${process.env.DB_HOST} | DB: ${process.env.DB_NAME}\n`);

  try {
    for (const sql of DDL_STATEMENTS) {
      const label = sql.trim().split('\n')[0].substring(0, 60);
      process.stdout.write(`  → ${label}... `);
      await conn.query(sql);
      console.log('OK');
    }
    console.log('\nMigração concluída com sucesso! Todas as tabelas criadas.');
  } catch (err: any) {
    console.error('\nErro na migração:', err.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

migrate();
