import { Router, Request, Response } from 'express';
import pool from '../db';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { getAcademyId } from '../utils/academyScope';
import { validate } from '../utils/validate';
import { withTransaction } from '../utils/withTransaction';

const router = Router();

async function attachRelations(templates: any[]): Promise<void> {
  for (const tpl of templates) {
    const [schedules] = await pool.execute<any[]>(
      'SELECT * FROM class_template_schedules WHERE template_id = ? ORDER BY day_of_week, start_time',
      [tpl.id]
    );
    const [assigned] = await pool.execute<any[]>(
      'SELECT student_id FROM class_template_assigned_students WHERE template_id = ?',
      [tpl.id]
    );
    tpl.schedules = schedules;
    tpl.assignedStudentIds = (assigned as any[]).map(r => r.student_id);
  }
}

// GET /api/templates
router.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  try {
    const [templates] = await pool.execute<any[]>(
      'SELECT * FROM class_templates WHERE academy_id = ? ORDER BY name ASC',
      [academyId]
    );
    await attachRelations(templates as any[]);
    res.json({ data: templates, total: (templates as any[]).length });
  } catch (err) {
    throw err;
  }
});

// POST /api/templates
router.post('/', requireAuth, requireRole('admin', 'superuser'), async (req: Request, res: Response): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  const errors = validate(req.body, {
    name:             { required: true, type: 'string', maxLength: 255 },
    duration_minutes: { required: true, type: 'number', min: 1 },
  });
  if (errors.length) { res.status(400).json({ error: errors[0] }); return; }

  const { name, duration_minutes, absence_limit, schedules = [], assignedStudentIds = [] } = req.body;

  try {
    const result = await withTransaction(async (conn) => {
      const id = crypto.randomUUID();

      await conn.execute(
        'INSERT INTO class_templates (id, academy_id, name, duration_minutes, absence_limit) VALUES (?,?,?,?,?)',
        [id, academyId, name, duration_minutes, absence_limit ?? null]
      );

      for (const s of schedules) {
        await conn.execute(
          'INSERT INTO class_template_schedules (id, template_id, day_of_week, start_time, end_time) VALUES (?,?,?,?,?)',
          [crypto.randomUUID(), id, s.day_of_week, s.start_time, s.end_time]
        );
      }

      for (const studentId of assignedStudentIds) {
        await conn.execute(
          'INSERT INTO class_template_assigned_students (template_id, student_id) VALUES (?,?)',
          [id, studentId]
        );
      }

      const [rows] = await conn.execute<any[]>('SELECT * FROM class_templates WHERE id = ?', [id]);
      const [schRows] = await conn.execute<any[]>(
        'SELECT * FROM class_template_schedules WHERE template_id = ? ORDER BY day_of_week, start_time',
        [id]
      );
      return { ...rows[0], schedules: schRows, assignedStudentIds };
    });

    res.status(201).json(result);
  } catch (err) {
    throw err;
  }
});

// PUT /api/templates/:id
router.put('/:id', requireAuth, requireRole('admin', 'superuser'), async (req: Request, res: Response): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  const errors = validate(req.body, {
    name:             { type: 'string', maxLength: 255 },
    duration_minutes: { type: 'number', min: 1 },
  });
  if (errors.length) { res.status(400).json({ error: errors[0] }); return; }

  try {
    const [existing] = await pool.execute<any[]>(
      'SELECT id FROM class_templates WHERE id = ? AND academy_id = ?',
      [req.params.id, academyId]
    );
    if (!existing[0]) { res.status(404).json({ error: 'Template não encontrado' }); return; }

    const result = await withTransaction(async (conn) => {
      const TEMPLATE_FIELDS = ['name', 'duration_minutes', 'absence_limit'];
      const fields = Object.keys(req.body).filter(k => TEMPLATE_FIELDS.includes(k));
      if (fields.length) {
        const set = fields.map(f => `${f} = ?`).join(', ');
        const values = fields.map(f => req.body[f] ?? null);
        await conn.execute(
          `UPDATE class_templates SET ${set} WHERE id = ?`,
          [...values, req.params.id]
        );
      }

      if (Array.isArray(req.body.schedules)) {
        await conn.execute('DELETE FROM class_template_schedules WHERE template_id = ?', [req.params.id]);
        for (const s of req.body.schedules) {
          await conn.execute(
            'INSERT INTO class_template_schedules (id, template_id, day_of_week, start_time, end_time) VALUES (?,?,?,?,?)',
            [crypto.randomUUID(), req.params.id, s.day_of_week, s.start_time, s.end_time]
          );
        }
      }

      if (Array.isArray(req.body.assignedStudentIds)) {
        await conn.execute('DELETE FROM class_template_assigned_students WHERE template_id = ?', [req.params.id]);
        for (const studentId of req.body.assignedStudentIds) {
          await conn.execute(
            'INSERT INTO class_template_assigned_students (template_id, student_id) VALUES (?,?)',
            [req.params.id, studentId]
          );
        }
      }

      const [rows] = await conn.execute<any[]>('SELECT * FROM class_templates WHERE id = ?', [req.params.id]);
      const [schRows] = await conn.execute<any[]>(
        'SELECT * FROM class_template_schedules WHERE template_id = ? ORDER BY day_of_week, start_time',
        [req.params.id]
      );
      const [asgRows] = await conn.execute<any[]>(
        'SELECT student_id FROM class_template_assigned_students WHERE template_id = ?',
        [req.params.id]
      );
      return { ...rows[0], schedules: schRows, assignedStudentIds: (asgRows as any[]).map(r => r.student_id) };
    });

    res.json(result);
  } catch (err) {
    throw err;
  }
});

// DELETE /api/templates/:id — move para lixeira
router.delete('/:id', requireAuth, requireRole('admin', 'superuser'), async (req: Request, res: Response): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  try {
    const [rows] = await pool.execute<any[]>(
      'SELECT * FROM class_templates WHERE id = ? AND academy_id = ?',
      [req.params.id, academyId]
    );
    if (!rows[0]) { res.status(404).json({ error: 'Template não encontrado' }); return; }

    const [schedules] = await pool.execute<any[]>(
      'SELECT * FROM class_template_schedules WHERE template_id = ?',
      [req.params.id]
    );
    const [assigned] = await pool.execute<any[]>(
      'SELECT student_id FROM class_template_assigned_students WHERE template_id = ?',
      [req.params.id]
    );

    const originalData = JSON.stringify({
      ...rows[0],
      schedules,
      assignedStudentIds: (assigned as any[]).map(r => r.student_id),
    });

    await pool.execute(
      'INSERT INTO recycle_bin (id, academy_id, type, original_data) VALUES (?,?,?,?)',
      [crypto.randomUUID(), academyId, 'template', originalData]
    );

    // FK CASCADE apaga schedules e assigned_students automaticamente
    await pool.execute('DELETE FROM class_templates WHERE id = ?', [req.params.id]);
    res.json({ message: 'Template movido para a lixeira' });
  } catch (err) {
    throw err;
  }
});

export default router;
