import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import prisma from '../lib/prisma';

const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10,
  message: { error: 'Muitas tentativas de login. Aguarde 1 minuto e tente novamente.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('Variável de ambiente JWT_SECRET não definida.');

// POST /api/auth/login
router.post('/login', loginLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
    }

    // Support plain text passwords for migration, then bcrypt
    let passwordMatch = false;
    if (user.password.startsWith('$2')) {
      passwordMatch = await bcrypt.compare(password, user.password);
    } else {
      passwordMatch = user.password === password;
    }

    if (!passwordMatch) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
    }

    if (user.status === 'Pending' && user.role !== 'admin' && user.role !== 'superuser') {
      return res.status(403).json({ error: 'Seu acesso ainda está pendente de aprovação. OSS!' });
    }

    const academy = user.academyId
      ? await prisma.academy.findUnique({ where: { id: user.academyId } })
      : null;

    const token = jwt.sign(
      { userId: user.id, role: user.role, academyId: user.academyId },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password: _, ...userWithoutPassword } = user;

    return res.json({ token, user: userWithoutPassword, academy });
  } catch (error) {
    console.error('[POST /auth/login]', error);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

// POST /api/auth/register-academy
router.post('/register-academy', async (req: Request, res: Response) => {
  try {
    const { name, ownerName, email, password, phone, cep, address, addressNumber, logo } = req.body;

    if (!email || !password || !name || !ownerName) {
      return res.status(400).json({ error: 'Campos obrigatórios ausentes.' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'E-mail já cadastrado.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const academy = await prisma.academy.create({
      data: { name, ownerName, email, phone, cep, address, addressNumber, logo }
    });

    const user = await prisma.user.create({
      data: {
        name: ownerName,
        email,
        password: hashedPassword,
        role: 'admin',
        status: 'Active',
        academyId: academy.id
      }
    });

    const token = jwt.sign(
      { userId: user.id, role: user.role, academyId: academy.id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password: _, ...userWithoutPassword } = user;
    return res.status(201).json({ token, user: userWithoutPassword, academy });
  } catch (error) {
    console.error('[POST /auth/register-academy]', error);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

// POST /api/auth/register-student
router.post('/register-student', async (req: Request, res: Response) => {
  try {
    const { name, email, password, academyId, birthDate, gender, belt, stripes } = req.body;

    if (!email || !password || !name || !academyId) {
      return res.status(400).json({ error: 'Campos obrigatórios ausentes.' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'E-mail já cadastrado.' });
    }

    const academy = await prisma.academy.findUnique({ where: { id: academyId } });
    if (!academy) {
      return res.status(404).json({ error: 'Academia não encontrada.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const student = await prisma.student.create({
      data: {
        name,
        email,
        birthDate,
        gender,
        belt: belt || 'WHITE',
        stripes: stripes || 0,
        academyId,
        status: 'Pending'
      }
    });

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'student',
        status: 'Pending',
        academyId
      }
    });

    return res.status(201).json({ message: 'Matrícula realizada! Aguarde aprovação. OSS!', studentId: student.id });
  } catch (error) {
    console.error('[POST /auth/register-student]', error);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

export default router;
