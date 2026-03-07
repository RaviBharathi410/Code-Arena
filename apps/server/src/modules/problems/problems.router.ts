import { Router } from 'express';
import { problemsController } from './problems.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();

router.get('/', authMiddleware, problemsController.getAllProblems);
router.get('/:id', authMiddleware, problemsController.getProblemById);

export default router;
