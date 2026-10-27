import crypto from 'crypto';
import pool from '../db';
import { withTransaction } from './withTransaction';

export interface DailyCheckInStudent {
  id: string;
  plan_id: string | null;
}

/**
 * Presença diária "avulsa" (sem class_id), com a duração tirada da grade do plano do aluno.
 *
 * É a mesma regra do check-in por QR Code, extraída para cá para que a catraca grave presença
 * exatamente do mesmo jeito: uma por dia, com os mesmos contadores (total de aulas/horas e os
 * contadores desde a última graduação). Se já existir presença avulsa no dia, nada é gravado e
 * `created` volta false — quem chama decide se isso é erro (QR Code) ou não (catraca, que pode
 * ver o mesmo aluno passar várias vezes).
 *
 * `date` e `checkInTime` já devem vir no fuso de Brasília.
 */
export async function registerDailyCheckIn(
  academyId: string,
  student: DailyCheckInStudent,
  date: string,
  checkInTime: string,
  source: string | null = null,
): Promise<{ created: boolean; record: any }> {
  const [existingRows] = await pool.execute<any[]>(
    'SELECT * FROM attendance_records WHERE student_id = ? AND academy_id = ? AND date = ? AND class_id IS NULL',
    [student.id, academyId, date]
  );
  if (existingRows.length > 0) {
    return { created: false, record: existingRows[0] };
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
      const dow = new Date(`${date}T12:00:00Z`).getUTCDay();
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
         (id, academy_id, student_id, class_id, date, duration_minutes, check_in_time, matched_plan_id, matched_schedule_id, source)
       VALUES (?,?,?,NULL,?,?,?,?,?,?)`,
      [id, academyId, student.id, date, durationMinutes, checkInTime, matchedPlanId, matchedScheduleId, source]
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
      [hoursToAdd, hoursToAdd, date, date, student.id]
    );
    const [rows] = await conn.execute<any[]>('SELECT * FROM attendance_records WHERE id = ?', [id]);
    return rows[0];
  });

  return { created: true, record };
}

/** Data (YYYY-MM-DD) e hora (HH:MM:SS) de um instante no fuso de Brasília. */
export function brasiliaDateTime(instant: Date): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(instant);
  const get = (t: string) => parseInt(parts.find(p => p.type === t)!.value, 10);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    date: `${get('year')}-${pad(get('month'))}-${pad(get('day'))}`,
    // Intl pode devolver "24" para meia-noite com hour12: false
    time: `${pad(get('hour') % 24)}:${pad(get('minute'))}:${pad(get('second'))}`,
  };
}
