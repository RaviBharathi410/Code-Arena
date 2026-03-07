import { Router } from 'express';
import { problemsController } from './problems.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();

router.get('/', problemsController.getAllProblems);
router.get('/random', requireAuth, problemsController.getRandomProblem);
router.get('/:id', problemsController.getProblemById);

export default router;
