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
    return res.json(students.map(s => ({ ...s, documents: s.documents ? JSON.parse(s.documents) : [] })));
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
    return res.json({ ...student, documents: student.documents ? JSON.parse(student.documents) : [] });
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
      guardianRg, guardianProfession,
      cpf, rg, medicalNotes, documents,
      belt, stripes, status, lastGraduationDate, lastAttendance, totalClasses, totalHours,
      absentCount, absenceLimit, nextPaymentDate, hasLoanedKimono, photo
    } = req.body;

    const data = {
      name, email, phone, birthDate, gender, bloodType, weight, height,
      emergencyContact, emergencyPhone, cep, address, addressNumber,
      guardianName, guardianPhone, guardianCpf, guardianRelation, guardianEmail,
      guardianRg, guardianProfession,
      cpf, rg, medicalNotes,
      documents: documents ? JSON.stringify(documents) : undefined,
      belt, stripes, status, lastGraduationDate, lastAttendance, totalClasses, totalHours,
      absentCount, absenceLimit, nextPaymentDate, hasLoanedKimono, photo,
      academyId: req.body.academyId || academyId
    };

    Object.keys(data).forEach(key => (data as any)[key] === undefined && delete (data as any)[key]);

    const student = await prisma.student.create({ data });
    return res.status(201).json({ ...student, documents: student.documents ? JSON.parse(student.documents) : [] });
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
      guardianRg, guardianProfession,
      cpf, rg, medicalNotes, documents,
      belt, stripes, status, lastGraduationDate, lastAttendance, totalClasses, totalHours,
      absentCount, absenceLimit, nextPaymentDate, hasLoanedKimono, photo
    } = req.body;

    const data = {
      name, email, phone, birthDate, gender, bloodType, weight, height,
      emergencyContact, emergencyPhone, cep, address, addressNumber,
      guardianName, guardianPhone, guardianCpf, guardianRelation, guardianEmail,
      guardianRg, guardianProfession,
      cpf, rg, medicalNotes,
      documents: documents !== undefined ? JSON.stringify(documents) : undefined,
      belt, stripes, status, lastGraduationDate, lastAttendance, totalClasses, totalHours,
      absentCount, absenceLimit, nextPaymentDate, hasLoanedKimono, photo
    };

    Object.keys(data).forEach(key => (data as any)[key] === undefined && delete (data as any)[key]);

    const student = await prisma.student.update({
      where: { id: String(req.params.id) },
      data
    });
    return res.json({ ...student, documents: student.documents ? JSON.parse(student.documents) : [] });
  } catch (error) {
    console.error('[PUT /students]', error);
    return res.status(500).json({ error: 'Erro interno ao atualizar aluno.' });
  }
});

// GET /api/students/:id/graduation-history
router.get('/:id/graduation-history', authMiddleware, async (req: Request, res: Response) => {
  try {
    const history = await prisma.graduationHistory.findMany({
      where: { studentId: String(req.params.id) },
      orderBy: { date: 'desc' }
    });
    return res.json(history);
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno.' });
  }
});

// POST /api/students/:id/graduate
router.post('/:id/graduate', authMiddleware, async (req: Request, res: Response) => {
  try {
    const studentId = String(req.params.id);
    const { newBelt, newStripes, notes } = req.body;
    const instructorId = (req as any).user.id;

    if (!newBelt) return res.status(400).json({ error: 'Novo grau é obrigatório.' });

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) return res.status(404).json({ error: 'Aluno não encontrado.' });

    const [updatedStudent] = await prisma.$transaction([
      prisma.student.update({
        where: { id: studentId },
        data: {
          belt: newBelt,
          stripes: newStripes ?? 0,
          lastGraduationDate: new Date().toISOString(),
          totalClasses: 0
        }
      }),
      prisma.graduationHistory.create({
        data: {
          studentId,
          instructorId,
          previousBelt: student.belt,
          newBelt,
          previousStripes: student.stripes,
          newStripes: newStripes ?? 0,
          notes: notes || null
        }
      })
    ]);

    return res.json({ ...updatedStudent, documents: updatedStudent.documents ? JSON.parse(updatedStudent.documents) : [] });
  } catch (error) {
    console.error('[POST /students/:id/graduate]', error);
    return res.status(500).json({ error: 'Erro interno ao realizar promoção.' });
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
