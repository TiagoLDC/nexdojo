import { Router, Request, Response, NextFunction } from 'express';
import pool from '../db';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { getAcademyId } from '../utils/academyScope';
import { validate } from '../utils/validate';

const router = Router();

// GET /api/sessions
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  const { templateId, status, dateFrom, dateTo, page = '1', limit = '20' } = req.query;
  const pageNum  = Math.max(1, parseInt(String(page), 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10)));
  const offset   = (pageNum - 1) * limitNum;

  let where = 'WHERE cs.academy_id = ?';
  const params: any[] = [academyId];

  if (templateId) { where += ' AND cs.template_id = ?';  params.push(templateId); }
  if (status)     { where += ' AND cs.status = ?';       params.push(status); }
  if (dateFrom)   { where += ' AND cs.date >= ?';        params.push(dateFrom); }
  if (dateTo)     { where += ' AND cs.date <= ?';        params.push(dateTo); }

  try {
    const [countRows] = await pool.execute<any[]>(
      `SELECT COUNT(*) as total FROM class_sessions cs ${where}`,
      params
    );
    const total = (countRows[0] as any).total;

    // JOIN instrutor para retornar o nome junto
    const [rows] = await pool.execute<any[]>(
      `SELECT cs.*, i.name AS instructor_name
       FROM class_sessions cs
       LEFT JOIN instructors i ON i.id = cs.instructor_id
       ${where}
       ORDER BY cs.date DESC, cs.created_at DESC
       LIMIT ${limitNum} OFFSET ${offset}`,
      params
    );

    res.json({ data: rows, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) });
  } catch (err) {
    next(err);
  }
});

// POST /api/sessions
router.post('/', requireAuth, requireRole('admin', 'superuser', 'instructor'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  const errors = validate(req.body, {
    date:   { required: true, type: 'date' },
    status: { enum: ['In Progress', 'Finalized'] },
  });
  if (errors.length) { res.status(400).json({ error: errors[0] }); return; }

  const { name, template_id, date, duration_minutes, instructor_id, status = 'In Progress' } = req.body;
  const id = crypto.randomUUID();

  try {
    await pool.execute(
      `INSERT INTO class_sessions (id, academy_id, name, template_id, date, duration_minutes, instructor_id, status)
       VALUES (?,?,?,?,?,?,?,?)`,
      [id, academyId, name ?? null, template_id ?? null, date,
       duration_minutes ?? null, instructor_id ?? null, status]
    );

    const [rows] = await pool.execute<any[]>('SELECT * FROM class_sessions WHERE id = ?', [id]);
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/sessions/:id
router.put('/:id', requireAuth, requireRole('admin', 'superuser', 'instructor'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  const errors = validate(req.body, {
    date:   { type: 'date' },
    status: { enum: ['In Progress', 'Finalized'] },
  });
  if (errors.length) { res.status(400).json({ error: errors[0] }); return; }

  const ALLOWED = ['name', 'date', 'duration_minutes', 'instructor_id', 'status', 'template_id'];
  const fields = Object.keys(req.body).filter(k => ALLOWED.includes(k));
  if (!fields.length) { res.status(400).json({ error: 'Nenhum campo válido para atualizar' }); return; }

  try {
    const [existing] = await pool.execute<any[]>(
      'SELECT id FROM class_sessions WHERE id = ? AND academy_id = ?',
      [req.params.id, academyId]
    );
    if (!existing[0]) { res.status(404).json({ error: 'Sessão não encontrada' }); return; }

    const set    = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => req.body[f] ?? null);

    await pool.execute(
      `UPDATE class_sessions SET ${set} WHERE id = ? AND academy_id = ?`,
      [...values, req.params.id, academyId]
    );

    const [rows] = await pool.execute<any[]>('SELECT * FROM class_sessions WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
