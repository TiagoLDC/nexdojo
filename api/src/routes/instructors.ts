import { Router, Request, Response, NextFunction } from 'express';
import pool from '../db';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { getAcademyId } from '../utils/academyScope';
import { validate } from '../utils/validate';

const router = Router();

const BELT_VALUES = [
  'Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde',
  'Azul', 'Roxa', 'Marrom', 'Preta', 'Coral', 'Vermelha',
];

const STATUS_VALUES = ['Active', 'Inactive', 'Dropped', 'Pending'];

const UPDATABLE_FIELDS = [
  'name', 'email', 'phone', 'belt', 'stripes', 'birth_date', 'gender', 'photo',
  'cpf', 'rg', 'weight', 'height', 'blood_type', 'marital_status',
  'emergency_contact', 'emergency_phone', 'cep', 'address', 'address_number',
  'specialties', 'medical_notes', 'status', 'join_date', 'user_id',
];

// GET /api/instructors
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
      `SELECT COUNT(*) as total FROM instructors ${where}`,
      params
    );
    const total = (countRows[0] as any).total;

    const [rows] = await pool.execute<any[]>(
      `SELECT * FROM instructors ${where} ORDER BY name ASC LIMIT ${limitNum} OFFSET ${offset}`,
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
    res.json(rows[0]);
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

    const [rows] = await pool.execute<any[]>('SELECT * FROM instructors WHERE id = ?', [id]);
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/instructors/:id
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

  const fields = Object.keys(req.body).filter(k => UPDATABLE_FIELDS.includes(k));
  if (!fields.length) { res.status(400).json({ error: 'Nenhum campo válido para atualizar' }); return; }

  try {
    const [existing] = await pool.execute<any[]>(
      'SELECT id FROM instructors WHERE id = ? AND academy_id = ?',
      [req.params.id, academyId]
    );
    if (!existing[0]) { res.status(404).json({ error: 'Instrutor não encontrado' }); return; }

    const set = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => req.body[f] ?? null);

    await pool.execute(
      `UPDATE instructors SET ${set} WHERE id = ? AND academy_id = ?`,
      [...values, req.params.id, academyId]
    );

    const [rows] = await pool.execute<any[]>('SELECT * FROM instructors WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
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
