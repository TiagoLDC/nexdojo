
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get all staff for an academy
router.get('/', async (req, res) => {
  const { academyId } = req.query;
  try {
    const staff = await prisma.staff.findMany({
      where: academyId ? { academyId: String(academyId) } : {},
      orderBy: { name: 'asc' }
    });
    res.json(staff);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar staff' });
  }
});

// Create staff
router.post('/', async (req, res) => {
  try {
    const staff = await prisma.staff.create({
      data: req.body
    });
    res.json(staff);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar staff' });
  }
});

// Update staff
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const staff = await prisma.staff.update({
      where: { id },
      data: req.body
    });
    res.json(staff);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar staff' });
  }
});

// Delete staff
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.staff.delete({
      where: { id }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar staff' });
  }
});

export default router;
