import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import pool from '../db';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { getAcademyId } from '../utils/academyScope';
import { logAudit } from '../utils/auditLog';
import { getTodayBrasilia } from '../utils/date';
import { registerDailyCheckIn, brasiliaDateTime } from '../utils/dailyCheckIn';

/**
 * Integração com a catraca (middleware NexDojo-Catraca, instalado no PC da academia).
 *
 * Duas famílias de rota:
 *  - /api/turnstile/*        → chamadas pelo middleware, com o token da credencial de integração
 *                              (requireTurnstile). Esse token NÃO abre nenhuma outra rota da API:
 *                              o requireAuth recusa tokens com kind 'turnstile'.
 *  - /api/turnstile/admin/*  → telas do admin no NexDojo (requireAuth + admin/superuser).
 *
 * A decisão de quem passa é tomada AQUI, não no middleware: ele só copia para a catraca o status
 * que esta API devolve. Assim a regra de inadimplência, a tolerância e as liberações temporárias
 * valem igual para todas as catracas e ficam auditáveis.
 */

const router = Router();

type PersonType = 'student' | 'instructor' | 'staff';
const PERSON_TYPES: PersonType[] = ['student', 'instructor', 'staff'];
const PERSON_TABLE: Record<PersonType, string> = { student: 'students', instructor: 'instructors', staff: 'staff' };
const SYNC_STATES = ['synced', 'no_photo', 'photo_rejected', 'error', 'removed'];
const TOKEN_TTL = '12h';
const MAX_RELEASE_HOURS = 24;

declare global {
  namespace Express {
    interface Request {
      turnstile?: { credentialId: string; academyId: string; username: string };
    }
  }
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de login da integração. Tente novamente em 15 minutos.' },
});
const loginMiddleware = process.env.NODE_ENV === 'production'
  ? loginLimiter
  : (_req: Request, _res: Response, next: NextFunction) => next();

const adminOnly = [requireAuth, requireRole('admin', 'superuser')];

// ── autenticação do middleware ─────────────────────────────────────────────────────────────────

async function requireTurnstile(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token não informado' });
    return;
  }
  let payload: any;
  try {
    payload = jwt.verify(header.slice(7), process.env.JWT_SECRET!);
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado' });
    return;
  }
  if (payload?.kind !== 'turnstile' || !payload.credentialId) {
    res.status(401).json({ error: 'Esta rota aceita apenas o token da integração da catraca' });
    return;
  }
  try {
    // Consulta a cada chamada (e não só no login) para que desativar a credencial no NexDojo
    // corte o middleware na hora, sem esperar o token de 12h expirar.
    const [rows] = await pool.execute<any[]>(
      'SELECT id, academy_id, username, active FROM turnstile_credentials WHERE id = ?',
      [payload.credentialId]
    );
    const cred = rows[0];
    if (!cred || !cred.active) {
      res.status(401).json({ error: 'Credencial de integração desativada ou removida' });
      return;
    }
    req.turnstile = { credentialId: cred.id, academyId: cred.academy_id, username: cred.username };
    // Só para o requestLogger identificar a origem da chamada.
    req.user = { userId: cred.id, academyId: cred.academy_id, role: 'turnstile' };
    next();
  } catch (err) {
    next(err);
  }
}

function clientIp(req: Request): string | null {
  const fwd = req.headers['x-forwarded-for'];
  return (Array.isArray(fwd) ? fwd[0] : fwd)?.split(',')[0]?.trim() || req.ip || null;
}

// ── status de cada pessoa ──────────────────────────────────────────────────────────────────────

interface TurnstilePerson {
  id: string;
  type: PersonType;
  name: string;
  status: 'allowed' | 'blocked';
  reason: string | null;
  /** Bloqueio por mensalidade, que pode ser liberado temporariamente (o bloqueio manual não pode). */
  overdue: boolean;
  access_blocked: boolean;
  released_until: string | null;
  release_id: string | null;
  photo_hash: string | null;
}

interface TurnstileSettings { grace_days: number; alert_minutes: number }

async function loadSettings(academyId: string): Promise<TurnstileSettings> {
  const [rows] = await pool.execute<any[]>(
    'SELECT turnstile_grace_days, turnstile_alert_minutes FROM academies WHERE id = ?',
    [academyId]
  );
  return {
    grace_days: Number(rows[0]?.turnstile_grace_days ?? 0),
    alert_minutes: Number(rows[0]?.turnstile_alert_minutes ?? 15),
  };
}

const addDays = (date: string, days: number): string => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const formatBR = (date: string): string => date.split('-').reverse().join('/');
const formatBRDateTime = (d: Date): string => {
  const { date, time } = brasiliaDateTime(d);
  return `${formatBR(date)} ${time.slice(0, 5)}`;
};

/**
 * Lista quem deve estar na catraca, com o status de cada um.
 *
 * Entra só quem está ATIVO (aluno, instrutor, colaborador). Quem fica de fora desta lista
 * — inativo, desistente, pendente, excluído — o middleware remove da catraca, foto incluída.
 *
 * Aluno ativo é bloqueado quando:
 *  - access_blocked: bloqueio deliberado pela academia. Liberação temporária NÃO derruba este.
 *  - mensalidade vencida: mesma regra do card "Vencidas" do dashboard e da tela de pagamento
 *    (next_payment_date antes de hoje e plano com valor > 0), com a tolerância em dias
 *    configurada na academia. Plano gratuito ou sem data de vencimento nunca bloqueia.
 *
 * O hash da foto é MD5 calculado no banco: as fotos são JPEG de até 400px (compressImage),
 * então o custo é baixo, e evita manter uma coluna "foto alterada em" em toda rota que grava foto.
 */
async function computePeople(academyId: string): Promise<{ people: TurnstilePerson[]; settings: TurnstileSettings }> {
  const settings = await loadSettings(academyId);
  const today = getTodayBrasilia();
  const photoHash = (alias: string) => `IF(${alias}.photo IS NULL OR ${alias}.photo = '', NULL, MD5(${alias}.photo))`;

  const [students] = await pool.execute<any[]>(
    `SELECT s.id, s.name, s.access_blocked, s.next_payment_date, p.price AS plan_price, ${photoHash('s')} AS photo_hash
       FROM students s LEFT JOIN academy_plans p ON p.id = s.plan_id
      WHERE s.academy_id = ? AND s.status = 'Active'`,
    [academyId]
  );
  const [instructors] = await pool.execute<any[]>(
    `SELECT i.id, i.name, ${photoHash('i')} AS photo_hash FROM instructors i WHERE i.academy_id = ? AND i.status = 'Active'`,
    [academyId]
  );
  const [staff] = await pool.execute<any[]>(
    `SELECT f.id, f.name, ${photoHash('f')} AS photo_hash FROM staff f WHERE f.academy_id = ? AND f.status = 'Active'`,
    [academyId]
  );
  const [releases] = await pool.execute<any[]>(
    `SELECT id, person_id, released_until FROM turnstile_releases
      WHERE academy_id = ? AND revoked_at IS NULL AND released_until > UTC_TIMESTAMP()
      ORDER BY released_until ASC`,
    [academyId]
  );
  // Ordenado ascendente: a última gravação no Map é a liberação que vai mais longe.
  const releaseByPerson = new Map<string, { id: string; until: Date }>();
  for (const r of releases) releaseByPerson.set(r.person_id, { id: r.id, until: new Date(r.released_until) });

  const people: TurnstilePerson[] = [];
  for (const s of students) {
    const release = releaseByPerson.get(s.id);
    const price = s.plan_price != null ? parseFloat(s.plan_price) : 0;
    const overdue = price > 0 && !!s.next_payment_date && addDays(s.next_payment_date, settings.grace_days) < today;
    let status: TurnstilePerson['status'] = 'allowed';
    let reason: string | null = null;
    if (s.access_blocked) {
      status = 'blocked';
      reason = 'Acesso bloqueado pela academia';
    } else if (overdue && release) {
      reason = `Mensalidade vencida em ${formatBR(s.next_payment_date)} — liberado até ${formatBRDateTime(release.until)}`;
    } else if (overdue) {
      status = 'blocked';
      reason = `Mensalidade vencida em ${formatBR(s.next_payment_date)}`;
    }
    people.push({
      id: s.id, type: 'student', name: s.name, status, reason, overdue, access_blocked: !!s.access_blocked,
      released_until: release && overdue && !s.access_blocked ? release.until.toISOString() : null,
      release_id: release && overdue && !s.access_blocked ? release.id : null,
      photo_hash: s.photo_hash,
    });
  }
  for (const [type, rows] of [['instructor', instructors], ['staff', staff]] as const) {
    for (const r of rows) {
      people.push({
        id: r.id, type, name: r.name, status: 'allowed', reason: null, overdue: false, access_blocked: false,
        released_until: null, release_id: null, photo_hash: r.photo_hash,
      });
    }
  }
  people.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  return { people, settings };
}

async function findPerson(academyId: string, type: PersonType, id: string): Promise<any | null> {
  const [rows] = await pool.execute<any[]>(
    `SELECT * FROM ${PERSON_TABLE[type]} WHERE id = ? AND academy_id = ?`,
    [id, academyId]
  );
  return rows[0] ?? null;
}

/**
 * Cria uma liberação temporária. Só faz sentido para aluno bloqueado por mensalidade: o bloqueio
 * deliberado (access_blocked) é decisão do admin e só sai pela ficha, não por um botão na recepção.
 */
async function createRelease(
  req: Request, res: Response, academyId: string,
  input: { personType: unknown; personId: unknown; hours: unknown; operatorName: unknown },
  via: 'nexdojo' | 'middleware', userId: string | null,
): Promise<void> {
  const personType = input.personType as PersonType;
  if (!PERSON_TYPES.includes(personType) || typeof input.personId !== 'string') {
    res.status(400).json({ error: 'person_type e person_id são obrigatórios' });
    return;
  }
  if (personType !== 'student') {
    res.status(400).json({ error: 'Instrutores e colaboradores ativos já passam sempre na catraca' });
    return;
  }
  const hours = input.hours === undefined || input.hours === null ? MAX_RELEASE_HOURS : Number(input.hours);
  if (!Number.isInteger(hours) || hours < 1 || hours > MAX_RELEASE_HOURS) {
    res.status(400).json({ error: `A liberação temporária vai de 1 a ${MAX_RELEASE_HOURS} horas` });
    return;
  }
  const operatorName = typeof input.operatorName === 'string' ? input.operatorName.trim().slice(0, 100) || null : null;

  const student = await findPerson(academyId, 'student', input.personId);
  if (!student || student.status !== 'Active') {
    res.status(404).json({ error: 'Aluno ativo não encontrado nesta academia' });
    return;
  }
  if (student.access_blocked) {
    res.status(409).json({ error: 'Este aluno foi bloqueado pela academia. O bloqueio só pode ser retirado na ficha do aluno, no NexDojo.' });
    return;
  }

  const id = crypto.randomUUID();
  const until = new Date(Date.now() + hours * 3600 * 1000);
  await pool.execute(
    `INSERT INTO turnstile_releases
       (id, academy_id, person_type, person_id, released_until, created_via, created_by_user_id, operator_name)
     VALUES (?,?,?,?,?,?,?,?)`,
    [id, academyId, personType, student.id, until, via, userId, operatorName]
  );
  await logAudit(req, {
    action: 'turnstile.release_granted',
    entityType: 'student',
    entityId: student.id,
    academyId,
    userId,
    userEmail: via === 'middleware' ? `integração:${req.turnstile?.username}` : null,
    details: { student_name: student.name, hours, released_until: until.toISOString(), via, operator_name: operatorName },
  });
  res.status(201).json({ id, person_id: student.id, released_until: until.toISOString(), hours });
}

// ══ Rotas do middleware ══════════════════════════════════════════════════════════════════════

// POST /api/turnstile/auth — login da credencial de integração
router.post('/auth', loginMiddleware, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { username, password } = req.body ?? {};
  if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
    res.status(400).json({ error: 'Usuário e senha da integração são obrigatórios' });
    return;
  }
  try {
    const [rows] = await pool.execute<any[]>(
      `SELECT c.id, c.academy_id, c.username, c.password_hash, c.active, a.name AS academy_name
         FROM turnstile_credentials c JOIN academies a ON a.id = c.academy_id
        WHERE c.username = ?`,
      [username.trim().toLowerCase()]
    );
    const cred = rows[0];
    const ok = cred && cred.active && await bcrypt.compare(password, cred.password_hash);
    if (!ok) {
      await logAudit(req, {
        action: 'turnstile.login_failed',
        academyId: cred?.academy_id ?? null,
        userEmail: `integração:${username.slice(0, 100)}`,
        details: { reason: !cred ? 'usuario_inexistente' : !cred.active ? 'credencial_desativada' : 'senha_incorreta' },
      });
      res.status(401).json({ error: 'Usuário ou senha da integração inválidos' });
      return;
    }
    const token = jwt.sign(
      { kind: 'turnstile', credentialId: cred.id, academyId: cred.academy_id, role: 'turnstile' },
      process.env.JWT_SECRET!,
      { expiresIn: TOKEN_TTL }
    );
    await pool.execute('UPDATE turnstile_credentials SET last_seen_at = UTC_TIMESTAMP(), last_ip = ? WHERE id = ?',
      [clientIp(req), cred.id]);
    res.json({
      token,
      academy: { id: cred.academy_id, name: cred.academy_name },
      settings: await loadSettings(cred.academy_id),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/turnstile/people — quem deve estar na catraca e com qual status
router.get('/people', requireTurnstile, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { people, settings } = await computePeople(req.turnstile!.academyId);
    res.json({
      generated_at: new Date().toISOString(),
      settings,
      people: people.map(({ release_id, ...p }) => p),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/turnstile/people/:type/:id/photo — foto em bytes (JPEG/PNG), pronta para a catraca
router.get('/people/:type/:id/photo', requireTurnstile, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const type = req.params.type as PersonType;
  if (!PERSON_TYPES.includes(type)) {
    res.status(400).json({ error: 'Tipo de pessoa inválido' });
    return;
  }
  try {
    const [rows] = await pool.execute<any[]>(
      `SELECT photo FROM ${PERSON_TABLE[type]} WHERE id = ? AND academy_id = ?`,
      [req.params.id, req.turnstile!.academyId]
    );
    const photo: string | null = rows[0]?.photo ?? null;
    const match = photo?.match(/^data:(image\/(?:jpeg|jpg|png));base64,(.+)$/s);
    if (!match) {
      res.status(404).json({ error: photo ? 'Foto em formato não suportado (esperado JPEG ou PNG)' : 'Sem foto cadastrada' });
      return;
    }
    const bytes = Buffer.from(match[2], 'base64');
    res.setHeader('Content-Type', match[1] === 'image/jpg' ? 'image/jpeg' : match[1]);
    res.setHeader('X-Photo-Hash', crypto.createHash('md5').update(photo!).digest('hex'));
    res.send(bytes);
  } catch (err) {
    next(err);
  }
});

// POST /api/turnstile/heartbeat — "estou vivo", com o estado de cada catraca
router.post('/heartbeat', requireTurnstile, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { app_version, machine_name, devices } = req.body ?? {};
  const status = {
    app_version: typeof app_version === 'string' ? app_version.slice(0, 30) : null,
    machine_name: typeof machine_name === 'string' ? machine_name.slice(0, 100) : null,
    devices: Array.isArray(devices)
      ? devices.slice(0, 50).map((d: any) => ({
        key: String(d?.key ?? '').slice(0, 64),
        name: String(d?.name ?? '').slice(0, 100),
        online: !!d?.online,
        last_error: d?.last_error ? String(d.last_error).slice(0, 300) : null,
        users_on_device: Number.isFinite(d?.users_on_device) ? d.users_on_device : null,
        last_sync_at: typeof d?.last_sync_at === 'string' ? d.last_sync_at : null,
      }))
      : [],
  };
  try {
    const { credentialId, academyId } = req.turnstile!;
    await pool.execute(
      'UPDATE turnstile_credentials SET last_seen_at = UTC_TIMESTAMP(), last_status = ?, last_ip = ? WHERE id = ?',
      [JSON.stringify(status), clientIp(req), credentialId]
    );
    // Catraca removida do middleware: some também o status de sincronismo dela.
    const keys = status.devices.map(d => d.key).filter(Boolean);
    if (keys.length) {
      await pool.execute(
        `DELETE FROM turnstile_sync_status WHERE academy_id = ? AND credential_id = ? AND device_key NOT IN (${keys.map(() => '?').join(',')})`,
        [academyId, credentialId, ...keys]
      );
    } else {
      await pool.execute('DELETE FROM turnstile_sync_status WHERE academy_id = ? AND credential_id = ?', [academyId, credentialId]);
    }
    res.json({ ok: true, server_time: new Date().toISOString(), settings: await loadSettings(academyId) });
  } catch (err) {
    next(err);
  }
});

// POST /api/turnstile/sync-status — resultado do cadastro de cada pessoa em cada catraca
router.post('/sync-status', requireTurnstile, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const items = req.body?.items;
  if (!Array.isArray(items) || items.length > 5000) {
    res.status(400).json({ error: 'items deve ser uma lista de até 5000 elementos' });
    return;
  }
  const { credentialId, academyId } = req.turnstile!;
  try {
    let applied = 0;
    for (const it of items) {
      if (typeof it?.person_id !== 'string' || typeof it?.device_key !== 'string' || !SYNC_STATES.includes(it?.state)) continue;
      if (it.state === 'removed') {
        await pool.execute(
          'DELETE FROM turnstile_sync_status WHERE academy_id = ? AND person_id = ? AND device_key = ?',
          [academyId, it.person_id, it.device_key]
        );
      } else {
        await pool.execute(
          `INSERT INTO turnstile_sync_status (academy_id, person_id, device_key, credential_id, device_name, state, message)
           VALUES (?,?,?,?,?,?,?)
           ON DUPLICATE KEY UPDATE credential_id = VALUES(credential_id), device_name = VALUES(device_name),
             state = VALUES(state), message = VALUES(message), updated_at = CURRENT_TIMESTAMP`,
          [academyId, it.person_id.slice(0, 36), it.device_key.slice(0, 64), credentialId,
            String(it.device_name ?? '').slice(0, 100), it.state, it.message ? String(it.message).slice(0, 500) : null]
        );
      }
      applied++;
    }
    res.json({ applied });
  } catch (err) {
    next(err);
  }
});

// POST /api/turnstile/access-events — passagens lidas da catraca; liberadas viram presença
router.post('/access-events', requireTurnstile, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const events = req.body?.events;
  if (!Array.isArray(events) || events.length > 1000) {
    res.status(400).json({ error: 'events deve ser uma lista de até 1000 elementos' });
    return;
  }
  const { academyId } = req.turnstile!;
  let inserted = 0;
  let attendances = 0;
  try {
    for (const ev of events) {
      const logId = Number(ev?.device_log_id);
      const occurredAt = Number(ev?.occurred_at);
      const eventCode = Number(ev?.event);
      if (typeof ev?.device_key !== 'string' || !Number.isSafeInteger(logId) || !Number.isFinite(occurredAt)
        || !Number.isInteger(eventCode)) continue;
      const personType: PersonType | null = PERSON_TYPES.includes(ev.person_type) ? ev.person_type : null;
      const personId = personType && typeof ev.person_id === 'string' ? ev.person_id.slice(0, 36) : null;
      const granted = eventCode === 7;
      const when = new Date(occurredAt * 1000);

      const id = crypto.randomUUID();
      // INSERT IGNORE + chave única (academia, catraca, id do log): o middleware pode reenviar o
      // mesmo lote depois de uma queda de rede sem duplicar passagem nem presença.
      const [result] = await pool.execute<any>(
        `INSERT IGNORE INTO turnstile_access_events
           (id, academy_id, device_key, device_name, device_log_id, person_type, person_id, event, granted, occurred_at)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [id, academyId, ev.device_key.slice(0, 64), String(ev.device_name ?? '').slice(0, 100), logId,
          personType, personId, eventCode, granted ? 1 : 0, when]
      );
      if (result.affectedRows !== 1) continue;
      inserted++;

      if (granted && personType === 'student' && personId) {
        const [rows] = await pool.execute<any[]>(
          'SELECT id, plan_id, status FROM students WHERE id = ? AND academy_id = ?',
          [personId, academyId]
        );
        const student = rows[0];
        if (student && student.status === 'Active') {
          const { date, time } = brasiliaDateTime(when);
          const { created, record } = await registerDailyCheckIn(academyId, student, date, time, 'turnstile');
          if (created) attendances++;
          await pool.execute('UPDATE turnstile_access_events SET attendance_record_id = ? WHERE id = ?', [record.id, id]);
        }
      }
    }
    res.json({ received: events.length, inserted, attendances });
  } catch (err) {
    next(err);
  }
});

// POST /api/turnstile/releases — liberação temporária pedida pelo botão do middleware
router.post('/releases', requireTurnstile, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const b = req.body ?? {};
    await createRelease(req, res, req.turnstile!.academyId,
      { personType: b.person_type, personId: b.person_id, hours: b.hours, operatorName: b.operator_name },
      'middleware', null);
  } catch (err) {
    next(err);
  }
});

// ══ Rotas do admin (NexDojo) ═════════════════════════════════════════════════════════════════

function parseStatus(raw: unknown): any {
  if (!raw) return null;
  try { return typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return null; }
}

// GET /api/turnstile/admin/alert — leve, consultado pelo layout para o aviso de "sem contato"
router.get('/admin/alert', ...adminOnly, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;
  try {
    const settings = await loadSettings(academyId);
    const [rows] = await pool.execute<any[]>(
      `SELECT last_seen_at, last_status FROM turnstile_credentials
        WHERE academy_id = ? AND active = 1 ORDER BY last_seen_at IS NULL, last_seen_at DESC`,
      [academyId]
    );
    if (!rows.length) {
      res.json({ configured: false, stale: false, last_seen_at: null, alert_minutes: settings.alert_minutes, offline_devices: [] });
      return;
    }
    const lastSeen: Date | null = rows[0].last_seen_at ? new Date(rows[0].last_seen_at) : null;
    const minutes = lastSeen ? Math.floor((Date.now() - lastSeen.getTime()) / 60000) : null;
    const stale = minutes === null || minutes >= settings.alert_minutes;
    // Catraca fora do ar só conta se o middleware está vivo — com ele parado, o status é velho.
    const offline = stale ? [] : (parseStatus(rows[0].last_status)?.devices ?? [])
      .filter((d: any) => !d.online).map((d: any) => d.name || d.key);
    res.json({
      configured: true, stale, last_seen_at: lastSeen?.toISOString() ?? null, minutes_since: minutes,
      alert_minutes: settings.alert_minutes, offline_devices: offline,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/turnstile/admin/overview — configurações, credenciais e estado do middleware
router.get('/admin/overview', ...adminOnly, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;
  try {
    const [creds] = await pool.execute<any[]>(
      `SELECT id, username, label, active, created_at, last_seen_at, last_ip, last_status
         FROM turnstile_credentials WHERE academy_id = ? ORDER BY created_at`,
      [academyId]
    );
    res.json({
      settings: await loadSettings(academyId),
      credentials: creds.map(c => ({ ...c, last_status: parseStatus(c.last_status) })),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/turnstile/admin/people — status de cada pessoa + situação em cada catraca
router.get('/admin/people', ...adminOnly, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;
  try {
    const { people } = await computePeople(academyId);
    const [sync] = await pool.execute<any[]>(
      'SELECT person_id, device_key, device_name, state, message, updated_at FROM turnstile_sync_status WHERE academy_id = ?',
      [academyId]
    );
    const byPerson = new Map<string, any[]>();
    for (const s of sync) {
      if (!byPerson.has(s.person_id)) byPerson.set(s.person_id, []);
      byPerson.get(s.person_id)!.push(s);
    }
    res.json({ people: people.map(p => ({ ...p, devices: byPerson.get(p.id) ?? [] })) });
  } catch (err) {
    next(err);
  }
});

// GET /api/turnstile/admin/events?limit=100 — últimas passagens
router.get('/admin/events', ...adminOnly, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;
  const limit = Math.min(500, Math.max(1, parseInt(String(req.query.limit ?? '100'), 10) || 100));
  try {
    const [rows] = await pool.execute<any[]>(
      `SELECT e.id, e.device_key, e.device_name, e.person_type, e.person_id, e.event, e.granted, e.occurred_at,
              e.attendance_record_id,
              COALESCE(s.name, i.name, f.name) AS person_name
         FROM turnstile_access_events e
         LEFT JOIN students s ON e.person_type = 'student' AND s.id = e.person_id
         LEFT JOIN instructors i ON e.person_type = 'instructor' AND i.id = e.person_id
         LEFT JOIN staff f ON e.person_type = 'staff' AND f.id = e.person_id
        WHERE e.academy_id = ?
        ORDER BY e.occurred_at DESC
        LIMIT ${limit}`,
      [academyId]
    );
    res.json({ events: rows });
  } catch (err) {
    next(err);
  }
});

const USERNAME_RE = /^[a-z0-9._-]{3,100}$/;

// POST /api/turnstile/admin/credentials — cria o usuário/senha que o middleware vai usar
router.post('/admin/credentials', ...adminOnly, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;
  const username = String(req.body?.username ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');
  const label = req.body?.label ? String(req.body.label).trim().slice(0, 100) : null;
  if (!USERNAME_RE.test(username)) {
    res.status(400).json({ error: 'Usuário deve ter de 3 a 100 caracteres: letras minúsculas, números, ponto, hífen ou sublinhado' });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: 'A senha da integração deve ter pelo menos 8 caracteres' });
    return;
  }
  try {
    const id = crypto.randomUUID();
    await pool.execute(
      `INSERT INTO turnstile_credentials (id, academy_id, username, password_hash, label, active, created_by)
       VALUES (?,?,?,?,?,1,?)`,
      [id, academyId, username, await bcrypt.hash(password, 10), label, req.user!.userId]
    );
    await logAudit(req, { action: 'turnstile.credential_created', entityType: 'turnstile_credential', entityId: id, academyId,
      details: { username, label } });
    res.status(201).json({ id, username, label, active: true });
  } catch (err: any) {
    if (err?.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: 'Este nome de usuário já está em uso. Escolha outro.' });
      return;
    }
    next(err);
  }
});

// PUT /api/turnstile/admin/credentials/:id — troca senha, ativa/desativa, renomeia
router.put('/admin/credentials/:id', ...adminOnly, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;
  const sets: string[] = [];
  const params: any[] = [];
  const changed: Record<string, unknown> = {};
  if (req.body?.password !== undefined) {
    if (String(req.body.password).length < 8) {
      res.status(400).json({ error: 'A senha da integração deve ter pelo menos 8 caracteres' });
      return;
    }
    sets.push('password_hash = ?');
    params.push(await bcrypt.hash(String(req.body.password), 10));
    changed.password = 'alterada';
  }
  if (req.body?.active !== undefined) {
    sets.push('active = ?');
    params.push(req.body.active ? 1 : 0);
    changed.active = !!req.body.active;
  }
  if (req.body?.label !== undefined) {
    sets.push('label = ?');
    params.push(req.body.label ? String(req.body.label).trim().slice(0, 100) : null);
    changed.label = req.body.label;
  }
  if (!sets.length) {
    res.status(400).json({ error: 'Nada para alterar' });
    return;
  }
  try {
    const [result] = await pool.execute<any>(
      `UPDATE turnstile_credentials SET ${sets.join(', ')} WHERE id = ? AND academy_id = ?`,
      [...params, req.params.id, academyId]
    );
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Credencial não encontrada' });
      return;
    }
    await logAudit(req, { action: 'turnstile.credential_updated', entityType: 'turnstile_credential',
      entityId: req.params.id, academyId, details: changed });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/turnstile/admin/credentials/:id
router.delete('/admin/credentials/:id', ...adminOnly, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;
  try {
    const [rows] = await pool.execute<any[]>(
      'SELECT username FROM turnstile_credentials WHERE id = ? AND academy_id = ?', [req.params.id, academyId]);
    if (!rows[0]) {
      res.status(404).json({ error: 'Credencial não encontrada' });
      return;
    }
    await pool.execute('DELETE FROM turnstile_sync_status WHERE credential_id = ?', [req.params.id]);
    await pool.execute('DELETE FROM turnstile_credentials WHERE id = ?', [req.params.id]);
    await logAudit(req, { action: 'turnstile.credential_deleted', entityType: 'turnstile_credential',
      entityId: req.params.id, academyId, details: { username: rows[0].username } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// PUT /api/turnstile/admin/settings — tolerância de vencimento e prazo do aviso de "sem contato"
router.put('/admin/settings', ...adminOnly, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;
  const graceDays = Number(req.body?.grace_days);
  const alertMinutes = Number(req.body?.alert_minutes);
  if (!Number.isInteger(graceDays) || graceDays < 0 || graceDays > 60) {
    res.status(400).json({ error: 'A tolerância deve ser um número inteiro de 0 a 60 dias' });
    return;
  }
  if (!Number.isInteger(alertMinutes) || alertMinutes < 5 || alertMinutes > 1440) {
    res.status(400).json({ error: 'O aviso de sem contato deve ficar entre 5 e 1440 minutos' });
    return;
  }
  try {
    const before = await loadSettings(academyId);
    await pool.execute('UPDATE academies SET turnstile_grace_days = ?, turnstile_alert_minutes = ? WHERE id = ?',
      [graceDays, alertMinutes, academyId]);
    await logAudit(req, { action: 'turnstile.settings_changed', entityType: 'academy', entityId: academyId, academyId,
      details: { before, after: { grace_days: graceDays, alert_minutes: alertMinutes } } });
    res.json({ grace_days: graceDays, alert_minutes: alertMinutes });
  } catch (err) {
    next(err);
  }
});

// POST /api/turnstile/admin/releases — liberação temporária pelo NexDojo
router.post('/admin/releases', ...adminOnly, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;
  try {
    const b = req.body ?? {};
    await createRelease(req, res, academyId,
      { personType: b.person_type, personId: b.person_id, hours: b.hours, operatorName: null },
      'nexdojo', req.user!.userId);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/turnstile/admin/releases/:id — encerra a liberação antes do prazo
router.delete('/admin/releases/:id', ...adminOnly, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;
  try {
    const [result] = await pool.execute<any>(
      'UPDATE turnstile_releases SET revoked_at = UTC_TIMESTAMP(), revoked_by_user_id = ? WHERE id = ? AND academy_id = ? AND revoked_at IS NULL',
      [req.user!.userId, req.params.id, academyId]
    );
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Liberação não encontrada ou já encerrada' });
      return;
    }
    await logAudit(req, { action: 'turnstile.release_revoked', entityType: 'turnstile_release', entityId: req.params.id, academyId });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
