import { Request, Response, NextFunction } from 'express';

export function getClientIp(req: Request): string | null {
  const forwardedFor = req.headers['x-forwarded-for'];
  return (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor)?.split(',')[0]?.trim()
    || req.ip
    || null;
}

/**
 * Loga uma linha JSON por requisição no stdout (coletado pelo `docker logs`, com rotação
 * configurada no docker-compose.yml). Nunca inclui o corpo da requisição — ele carrega senha
 * em /auth/login, /auth/reset-password e afins.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    if (req.originalUrl.startsWith('/api/health')) return;

    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

    const line = JSON.stringify({
      ts: new Date().toISOString(),
      level,
      type: 'request',
      method: req.method,
      path: req.originalUrl.split('?')[0],
      status: res.statusCode,
      durationMs: Math.round(durationMs),
      userId: req.user?.userId ?? null,
      academyId: req.user?.academyId ?? null,
      role: req.user?.role ?? null,
      ip: getClientIp(req),
    });

    if (level === 'error') console.error(line);
    else if (level === 'warn') console.warn(line);
    else console.log(line);
  });

  next();
}
