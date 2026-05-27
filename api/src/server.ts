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
async function applySchemaPatches() {
  const patches = [
    `ALTER TABLE academy_plans ADD COLUMN free_age TINYINT(1) DEFAULT 0 COMMENT 'Se 1, ignora validação de idade na presença'`,
    `ALTER TABLE attendance_records ADD COLUMN age_warning TINYINT(1) DEFAULT 0 COMMENT 'Presença com divergência de idade confirmada manualmente'`,
  ];
  for (const sql of patches) {
    try {
      await pool.execute(sql);
    } catch (err: any) {
      if (err.code !== 'ER_DUP_FIELDNAME') throw err;
    }
  }
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
