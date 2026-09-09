import { Router, Request, Response, NextFunction } from 'express';
import pool from '../db';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { getAcademyId } from '../utils/academyScope';
import { validate } from '../utils/validate';
import { withTransaction } from '../utils/withTransaction';

const router = Router();

// GET /api/announcements — lista paginada (admin/superuser), com faixas-alvo e estatísticas de leitura
router.get('/', requireAuth, requireRole('admin', 'superuser'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  const { page = '1', limit = '20' } = req.query;
  const pageNum = Math.max(1, parseInt(String(page), 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10)));
  const offset = (pageNum - 1) * limitNum;

  try {
    const [countRows] = await pool.execute<any[]>(
      'SELECT COUNT(*) as total FROM announcements WHERE academy_id = ?',
      [academyId]
    );
    const total = countRows[0].total;

    const [rows] = await pool.execute<any[]>(
      `SELECT a.*, u.name as created_by_name FROM announcements a
       LEFT JOIN users u ON u.id = a.created_by
       WHERE a.academy_id = ?
       ORDER BY a.created_at DESC
       LIMIT ${limitNum} OFFSET ${offset}`,
      [academyId]
    );

    for (const row of rows) {
      const [beltRows] = await pool.execute<any[]>(
        `SELECT br.id, br.name, br.color_key FROM announcement_belt_ranks abr
         JOIN belt_ranks br ON br.id = abr.belt_rank_id
         WHERE abr.announcement_id = ?
         ORDER BY br.order_index`,
        [row.id]
      );
      row.belt_ranks = beltRows;

      const [readRows] = await pool.execute<any[]>(
        'SELECT COUNT(*) as cnt FROM announcement_reads WHERE announcement_id = ?',
        [row.id]
      );
      row.read_count = readRows[0].cnt;

      const beltIds = beltRows.map((b) => b.id);
      const recipientsSql = `
        SELECT COUNT(DISTINCT u.id) as cnt FROM users u
        LEFT JOIN students s ON s.user_id = u.id AND s.academy_id = u.academy_id
        LEFT JOIN instructors i ON i.user_id = u.id AND i.academy_id = u.academy_id
        WHERE u.academy_id = ? AND (
          ? = 1
          ${beltIds.length ? `OR s.belt_rank_id IN (${beltIds.map(() => '?').join(',')}) OR i.belt_rank_id IN (${beltIds.map(() => '?').join(',')})` : ''}
        )`;
      const recipientParams: any[] = [academyId, row.target_all, ...(beltIds.length ? [...beltIds, ...beltIds] : [])];
      const [recipientRows] = await pool.execute<any[]>(recipientsSql, recipientParams);
      row.total_recipients = recipientRows[0].cnt;
    }

    res.json({ data: rows, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) });
  } catch (err) {
    next(err);
  }
});

// GET /api/announcements/pending — comunicados ainda não lidos que se aplicam ao usuário logado
router.get('/pending', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { userId, academyId } = req.user!;
  if (!academyId) { res.json({ data: [] }); return; }

  try {
    // Faixa efetiva do usuário logado: a própria (se aluno/instrutor) ou a de aluno(s) do
    // qual seja responsável (guardian) — pais costumam logar pela conta deles, não a do filho.
    const [beltRows] = await pool.execute<any[]>(
      `SELECT DISTINCT belt_rank_id FROM (
         SELECT belt_rank_id FROM students WHERE user_id = ? AND belt_rank_id IS NOT NULL
         UNION
         SELECT belt_rank_id FROM instructors WHERE user_id = ? AND belt_rank_id IS NOT NULL
         UNION
         SELECT s.belt_rank_id FROM guardianships g
           JOIN students s ON s.id = g.student_id
           WHERE g.guardian_user_id = ? AND s.belt_rank_id IS NOT NULL
       ) t`,
      [userId, userId, userId]
    );
    const beltRankIds = beltRows.map((r) => r.belt_rank_id);
    const extraWhere = beltRankIds.length
      ? `OR a.id IN (SELECT announcement_id FROM announcement_belt_ranks WHERE belt_rank_id IN (${beltRankIds.map(() => '?').join(',')}))`
      : '';

    const [rows] = await pool.execute<any[]>(
      `SELECT a.id, a.title, a.content, a.created_at, u.name as created_by_name
       FROM announcements a
       LEFT JOIN announcement_reads ar ON ar.announcement_id = a.id AND ar.user_id = ?
       LEFT JOIN users u ON u.id = a.created_by
       WHERE a.academy_id = ? AND ar.id IS NULL AND (a.target_all = 1 ${extraWhere})
       ORDER BY a.created_at ASC`,
      [userId, academyId, ...beltRankIds]
    );

    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/announcements — cria um comunicado (admin/superuser), opcionalmente restrito a faixas
router.post('/', requireAuth, requireRole('admin', 'superuser'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  const errors = validate(req.body, {
    title: { required: true, type: 'string', maxLength: 255 },
    content: { required: true, type: 'string', maxLength: 5000 },
  });
  if (errors.length) { res.status(400).json({ error: errors[0] }); return; }

  const { title, content } = req.body;
  const beltRankIds: string[] = Array.isArray(req.body.beltRankIds)
    ? req.body.beltRankIds.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
    : [];
  const targetAll = beltRankIds.length === 0;
  const { userId } = req.user!;
  const id = crypto.randomUUID();

  try {
    await withTransaction(async (conn) => {
      await conn.execute(
        'INSERT INTO announcements (id, academy_id, title, content, target_all, created_by) VALUES (?,?,?,?,?,?)',
        [id, academyId, title, content, targetAll ? 1 : 0, userId]
      );
      for (const beltRankId of beltRankIds) {
        await conn.execute(
          'INSERT INTO announcement_belt_ranks (announcement_id, belt_rank_id) VALUES (?,?)',
          [id, beltRankId]
        );
      }
    });

    const [rows] = await pool.execute<any[]>('SELECT * FROM announcements WHERE id = ?', [id]);
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /api/announcements/:id/read — confirma a leitura pelo usuário logado (idempotente)
router.post('/:id/read', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { userId } = req.user!;

  try {
    await pool.execute(
      `INSERT INTO announcement_reads (id, announcement_id, user_id) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE read_at = read_at`,
      [crypto.randomUUID(), req.params.id, userId]
    );
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// DELETE /api/announcements/:id — remove um comunicado (admin/superuser)
router.delete('/:id', requireAuth, requireRole('admin', 'superuser'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  try {
    const [result] = await pool.execute<any>(
      'DELETE FROM announcements WHERE id = ? AND academy_id = ?',
      [req.params.id, academyId]
    );
    if (result.affectedRows === 0) { res.status(404).json({ error: 'Comunicado não encontrado' }); return; }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
