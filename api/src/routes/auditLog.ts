import { Router, Request, Response, NextFunction } from 'express';
import pool from '../db';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { getAcademyId } from '../utils/academyScope';

const router = Router();

// GET /api/audit-log — trilha de auditoria de ações sensíveis (exclusões, financeiro, troca de role/status, etc.)
router.get('/', requireAuth, requireRole('admin', 'superuser'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Tentativa de login em e-mail inexistente não tem academia (academy_id NULL) e ficaria invisível
  // em qualquer filtro por academia — só o superusuário alcança esses registros, via academyId=all.
  const globalScope = req.user!.role === 'superuser' && req.query.academyId === 'all';

  let academyId: string | null = null;
  if (!globalScope) {
    academyId = getAcademyId(req, res);
    if (!academyId) return;
  }

  const { action, entityType, entityId, dateFrom, dateTo, search, page = '1', limit = '50' } = req.query;
  const pageNum  = Math.max(1, parseInt(String(page), 10));
  const limitNum = Math.min(200, Math.max(1, parseInt(String(limit), 10)));
  const offset   = (pageNum - 1) * limitNum;

  let where = globalScope ? 'WHERE 1=1' : 'WHERE al.academy_id = ?';
  const params: any[] = globalScope ? [] : [academyId];

  // `action` aceita lista separada por vírgula para a tela filtrar uma categoria inteira
  // (ex: todas as ações de acesso) sem precisar de uma chamada por ação.
  if (action) {
    const actions = String(action).split(',').map(a => a.trim()).filter(Boolean);
    if (actions.length) {
      where += ` AND al.action IN (${actions.map(() => '?').join(',')})`;
      params.push(...actions);
    }
  }
  if (entityType) { where += ' AND al.entity_type = ?'; params.push(entityType); }
  if (entityId)   { where += ' AND al.entity_id = ?';   params.push(entityId); }
  if (dateFrom)   { where += ' AND al.created_at >= ?'; params.push(dateFrom); }
  // Data pura (YYYY-MM-DD) vira 00:00:00 e excluiria o próprio dia escolhido do resultado
  if (dateTo) {
    const raw = String(dateTo);
    where += ' AND al.created_at <= ?';
    params.push(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw} 23:59:59` : raw);
  }
  if (search) {
    where += ' AND (al.user_email LIKE ? OR u.name LIKE ? OR u.email LIKE ? OR al.details LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }

  // LEFT JOIN em users porque o autor é gravado só como user_id na maioria dos eventos;
  // o user_email da própria linha é o fallback para quando o autor já não existe mais.
  const FROM = 'FROM audit_log al LEFT JOIN users u ON u.id = al.user_id';

  try {
    const [countRows] = await pool.execute<any[]>(
      `SELECT COUNT(*) as total ${FROM} ${where}`,
      params
    );
    const total = (countRows[0] as any).total;

    const [rows] = await pool.execute<any[]>(
      `SELECT al.*, u.name AS user_name, COALESCE(al.user_email, u.email) AS user_email
       ${FROM} ${where} ORDER BY al.created_at DESC LIMIT ${limitNum} OFFSET ${offset}`,
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
