/**
 * Migração (Fase 3 do PLANO_GRADUACAO.md): backfill de dados para o novo modelo de
 * Esportes/Faixas configuráveis.
 *
 * - academies.sport_id: preenche com o esporte Jiu-Jitsu para toda academia ainda sem esporte.
 * - students.belt_rank_id / instructors.belt_rank_id: casa o nome da faixa atual (ENUM `belt`)
 *   com a linha correspondente em belt_ranks, dentro do esporte da academia.
 * - graduation_history.previous_belt_rank_id / belt_rank_id: idem, por nome, best-effort
 *   (fica NULL onde não houver correspondência exata — as colunas de texto continuam
 *   valendo como registro histórico).
 * - academy_belt_settings: explode o JSON antigo `academies.graduation_rules` (baldes
 *   kids/white/intermediate/black) em uma linha por faixa individual (D4 do plano).
 *   Resolução do caso da faixa Branca (compartilhada por 2 baldes hoje, kids e white):
 *   usa o valor do balde `white` como padrão inicial (nome do balde corresponde ao nome
 *   da faixa) — admin ajusta depois pela nova tela de configuração se quiser diferenciar.
 *   Academias com mode='hours' são puladas (modo descontinuado, D5) — logadas para revisão manual.
 *
 * Aditivo: nenhuma coluna/tabela antiga é alterada ou removida. `belt` (ENUM) e
 * `graduation_rules` (JSON) continuam sendo escritos/lidos normalmente pelas rotas
 * existentes — este script só populam as colunas novas em paralelo.
 *
 * Idempotente — pode ser executado mais de uma vez sem duplicar nada (usa `WHERE ... IS NULL`
 * nos backfills e `ON DUPLICATE KEY UPDATE` no academy_belt_settings).
 *
 * Executar UMA VEZ no banco de dados existente (depois de migrate_belt_ranks_schema.ts):
 *   npx ts-node src/scripts/migrate_belt_ranks_backfill.ts
 */
import mysql from 'mysql2/promise';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config({ path: `${__dirname}/../../.env` });

// Mesma categorização de baldes usada hoje em services/graduation.ts (isReadyForGraduation),
// para decidir de qual balde antigo cada faixa herda o valor inicial.
const KIDS_BELT_NAMES = [
  'Cinza e Branca', 'Cinza', 'Cinza e Preta',
  'Amarela e Branca', 'Amarela', 'Amarela e Preta',
  'Laranja e Branca', 'Laranja', 'Laranja e Preta',
  'Verde e Branca', 'Verde', 'Verde e Preta',
];
const INTERMEDIATE_BELT_NAMES = ['Azul', 'Roxa', 'Marrom'];

type BeltRankRow = { id: string; name: string; sport_id: string };

function resolveBucket(beltName: string): 'kids' | 'white' | 'intermediate' | 'black' | null {
  if (KIDS_BELT_NAMES.includes(beltName)) return 'kids';
  if (beltName === 'Branca') return 'white';
  if (INTERMEDIATE_BELT_NAMES.includes(beltName)) return 'intermediate';
  if (beltName === 'Preta') return 'black';
  return null; // Coral/Vermelha — sem balde antigo, sem critério configurável (degree_count=0)
}

async function main() {
  const pool = await mysql.createConnection({
    host:     process.env.DB_HOST     ?? 'localhost',
    port:     Number(process.env.DB_PORT ?? 3306),
    user:     process.env.DB_USER     ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME     ?? 'nexdojo',
  });

  console.log('Conectando ao banco...');

  // 1. academies.sport_id — backfill para o Jiu-Jitsu (único esporte hoje)
  const [sportRows] = await pool.execute<any[]>(`SELECT id FROM sports WHERE slug = 'jiu-jitsu' LIMIT 1`);
  if (!sportRows[0]) {
    throw new Error('Esporte Jiu-Jitsu não encontrado — rode migrate_belt_ranks_schema.ts primeiro.');
  }
  const jiuJitsuSportId = sportRows[0].id;

  const [academyBackfill] = await pool.execute<any>(
    `UPDATE academies SET sport_id = ? WHERE sport_id IS NULL`,
    [jiuJitsuSportId]
  );
  console.log(`academies.sport_id preenchido em ${(academyBackfill as any).affectedRows} linha(s).`);

  const [beltRankRows] = await pool.execute<any[]>(
    `SELECT id, name, sport_id FROM belt_ranks WHERE sport_id = ?`,
    [jiuJitsuSportId]
  );
  const beltRanksByName = new Map<string, BeltRankRow>((beltRankRows as BeltRankRow[]).map(r => [r.name, r]));

  // 2. students.belt_rank_id / instructors.belt_rank_id — por nome, dentro do esporte da academia
  const [studentsBackfill] = await pool.execute<any>(
    `UPDATE students s
     JOIN academies a ON a.id = s.academy_id
     JOIN belt_ranks br ON br.sport_id = a.sport_id AND br.name = s.belt
     SET s.belt_rank_id = br.id
     WHERE s.belt_rank_id IS NULL`
  );
  console.log(`students.belt_rank_id preenchido em ${(studentsBackfill as any).affectedRows} linha(s).`);

  const [orphanStudents] = await pool.execute<any[]>(
    `SELECT COUNT(*) AS count FROM students WHERE belt_rank_id IS NULL`
  );
  const orphanStudentsCount = orphanStudents[0]?.count ?? 0;
  if (orphanStudentsCount > 0) {
    console.warn(`AVISO: ${orphanStudentsCount} aluno(s) ficaram sem belt_rank_id (nome de faixa sem correspondência) — revisar manualmente.`);
  }

  const [instructorsBackfill] = await pool.execute<any>(
    `UPDATE instructors i
     JOIN academies a ON a.id = i.academy_id
     JOIN belt_ranks br ON br.sport_id = a.sport_id AND br.name = i.belt
     SET i.belt_rank_id = br.id
     WHERE i.belt_rank_id IS NULL`
  );
  console.log(`instructors.belt_rank_id preenchido em ${(instructorsBackfill as any).affectedRows} linha(s).`);

  // 3. graduation_history — best-effort por nome (fica NULL onde não casar; texto continua autoritativo)
  const [ghPrevBackfill] = await pool.execute<any>(
    `UPDATE graduation_history gh
     JOIN students s ON s.id = gh.student_id
     JOIN academies a ON a.id = s.academy_id
     JOIN belt_ranks br ON br.sport_id = a.sport_id AND br.name = gh.previous_belt
     SET gh.previous_belt_rank_id = br.id
     WHERE gh.previous_belt_rank_id IS NULL AND gh.previous_belt IS NOT NULL`
  );
  console.log(`graduation_history.previous_belt_rank_id preenchido em ${(ghPrevBackfill as any).affectedRows} linha(s).`);

  const [ghNewBackfill] = await pool.execute<any>(
    `UPDATE graduation_history gh
     JOIN students s ON s.id = gh.student_id
     JOIN academies a ON a.id = s.academy_id
     JOIN belt_ranks br ON br.sport_id = a.sport_id AND br.name = gh.new_belt
     SET gh.belt_rank_id = br.id
     WHERE gh.belt_rank_id IS NULL AND gh.new_belt IS NOT NULL`
  );
  console.log(`graduation_history.belt_rank_id preenchido em ${(ghNewBackfill as any).affectedRows} linha(s).`);

  // 4. academy_belt_settings — explode graduation_rules (JSON por balde) em 1 linha por faixa
  const [academiesWithRules] = await pool.execute<any[]>(
    `SELECT id, graduation_rules FROM academies WHERE graduation_rules IS NOT NULL`
  );

  let academiesMigrated = 0;
  let academiesSkippedHours = 0;
  let settingsRowsWritten = 0;

  for (const academy of academiesWithRules as any[]) {
    let rules: any;
    try {
      rules = typeof academy.graduation_rules === 'string' ? JSON.parse(academy.graduation_rules) : academy.graduation_rules;
    } catch {
      console.warn(`AVISO: academia ${academy.id} tem graduation_rules inválido (JSON malformado) — pulando.`);
      continue;
    }
    if (!rules || typeof rules !== 'object') continue;

    if (rules.mode === 'hours') {
      console.warn(`AVISO: academia ${academy.id} usa modo 'hours' (descontinuado) — sem migração automática, revisar manualmente.`);
      academiesSkippedHours++;
      continue;
    }

    const mode: 'classes' | 'months' = rules.mode === 'months' ? 'months' : 'classes';

    for (const [beltName, beltRank] of beltRanksByName) {
      const bucket = resolveBucket(beltName);
      if (!bucket) continue; // Coral/Vermelha — sem critério

      // Gravado pelo backend como veio do frontend (interceptor axios manda snake_case) —
      // confirmado inspecionando academies.graduation_rules diretamente no QAS.
      const bucketRules = rules[bucket];
      const rawThreshold = bucketRules?.stripe_threshold;
      if (!bucketRules || rawThreshold == null) continue;

      const threshold = Number(rawThreshold);
      const warnBefore = bucketRules.warn_before != null ? Number(bucketRules.warn_before) : null;

      const monthsRequired  = mode === 'months'  ? threshold : null;
      const classesRequired = mode === 'classes' ? threshold : null;
      const warnBeforeMonths  = mode === 'months'  ? warnBefore : null;
      const warnBeforeClasses = mode === 'classes' ? warnBefore : null;

      await pool.execute(
        `INSERT INTO academy_belt_settings
           (id, academy_id, belt_rank_id, months_required, classes_required, warn_before_months, warn_before_classes)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           months_required = VALUES(months_required),
           classes_required = VALUES(classes_required),
           warn_before_months = VALUES(warn_before_months),
           warn_before_classes = VALUES(warn_before_classes)`,
        [crypto.randomUUID(), academy.id, beltRank.id, monthsRequired, classesRequired, warnBeforeMonths, warnBeforeClasses]
      );
      settingsRowsWritten++;
    }
    academiesMigrated++;
  }
  console.log(`academy_belt_settings: ${settingsRowsWritten} linha(s) escritas para ${academiesMigrated} academia(s) (${academiesSkippedHours} pulada(s) por usar modo 'hours').`);

  // 5. NOT NULL — só trava a coluna se o backfill cobriu 100% dos registros.
  // FOREIGN_KEY_CHECKS precisa ficar desligado durante o MODIFY: esta versão do MySQL
  // recusa alterar uma coluna que participa de uma FK mesmo só mudando a nulidade
  // (ER_FK_COLUMN_CANNOT_CHANGE) — os dados já satisfazem a FK, é só checagem de metadado.
  await pool.execute('SET FOREIGN_KEY_CHECKS = 0');

  const [remainingNullAcademies] = await pool.execute<any[]>(`SELECT COUNT(*) AS count FROM academies WHERE sport_id IS NULL`);
  if ((remainingNullAcademies[0] as any).count === 0) {
    await pool.execute(`ALTER TABLE academies MODIFY sport_id VARCHAR(36) NOT NULL`);
    console.log('academies.sport_id agora é NOT NULL.');
  } else {
    console.warn(`AVISO: ${(remainingNullAcademies[0] as any).count} academia(s) sem sport_id — coluna mantida nullable.`);
  }

  const [remainingNullStudents] = await pool.execute<any[]>(`SELECT COUNT(*) AS count FROM students WHERE belt_rank_id IS NULL`);
  if ((remainingNullStudents[0] as any).count === 0) {
    await pool.execute(`ALTER TABLE students MODIFY belt_rank_id VARCHAR(36) NOT NULL`);
    console.log('students.belt_rank_id agora é NOT NULL.');
  } else {
    console.warn(`AVISO: ${(remainingNullStudents[0] as any).count} aluno(s) sem belt_rank_id — coluna mantida nullable.`);
  }

  const [remainingNullInstructors] = await pool.execute<any[]>(`SELECT COUNT(*) AS count FROM instructors WHERE belt_rank_id IS NULL`);
  if ((remainingNullInstructors[0] as any).count === 0) {
    await pool.execute(`ALTER TABLE instructors MODIFY belt_rank_id VARCHAR(36) NOT NULL`);
    console.log('instructors.belt_rank_id agora é NOT NULL.');
  } else {
    console.warn(`AVISO: ${(remainingNullInstructors[0] as any).count} instrutor(es) sem belt_rank_id — coluna mantida nullable.`);
  }

  await pool.execute('SET FOREIGN_KEY_CHECKS = 1');

  await pool.end();
  console.log('Backfill finalizado com sucesso!');
}

main().catch((err) => {
  console.error('Erro no backfill:', err);
  process.exit(1);
});
