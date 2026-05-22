import { Router, Request, Response, NextFunction } from 'express';
import pool from '../db';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { getAcademyId } from '../utils/academyScope';
import { validate } from '../utils/validate';
import { withTransaction } from '../utils/withTransaction';

const router = Router();

// Mapeia uma linha de academy_plans (snake_case do DB) para objeto de saída.
// price é DECIMAL → vem como string do mysql2, então parseamos.
// Quando hideprice=true (instrutor), o campo price é omitido do payload.
function mapPlan(p: any, hidePrice: boolean) {
  const out: any = {
    id: p.id,
    academyId: p.academy_id,
    name: p.name,
    durationMonths: p.duration_months,
    classesPerWeek: p.classes_per_week,
    category: p.category,
    description: p.description,
    minAge: p.min_age,
    maxAge: p.max_age,
    instructorId: p.instructor_id,
    active: p.active === 1 || p.active === true,
    toleranceBeforeMinutes: p.tolerance_before_minutes,
    toleranceAfterStartMinutes: p.tolerance_after_start_minutes,
    schedules: p.schedules ?? [],
  };
  if (!hidePrice) out.price = p.price != null ? parseFloat(p.price) : null;
  return out;
}

// Anexa schedules a cada plano (1:N)
async function attachSchedules(plans: any[]): Promise<void> {
  for (const plan of plans) {
    const [rows] = await pool.execute<any[]>(
      'SELECT id, day_of_week, start_time, end_time FROM academy_plan_schedules WHERE plan_id = ? ORDER BY day_of_week, start_time',
      [plan.id]
    );
    plan.schedules = (rows as any[]).map(r => ({
      id: r.id,
      dayOfWeek: r.day_of_week,
      startTime: r.start_time,
      endTime: r.end_time,
    }));
  }
}

// GET /api/plans — lista planos da academia (com schedules). Mascara price para instrutor.
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  const hidePrice = req.user!.role === 'instructor';

  try {
    const [plans] = await pool.execute<any[]>(
      'SELECT * FROM academy_plans WHERE academy_id = ? ORDER BY name ASC',
      [academyId]
    );
    await attachSchedules(plans as any[]);
    res.json({ data: (plans as any[]).map(p => mapPlan(p, hidePrice)), total: (plans as any[]).length });
  } catch (err) {
    next(err);
  }
});

// GET /api/plans/:id
router.get('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  const hidePrice = req.user!.role === 'instructor';

  try {
    const [rows] = await pool.execute<any[]>(
      'SELECT * FROM academy_plans WHERE id = ? AND academy_id = ?',
      [req.params.id, academyId]
    );
    if (!rows[0]) { res.status(404).json({ error: 'Plano não encontrado' }); return; }
    await attachSchedules(rows as any[]);
    res.json(mapPlan(rows[0], hidePrice));
  } catch (err) {
    next(err);
  }
});

// Valida que os horários têm formato consistente. Lança Error com mensagem amigável.
function validateSchedules(schedules: any[]): string | null {
  if (!Array.isArray(schedules)) return 'Horários inválidos';
  for (const s of schedules) {
    const dow = s.dayOfWeek ?? s.day_of_week;
    const start = s.startTime ?? s.start_time;
    const end = s.endTime ?? s.end_time;
    if (dow === undefined || dow === null || Number(dow) < 0 || Number(dow) > 6) return 'Dia da semana do horário inválido';
    if (!start || !end) return 'Horário de início/fim obrigatório';
    if (String(start) >= String(end)) return 'Horário de início deve ser antes do fim';
  }
  return null;
}

// POST /api/plans — admin/superuser. Cria plano + schedules em transação.
router.post('/', requireAuth, requireRole('admin', 'superuser'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  // interceptor converte camelCase→snake_case antes de enviar, então lemos snake_case aqui
  const errors = validate(req.body, {
    name:            { required: true, type: 'string', maxLength: 255 },
    duration_months: { required: true, type: 'number', min: 1 },
    price:           { required: true, type: 'number', min: 0 },
  });
  if (errors.length) { res.status(400).json({ error: errors[0] }); return; }

  const schedules = req.body.schedules ?? [];
  const schedErr = validateSchedules(schedules);
  if (schedErr) { res.status(400).json({ error: schedErr }); return; }

  const {
    name, duration_months, classes_per_week, price, category, description,
    min_age, max_age, instructor_id, active,
    tolerance_before_minutes, tolerance_after_start_minutes,
  } = req.body;

  try {
    const result = await withTransaction(async (conn) => {
      const id = crypto.randomUUID();
      await conn.execute(
        `INSERT INTO academy_plans
           (id, academy_id, name, duration_months, classes_per_week, price, category, description,
            min_age, max_age, instructor_id, active, tolerance_before_minutes, tolerance_after_start_minutes)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          id, academyId, name, duration_months, classes_per_week ?? null, price,
          category ?? null, description ?? null,
          min_age ?? null, max_age ?? null, instructor_id ?? null,
          active === undefined ? 1 : (active ? 1 : 0),
          tolerance_before_minutes ?? 15, tolerance_after_start_minutes ?? 15,
        ]
      );

      for (const s of schedules) {
        await conn.execute(
          'INSERT INTO academy_plan_schedules (id, plan_id, day_of_week, start_time, end_time) VALUES (?,?,?,?,?)',
          [crypto.randomUUID(), id, s.dayOfWeek ?? s.day_of_week, s.startTime ?? s.start_time, s.endTime ?? s.end_time]
        );
      }

      const [rows] = await conn.execute<any[]>('SELECT * FROM academy_plans WHERE id = ?', [id]);
      return rows[0];
    });

    await attachSchedules([result]);
    res.status(201).json(mapPlan(result, false));
  } catch (err) {
    next(err);
  }
});

// PUT /api/plans/:id — admin/superuser. Atualiza plano + substitui schedules.
router.put('/:id', requireAuth, requireRole('admin', 'superuser'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  const errors = validate(req.body, {
    name:            { type: 'string', maxLength: 255 },
    duration_months: { type: 'number', min: 1 },
    price:           { type: 'number', min: 0 },
  });
  if (errors.length) { res.status(400).json({ error: errors[0] }); return; }

  if (req.body.schedules !== undefined) {
    const schedErr = validateSchedules(req.body.schedules);
    if (schedErr) { res.status(400).json({ error: schedErr }); return; }
  }

  try {
    const [existing] = await pool.execute<any[]>(
      'SELECT id FROM academy_plans WHERE id = ? AND academy_id = ?',
      [req.params.id, academyId]
    );
    if (!existing[0]) { res.status(404).json({ error: 'Plano não encontrado' }); return; }

    const result = await withTransaction(async (conn) => {
      const PLAN_FIELDS = [
        'name', 'duration_months', 'classes_per_week', 'price', 'category', 'description',
        'min_age', 'max_age', 'instructor_id', 'tolerance_before_minutes', 'tolerance_after_start_minutes',
      ];
      const fields = Object.keys(req.body).filter(k => PLAN_FIELDS.includes(k));
      if (fields.length) {
        const set = fields.map(f => `${f} = ?`).join(', ');
        const values = fields.map(f => req.body[f] ?? null);
        await conn.execute(`UPDATE academy_plans SET ${set} WHERE id = ?`, [...values, req.params.id]);
      }

      // active é boolean → tratado à parte para converter para 0/1
      if (req.body.active !== undefined) {
        await conn.execute('UPDATE academy_plans SET active = ? WHERE id = ?', [req.body.active ? 1 : 0, req.params.id]);
      }

      if (Array.isArray(req.body.schedules)) {
        await conn.execute('DELETE FROM academy_plan_schedules WHERE plan_id = ?', [req.params.id]);
        for (const s of req.body.schedules) {
          await conn.execute(
            'INSERT INTO academy_plan_schedules (id, plan_id, day_of_week, start_time, end_time) VALUES (?,?,?,?,?)',
            [crypto.randomUUID(), req.params.id, s.dayOfWeek ?? s.day_of_week, s.startTime ?? s.start_time, s.endTime ?? s.end_time]
          );
        }
      }

      const [rows] = await conn.execute<any[]>('SELECT * FROM academy_plans WHERE id = ?', [req.params.id]);
      return rows[0];
    });

    await attachSchedules([result]);
    res.json(mapPlan(result, false));
  } catch (err) {
    next(err);
  }
});

// DELETE /api/plans/:id — admin/superuser. Soft delete (active=0) se houver alunos vinculados; hard delete se não houver.
router.delete('/:id', requireAuth, requireRole('admin', 'superuser'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  try {
    const [rows] = await pool.execute<any[]>(
      'SELECT id FROM academy_plans WHERE id = ? AND academy_id = ?',
      [req.params.id, academyId]
    );
    if (!rows[0]) { res.status(404).json({ error: 'Plano não encontrado' }); return; }

    const [students] = await pool.execute<any[]>(
      'SELECT COUNT(*) AS total FROM students WHERE plan_id = ?',
      [req.params.id]
    );
    const inUse = (students[0] as any).total > 0;

    if (inUse) {
      await pool.execute('UPDATE academy_plans SET active = 0 WHERE id = ?', [req.params.id]);
      res.json({ message: 'Plano possui alunos vinculados — foi desativado em vez de excluído', softDeleted: true });
    } else {
      // FK CASCADE remove os schedules automaticamente
      await pool.execute('DELETE FROM academy_plans WHERE id = ?', [req.params.id]);
      res.json({ message: 'Plano excluído', softDeleted: false });
    }
  } catch (err) {
    next(err);
  }
});

export default router;
