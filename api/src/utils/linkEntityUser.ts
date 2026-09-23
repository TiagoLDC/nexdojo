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
 * Bloqueia a conta de login de uma ficha recém-excluída — mas só quando a conta pertence
 * exclusivamente àquela pessoa. Retorna se bloqueou, para o audit_log registrar o motivo.
 *
 * O DELETE bloqueava a conta direto pelo entity.user_id, e isso derrubou o acesso de uma
 * responsável no PRD (19/09/2026): a ficha do filho, cadastrada com o e-mail da mãe, tinha
 * sido vinculada à conta `guardian` dela pelo auto-link antigo — que só passou a exigir o
 * role "dono" depois. Excluir o aluno bloqueou a mãe, que ficou sem entrar no sistema mesmo
 * com o filho recadastrado e ativo.
 *
 * Três guardas, todas checadas DEPOIS que a ficha já saiu da tabela:
 *  - a conta precisa ser do role "dono" da tabela (nunca guardian/admin/superuser);
 *  - não pode sobrar nenhuma outra ficha (aluno, instrutor ou colaborador) apontando pra ela;
 *  - não pode ser responsável por ninguém — bloquear tiraria o acesso ao filho de outra pessoa.
 */
export async function blockEntityUserIfExclusive(
  table: 'students' | 'instructors' | 'staff',
  userId: string,
  academyId: string
): Promise<boolean> {
  if (!userId) return false;

  const [userRows] = await pool.execute<any[]>(
    'SELECT role FROM users WHERE id = ? AND academy_id = ?',
    [userId, academyId]
  );
  if (userRows[0]?.role !== TABLE_OWNER_ROLE[table]) return false;

  const [countRows] = await pool.execute<any[]>(
    `SELECT
       (SELECT COUNT(*) FROM students    WHERE user_id = ?) +
       (SELECT COUNT(*) FROM instructors WHERE user_id = ?) +
       (SELECT COUNT(*) FROM staff       WHERE user_id = ?) AS fichas,
       (SELECT COUNT(*) FROM guardianships WHERE guardian_user_id = ?) AS dependentes`,
    [userId, userId, userId, userId]
  );
  if (countRows[0].fichas > 0 || countRows[0].dependentes > 0) return false;

  await pool.execute(
    `UPDATE users SET status = 'Blocked' WHERE id = ? AND academy_id = ?`,
    [userId, academyId]
  );
  return true;
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
