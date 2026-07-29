import { Router, Request, Response, NextFunction } from 'express';
import pool from '../db';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { getAcademyId } from '../utils/academyScope';
import { validate } from '../utils/validate';
import { withTransaction } from '../utils/withTransaction';

const router = Router();

const generateDailyQrCode = (academyId: number | string, date: string): string => {
  const input = `nexdojo-${academyId}-${date}`;
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = Math.imul(hash, 33) ^ input.charCodeAt(i);
  }
  return `NDQR${(hash >>> 0).toString(36).toUpperCase().padStart(6, '0')}`;
};

// GET /api/attendance
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  const { classId, studentId, dateFrom, dateTo, page = '1', limit = '20' } = req.query;
  const pageNum  = Math.max(1, parseInt(String(page), 10));
  const limitNum = Math.min(1000, Math.max(1, parseInt(String(limit), 10)));
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

// POST /api/attendance/qr-checkin — auto check-in do aluno via QR Code de Presença
router.post('/qr-checkin', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { userId, academyId, role } = req.user!;

  if (!academyId) {
    res.status(400).json({ error: 'Usuário sem academia associada.' });
    return;
  }

  const { qr_code } = req.body;
  if (!qr_code || typeof qr_code !== 'string') {
    res.status(400).json({ error: 'Código QR não informado.' });
    return;
  }

  try {
    // Data/hora no fuso Brasília (necessária para validação do código automático)
    const _brParts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    }).formatToParts(new Date());
    const _get = (t: string) => parseInt(_brParts.find(p => p.type === t)!.value);
    const today      = `${_get('year')}-${String(_get('month')).padStart(2,'0')}-${String(_get('day')).padStart(2,'0')}`;
    const _h         = _get('hour') % 24;
    const nowTimeStr = `${String(_h).padStart(2,'0')}:${String(_get('minute')).padStart(2,'0')}:${String(_get('second')).padStart(2,'0')}`;

    // Valida o código contra o cadastrado na academia
    const [academyRows] = await pool.execute<any[]>(
      'SELECT qr_code_presenca FROM academies WHERE id = ?',
      [academyId]
    );
    const academy = academyRows[0];
    if (!academy) {
      res.status(404).json({ error: 'Academia não encontrada.' });
      return;
    }
    if (!academy.qr_code_presenca) {
      res.status(400).json({ error: 'Esta academia ainda não configurou o QR Code de presença.' });
      return;
    }

    const expectedCode = academy.qr_code_presenca.trim() === '__AUTO__'
      ? generateDailyQrCode(academyId, today)
      : academy.qr_code_presenca.trim();

    if (qr_code.trim() !== expectedCode) {
      res.status(400).json({ error: 'Código QR inválido. Aproxime a câmera do QR Code da academia.' });
      return;
    }

    // Localiza o aluno pelo user_id
    const [studentRows] = await pool.execute<any[]>(
      `SELECT id, status, birth_date, plan_id, total_classes, total_hours
       FROM students WHERE user_id = ? AND academy_id = ?`,
      [userId, academyId]
    );
    const student = studentRows[0];
    if (!student) {
      res.status(404).json({ error: 'Perfil de aluno não encontrado. Entre em contato com a academia.' });
      return;
    }
    if (student.status !== 'Active') {
      res.status(400).json({ error: 'Aluno inativo. Apenas alunos com status Ativo podem marcar presença.' });
      return;
    }

    // Idempotência: já marcou hoje?
    const [existingRows] = await pool.execute<any[]>(
      'SELECT id FROM attendance_records WHERE student_id = ? AND academy_id = ? AND date = ? AND class_id IS NULL',
      [student.id, academyId, today]
    );
    if (existingRows.length > 0) {
      res.status(400).json({ error: 'Presença já registrada hoje.' });
      return;
    }

    // Valida plano (se tiver, usa duração do plano; caso contrário usa 60 min de fallback)
    let durationMinutes = 60;
    let matchedPlanId: string | null = null;
    let matchedScheduleId: string | null = null;

    if (student.plan_id) {
      const [planRows] = await pool.execute<any[]>(
        'SELECT id, active FROM academy_plans WHERE id = ? AND academy_id = ?',
        [student.plan_id, academyId]
      );
      const plan = planRows[0];
      if (plan && plan.active) {
        matchedPlanId = plan.id;
        const dow = new Date(`${today}T12:00:00Z`).getUTCDay();
        const [scheduleRows] = await pool.execute<any[]>(
          'SELECT id, start_time, end_time FROM academy_plan_schedules WHERE plan_id = ? AND day_of_week = ?',
          [student.plan_id, dow]
        );
        if (scheduleRows.length > 0) {
          const s = scheduleRows[0] as any;
          matchedScheduleId = s.id;
          const [sh, sm] = s.start_time.split(':').map(Number);
          const [eh, em] = s.end_time.split(':').map(Number);
          durationMinutes = (eh * 60 + em) - (sh * 60 + sm);
        }
      }
    }

    const record = await withTransaction(async (conn) => {
      const id = crypto.randomUUID();
      await conn.execute(
        `INSERT INTO attendance_records
           (id, academy_id, student_id, class_id, date, duration_minutes, check_in_time, matched_plan_id, matched_schedule_id)
         VALUES (?,?,?,NULL,?,?,?,?,?)`,
        [id, academyId, student.id, today, durationMinutes, nowTimeStr, matchedPlanId, matchedScheduleId]
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
        [hoursToAdd, hoursToAdd, today, today, student.id]
      );
      const [rows] = await conn.execute<any[]>('SELECT * FROM attendance_records WHERE id = ?', [id]);
      return rows[0];
    });

    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
});

// POST /api/attendance
// Fluxo novo (Fase 4): valida plano do aluno, horário, idade e idempotência antes de inserir.
// Legado: se vier class_id no body (fluxo antigo de sessões), aceita sem validar horário.
router.post('/', requireAuth, requireRole('admin', 'superuser', 'instructor', 'staff'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

    // Data/hora no fuso de Brasília — independente do timezone do servidor MySQL
    const _brParts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    }).formatToParts(new Date());
    const _get = (t: string) => parseInt(_brParts.find(p => p.type === t)!.value);
    const today      = `${_get('year')}-${String(_get('month')).padStart(2,'0')}-${String(_get('day')).padStart(2,'0')}`;
    const _h         = _get('hour') % 24;
    const nowTimeStr = `${String(_h).padStart(2,'0')}:${String(_get('minute')).padStart(2,'0')}:${String(_get('second')).padStart(2,'0')}`;
    const nowMin     = _h * 60 + _get('minute');

    // Data efetiva: usa req.body.date se fornecida e não for futura (chamada retroativa)
    const bodyDate      = req.body.date && /^\d{4}-\d{2}-\d{2}$/.test(req.body.date) ? req.body.date : null;
    const activeDate    = (bodyDate && bodyDate <= today) ? bodyDate : today;
    const isRetroactive = activeDate !== today;

    // day_of_week no DB: 0=Dom,1=Seg,...,6=Sab (igual a getUTCDay sobre noon UTC da data brasileira)
    const dow        = new Date(`${activeDate}T12:00:00Z`).getUTCDay();

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
                p.free_schedule, p.free_days, p.free_age, p.classes_per_week
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
      // free_age = 1 → ignora completamente; caso contrário avisa (422) e permite override
      const freeAge      = plan.free_age === 1 || plan.free_age === true;
      const overrideAge  = req.body.override_age === true || req.body.override_age === 1;
      let hasAgeWarning  = false;

      if (!freeAge && student.birth_date && (plan.min_age != null || plan.max_age != null)) {
        const birth = new Date(student.birth_date);
        const todayDate = new Date(today);
        let age = todayDate.getFullYear() - birth.getFullYear();
        const m = todayDate.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && todayDate.getDate() < birth.getDate())) age--;

        const isBelowMin = plan.min_age != null && age < plan.min_age;
        const isAboveMax = plan.max_age != null && age > plan.max_age;

        if (isBelowMin || isAboveMax) {
          if (!overrideAge) {
            const warnMsg = isBelowMin
              ? `Aluno com ${age} anos está abaixo da idade mínima do plano (${plan.min_age} anos).`
              : `Aluno com ${age} anos está acima da idade máxima do plano (${plan.max_age} anos).`;
            res.status(422).json({ error: warnMsg, type: 'AGE_WARNING' });
            return;
          }
          hasAgeWarning = true;
        }
      }

      // ── 6. Verificação de horário ────────────────────────────────────────
      // Ignorada quando: plano tem "Horário Livre" (free_schedule=1) OU chamada retroativa
      const freeSchedule = plan.free_schedule === 1 || plan.free_schedule === true;
      const freeDays     = plan.free_days === 1 || plan.free_days === true;

      // Converte 'HH:MM:SS' para minutos desde meia-noite
      const toMinutes = (t: string) => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
      };

      let matchedSchedule: any = null;
      let durationMinutes = 60; // fallback quando não há horário fixo

      if (!freeSchedule && !isRetroactive) {
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

        matchedSchedule = (scheduleRows as any[]).find(s => {
          const startMin = toMinutes(s.start_time);
          const windowStart = startMin - (plan.tolerance_before_minutes ?? 15);
          const windowEnd   = startMin + (plan.tolerance_after_start_minutes ?? 15);
          return nowMin >= windowStart && nowMin <= windowEnd;
        });

        if (!matchedSchedule) {
          const windows = (scheduleRows as any[]).map(s => {
            const start = toMinutes(s.start_time);
            const ws = start - (plan.tolerance_before_minutes ?? 15);
            const we = start + (plan.tolerance_after_start_minutes ?? 15);
            return `${String(Math.floor(ws/60)).padStart(2,'0')}:${String(ws%60).padStart(2,'0')}–${String(Math.floor(we/60)).padStart(2,'0')}:${String(we%60).padStart(2,'0')}`;
          }).join(', ');
          res.status(400).json({ error: `Fora da janela de horário. Hora atual: ${nowTimeStr.substring(0,5)}. Janela${scheduleRows.length > 1 ? 's' : ''}: ${windows}.` });
          return;
        }

        const [sh, sm] = matchedSchedule.start_time.split(':').map(Number);
        const [eh, em] = matchedSchedule.end_time.split(':').map(Number);
        durationMinutes = (eh * 60 + em) - (sh * 60 + sm);
      } else if (!freeSchedule && isRetroactive) {
        // Retroativo: tenta pegar duração do horário do dia sem validar janela de tempo
        const [scheduleRows] = await pool.execute<any[]>(
          `SELECT id, start_time, end_time
           FROM academy_plan_schedules
           WHERE plan_id = ? AND day_of_week = ?`,
          [student.plan_id, dow]
        );
        if (scheduleRows.length > 0) {
          const s = scheduleRows[0] as any;
          const [sh, sm] = s.start_time.split(':').map(Number);
          const [eh, em] = s.end_time.split(':').map(Number);
          durationMinutes = (eh * 60 + em) - (sh * 60 + sm);
          matchedSchedule = s;
        }
      }

      // ── 7. Idempotência: já marcou presença nesta data? ──────────────────
      const [existingRows] = await pool.execute<any[]>(
        'SELECT id FROM attendance_records WHERE student_id = ? AND academy_id = ? AND date = ? AND class_id IS NULL',
        [student_id, academyId, activeDate]
      );
      if (existingRows.length > 0) {
        res.status(400).json({ error: isRetroactive ? 'Presença já registrada nesta data.' : 'Presença já registrada hoje.' });
        return;
      }

      // ── 8. Verificação de frequência semanal ────────────────────────────
      // Ignorada quando: plano tem "Dias Livres" (free_days=1) OU chamada retroativa
      if (!freeDays && !isRetroactive && plan.classes_per_week) {
        // Início da semana atual (segunda-feira, ISO) — calculado a partir da data brasileira
        const [ty, tm, td] = today.split('-').map(Number);
        const daysBack = (dow + 6) % 7; // 0=Seg → 0, 1=Ter → 1, …, 6=Dom → 6
        const weekStartDate = new Date(Date.UTC(ty, tm - 1, td - daysBack, 12, 0, 0));
        const week_start = `${weekStartDate.getUTCFullYear()}-${String(weekStartDate.getUTCMonth()+1).padStart(2,'0')}-${String(weekStartDate.getUTCDate()).padStart(2,'0')}`;

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
              check_in_time, matched_plan_id, matched_schedule_id, age_warning)
           VALUES (?,?,?,NULL,?,?,?,?,?,?)`,
          [id, academyId, student_id, activeDate, durationMinutes,
           isRetroactive ? null : nowTimeStr, student.plan_id, matchedSchedule?.id ?? null, hasAgeWarning ? 1 : 0]
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
          [hoursToAdd, hoursToAdd, activeDate, activeDate, student_id]
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
           SET total_classes              = total_classes + 1,
               total_hours                = total_hours + ?,
               classes_since_graduation   = classes_since_graduation + 1,
               hours_since_graduation     = hours_since_graduation + ?,
               last_attendance            = GREATEST(COALESCE(last_attendance, ?), ?)
           WHERE id = ?`,
          [hoursToAdd, hoursToAdd, date, date, student_id]
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

// DELETE /api/attendance/:id — remove presença e reverte contadores do aluno
router.delete('/:id', requireAuth, requireRole('admin', 'superuser', 'instructor', 'staff'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  try {
    const [rows] = await pool.execute<any[]>(
      'SELECT id, student_id, duration_minutes FROM attendance_records WHERE id = ? AND academy_id = ?',
      [req.params.id, academyId]
    );
    if (!rows[0]) { res.status(404).json({ error: 'Presença não encontrada' }); return; }

    const record = rows[0];
    const hoursToRemove = Math.round((record.duration_minutes || 0) / 60);

    await withTransaction(async (conn) => {
      await conn.execute(
        `UPDATE students
         SET total_classes            = GREATEST(0, total_classes - 1),
             total_hours              = GREATEST(0, total_hours - ?),
             classes_since_graduation = GREATEST(0, classes_since_graduation - 1),
             hours_since_graduation   = GREATEST(0, hours_since_graduation - ?)
         WHERE id = ?`,
        [hoursToRemove, hoursToRemove, record.student_id]
      );
      await conn.execute('DELETE FROM attendance_records WHERE id = ?', [req.params.id]);
    });

    res.json({ message: 'Presença removida com sucesso' });
  } catch (err) {
    next(err);
  }
});

export default router;
