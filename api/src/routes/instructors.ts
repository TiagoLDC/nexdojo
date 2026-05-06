
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get all instructors for an academy
router.get('/', async (req, res) => {
  const { academyId } = req.query;
  try {
    const instructors = await prisma.instructor.findMany({
      where: academyId ? { academyId: String(academyId) } : {},
      orderBy: { name: 'asc' }
    });
    res.json(instructors);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar instrutores' });
  }
});

// Create instructor
router.post('/', async (req, res) => {
  try {
    const instructor = await prisma.instructor.create({
      data: req.body
    });
    res.json(instructor);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar instrutor' });
  }
});

// Update instructor
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const instructor = await prisma.instructor.update({
      where: { id },
      data: req.body
    });
    res.json(instructor);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar instrutor' });
  }
});

// Delete instructor
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.instructor.delete({
      where: { id }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar instrutor' });
  }
});

export default router;
