import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Get all staff for an academy
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { academyId, role } = (req as any).user;
    if (!academyId && role !== 'superuser') return res.status(403).json({ error: 'Acesso negado.' });

    const reqAcademyId = req.headers['x-academy-id'];
    const activeAcademyId = reqAcademyId || academyId;
    const where = role === 'superuser' && !activeAcademyId ? {} : { academyId: activeAcademyId };
    const staff = await prisma.staff.findMany({
      where,
      orderBy: { name: 'asc' }
    });
    return res.json(staff);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar staff' });
  }
});

// Create staff
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { academyId } = (req as any).user;
    const staff = await prisma.staff.create({
      data: {
        ...req.body,
        academyId: req.body.academyId || academyId
      }
    });
    return res.json(staff);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao criar staff' });
  }
});

// Update staff
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const staff = await prisma.staff.update({
      where: { id: String(id) },
      data: req.body
    });
    return res.json(staff);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao atualizar staff' });
  }
});

// Delete staff
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.staff.delete({
      where: { id: String(id) }
    });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao deletar staff' });
  }
});

export default router;
