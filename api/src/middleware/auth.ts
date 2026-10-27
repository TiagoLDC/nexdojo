import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthPayload {
  userId: string;
  academyId: string | null;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token não informado' });
    return;
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload & { kind?: string };
    // O token do middleware da catraca é assinado com o mesmo segredo, mas só vale nas rotas de
    // /api/turnstile (requireTurnstile). Sem esta trava ele abriria toda rota que só exige
    // requireAuth — inclusive a listagem de alunos com CPF e endereço.
    if (payload.kind === 'turnstile') {
      res.status(401).json({ error: 'Token de integração não é aceito nesta rota' });
      return;
    }
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}
