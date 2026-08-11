/**
 * Migração: cria a estrutura de Esportes/Faixas configuráveis (sports, belt_ranks,
 * academy_belt_settings), as colunas de referência (sport_id / belt_rank_id) e
 * semeia o template padrão de Jiu-Jitsu.
 *
 * Fase 1 do PLANO_GRADUACAO.md — só schema + seed do template. Aditivo: nenhuma
 * coluna/tabela antiga (students.belt ENUM, academies.graduation_rules JSON) é
 * alterada ou removida. O backfill de sport_id/belt_rank_id nos dados já
 * cadastrados é feito na Fase 3 (script separado), rodar depois deste.
 *
 * Idempotente — pode ser executado mais de uma vez sem duplicar nada.
 *
 * Executar UMA VEZ no banco de dados existente:
 *   npx ts-node src/scripts/migrate_belt_ranks_schema.ts
 */
import mysql from 'mysql2/promise';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config({ path: `${__dirname}/../../.env` });

type BeltCategory = 'kids' | 'adult' | 'both';

const JIU_JITSU_BELTS: Array<{
  name: string;
  colorKey: string;
  orderIndex: number;
  degreeCount: number;
  category: BeltCategory;
  minAge: number | null;
}> = [
  { name: 'Branca',           colorKey: 'WHITE',        orderIndex: 0,  degreeCount: 4, category: 'both',  minAge: null },
  { name: 'Cinza e Branca',   colorKey: 'GREY_WHITE',   orderIndex: 1,  degreeCount: 4, category: 'kids',  minAge: null },
  { name: 'Cinza',            colorKey: 'GREY',         orderIndex: 2,  degreeCount: 4, category: 'kids',  minAge: null },
  { name: 'Cinza e Preta',    colorKey: 'GREY_BLACK',   orderIndex: 3,  degreeCount: 4, category: 'kids',  minAge: null },
  { name: 'Amarela e Branca', colorKey: 'YELLOW_WHITE', orderIndex: 4,  degreeCount: 4, category: 'kids',  minAge: null },
  { name: 'Amarela',          colorKey: 'YELLOW',       orderIndex: 5,  degreeCount: 4, category: 'kids',  minAge: null },
  { name: 'Amarela e Preta',  colorKey: 'YELLOW_BLACK', orderIndex: 6,  degreeCount: 4, category: 'kids',  minAge: null },
  { name: 'Laranja e Branca', colorKey: 'ORANGE_WHITE', orderIndex: 7,  degreeCount: 4, category: 'kids',  minAge: null },
  { name: 'Laranja',          colorKey: 'ORANGE',       orderIndex: 8,  degreeCount: 4, category: 'kids',  minAge: null },
  { name: 'Laranja e Preta',  colorKey: 'ORANGE_BLACK', orderIndex: 9,  degreeCount: 4, category: 'kids',  minAge: null },
  { name: 'Verde e Branca',   colorKey: 'GREEN_WHITE',  orderIndex: 10, degreeCount: 4, category: 'kids',  minAge: null },
  { name: 'Verde',            colorKey: 'GREEN',        orderIndex: 11, degreeCount: 4, category: 'kids',  minAge: null },
  { name: 'Verde e Preta',    colorKey: 'GREEN_BLACK',  orderIndex: 12, degreeCount: 4, category: 'kids',  minAge: null },
  { name: 'Azul',             colorKey: 'BLUE',         orderIndex: 13, degreeCount: 4, category: 'adult', minAge: 16 },
  { name: 'Roxa',             colorKey: 'PURPLE',       orderIndex: 14, degreeCount: 4, category: 'adult', minAge: 16 },
  { name: 'Marrom',           colorKey: 'BROWN',        orderIndex: 15, degreeCount: 4, category: 'adult', minAge: 18 },
  { name: 'Preta',            colorKey: 'BLACK',        orderIndex: 16, degreeCount: 6, category: 'adult', minAge: 19 },
  { name: 'Coral',            colorKey: 'CORAL',        orderIndex: 17, degreeCount: 0, category: 'adult', minAge: null },
  { name: 'Vermelha',         colorKey: 'RED',          orderIndex: 18, degreeCount: 0, category: 'adult', minAge: null },
];

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

  const addForeignKey = async (table: string, constraintName: string, ddl: string) => {
    try {
      await pool.execute(`ALTER TABLE ${table} ADD CONSTRAINT ${constraintName} ${ddl}`);
      console.log(`FK ${constraintName} adicionada.`);
    } catch (e: any) {
      if (e.code === 'ER_FK_DUP_NAME' || e.errno === 1826) {
        console.log(`FK ${constraintName} já existe, pulando.`);
      } else {
        throw e;
      }
    }
  };

  // 1. Tabelas novas
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS sports (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      slug VARCHAR(100) NOT NULL UNIQUE,
      active TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('Tabela sports OK.');

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS belt_ranks (
      id VARCHAR(36) PRIMARY KEY,
      sport_id VARCHAR(36) NOT NULL,
      name VARCHAR(100) NOT NULL,
      color_key VARCHAR(50) NOT NULL,
      order_index INT NOT NULL,
      degree_count TINYINT NOT NULL DEFAULT 4,
      category ENUM('kids','adult','both') NOT NULL DEFAULT 'adult',
      min_age INT NULL,
      max_age INT NULL,
      FOREIGN KEY (sport_id) REFERENCES sports(id) ON DELETE CASCADE,
      UNIQUE (sport_id, order_index)
    )
  `);
  console.log('Tabela belt_ranks OK.');

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS academy_belt_settings (
      id VARCHAR(36) PRIMARY KEY,
      academy_id VARCHAR(36) NOT NULL,
      belt_rank_id VARCHAR(36) NOT NULL,
      months_required INT NULL,
      classes_required INT NULL,
      warn_before_months INT NULL,
      warn_before_classes INT NULL,
      FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
      FOREIGN KEY (belt_rank_id) REFERENCES belt_ranks(id) ON DELETE CASCADE,
      UNIQUE (academy_id, belt_rank_id)
    )
  `);
  console.log('Tabela academy_belt_settings OK.');

  // 2. Colunas novas (nullable — backfill fica para a Fase 3)
  await addColumn('academies', `sport_id VARCHAR(36) NULL COMMENT 'Definido só na criação da academia — imutável depois (ver PLANO_GRADUACAO.md D6)' AFTER graduation_rules`, 'academies.sport_id');
  await addColumn('students', `belt_rank_id VARCHAR(36) NULL AFTER belt`, 'students.belt_rank_id');
  await addColumn('instructors', `belt_rank_id VARCHAR(36) NULL AFTER belt`, 'instructors.belt_rank_id');
  await addColumn('graduation_history', `previous_belt_rank_id VARCHAR(36) NULL AFTER previous_belt`, 'graduation_history.previous_belt_rank_id');
  await addColumn('graduation_history', `belt_rank_id VARCHAR(36) NULL AFTER new_belt`, 'graduation_history.belt_rank_id');

  // 3. Foreign keys (nomeadas para a checagem de idempotência funcionar em reruns).
  // academies.sport_id / students.belt_rank_id / instructors.belt_rank_id usam RESTRICT
  // (não SET NULL) de propósito: essas colunas devem poder se tornar NOT NULL depois do
  // backfill (Fase 3), e o MySQL proíbe NOT NULL numa coluna cuja FK é ON DELETE SET NULL.
  // graduation_history é só snapshot histórico — não vira NOT NULL, então mantém SET NULL.
  await addForeignKey('academies', 'fk_academies_sport', 'FOREIGN KEY (sport_id) REFERENCES sports(id) ON DELETE RESTRICT');
  await addForeignKey('students', 'fk_students_belt_rank', 'FOREIGN KEY (belt_rank_id) REFERENCES belt_ranks(id) ON DELETE RESTRICT');
  await addForeignKey('instructors', 'fk_instructors_belt_rank', 'FOREIGN KEY (belt_rank_id) REFERENCES belt_ranks(id) ON DELETE RESTRICT');
  await addForeignKey('graduation_history', 'fk_graduation_history_prev_belt_rank', 'FOREIGN KEY (previous_belt_rank_id) REFERENCES belt_ranks(id) ON DELETE SET NULL');
  await addForeignKey('graduation_history', 'fk_graduation_history_belt_rank', 'FOREIGN KEY (belt_rank_id) REFERENCES belt_ranks(id) ON DELETE SET NULL');

  // 4. Seed do template Jiu-Jitsu (idempotente)
  const [existingSport] = await pool.execute<any[]>(`SELECT id FROM sports WHERE slug = 'jiu-jitsu' LIMIT 1`);
  let sportId: string;
  if (existingSport.length > 0) {
    sportId = existingSport[0].id;
    console.log('Esporte Jiu-Jitsu já existe, pulando criação do esporte.');
  } else {
    sportId = crypto.randomUUID();
    await pool.execute(`INSERT INTO sports (id, name, slug, active) VALUES (?, 'Jiu-Jitsu', 'jiu-jitsu', 1)`, [sportId]);
    console.log('Esporte Jiu-Jitsu criado.');
  }

  const [existingRanks] = await pool.execute<any[]>(`SELECT COUNT(*) AS count FROM belt_ranks WHERE sport_id = ?`, [sportId]);
  const rankCount = existingRanks[0]?.count ?? 0;
  if (rankCount > 0) {
    console.log(`Template de faixas já semeado (${rankCount} faixas), pulando.`);
  } else {
    for (const belt of JIU_JITSU_BELTS) {
      await pool.execute(
        `INSERT INTO belt_ranks (id, sport_id, name, color_key, order_index, degree_count, category, min_age) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [crypto.randomUUID(), sportId, belt.name, belt.colorKey, belt.orderIndex, belt.degreeCount, belt.category, belt.minAge],
      );
    }
    console.log(`${JIU_JITSU_BELTS.length} faixas do template Jiu-Jitsu inseridas.`);
  }

  await pool.end();
  console.log('Migração finalizada com sucesso!');
}

main().catch((err) => {
  console.error('Erro na migração:', err);
  process.exit(1);
});
