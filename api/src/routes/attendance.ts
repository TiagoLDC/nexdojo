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
// Fluxo novo (Fase 4): valida plano do aluno, horário, idade e idempotência antes de inserir.
// Legado: se vier class_id no body (fluxo antigo de sessões), aceita sem validar horário.
router.post('/', requireAuth, requireRole('admin', 'superuser', 'instructor'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  const errors = validate(req.body, {
    student_id: { required: true, type: 'string' },
  });
  if (errors.length) { res.status(400).json({ error: errors[0] }); return; }

  const { student_id, class_id } = req.body;

  // Se vier class_id, é o fluxo legado de sessão — deixa passar sem validar plano/horário
  const isLegacyFlow = !!class_id;

  try {
    // ── 1. Aluno existe e pertence à academia ────────────────────────────────
    const [studentRows] = await pool.execute<any[]>(
      `SELECT s.id, s.status, s.birth_date, s.plan_id, s.total_classes, s.total_hours
       FROM students s
       WHERE s.id = ? AND s.academy_id = ?`,
      [student_id, academyId]
    );
    const student = studentRows[0];
    if (!student) { res.status(404).json({ error: 'Aluno não encontrado' }); return; }

    // ── 2. Aluno ativo ───────────────────────────────────────────────────────
    if (student.status !== 'Active') {
      res.status(400).json({ error: 'Aluno inativo. Apenas alunos com status Ativo podem marcar presença.' });
      return;
    }

    // Data/hora do servidor (MySQL) — evita divergência de fuso
    const [[{ today, now_time }]] = await pool.execute<any[]>(
      'SELECT CURDATE() AS today, CURTIME() AS now_time'
    ) as any;

    if (!isLegacyFlow) {
      // ── 3. Aluno tem plano ───────────────────────────────────────────────
      if (!student.plan_id) {
        res.status(400).json({ error: 'Aluno sem plano de aula. Solicite ao administrador que selecione um plano.' });
        return;
      }

      // ── 4. Plano existe e está ativo ─────────────────────────────────────
      const [planRows] = await pool.execute<any[]>(
        `SELECT p.id, p.active, p.min_age, p.max_age,
                p.tolerance_before_minutes, p.tolerance_after_start_minutes,
                p.free_schedule, p.free_days, p.classes_per_week
         FROM academy_plans p
         WHERE p.id = ? AND p.academy_id = ?`,
        [student.plan_id, academyId]
      );
      const plan = planRows[0];
      if (!plan) {
        res.status(400).json({ error: 'Plano do aluno não encontrado.' });
        return;
      }
      if (!plan.active) {
        res.status(400).json({ error: 'O plano de aula do aluno está inativo.' });
        return;
      }

      // ── 5. Verificação de idade ──────────────────────────────────────────
      if (student.birth_date && (plan.min_age != null || plan.max_age != null)) {
        const birth = new Date(student.birth_date);
        const todayDate = new Date(today);
        let age = todayDate.getFullYear() - birth.getFullYear();
        const m = todayDate.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && todayDate.getDate() < birth.getDate())) age--;

        if (plan.min_age != null && age < plan.min_age) {
          res.status(400).json({ error: `Aluno com ${age} anos abaixo da idade mínima do plano (${plan.min_age} anos).` });
          return;
        }
        if (plan.max_age != null && age > plan.max_age) {
          res.status(400).json({ error: `Aluno com ${age} anos acima da idade máxima do plano (${plan.max_age} anos).` });
          return;
        }
      }

      // ── 6. Verificação de horário ────────────────────────────────────────
      // Ignorada quando o plano tem "Horário Livre" (free_schedule = 1)
      const freeSchedule = plan.free_schedule === 1 || plan.free_schedule === true;
      const freeDays     = plan.free_days === 1 || plan.free_days === true;

      // Dia da semana da data atual (0=Dom..6=Sab) — MySQL DAYOFWEEK retorna 1=Dom..7=Sab
      const [[{ dow }]] = await pool.execute<any[]>(
        'SELECT DAYOFWEEK(CURDATE()) - 1 AS dow'
      ) as any;

      // Converte 'HH:MM:SS' para minutos desde meia-noite
      const toMinutes = (t: string) => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
      };

      let matchedSchedule: any = null;
      let durationMinutes = 60; // fallback quando não há horário fixo

      if (!freeSchedule) {
        const [scheduleRows] = await pool.execute<any[]>(
          `SELECT id, start_time, end_time
           FROM academy_plan_schedules
           WHERE plan_id = ? AND day_of_week = ?`,
          [student.plan_id, dow]
        );

        if (scheduleRows.length === 0) {
          res.status(400).json({ error: 'Não há aula do seu plano hoje.' });
          return;
        }

        const nowMin = toMinutes(now_time);
        matchedSchedule = (scheduleRows as any[]).find(s => {
          const startMin = toMinutes(s.start_time);
          const windowStart = startMin - (plan.tolerance_before_minutes ?? 15);
          const windowEnd   = startMin + (plan.tolerance_after_start_minutes ?? 15);
          return nowMin >= windowStart && nowMin <= windowEnd;
        });

        if (!matchedSchedule) {
          res.status(400).json({ error: 'Fora da janela de horário do seu plano. Verifique os horários e tente novamente.' });
          return;
        }

        const [sh, sm] = matchedSchedule.start_time.split(':').map(Number);
        const [eh, em] = matchedSchedule.end_time.split(':').map(Number);
        durationMinutes = (eh * 60 + em) - (sh * 60 + sm);
      }

      // ── 7. Idempotência: já marcou presença hoje? ────────────────────────
      const [existingRows] = await pool.execute<any[]>(
        'SELECT id FROM attendance_records WHERE student_id = ? AND academy_id = ? AND date = ? AND class_id IS NULL',
        [student_id, academyId, today]
      );
      if (existingRows.length > 0) {
        res.status(400).json({ error: 'Presença já registrada hoje.' });
        return;
      }

      // ── 8. Verificação de frequência semanal ────────────────────────────
      // Ignorada quando o plano tem "Dias Livres" (free_days = 1)
      if (!freeDays && plan.classes_per_week) {
        // Início da semana atual (segunda-feira, ISO)
        const [[{ week_start }]] = await pool.execute<any[]>(
          `SELECT DATE_SUB(CURDATE(), INTERVAL (DAYOFWEEK(CURDATE()) + 5) % 7 DAY) AS week_start`
        ) as any;

        const [weekRows] = await pool.execute<any[]>(
          `SELECT COUNT(*) AS total FROM attendance_records
           WHERE student_id = ? AND academy_id = ? AND date >= ? AND class_id IS NULL`,
          [student_id, academyId, week_start]
        );
        const weekCount = (weekRows[0] as any).total;
        if (weekCount >= plan.classes_per_week) {
          res.status(400).json({
            error: `Limite semanal atingido. Seu plano permite ${plan.classes_per_week} aula${plan.classes_per_week > 1 ? 's' : ''} por semana.`,
          });
          return;
        }
      }

      // ── Inserção com auditoria de plano/horário ──────────────────────────

      const record = await withTransaction(async (conn) => {
        const id = crypto.randomUUID();
        await conn.execute(
          `INSERT INTO attendance_records
             (id, academy_id, student_id, class_id, date, duration_minutes,
              check_in_time, matched_plan_id, matched_schedule_id)
           VALUES (?,?,?,NULL,?,?,?,?,?)`,
          [id, academyId, student_id, today, durationMinutes,
           now_time, student.plan_id, matchedSchedule?.id ?? null]
        );

        const hoursToAdd = Math.round(durationMinutes / 60);
        await conn.execute(
          `UPDATE students
           SET total_classes   = total_classes + 1,
               total_hours     = total_hours + ?,
               last_attendance = GREATEST(COALESCE(last_attendance, ?), ?)
           WHERE id = ?`,
          [hoursToAdd, today, today, student_id]
        );

        const [rows] = await conn.execute<any[]>('SELECT * FROM attendance_records WHERE id = ?', [id]);
        return rows[0];
      });

      res.status(201).json(record);

    } else {
      // ── Fluxo legado: class_id presente, sem validação de plano/horário ──
      const { date, duration_minutes } = req.body;
      if (!date) { res.status(400).json({ error: 'date é obrigatório no fluxo legado' }); return; }

      const record = await withTransaction(async (conn) => {
        const id = crypto.randomUUID();
        await conn.execute(
          `INSERT INTO attendance_records (id, academy_id, student_id, class_id, date, duration_minutes)
           VALUES (?,?,?,?,?,?)`,
          [id, academyId, student_id, class_id, date, duration_minutes ?? null]
        );

        const hoursToAdd = duration_minutes ? Math.round(Number(duration_minutes) / 60) : 0;
        await conn.execute(
          `UPDATE students
           SET total_classes   = total_classes + 1,
               total_hours     = total_hours + ?,
               last_attendance = GREATEST(COALESCE(last_attendance, ?), ?)
           WHERE id = ?`,
          [hoursToAdd, date, date, student_id]
        );

        const [rows] = await conn.execute<any[]>('SELECT * FROM attendance_records WHERE id = ?', [id]);
        return rows[0];
      });

      res.status(201).json(record);
    }
  } catch (err) {
    next(err);
  }
});

export default router;
