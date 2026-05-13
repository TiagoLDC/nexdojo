import { Request, Response } from 'express';

/**
 * Retorna o academyId correto para a query, sempre a partir do JWT.
 * - Usuários comuns: usa req.user.academyId (ignora qualquer valor no body/query)
 * - Superusuário: aceita academyId via query param ou body (obrigatório)
 *
 * Retorna null e já envia a resposta de erro se algo estiver errado.
 */
export function getAcademyId(req: Request, res: Response): string | null {
  if (!req.user) {
    res.status(401).json({ error: 'Não autenticado' });
    return null;
  }

  if (req.user.role === 'superuser') {
    const id = (req.query.academyId ?? req.body?.academyId ?? req.body?.academy_id) as string | undefined;
    if (!id) {
      res.status(400).json({ error: 'academyId é obrigatório para superusuário' });
      return null;
    }
    return id;
  }

  if (!req.user.academyId) {
    res.status(403).json({ error: 'Usuário não vinculado a uma academia' });
    return null;
  }

  return req.user.academyId;
}
