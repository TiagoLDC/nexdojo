import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import pool from '../db';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { getAcademyId } from '../utils/academyScope';
import { validate } from '../utils/validate';

const router = Router();

function mapPlans(rows: any[]) {
  return rows.map(p => ({
    id: p.id,
    name: p.name,
    durationMonths: p.duration_months,
    classesPerWeek: p.classes_per_week,
    price: parseFloat(p.price),
    category: p.category,
    description: p.description,
  }));
}

// GET /api/academies — superuser: lista todas; admin: apenas a própria
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
    next(err);
  }
});

// GET /api/academies/by-alias/:alias — público (login direto por alias)
router.get('/by-alias/:alias', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [rows] = await pool.execute<any[]>(
      'SELECT id, name, alias, logo, owner_name AS ownerName FROM academies WHERE alias = ?',
      [String(req.params.alias).toLowerCase().trim()]
    );
    if (!rows[0]) { res.status(404).json({ error: 'Academia não encontrada' }); return; }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// GET /api/academies/:id/belt-ranks/public — público (sem auth): nome/cor/ordem das faixas
// do esporte da academia, para o formulário de auto-cadastro (LoginView) colorir o seletor
// de faixa antes de o usuário ter sessão. Sem meses/aulas/graus — não é dado sensível.
router.get('/:id/belt-ranks/public', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [academyRows] = await pool.execute<any[]>('SELECT sport_id FROM academies WHERE id = ?', [req.params.id]);
    if (!academyRows[0]) { res.status(404).json({ error: 'Academia não encontrada' }); return; }

    const sportId = academyRows[0].sport_id;
    if (!sportId) { res.json({ data: [] }); return; }

    const [rows] = await pool.execute<any[]>(
      'SELECT id, name, color_key, order_index FROM belt_ranks WHERE sport_id = ? ORDER BY order_index ASC',
      [sportId]
    );
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/academies/:id
router.get('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { role, academyId: tokenAcademyId } = req.user!;

  if (role !== 'superuser' && tokenAcademyId !== req.params.id) {
    res.status(403).json({ error: 'Sem permissão para acessar esta academia' });
    return;
  }

  try {
    const [rows] = await pool.execute<any[]>('SELECT * FROM academies WHERE id = ?', [req.params.id]);
    if (!rows[0]) { res.status(404).json({ error: 'Academia não encontrada' }); return; }
    const academy = rows[0];
    if (academy.graduation_rules && typeof academy.graduation_rules === 'string') {
      try { academy.graduation_rules = JSON.parse(academy.graduation_rules); } catch {}
    }
    const [planRows] = await pool.execute<any[]>(
      'SELECT * FROM academy_plans WHERE academy_id = ? ORDER BY price ASC',
      [req.params.id]
    );
    academy.plans = mapPlans(planRows as any[]);
    res.json(academy);
  } catch (err) {
    next(err);
  }
});

// PUT /api/academies/:id — atualizar configurações
router.put('/:id', requireAuth, requireRole('admin', 'superuser'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
    current_plan:           { enum: ['Free', 'Silver', 'Gold', 'Black Belt', 'VIP'] },
    plan_status:            { enum: ['Active', 'Expired', 'Trial', 'Suspended', 'Canceled'] },
    pix_type:               { enum: ['CPF', 'CNPJ', 'E-mail', 'Telefone', 'Aleatória'] },
  });
  if (errors.length) { res.status(400).json({ error: errors[0] }); return; }

  const ALLOWED = [
    'name', 'alias', 'logo', 'owner_name', 'email', 'phone',
    'cep', 'address', 'address_number', 'absence_limit',
    'pix_key', 'pix_type', 'bank_name', 'bank_agency', 'bank_account',
    'current_plan', 'plan_status', 'plan_expiration_date', 'payment_warning_days',
    'graduation_rules', 'qr_code_presenca', 'kimono_loan_enabled',
  ];

  if (req.body.kimono_loan_enabled !== undefined) {
    req.body.kimono_loan_enabled = req.body.kimono_loan_enabled ? 1 : 0;
  }

  // Serializar graduation_rules como JSON string para o MySQL
  if (req.body.graduation_rules !== undefined) {
    req.body.graduation_rules = req.body.graduation_rules === null
      ? null
      : JSON.stringify(req.body.graduation_rules);
  }

  const fields = Object.keys(req.body).filter(k => ALLOWED.includes(k));
  const hasPlans = Array.isArray(req.body.plans);

  if (!fields.length && !hasPlans) { res.status(400).json({ error: 'Nenhum campo válido para atualizar' }); return; }

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

    if (fields.length) {
      const set    = fields.map(f => `${f} = ?`).join(', ');
      const values = fields.map(f => req.body[f] ?? null);
      await pool.execute(
        `UPDATE academies SET ${set} WHERE id = ?`,
        [...values, req.params.id]
      );
    }

    if (hasPlans) {
      await pool.execute('DELETE FROM academy_plans WHERE academy_id = ?', [req.params.id]);
      for (const plan of req.body.plans) {
        const planId = plan.id && plan.id.length > 4 ? plan.id : `plan_${Math.random().toString(36).substr(2, 9)}`;
        // interceptor converte camelCase→snake_case antes de enviar, então lemos snake_case aqui
        const durationMonths = plan.duration_months ?? plan.durationMonths ?? null;
        const classesPerWeek = plan.classes_per_week ?? plan.classesPerWeek ?? null;
        await pool.execute(
          `INSERT INTO academy_plans (id, academy_id, name, duration_months, classes_per_week, price, category, description)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            planId,
            req.params.id,
            plan.name,
            durationMonths,
            classesPerWeek,
            plan.price ?? null,
            plan.category ?? null,
            plan.description ?? null,
          ]
        );
      }
    }

    const [rows] = await pool.execute<any[]>('SELECT * FROM academies WHERE id = ?', [req.params.id]);
    const academy = rows[0];
    if (academy.graduation_rules && typeof academy.graduation_rules === 'string') {
      try { academy.graduation_rules = JSON.parse(academy.graduation_rules); } catch {}
    }
    const [planRows] = await pool.execute<any[]>(
      'SELECT * FROM academy_plans WHERE academy_id = ? ORDER BY price ASC',
      [req.params.id]
    );
    academy.plans = mapPlans(planRows as any[]);
    res.json(academy);
  } catch (err) {
    next(err);
  }
});

// GET /api/academies/:id/belt-settings — faixas do esporte da academia + config atual de meses/aulas
router.get('/:id/belt-settings', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { role, academyId: tokenAcademyId } = req.user!;

  if (role !== 'superuser' && tokenAcademyId !== req.params.id) {
    res.status(403).json({ error: 'Sem permissão para acessar esta academia' });
    return;
  }

  try {
    const [academyRows] = await pool.execute<any[]>('SELECT sport_id FROM academies WHERE id = ?', [req.params.id]);
    if (!academyRows[0]) { res.status(404).json({ error: 'Academia não encontrada' }); return; }

    const sportId = academyRows[0].sport_id;
    if (!sportId) {
      // Academia ainda sem esporte definido (pendente de migração de dados) — sem faixas para configurar.
      res.json({ sport: null, belt_ranks: [] });
      return;
    }

    const [sportRows] = await pool.execute<any[]>('SELECT id, name, slug FROM sports WHERE id = ?', [sportId]);
    const [rankRows] = await pool.execute<any[]>(
      `SELECT br.*, abs.months_required, abs.classes_required, abs.warn_before_months, abs.warn_before_classes
       FROM belt_ranks br
       LEFT JOIN academy_belt_settings abs ON abs.belt_rank_id = br.id AND abs.academy_id = ?
       WHERE br.sport_id = ?
       ORDER BY br.order_index ASC`,
      [req.params.id, sportId]
    );

    res.json({ sport: sportRows[0] ?? null, belt_ranks: rankRows });
  } catch (err) {
    next(err);
  }
});

// PUT /api/academies/:id/belt-settings — define meses/aulas necessários por faixa
router.put('/:id/belt-settings', requireAuth, requireRole('admin', 'superuser'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { role, academyId: tokenAcademyId } = req.user!;

  if (role !== 'superuser' && tokenAcademyId !== req.params.id) {
    res.status(403).json({ error: 'Sem permissão para editar esta academia' });
    return;
  }

  const settings = req.body.settings;
  if (!Array.isArray(settings)) { res.status(400).json({ error: 'settings deve ser uma lista' }); return; }

  try {
    const [academyRows] = await pool.execute<any[]>('SELECT sport_id FROM academies WHERE id = ?', [req.params.id]);
    if (!academyRows[0]) { res.status(404).json({ error: 'Academia não encontrada' }); return; }

    const sportId = academyRows[0].sport_id;
    if (!sportId) { res.status(409).json({ error: 'Academia ainda sem esporte definido' }); return; }

    for (const item of settings) {
      const [rankCheck] = await pool.execute<any[]>(
        'SELECT id FROM belt_ranks WHERE id = ? AND sport_id = ?',
        [item.belt_rank_id, sportId]
      );
      if (!rankCheck[0]) { res.status(400).json({ error: `Faixa inválida para o esporte desta academia: ${item.belt_rank_id}` }); return; }
    }

    for (const item of settings) {
      await pool.execute(
        `INSERT INTO academy_belt_settings
           (id, academy_id, belt_rank_id, months_required, classes_required, warn_before_months, warn_before_classes)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           months_required = VALUES(months_required),
           classes_required = VALUES(classes_required),
           warn_before_months = VALUES(warn_before_months),
           warn_before_classes = VALUES(warn_before_classes)`,
        [
          crypto.randomUUID(), req.params.id, item.belt_rank_id,
          item.months_required ?? null, item.classes_required ?? null,
          item.warn_before_months ?? null, item.warn_before_classes ?? null,
        ]
      );
    }

    const [rankRows] = await pool.execute<any[]>(
      `SELECT br.*, abs.months_required, abs.classes_required, abs.warn_before_months, abs.warn_before_classes
       FROM belt_ranks br
       LEFT JOIN academy_belt_settings abs ON abs.belt_rank_id = br.id AND abs.academy_id = ?
       WHERE br.sport_id = ?
       ORDER BY br.order_index ASC`,
      [req.params.id, sportId]
    );
    res.json({ belt_ranks: rankRows });
  } catch (err) {
    next(err);
  }
});

export default router;
