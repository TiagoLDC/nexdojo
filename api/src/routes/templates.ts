import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// GET /api/templates
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { academyId, role } = (req as any).user;
    if (!academyId && role !== 'superuser') return res.status(403).json({ error: 'Acesso negado.' });

    const where = role === 'superuser' ? {} : { academyId };
    const templates = await prisma.classTemplate.findMany({ where, orderBy: { name: 'asc' } });
    return res.json(templates);
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno.' });
  }
});

// POST /api/templates
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { academyId } = (req as any).user;
    const { name, durationMinutes, schedules } = req.body;
    const template = await prisma.classTemplate.create({
      data: {
        name,
        durationMinutes,
        schedules: typeof schedules === 'string' ? schedules : JSON.stringify(schedules),
        academyId: req.body.academyId || academyId
      }
    });
    return res.status(201).json(template);
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno.' });
  }
});

// PUT /api/templates/:id
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { name, durationMinutes, schedules } = req.body;
    const template = await prisma.classTemplate.update({
      where: { id: req.params.id },
      data: {
        name,
        durationMinutes,
        schedules: typeof schedules === 'string' ? schedules : JSON.stringify(schedules)
      }
    });
    return res.json(template);
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno.' });
  }
});

// DELETE /api/templates/:id
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    await prisma.classTemplate.delete({ where: { id: req.params.id } });
    return res.json({ message: 'Template removido.' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno.' });
  }
});

export default router;
