import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';

const router = Router();

type BinType = 'student' | 'instructor' | 'template';

// GET /api/recycle-bin
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { academyId, role } = (req as any).user;
    const reqAcademyId = req.headers['x-academy-id'] as string | undefined;
    const activeAcademyId = reqAcademyId || academyId;

    if (!activeAcademyId && role !== 'superuser') {
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    const where = activeAcademyId ? { academyId: activeAcademyId, deletedAt: { not: null } } : { deletedAt: { not: null } };

    const [students, instructors, templates] = await Promise.all([
      prisma.student.findMany({ where, orderBy: { deletedAt: 'desc' } }),
      prisma.instructor.findMany({ where, orderBy: { deletedAt: 'desc' } }),
      prisma.classTemplate.findMany({ where, orderBy: { deletedAt: 'desc' } }),
    ]);

    const items = [
      ...students.map(({ photo: _p, documents, ...s }) => ({
        ...s,
        type: 'student' as BinType,
        documents: documents ? JSON.parse(documents) : [],
        deletedAt: s.deletedAt!.toISOString(),
      })),
      ...instructors.map(({ photo: _p, ...i }) => ({
        ...i,
        type: 'instructor' as BinType,
        deletedAt: i.deletedAt!.toISOString(),
      })),
      ...templates.map(t => ({
        ...t,
        type: 'template' as BinType,
        schedules: t.schedules ? JSON.parse(t.schedules) : [],
        assignedStudentIds: t.assignedStudentIds ? JSON.parse(t.assignedStudentIds) : [],
        deletedAt: t.deletedAt!.toISOString(),
      })),
    ].sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));

    return res.json(items);
  } catch (error) {
    console.error('[GET /recycle-bin]', error);
    return res.status(500).json({ error: 'Erro interno.' });
  }
});

// POST /api/recycle-bin/:type/:id/restore
router.post('/:type/:id/restore', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { type, id } = req.params as { type: BinType; id: string };

    if (type === 'student') {
      await prisma.student.update({ where: { id }, data: { deletedAt: null } });
    } else if (type === 'instructor') {
      await prisma.instructor.update({ where: { id }, data: { deletedAt: null } });
    } else if (type === 'template') {
      await prisma.classTemplate.update({ where: { id }, data: { deletedAt: null } });
    } else {
      return res.status(400).json({ error: 'Tipo inválido.' });
    }

    return res.json({ message: 'Item restaurado com sucesso.' });
  } catch (error) {
    console.error('[POST /recycle-bin/restore]', error);
    return res.status(500).json({ error: 'Erro interno.' });
  }
});

// DELETE /api/recycle-bin/:type/:id  (exclusão permanente)
router.delete('/:type/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { type, id } = req.params as { type: BinType; id: string };

    if (type === 'student') {
      await prisma.$transaction(async (tx) => {
        const student = await tx.student.findUnique({ where: { id } });
        if (student?.email) {
          await tx.user.deleteMany({ where: { email: student.email, academyId: student.academyId } });
        }
        await tx.student.delete({ where: { id } });
      });
    } else if (type === 'instructor') {
      await prisma.instructor.delete({ where: { id } });
    } else if (type === 'template') {
      await prisma.classTemplate.delete({ where: { id } });
    } else {
      return res.status(400).json({ error: 'Tipo inválido.' });
    }

    return res.json({ message: 'Item excluído permanentemente.' });
  } catch (error) {
    console.error('[DELETE /recycle-bin]', error);
    return res.status(500).json({ error: 'Erro interno.' });
  }
});

export default router;
