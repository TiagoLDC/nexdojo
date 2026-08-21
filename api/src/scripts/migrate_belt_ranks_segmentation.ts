/**
 * Migração: adiciona suporte a critério de graduação segmentado por idade
 * (Faixa Branca: infantil vs adulto) e por grupo de grau (Faixa Preta: 1º-3º vs
 * 4º-6º grau), além de dias fracionados no campo "meses necessários".
 *
 * Aditivo — nenhuma faixa que hoje tem 1 critério muda de comportamento até o
 * admin decidir segmentá-la (todas as colunas novas nascem NULL).
 *
 * Remove o UNIQUE(academy_id, belt_rank_id) de academy_belt_settings (uma faixa
 * passa a poder ter mais de 1 linha) e o substitui por um índice não-único
 * equivalente, para manter a performance de busca sem impedir múltiplas linhas.
 *
 * Idempotente — pode ser executado mais de uma vez sem duplicar nada.
 *
 * Executar UMA VEZ no banco de dados existente:
 *   npx ts-node src/scripts/migrate_belt_ranks_segmentation.ts
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: `${__dirname}/../../.env` });

async function main() {
  const pool = await mysql.createConnection({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'nexdojo',
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

  // 1. Colunas novas em sports e academy_belt_settings (todas nullable)
  await addColumn('sports', `youth_max_age INT NULL COMMENT 'Idade limite (inclusive) do critério infanto-juvenil' AFTER active`, 'sports.youth_max_age');
  await addColumn('academy_belt_settings', `months_required_days TINYINT UNSIGNED NULL COMMENT 'Dias (0-29) complementares a months_required' AFTER months_required`, 'academy_belt_settings.months_required_days');
  await addColumn('academy_belt_settings', `age_segment ENUM('under_limit','over_limit') NULL COMMENT 'NULL = linha não segmentada por idade' AFTER classes_required`, 'academy_belt_settings.age_segment');
  await addColumn('academy_belt_settings', `degree_segment_min TINYINT UNSIGNED NULL AFTER age_segment`, 'academy_belt_settings.degree_segment_min');
  await addColumn('academy_belt_settings', `degree_segment_max TINYINT UNSIGNED NULL COMMENT 'NULL nos dois campos de grau = linha não segmentada por grau' AFTER degree_segment_min`, 'academy_belt_settings.degree_segment_max');

  // 2. Troca do UNIQUE(academy_id, belt_rank_id) por um índice não-único — uma faixa
  // agora pode ter mais de 1 linha (segmentada por idade ou por grau). Cria primeiro o
  // índice novo (não-único) — o MySQL recusa dropar o unique antigo se ele for a única
  // estrutura de índice apoiando a FK de academy_id, então a ordem importa: só depois de
  // idx_academy_belt existir como alternativa o DROP do unique consegue funcionar.
  try {
    await pool.execute(`CREATE INDEX idx_academy_belt ON academy_belt_settings (academy_id, belt_rank_id)`);
    console.log('Índice idx_academy_belt criado.');
  } catch (e: any) {
    if (e.code === 'ER_DUP_KEYNAME') {
      console.log('Índice idx_academy_belt já existe, pulando.');
    } else {
      throw e;
    }
  }

  // Descobre o nome real do unique index existente em vez de assumir (índices inline de
  // CREATE TABLE sem nome explícito recebem o nome da 1ª coluna, mas não vale arriscar).
  const [uniqueIndexRows] = await pool.execute<any[]>(
    `SELECT DISTINCT INDEX_NAME FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'academy_belt_settings'
       AND NON_UNIQUE = 0 AND INDEX_NAME != 'PRIMARY'`
  );
  for (const row of uniqueIndexRows) {
    try {
      await pool.execute(`DROP INDEX \`${row.INDEX_NAME}\` ON academy_belt_settings`);
      console.log(`Unique index ${row.INDEX_NAME} removido.`);
    } catch (e: any) {
      console.log(`Não foi possível remover o index ${row.INDEX_NAME} (${e.message}), verifique manualmente.`);
    }
  }

  await pool.end();
  console.log('Migração finalizada com sucesso!');
}

main().catch((err) => {
  console.error('Erro na migração:', err);
  process.exit(1);
});
