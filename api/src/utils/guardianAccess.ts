import pool from '../db';

export async function isGuardianOfStudent(guardianUserId: string, studentId: string): Promise<boolean> {
  const [rows] = await pool.execute<any[]>(
    'SELECT id FROM guardianships WHERE guardian_user_id = ? AND student_id = ? LIMIT 1',
    [guardianUserId, studentId]
  );
  return !!rows[0];
}

export async function getGuardianStudentIds(guardianUserId: string): Promise<string[]> {
  const [rows] = await pool.execute<any[]>(
    'SELECT student_id FROM guardianships WHERE guardian_user_id = ?',
    [guardianUserId]
  );
  return rows.map((r: any) => r.student_id);
}
