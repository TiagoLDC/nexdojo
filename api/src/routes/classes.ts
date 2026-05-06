import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// GET /api/classes
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { academyId, role } = (req as any).user;
    if (!academyId && role !== 'superuser') return res.status(403).json({ error: 'Acesso negado.' });

    const where = role === 'superuser' ? {} : { academyId };
    const classes = await prisma.classSession.findMany({ 
      where, 
      orderBy: { date: 'desc' },
      include: { template: { select: { name: true } } }
    });
    return res.json(classes);
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno.' });
  }
});

// POST /api/classes
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { academyId } = (req as any).user;
    const { name, templateId, date, durationMinutes, instructorId } = req.body;
    const session = await prisma.classSession.create({
      data: {
        name,
        templateId,
        date: new Date(date),
        durationMinutes,
        instructorId,
        academyId: req.body.academyId || academyId
      }
    });
    return res.status(201).json(session);
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno.' });
  }
});

export default router;
