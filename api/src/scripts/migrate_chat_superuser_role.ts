/**
 * Migração: permite que superusuário envie mensagens no Mural (chat).
 * A coluna chat_messages.sender_role era ENUM('admin','instructor','staff'),
 * mas a rota POST /api/chat também libera o papel 'superuser' — ao enviar,
 * o INSERT falhava com erro de truncamento de dados (500).
 *
 * Executar UMA VEZ no banco de dados existente:
 *   npx ts-node src/scripts/migrate_chat_superuser_role.ts
 */
import pool from '../db';

async function main() {
  console.log('Conectando ao banco...');

  await pool.execute(
    `ALTER TABLE chat_messages MODIFY COLUMN sender_role ENUM('superuser','admin','instructor','staff') NOT NULL`
  );
  console.log('Coluna chat_messages.sender_role atualizada para incluir \'superuser\'.');

  await pool.end();
  console.log('Migração finalizada com sucesso!');
}

main().catch((err) => {
  console.error('Erro na migração:', err);
  process.exit(1);
});
