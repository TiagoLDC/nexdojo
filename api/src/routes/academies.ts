import { Router, Request, Response } from 'express';
import pool from '../db';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { getAcademyId } from '../utils/academyScope';
import { validate } from '../utils/validate';

const router = Router();

// GET /api/academies — superuser: lista todas; admin: apenas a própria
router.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.user!.role === 'superuser') {
      const [rows] = await pool.execute<any[]>('SELECT * FROM academies ORDER BY name ASC');
      res.json({ data: rows, total: (rows as any[]).length });
      return;
    }

    const academyId = req.user!.academyId;
    if (!academyId) { res.status(403).json({ error: 'Sem academia associada' }); return; }

    const [rows] = await pool.execute<any[]>('SELECT * FROM academies WHERE id = ?', [academyId]);
    res.json({ data: rows, total: (rows as any[]).length });
  } catch (err) {
    throw err;
  }
});

// GET /api/academies/by-alias/:alias — público (login direto por alias)
router.get('/by-alias/:alias', async (req: Request, res: Response): Promise<void> => {
  try {
    const [rows] = await pool.execute<any[]>(
      'SELECT id, name, alias, logo FROM academies WHERE alias = ?',
      [req.params.alias.toLowerCase().trim()]
    );
    if (!rows[0]) { res.status(404).json({ error: 'Academia não encontrada' }); return; }
    res.json(rows[0]);
  } catch (err) {
    throw err;
  }
});

// GET /api/academies/:id
router.get('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { role, academyId: tokenAcademyId } = req.user!;

  if (role !== 'superuser' && tokenAcademyId !== req.params.id) {
    res.status(403).json({ error: 'Sem permissão para acessar esta academia' });
    return;
  }

  try {
    const [rows] = await pool.execute<any[]>('SELECT * FROM academies WHERE id = ?', [req.params.id]);
    if (!rows[0]) { res.status(404).json({ error: 'Academia não encontrada' }); return; }
    res.json(rows[0]);
  } catch (err) {
    throw err;
  }
});

// PUT /api/academies/:id — atualizar configurações
router.put('/:id', requireAuth, requireRole('admin', 'superuser'), async (req: Request, res: Response): Promise<void> => {
  const { role, academyId: tokenAcademyId } = req.user!;

  if (role !== 'superuser' && tokenAcademyId !== req.params.id) {
    res.status(403).json({ error: 'Sem permissão para editar esta academia' });
    return;
  }

  const errors = validate(req.body, {
    name:                   { type: 'string', maxLength: 255 },
    email:                  { type: 'email' },
    alias:                  { type: 'string', maxLength: 100 },
    absence_limit:          { type: 'number', min: 0 },
    payment_warning_days:   { type: 'number', min: 0 },
    current_plan:           { enum: ['Free', 'Silver', 'Gold', 'Black Belt'] },
    plan_status:            { enum: ['Active', 'Expired', 'Trial', 'Suspended', 'Canceled'] },
    pix_type:               { enum: ['CPF', 'CNPJ', 'E-mail', 'Telefone', 'Aleatória'] },
  });
  if (errors.length) { res.status(400).json({ error: errors[0] }); return; }

  const ALLOWED = [
    'name', 'alias', 'logo', 'owner_name', 'email', 'phone',
    'cep', 'address', 'address_number', 'absence_limit',
    'pix_key', 'pix_type', 'bank_name', 'bank_agency', 'bank_account',
    'current_plan', 'plan_status', 'plan_expiration_date', 'payment_warning_days',
  ];
  const fields = Object.keys(req.body).filter(k => ALLOWED.includes(k));
  if (!fields.length) { res.status(400).json({ error: 'Nenhum campo válido para atualizar' }); return; }

  try {
    const [existing] = await pool.execute<any[]>('SELECT id FROM academies WHERE id = ?', [req.params.id]);
    if (!existing[0]) { res.status(404).json({ error: 'Academia não encontrada' }); return; }

    if (req.body.alias !== undefined) {
      const newAlias = String(req.body.alias).toLowerCase().trim();
      const [aliasConflict] = await pool.execute<any[]>(
        'SELECT id FROM academies WHERE alias = ? AND id != ?',
        [newAlias, req.params.id]
      );
      if ((aliasConflict as any[]).length) { res.status(409).json({ error: 'Alias já está em uso' }); return; }
      req.body.alias = newAlias;
    }

    const set    = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => req.body[f] ?? null);

    await pool.execute(
      `UPDATE academies SET ${set} WHERE id = ?`,
      [...values, req.params.id]
    );
    const [rows] = await pool.execute<any[]>('SELECT * FROM academies WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    throw err;
  }
});

export default router;
