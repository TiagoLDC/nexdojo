import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import pool from '../db';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { getAcademyId } from '../utils/academyScope';
import { validate } from '../utils/validate';
import { autoLinkEntityToUser } from '../utils/linkEntityUser';

const router = Router();

const STATUS_VALUES = ['Active', 'Inactive', 'Dropped', 'Pending', 'PreCadastro'];

const UPDATABLE_FIELDS = [
  'name', 'email', 'phone', 'whatsapp', 'photo', 'birth_date', 'gender', 'position',
  'cpf', 'rg', 'cep', 'address', 'address_number', 'address_neighborhood', 'address_city', 'address_state',
  'medical_notes', 'status', 'join_date', 'user_id',
];

const buildInviteLink = (alias: string, token: string): string => {
  const base = (process.env.FRONTEND_URL || 'http://localhost:3002').replace(/\/$/, '');
  return `${base}/staff-invite/${alias}/${token}`;
};

// GET /api/staff
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  const { search, status, page = '1', limit = '20' } = req.query;
  const pageNum = Math.max(1, parseInt(String(page), 10));
  const limitNum = Math.min(1000, Math.max(1, parseInt(String(limit), 10)));
  const offset = (pageNum - 1) * limitNum;

  let where = 'WHERE s.academy_id = ?';
  const params: any[] = [academyId];

  if (search) {
    where += ' AND (s.name LIKE ? OR s.email LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (status) {
    where += ' AND s.status = ?';
    params.push(status);
  }

  try {
    const [countRows] = await pool.execute<any[]>(
      `SELECT COUNT(*) as total FROM staff s ${where}`,
      params
    );
    const total = (countRows[0] as any).total;

    const [rows] = await pool.execute<any[]>(
      `SELECT s.*, a.alias AS academy_alias
       FROM staff s JOIN academies a ON a.id = s.academy_id
       ${where} ORDER BY s.name ASC LIMIT ${limitNum} OFFSET ${offset}`,
      params
    );

    // Ver comentário equivalente em students.ts — mesma otimização de payload.
    const data = (rows as any[]).map(r => {
      const { photo, ...rest } = r;
      return {
        ...(req.query.includePhoto === 'false' ? rest : r),
        invite_link: r.invite_token ? buildInviteLink(r.academy_alias, r.invite_token) : null,
      };
    });

    res.json({ data, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) });
  } catch (err) {
    next(err);
  }
});

// GET /api/staff/:id
router.get('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  try {
    const [rows] = await pool.execute<any[]>(
      `SELECT s.*, a.alias AS academy_alias
       FROM staff s JOIN academies a ON a.id = s.academy_id
       WHERE s.id = ? AND s.academy_id = ?`,
      [req.params.id, academyId]
    );
    if (!rows[0]) { res.status(404).json({ error: 'Colaborador não encontrado' }); return; }
    const row = rows[0] as any;
    res.json({ ...row, invite_link: row.invite_token ? buildInviteLink(row.academy_alias, row.invite_token) : null });
  } catch (err) {
    next(err);
  }
});

// POST /api/staff — pré-cadastro: só nome + whatsapp opcional; gera invite_token
router.post('/', requireAuth, requireRole('admin', 'superuser'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  const errors = validate(req.body, {
    name: { required: true, type: 'string', maxLength: 255 },
  });
  if (errors.length) { res.status(400).json({ error: errors[0] }); return; }

  const id = crypto.randomUUID();
  const inviteToken = crypto.randomBytes(32).toString('hex');
  const b = req.body;

  try {
    await pool.execute(
      `INSERT INTO staff (
        id, academy_id, name, whatsapp, invite_token, position, status
      ) VALUES (?,?,?,?,?,?,?)`,
      [
        id, academyId,
        b.name,
        b.whatsapp ?? null,
        inviteToken,
        b.position ?? null,
        'PreCadastro',
      ]
    );

    const [rows] = await pool.execute<any[]>(
      `SELECT s.*, a.alias AS academy_alias FROM staff s JOIN academies a ON a.id = s.academy_id WHERE s.id = ?`,
      [id]
    );
    const row = rows[0] as any;
    res.status(201).json({ ...row, invite_link: buildInviteLink(row.academy_alias, inviteToken) });
  } catch (err) {
    next(err);
  }
});

// PUT /api/staff/:id
router.put('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  // String vazia não é NULL para o índice único (academy_id, email) do MySQL — normaliza.
  if (typeof req.body.email === 'string' && req.body.email.trim() === '') req.body.email = null;

  const errors = validate(req.body, {
    name:   { type: 'string', maxLength: 255 },
    email:  { type: 'email' },
    status: { enum: STATUS_VALUES },
  });
  if (errors.length) { res.status(400).json({ error: errors[0] }); return; }

  try {
    const [existing] = await pool.execute<any[]>(
      'SELECT id, user_id, email FROM staff WHERE id = ? AND academy_id = ?',
      [req.params.id, academyId]
    );
    if (!existing[0]) { res.status(404).json({ error: 'Colaborador não encontrado' }); return; }

    const isAdmin = ['admin', 'superuser'].includes(req.user!.role);
    const isSelf = req.user!.role === 'staff' && String(existing[0].user_id) === String(req.user!.userId);

    if (!isAdmin && !isSelf) {
      res.status(403).json({ error: 'Sem permissão para esta ação' });
      return;
    }

    if (!isAdmin) {
      ['status', 'join_date', 'user_id'].forEach(f => delete req.body[f]);
    }

    // Ao aprovar (Active), ativa o usuário vinculado
    if (isAdmin && req.body.status === 'Active') {
      const staffRow = existing[0] as any;
      if (staffRow.user_id) {
        await pool.execute(
          `UPDATE users SET status = 'Active' WHERE id = ? AND status = 'Pending'`,
          [staffRow.user_id]
        );
      }
    }

    const fields = Object.keys(req.body).filter(k => UPDATABLE_FIELDS.includes(k));
    if (!fields.length) { res.status(400).json({ error: 'Nenhum campo válido para atualizar' }); return; }

    const set = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => req.body[f] ?? null);

    await pool.execute(
      `UPDATE staff SET ${set} WHERE id = ? AND academy_id = ?`,
      [...values, req.params.id, academyId]
    );

    if (!existing[0].user_id) {
      const emailToLink = req.body.email || existing[0].email;
      if (emailToLink) await autoLinkEntityToUser('staff', String(req.params.id), emailToLink, academyId);
    }

    const [rows] = await pool.execute<any[]>(
      `SELECT s.*, a.alias AS academy_alias FROM staff s JOIN academies a ON a.id = s.academy_id WHERE s.id = ?`,
      [req.params.id]
    );
    const row = rows[0] as any;
    res.json({ ...row, invite_link: row.invite_token ? buildInviteLink(row.academy_alias, row.invite_token) : null });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/staff/:id — move para lixeira
router.delete('/:id', requireAuth, requireRole('admin', 'superuser'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  try {
    const [rows] = await pool.execute<any[]>(
      'SELECT * FROM staff WHERE id = ? AND academy_id = ?',
      [req.params.id, academyId]
    );
    if (!rows[0]) { res.status(404).json({ error: 'Colaborador não encontrado' }); return; }

    await pool.execute(
      'INSERT INTO recycle_bin (id, academy_id, type, original_data) VALUES (?,?,?,?)',
      [crypto.randomUUID(), academyId, 'staff', JSON.stringify(rows[0])]
    );

    await pool.execute('DELETE FROM staff WHERE id = ?', [req.params.id]);

    // Sem isso, a conta de login vinculada continua ativa após a ficha ir pra lixeira,
    // gerando um cadastro "órfão". A restauração em POST /api/recycle-bin/:id/restore reverte isso.
    if (rows[0].user_id) {
      await pool.execute(
        `UPDATE users SET status = 'Blocked' WHERE id = ? AND academy_id = ?`,
        [rows[0].user_id, academyId]
      );
    }

    res.json({ message: 'Colaborador movido para a lixeira' });
  } catch (err) {
    next(err);
  }
});

export default router;
