import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { getClientIp } from '../middleware/requestLogger';

const router = Router();

// Endpoint público (o erro pode acontecer antes do login) — o limite evita que vire um canal de flood
const reportLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitos relatórios de erro. Aguarde um instante.' },
});

// Texto vem do cliente: nunca confiar no tamanho, senão um payload gigante inunda o log do container
const truncate = (value: unknown, max: number): string | null => {
  if (typeof value !== 'string' || !value) return null;
  return value.length > max ? value.slice(0, max) + '…[truncado]' : value;
};

// POST /api/client-errors — erro de renderização capturado pelo ErrorBoundary do frontend
router.post('/', reportLimiter, (req: Request, res: Response): void => {
  console.error(JSON.stringify({
    ts: new Date().toISOString(),
    level: 'error',
    type: 'client_error',
    message: truncate(req.body?.message, 500),
    stack: truncate(req.body?.stack, 4000),
    componentStack: truncate(req.body?.component_stack ?? req.body?.componentStack, 4000),
    url: truncate(req.body?.url, 500),
    userId: truncate(req.body?.user_id ?? req.body?.userId, 36),
    academyId: truncate(req.body?.academy_id ?? req.body?.academyId, 36),
    userAgent: truncate(req.headers['user-agent'], 300),
    ip: getClientIp(req),
  }));

  res.status(204).end();
});

export default router;
