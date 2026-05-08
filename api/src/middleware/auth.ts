import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('Variável de ambiente JWT_SECRET não definida. O servidor não pode iniciar.');

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticação ausente.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // D-04: verificar se o usuário ainda existe e não está bloqueado
    const dbUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, status: true }
    });

    if (!dbUser || dbUser.status === 'Blocked') {
      return res.status(401).json({ error: 'Acesso bloqueado ou usuário não encontrado.' });
    }

    (req as any).user = decoded;
    return next();
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
};
