import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './db';
import router from './routes/index';
import { errorHandler } from './middleware/errorHandler';

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
  origin: ['http://localhost:3002', 'https://qas.nexdojo.com.br'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

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
  ];
  for (const sql of patches) {
    try {
      await pool.query(sql);
    } catch (err: any) {
      if (err.code !== 'ER_DUP_FIELDNAME') throw err;
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
