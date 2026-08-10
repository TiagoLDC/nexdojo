import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import pool from '../db';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { validate } from '../utils/validate';

const router = Router();

const CATEGORY_VALUES = ['kids', 'adult', 'both'];

const slugify = (value: string): string =>
  String(value)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// Todo o cadastro de Esporte (template global de faixas/graus) é restrito ao superuser.
router.use(requireAuth, requireRole('superuser'));

// GET /api/sports
router.get('/', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [rows] = await pool.execute<any[]>('SELECT * FROM sports ORDER BY name ASC');
    res.json({ data: rows, total: (rows as any[]).length });
  } catch (err) {
    next(err);
  }
});

// POST /api/sports
router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const errors = validate(req.body, {
    name: { required: true, type: 'string', maxLength: 100 },
  });
  if (errors.length) { res.status(400).json({ error: errors[0] }); return; }

  try {
    const baseSlug = req.body.slug ? slugify(req.body.slug) : slugify(req.body.name);
    let slug = baseSlug;
    let suffix = 1;
    while (true) {
      const [conflict] = await pool.execute<any[]>('SELECT id FROM sports WHERE slug = ?', [slug]);
      if (!(conflict as any[]).length) break;
      slug = `${baseSlug}-${suffix++}`;
    }

    const id = crypto.randomUUID();
    await pool.execute(
      'INSERT INTO sports (id, name, slug, active) VALUES (?, ?, ?, ?)',
      [id, req.body.name, slug, req.body.active === false ? 0 : 1]
    );

    const [rows] = await pool.execute<any[]>('SELECT * FROM sports WHERE id = ?', [id]);
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/sports/:id
router.put('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const errors = validate(req.body, {
    name: { type: 'string', maxLength: 100 },
  });
  if (errors.length) { res.status(400).json({ error: errors[0] }); return; }

  try {
    const [existing] = await pool.execute<any[]>('SELECT id FROM sports WHERE id = ?', [req.params.id]);
    if (!existing[0]) { res.status(404).json({ error: 'Esporte não encontrado' }); return; }

    const ALLOWED = ['name', 'active'];
    const fields = Object.keys(req.body).filter(k => ALLOWED.includes(k));
    if (req.body.active !== undefined) req.body.active = req.body.active ? 1 : 0;

    if (fields.length) {
      const set = fields.map(f => `${f} = ?`).join(', ');
      const values = fields.map(f => req.body[f]);
      await pool.execute(`UPDATE sports SET ${set} WHERE id = ?`, [...values, req.params.id]);
    }

    const [rows] = await pool.execute<any[]>('SELECT * FROM sports WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// GET /api/sports/:id/belt-ranks
router.get('/:id/belt-ranks', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [rows] = await pool.execute<any[]>(
      'SELECT * FROM belt_ranks WHERE sport_id = ? ORDER BY order_index ASC',
      [req.params.id]
    );
    res.json({ data: rows, total: (rows as any[]).length });
  } catch (err) {
    next(err);
  }
});

// POST /api/sports/:id/belt-ranks
router.post('/:id/belt-ranks', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const errors = validate(req.body, {
    name:         { required: true, type: 'string', maxLength: 100 },
    color_key:    { required: true, type: 'string', maxLength: 50 },
    order_index:  { required: true, type: 'number', min: 0 },
    degree_count: { type: 'number', min: 0 },
    category:     { enum: CATEGORY_VALUES },
    min_age:      { type: 'number', min: 0 },
    max_age:      { type: 'number', min: 0 },
  });
  if (errors.length) { res.status(400).json({ error: errors[0] }); return; }

  try {
    const [sport] = await pool.execute<any[]>('SELECT id FROM sports WHERE id = ?', [req.params.id]);
    if (!sport[0]) { res.status(404).json({ error: 'Esporte não encontrado' }); return; }

    const [orderConflict] = await pool.execute<any[]>(
      'SELECT id FROM belt_ranks WHERE sport_id = ? AND order_index = ?',
      [req.params.id, req.body.order_index]
    );
    if (orderConflict[0]) { res.status(409).json({ error: 'Já existe uma faixa nessa posição da sequência' }); return; }

    const id = crypto.randomUUID();
    await pool.execute(
      `INSERT INTO belt_ranks (id, sport_id, name, color_key, order_index, degree_count, category, min_age, max_age)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, req.params.id, req.body.name, req.body.color_key, req.body.order_index,
        req.body.degree_count ?? 4, req.body.category ?? 'adult',
        req.body.min_age ?? null, req.body.max_age ?? null,
      ]
    );

    const [rows] = await pool.execute<any[]>('SELECT * FROM belt_ranks WHERE id = ?', [id]);
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/sports/:id/belt-ranks/:rankId
router.put('/:id/belt-ranks/:rankId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const errors = validate(req.body, {
    name:         { type: 'string', maxLength: 100 },
    color_key:    { type: 'string', maxLength: 50 },
    order_index:  { type: 'number', min: 0 },
    degree_count: { type: 'number', min: 0 },
    category:     { enum: CATEGORY_VALUES },
    min_age:      { type: 'number', min: 0 },
    max_age:      { type: 'number', min: 0 },
  });
  if (errors.length) { res.status(400).json({ error: errors[0] }); return; }

  try {
    const [existing] = await pool.execute<any[]>(
      'SELECT id FROM belt_ranks WHERE id = ? AND sport_id = ?',
      [req.params.rankId, req.params.id]
    );
    if (!existing[0]) { res.status(404).json({ error: 'Faixa não encontrada' }); return; }

    if (req.body.order_index !== undefined) {
      const [orderConflict] = await pool.execute<any[]>(
        'SELECT id FROM belt_ranks WHERE sport_id = ? AND order_index = ? AND id != ?',
        [req.params.id, req.body.order_index, req.params.rankId]
      );
      if (orderConflict[0]) { res.status(409).json({ error: 'Já existe uma faixa nessa posição da sequência' }); return; }
    }

    const ALLOWED = ['name', 'color_key', 'order_index', 'degree_count', 'category', 'min_age', 'max_age'];
    const fields = Object.keys(req.body).filter(k => ALLOWED.includes(k));
    if (fields.length) {
      const set = fields.map(f => `${f} = ?`).join(', ');
      const values = fields.map(f => req.body[f] ?? null);
      await pool.execute(`UPDATE belt_ranks SET ${set} WHERE id = ?`, [...values, req.params.rankId]);
    }

    const [rows] = await pool.execute<any[]>('SELECT * FROM belt_ranks WHERE id = ?', [req.params.rankId]);
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/sports/:id/belt-ranks/:rankId — bloqueado se a faixa estiver em uso
router.delete('/:id/belt-ranks/:rankId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [existing] = await pool.execute<any[]>(
      'SELECT id FROM belt_ranks WHERE id = ? AND sport_id = ?',
      [req.params.rankId, req.params.id]
    );
    if (!existing[0]) { res.status(404).json({ error: 'Faixa não encontrada' }); return; }

    const [inUse] = await pool.execute<any[]>(
      `SELECT
         (SELECT COUNT(*) FROM students WHERE belt_rank_id = ?) +
         (SELECT COUNT(*) FROM instructors WHERE belt_rank_id = ?) +
         (SELECT COUNT(*) FROM academy_belt_settings WHERE belt_rank_id = ?) AS total`,
      [req.params.rankId, req.params.rankId, req.params.rankId]
    );
    if ((inUse[0] as any).total > 0) {
      res.status(409).json({ error: 'Faixa em uso por academias e/ou alunos/instrutores — não pode ser removida' });
      return;
    }

    await pool.execute('DELETE FROM belt_ranks WHERE id = ?', [req.params.rankId]);
    res.json({ message: 'Faixa removida' });
  } catch (err) {
    next(err);
  }
});

export default router;
