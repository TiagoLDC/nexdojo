import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './db';
import router from './routes/index';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';

dotenv.config();

process.on('unhandledRejection', (reason) => {
  console.error('UnhandledRejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('UncaughtException:', err);
});

const app = express();
const PORT = process.env.PORT || 3005;

app.set('trust proxy', 1);

app.use(cors({
  origin: ['http://localhost:3002', 'https://qas.nexdojo.com.br', 'https://sistema.nexdojo.com.br'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Registra no evento 'finish', então req.user já foi populado pelo requireAuth quando a linha sai
app.use(requestLogger);

app.use('/api', router);
app.use(errorHandler);

// Aplica colunas novas sem derrubar o banco existente (idempotente — ignora ER_DUP_FIELDNAME)
// Usa pool.query (não execute) porque ALTER TABLE é DDL e MySQL rejeita DDL via prepared statements
async function applySchemaPatches() {
  const patches = [
    `ALTER TABLE academy_plans ADD COLUMN free_age TINYINT(1) DEFAULT 0 COMMENT 'Se 1, ignora validação de idade na presença'`,
    `ALTER TABLE attendance_records ADD COLUMN age_warning TINYINT(1) DEFAULT 0 COMMENT 'Presença com divergência de idade confirmada manualmente'`,
    `ALTER TABLE finance_transactions ADD COLUMN due_date DATE NULL COMMENT 'Data de vencimento da mensalidade registrada'`,
    `ALTER TABLE academies MODIFY COLUMN current_plan ENUM('Free','Silver','Gold','Black Belt','VIP') DEFAULT 'Free'`,
    `ALTER TABLE staff ADD COLUMN whatsapp VARCHAR(20) AFTER phone`,
    `ALTER TABLE staff ADD COLUMN invite_token VARCHAR(100) UNIQUE AFTER whatsapp`,
    `ALTER TABLE staff MODIFY COLUMN status ENUM('Active','Inactive','Dropped','Pending','PreCadastro') DEFAULT 'Active'`,
    `ALTER TABLE staff ADD COLUMN address_neighborhood VARCHAR(100) AFTER address_number`,
    `ALTER TABLE staff ADD COLUMN address_city VARCHAR(100) AFTER address_neighborhood`,
    `ALTER TABLE staff ADD COLUMN address_state VARCHAR(2) AFTER address_city`,
    `ALTER TABLE users MODIFY COLUMN role ENUM('superuser','admin','instructor','staff','student','guest','guardian') NOT NULL`,
    `ALTER TABLE students ADD COLUMN guardian_invite_token VARCHAR(100) UNIQUE AFTER guardian_profession`,
    // Impede duas fichas com o mesmo e-mail na mesma academia (a API já valida antes de salvar;
    // isso é a trava de segurança no banco). Bancos existentes precisam estar sem duplicados antes
    // desta patch rodar com sucesso — se falhar com ER_DUP_ENTRY, há dados sujos a limpar manualmente.
    `ALTER TABLE students ADD UNIQUE KEY uniq_academy_email (academy_id, email)`,
    `ALTER TABLE instructors ADD UNIQUE KEY uniq_academy_email (academy_id, email)`,
    `ALTER TABLE staff ADD UNIQUE KEY uniq_academy_email (academy_id, email)`,
    `ALTER TABLE attendance_records ADD COLUMN justified TINYINT(1) DEFAULT 0 COMMENT 'Presenca concedida por justificativa de falta aceita'`,
  ];
  for (const sql of patches) {
    try {
      await pool.query(sql);
    } catch (err: any) {
      if (err.code !== 'ER_DUP_FIELDNAME' && err.code !== 'ER_DUP_KEYNAME') throw err;
    }
  }

  // Tabela nova: CREATE TABLE IF NOT EXISTS já é idempotente por si só (sem necessidade de try/catch)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS guardianships (
      id VARCHAR(36) PRIMARY KEY,
      guardian_user_id VARCHAR(36) NOT NULL,
      student_id VARCHAR(36) NOT NULL,
      relation VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (guardian_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      UNIQUE KEY uniq_guardian_student (guardian_user_id, student_id)
    )
  `);

  // Comunicados — mensagem do admin para todos da academia ou restrita a faixas específicas,
  // exibida como modal bloqueante no dashboard até o usuário confirmar a leitura.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS announcements (
      id VARCHAR(36) PRIMARY KEY,
      academy_id VARCHAR(36) NOT NULL,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      target_all TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = todos os usuários da academia; 0 = restrito às faixas em announcement_belt_ranks',
      created_by VARCHAR(36) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS announcement_belt_ranks (
      announcement_id VARCHAR(36) NOT NULL,
      belt_rank_id VARCHAR(36) NOT NULL,
      PRIMARY KEY (announcement_id, belt_rank_id),
      FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
      FOREIGN KEY (belt_rank_id) REFERENCES belt_ranks(id) ON DELETE CASCADE
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS announcement_reads (
      id VARCHAR(36) PRIMARY KEY,
      announcement_id VARCHAR(36) NOT NULL,
      user_id VARCHAR(36) NOT NULL,
      read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY uniq_announcement_user (announcement_id, user_id)
    )
  `);

  // Justificativa de falta enviada pelo aluno (ou pelo responsável do dependente) e analisada
  // pelo professor/admin. Aceita, gera a presença daquele dia em attendance_records — o id fica
  // em attendance_record_id para que uma reversão da aprovação desfaça também os contadores.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS absence_justifications (
      id VARCHAR(36) PRIMARY KEY,
      academy_id VARCHAR(36) NOT NULL,
      student_id VARCHAR(36) NOT NULL,
      date DATE NOT NULL,
      reason TEXT NOT NULL,
      status ENUM('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
      review_note VARCHAR(500) NULL,
      created_by VARCHAR(36) NOT NULL COMMENT 'Usuário que enviou — o próprio aluno ou o responsável',
      reviewed_by VARCHAR(36) NULL,
      reviewed_at TIMESTAMP NULL,
      attendance_record_id VARCHAR(36) NULL COMMENT 'Presença criada ao aceitar a justificativa',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      UNIQUE KEY uniq_student_date (student_id, date),
      INDEX idx_absence_just_academy_status (academy_id, status)
    )
  `);

  // Trilha de auditoria de ações sensíveis (exclusões, lixeira, financeiro, troca de role/status,
  // login via senha mestra). Sem FK de propósito: o registro precisa sobreviver mesmo depois que
  // a entidade original for excluída em definitivo (purge da lixeira) ou o usuário autor for removido.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id VARCHAR(36) PRIMARY KEY,
      academy_id VARCHAR(36) NULL,
      user_id VARCHAR(36) NULL,
      user_email VARCHAR(255) NULL,
      action VARCHAR(100) NOT NULL,
      entity_type VARCHAR(50) NULL,
      entity_id VARCHAR(36) NULL,
      details LONGTEXT NULL COMMENT 'JSON com contexto adicional (snapshot do dado, diff de campos, etc.)',
      ip_address VARCHAR(45) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_audit_academy (academy_id),
      INDEX idx_audit_entity (entity_type, entity_id),
      INDEX idx_audit_created (created_at)
    )
  `);
}

async function start() {
  try {
    const conn = await pool.getConnection();
    conn.release();
    console.log('✓ Conectado ao MySQL');
    await applySchemaPatches();
    console.log('✓ Schema patches aplicados');
  } catch (err) {
    console.error('✗ Erro ao conectar ao MySQL:', err);
    // Continua mesmo com falha inicial — o pool reconecta automaticamente
  }

  app.listen(PORT, () => {
    console.log(`✓ API rodando em http://localhost:${PORT}`);
  });
}

start();
