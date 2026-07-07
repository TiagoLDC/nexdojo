import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import pool from '../db';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { getAcademyId } from '../utils/academyScope';
import { validate } from '../utils/validate';
import { autoLinkEntityToUser } from '../utils/linkEntityUser';

const router = Router();

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
  'cpf', 'rg', 'weight', 'height', 'blood_type', 'marital_status',
  'emergency_contact', 'emergency_phone', 'cep', 'address', 'address_number',
  'specialties', 'medical_notes', 'status', 'join_date', 'user_id',
  'last_graduation_date',
];

const mapDoc = (d: any) => ({
  id: d.id,
  name: d.name,
  type: d.type || 'application/octet-stream',
  size: d.size || 0,
  base64: d.url,
  uploadedAt: d.created_at,
});

// GET /api/instructors
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  const { search, belt, status, page = '1', limit = '20' } = req.query;
  const pageNum = Math.max(1, parseInt(String(page), 10));
  const limitNum = Math.min(1000, Math.max(1, parseInt(String(limit), 10)));
  const offset = (pageNum - 1) * limitNum;

  let where = 'WHERE i.academy_id = ?';
  const params: any[] = [academyId];

  if (search) {
    where += ' AND (i.name LIKE ? OR i.email LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (belt) {
    where += ' AND i.belt = ?';
    params.push(belt);
  }
  if (status) {
    where += ' AND i.status = ?';
    params.push(status);
  }

  try {
    const [countRows] = await pool.execute<any[]>(
      `SELECT COUNT(*) as total FROM instructors i ${where}`,
      params
    );
    const total = (countRows[0] as any).total;

    const [rows] = await pool.execute<any[]>(
      `SELECT i.*, u.status as user_status FROM instructors i LEFT JOIN users u ON u.id = i.user_id ${where} ORDER BY i.name ASC LIMIT ${limitNum} OFFSET ${offset}`,
      params
    );

    res.json({ data: rows, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) });
  } catch (err) {
    next(err);
  }
});

// GET /api/instructors/:id
router.get('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  try {
    const [rows] = await pool.execute<any[]>(
      'SELECT * FROM instructors WHERE id = ? AND academy_id = ?',
      [req.params.id, academyId]
    );
    if (!rows[0]) { res.status(404).json({ error: 'Instrutor não encontrado' }); return; }

    const [docs] = await pool.execute<any[]>(
      'SELECT * FROM instructor_documents WHERE instructor_id = ? ORDER BY created_at DESC',
      [req.params.id]
    );
    res.json({ ...rows[0], documents: (docs as any[]).map(mapDoc) });
  } catch (err) {
    next(err);
  }
});

// POST /api/instructors
router.post('/', requireAuth, requireRole('admin', 'superuser'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  const errors = validate(req.body, {
    name:   { required: true, type: 'string', maxLength: 255 },
    email:  { type: 'email' },
    belt:   { enum: BELT_VALUES },
    status: { enum: STATUS_VALUES },
  });
  if (errors.length) { res.status(400).json({ error: errors[0] }); return; }

  const id = crypto.randomUUID();
  const b = req.body;

  try {
    await pool.execute(
      `INSERT INTO instructors (
        id, academy_id, user_id, name, email, phone, belt, stripes, birth_date, gender, photo,
        cpf, rg, weight, height, blood_type, marital_status, emergency_contact, emergency_phone,
        cep, address, address_number, specialties, medical_notes, status, join_date
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id, academyId, b.user_id ?? null,
        b.name, b.email ?? null, b.phone ?? null,
        b.belt ?? 'Branca', b.stripes ?? 0,
        b.birth_date ?? null, b.gender ?? null, b.photo ?? null,
        b.cpf ?? null, b.rg ?? null, b.weight ?? null, b.height ?? null, b.blood_type ?? null,
        b.marital_status ?? null, b.emergency_contact ?? null, b.emergency_phone ?? null,
        b.cep ?? null, b.address ?? null, b.address_number ?? null,
        b.specialties ?? null, b.medical_notes ?? null,
        b.status ?? 'Active', b.join_date ?? null,
      ]
    );

    if (b.email) await autoLinkEntityToUser('instructors', id, b.email, academyId);

    const [rows] = await pool.execute<any[]>('SELECT * FROM instructors WHERE id = ?', [id]);
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/instructors/:id
router.put('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

  try {
    const [existing] = await pool.execute<any[]>(
      'SELECT id, user_id, name, email FROM instructors WHERE id = ? AND academy_id = ?',
      [req.params.id, academyId]
    );
    if (!existing[0]) { res.status(404).json({ error: 'Instrutor não encontrado' }); return; }

    const isAdmin = ['admin', 'superuser'].includes(req.user!.role);
    let isSelf = req.user!.role === 'instructor' && String(existing[0].user_id) === String(req.user!.userId);

    // Fallback: user_id não vinculado ainda — verifica por email e vincula
    if (!isSelf && req.user!.role === 'instructor' && !existing[0].user_id) {
      const [userRows] = await pool.execute<any[]>('SELECT id, email FROM users WHERE id = ?', [req.user!.userId]);
      if (
        userRows[0] && existing[0].email &&
        String(userRows[0].email).toLowerCase() === String(existing[0].email).toLowerCase()
      ) {
        isSelf = true;
        await pool.execute('UPDATE instructors SET user_id = ? WHERE id = ?', [req.user!.userId, req.params.id]);
        existing[0].user_id = req.user!.userId;
      }
    }

    if (!isAdmin && !isSelf) {
      res.status(403).json({ error: 'Sem permissão para esta ação' });
      return;
    }

    // Instrutor não pode alterar campos administrativos
    if (!isAdmin) {
      ['status', 'belt', 'stripes', 'join_date', 'user_id']
        .forEach(f => delete req.body[f]);
    }

    const fields = Object.keys(req.body).filter(k => UPDATABLE_FIELDS.includes(k));
    if (!fields.length && !newPassword) { res.status(400).json({ error: 'Nenhum campo válido para atualizar' }); return; }

    if (fields.length) {
      const set = fields.map(f => `${f} = ?`).join(', ');
      const values = fields.map(f => req.body[f] ?? null);
      await pool.execute(
        `UPDATE instructors SET ${set} WHERE id = ? AND academy_id = ?`,
        [...values, req.params.id, academyId]
      );

      // Ao ativar instrutor, ativa também o usuário vinculado
      if (req.body.status === 'Active') {
        if (existing[0].user_id) {
          await pool.execute(
            `UPDATE users SET status = 'Active' WHERE id = ? AND status = 'Pending'`,
            [existing[0].user_id]
          );
        } else {
          // Fallback: vincula e ativa por email (cadastros anteriores sem user_id linkado)
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
                `UPDATE instructors SET user_id = ? WHERE id = ?`,
                [userRows[0].id, req.params.id]
              );
            }
          }
        }
      }
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
        // Usuário não existe: cria conta e vincula ao instrutor
        const email = String(req.body.email || existing[0].email || '').toLowerCase().trim();
        if (email) {
          const [emailCheck] = await pool.execute<any[]>('SELECT id FROM users WHERE email = ?', [email]);
          if (emailCheck[0]) {
            res.status(409).json({ error: 'E-mail já cadastrado em outro usuário' });
            return;
          }
          const userId = crypto.randomUUID();
          const instructorName = req.body.name || existing[0].name;
          await pool.execute(
            `INSERT INTO users (id, academy_id, role, name, email, password_hash, requires_password_change)
             VALUES (?, ?, 'instructor', ?, ?, ?, 1)`,
            [userId, academyId, instructorName, email, hash]
          );
          await pool.execute(
            'UPDATE instructors SET user_id = ? WHERE id = ?',
            [userId, req.params.id]
          );
        }
      }
    }

    // Auto-vínculo: se ainda sem user_id, tenta vincular pelo email
    if (!existing[0].user_id) {
      const emailToLink = req.body.email || existing[0].email;
      if (emailToLink) await autoLinkEntityToUser('instructors', String(req.params.id), emailToLink, academyId);
    }

    const [rows] = await pool.execute<any[]>('SELECT * FROM instructors WHERE id = ?', [req.params.id]);
    const [docs] = await pool.execute<any[]>(
      'SELECT * FROM instructor_documents WHERE instructor_id = ? ORDER BY created_at DESC',
      [req.params.id]
    );
    res.json({ ...rows[0], documents: (docs as any[]).map(mapDoc) });
  } catch (err) {
    next(err);
  }
});

// POST /api/instructors/:id/documents
router.post('/:id/documents', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  const errors = validate(req.body, {
    name:   { required: true, type: 'string', maxLength: 255 },
    base64: { required: true, type: 'string' },
  });
  if (errors.length) { res.status(400).json({ error: errors[0] }); return; }

  try {
    const [rows] = await pool.execute<any[]>(
      'SELECT id, user_id, email FROM instructors WHERE id = ? AND academy_id = ?',
      [req.params.id, academyId]
    );
    if (!rows[0]) { res.status(404).json({ error: 'Instrutor não encontrado' }); return; }

    const isAdmin = ['admin', 'superuser'].includes(req.user!.role);
    let isSelf = req.user!.role === 'instructor' && String(rows[0].user_id) === String(req.user!.userId);
    if (!isSelf && req.user!.role === 'instructor' && !rows[0].user_id) {
      const [uRows] = await pool.execute<any[]>('SELECT email FROM users WHERE id = ?', [req.user!.userId]);
      if (uRows[0] && rows[0].email && String(uRows[0].email).toLowerCase() === String(rows[0].email).toLowerCase()) {
        isSelf = true;
      }
    }
    if (!isAdmin && !isSelf) { res.status(403).json({ error: 'Sem permissão para esta ação' }); return; }

    const docId = crypto.randomUUID();
    await pool.execute(
      'INSERT INTO instructor_documents (id, instructor_id, name, url) VALUES (?,?,?,?)',
      [docId, req.params.id, req.body.name, req.body.base64]
    );

    const [docRows] = await pool.execute<any[]>('SELECT * FROM instructor_documents WHERE id = ?', [docId]);
    const doc = (docRows as any[])[0];
    res.status(201).json({ ...doc, base64: doc.url });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/instructors/:id/documents/:docId
router.delete('/:id/documents/:docId', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  try {
    const [rows] = await pool.execute<any[]>(
      'SELECT id, user_id, email FROM instructors WHERE id = ? AND academy_id = ?',
      [req.params.id, academyId]
    );
    if (!rows[0]) { res.status(404).json({ error: 'Instrutor não encontrado' }); return; }

    const isAdmin = ['admin', 'superuser'].includes(req.user!.role);
    let isSelf = req.user!.role === 'instructor' && String(rows[0].user_id) === String(req.user!.userId);
    if (!isSelf && req.user!.role === 'instructor' && !rows[0].user_id) {
      const [uRows] = await pool.execute<any[]>('SELECT email FROM users WHERE id = ?', [req.user!.userId]);
      if (uRows[0] && rows[0].email && String(uRows[0].email).toLowerCase() === String(rows[0].email).toLowerCase()) {
        isSelf = true;
      }
    }
    if (!isAdmin && !isSelf) { res.status(403).json({ error: 'Sem permissão para esta ação' }); return; }

    const [doc] = await pool.execute<any[]>(
      'SELECT id FROM instructor_documents WHERE id = ? AND instructor_id = ?',
      [req.params.docId, req.params.id]
    );
    if (!doc[0]) { res.status(404).json({ error: 'Documento não encontrado' }); return; }

    await pool.execute('DELETE FROM instructor_documents WHERE id = ?', [req.params.docId]);

    const [instructorRows] = await pool.execute<any[]>('SELECT * FROM instructors WHERE id = ?', [req.params.id]);
    const [docs] = await pool.execute<any[]>(
      'SELECT * FROM instructor_documents WHERE instructor_id = ? ORDER BY created_at DESC',
      [req.params.id]
    );
    res.json({ ...instructorRows[0], documents: (docs as any[]).map(mapDoc) });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/instructors/:id — move para lixeira
router.delete('/:id', requireAuth, requireRole('admin', 'superuser'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  try {
    const [rows] = await pool.execute<any[]>(
      'SELECT * FROM instructors WHERE id = ? AND academy_id = ?',
      [req.params.id, academyId]
    );
    if (!rows[0]) { res.status(404).json({ error: 'Instrutor não encontrado' }); return; }

    await pool.execute(
      'INSERT INTO recycle_bin (id, academy_id, type, original_data) VALUES (?,?,?,?)',
      [crypto.randomUUID(), academyId, 'instructor', JSON.stringify(rows[0])]
    );

    await pool.execute('DELETE FROM instructors WHERE id = ?', [req.params.id]);
    res.json({ message: 'Instrutor movido para a lixeira' });
  } catch (err) {
    next(err);
  }
});

export default router;
