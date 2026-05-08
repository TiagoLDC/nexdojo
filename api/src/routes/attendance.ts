import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// GET /api/attendance
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { academyId, role } = (req as any).user;
    if (!academyId && role !== 'superuser') return res.status(403).json({ error: 'Acesso negado.' });

    const reqAcademyId = req.headers['x-academy-id'];
    const activeAcademyId = reqAcademyId || academyId;
    const where = role === 'superuser' && !activeAcademyId ? {} : { academyId: activeAcademyId };
    const attendance = await prisma.attendanceRecord.findMany({ 
      where, 
      orderBy: { date: 'desc' },
      include: { 
        student: { select: { name: true, belt: true, stripes: true } },
        class: { select: { name: true } }
      }
    });
    return res.json(attendance);
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno.' });
  }
});

// POST /api/attendance/bulk
router.post('/bulk', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { academyId } = (req as any).user;
    const { records, classId } = req.body;

    if (!Array.isArray(records) || !classId) {
      return res.status(400).json({ error: 'records e classId são obrigatórios.' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.attendanceRecord.createMany({
        data: records.map((r: any) => ({
          academyId,
          classId,
          studentId: r.studentId,
          durationMinutes: r.durationMinutes,
          kimonoTaken: r.kimonoTaken || false,
          date: new Date(),
        })),
      });

      await tx.classSession.update({
        where: { id: classId },
        data: { status: 'Finalized' },
      });

      await Promise.all(
        records.map((r: any) =>
          tx.student.update({
            where: { id: r.studentId },
            data: {
              totalClasses: { increment: 1 },
              totalHours: { increment: Math.floor(r.durationMinutes / 60) },
              absentCount: 0,
            },
          })
        )
      );
    });

    return res.status(201).json({ message: 'Chamada registrada com sucesso.' });
  } catch (error) {
    console.error('[POST /attendance/bulk]', error);
    return res.status(500).json({ error: 'Erro interno.' });
  }
});

export default router;
