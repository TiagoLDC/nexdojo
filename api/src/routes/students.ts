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

    const reqAcademyId = req.headers['x-academy-id'];
    const activeAcademyId = reqAcademyId || academyId;
    const where = role === 'superuser' && !activeAcademyId ? {} : { academyId: activeAcademyId };
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
    const { 
      id, name, email, phone, birthDate, gender, bloodType, weight, height, 
      emergencyContact, emergencyPhone, cep, address, addressNumber,
      guardianName, guardianPhone, guardianCpf, guardianRelation, guardianEmail,
      belt, stripes, status, lastGraduationDate, totalClasses, totalHours, 
      absentCount, hasLoanedKimono, photo 
    } = req.body;

    const data = {
      name, email, phone, birthDate, gender, bloodType, weight, height,
      emergencyContact, emergencyPhone, cep, address, addressNumber,
      guardianName, guardianPhone, guardianCpf, guardianRelation, guardianEmail,
      belt, stripes, status, lastGraduationDate, totalClasses, totalHours,
      absentCount, hasLoanedKimono, photo,
      academyId: req.body.academyId || academyId
    };

    // Remove undefined values
    Object.keys(data).forEach(key => (data as any)[key] === undefined && delete (data as any)[key]);

    const student = await prisma.student.create({ data });
    return res.status(201).json(student);
  } catch (error) {
    console.error('[POST /students]', error);
    return res.status(500).json({ error: 'Erro interno ao criar aluno.' });
  }
});

// PUT /api/students/:id
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { 
      name, email, phone, birthDate, gender, bloodType, weight, height, 
      emergencyContact, emergencyPhone, cep, address, addressNumber,
      guardianName, guardianPhone, guardianCpf, guardianRelation, guardianEmail,
      belt, stripes, status, lastGraduationDate, totalClasses, totalHours, 
      absentCount, hasLoanedKimono, photo 
    } = req.body;

    const data = {
      name, email, phone, birthDate, gender, bloodType, weight, height,
      emergencyContact, emergencyPhone, cep, address, addressNumber,
      guardianName, guardianPhone, guardianCpf, guardianRelation, guardianEmail,
      belt, stripes, status, lastGraduationDate, totalClasses, totalHours,
      absentCount, hasLoanedKimono, photo
    };

    // Remove undefined values
    Object.keys(data).forEach(key => (data as any)[key] === undefined && delete (data as any)[key]);

    const student = await prisma.student.update({
      where: { id: String(req.params.id) },
      data
    });
    return res.json(student);
  } catch (error) {
    console.error('[PUT /students]', error);
    return res.status(500).json({ error: 'Erro interno ao atualizar aluno.' });
  }
});

// DELETE /api/students/:id
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const student = await prisma.student.findUnique({ where: { id: String(req.params.id) } });
    if (!student) return res.status(404).json({ error: 'Aluno não encontrado.' });

    await prisma.$transaction(async (tx) => {
      await tx.student.delete({ where: { id: student.id } });
      if (student.email) {
        await tx.user.deleteMany({ where: { email: student.email, academyId: student.academyId } });
      }
    });

    return res.json({ message: 'Aluno removido.' });
  } catch (error) {
    console.error('[DELETE /students/:id]', error);
    return res.status(500).json({ error: 'Erro interno.' });
  }
});

export default router;
