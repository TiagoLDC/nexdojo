import pool from '../db';

/**
 * Após criar/atualizar uma ENTIDADE com email, vincula ao usuário existente com mesmo email
 * na mesma academia (só age se entity.user_id ainda for NULL).
 */
export async function autoLinkEntityToUser(
  table: 'students' | 'instructors' | 'staff',
  entityId: string,
  email: string,
  academyId: string
): Promise<void> {
  if (!email) return;
  const [rows] = await pool.execute<any[]>(
    'SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND academy_id = ?',
    [email.trim(), academyId]
  );
  if (rows[0]) {
    await pool.execute(
      `UPDATE ${table} SET user_id = ? WHERE id = ? AND user_id IS NULL`,
      [rows[0].id, entityId]
    );
  }
}

/**
 * Após criar/atualizar um USUÁRIO, vincula ao registro de entidade com mesmo email
 * na mesma academia (só age se entity.user_id ainda for NULL).
 */
export async function autoLinkUserToEntities(
  userId: string,
  email: string,
  academyId: string
): Promise<void> {
  if (!email || !academyId) return;
  for (const table of ['students', 'instructors', 'staff'] as const) {
    await pool.execute(
      `UPDATE ${table} SET user_id = ? WHERE LOWER(email) = LOWER(?) AND academy_id = ? AND user_id IS NULL`,
      [userId, email.trim(), academyId]
    );
  }
}
