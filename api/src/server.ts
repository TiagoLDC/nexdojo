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

app.use(cors({
  origin: ['http://localhost:3002', 'https://qas.nexdojo.com.br'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

app.use('/api', router);
app.use(errorHandler);

async function start() {
  try {
    const conn = await pool.getConnection();
    conn.release();
    console.log('✓ Conectado ao MySQL');
  } catch (err) {
    console.error('✗ Erro ao conectar ao MySQL:', err);
    // Continua mesmo com falha inicial — o pool reconecta automaticamente
  }

  app.listen(PORT, () => {
    console.log(`✓ API rodando em http://localhost:${PORT}`);
  });
}

start();
