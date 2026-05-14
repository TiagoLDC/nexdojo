import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import pool from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
});

// Rate limiting só ativo em produção (NODE_ENV=production)
const loginMiddleware = process.env.NODE_ENV === 'production'
  ? loginLimiter
  : (_req: Request, _res: Response, next: NextFunction) => next();

// POST /api/auth/login
router.post('/login', loginMiddleware, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email e senha são obrigatórios' });
    return;
  }

  try {
    const [rows] = await pool.execute<any[]>(
      `SELECT id, academy_id, role, name, email, password_hash, status, requires_password_change
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
        requiresPasswordChange: !!user.requires_password_change,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/register/academy — público: cria academia + admin ativo
router.post('/register/academy', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Interceptor do frontend converte camelCase → snake_case antes de enviar
  const name = req.body.name;
  const ownerName = req.body.owner_name;
  const email = req.body.email;
  const password = req.body.password;
  const logo = req.body.logo;
  const cep = req.body.cep;
  const address = req.body.address;
  const addressNumber = req.body.address_number;
  const phone = req.body.phone;

  const missing: string[] = [];
  if (!ownerName) missing.push('Seu Nome');
  if (!name) missing.push('Nome da Unidade');
  if (!email) missing.push('E-mail de Contato');
  if (!password) missing.push('Senha');
  if (missing.length) {
    res.status(400).json({ error: `Preencha os campos obrigatórios: ${missing.join(', ')}.` });
    return;
  }
  try {
    const [existing] = await pool.execute<any[]>('SELECT id FROM users WHERE email = ?', [String(email).toLowerCase().trim()]);
    if ((existing as any[]).length) { res.status(409).json({ error: 'E-mail já cadastrado.' }); return; }

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
  // Interceptor do frontend converte camelCase → snake_case antes de enviar
  const academyId = req.body.academy_id;
  const name = req.body.name;
  const email = req.body.email;
  const password = req.body.password;
  const belt = req.body.belt;
  const stripes = req.body.stripes;
  const birthDate = req.body.birth_date;
  const gender = req.body.gender;
  const phone = req.body.phone;
  const cpf = req.body.cpf;
  const rg = req.body.rg;
  const weight = req.body.weight;
  const height = req.body.height;
  const bloodType = req.body.blood_type;
  const emergencyContact = req.body.emergency_contact;
  const emergencyPhone = req.body.emergency_phone;
  const cep = req.body.cep;
  const address = req.body.address;
  const addressNumber = req.body.address_number;
  const guardianName = req.body.guardian_name;
  const guardianPhone = req.body.guardian_phone;
  const guardianRelation = req.body.guardian_relation;
  const guardianCpf = req.body.guardian_cpf;
  const medicalNotes = req.body.medical_notes;
  const photo = req.body.photo;

  if (!academyId || !name || !email || !password || !belt || !birthDate) {
    res.status(400).json({ error: 'Preencha todos os campos obrigatórios.' });
    return;
  }
  try {
    const [acRows] = await pool.execute<any[]>('SELECT id FROM academies WHERE id = ?', [academyId]);
    if (!(acRows as any[])[0]) { res.status(404).json({ error: 'Academia não encontrada.' }); return; }

    const [existing] = await pool.execute<any[]>('SELECT id FROM users WHERE email = ?', [String(email).toLowerCase().trim()]);
    if ((existing as any[]).length) { res.status(409).json({ error: 'E-mail já cadastrado.' }); return; }

    const studentId = 'stu_' + Math.random().toString(36).substr(2, 9);
    const userId = 'usr_' + Math.random().toString(36).substr(2, 9);
    const passwordHash = await bcrypt.hash(String(password), 10);

    await pool.execute(
      `INSERT INTO students (id, academy_id, name, email, belt, stripes, birth_date, gender, phone, cpf, rg, weight, height, blood_type, emergency_contact, emergency_phone, cep, address, address_number, guardian_name, guardian_phone, guardian_relation, guardian_cpf, medical_notes, photo, status, join_date, total_classes, total_hours, absent_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', NOW(), 0, 0, 0)`,
      [studentId, academyId, name, String(email).toLowerCase().trim(), belt, stripes || 0, birthDate,
       gender || null, phone || null, cpf || null, rg || null,
       weight || null, height || null, bloodType || null,
       emergencyContact || null, emergencyPhone || null,
       cep || null, address || null, addressNumber || null,
       guardianName || null, guardianPhone || null, guardianRelation || null,
       guardianCpf || null, medicalNotes || null, photo || null]
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
  // Interceptor do frontend converte camelCase → snake_case antes de enviar
  const academyId = req.body.academy_id;
  const name = req.body.name;
  const email = req.body.email;
  const password = req.body.password;
  const belt = req.body.belt;
  const stripes = req.body.stripes;
  const birthDate = req.body.birth_date;
  const gender = req.body.gender;
  const phone = req.body.phone;
  const cpf = req.body.cpf;
  const rg = req.body.rg;
  const maritalStatus = req.body.marital_status;
  const lastGraduationDate = req.body.last_graduation_date;
  const specialties = req.body.specialties;
  const cep = req.body.cep;
  const address = req.body.address;
  const addressNumber = req.body.address_number;
  const photo = req.body.photo;

  if (!academyId || !name || !email || !password || !belt || !birthDate) {
    res.status(400).json({ error: 'Preencha todos os campos obrigatórios.' });
    return;
  }
  try {
    const [acRows] = await pool.execute<any[]>('SELECT id FROM academies WHERE id = ?', [academyId]);
    if (!(acRows as any[])[0]) { res.status(404).json({ error: 'Academia não encontrada.' }); return; }

    const [existing] = await pool.execute<any[]>('SELECT id FROM users WHERE email = ?', [String(email).toLowerCase().trim()]);
    if ((existing as any[]).length) { res.status(409).json({ error: 'E-mail já cadastrado.' }); return; }

    const instructorId = 'instr_' + Math.random().toString(36).substr(2, 9);
    const userId = 'usr_' + Math.random().toString(36).substr(2, 9);
    const passwordHash = await bcrypt.hash(String(password), 10);

    await pool.execute(
      `INSERT INTO instructors (id, academy_id, name, email, belt, stripes, birth_date, gender, phone, cpf, rg, marital_status, last_graduation_date, specialties, cep, address, address_number, photo, status, join_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', NOW())`,
      [instructorId, academyId, name, String(email).toLowerCase().trim(), belt, stripes || 0, birthDate,
       gender || null, phone || null, cpf || null, rg || null,
       maritalStatus || 'Solteiro', lastGraduationDate || null,
       specialties || null, cep || null, address || null,
       addressNumber || null, photo || null]
    );
    await pool.execute(
      `INSERT INTO users (id, academy_id, role, name, email, password_hash, status) VALUES (?, ?, 'instructor', ?, ?, ?, 'Pending')`,
      [userId, academyId, name, String(email).toLowerCase().trim(), passwordHash]
    );
    res.status(201).json({ message: 'Ficha enviada! Aguarde aprovação do administrador. OSS!' });
  } catch (err) { next(err); }
});

// POST /api/auth/change-password — usuário autenticado redefine senha (limpa flag de senha temporária)
router.post('/change-password', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Interceptor do frontend converte camelCase → snake_case antes de enviar
  const newPassword = req.body.new_password;

  if (!newPassword || String(newPassword).length < 6) {
    res.status(400).json({ error: 'A nova senha deve ter no mínimo 6 caracteres' });
    return;
  }

  try {
    const hash = await bcrypt.hash(String(newPassword), 10);
    await pool.execute(
      'UPDATE users SET password_hash = ?, requires_password_change = 0 WHERE id = ?',
      [hash, req.user!.userId]
    );
    res.json({ message: 'Senha alterada com sucesso' });
  } catch (err) {
    next(err);
  }
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
