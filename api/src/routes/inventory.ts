import { Router, Request, Response } from 'express';
import pool from '../db';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { getAcademyId } from '../utils/academyScope';
import { validate } from '../utils/validate';

const router = Router();

// GET /api/products
router.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  const { search, category, page = '1', limit = '20' } = req.query;
  const pageNum  = Math.max(1, parseInt(String(page), 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10)));
  const offset   = (pageNum - 1) * limitNum;

  let where = 'WHERE academy_id = ?';
  const params: any[] = [academyId];

  if (search)   { where += ' AND name LIKE ?';     params.push(`%${search}%`); }
  if (category) { where += ' AND category = ?';    params.push(category); }

  try {
    const [countRows] = await pool.execute<any[]>(
      `SELECT COUNT(*) as total FROM products ${where}`,
      params
    );
    const total = (countRows[0] as any).total;

    const [rows] = await pool.execute<any[]>(
      `SELECT * FROM products ${where} ORDER BY name ASC LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

    res.json({ data: rows, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) });
  } catch (err) {
    throw err;
  }
});

// GET /api/products/:id
router.get('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  try {
    const [rows] = await pool.execute<any[]>(
      'SELECT * FROM products WHERE id = ? AND academy_id = ?',
      [req.params.id, academyId]
    );
    if (!rows[0]) { res.status(404).json({ error: 'Produto não encontrado' }); return; }
    res.json(rows[0]);
  } catch (err) {
    throw err;
  }
});

// POST /api/products
router.post('/', requireAuth, requireRole('admin', 'superuser'), async (req: Request, res: Response): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  const errors = validate(req.body, {
    name:  { required: true, type: 'string', maxLength: 255 },
    price: { required: true, type: 'number', min: 0 },
    stock: { type: 'number', min: 0 },
  });
  if (errors.length) { res.status(400).json({ error: errors[0] }); return; }

  const { name, description, price, stock = 0, category, image } = req.body;
  const id = crypto.randomUUID();

  try {
    await pool.execute(
      'INSERT INTO products (id, academy_id, name, description, price, stock, category, image) VALUES (?,?,?,?,?,?,?,?)',
      [id, academyId, name, description ?? null, price, stock, category ?? null, image ?? null]
    );
    const [rows] = await pool.execute<any[]>('SELECT * FROM products WHERE id = ?', [id]);
    res.status(201).json(rows[0]);
  } catch (err) {
    throw err;
  }
});

// PUT /api/products/:id
router.put('/:id', requireAuth, requireRole('admin', 'superuser'), async (req: Request, res: Response): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  const errors = validate(req.body, {
    name:  { type: 'string', maxLength: 255 },
    price: { type: 'number', min: 0 },
    stock: { type: 'number', min: 0 },
  });
  if (errors.length) { res.status(400).json({ error: errors[0] }); return; }

  const ALLOWED = ['name', 'description', 'price', 'stock', 'category', 'image'];
  const fields = Object.keys(req.body).filter(k => ALLOWED.includes(k));
  if (!fields.length) { res.status(400).json({ error: 'Nenhum campo válido para atualizar' }); return; }

  try {
    const [existing] = await pool.execute<any[]>(
      'SELECT id FROM products WHERE id = ? AND academy_id = ?',
      [req.params.id, academyId]
    );
    if (!existing[0]) { res.status(404).json({ error: 'Produto não encontrado' }); return; }

    const set    = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => req.body[f] ?? null);

    await pool.execute(
      `UPDATE products SET ${set} WHERE id = ? AND academy_id = ?`,
      [...values, req.params.id, academyId]
    );
    const [rows] = await pool.execute<any[]>('SELECT * FROM products WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    throw err;
  }
});

// DELETE /api/products/:id
router.delete('/:id', requireAuth, requireRole('admin', 'superuser'), async (req: Request, res: Response): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  try {
    const [rows] = await pool.execute<any[]>(
      'SELECT id FROM products WHERE id = ? AND academy_id = ?',
      [req.params.id, academyId]
    );
    if (!rows[0]) { res.status(404).json({ error: 'Produto não encontrado' }); return; }

    await pool.execute('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ message: 'Produto removido' });
  } catch (err) {
    throw err;
  }
});

export default router;
