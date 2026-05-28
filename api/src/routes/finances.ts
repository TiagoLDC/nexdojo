import { Router, Request, Response, NextFunction } from 'express';
import pool from '../db';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { getAcademyId } from '../utils/academyScope';
import { validate } from '../utils/validate';

const router = Router();

// GET /api/transactions
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  const { type, status, dateFrom, dateTo, studentId, page = '1', limit = '20' } = req.query;
  const pageNum  = Math.max(1, parseInt(String(page), 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10)));
  const offset   = (pageNum - 1) * limitNum;

  let where = 'WHERE academy_id = ?';
  const params: any[] = [academyId];

  if (type)      { where += ' AND type = ?';       params.push(type); }
  if (status)    { where += ' AND status = ?';     params.push(status); }
  if (dateFrom)  { where += ' AND date >= ?';      params.push(dateFrom); }
  if (dateTo)    { where += ' AND date <= ?';      params.push(dateTo); }
  if (studentId) { where += ' AND student_id = ?'; params.push(studentId); }

  try {
    const [countRows] = await pool.execute<any[]>(
      `SELECT COUNT(*) as total FROM finance_transactions ${where}`,
      params
    );
    const total = (countRows[0] as any).total;

    const [rows] = await pool.execute<any[]>(
      `SELECT * FROM finance_transactions ${where} ORDER BY date DESC, created_at DESC LIMIT ${limitNum} OFFSET ${offset}`,
      params
    );

    const parsed = rows.map((r: any) => ({ ...r, amount: Number(r.amount) }));
    res.json({ data: parsed, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) });
  } catch (err) {
    next(err);
  }
});

// POST /api/transactions
router.post('/', requireAuth, requireRole('admin', 'superuser', 'staff'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  const errors = validate(req.body, {
    description: { required: true, type: 'string', maxLength: 255 },
    amount:      { required: true, type: 'number', min: 0 },
    type:        { required: true, enum: ['income', 'expense'] },
    date:        { required: true, type: 'date' },
    status:      { enum: ['paid', 'pending'] },
  });
  if (errors.length) { res.status(400).json({ error: errors[0] }); return; }

  const { description, amount, type, category, date, payment_method, status = 'paid', student_id, due_date } = req.body;
  const id = crypto.randomUUID();

  try {
    await pool.execute(
      `INSERT INTO finance_transactions
         (id, academy_id, description, amount, type, category, date, payment_method, status, student_id, due_date)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [id, academyId, description, amount, type, category ?? null,
       date, payment_method ?? null, status, student_id ?? null, due_date ?? null]
    );

    const [rows] = await pool.execute<any[]>('SELECT * FROM finance_transactions WHERE id = ?', [id]);
    const row = rows[0] as any;
    res.status(201).json({ ...row, amount: Number(row.amount) });
  } catch (err) {
    next(err);
  }
});

// PUT /api/transactions/:id
router.put('/:id', requireAuth, requireRole('admin', 'superuser', 'staff'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  const errors = validate(req.body, {
    description: { type: 'string', maxLength: 255 },
    amount:      { type: 'number', min: 0 },
    type:        { enum: ['income', 'expense'] },
    date:        { type: 'date' },
    status:      { enum: ['paid', 'pending'] },
  });
  if (errors.length) { res.status(400).json({ error: errors[0] }); return; }

  const ALLOWED = ['description', 'amount', 'type', 'category', 'date', 'payment_method', 'status', 'student_id', 'due_date'];
  const fields = Object.keys(req.body).filter(k => ALLOWED.includes(k));
  if (!fields.length) { res.status(400).json({ error: 'Nenhum campo válido para atualizar' }); return; }

  try {
    const [existing] = await pool.execute<any[]>(
      'SELECT id FROM finance_transactions WHERE id = ? AND academy_id = ?',
      [req.params.id, academyId]
    );
    if (!existing[0]) { res.status(404).json({ error: 'Transação não encontrada' }); return; }

    const set    = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => req.body[f] ?? null);

    await pool.execute(
      `UPDATE finance_transactions SET ${set} WHERE id = ? AND academy_id = ?`,
      [...values, req.params.id, academyId]
    );

    const [rows] = await pool.execute<any[]>('SELECT * FROM finance_transactions WHERE id = ?', [req.params.id]);
    const row = rows[0] as any;
    res.json({ ...row, amount: Number(row.amount) });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/transactions/:id — permanente (sem lixeira)
router.delete('/:id', requireAuth, requireRole('admin', 'superuser'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  try {
    const [rows] = await pool.execute<any[]>(
      'SELECT id FROM finance_transactions WHERE id = ? AND academy_id = ?',
      [req.params.id, academyId]
    );
    if (!rows[0]) { res.status(404).json({ error: 'Transação não encontrada' }); return; }

    await pool.execute('DELETE FROM finance_transactions WHERE id = ?', [req.params.id]);
    res.json({ message: 'Transação removida' });
  } catch (err) {
    next(err);
  }
});

export default router;
