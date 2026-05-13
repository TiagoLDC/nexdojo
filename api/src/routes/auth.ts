import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import pool from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // janela de 15 minutos
  max: 10,                   // máx. 10 tentativas por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email e senha são obrigatórios' });
    return;
  }

  try {
    const [rows] = await pool.execute<any[]>(
      `SELECT id, academy_id, role, name, email, password_hash, status
       FROM users WHERE email = ?`,
      [String(email).toLowerCase().trim()]
    );

    const user = rows[0];

    // Mensagem genérica para não revelar se o email existe ou não
    if (!user) {
      res.status(401).json({ error: 'Credenciais inválidas' });
      return;
    }

    if (user.status === 'Blocked') {
      res.status(403).json({ error: 'Conta bloqueada. Entre em contato com o administrador.' });
      return;
    }

    // bcrypt.compare é timing-safe — nunca comparar hash diretamente
    const valid = await bcrypt.compare(String(password), user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Credenciais inválidas' });
      return;
    }

    const token = jwt.sign(
      { userId: user.id, academyId: user.academy_id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        academyId: user.academy_id,
        role: user.role,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    throw err;
  }
});

// POST /api/auth/logout — JWT é stateless; apenas sinaliza ao cliente para descartar o token
router.post('/logout', requireAuth, (_req: Request, res: Response): void => {
  res.json({ message: 'Logout realizado com sucesso' });
});

// GET /api/auth/me — retorna dados do usuário autenticado (sem password_hash)
router.get('/me', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const [rows] = await pool.execute<any[]>(
      `SELECT id, academy_id, role, name, email, status, created_at
       FROM users WHERE id = ?`,
      [req.user!.userId]
    );

    const user = rows[0];
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }

    res.json({
      id: user.id,
      academyId: user.academy_id,
      role: user.role,
      name: user.name,
      email: user.email,
      status: user.status,
      createdAt: user.created_at,
    });
  } catch (err) {
    throw err;
  }
});

export default router;
