import { Router, Request, Response } from 'express';
import pool from '../db';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { getAcademyId } from '../utils/academyScope';
import { validate } from '../utils/validate';

const router = Router();

// GET /api/calendar
router.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  const { dateFrom, dateTo, type } = req.query;

  let where = 'WHERE academy_id = ?';
  const params: any[] = [academyId];

  if (dateFrom) { where += ' AND date >= ?'; params.push(dateFrom); }
  if (dateTo)   { where += ' AND date <= ?'; params.push(dateTo); }
  if (type)     { where += ' AND type = ?';  params.push(type); }

  try {
    const [rows] = await pool.execute<any[]>(
      `SELECT * FROM calendar_events ${where} ORDER BY date ASC`,
      params
    );
    res.json({ data: rows, total: (rows as any[]).length });
  } catch (err) {
    throw err;
  }
});

// POST /api/calendar
router.post('/', requireAuth, requireRole('admin', 'superuser'), async (req: Request, res: Response): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  const errors = validate(req.body, {
    date:   { required: true, type: 'date' },
    type:   { required: true, enum: ['no-class', 'event'] },
    reason: { type: 'string', maxLength: 255 },
  });
  if (errors.length) { res.status(400).json({ error: errors[0] }); return; }

  const { date, reason, type } = req.body;
  const id = crypto.randomUUID();

  try {
    await pool.execute(
      'INSERT INTO calendar_events (id, academy_id, date, reason, type) VALUES (?,?,?,?,?)',
      [id, academyId, date, reason ?? null, type]
    );
    const [rows] = await pool.execute<any[]>('SELECT * FROM calendar_events WHERE id = ?', [id]);
    res.status(201).json(rows[0]);
  } catch (err) {
    throw err;
  }
});

// PUT /api/calendar/:id
router.put('/:id', requireAuth, requireRole('admin', 'superuser'), async (req: Request, res: Response): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  const errors = validate(req.body, {
    date:   { type: 'date' },
    type:   { enum: ['no-class', 'event'] },
    reason: { type: 'string', maxLength: 255 },
  });
  if (errors.length) { res.status(400).json({ error: errors[0] }); return; }

  const ALLOWED = ['date', 'reason', 'type'];
  const fields = Object.keys(req.body).filter(k => ALLOWED.includes(k));
  if (!fields.length) { res.status(400).json({ error: 'Nenhum campo válido para atualizar' }); return; }

  try {
    const [existing] = await pool.execute<any[]>(
      'SELECT id FROM calendar_events WHERE id = ? AND academy_id = ?',
      [req.params.id, academyId]
    );
    if (!existing[0]) { res.status(404).json({ error: 'Evento não encontrado' }); return; }

    const set    = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => req.body[f] ?? null);

    await pool.execute(
      `UPDATE calendar_events SET ${set} WHERE id = ? AND academy_id = ?`,
      [...values, req.params.id, academyId]
    );
    const [rows] = await pool.execute<any[]>('SELECT * FROM calendar_events WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    throw err;
  }
});

// DELETE /api/calendar/:id
router.delete('/:id', requireAuth, requireRole('admin', 'superuser'), async (req: Request, res: Response): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  try {
    const [rows] = await pool.execute<any[]>(
      'SELECT id FROM calendar_events WHERE id = ? AND academy_id = ?',
      [req.params.id, academyId]
    );
    if (!rows[0]) { res.status(404).json({ error: 'Evento não encontrado' }); return; }

    await pool.execute('DELETE FROM calendar_events WHERE id = ?', [req.params.id]);
    res.json({ message: 'Evento removido' });
  } catch (err) {
    throw err;
  }
});

export default router;
