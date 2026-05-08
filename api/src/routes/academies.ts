import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// GET /api/academies - list all academies (for superusers)
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { role } = (req as any).user;
    if (role !== 'superuser') {
      return res.status(403).json({ error: 'Acesso negado.' });
    }
    const academies = await prisma.academy.findMany({
      orderBy: { name: 'asc' }
    });
    return res.json(academies);
  } catch (error) {
    console.error('[GET /academies]', error);
    return res.status(500).json({ error: 'Erro interno.' });
  }
});


// GET /api/academies/:id
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { role, academyId } = (req as any).user;
    if (role !== 'superuser' && academyId !== req.params.id) {
      return res.status(403).json({ error: 'Acesso negado.' });
    }
    const academy = await prisma.academy.findUnique({ where: { id: String(req.params.id) } });
    if (!academy) return res.status(404).json({ error: 'Academia não encontrada.' });
    return res.json(academy);
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno.' });
  }
});

// PUT /api/academies/:id
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { role, academyId } = (req as any).user;
    if (role !== 'superuser' && academyId !== req.params.id) {
      return res.status(403).json({ error: 'Acesso negado.' });
    }
    const { id, createdAt, updatedAt, ...data } = req.body;
    const academy = await prisma.academy.update({
      where: { id: String(req.params.id) },
      data
    });
    return res.json(academy);
  } catch (error) {
    console.error('[PUT /academies]', error);
    return res.status(500).json({ error: 'Erro interno.' });
  }
});

// GET /api/academies/:id/users - list users of an academy
router.get('/:id/users', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { role, academyId } = (req as any).user;
    if (role !== 'superuser' && academyId !== req.params.id) {
      return res.status(403).json({ error: 'Acesso negado.' });
    }
    const users = await prisma.user.findMany({
      where: { academyId: String(req.params.id) },
      select: {
        id: true, name: true, email: true, role: true, status: true, academyId: true, createdAt: true
      }
    });
    return res.json(users);
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno.' });
  }
});

// PUT /api/academies/:id/users/:userId/status - approve or reject a user
router.put('/:id/users/:userId/status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { role, academyId } = (req as any).user;
    if (role !== 'superuser' && academyId !== req.params.id) {
      return res.status(403).json({ error: 'Acesso negado.' });
    }
    const { status } = req.body;
    const user = await prisma.user.update({
      where: { id: String(req.params.userId) },
      data: { status },
      select: { id: true, name: true, email: true, role: true, status: true }
    });
    return res.json(user);
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno.' });
  }
});

export default router;
