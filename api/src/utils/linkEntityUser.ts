import pool from '../db';

// Único role "dono" de cada tabela de entidade — auto-link só faz sentido quando a conta
// encontrada representa literalmente a MESMA pessoa da ficha. Contas de outros papéis
// (guardian, admin, superuser, ou o role de um parente qualquer) nunca devem virar o
// user_id de uma ficha só porque compartilham e-mail de contato — isso é comum quando um
// filho sem e-mail próprio usa o e-mail do pai/mãe/staff da família como contato.
const TABLE_OWNER_ROLE: Record<'students' | 'instructors' | 'staff', string> = {
  students: 'student',
  instructors: 'instructor',
  staff: 'staff',
};

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
    'SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND academy_id = ? AND role = ?',
    [email.trim(), academyId, TABLE_OWNER_ROLE[table]]
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
  const [userRows] = await pool.execute<any[]>('SELECT role FROM users WHERE id = ?', [userId]);
  const role = userRows[0]?.role;
  const table = (Object.entries(TABLE_OWNER_ROLE) as [keyof typeof TABLE_OWNER_ROLE, string][])
    .find(([, ownerRole]) => ownerRole === role)?.[0];
  if (!table) return; // guardian/admin/superuser/etc. não são "dono" de nenhuma tabela de entidade

  await pool.execute(
    `UPDATE ${table} SET user_id = ? WHERE LOWER(email) = LOWER(?) AND academy_id = ? AND user_id IS NULL`,
    [userId, email.trim(), academyId]
  );
}
