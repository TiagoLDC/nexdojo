import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// GET /api/students - list students for the academy
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { academyId, role } = (req as any).user;
    if (!academyId && role !== 'superuser') {
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    const where = role === 'superuser' ? {} : { academyId };
    const students = await prisma.student.findMany({
      where,
      orderBy: { name: 'asc' }
    });
    return res.json(students);
  } catch (error) {
    console.error('[GET /students]', error);
    return res.status(500).json({ error: 'Erro interno.' });
  }
});

// GET /api/students/:id
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const student = await prisma.student.findUnique({ where: { id: String(req.params.id) } });
    if (!student) return res.status(404).json({ error: 'Aluno não encontrado.' });
    return res.json(student);
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno.' });
  }
});

// POST /api/students
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { academyId } = (req as any).user;
    const data = { ...req.body, academyId: req.body.academyId || academyId };
    const student = await prisma.student.create({ data });
    return res.status(201).json(student);
  } catch (error) {
    console.error('[POST /students]', error);
    return res.status(500).json({ error: 'Erro interno.' });
  }
});

// PUT /api/students/:id
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id, createdAt, updatedAt, ...data } = req.body;
    const student = await prisma.student.update({
      where: { id: String(req.params.id) },
      data
    });
    return res.json(student);
  } catch (error) {
    console.error('[PUT /students]', error);
    return res.status(500).json({ error: 'Erro interno.' });
  }
});

// DELETE /api/students/:id
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    await prisma.student.delete({ where: { id: String(req.params.id) } });
    return res.json({ message: 'Aluno removido.' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno.' });
  }
});

export default router;
