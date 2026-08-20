import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import pool from '../db';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { getAcademyId } from '../utils/academyScope';
import { validate } from '../utils/validate';
import { withTransaction } from '../utils/withTransaction';
import { autoLinkEntityToUser } from '../utils/linkEntityUser';
import { isGuardianOfStudent, getGuardianStudentIds } from '../utils/guardianAccess';
import { getTodayBrasilia } from '../utils/date';
import { resolveBeltRank } from '../utils/beltRanks';

const router = Router();

const buildGuardianInviteLink = (alias: string, token: string): string => {
  const base = (process.env.FRONTEND_URL || 'http://localhost:3002').replace(/\/$/, '');
  return `${base}/guardian-invite/${alias}/${token}`;
};

const BELT_VALUES = [
  'Branca',
  'Cinza e Branca', 'Cinza', 'Cinza e Preta',
  'Amarela e Branca', 'Amarela', 'Amarela e Preta',
  'Laranja e Branca', 'Laranja', 'Laranja e Preta',
  'Verde e Branca', 'Verde', 'Verde e Preta',
  'Azul', 'Roxa', 'Marrom', 'Preta', 'Coral', 'Vermelha',
];

const STATUS_VALUES = ['Active', 'Inactive', 'Dropped', 'Pending'];

const UPDATABLE_FIELDS = [
  'name', 'email', 'phone', 'belt', 'stripes', 'birth_date', 'gender', 'photo',
  'cpf', 'rg', 'weight', 'height', 'blood_type', 'emergency_contact', 'emergency_phone',
  'cep', 'address', 'address_number', 'guardian_name', 'guardian_phone', 'guardian_email',
  'guardian_cpf', 'guardian_rg', 'guardian_relation', 'guardian_profession',
  'medical_notes', 'status', 'join_date', 'plan_id', 'next_payment_date',
  'absence_limit', 'last_graduation_date',
];

// GET /api/students
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  const { search, email, userId, belt, beltRankId, status, page = '1', limit = '20' } = req.query;
  const pageNum = Math.max(1, parseInt(String(page), 10));
  const limitNum = Math.min(1000, Math.max(1, parseInt(String(limit), 10)));
  const offset = (pageNum - 1) * limitNum;

  let where = 'WHERE s.academy_id = ?';
  const params: any[] = [academyId];

  // Responsável (role='guardian') só vê os alunos vinculados via guardianships
  if (req.user!.role === 'guardian') {
    const allowedIds = await getGuardianStudentIds(req.user!.userId);
    if (!allowedIds.length) {
      res.json({ data: [], total: 0, page: 1, limit: Number(limit), totalPages: 0 });
      return;
    }
    where += ` AND s.id IN (${allowedIds.map(() => '?').join(',')})`;
    params.push(...allowedIds);
  }

  if (userId) {
    where += ' AND s.user_id = ?';
    params.push(userId);
  } else if (email) {
    where += ' AND s.email = ?';
    params.push(email);
  }
  if (search) {
    where += ' AND (s.name LIKE ? OR s.email LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (belt) {
    where += ' AND s.belt = ?';
    params.push(belt);
  }
  if (beltRankId) {
    where += ' AND s.belt_rank_id = ?';
    params.push(beltRankId);
  }
  if (status) {
    where += ' AND s.status = ?';
    params.push(status);
  }

  try {
    const [countRows] = await pool.execute<any[]>(
      `SELECT COUNT(*) as total FROM students s ${where}`,
      params
    );
    const total = (countRows[0] as any).total;

    const [rows] = await pool.execute<any[]>(
      `SELECT s.*, u.status as user_status FROM students s LEFT JOIN users u ON u.id = s.user_id ${where} ORDER BY s.name ASC LIMIT ${limitNum} OFFSET ${offset}`,
      params
    );

    // Listagens (ex: dashboard) muitas vezes não precisam da foto de todo mundo — a coluna é
    // um LONGTEXT com o base64 completo, então incluí-la em listas de até 1000 registros infla
    // o payload e derruba o tempo de carregamento à toa. Quem pedir explicitamente continua
    // recebendo como sempre (comportamento padrão inalterado).
    const data = req.query.includePhoto === 'false'
      ? (rows as any[]).map(({ photo, ...rest }) => rest)
      : rows;

    res.json({ data, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) });
  } catch (err) {
    next(err);
  }
});

// GET /api/students/photos?ids=id1,id2,... — busca em lote só a foto de ids específicos,
// usado por telas que renderizam foto pra pouca gente de uma lista grande (ex: dashboard).
// Precisa vir ANTES de "/:id" — senão o Express casaria "/photos" como se fosse um :id.
router.get('/photos', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  const ids = String(req.query.ids || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 200);

  if (!ids.length) {
    res.json({});
    return;
  }

  try {
    const [rows] = await pool.execute<any[]>(
      `SELECT id, photo FROM students WHERE academy_id = ? AND id IN (${ids.map(() => '?').join(',')})`,
      [academyId, ...ids]
    );
    const result: Record<string, string> = {};
    for (const row of rows as any[]) {
      if (row.photo) result[row.id] = row.photo;
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/students/:id
router.get('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  try {
    const [rows] = await pool.execute<any[]>(
      'SELECT * FROM students WHERE id = ? AND academy_id = ?',
      [req.params.id, academyId]
    );
    if (!rows[0]) {
      res.status(404).json({ error: 'Aluno não encontrado' });
      return;
    }

    if (req.user!.role === 'guardian' && !(await isGuardianOfStudent(req.user!.userId, String(req.params.id)))) {
      res.status(403).json({ error: 'Sem permissão para esta ação' });
      return;
    }

    const [docs] = await pool.execute<any[]>(
      'SELECT * FROM student_documents WHERE student_id = ? ORDER BY created_at DESC',
      [req.params.id]
    );

    const [grad] = await pool.execute<any[]>(
      'SELECT * FROM graduation_history WHERE student_id = ? ORDER BY date DESC',
      [req.params.id]
    );

    const mapDoc = (d: any) => ({
      id: d.id,
      name: d.name,
      type: d.type || 'application/octet-stream',
      size: d.size || 0,
      base64: d.url,
      uploadedAt: d.created_at,
    });
    res.json({ ...rows[0], documents: (docs as any[]).map(mapDoc), graduationHistory: grad });
  } catch (err) {
    next(err);
  }
});

// POST /api/students
router.post('/', requireAuth, requireRole('admin', 'superuser', 'staff'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  // String vazia não é NULL para o índice único (academy_id, email) do MySQL:
  // duas alunas sem e-mail colidiriam. Normaliza para null antes de validar/inserir.
  if (typeof req.body.email === 'string' && req.body.email.trim() === '') req.body.email = null;

  const errors = validate(req.body, {
    name:     { required: true, type: 'string', maxLength: 255 },
    email:    { type: 'email' },
    belt:     { enum: BELT_VALUES },
    status:   { enum: STATUS_VALUES },
  });
  if (errors.length) { res.status(400).json({ error: errors[0] }); return; }

  const b = req.body;

  // Se email sem senha: só é permitido se já existir um usuário com esse email (vincula)
  if (b.email && !b.password) {
    const [userCheck] = await pool.execute<any[]>(
      'SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND academy_id = ?',
      [String(b.email).toLowerCase().trim(), academyId]
    );
    if (!userCheck[0]) {
      res.status(400).json({ error: 'password é obrigatório para criar conta de acesso' });
      return;
    }
  }
  if (b.password && String(b.password).length < 6) {
    res.status(400).json({ error: 'password deve ter no mínimo 6 caracteres' });
    return;
  }

  if (b.email) {
    const [dupCheck] = await pool.execute<any[]>(
      'SELECT id FROM students WHERE academy_id = ? AND LOWER(email) = LOWER(?)',
      [academyId, String(b.email).trim()]
    );
    if (dupCheck[0]) {
      res.status(409).json({ error: 'Este e-mail já está cadastrado para outro aluno nesta academia.' });
      return;
    }
  }

  try {
    const studentId = crypto.randomUUID();
    // Dual-write: resolve belt_rank_id em paralelo ao belt (ENUM) — ver PLANO_GRADUACAO.md Fase 3.
    // Não bloqueia o cadastro se não resolver (academia sem sport_id ainda, etc.).
    const resolvedBeltRank = await resolveBeltRank(academyId, b.belt ?? 'Branca');

    const studentValues = [
      studentId, academyId,
      b.name, b.email ?? null, b.phone ?? null,
      b.belt ?? 'Branca', resolvedBeltRank?.id ?? null, b.stripes ?? 0,
      b.birth_date ?? null, b.gender ?? null, b.photo ?? null,
      b.cpf ?? null, b.rg ?? null, b.weight ?? null, b.height ?? null, b.blood_type ?? null,
      b.emergency_contact ?? null, b.emergency_phone ?? null,
      b.cep ?? null, b.address ?? null, b.address_number ?? null,
      b.guardian_name ?? null, b.guardian_phone ?? null, b.guardian_email ?? null,
      b.guardian_cpf ?? null, b.guardian_rg ?? null,
      b.guardian_relation ?? null, b.guardian_profession ?? null,
      b.medical_notes ?? null, b.status ?? 'Active',
      b.join_date ?? null, b.plan_id ?? null,
      b.next_payment_date ?? null, b.absence_limit ?? null,
    ];

    let createdStudent: any;

    if (b.email && b.password) {
      // Cria user + student atomicamente
      createdStudent = await withTransaction(async (conn) => {
        const [existing] = await conn.execute<any[]>(
          'SELECT id FROM users WHERE email = ?',
          [String(b.email).toLowerCase().trim()]
        );
        if (existing[0]) throw Object.assign(new Error('E-mail já cadastrado'), { statusCode: 409 });

        const userId = crypto.randomUUID();
        const hash = await bcrypt.hash(String(b.password), 10);

        await conn.execute(
          `INSERT INTO users (id, academy_id, role, name, email, password_hash)
           VALUES (?,?,?,?,?,?)`,
          [userId, academyId, 'student', b.name, String(b.email).toLowerCase().trim(), hash]
        );

        await conn.execute(
          `INSERT INTO students (
            id, academy_id, user_id, name, email, phone, belt, belt_rank_id, stripes, birth_date, gender, photo,
            cpf, rg, weight, height, blood_type, emergency_contact, emergency_phone,
            cep, address, address_number, guardian_name, guardian_phone, guardian_email,
            guardian_cpf, guardian_rg, guardian_relation, guardian_profession,
            medical_notes, status, join_date, plan_id, next_payment_date, absence_limit
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [studentId, academyId, userId, ...studentValues.slice(2)]
        );

        const [rows] = await conn.execute<any[]>('SELECT * FROM students WHERE id = ?', [studentId]);
        return rows[0];
      });
    } else {
      // Sem senha: insere student e vincula a usuário existente pelo email (se houver)
      await pool.execute(
        `INSERT INTO students (
          id, academy_id, name, email, phone, belt, belt_rank_id, stripes, birth_date, gender, photo,
          cpf, rg, weight, height, blood_type, emergency_contact, emergency_phone,
          cep, address, address_number, guardian_name, guardian_phone, guardian_email,
          guardian_cpf, guardian_rg, guardian_relation, guardian_profession,
          medical_notes, status, join_date, plan_id, next_payment_date, absence_limit
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        studentValues
      );
      if (b.email) {
        await autoLinkEntityToUser('students', studentId, b.email, academyId);
      }
      const [rows] = await pool.execute<any[]>('SELECT * FROM students WHERE id = ?', [studentId]);
      createdStudent = rows[0];
    }

    res.status(201).json(createdStudent);
  } catch (err: any) {
    if (err.statusCode) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    next(err);
  }
});

// PUT /api/students/:id
router.put('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  // String vazia não é NULL para o índice único (academy_id, email) do MySQL — normaliza.
  if (typeof req.body.email === 'string' && req.body.email.trim() === '') req.body.email = null;

  const newPassword = req.body.password ? String(req.body.password) : null;
  if (newPassword && newPassword.length < 6) {
    res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres' });
    return;
  }

  try {
    const [existing] = await pool.execute<any[]>(
      'SELECT id, user_id, name, email, belt, belt_rank_id, stripes, last_graduation_date FROM students WHERE id = ? AND academy_id = ?',
      [req.params.id, academyId]
    );
    if (!existing[0]) { res.status(404).json({ error: 'Aluno não encontrado' }); return; }

    // Só valida o formato do e-mail se ele estiver sendo alterado, para não travar
    // edições em cadastros antigos que já tinham e-mail salvo em formato inválido.
    const emailChanged = req.body.email !== undefined && req.body.email !== existing[0].email;
    const errors = validate(req.body, {
      name:   { type: 'string', maxLength: 255 },
      ...(emailChanged ? { email: { type: 'email' as const } } : {}),
      belt:   { enum: BELT_VALUES },
      status: { enum: STATUS_VALUES },
    });
    if (errors.length) { res.status(400).json({ error: errors[0] }); return; }

    if (emailChanged && req.body.email) {
      const [dupCheck] = await pool.execute<any[]>(
        'SELECT id FROM students WHERE academy_id = ? AND LOWER(email) = LOWER(?) AND id != ?',
        [academyId, String(req.body.email).trim(), req.params.id]
      );
      if (dupCheck[0]) {
        res.status(409).json({ error: 'Este e-mail já está cadastrado para outro aluno nesta academia.' });
        return;
      }
    }

    const isAdmin = ['admin', 'superuser'].includes(req.user!.role);
    const isInstructor = req.user!.role === 'instructor';
    const isStaff = req.user!.role === 'staff';
    const isSelf = req.user!.role === 'student' && String(existing[0].user_id) === String(req.user!.userId);
    const isGuardian = !isAdmin && !isInstructor && !isStaff && !isSelf
      && await isGuardianOfStudent(req.user!.userId, String(req.params.id));

    if (!isAdmin && !isInstructor && !isStaff && !isSelf && !isGuardian) {
      res.status(403).json({ error: 'Sem permissão para esta ação' });
      return;
    }

    if (isInstructor) {
      // Instrutor pode editar dados do aluno, mas não campos financeiros/administrativos
      ['status', 'plan_id', 'join_date', 'next_payment_date', 'absence_limit',
       'last_graduation_date', 'user_id'].forEach(f => delete req.body[f]);
    } else if (isStaff) {
      // Colaborador pode cadastrar/aprovar (inclusive status), definir o plano de aula e atualizar faixa/grau, mas não mexe em campos financeiros
      ['join_date', 'next_payment_date',
       'absence_limit', 'last_graduation_date', 'user_id'].forEach(f => delete req.body[f]);
    } else if (!isAdmin) {
      // Aluno (ou responsável) editando o cadastro: sem acesso a campos administrativos nem faixa
      ['status', 'belt', 'stripes', 'plan_id', 'join_date',
       'next_payment_date', 'absence_limit', 'last_graduation_date', 'user_id']
        .forEach(f => delete req.body[f]);
    }

    const fields = Object.keys(req.body).filter(k => UPDATABLE_FIELDS.includes(k));
    if (!fields.length && !newPassword) { res.status(400).json({ error: 'Nenhum campo válido para atualizar' }); return; }

    if (fields.length) {
      const set = fields.map(f => `${f} = ?`).join(', ');
      const values = fields.map(f => req.body[f] ?? null);
      await pool.execute(
        `UPDATE students SET ${set} WHERE id = ? AND academy_id = ?`,
        [...values, req.params.id, academyId]
      );

      // Registra no histórico de graduações se admin/instrutor/staff alterou faixa ou grau
      if (isAdmin || isInstructor || isStaff) {
        const beltChanged    = req.body.belt    !== undefined && req.body.belt    !== existing[0].belt;
        const stripesChanged = req.body.stripes !== undefined && Number(req.body.stripes) !== Number(existing[0].stripes);
        if (beltChanged || stripesChanged) {
          // O formulário de edição reenvia o cadastro inteiro, então last_graduation_date quase
          // sempre vem preenchido no payload com o valor ANTIGO (não é uma escolha deliberada do
          // admin) — só respeita o valor recebido se ele realmente difere do que já estava salvo
          // (aí sim o admin editou a data de propósito, ex: corrigindo um registro histórico).
          // Caso contrário, uma promoção pelo cadastro reinicia a contagem de tempo para hoje,
          // igual à promoção pelo módulo dedicado (POST /:id/graduate).
          const dateExplicitlyChanged = req.body.last_graduation_date !== undefined
            && req.body.last_graduation_date !== existing[0].last_graduation_date;
          const gradDate = dateExplicitlyChanged ? req.body.last_graduation_date : getTodayBrasilia();

          // Dual-write: resolve belt_rank_id do novo belt (ENUM) antes de gravar o histórico —
          // ver PLANO_GRADUACAO.md Fase 3. Não bloqueia se não resolver.
          const newBeltName = req.body.belt ?? existing[0].belt;
          const resolvedNewRank = beltChanged ? await resolveBeltRank(academyId, newBeltName) : null;

          await pool.execute(
            `INSERT INTO graduation_history
               (id, student_id, previous_belt, previous_belt_rank_id, new_belt, belt_rank_id, previous_stripes, new_stripes, date, instructor_id, notes)
             VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
            [
              crypto.randomUUID(), req.params.id,
              existing[0].belt, existing[0].belt_rank_id ?? null,
              newBeltName, resolvedNewRank?.id ?? null,
              existing[0].stripes,
              req.body.stripes ?? existing[0].stripes,
              gradDate,
              req.user!.userId,
              'Atualização manual',
            ]
          );
          // Zera o contador de aulas/tempo do ciclo atual e atualiza a data de graduação —
          // sem isso, a contagem por meses não reiniciava (ficava usando a data antiga).
          await pool.execute(
            `UPDATE students SET classes_since_graduation = 0, hours_since_graduation = 0, last_graduation_date = ? WHERE id = ?`,
            [gradDate, req.params.id]
          );

          if (resolvedNewRank) {
            await pool.execute(`UPDATE students SET belt_rank_id = ? WHERE id = ?`, [resolvedNewRank.id, req.params.id]);
          }
        }
      }

      // Ao ativar aluno, ativa também o usuário vinculado
      if (req.body.status === 'Active') {
        if (existing[0].user_id) {
          await pool.execute(
            `UPDATE users SET status = 'Active' WHERE id = ? AND status = 'Pending'`,
            [existing[0].user_id]
          );
        } else {
          // Fallback: vincula e ativa por email (cadastros sem user_id linkado)
          const email = req.body.email || existing[0].email;
          if (email) {
            const [userRows] = await pool.execute<any[]>(
              `SELECT id FROM users WHERE email = ? AND status = 'Pending'`,
              [String(email).toLowerCase().trim()]
            );
            if (userRows[0]) {
              await pool.execute(
                `UPDATE users SET status = 'Active' WHERE id = ?`,
                [userRows[0].id]
              );
              await pool.execute(
                `UPDATE students SET user_id = ? WHERE id = ?`,
                [userRows[0].id, req.params.id]
              );
            }
          }
        }
      }
    }

    if (newPassword && !isAdmin) {
      res.status(403).json({ error: 'Apenas administradores podem definir senha de aluno' });
      return;
    }

    if (newPassword) {
      const hash = await bcrypt.hash(newPassword, 10);

      if (existing[0].user_id) {
        // Usuário já existe: atualiza senha e marca como temporária
        await pool.execute(
          'UPDATE users SET password_hash = ?, requires_password_change = 1 WHERE id = ?',
          [hash, existing[0].user_id]
        );
      } else {
        // Usuário não existe ainda vinculado: cria ou vincula pelo email
        const email = String(req.body.email || existing[0].email || '').toLowerCase().trim();
        if (email) {
          const [emailCheck] = await pool.execute<any[]>('SELECT id FROM users WHERE email = ?', [email]);
          if (emailCheck[0]) {
            // Já existe usuário com esse email: vincula e atualiza senha
            await pool.execute(
              'UPDATE users SET password_hash = ?, requires_password_change = 1 WHERE id = ?',
              [hash, emailCheck[0].id]
            );
            await pool.execute(
              'UPDATE students SET user_id = ? WHERE id = ?',
              [emailCheck[0].id, req.params.id]
            );
          } else {
            const userId = crypto.randomUUID();
            const studentName = req.body.name || existing[0].name;
            await pool.execute(
              `INSERT INTO users (id, academy_id, role, name, email, password_hash, requires_password_change)
               VALUES (?, ?, 'student', ?, ?, ?, 1)`,
              [userId, academyId, studentName, email, hash]
            );
            await pool.execute(
              'UPDATE students SET user_id = ? WHERE id = ?',
              [userId, req.params.id]
            );
          }
        }
      }
    }

    // Auto-vínculo: se ainda sem user_id, tenta vincular pelo email
    if (!existing[0].user_id) {
      const emailToLink = req.body.email || existing[0].email;
      if (emailToLink) await autoLinkEntityToUser('students', String(req.params.id), emailToLink, academyId);
    }

    const [rows] = await pool.execute<any[]>('SELECT * FROM students WHERE id = ?', [req.params.id]);
    const [docs] = await pool.execute<any[]>(
      'SELECT * FROM student_documents WHERE student_id = ? ORDER BY created_at DESC',
      [req.params.id]
    );
    const [grad] = await pool.execute<any[]>(
      'SELECT * FROM graduation_history WHERE student_id = ? ORDER BY date DESC',
      [req.params.id]
    );
    const mapDoc = (d: any) => ({
      id: d.id,
      name: d.name,
      type: d.type || 'application/octet-stream',
      size: d.size || 0,
      base64: d.url,
      uploadedAt: d.created_at,
    });
    res.json({ ...rows[0], documents: (docs as any[]).map(mapDoc), graduationHistory: grad });
  } catch (err) {
    next(err);
  }
});

// GET /api/students/:id/guardians — lista responsáveis vinculados ao aluno
router.get('/:id/guardians', requireAuth, requireRole('admin', 'superuser', 'staff'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  try {
    const [student] = await pool.execute<any[]>(
      'SELECT id FROM students WHERE id = ? AND academy_id = ?',
      [req.params.id, academyId]
    );
    if (!student[0]) { res.status(404).json({ error: 'Aluno não encontrado' }); return; }

    const [rows] = await pool.execute<any[]>(
      `SELECT g.id, g.relation, g.created_at, u.id AS user_id, u.name, u.email, u.role
       FROM guardianships g
       JOIN users u ON u.id = g.guardian_user_id
       WHERE g.student_id = ?
       ORDER BY u.name ASC`,
      [req.params.id]
    );
    res.json({ data: rows });
  } catch (err) { next(err); }
});

// POST /api/students/:id/guardians — vincula diretamente uma conta existente (por e-mail) como responsável
router.post('/:id/guardians', requireAuth, requireRole('admin', 'superuser', 'staff'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  const errors = validate(req.body, { email: { required: true, type: 'email' } });
  if (errors.length) { res.status(400).json({ error: errors[0] }); return; }

  try {
    const [student] = await pool.execute<any[]>(
      'SELECT id, user_id FROM students WHERE id = ? AND academy_id = ?',
      [req.params.id, academyId]
    );
    if (!student[0]) { res.status(404).json({ error: 'Aluno não encontrado' }); return; }

    const emailNorm = String(req.body.email).toLowerCase().trim();
    const [userRows] = await pool.execute<any[]>(
      'SELECT id FROM users WHERE email = ? AND academy_id = ?',
      [emailNorm, academyId]
    );
    if (!userRows[0]) {
      res.status(404).json({ error: 'Nenhuma conta encontrada com este e-mail nesta academia.' });
      return;
    }

    if (student[0].user_id && String(student[0].user_id) === String(userRows[0].id)) {
      res.status(400).json({ error: 'Não é possível vincular o aluno como responsável de si mesmo.' });
      return;
    }

    try {
      await pool.execute(
        `INSERT INTO guardianships (id, guardian_user_id, student_id, relation) VALUES (?, ?, ?, ?)`,
        [crypto.randomUUID(), userRows[0].id, req.params.id, req.body.relation ?? null]
      );
    } catch (err: any) {
      if (err.code !== 'ER_DUP_ENTRY') throw err;
      res.status(409).json({ error: 'Esta conta já é responsável por este aluno.' });
      return;
    }

    res.status(201).json({ message: 'Responsável vinculado com sucesso.' });
  } catch (err) { next(err); }
});

// POST /api/students/:id/guardian-invite — gera link de convite para um responsável se cadastrar
router.post('/:id/guardian-invite', requireAuth, requireRole('admin', 'superuser', 'staff'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  try {
    const [rows] = await pool.execute<any[]>(
      `SELECT s.id, a.alias AS academy_alias FROM students s JOIN academies a ON a.id = s.academy_id WHERE s.id = ? AND s.academy_id = ?`,
      [req.params.id, academyId]
    );
    if (!rows[0]) { res.status(404).json({ error: 'Aluno não encontrado' }); return; }

    const inviteToken = crypto.randomBytes(32).toString('hex');
    await pool.execute(
      'UPDATE students SET guardian_invite_token = ? WHERE id = ?',
      [inviteToken, req.params.id]
    );

    res.status(201).json({ inviteLink: buildGuardianInviteLink(rows[0].academy_alias, inviteToken) });
  } catch (err) { next(err); }
});

// DELETE /api/students/:id/guardians/:guardianUserId — remove vínculo de responsável
router.delete('/:id/guardians/:guardianUserId', requireAuth, requireRole('admin', 'superuser', 'staff'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  try {
    const [student] = await pool.execute<any[]>(
      'SELECT id FROM students WHERE id = ? AND academy_id = ?',
      [req.params.id, academyId]
    );
    if (!student[0]) { res.status(404).json({ error: 'Aluno não encontrado' }); return; }

    const [result] = await pool.execute<any>(
      'DELETE FROM guardianships WHERE student_id = ? AND guardian_user_id = ?',
      [req.params.id, req.params.guardianUserId]
    );
    if (!result.affectedRows) { res.status(404).json({ error: 'Vínculo não encontrado' }); return; }

    res.json({ message: 'Vínculo removido com sucesso.' });
  } catch (err) { next(err); }
});

// DELETE /api/students/:id — move para lixeira
router.delete('/:id', requireAuth, requireRole('admin', 'superuser'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  try {
    const [rows] = await pool.execute<any[]>(
      'SELECT * FROM students WHERE id = ? AND academy_id = ?',
      [req.params.id, academyId]
    );
    if (!rows[0]) { res.status(404).json({ error: 'Aluno não encontrado' }); return; }

    const [docs] = await pool.execute<any[]>(
      'SELECT * FROM student_documents WHERE student_id = ?',
      [req.params.id]
    );
    const [grad] = await pool.execute<any[]>(
      'SELECT * FROM graduation_history WHERE student_id = ?',
      [req.params.id]
    );

    const originalData = JSON.stringify({ ...rows[0], documents: docs, graduationHistory: grad });

    await pool.execute(
      'INSERT INTO recycle_bin (id, academy_id, type, original_data) VALUES (?,?,?,?)',
      [crypto.randomUUID(), academyId, 'student', originalData]
    );

    await pool.execute('DELETE FROM students WHERE id = ?', [req.params.id]);

    res.json({ message: 'Aluno movido para a lixeira' });
  } catch (err) {
    next(err);
  }
});

// POST /api/students/:id/graduate
router.post('/:id/graduate', requireAuth, requireRole('admin', 'superuser', 'instructor', 'staff'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  const errors = validate(req.body, {
    new_belt:    { required: true, enum: BELT_VALUES },
    new_stripes: { type: 'number', min: 0 },
    date:        { required: true, type: 'date' },
  });
  if (errors.length) { res.status(400).json({ error: errors[0] }); return; }

  try {
    const [rows] = await pool.execute<any[]>(
      'SELECT * FROM students WHERE id = ? AND academy_id = ?',
      [req.params.id, academyId]
    );
    if (!rows[0]) { res.status(404).json({ error: 'Aluno não encontrado' }); return; }

    const student = rows[0];
    const { new_belt, new_stripes = 0, date, instructor_id, notes } = req.body;

    // Cap de graus: usa belt_ranks.degree_count quando resolvível (ex: Preta = 6),
    // com fallback para o comportamento antigo (4, ou 6 para Preta) se não resolver.
    const resolvedNewRank = await resolveBeltRank(academyId, new_belt);
    const maxStripes = resolvedNewRank?.degreeCount ?? (new_belt === 'Preta' ? 6 : 4);
    if (Number(new_stripes) > maxStripes) {
      res.status(400).json({ error: `new_stripes deve ser no máximo ${maxStripes} para a faixa ${new_belt}` });
      return;
    }

    await pool.execute(
      `INSERT INTO graduation_history
         (id, student_id, previous_belt, previous_belt_rank_id, new_belt, belt_rank_id, previous_stripes, new_stripes, date, instructor_id, notes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        crypto.randomUUID(), req.params.id,
        student.belt, student.belt_rank_id ?? null,
        new_belt, resolvedNewRank?.id ?? null,
        student.stripes, new_stripes,
        date, instructor_id ?? null, notes ?? null,
      ]
    );

    // belt_rank_id só entra no SET quando resolvido — não sobrescreve um valor válido
    // existente com NULL no caso raro de não achar correspondência (ver resolveBeltRank).
    await pool.execute(
      `UPDATE students
       SET belt = ?, ${resolvedNewRank ? 'belt_rank_id = ?, ' : ''}stripes = ?, last_graduation_date = ?,
           classes_since_graduation = 0, hours_since_graduation = 0
       WHERE id = ?`,
      resolvedNewRank
        ? [new_belt, resolvedNewRank.id, new_stripes, date, req.params.id]
        : [new_belt, new_stripes, date, req.params.id]
    );

    const [updated] = await pool.execute<any[]>('SELECT * FROM students WHERE id = ?', [req.params.id]);
    const [grad] = await pool.execute<any[]>(
      'SELECT * FROM graduation_history WHERE student_id = ? ORDER BY date DESC',
      [req.params.id]
    );
    res.json({ ...updated[0], graduationHistory: grad });
  } catch (err) {
    next(err);
  }
});

// POST /api/students/:id/documents
router.post('/:id/documents', requireAuth, requireRole('admin', 'superuser'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  const errors = validate(req.body, {
    name:   { required: true, type: 'string', maxLength: 255 },
    base64: { required: true, type: 'string' },
  });
  if (errors.length) { res.status(400).json({ error: errors[0] }); return; }

  try {
    const [student] = await pool.execute<any[]>(
      'SELECT id FROM students WHERE id = ? AND academy_id = ?',
      [req.params.id, academyId]
    );
    if (!student[0]) { res.status(404).json({ error: 'Aluno não encontrado' }); return; }

    const docId = crypto.randomUUID();
    await pool.execute(
      'INSERT INTO student_documents (id, student_id, name, url) VALUES (?,?,?,?)',
      [docId, req.params.id, req.body.name, req.body.base64]
    );

    const [rows] = await pool.execute<any[]>('SELECT * FROM student_documents WHERE id = ?', [docId]);
    const doc = (rows as any[])[0];
    res.status(201).json({ ...doc, base64: doc.url });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/students/:id/documents/:docId
router.delete('/:id/documents/:docId', requireAuth, requireRole('admin', 'superuser'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  try {
    const [student] = await pool.execute<any[]>(
      'SELECT id FROM students WHERE id = ? AND academy_id = ?',
      [req.params.id, academyId]
    );
    if (!student[0]) { res.status(404).json({ error: 'Aluno não encontrado' }); return; }

    const [doc] = await pool.execute<any[]>(
      'SELECT id FROM student_documents WHERE id = ? AND student_id = ?',
      [req.params.docId, req.params.id]
    );
    if (!doc[0]) { res.status(404).json({ error: 'Documento não encontrado' }); return; }

    await pool.execute('DELETE FROM student_documents WHERE id = ?', [req.params.docId]);

    const [studentRows] = await pool.execute<any[]>('SELECT * FROM students WHERE id = ?', [req.params.id]);
    const [docs] = await pool.execute<any[]>(
      'SELECT * FROM student_documents WHERE student_id = ? ORDER BY created_at DESC',
      [req.params.id]
    );
    const mapDoc = (d: any) => ({
      id: d.id,
      name: d.name,
      type: d.type || 'application/octet-stream',
      size: d.size || 0,
      base64: d.url,
      uploadedAt: d.created_at,
    });
    res.json({ ...studentRows[0], documents: (docs as any[]).map(mapDoc) });
  } catch (err) {
    next(err);
  }
});

export default router;
