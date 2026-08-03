const mysql = require('mysql2/promise');
require('dotenv').config();

const nameFixes = [
  ['feaa9fa9-de7c-4aa6-8641-e9b4dab920d2', 'Fernando Henrique Castellani Assis'],
  ['usr_8gy7rfjpt', 'Rodrigo Takiy'],
  ['bff740ab-90eb-423b-a8e6-81eb122a7d87', 'Daniel Caravanti de Lima'],
  ['ffd1d447-889f-415d-bc5d-0f4ad7a69666', 'Clóvis Eduardo da Silva'],
  ['d5237b1f-7af2-4389-87aa-0cf00808e193', 'Emanuel dos Santos Leite'],
  ['a44ca42e-6e77-433c-aef3-d39c6f5137cf', 'Edilaine Eugenia Martins'],
  ['462f64a0-c5e4-4d94-8ad2-5565722a8470', 'Anderson Batista Delgadilho'],
  ['cc7e7984-252c-4ab3-9c44-0958037021bf', 'Lael Marcos Nunes'],
  ['139e58e9-1990-4d1a-a63c-c69772aeb8fc', 'Lorenna Mendes de Oliveira'],
  ['59687c98-78e8-4fa7-a5fa-71f5d3acc8cd', 'Pedro Alves Garcia'],
  ['49528d9a-0031-4f1c-aac0-beeaa7ed5e97', 'Davi Lucca Rodrigues Diogo  Costa'],
];

const LUIS_USER_ID = '7447b6e2-b272-44e2-93e9-b138b0ce7a65';
const MIGUEL_STUDENT_ID = 'a00bdbab-8b2a-40af-b56e-821c11fe1306';
const LUIS_NAME = 'Luis Gustavo Gomes';
const LUIS_EMAIL = 'luisggg424@gmail.com';

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST, port: process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  await conn.beginTransaction();
  try {
    for (const [userId, name] of nameFixes) {
      const [r] = await conn.query('UPDATE users SET name = ? WHERE id = ?', [name, userId]);
      console.log(`users.name -> "${name}" (id=${userId}) | affected=${r.affectedRows}`);
    }

    const [r1] = await conn.query(
      'UPDATE students SET user_id = NULL, guardian_name = ?, guardian_email = ? WHERE id = ?',
      [LUIS_NAME, LUIS_EMAIL, MIGUEL_STUDENT_ID]
    );
    console.log(`students (Miguel) desvinculado + guardian_name/email setados | affected=${r1.affectedRows}`);

    const [r2] = await conn.query("UPDATE users SET role = 'guardian' WHERE id = ?", [LUIS_USER_ID]);
    console.log(`users.role -> guardian (Luis) | affected=${r2.affectedRows}`);

    const [r3] = await conn.query(
      'INSERT INTO guardianships (id, guardian_user_id, student_id, relation, created_at) VALUES (UUID(), ?, ?, NULL, NOW())',
      [LUIS_USER_ID, MIGUEL_STUDENT_ID]
    );
    console.log(`guardianships inserido | affected=${r3.affectedRows}`);

    await conn.commit();
    console.log('\nTRANSAÇÃO CONFIRMADA (COMMIT).');
  } catch (err) {
    await conn.rollback();
    console.error('ERRO — ROLLBACK executado:', err.message);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
})();
