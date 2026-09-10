import { Router, Request, Response, NextFunction } from 'express';
import pool from '../db';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { getAcademyId } from '../utils/academyScope';

const router = Router();

// GET /api/audit-log — trilha de auditoria de ações sensíveis (exclusões, financeiro, troca de role/status, etc.)
router.get('/', requireAuth, requireRole('admin', 'superuser'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  const { action, entityType, entityId, dateFrom, dateTo, page = '1', limit = '50' } = req.query;
  const pageNum  = Math.max(1, parseInt(String(page), 10));
  const limitNum = Math.min(200, Math.max(1, parseInt(String(limit), 10)));
  const offset   = (pageNum - 1) * limitNum;

  let where = 'WHERE academy_id = ?';
  const params: any[] = [academyId];

  if (action)     { where += ' AND action = ?';                     params.push(action); }
  if (entityType) { where += ' AND entity_type = ?';                params.push(entityType); }
  if (entityId)   { where += ' AND entity_id = ?';                  params.push(entityId); }
  if (dateFrom)   { where += ' AND created_at >= ?';                params.push(dateFrom); }
  if (dateTo)     { where += ' AND created_at <= ?';                params.push(dateTo); }

  try {
    const [countRows] = await pool.execute<any[]>(
      `SELECT COUNT(*) as total FROM audit_log ${where}`,
      params
    );
    const total = (countRows[0] as any).total;

    const [rows] = await pool.execute<any[]>(
      `SELECT * FROM audit_log ${where} ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offset}`,
      params
    );

    const parsed = (rows as any[]).map(r => ({
      ...r,
      details: r.details ? JSON.parse(r.details) : null,
    }));

    res.json({ data: parsed, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) });
  } catch (err) {
    next(err);
  }
});

export default router;
