import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Get all instructors for an academy
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { academyId, role } = (req as any).user;
    if (!academyId && role !== 'superuser') return res.status(403).json({ error: 'Acesso negado.' });

    const reqAcademyId = req.headers['x-academy-id'];
    const activeAcademyId = reqAcademyId || academyId;
    const where = role === 'superuser' && !activeAcademyId ? {} : { academyId: activeAcademyId };
    const instructors = await prisma.instructor.findMany({
      where,
      orderBy: { name: 'asc' }
    });
    return res.json(instructors);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar instrutores' });
  }
});

// Create instructor
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { academyId } = (req as any).user;
    const instructor = await prisma.instructor.create({
      data: {
        ...req.body,
        academyId: req.body.academyId || academyId
      }
    });
    return res.json(instructor);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao criar instrutor' });
  }
});

// Update instructor
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const instructor = await prisma.instructor.update({
      where: { id: String(id) },
      data: req.body
    });
    return res.json(instructor);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao atualizar instrutor' });
  }
});

// Delete instructor
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.instructor.delete({
      where: { id: String(id) }
    });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao deletar instrutor' });
  }
});

export default router;
