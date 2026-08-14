import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

function getConnectionConfig() {
  const url = process.env.DATABASE_URL;
  if (url) {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: Number(parsed.port) || 3306,
      user: parsed.username,
      password: parsed.password,
      database: parsed.pathname.slice(1),
    };
  }
  return {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  };
}

const pool = mysql.createPool({
  ...getConnectionConfig(),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+00:00',
  enableKeepAlive: true,
  keepAliveInitialDelay: 30000,
  dateStrings: ['DATE'],
  // Colunas TINYINT(1) (flags booleanas: kimono_loan_enabled, active, requires_password_change, etc.)
  // chegam do driver como número (0/1), não boolean. Isso fazia `flag && <JSX/>` renderizar um "0"
  // solto na tela quando a flag estava desligada (React não suprime números falsy como suprime false).
  // Convertendo aqui, na origem, o valor chega como boolean de verdade em toda a aplicação.
  typeCast: (field, next) => {
    if (field.type === 'TINY' && field.length === 1) {
      const value = field.string();
      return value === null ? null : value === '1';
    }
    return next();
  },
});

export default pool;
