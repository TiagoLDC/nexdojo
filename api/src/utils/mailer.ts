import nodemailer from 'nodemailer';
import pool from '../db';

export interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
  secure: boolean;
}

async function loadSmtpConfig(): Promise<SmtpConfig> {
  const KEYS = ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from_name', 'smtp_from_email', 'smtp_secure'];

  const [rows] = await pool.execute<any[]>(
    `SELECT \`key\`, value FROM system_config WHERE \`key\` IN (${KEYS.map(() => '?').join(',')})`,
    KEYS
  );

  const cfg: Record<string, string> = {};
  for (const row of rows) cfg[row.key] = row.value ?? '';

  if (!cfg.smtp_host || !cfg.smtp_user || !cfg.smtp_pass) {
    throw new Error('Configurações de SMTP não definidas. Acesse Configurações do Sistema para cadastrá-las.');
  }

  return {
    host:      cfg.smtp_host,
    port:      Number(cfg.smtp_port) || 587,
    user:      cfg.smtp_user,
    pass:      cfg.smtp_pass,
    fromName:  cfg.smtp_from_name  || 'NexDojo',
    fromEmail: cfg.smtp_from_email || cfg.smtp_user,
    secure:    cfg.smtp_secure === 'true',
  };
}

export async function sendMail(options: MailOptions): Promise<void> {
  const cfg = await loadSmtpConfig();

  const transporter = nodemailer.createTransport({
    host:   cfg.host,
    port:   cfg.port,
    secure: cfg.secure,
    auth: {
      user: cfg.user,
      pass: cfg.pass,
    },
  });

  await transporter.sendMail({
    from:    `"${cfg.fromName}" <${cfg.fromEmail}>`,
    to:      options.to,
    subject: options.subject,
    html:    options.html,
  });
}
