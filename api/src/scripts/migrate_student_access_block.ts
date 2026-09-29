/**
 * Migração: adiciona students.access_blocked — a marca de bloqueio deliberado do acesso.
 *
 * Até aqui, bloquear alguém era gravar status='Inactive', o mesmo valor que significa "parou
 * de treinar". Com isso, quem o admin bloqueava de propósito aparecia no card do dashboard e
 * no relatório de alunos inativados, recebendo a mensagem de "volte aos treinos" — e ainda por
 * cima no topo da lista, que é ordenada pelo afastamento mais recente. A coluna separa as duas
 * coisas: status continua descrevendo a matrícula, access_blocked registra o bloqueio.
 *
 * O backfill marca quem já estava bloqueado pela conta de login (users.status='Blocked'), que
 * era o único bloqueio possível antes desta mudança.
 *
 * Executar UMA VEZ em cada banco (QAS e PRD):
 *   npx ts-node src/scripts/migrate_student_access_block.ts
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: `${__dirname}/../../.env` });

async function main() {
  const pool = await mysql.createConnection({
    host:     process.env.DB_HOST     ?? 'localhost',
    port:     Number(process.env.DB_PORT ?? 3306),
    user:     process.env.DB_USER     ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME     ?? 'nexdojo',
  });

  console.log('Conectando ao banco...');

  try {
    await pool.execute(
      `ALTER TABLE students ADD COLUMN access_blocked TINYINT(1) NOT NULL DEFAULT 0 AFTER status`
    );
    console.log('Coluna access_blocked adicionada.');
  } catch (e: any) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      console.log('Coluna access_blocked já existe, pulando.');
    } else {
      throw e;
    }
  }

  // Backfill: quem tem conta de login bloqueada foi bloqueado de propósito pelo admin.
  const [result] = await pool.execute<any>(`
    UPDATE students s
    JOIN users u ON u.id = s.user_id
    SET s.access_blocked = 1
    WHERE u.status = 'Blocked'
  `);
  console.log(`Backfill concluído: ${result.affectedRows} aluno(s) marcado(s) como bloqueado(s).`);

  await pool.end();
  console.log('Migração finalizada com sucesso!');
}

main().catch((err) => {
  console.error('Erro na migração:', err);
  process.exit(1);
});
