import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import prisma from './lib/prisma';

import authRoutes from './routes/auth';
import studentRoutes from './routes/students';
import academyRoutes from './routes/academies';
import templateRoutes from './routes/templates';
import financeRoutes from './routes/finances';
import attendanceRoutes from './routes/attendance';
import instructorsRoutes from './routes/instructors';
import staffRoutes from './routes/staff';

import classRoutes from './routes/classes';
import recycleBinRoutes from './routes/recycleBin';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3005;

const allowedOrigins = [
  'http://localhost:3002',
  'http://localhost:3003',
  'https://qas.nexdojo.com.br',
];

app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sem origin (ex: curl, Postman, server-to-server)
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`Origem não permitida pelo CORS: ${origin}`));
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/academies', academyRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/finances', financeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/instructors', instructorsRoutes);
app.use('/api/staff', staffRoutes);

app.use('/api/classes', classRoutes);
app.use('/api/recycle-bin', recycleBinRoutes);

// Health check
app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ status: 'error', database: 'disconnected', error: String(error) });
  }
});

app.listen(PORT, () => {
  console.log(`🥋 NexDojo API rodando em http://localhost:${PORT}`);
});
