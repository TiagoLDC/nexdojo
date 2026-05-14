import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import pool from '../db';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { getAcademyId } from '../utils/academyScope';
import { validate } from '../utils/validate';
import { withTransaction } from '../utils/withTransaction';

const router = Router();

const BELT_VALUES = [
  'Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde',
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

  const { search, belt, status, page = '1', limit = '20' } = req.query;
  const pageNum = Math.max(1, parseInt(String(page), 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10)));
  const offset = (pageNum - 1) * limitNum;

  let where = 'WHERE academy_id = ?';
  const params: any[] = [academyId];

  if (search) {
    where += ' AND (name LIKE ? OR email LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (belt) {
    where += ' AND belt = ?';
    params.push(belt);
  }
  if (status) {
    where += ' AND status = ?';
    params.push(status);
  }

  try {
    const [countRows] = await pool.execute<any[]>(
      `SELECT COUNT(*) as total FROM students ${where}`,
      params
    );
    const total = (countRows[0] as any).total;

    const [rows] = await pool.execute<any[]>(
      `SELECT * FROM students ${where} ORDER BY name ASC LIMIT ${limitNum} OFFSET ${offset}`,
      params
    );

    res.json({ data: rows, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) });
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

    const [docs] = await pool.execute<any[]>(
      'SELECT * FROM student_documents WHERE student_id = ? ORDER BY created_at DESC',
      [req.params.id]
    );

    const [grad] = await pool.execute<any[]>(
      'SELECT * FROM graduation_history WHERE student_id = ? ORDER BY date DESC',
      [req.params.id]
    );

    res.json({ ...rows[0], documents: docs, graduationHistory: grad });
  } catch (err) {
    next(err);
  }
});

// POST /api/students
router.post('/', requireAuth, requireRole('admin', 'superuser'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  const errors = validate(req.body, {
    name:     { required: true, type: 'string', maxLength: 255 },
    email:    { type: 'email' },
    belt:     { enum: BELT_VALUES },
    status:   { enum: STATUS_VALUES },
  });
  if (errors.length) { res.status(400).json({ error: errors[0] }); return; }

  const b = req.body;

  // Se email informado, senha é obrigatória para criar o acesso do aluno
  if (b.email && !b.password) {
    res.status(400).json({ error: 'password é obrigatório quando email é informado' });
    return;
  }
  if (b.password && String(b.password).length < 6) {
    res.status(400).json({ error: 'password deve ter no mínimo 6 caracteres' });
    return;
  }

  try {
    const studentId = crypto.randomUUID();

    const studentValues = [
      studentId, academyId,
      b.name, b.email ?? null, b.phone ?? null,
      b.belt ?? 'Branca', b.stripes ?? 0,
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

    if (b.email) {
      // Cria user + student atomicamente
      createdStudent = await withTransaction(async (conn) => {
        // Garante que o email não está em uso
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
            id, academy_id, user_id, name, email, phone, belt, stripes, birth_date, gender, photo,
            cpf, rg, weight, height, blood_type, emergency_contact, emergency_phone,
            cep, address, address_number, guardian_name, guardian_phone, guardian_email,
            guardian_cpf, guardian_rg, guardian_relation, guardian_profession,
            medical_notes, status, join_date, plan_id, next_payment_date, absence_limit
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [studentId, academyId, userId, ...studentValues.slice(2)]
        );

        const [rows] = await conn.execute<any[]>('SELECT * FROM students WHERE id = ?', [studentId]);
        return rows[0];
      });
    } else {
      // Sem email: insere student sem user
      await pool.execute(
        `INSERT INTO students (
          id, academy_id, name, email, phone, belt, stripes, birth_date, gender, photo,
          cpf, rg, weight, height, blood_type, emergency_contact, emergency_phone,
          cep, address, address_number, guardian_name, guardian_phone, guardian_email,
          guardian_cpf, guardian_rg, guardian_relation, guardian_profession,
          medical_notes, status, join_date, plan_id, next_payment_date, absence_limit
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        studentValues
      );
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
router.put('/:id', requireAuth, requireRole('admin', 'superuser'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  const errors = validate(req.body, {
    name:   { type: 'string', maxLength: 255 },
    email:  { type: 'email' },
    belt:   { enum: BELT_VALUES },
    status: { enum: STATUS_VALUES },
  });
  if (errors.length) { res.status(400).json({ error: errors[0] }); return; }

  const newPassword = req.body.password ? String(req.body.password) : null;
  if (newPassword && newPassword.length < 6) {
    res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres' });
    return;
  }

  const fields = Object.keys(req.body).filter(k => UPDATABLE_FIELDS.includes(k));
  if (!fields.length && !newPassword) { res.status(400).json({ error: 'Nenhum campo válido para atualizar' }); return; }

  try {
    const [existing] = await pool.execute<any[]>(
      'SELECT id, user_id, name, email FROM students WHERE id = ? AND academy_id = ?',
      [req.params.id, academyId]
    );
    if (!existing[0]) { res.status(404).json({ error: 'Aluno não encontrado' }); return; }

    if (fields.length) {
      const set = fields.map(f => `${f} = ?`).join(', ');
      const values = fields.map(f => req.body[f] ?? null);
      await pool.execute(
        `UPDATE students SET ${set} WHERE id = ? AND academy_id = ?`,
        [...values, req.params.id, academyId]
      );
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
        // Usuário não existe: cria conta e vincula ao aluno
        const email = String(req.body.email || existing[0].email || '').toLowerCase().trim();
        if (email) {
          const [emailCheck] = await pool.execute<any[]>('SELECT id FROM users WHERE email = ?', [email]);
          if (emailCheck[0]) {
            res.status(409).json({ error: 'E-mail já cadastrado em outro usuário' });
            return;
          }
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

    const [rows] = await pool.execute<any[]>('SELECT * FROM students WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
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
router.post('/:id/graduate', requireAuth, requireRole('admin', 'superuser', 'instructor'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  const errors = validate(req.body, {
    new_belt:    { required: true, enum: BELT_VALUES },
    new_stripes: { type: 'number', min: 0, max: 4 },
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

    await pool.execute(
      `INSERT INTO graduation_history
         (id, student_id, previous_belt, new_belt, previous_stripes, new_stripes, date, instructor_id, notes)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        crypto.randomUUID(), req.params.id,
        student.belt, new_belt, student.stripes, new_stripes,
        date, instructor_id ?? null, notes ?? null,
      ]
    );

    await pool.execute(
      'UPDATE students SET belt = ?, stripes = ?, last_graduation_date = ? WHERE id = ?',
      [new_belt, new_stripes, date, req.params.id]
    );

    const [updated] = await pool.execute<any[]>('SELECT * FROM students WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (err) {
    next(err);
  }
});

// POST /api/students/:id/documents
router.post('/:id/documents', requireAuth, requireRole('admin', 'superuser'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  const errors = validate(req.body, {
    name: { required: true, type: 'string', maxLength: 255 },
    url:  { required: true, type: 'string' },
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
      [docId, req.params.id, req.body.name, req.body.url]
    );

    const [rows] = await pool.execute<any[]>('SELECT * FROM student_documents WHERE id = ?', [docId]);
    res.status(201).json(rows[0]);
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
    res.json({ message: 'Documento removido' });
  } catch (err) {
    next(err);
  }
});

export default router;
