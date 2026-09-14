import { Router, Request, Response, NextFunction } from 'express';
import pool from '../db';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { getAcademyId } from '../utils/academyScope';
import { validate } from '../utils/validate';
import { withTransaction } from '../utils/withTransaction';
import { isGuardianOfStudent, getGuardianStudentIds } from '../utils/guardianAccess';
import { getTodayBrasilia } from '../utils/date';
import { logAudit } from '../utils/auditLog';

const router = Router();

/** Janela em que o aluno ainda pode justificar uma falta. Além disso o professor já fechou o mês. */
const MAX_DAYS_BACK = 60;

const REVIEWER_ROLES = ['admin', 'superuser', 'instructor', 'staff'];

/**
 * Fichas de aluno que a conta logada pode representar: a própria (users.id → students.user_id)
 * mais as dos dependentes vinculados em guardianships. Um responsável "puro" não tem ficha
 * própria e só aparece pela segunda metade.
 */
async function getOwnStudentIds(userId: string, academyId: string): Promise<string[]> {
  const [rows] = await pool.execute<any[]>(
    'SELECT id FROM students WHERE user_id = ? AND academy_id = ?',
    [userId, academyId]
  );
  const ids = rows.map((r: any) => r.id);
  const dependents = await getGuardianStudentIds(userId);
  for (const id of dependents) {
    if (!ids.includes(id)) ids.push(id);
  }
  return ids;
}

/**
 * Duração (em minutos) da aula do dia, pelo horário do plano do aluno.
 * Sem plano ou sem horário cadastrado naquele dia da semana, cai no padrão de 60 min —
 * mesmo fallback usado pela presença retroativa em POST /api/attendance.
 */
async function resolveClassDuration(
  planId: string | null,
  academyId: string,
  date: string
): Promise<{ durationMinutes: number; scheduleId: string | null; planId: string | null }> {
  if (!planId) return { durationMinutes: 60, scheduleId: null, planId: null };

  const [planRows] = await pool.execute<any[]>(
    'SELECT id FROM academy_plans WHERE id = ? AND academy_id = ?',
    [planId, academyId]
  );
  if (!planRows[0]) return { durationMinutes: 60, scheduleId: null, planId: null };

  const dow = new Date(`${date}T12:00:00Z`).getUTCDay();
  const [scheduleRows] = await pool.execute<any[]>(
    'SELECT id, start_time, end_time FROM academy_plan_schedules WHERE plan_id = ? AND day_of_week = ?',
    [planId, dow]
  );
  if (!scheduleRows[0]) return { durationMinutes: 60, scheduleId: null, planId };

  const s = scheduleRows[0] as any;
  const [sh, sm] = s.start_time.split(':').map(Number);
  const [eh, em] = s.end_time.split(':').map(Number);
  const duration = (eh * 60 + em) - (sh * 60 + sm);
  return { durationMinutes: duration > 0 ? duration : 60, scheduleId: s.id, planId };
}

/** Cria a presença da falta aceita e soma os contadores do aluno. Roda dentro da transação da revisão. */
async function grantAttendance(
  conn: any,
  justification: any,
  academyId: string
): Promise<string | null> {
  // Se por algum motivo já existe presença naquele dia (o professor marcou na mão entre o envio
  // e a análise), não duplica nem soma contador de novo — a justificativa só confirma o que já há.
  const [existing] = await conn.execute(
    'SELECT id FROM attendance_records WHERE student_id = ? AND academy_id = ? AND date = ? AND class_id IS NULL',
    [justification.student_id, academyId, justification.date_str]
  );
  if ((existing as any[])[0]) return null;

  const [studentRows] = await conn.execute(
    'SELECT plan_id FROM students WHERE id = ?',
    [justification.student_id]
  );
  const planId = (studentRows as any[])[0]?.plan_id ?? null;
  const { durationMinutes, scheduleId, planId: matchedPlanId } =
    await resolveClassDuration(planId, academyId, justification.date_str);

  const attendanceId = crypto.randomUUID();
  await conn.execute(
    `INSERT INTO attendance_records
       (id, academy_id, student_id, class_id, date, duration_minutes,
        check_in_time, matched_plan_id, matched_schedule_id, justified)
     VALUES (?,?,?,NULL,?,?,NULL,?,?,1)`,
    [attendanceId, academyId, justification.student_id, justification.date_str,
     durationMinutes, matchedPlanId, scheduleId]
  );

  const hoursToAdd = Math.round(durationMinutes / 60);
  await conn.execute(
    `UPDATE students
     SET total_classes              = total_classes + 1,
         total_hours                = total_hours + ?,
         classes_since_graduation   = classes_since_graduation + 1,
         hours_since_graduation     = hours_since_graduation + ?,
         last_attendance            = GREATEST(COALESCE(last_attendance, ?), ?)
     WHERE id = ?`,
    [hoursToAdd, hoursToAdd, justification.date_str, justification.date_str, justification.student_id]
  );

  return attendanceId;
}

/** Desfaz a presença concedida por uma justificativa (quando o professor reverte a aprovação). */
async function revokeAttendance(conn: any, attendanceId: string): Promise<void> {
  const [rows] = await conn.execute(
    'SELECT student_id, duration_minutes FROM attendance_records WHERE id = ?',
    [attendanceId]
  );
  const record = (rows as any[])[0];
  if (!record) return;

  const hoursToRemove = Math.round((record.duration_minutes || 0) / 60);
  await conn.execute(
    `UPDATE students
     SET total_classes            = GREATEST(0, total_classes - 1),
         total_hours              = GREATEST(0, total_hours - ?),
         classes_since_graduation = GREATEST(0, classes_since_graduation - 1),
         hours_since_graduation   = GREATEST(0, hours_since_graduation - ?)
     WHERE id = ?`,
    [hoursToRemove, hoursToRemove, record.student_id]
  );
  await conn.execute('DELETE FROM attendance_records WHERE id = ?', [attendanceId]);
}

const SELECT_WITH_JOINS = `
  SELECT j.id, j.academy_id, j.student_id, DATE_FORMAT(j.date, '%Y-%m-%d') AS date,
         j.reason, j.status, j.review_note, j.reviewed_at, j.attendance_record_id, j.created_at,
         s.name AS student_name, s.belt, s.stripes,
         reviewer.name AS reviewed_by_name,
         author.name AS created_by_name
  FROM absence_justifications j
  LEFT JOIN students s ON s.id = j.student_id
  LEFT JOIN users reviewer ON reviewer.id = j.reviewed_by
  LEFT JOIN users author ON author.id = j.created_by
`;

// GET /api/absence-justifications
// Professor/admin enxerga a academia inteira; aluno e responsável, só as próprias fichas.
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  const { userId, role } = req.user!;
  const { status, studentId, dateFrom, dateTo, page = '1', limit = '50' } = req.query;
  const pageNum = Math.max(1, parseInt(String(page), 10));
  const limitNum = Math.min(200, Math.max(1, parseInt(String(limit), 10)));
  const offset = (pageNum - 1) * limitNum;

  let where = 'WHERE j.academy_id = ?';
  const params: any[] = [academyId];

  try {
    if (!REVIEWER_ROLES.includes(role)) {
      // Aluno/responsável só enxerga as fichas que representa — o studentId da query é ignorado
      const ownIds = await getOwnStudentIds(userId, academyId);
      if (ownIds.length === 0) {
        res.json({ data: [], total: 0, page: pageNum, limit: limitNum, totalPages: 0 });
        return;
      }
      where += ` AND j.student_id IN (${ownIds.map(() => '?').join(',')})`;
      params.push(...ownIds);
    } else if (studentId) {
      where += ' AND j.student_id = ?';
      params.push(studentId);
    }

    if (status)   { where += ' AND j.status = ?';  params.push(status); }
    if (dateFrom) { where += ' AND j.date >= ?';   params.push(dateFrom); }
    if (dateTo)   { where += ' AND j.date <= ?';   params.push(dateTo); }

    const [countRows] = await pool.execute<any[]>(
      `SELECT COUNT(*) AS total FROM absence_justifications j ${where}`,
      params
    );
    const total = (countRows[0] as any).total;

    const [rows] = await pool.execute<any[]>(
      // Pendentes primeiro: é a fila de trabalho do professor, e para o aluno é o que está em aberto
      `${SELECT_WITH_JOINS} ${where}
       ORDER BY (j.status = 'Pending') DESC, j.date DESC, j.created_at DESC
       LIMIT ${limitNum} OFFSET ${offset}`,
      params
    );

    res.json({ data: rows, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) });
  } catch (err) {
    next(err);
  }
});

// GET /api/absence-justifications/pending-count — usado para o contador da fila do professor
router.get('/pending-count', requireAuth, requireRole(...REVIEWER_ROLES), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  try {
    const [rows] = await pool.execute<any[]>(
      `SELECT COUNT(*) AS total FROM absence_justifications WHERE academy_id = ? AND status = 'Pending'`,
      [academyId]
    );
    res.json({ count: (rows[0] as any).total });
  } catch (err) {
    next(err);
  }
});

// POST /api/absence-justifications — aluno (ou responsável pelo dependente) envia a justificativa
router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  const { userId } = req.user!;
  const errors = validate(req.body, {
    date:   { required: true, type: 'date' },
    reason: { required: true, type: 'string', maxLength: 1000 },
  });
  if (errors.length) { res.status(400).json({ error: errors[0] }); return; }

  const date = String(req.body.date);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: 'Data inválida. Use o formato AAAA-MM-DD.' });
    return;
  }

  const reason = String(req.body.reason).trim();
  if (!reason) { res.status(400).json({ error: 'Descreva o motivo da falta.' }); return; }

  const today = getTodayBrasilia();
  if (date > today) {
    res.status(400).json({ error: 'Não é possível justificar uma falta em data futura.' });
    return;
  }

  const limitDate = new Date(`${today}T12:00:00Z`);
  limitDate.setUTCDate(limitDate.getUTCDate() - MAX_DAYS_BACK);
  const oldestAllowed = limitDate.toISOString().slice(0, 10);
  if (date < oldestAllowed) {
    res.status(400).json({ error: `Só é possível justificar faltas dos últimos ${MAX_DAYS_BACK} dias.` });
    return;
  }

  try {
    // Aluno alvo: o informado pelo front (responsável gerenciando um dependente) ou a ficha
    // da própria conta logada. Em ambos os casos a permissão é conferida abaixo.
    const requestedStudentId = typeof req.body.student_id === 'string' ? req.body.student_id : null;
    let student: any;

    if (requestedStudentId) {
      const [rows] = await pool.execute<any[]>(
        'SELECT id, user_id, name, status FROM students WHERE id = ? AND academy_id = ?',
        [requestedStudentId, academyId]
      );
      student = rows[0];
      if (!student) { res.status(404).json({ error: 'Aluno não encontrado nesta academia.' }); return; }
      if (student.user_id !== userId && !(await isGuardianOfStudent(userId, student.id))) {
        res.status(403).json({ error: 'Você não tem permissão para justificar faltas deste aluno.' });
        return;
      }
    } else {
      const [rows] = await pool.execute<any[]>(
        'SELECT id, user_id, name, status FROM students WHERE user_id = ? AND academy_id = ?',
        [userId, academyId]
      );
      student = rows[0];
      if (!student) {
        res.status(404).json({ error: 'Perfil de aluno não encontrado. Entre em contato com a academia.' });
        return;
      }
    }

    if (student.status !== 'Active') {
      res.status(400).json({ error: 'Apenas alunos com status Ativo podem enviar justificativas.' });
      return;
    }

    // Presença já registrada naquele dia: não há falta a justificar
    const [attendanceRows] = await pool.execute<any[]>(
      'SELECT id FROM attendance_records WHERE student_id = ? AND academy_id = ? AND date = ?',
      [student.id, academyId, date]
    );
    if (attendanceRows.length > 0) {
      res.status(400).json({ error: 'Já existe presença registrada nesta data — não há falta a justificar.' });
      return;
    }

    const [duplicateRows] = await pool.execute<any[]>(
      'SELECT id, status FROM absence_justifications WHERE student_id = ? AND date = ?',
      [student.id, date]
    );
    if (duplicateRows.length > 0) {
      const current = duplicateRows[0] as any;
      const label = current.status === 'Pending'
        ? 'aguardando análise'
        : current.status === 'Approved' ? 'já aceita' : 'já recusada';
      res.status(400).json({ error: `Já existe uma justificativa ${label} para esta data.` });
      return;
    }

    const id = crypto.randomUUID();
    await pool.execute(
      `INSERT INTO absence_justifications (id, academy_id, student_id, date, reason, status, created_by)
       VALUES (?,?,?,?,?,'Pending',?)`,
      [id, academyId, student.id, date, reason, userId]
    );

    const [created] = await pool.execute<any[]>(`${SELECT_WITH_JOINS} WHERE j.id = ?`, [id]);
    res.status(201).json(created[0]);
  } catch (err: any) {
    if (err?.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: 'Já existe uma justificativa para esta data.' });
      return;
    }
    next(err);
  }
});

// PATCH /api/absence-justifications/:id/review — professor/admin aceita ou recusa
router.patch('/:id/review', requireAuth, requireRole(...REVIEWER_ROLES), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  const { userId } = req.user!;
  const status = String(req.body.status ?? '');
  if (status !== 'Approved' && status !== 'Rejected') {
    res.status(400).json({ error: 'Status inválido. Use Approved ou Rejected.' });
    return;
  }
  const reviewNote = typeof req.body.review_note === 'string'
    ? req.body.review_note.trim().slice(0, 500)
    : null;

  try {
    const [rows] = await pool.execute<any[]>(
      `SELECT id, student_id, DATE_FORMAT(date, '%Y-%m-%d') AS date_str, status, attendance_record_id
       FROM absence_justifications WHERE id = ? AND academy_id = ?`,
      [req.params.id, academyId]
    );
    const justification = rows[0];
    if (!justification) { res.status(404).json({ error: 'Justificativa não encontrada.' }); return; }

    if (justification.status === status) {
      res.status(400).json({ error: `Esta justificativa já está marcada como ${status === 'Approved' ? 'aceita' : 'recusada'}.` });
      return;
    }

    const attendanceId = await withTransaction(async (conn) => {
      let newAttendanceId: string | null = justification.attendance_record_id ?? null;

      if (status === 'Approved') {
        newAttendanceId = await grantAttendance(conn, justification, academyId);
      } else if (justification.attendance_record_id) {
        // Reversão de uma aprovação anterior: a presença concedida some junto com os contadores
        await revokeAttendance(conn, justification.attendance_record_id);
        newAttendanceId = null;
      }

      await conn.execute(
        `UPDATE absence_justifications
         SET status = ?, review_note = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP,
             attendance_record_id = ?
         WHERE id = ?`,
        [status, reviewNote, userId, newAttendanceId, justification.id]
      );

      return newAttendanceId;
    });

    await logAudit(req, {
      action: status === 'Approved' ? 'absence_justification.approve' : 'absence_justification.reject',
      entityType: 'absence_justification',
      entityId: justification.id,
      details: {
        studentId: justification.student_id,
        date: justification.date_str,
        previousStatus: justification.status,
        attendanceGranted: status === 'Approved' && !!attendanceId,
        ...(reviewNote ? { note: reviewNote } : {}),
      },
    });

    const [updated] = await pool.execute<any[]>(`${SELECT_WITH_JOINS} WHERE j.id = ?`, [justification.id]);
    res.json(updated[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/absence-justifications/:id — o próprio aluno/responsável cancela ou reenvia
// (excluindo a recusada e mandando outra). Aceita não pode ser removida por aqui: ela carrega
// a presença já concedida — cabe ao professor recusá-la, que aí sim reverte o contador.
router.delete('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  const { userId } = req.user!;

  try {
    const [rows] = await pool.execute<any[]>(
      'SELECT id, student_id, status FROM absence_justifications WHERE id = ? AND academy_id = ?',
      [req.params.id, academyId]
    );
    const justification = rows[0];
    if (!justification) { res.status(404).json({ error: 'Justificativa não encontrada.' }); return; }

    const ownIds = await getOwnStudentIds(userId, academyId);
    if (!ownIds.includes(justification.student_id)) {
      res.status(403).json({ error: 'Você só pode excluir as suas próprias justificativas.' });
      return;
    }
    if (justification.status === 'Approved') {
      res.status(400).json({ error: 'Justificativa já aceita não pode ser excluída — a presença já foi concedida.' });
      return;
    }

    await pool.execute('DELETE FROM absence_justifications WHERE id = ?', [justification.id]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
