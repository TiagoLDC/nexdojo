import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// GET /api/finances
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { academyId, role } = (req as any).user;
    if (!academyId && role !== 'superuser') return res.status(403).json({ error: 'Acesso negado.' });

    const reqAcademyId = req.headers['x-academy-id'];
    const activeAcademyId = reqAcademyId || academyId;
    const where = role === 'superuser' && !activeAcademyId ? {} : { academyId: activeAcademyId };
    const finances = await prisma.financeTransaction.findMany({ 
      where, 
      orderBy: { date: 'desc' },
      include: { student: { select: { name: true } } }
    });
    return res.json(finances);
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno.' });
  }
});

// POST /api/finances
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { academyId } = (req as any).user;
    const { description, amount, type, category, date, paymentMethod, status, studentId } = req.body;
    const transaction = await prisma.financeTransaction.create({
      data: {
        description,
        amount,
        type,
        category,
        date: date ? new Date(date) : new Date(),
        paymentMethod,
        status,
        studentId,
        academyId: req.body.academyId || academyId
      }
    });
    return res.status(201).json(transaction);
  } catch (error) {
    console.error('[POST /finances]', error);
    return res.status(500).json({ error: 'Erro interno.' });
  }
});

// DELETE /api/finances/:id
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    await prisma.financeTransaction.delete({ where: { id: String(req.params.id) } });
    return res.json({ message: 'Transação removida.' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno.' });
  }
});

export default router;
