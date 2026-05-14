import { Router, Request, Response, NextFunction } from 'express';
import pool from '../db';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { getAcademyId } from '../utils/academyScope';
import { validate } from '../utils/validate';

const router = Router();

// GET /api/chat
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  const { limit = '50', before } = req.query;
  const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10)));

  let where = 'WHERE academy_id = ?';
  const params: any[] = [academyId];

  if (before) { where += ' AND timestamp < ?'; params.push(before); }

  try {
    const [rows] = await pool.execute<any[]>(
      `SELECT * FROM chat_messages ${where} ORDER BY timestamp DESC LIMIT ${limitNum}`,
      params
    );
    res.json({ data: (rows as any[]).reverse(), total: (rows as any[]).length });
  } catch (err) {
    next(err);
  }
});

// POST /api/chat
router.post('/', requireAuth, requireRole('admin', 'superuser', 'instructor', 'staff'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  const errors = validate(req.body, {
    content: { required: true, type: 'string', maxLength: 2000 },
  });
  if (errors.length) { res.status(400).json({ error: errors[0] }); return; }

  const { content } = req.body;
  const { userId, role } = req.user!;
  const id = crypto.randomUUID();

  try {
    const [userRows] = await pool.execute<any[]>('SELECT name FROM users WHERE id = ?', [userId]);
    const senderName = userRows[0]?.name ?? 'Usuário';

    await pool.execute(
      'INSERT INTO chat_messages (id, academy_id, sender_id, sender_name, sender_role, content) VALUES (?,?,?,?,?,?)',
      [id, academyId, userId, senderName, role, content]
    );
    const [rows] = await pool.execute<any[]>('SELECT * FROM chat_messages WHERE id = ?', [id]);
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
