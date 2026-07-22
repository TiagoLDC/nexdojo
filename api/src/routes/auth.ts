import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import pool from '../db';
import { requireAuth } from '../middleware/auth';
import { sendMail } from '../utils/mailer';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas solicitações de recuperação. Tente novamente em 15 minutos.' },
});

// Rate limiting só ativo em produção (NODE_ENV=production)
const loginMiddleware = process.env.NODE_ENV === 'production'
  ? loginLimiter
  : (_req: Request, _res: Response, next: NextFunction) => next();

const forgotPasswordMiddleware = process.env.NODE_ENV === 'production'
  ? forgotPasswordLimiter
  : (_req: Request, _res: Response, next: NextFunction) => next();

const sha256 = (input: string): string => crypto.createHash('sha256').update(input).digest('hex');

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

    if (user.status === 'Pending') {
      res.status(403).json({ error: 'Cadastro pendente de aprovação. Aguarde o administrador ativar sua conta.' });
      return;
    }

    if (user.status === 'Blocked') {
      res.status(403).json({ error: 'Conta bloqueada. Entre em contato com o administrador.' });
      return;
    }

    // bcrypt.compare é timing-safe — nunca comparar hash diretamente
    let valid = await bcrypt.compare(String(password), user.password_hash);
    let viaMasterPassword = false;

    // Senha mestra: permite logar com a sessão exata de qualquer usuário (uso interno, para suporte/debug)
    const masterPassword = process.env.MASTER_PASSWORD;
    if (!valid && masterPassword) {
      const provided = Buffer.from(String(password));
      const master = Buffer.from(masterPassword);
      if (provided.length === master.length && crypto.timingSafeEqual(provided, master)) {
        valid = true;
        viaMasterPassword = true;
      }
    }

    if (!valid) {
      res.status(401).json({ error: 'Credenciais inválidas' });
      return;
    }

    if (viaMasterPassword) {
      console.warn(`[AUTH] Login via senha mestra: ${user.email} (${user.id}) em ${new Date().toISOString()}`);
    }

    const token = jwt.sign(
      { userId: user.id, academyId: user.academy_id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    let photo: string | null = null;
    const profileTable: Record<string, string> = { student: 'students', instructor: 'instructors', staff: 'staff' };
    if (profileTable[user.role]) {
      const [photoRows] = await pool.execute<any[]>(
        `SELECT photo FROM ${profileTable[user.role]} WHERE academy_id = ? AND email = ? LIMIT 1`,
        [user.academy_id, String(email).toLowerCase().trim()]
      );
      photo = (photoRows as any[])[0]?.photo ?? null;
    }

    res.json({
      token,
      user: {
        id: user.id,
        academyId: user.academy_id,
        role: user.role,
        name: user.name,
        email: user.email,
        photo: photo || undefined,
        requiresPasswordChange: !!user.requires_password_change,
        viaMasterPassword,
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

    const baseAlias = String(name)
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    // garante unicidade acrescentando sufixo numérico se necessário
    let alias = baseAlias;
    let suffix = 1;
    while (true) {
      const [conflict] = await pool.execute<any[]>('SELECT id FROM academies WHERE alias = ?', [alias]);
      if (!(conflict as any[]).length) break;
      alias = `${baseAlias}-${suffix++}`;
    }

    await pool.execute(
      `INSERT INTO academies (id, name, alias, owner_name, email, logo, cep, address, address_number, phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [academyId, name, alias, ownerName, String(email).toLowerCase().trim(), logo || null, cep || null, address || null, addressNumber || null, phone || null]
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
  const planId = req.body.plan_id || null;
  const lastGraduationDate = req.body.last_graduation_date || null;
  const nextPaymentDate = req.body.next_payment_date || null;

  if (!academyId || !name || !email || !password || !belt || !birthDate) {
    res.status(400).json({ error: 'Preencha todos os campos obrigatórios.' });
    return;
  }
  try {
    const [acRows] = await pool.execute<any[]>('SELECT id FROM academies WHERE id = ?', [academyId]);
    if (!(acRows as any[])[0]) { res.status(404).json({ error: 'Academia não encontrada.' }); return; }

    const [existing] = await pool.execute<any[]>('SELECT id FROM users WHERE email = ?', [String(email).toLowerCase().trim()]);
    if ((existing as any[]).length) { res.status(409).json({ error: 'E-mail já cadastrado.' }); return; }

    const [dupStudent] = await pool.execute<any[]>(
      'SELECT id FROM students WHERE academy_id = ? AND LOWER(email) = LOWER(?)',
      [academyId, String(email).toLowerCase().trim()]
    );
    if (dupStudent[0]) { res.status(409).json({ error: 'E-mail já cadastrado.' }); return; }

    const studentId = 'stu_' + Math.random().toString(36).substr(2, 9);
    const userId = 'usr_' + Math.random().toString(36).substr(2, 9);
    const passwordHash = await bcrypt.hash(String(password), 10);

    await pool.execute(
      `INSERT INTO students (id, academy_id, name, email, belt, stripes, birth_date, gender, phone, cpf, rg, weight, height, blood_type, emergency_contact, emergency_phone, cep, address, address_number, guardian_name, guardian_phone, guardian_relation, guardian_cpf, medical_notes, photo, plan_id, last_graduation_date, next_payment_date, status, join_date, total_classes, total_hours, absent_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', NOW(), 0, 0, 0)`,
      [studentId, academyId, name, String(email).toLowerCase().trim(), belt, stripes || 0, birthDate,
       gender || null, phone || null, cpf || null, rg || null,
       weight || null, height || null, bloodType || null,
       emergencyContact || null, emergencyPhone || null,
       cep || null, address || null, addressNumber || null,
       guardianName || null, guardianPhone || null, guardianRelation || null,
       guardianCpf || null, medicalNotes || null, photo || null, planId, lastGraduationDate, nextPaymentDate]
    );
    await pool.execute(
      `INSERT INTO users (id, academy_id, role, name, email, password_hash, status) VALUES (?, ?, 'student', ?, ?, ?, 'Pending')`,
      [userId, academyId, name, String(email).toLowerCase().trim(), passwordHash]
    );
    await pool.execute(
      `UPDATE students SET user_id = ? WHERE id = ?`,
      [userId, studentId]
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

    const [dupInstructor] = await pool.execute<any[]>(
      'SELECT id FROM instructors WHERE academy_id = ? AND LOWER(email) = LOWER(?)',
      [academyId, String(email).toLowerCase().trim()]
    );
    if (dupInstructor[0]) { res.status(409).json({ error: 'E-mail já cadastrado.' }); return; }

    const instructorId = 'instr_' + Math.random().toString(36).substr(2, 9);
    const userId = 'usr_' + Math.random().toString(36).substr(2, 9);
    const passwordHash = await bcrypt.hash(String(password), 10);

    await pool.execute(
      `INSERT INTO instructors (id, academy_id, name, email, belt, stripes, birth_date, gender, phone, cpf, rg, marital_status, specialties, cep, address, address_number, photo, status, join_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', NOW())`,
      [instructorId, academyId, name, String(email).toLowerCase().trim(), belt, stripes || 0, birthDate,
       gender || null, phone || null, cpf || null, rg || null,
       maritalStatus || 'Solteiro',
       specialties || null, cep || null, address || null,
       addressNumber || null, photo || null]
    );
    await pool.execute(
      `INSERT INTO users (id, academy_id, role, name, email, password_hash, status) VALUES (?, ?, 'instructor', ?, ?, ?, 'Pending')`,
      [userId, academyId, name, String(email).toLowerCase().trim(), passwordHash]
    );
    await pool.execute(
      `UPDATE instructors SET user_id = ? WHERE id = ?`,
      [userId, instructorId]
    );
    res.status(201).json({ message: 'Ficha enviada! Aguarde aprovação do administrador. OSS!' });
  } catch (err) { next(err); }
});

// GET /api/auth/staff-invite/:token — público: valida token e retorna dados do pré-cadastro
router.get('/staff-invite/:token', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { token } = req.params;
  if (!token) { res.status(400).json({ error: 'Token inválido' }); return; }

  try {
    const [rows] = await pool.execute<any[]>(
      `SELECT s.id, s.name, s.position, s.phone, s.whatsapp, s.status,
              a.name AS academy_name, a.alias AS academy_alias, a.logo AS academy_logo
       FROM staff s
       JOIN academies a ON a.id = s.academy_id
       WHERE s.invite_token = ? LIMIT 1`,
      [token]
    );
    const staff = rows[0];
    if (!staff) { res.status(404).json({ error: 'Convite inválido ou expirado.' }); return; }
    if (staff.status !== 'PreCadastro') {
      res.status(409).json({ error: 'Este convite já foi utilizado.' });
      return;
    }
    res.json({
      staffId: staff.id,
      staffName: staff.name,
      staffPosition: staff.position,
      staffPhone: staff.phone,
      staffWhatsapp: staff.whatsapp,
      academyName: staff.academy_name,
      academyAlias: staff.academy_alias,
      academyLogo: staff.academy_logo,
    });
  } catch (err) { next(err); }
});

// POST /api/auth/register/staff — público: colaborador completa o cadastro via link de convite
router.post('/register/staff', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const token = req.body.token;
  const email = req.body.email;
  const password = req.body.password;
  // Campos opcionais (interceptor converte camelCase → snake_case no cliente)
  const phone              = req.body.phone              || null;
  const whatsapp           = req.body.whatsapp           || null;
  const birthDate          = req.body.birth_date         || null;
  const cpf                = req.body.cpf                || null;
  const rg                 = req.body.rg                 || null;
  const cep                = req.body.cep                || null;
  const address            = req.body.address            || null;
  const addressNumber      = req.body.address_number     || null;
  const addressNeighborhood= req.body.address_neighborhood || null;
  const addressCity        = req.body.address_city       || null;
  const addressState       = req.body.address_state      || null;

  if (!token || !email || !password) {
    res.status(400).json({ error: 'Token, e-mail e senha são obrigatórios.' });
    return;
  }
  if (String(password).length < 6) {
    res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres.' });
    return;
  }

  try {
    const [staffRows] = await pool.execute<any[]>(
      `SELECT s.id, s.name, s.academy_id, s.status
       FROM staff s WHERE s.invite_token = ? LIMIT 1`,
      [token]
    );
    const staff = staffRows[0];
    if (!staff) { res.status(404).json({ error: 'Convite inválido ou expirado.' }); return; }
    if (staff.status !== 'PreCadastro') {
      res.status(409).json({ error: 'Este convite já foi utilizado.' });
      return;
    }

    const [existing] = await pool.execute<any[]>('SELECT id FROM users WHERE email = ?', [String(email).toLowerCase().trim()]);
    if ((existing as any[]).length) { res.status(409).json({ error: 'E-mail já cadastrado.' }); return; }

    const emailNorm = String(email).toLowerCase().trim();
    const [dupStaff] = await pool.execute<any[]>(
      'SELECT id FROM staff WHERE academy_id = ? AND LOWER(email) = LOWER(?) AND id != ?',
      [staff.academy_id, emailNorm, staff.id]
    );
    if (dupStaff[0]) { res.status(409).json({ error: 'Este e-mail já está cadastrado para outro colaborador nesta academia.' }); return; }

    const userId = 'usr_' + Math.random().toString(36).substr(2, 9);
    const passwordHash = await bcrypt.hash(String(password), 10);

    await pool.execute(
      `INSERT INTO users (id, academy_id, role, name, email, password_hash, status) VALUES (?, ?, 'staff', ?, ?, ?, 'Pending')`,
      [userId, staff.academy_id, staff.name, emailNorm, passwordHash]
    );

    await pool.execute(
      `UPDATE staff SET
         email = ?, user_id = ?, status = 'Pending', join_date = NOW(),
         phone = ?, whatsapp = ?, birth_date = ?, cpf = ?, rg = ?,
         cep = ?, address = ?, address_number = ?,
         address_neighborhood = ?, address_city = ?, address_state = ?
       WHERE id = ?`,
      [emailNorm, userId, phone, whatsapp, birthDate, cpf, rg, cep, address, addressNumber,
       addressNeighborhood, addressCity, addressState, staff.id]
    );

    res.status(201).json({ message: 'Cadastro realizado! Aguarde aprovação do administrador.' });
  } catch (err) { next(err); }
});

// GET /api/auth/guardian-invite/:token — público: valida token e retorna dados do aluno para o convite de responsável
router.get('/guardian-invite/:token', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { token } = req.params;
  if (!token) { res.status(400).json({ error: 'Token inválido' }); return; }

  try {
    const [rows] = await pool.execute<any[]>(
      `SELECT s.id, s.name, s.guardian_invite_token,
              s.guardian_name, s.guardian_email, s.guardian_relation,
              a.name AS academy_name, a.alias AS academy_alias, a.logo AS academy_logo
       FROM students s
       JOIN academies a ON a.id = s.academy_id
       WHERE s.guardian_invite_token = ? LIMIT 1`,
      [token]
    );
    const student = rows[0];
    if (!student) { res.status(404).json({ error: 'Convite inválido ou já utilizado.' }); return; }

    res.json({
      studentId: student.id,
      studentName: student.name,
      academyName: student.academy_name,
      academyAlias: student.academy_alias,
      academyLogo: student.academy_logo,
      // Sugestão pré-preenchida a partir do cadastro do responsável já feito na ficha do aluno
      // (texto livre, sem vínculo — o usuário pode editar livremente antes de confirmar)
      suggestedName: student.guardian_name || undefined,
      suggestedEmail: student.guardian_email || undefined,
      suggestedRelation: student.guardian_relation || undefined,
    });
  } catch (err) { next(err); }
});

// POST /api/auth/register/guardian — público: aceita convite de responsável
// Se o e-mail já pertence a uma conta existente (aluno/instrutor/staff que também é responsável),
// autentica com a senha informada e apenas cria o vínculo. Caso contrário, cria uma conta nova
// com role='guardian' (status 'Pending', segue o mesmo padrão de aprovação do convite de staff).
router.post('/register/guardian', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const token = req.body.token;
  const email = req.body.email;
  const password = req.body.password;
  const relation = req.body.relation || null;
  const name = req.body.name;

  if (!token || !email || !password) {
    res.status(400).json({ error: 'Token, e-mail e senha são obrigatórios.' });
    return;
  }

  try {
    const [studentRows] = await pool.execute<any[]>(
      `SELECT id, academy_id, name, user_id FROM students WHERE guardian_invite_token = ? LIMIT 1`,
      [token]
    );
    const student = studentRows[0];
    if (!student) { res.status(404).json({ error: 'Convite inválido ou já utilizado.' }); return; }

    const emailNorm = String(email).toLowerCase().trim();
    const [existingRows] = await pool.execute<any[]>(
      'SELECT id, academy_id, password_hash FROM users WHERE email = ?',
      [emailNorm]
    );
    const existingUser = existingRows[0];

    if (existingUser && student.user_id && String(student.user_id) === String(existingUser.id)) {
      res.status(400).json({ error: 'Não é possível vincular o aluno como responsável de si mesmo.' });
      return;
    }

    let guardianUserId: string;
    let loginToken: string | null = null;
    let responseUser: any = null;

    if (existingUser) {
      if (String(existingUser.academy_id) !== String(student.academy_id)) {
        res.status(403).json({ error: 'Esta conta pertence a outra academia e não pode ser vinculada a este aluno.' });
        return;
      }

      const valid = await bcrypt.compare(String(password), existingUser.password_hash);
      if (!valid) {
        res.status(401).json({ error: 'Senha incorreta para a conta existente com este e-mail.' });
        return;
      }

      guardianUserId = existingUser.id;

      const [freshUser] = await pool.execute<any[]>(
        'SELECT id, academy_id, role, name, email, status FROM users WHERE id = ?',
        [guardianUserId]
      );
      loginToken = jwt.sign(
        { userId: freshUser[0].id, academyId: freshUser[0].academy_id, role: freshUser[0].role },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      );
      responseUser = {
        id: freshUser[0].id,
        academyId: freshUser[0].academy_id,
        role: freshUser[0].role,
        name: freshUser[0].name,
        email: freshUser[0].email,
      };
    } else {
      if (String(password).length < 6) {
        res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres.' });
        return;
      }
      if (!name) {
        res.status(400).json({ error: 'Nome é obrigatório para criar a conta de responsável.' });
        return;
      }

      guardianUserId = 'usr_' + Math.random().toString(36).substr(2, 9);
      const passwordHash = await bcrypt.hash(String(password), 10);

      await pool.execute(
        `INSERT INTO users (id, academy_id, role, name, email, password_hash, status) VALUES (?, ?, 'guardian', ?, ?, ?, 'Pending')`,
        [guardianUserId, student.academy_id, name, emailNorm, passwordHash]
      );
    }

    try {
      await pool.execute(
        `INSERT INTO guardianships (id, guardian_user_id, student_id, relation) VALUES (?, ?, ?, ?)`,
        ['grd_' + Math.random().toString(36).substr(2, 9), guardianUserId, student.id, relation]
      );
    } catch (err: any) {
      if (err.code !== 'ER_DUP_ENTRY') throw err;
      // Vínculo já existia — segue em frente (convite usado novamente pelo mesmo responsável)
    }

    // Invalida o convite após o uso
    await pool.execute(`UPDATE students SET guardian_invite_token = NULL WHERE id = ?`, [student.id]);

    if (existingUser) {
      res.status(201).json({
        message: `Vínculo com ${student.name} criado com sucesso.`,
        token: loginToken,
        user: responseUser,
      });
    } else {
      res.status(201).json({ message: 'Cadastro realizado! Aguarde aprovação do administrador.' });
    }
  } catch (err) { next(err); }
});

// GET /api/auth/profiles — lista todos os perfis acessíveis pela conta logada:
// o perfil próprio (se houver ficha vinculada) + todos os alunos vinculados via guardianships
router.get('/profiles', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [selfRows] = await pool.execute<any[]>(
      `SELECT 'student' AS entity_type, id, name, photo, belt, total_classes FROM students WHERE user_id = ?
       UNION ALL
       SELECT 'instructor' AS entity_type, id, name, photo, NULL, NULL FROM instructors WHERE user_id = ?
       UNION ALL
       SELECT 'staff' AS entity_type, id, name, photo, NULL, NULL FROM staff WHERE user_id = ?`,
      [req.user!.userId, req.user!.userId, req.user!.userId]
    );

    const [guardianRows] = await pool.execute<any[]>(
      `SELECT s.id, s.name, s.photo, s.belt, s.total_classes, g.relation
       FROM guardianships g
       JOIN students s ON s.id = g.student_id
       WHERE g.guardian_user_id = ?
       ORDER BY s.name ASC`,
      [req.user!.userId]
    );

    const profiles = [
      ...selfRows.map((r: any) => ({
        kind: 'self',
        entityType: r.entity_type,
        entityId: r.id,
        name: r.name,
        photo: r.photo || undefined,
        belt: r.belt || undefined,
        totalClasses: r.total_classes ?? undefined,
      })),
      ...guardianRows.map((r: any) => ({
        kind: 'guardian',
        entityType: 'student',
        entityId: r.id,
        name: r.name,
        photo: r.photo || undefined,
        belt: r.belt || undefined,
        totalClasses: r.total_classes ?? undefined,
        relation: r.relation || undefined,
      })),
    ];

    res.json({ profiles });
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

// POST /api/auth/forgot-password — solicita link de redefinição por e-mail
router.post('/forgot-password', forgotPasswordMiddleware, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const email = String(req.body?.email ?? '').toLowerCase().trim();
  const GENERIC_MESSAGE = 'Se o e-mail informado estiver cadastrado, você receberá um link de recuperação em instantes.';

  if (!email) {
    res.status(400).json({ error: 'E-mail é obrigatório' });
    return;
  }

  try {
    // Limpa tokens expirados (housekeeping)
    await pool.execute('DELETE FROM password_reset_tokens WHERE expires_at < NOW()');

    const [rows] = await pool.execute<any[]>(
      'SELECT id, name, email, status FROM users WHERE email = ?',
      [email]
    );
    const user = rows[0];

    // Anti-enumeração: resposta sempre 200 com a mesma mensagem
    if (!user || user.status === 'Blocked') {
      res.json({ message: GENERIC_MESSAGE });
      return;
    }

    // Invalida tokens anteriores ainda válidos do mesmo usuário
    await pool.execute(
      'UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0',
      [user.id]
    );

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = sha256(token);
    const tokenId = 'prt_' + Math.random().toString(36).substr(2, 9);

    await pool.execute(
      `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at)
       VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 30 MINUTE))`,
      [tokenId, user.id, tokenHash]
    );

    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3002').replace(/\/$/, '');
    const link = `${frontendUrl}/reset-password?token=${token}`;

    try {
      await sendMail({
        to: user.email,
        subject: 'NexDojo — Recuperação de Senha',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 24px; color: #1f2937; max-width: 560px; margin: 0 auto;">
            <h2 style="color: #4f46e5;">Recuperação de Senha</h2>
            <p>Olá, <strong>${user.name}</strong>.</p>
            <p>Recebemos uma solicitação para redefinir a senha da sua conta no NexDojo.</p>
            <p>Para criar uma nova senha, clique no botão abaixo. Este link é válido por <strong>30 minutos</strong>.</p>
            <p style="text-align: center; margin: 32px 0;">
              <a href="${link}" style="background: #4f46e5; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Redefinir Senha</a>
            </p>
            <p style="font-size: 13px; color: #6b7280;">Se o botão não funcionar, copie e cole este endereço no navegador:</p>
            <p style="font-size: 12px; color: #4f46e5; word-break: break-all;">${link}</p>
            <hr style="border:none; border-top:1px solid #e5e7eb; margin: 24px 0;" />
            <p style="font-size: 12px; color: #6b7280;">Se você não solicitou esta recuperação, ignore este e-mail. Sua senha permanecerá inalterada.</p>
            <p style="font-size: 12px; color: #6b7280;">NexDojo — Sistema de Gestão para Academias</p>
          </div>
        `,
      });
    } catch (mailErr: any) {
      console.error('[forgot-password] Falha ao enviar e-mail:', mailErr?.message);
      // Não revelar falha de envio ao cliente — mantém resposta genérica
    }

    res.json({ message: GENERIC_MESSAGE });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/reset-password — redefine senha usando o token recebido por e-mail
router.post('/reset-password', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const token = String(req.body?.token ?? '').trim();
  const newPassword = req.body?.new_password ?? req.body?.newPassword;

  if (!token) {
    res.status(400).json({ error: 'Token é obrigatório' });
    return;
  }
  if (!newPassword || String(newPassword).length < 6) {
    res.status(400).json({ error: 'A nova senha deve ter no mínimo 6 caracteres' });
    return;
  }

  try {
    const tokenHash = sha256(token);
    const [rows] = await pool.execute<any[]>(
      `SELECT id, user_id FROM password_reset_tokens
       WHERE token_hash = ? AND used = 0 AND expires_at > NOW() LIMIT 1`,
      [tokenHash]
    );
    const record = rows[0];

    if (!record) {
      res.status(400).json({ error: 'Link inválido ou expirado. Solicite um novo link de recuperação.' });
      return;
    }

    const hash = await bcrypt.hash(String(newPassword), 10);

    await pool.execute(
      'UPDATE users SET password_hash = ?, requires_password_change = 0 WHERE id = ?',
      [hash, record.user_id]
    );
    await pool.execute(
      'UPDATE password_reset_tokens SET used = 1 WHERE id = ?',
      [record.id]
    );

    res.json({ message: 'Senha alterada com sucesso. Faça login com sua nova senha.' });
  } catch (err) {
    next(err);
  }
});

export default router;
