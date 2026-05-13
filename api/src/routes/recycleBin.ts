import { Router, Request, Response } from 'express';
import pool from '../db';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { getAcademyId } from '../utils/academyScope';

const router = Router();

// GET /api/recycle-bin
router.get('/', requireAuth, requireRole('admin', 'superuser'), async (req: Request, res: Response): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  const { type } = req.query;
  let where = 'WHERE academy_id = ?';
  const params: any[] = [academyId];
  if (type) { where += ' AND type = ?'; params.push(type); }

  try {
    const [rows] = await pool.execute<any[]>(
      `SELECT id, academy_id, type, deleted_at, JSON_UNQUOTE(JSON_EXTRACT(original_data, '$.name')) AS name
       FROM recycle_bin ${where} ORDER BY deleted_at DESC`,
      params
    );
    res.json({ data: rows, total: (rows as any[]).length });
  } catch (err) {
    throw err;
  }
});

// POST /api/recycle-bin/:id/restore — restaurar item
router.post('/:id/restore', requireAuth, requireRole('admin', 'superuser'), async (req: Request, res: Response): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  try {
    const [binRows] = await pool.execute<any[]>(
      'SELECT * FROM recycle_bin WHERE id = ? AND academy_id = ?',
      [req.params.id, academyId]
    );
    if (!binRows[0]) { res.status(404).json({ error: 'Item não encontrado na lixeira' }); return; }

    const item = binRows[0] as any;
    const data = JSON.parse(item.original_data);

    if (item.type === 'student') {
      const { documents, graduationHistory, ...student } = data;

      const [conflictRows] = await pool.execute<any[]>(
        'SELECT id FROM students WHERE id = ?',
        [student.id]
      );
      if ((conflictRows as any[]).length) {
        res.status(409).json({ error: 'Já existe um aluno com esse ID (possível duplicata)' });
        return;
      }

      await pool.execute(
        `INSERT INTO students (
          id, academy_id, user_id, name, email, phone, belt, stripes, birth_date, gender, photo,
          cpf, rg, weight, height, blood_type, emergency_contact, emergency_phone,
          cep, address, address_number, guardian_name, guardian_phone, guardian_email,
          guardian_cpf, guardian_rg, guardian_relation, guardian_profession,
          medical_notes, total_classes, total_hours, last_attendance, absent_count,
          status, join_date, last_graduation_date, plan_id, next_payment_date, absence_limit
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          student.id, student.academy_id, student.user_id ?? null, student.name, student.email ?? null,
          student.phone ?? null, student.belt ?? 'Branca', student.stripes ?? 0,
          student.birth_date ?? null, student.gender ?? null, student.photo ?? null,
          student.cpf ?? null, student.rg ?? null, student.weight ?? null, student.height ?? null,
          student.blood_type ?? null, student.emergency_contact ?? null, student.emergency_phone ?? null,
          student.cep ?? null, student.address ?? null, student.address_number ?? null,
          student.guardian_name ?? null, student.guardian_phone ?? null, student.guardian_email ?? null,
          student.guardian_cpf ?? null, student.guardian_rg ?? null, student.guardian_relation ?? null,
          student.guardian_profession ?? null, student.medical_notes ?? null,
          student.total_classes ?? 0, student.total_hours ?? 0,
          student.last_attendance ?? null, student.absent_count ?? 0,
          student.status ?? 'Active', student.join_date ?? null, student.last_graduation_date ?? null,
          student.plan_id ?? null, student.next_payment_date ?? null, student.absence_limit ?? null,
        ]
      );

      if (Array.isArray(documents) && documents.length) {
        for (const doc of documents) {
          await pool.execute(
            'INSERT INTO student_documents (id, student_id, name, url) VALUES (?,?,?,?)',
            [doc.id ?? crypto.randomUUID(), student.id, doc.name ?? null, doc.url ?? null]
          );
        }
      }

      if (Array.isArray(graduationHistory) && graduationHistory.length) {
        for (const gh of graduationHistory) {
          await pool.execute(
            `INSERT INTO graduation_history
               (id, student_id, previous_belt, new_belt, previous_stripes, new_stripes, date, instructor_id, notes)
             VALUES (?,?,?,?,?,?,?,?,?)`,
            [
              gh.id ?? crypto.randomUUID(), student.id,
              gh.previous_belt ?? null, gh.new_belt ?? null,
              gh.previous_stripes ?? null, gh.new_stripes ?? null,
              gh.date ?? null, gh.instructor_id ?? null, gh.notes ?? null,
            ]
          );
        }
      }

    } else if (item.type === 'instructor') {
      const [conflictRows] = await pool.execute<any[]>(
        'SELECT id FROM instructors WHERE id = ?',
        [data.id]
      );
      if ((conflictRows as any[]).length) {
        res.status(409).json({ error: 'Já existe um instrutor com esse ID (possível duplicata)' });
        return;
      }

      await pool.execute(
        `INSERT INTO instructors (
          id, academy_id, user_id, name, email, phone, belt, stripes, birth_date, gender, photo,
          cpf, rg, weight, height, blood_type, marital_status, emergency_contact, emergency_phone,
          cep, address, address_number, specialties, medical_notes, status, join_date
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          data.id, data.academy_id, data.user_id ?? null, data.name, data.email ?? null,
          data.phone ?? null, data.belt ?? 'Branca', data.stripes ?? 0,
          data.birth_date ?? null, data.gender ?? null, data.photo ?? null,
          data.cpf ?? null, data.rg ?? null, data.weight ?? null, data.height ?? null,
          data.blood_type ?? null, data.marital_status ?? null,
          data.emergency_contact ?? null, data.emergency_phone ?? null,
          data.cep ?? null, data.address ?? null, data.address_number ?? null,
          data.specialties ?? null, data.medical_notes ?? null,
          data.status ?? 'Active', data.join_date ?? null,
        ]
      );

    } else if (item.type === 'template') {
      const { schedules, assignedStudentIds, ...template } = data;

      const [conflictRows] = await pool.execute<any[]>(
        'SELECT id FROM class_templates WHERE id = ?',
        [template.id]
      );
      if ((conflictRows as any[]).length) {
        res.status(409).json({ error: 'Já existe um template com esse ID (possível duplicata)' });
        return;
      }

      await pool.execute(
        'INSERT INTO class_templates (id, academy_id, name, duration_minutes, absence_limit) VALUES (?,?,?,?,?)',
        [template.id, template.academy_id, template.name, template.duration_minutes, template.absence_limit ?? null]
      );

      if (Array.isArray(schedules) && schedules.length) {
        for (const s of schedules) {
          await pool.execute(
            'INSERT INTO class_template_schedules (id, template_id, day_of_week, start_time, end_time) VALUES (?,?,?,?,?)',
            [s.id ?? crypto.randomUUID(), template.id, s.day_of_week, s.start_time, s.end_time]
          );
        }
      }

      if (Array.isArray(assignedStudentIds) && assignedStudentIds.length) {
        for (const sid of assignedStudentIds) {
          const [studentExists] = await pool.execute<any[]>('SELECT id FROM students WHERE id = ?', [sid]);
          if ((studentExists as any[]).length) {
            await pool.execute(
              'INSERT IGNORE INTO class_template_assigned_students (template_id, student_id) VALUES (?,?)',
              [template.id, sid]
            );
          }
        }
      }

    } else if (item.type === 'staff') {
      const [conflictRows] = await pool.execute<any[]>(
        'SELECT id FROM staff WHERE id = ?',
        [data.id]
      );
      if ((conflictRows as any[]).length) {
        res.status(409).json({ error: 'Já existe um colaborador com esse ID (possível duplicata)' });
        return;
      }

      await pool.execute(
        `INSERT INTO staff (
          id, academy_id, user_id, name, email, phone, photo, birth_date, gender, position,
          cpf, rg, cep, address, address_number, medical_notes, status, join_date
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          data.id, data.academy_id, data.user_id ?? null,
          data.name, data.email ?? null, data.phone ?? null, data.photo ?? null,
          data.birth_date ?? null, data.gender ?? null, data.position ?? null,
          data.cpf ?? null, data.rg ?? null,
          data.cep ?? null, data.address ?? null, data.address_number ?? null,
          data.medical_notes ?? null, data.status ?? 'Active', data.join_date ?? null,
        ]
      );

    } else {
      res.status(400).json({ error: `Tipo de item desconhecido: ${item.type}` });
      return;
    }

    await pool.execute('DELETE FROM recycle_bin WHERE id = ?', [req.params.id]);
    res.json({ message: 'Item restaurado com sucesso' });
  } catch (err) {
    throw err;
  }
});

// DELETE /api/recycle-bin/:id — excluir permanentemente
router.delete('/:id', requireAuth, requireRole('admin', 'superuser'), async (req: Request, res: Response): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  try {
    const [rows] = await pool.execute<any[]>(
      'SELECT id FROM recycle_bin WHERE id = ? AND academy_id = ?',
      [req.params.id, academyId]
    );
    if (!rows[0]) { res.status(404).json({ error: 'Item não encontrado na lixeira' }); return; }

    await pool.execute('DELETE FROM recycle_bin WHERE id = ?', [req.params.id]);
    res.json({ message: 'Item excluído permanentemente' });
  } catch (err) {
    throw err;
  }
});

export default router;
