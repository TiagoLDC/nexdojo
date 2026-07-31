/**
 * Migração: módulo de Empréstimo de Kimono.
 * - academies.kimono_loan_enabled: liga/desliga o módulo por academia.
 * - students.has_loaned_kimono / kimono_loan_date: flag rápida p/ ficha, lista e dashboard.
 * - instructors.has_loaned_kimono / kimono_loan_date: idem, para instrutores.
 * - kimono_loans: histórico (um registro por empréstimo, com data de devolução).
 *
 * Executar UMA VEZ no banco de dados existente:
 *   npx ts-node src/scripts/migrate_kimono_loans.ts
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

  const addColumn = async (table: string, ddl: string, label: string) => {
    try {
      await pool.execute(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
      console.log(`Coluna ${label} adicionada.`);
    } catch (e: any) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log(`Coluna ${label} já existe, pulando.`);
      } else {
        throw e;
      }
    }
  };

  await addColumn('academies', 'kimono_loan_enabled TINYINT(1) DEFAULT 0', 'academies.kimono_loan_enabled');
  await addColumn('students', 'has_loaned_kimono TINYINT(1) DEFAULT 0', 'students.has_loaned_kimono');
  await addColumn('students', 'kimono_loan_date DATE NULL', 'students.kimono_loan_date');
  await addColumn('instructors', 'has_loaned_kimono TINYINT(1) DEFAULT 0', 'instructors.has_loaned_kimono');
  await addColumn('instructors', 'kimono_loan_date DATE NULL', 'instructors.kimono_loan_date');

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS kimono_loans (
      id VARCHAR(36) PRIMARY KEY,
      academy_id VARCHAR(36) NOT NULL,
      person_type ENUM('student','instructor') NOT NULL,
      person_id VARCHAR(36) NOT NULL,
      borrowed_at DATE NOT NULL,
      returned_at DATE NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
      INDEX idx_kimono_loans_academy_active (academy_id, returned_at),
      INDEX idx_kimono_loans_person (person_type, person_id)
    )
  `);
  console.log('Tabela kimono_loans OK.');

  await pool.end();
  console.log('Migração finalizada com sucesso!');
}

main().catch((err) => {
  console.error('Erro na migração:', err);
  process.exit(1);
});
