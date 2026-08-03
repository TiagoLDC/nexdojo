import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import pool from '../db';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { getAcademyId } from '../utils/academyScope';
import { validate } from '../utils/validate';
import { withTransaction } from '../utils/withTransaction';
import { getTodayBrasilia } from '../utils/date';

const router = Router();

const PERSON_TABLE: Record<string, string> = {
  student: 'students',
  instructor: 'instructors',
};

// GET /api/kimono-loans?status=active|all
router.get('/', requireAuth, requireRole('superuser', 'admin', 'instructor', 'staff'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  const status = req.query.status === 'all' ? 'all' : 'active';

  try {
    const [rows] = await pool.execute<any[]>(
      `SELECT kl.*,
              CASE WHEN kl.person_type = 'student' THEN s.name ELSE i.name END AS person_name,
              CASE WHEN kl.person_type = 'student' THEN s.photo ELSE i.photo END AS person_photo,
              CASE WHEN kl.person_type = 'student' THEN s.belt ELSE i.belt END AS person_belt,
              CASE WHEN kl.person_type = 'student' THEN s.stripes ELSE i.stripes END AS person_stripes
         FROM kimono_loans kl
         LEFT JOIN students s ON kl.person_type = 'student' AND kl.person_id = s.id
         LEFT JOIN instructors i ON kl.person_type = 'instructor' AND kl.person_id = i.id
        WHERE kl.academy_id = ? ${status === 'active' ? 'AND kl.returned_at IS NULL' : ''}
        ORDER BY kl.borrowed_at DESC`,
      [academyId]
    );
    res.json({ data: rows, total: (rows as any[]).length });
  } catch (err) {
    next(err);
  }
});

// POST /api/kimono-loans — empresta um kimono a um aluno ou instrutor
router.post('/', requireAuth, requireRole('superuser', 'admin', 'instructor', 'staff'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  const errors = validate(req.body, {
    person_type: { required: true, enum: ['student', 'instructor'] },
    person_id:   { required: true, type: 'string' },
  });
  if (errors.length) { res.status(400).json({ error: errors[0] }); return; }

  const { person_type, person_id } = req.body;
  const table = PERSON_TABLE[person_type];

  try {
    const [personRows] = await pool.execute<any[]>(
      `SELECT id, has_loaned_kimono FROM ${table} WHERE id = ? AND academy_id = ?`,
      [person_id, academyId]
    );
    if (!personRows[0]) { res.status(404).json({ error: person_type === 'student' ? 'Aluno não encontrado' : 'Instrutor não encontrado' }); return; }
    if (personRows[0].has_loaned_kimono) { res.status(409).json({ error: 'Já existe um kimono emprestado para esta pessoa' }); return; }

    const loanId = crypto.randomUUID();
    const today = getTodayBrasilia();

    await withTransaction(async (conn) => {
      await conn.execute(
        `INSERT INTO kimono_loans (id, academy_id, person_type, person_id, borrowed_at) VALUES (?,?,?,?,?)`,
        [loanId, academyId, person_type, person_id, today]
      );
      await conn.execute(
        `UPDATE ${table} SET has_loaned_kimono = 1, kimono_loan_date = ? WHERE id = ?`,
        [today, person_id]
      );
    });

    const [rows] = await pool.execute<any[]>('SELECT * FROM kimono_loans WHERE id = ?', [loanId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /api/kimono-loans/return — devolve o kimono ativo de um aluno ou instrutor
router.post('/return', requireAuth, requireRole('superuser', 'admin', 'instructor', 'staff'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  const errors = validate(req.body, {
    person_type: { required: true, enum: ['student', 'instructor'] },
    person_id:   { required: true, type: 'string' },
  });
  if (errors.length) { res.status(400).json({ error: errors[0] }); return; }

  const { person_type, person_id } = req.body;
  const table = PERSON_TABLE[person_type];

  try {
    const [loanRows] = await pool.execute<any[]>(
      `SELECT id FROM kimono_loans WHERE academy_id = ? AND person_type = ? AND person_id = ? AND returned_at IS NULL
        ORDER BY borrowed_at DESC LIMIT 1`,
      [academyId, person_type, person_id]
    );
    if (!loanRows[0]) { res.status(404).json({ error: 'Nenhum empréstimo ativo encontrado para esta pessoa' }); return; }

    const today = getTodayBrasilia();

    await withTransaction(async (conn) => {
      await conn.execute(`UPDATE kimono_loans SET returned_at = ? WHERE id = ?`, [today, loanRows[0].id]);
      await conn.execute(
        `UPDATE ${table} SET has_loaned_kimono = 0, kimono_loan_date = NULL WHERE id = ? AND academy_id = ?`,
        [person_id, academyId]
      );
    });

    const [rows] = await pool.execute<any[]>('SELECT * FROM kimono_loans WHERE id = ?', [loanRows[0].id]);
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
