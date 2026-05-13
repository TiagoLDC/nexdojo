import { Router, Request, Response, NextFunction } from 'express';
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
router.post('/login', loginLimiter, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
    next(err);
  }
});

// POST /api/auth/register/academy — público: cria academia + admin ativo
router.post('/register/academy', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { name, ownerName, email, password, logo, cep, address, addressNumber, phone } = req.body;
  if (!name || !ownerName || !email || !password) {
    res.status(400).json({ error: 'Campos obrigatórios: name, ownerName, email, password' });
    return;
  }
  try {
    const [existing] = await pool.execute<any[]>('SELECT id FROM users WHERE email = ?', [String(email).toLowerCase().trim()]);
    if ((existing as any[]).length) { res.status(409).json({ error: 'E-mail já cadastrado' }); return; }

    const academyId = 'acad_' + Math.random().toString(36).substr(2, 9);
    const userId = 'usr_' + Math.random().toString(36).substr(2, 9);
    const passwordHash = await bcrypt.hash(String(password), 10);

    await pool.execute(
      `INSERT INTO academies (id, name, owner_name, email, logo, cep, address, address_number, phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [academyId, name, ownerName, String(email).toLowerCase().trim(), logo || null, cep || null, address || null, addressNumber || null, phone || null]
    );
    await pool.execute(
      `INSERT INTO users (id, academy_id, role, name, email, password_hash, status) VALUES (?, ?, 'admin', ?, ?, ?, 'Active')`,
      [userId, academyId, ownerName, String(email).toLowerCase().trim(), passwordHash]
    );
    res.status(201).json({ message: 'Academia criada com sucesso! Faça login com suas credenciais.' });
  } catch (err) { next(err); }
});

// POST /api/auth/register/student — público: cria aluno + user pendente
router.post('/register/student', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { academyId, name, email, password, belt, stripes, birthDate, ...rest } = req.body;
  if (!academyId || !name || !email || !password || !belt || !birthDate) {
    res.status(400).json({ error: 'Campos obrigatórios: academyId, name, email, password, belt, birthDate' });
    return;
  }
  try {
    const [acRows] = await pool.execute<any[]>('SELECT id FROM academies WHERE id = ?', [academyId]);
    if (!(acRows as any[])[0]) { res.status(404).json({ error: 'Academia não encontrada' }); return; }

    const [existing] = await pool.execute<any[]>('SELECT id FROM users WHERE email = ?', [String(email).toLowerCase().trim()]);
    if ((existing as any[]).length) { res.status(409).json({ error: 'E-mail já cadastrado' }); return; }

    const studentId = 'stu_' + Math.random().toString(36).substr(2, 9);
    const userId = 'usr_' + Math.random().toString(36).substr(2, 9);
    const passwordHash = await bcrypt.hash(String(password), 10);

    await pool.execute(
      `INSERT INTO students (id, academy_id, name, email, belt, stripes, birth_date, gender, phone, cpf, rg, weight, height, blood_type, emergency_contact, emergency_phone, cep, address, address_number, guardian_name, guardian_phone, guardian_relation, guardian_cpf, medical_notes, photo, status, join_date, total_classes, total_hours, absent_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', NOW(), 0, 0, 0)`,
      [studentId, academyId, name, String(email).toLowerCase().trim(), belt, stripes || 0, birthDate,
       rest.gender || null, rest.phone || null, rest.cpf || null, rest.rg || null,
       rest.weight || null, rest.height || null, rest.bloodType || null,
       rest.emergencyContact || null, rest.emergencyPhone || null,
       rest.cep || null, rest.address || null, rest.addressNumber || null,
       rest.guardianName || null, rest.guardianPhone || null, rest.guardianRelation || null,
       rest.guardianCpf || null, rest.medicalNotes || null, rest.photo || null]
    );
    await pool.execute(
      `INSERT INTO users (id, academy_id, role, name, email, password_hash, status) VALUES (?, ?, 'student', ?, ?, ?, 'Pending')`,
      [userId, academyId, name, String(email).toLowerCase().trim(), passwordHash]
    );
    res.status(201).json({ message: 'Matrícula realizada! Aguarde aprovação do administrador. OSS!' });
  } catch (err) { next(err); }
});

// POST /api/auth/register/instructor — público: cria instrutor + user pendente
router.post('/register/instructor', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { academyId, name, email, password, belt, stripes, birthDate, ...rest } = req.body;
  if (!academyId || !name || !email || !password || !belt || !birthDate) {
    res.status(400).json({ error: 'Campos obrigatórios: academyId, name, email, password, belt, birthDate' });
    return;
  }
  try {
    const [acRows] = await pool.execute<any[]>('SELECT id FROM academies WHERE id = ?', [academyId]);
    if (!(acRows as any[])[0]) { res.status(404).json({ error: 'Academia não encontrada' }); return; }

    const [existing] = await pool.execute<any[]>('SELECT id FROM users WHERE email = ?', [String(email).toLowerCase().trim()]);
    if ((existing as any[]).length) { res.status(409).json({ error: 'E-mail já cadastrado' }); return; }

    const instructorId = 'instr_' + Math.random().toString(36).substr(2, 9);
    const userId = 'usr_' + Math.random().toString(36).substr(2, 9);
    const passwordHash = await bcrypt.hash(String(password), 10);

    await pool.execute(
      `INSERT INTO instructors (id, academy_id, name, email, belt, stripes, birth_date, gender, phone, cpf, rg, marital_status, last_graduation_date, specialties, cep, address, address_number, photo, status, join_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', NOW())`,
      [instructorId, academyId, name, String(email).toLowerCase().trim(), belt, stripes || 0, birthDate,
       rest.gender || null, rest.phone || null, rest.cpf || null, rest.rg || null,
       rest.maritalStatus || 'Solteiro', rest.lastGraduationDate || null,
       rest.specialties || null, rest.cep || null, rest.address || null,
       rest.addressNumber || null, rest.photo || null]
    );
    await pool.execute(
      `INSERT INTO users (id, academy_id, role, name, email, password_hash, status) VALUES (?, ?, 'instructor', ?, ?, ?, 'Pending')`,
      [userId, academyId, name, String(email).toLowerCase().trim(), passwordHash]
    );
    res.status(201).json({ message: 'Ficha enviada! Aguarde aprovação do administrador. OSS!' });
  } catch (err) { next(err); }
});

// POST /api/auth/logout — JWT é stateless; apenas sinaliza ao cliente para descartar o token
router.post('/logout', requireAuth, (_req: Request, res: Response): void => {
  res.json({ message: 'Logout realizado com sucesso' });
});

// GET /api/auth/me — retorna dados do usuário autenticado (sem password_hash)
router.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
    next(err);
  }
});

export default router;
