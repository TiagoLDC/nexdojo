import { Request, Response, NextFunction } from 'express';
import { getClientIp } from './requestLogger';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  // Antes só saía o stack cru, sem dizer em qual rota nem para qual usuário o erro aconteceu
  console.error(JSON.stringify({
    ts: new Date().toISOString(),
    level: 'error',
    type: 'exception',
    method: req.method,
    path: req.originalUrl.split('?')[0],
    userId: req.user?.userId ?? null,
    academyId: req.user?.academyId ?? null,
    ip: getClientIp(req),
    message: err.message,
    stack: err.stack,
  }));

  res.status(500).json({ error: 'Erro interno do servidor' });
}
