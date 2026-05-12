import { Router } from 'express';

const router = Router();

// Rotas serão adicionadas nas fases seguintes
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
