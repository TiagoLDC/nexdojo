/**
 * Migração: adiciona classes_since_graduation e hours_since_graduation à tabela students.
 * Executa backfill calculando presenças registradas após a última graduação de cada aluno.
 *
 * Executar UMA VEZ no banco de dados existente:
 *   npx ts-node src/scripts/migrate_graduation_counters.ts
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

  // 1. Adicionar colunas se não existirem
  try {
    await pool.execute(
      `ALTER TABLE students ADD COLUMN classes_since_graduation INT DEFAULT 0 AFTER total_hours`
    );
    console.log('Coluna classes_since_graduation adicionada.');
  } catch (e: any) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      console.log('Coluna classes_since_graduation já existe, pulando.');
    } else {
      throw e;
    }
  }

  try {
    await pool.execute(
      `ALTER TABLE students ADD COLUMN hours_since_graduation INT DEFAULT 0 AFTER classes_since_graduation`
    );
    console.log('Coluna hours_since_graduation adicionada.');
  } catch (e: any) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      console.log('Coluna hours_since_graduation já existe, pulando.');
    } else {
      throw e;
    }
  }

  // 2. Backfill: contar presenças desde a última graduação de cada aluno
  console.log('Iniciando backfill de classes_since_graduation e hours_since_graduation...');
  await pool.execute(`
    UPDATE students s
    SET
      s.classes_since_graduation = (
        SELECT COUNT(*)
        FROM attendance_records ar
        WHERE ar.student_id = s.id
          AND (s.last_graduation_date IS NULL OR ar.date > s.last_graduation_date)
      ),
      s.hours_since_graduation = (
        SELECT COALESCE(SUM(ROUND(ar.duration_minutes / 60)), 0)
        FROM attendance_records ar
        WHERE ar.student_id = s.id
          AND (s.last_graduation_date IS NULL OR ar.date > s.last_graduation_date)
      )
  `);
  console.log('Backfill concluído.');

  await pool.end();
  console.log('Migração finalizada com sucesso!');
}

main().catch((err) => {
  console.error('Erro na migração:', err);
  process.exit(1);
});
