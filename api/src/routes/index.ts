import { Router } from 'express';
import authRouter from './auth';
import studentsRouter from './students';
import instructorsRouter from './instructors';
import staffRouter from './staff';
import usersRouter from './users';
import templatesRouter from './templates';
import plansRouter from './plans';
import sessionsRouter from './sessions';
import attendanceRouter from './attendance';
import financesRouter from './finances';
import calendarRouter from './calendar';
import chatRouter from './chat';
import inventoryRouter from './inventory';
import academiesRouter from './academies';
import recycleBinRouter from './recycleBin';
import systemConfigRouter from './systemConfig';
import kimonoLoansRouter from './kimonoLoans';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.use('/auth', authRouter);
router.use('/students', studentsRouter);
router.use('/instructors', instructorsRouter);
router.use('/staff', staffRouter);
router.use('/users', usersRouter);
router.use('/templates', templatesRouter);
router.use('/plans', plansRouter);
router.use('/sessions', sessionsRouter);
router.use('/attendance', attendanceRouter);
router.use('/transactions', financesRouter);
router.use('/calendar', calendarRouter);
router.use('/chat', chatRouter);
router.use('/products', inventoryRouter);
router.use('/academies', academiesRouter);
router.use('/recycle-bin', recycleBinRouter);
router.use('/system-config', systemConfigRouter);
router.use('/kimono-loans', kimonoLoansRouter);

export default router;
