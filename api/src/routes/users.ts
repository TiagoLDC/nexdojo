import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import pool from '../db';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { getAcademyId } from '../utils/academyScope';
import { autoLinkUserToEntities } from '../utils/linkEntityUser';

const router = Router();

const ROLE_VALUES = ['admin', 'instructor', 'staff', 'student'];
const STATUS_VALUES = ['Active', 'Pending', 'Blocked'];

const USER_SELECT = `
  SELECT
    u.id, u.academy_id, u.role, u.name, u.email, u.status,
    u.requires_password_change, u.created_at,
    COALESCE(s.photo, i.photo, st.photo, u.photo) AS photo,
    JSON_UNQUOTE(JSON_EXTRACT(u.profile_data, '$.phone'))    AS phone,
    JSON_UNQUOTE(JSON_EXTRACT(u.profile_data, '$.position')) AS position,
    COALESCE(s.id, i.id, st.id) as entity_id,
    CASE
      WHEN s.id IS NOT NULL THEN 'student'
      WHEN i.id IS NOT NULL THEN 'instructor'
      WHEN st.id IS NOT NULL THEN 'staff'
      ELSE NULL
    END as entity_type
  FROM users u
  LEFT JOIN students s  ON s.user_id  = u.id AND s.academy_id  = u.academy_id
  LEFT JOIN instructors i ON i.user_id = u.id AND i.academy_id = u.academy_id
  LEFT JOIN staff st      ON st.user_id = u.id AND st.academy_id = u.academy_id
`;

// GET /api/users
router.get('/', requireAuth, requireRole('admin', 'superuser'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  const { search, role, status, page = '1', limit = '50' } = req.query;
  const pageNum  = Math.max(1, parseInt(String(page), 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10)));
  const offset   = (pageNum - 1) * limitNum;

  let where = 'WHERE u.academy_id = ?';
  const params: any[] = [academyId];

  if (search) {
    where += ' AND (u.name LIKE ? OR u.email LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (role) {
    where += ' AND u.role = ?';
    params.push(role);
  }
  if (status) {
    where += ' AND u.status = ?';
    params.push(status);
  }

  try {
    const [countRows] = await pool.execute<any[]>(
      `SELECT COUNT(*) as total FROM users u ${where}`,
      params
    );
    const total = (countRows[0] as any).total;

    const [rows] = await pool.execute<any[]>(
      `${USER_SELECT} ${where} ORDER BY u.name ASC LIMIT ${limitNum} OFFSET ${offset}`,
      params
    );

    res.json({ data: rows, total, page: pageNum, limit: limitNum });
  } catch (err) {
    next(err);
  }
});

// POST /api/users — cria conta de admin/instructor/staff diretamente
router.post('/', requireAuth, requireRole('admin', 'superuser'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  const { name, email, role, password } = req.body;

  if (!name || !email || !role || !password) {
    res.status(400).json({ error: 'Nome, e-mail, função e senha são obrigatórios' });
    return;
  }
  if (!['admin', 'instructor', 'staff'].includes(String(role))) {
    res.status(400).json({ error: 'Função inválida. Use: admin, instructor ou staff' });
    return;
  }
  if (String(password).length < 6) {
    res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres' });
    return;
  }

  try {
    const [existing] = await pool.execute<any[]>(
      'SELECT id FROM users WHERE email = ?',
      [String(email).toLowerCase().trim()]
    );
    if (existing[0]) {
      res.status(409).json({ error: 'E-mail já cadastrado' });
      return;
    }

    const hash   = await bcrypt.hash(String(password), 10);
    const userId = crypto.randomUUID();

    await pool.execute(
      `INSERT INTO users (id, academy_id, role, name, email, password_hash, status, requires_password_change)
       VALUES (?, ?, ?, ?, ?, ?, 'Active', 1)`,
      [userId, academyId, role, String(name).trim(), String(email).toLowerCase().trim(), hash]
    );

    await autoLinkUserToEntities(userId, String(email).toLowerCase().trim(), academyId);

    const [rows] = await pool.execute<any[]>(
      `${USER_SELECT} WHERE u.id = ?`,
      [userId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/users/:id — altera status, senha, nome, e-mail ou role
router.put('/:id', requireAuth, requireRole('admin', 'superuser'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  try {
    const [existing] = await pool.execute<any[]>(
      'SELECT id, role, email FROM users WHERE id = ? AND academy_id = ?',
      [req.params.id, academyId]
    );
    if (!existing[0]) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }

    // Admin não pode alterar contas de superusuário
    if (existing[0].role === 'superuser' && req.user!.role !== 'superuser') {
      res.status(403).json({ error: 'Sem permissão para alterar superusuários' });
      return;
    }

    const updates: string[] = [];
    const values:  any[]    = [];

    if (req.body.status && STATUS_VALUES.includes(req.body.status)) {
      updates.push('status = ?');
      values.push(req.body.status);
    }
    if (req.body.role && ROLE_VALUES.includes(req.body.role)) {
      updates.push('role = ?');
      values.push(req.body.role);
    }
    if (req.body.name) {
      updates.push('name = ?');
      values.push(String(req.body.name).trim());
    }
    if (req.body.email) {
      updates.push('email = ?');
      values.push(String(req.body.email).toLowerCase().trim());
    }
    if (req.body.password) {
      if (String(req.body.password).length < 6) {
        res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres' });
        return;
      }
      const hash = await bcrypt.hash(String(req.body.password), 10);
      updates.push('password_hash = ?');
      updates.push('requires_password_change = 1');
      values.push(hash);
    }
    if (req.body.photo !== undefined) {
      updates.push('photo = ?');
      values.push(req.body.photo || null);
    }
    const profileKeys = (['phone', 'position'] as const).filter(k => k in req.body);
    if (profileKeys.length) {
      const path = profileKeys.map(k => `'$.${k}', ?`).join(', ');
      updates.push(`profile_data = JSON_SET(COALESCE(profile_data, '{}'), ${path})`);
      profileKeys.forEach(k => values.push(req.body[k] || null));
    }

    if (!updates.length) {
      res.status(400).json({ error: 'Nenhum campo válido para atualizar' });
      return;
    }

    await pool.execute(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ? AND academy_id = ?`,
      [...values, req.params.id, academyId]
    );

    // Auto-vínculo: se email foi alterado ou usuário ainda não tem entidade vinculada, tenta linkar
    const finalEmail = req.body.email
      ? String(req.body.email).toLowerCase().trim()
      : existing[0].email;
    if (finalEmail && academyId) {
      await autoLinkUserToEntities(String(req.params.id), finalEmail, academyId);
    }

    const [rows] = await pool.execute<any[]>(
      `${USER_SELECT} WHERE u.id = ?`,
      [req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
