import { Router, Request, Response, NextFunction } from 'express';
import pool from '../db';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { getAcademyId } from '../utils/academyScope';
import { validate } from '../utils/validate';
import { withTransaction } from '../utils/withTransaction';

const router = Router();

// GET /api/attendance
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  const { classId, studentId, dateFrom, dateTo, page = '1', limit = '20' } = req.query;
  const pageNum  = Math.max(1, parseInt(String(page), 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10)));
  const offset   = (pageNum - 1) * limitNum;

  let where = 'WHERE ar.academy_id = ?';
  const params: any[] = [academyId];

  if (classId)   { where += ' AND ar.class_id = ?';    params.push(classId); }
  if (studentId) { where += ' AND ar.student_id = ?';  params.push(studentId); }
  if (dateFrom)  { where += ' AND ar.date >= ?';       params.push(dateFrom); }
  if (dateTo)    { where += ' AND ar.date <= ?';       params.push(dateTo); }

  try {
    const [countRows] = await pool.execute<any[]>(
      `SELECT COUNT(*) as total FROM attendance_records ar ${where}`,
      params
    );
    const total = (countRows[0] as any).total;

    // JOIN student para retornar o nome junto
    const [rows] = await pool.execute<any[]>(
      `SELECT ar.*, s.name AS student_name
       FROM attendance_records ar
       LEFT JOIN students s ON s.id = ar.student_id
       ${where}
       ORDER BY ar.date DESC, ar.created_at DESC
       LIMIT ${limitNum} OFFSET ${offset}`,
      params
    );

    res.json({ data: rows, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) });
  } catch (err) {
    next(err);
  }
});

// POST /api/attendance
router.post('/', requireAuth, requireRole('admin', 'superuser', 'instructor'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  const errors = validate(req.body, {
    student_id: { required: true, type: 'string' },
    date:       { required: true, type: 'date' },
  });
  if (errors.length) { res.status(400).json({ error: errors[0] }); return; }

  const { student_id, class_id, date, duration_minutes } = req.body;

  try {
    // Verifica se o aluno pertence à academia
    const [studentRows] = await pool.execute<any[]>(
      'SELECT id FROM students WHERE id = ? AND academy_id = ?',
      [student_id, academyId]
    );
    if (!studentRows[0]) { res.status(404).json({ error: 'Aluno não encontrado' }); return; }

    const record = await withTransaction(async (conn) => {
      const id = crypto.randomUUID();

      await conn.execute(
        `INSERT INTO attendance_records (id, academy_id, student_id, class_id, date, duration_minutes)
         VALUES (?,?,?,?,?,?)`,
        [id, academyId, student_id, class_id ?? null, date, duration_minutes ?? null]
      );

      // Atualiza contadores do aluno atomicamente
      const hoursToAdd = duration_minutes ? Math.round(Number(duration_minutes) / 60) : 0;
      await conn.execute(
        `UPDATE students
         SET total_classes  = total_classes + 1,
             total_hours    = total_hours + ?,
             last_attendance = GREATEST(COALESCE(last_attendance, ?), ?)
         WHERE id = ?`,
        [hoursToAdd, date, date, student_id]
      );

      const [rows] = await conn.execute<any[]>('SELECT * FROM attendance_records WHERE id = ?', [id]);
      return rows[0];
    });

    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
});

export default router;
