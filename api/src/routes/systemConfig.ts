import { Router, Request, Response, NextFunction } from 'express';
import pool from '../db';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { sendMail } from '../utils/mailer';

const router = Router();

const ALLOWED_KEYS = [
  'smtp_host',
  'smtp_port',
  'smtp_user',
  'smtp_pass',
  'smtp_from_name',
  'smtp_from_email',
  'smtp_secure',
];

const PASS_MASK = '***';

// GET /api/system-config — retorna todas as configs (senha mascarada)
router.get('/', requireAuth, requireRole('superuser'), async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [rows] = await pool.execute<any[]>(
      `SELECT \`key\`, value FROM system_config WHERE \`key\` IN (${ALLOWED_KEYS.map(() => '?').join(',')})`,
      ALLOWED_KEYS
    );

    const cfg: Record<string, string> = {};
    for (const k of ALLOWED_KEYS) cfg[k] = '';
    for (const row of rows) cfg[row.key] = row.value ?? '';

    const smtpPassSet = !!cfg.smtp_pass;
    cfg.smtp_pass = smtpPassSet ? PASS_MASK : '';

    res.json({ config: cfg, smtpPassSet });
  } catch (err) {
    next(err);
  }
});

// PUT /api/system-config — salva/atualiza batch de configs (upsert)
router.put('/', requireAuth, requireRole('superuser'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const body = req.body ?? {};
  const entries: [string, string][] = [];

  for (const key of ALLOWED_KEYS) {
    if (!(key in body)) continue;
    // Senha mascarada (***) significa "não alterar"
    if (key === 'smtp_pass' && body[key] === PASS_MASK) continue;
    entries.push([key, String(body[key] ?? '')]);
  }

  if (!entries.length) {
    res.status(400).json({ error: 'Nenhum campo válido para atualizar' });
    return;
  }

  try {
    for (const [key, value] of entries) {
      await pool.execute(
        'INSERT INTO system_config (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)',
        [key, value]
      );
    }
    res.json({ message: 'Configurações salvas com sucesso' });
  } catch (err) {
    next(err);
  }
});

// POST /api/system-config/smtp/test — envia e-mail de teste para o superuser logado
router.post('/smtp/test', requireAuth, requireRole('superuser'), async (req: Request, res: Response): Promise<void> => {
  try {
    const [rows] = await pool.execute<any[]>('SELECT email, name FROM users WHERE id = ?', [req.user!.userId]);
    const user = rows[0];
    if (!user?.email) {
      res.status(400).json({ ok: false, message: 'Usuário sem e-mail cadastrado' });
      return;
    }

    await sendMail({
      to: user.email,
      subject: 'NexDojo — Teste de SMTP',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 24px; color: #1f2937;">
          <h2 style="color: #4f46e5;">Teste de SMTP — NexDojo</h2>
          <p>Olá, <strong>${user.name}</strong>.</p>
          <p>Este é um e-mail de teste para validar as configurações de SMTP do sistema.</p>
          <p>Se você recebeu esta mensagem, suas configurações estão funcionando corretamente.</p>
          <hr style="border:none; border-top:1px solid #e5e7eb; margin: 24px 0;" />
          <p style="font-size: 12px; color: #6b7280;">NexDojo — Sistema de Gestão para Academias</p>
        </div>
      `,
    });

    res.json({ ok: true, message: `E-mail de teste enviado para ${user.email}` });
  } catch (err: any) {
    res.status(500).json({ ok: false, message: err?.message || 'Falha ao enviar e-mail de teste' });
  }
});

export default router;
