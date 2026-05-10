import { Router } from 'express';
import { problemsController } from './problems.controller';

const router = Router();

router.get('/', problemsController.getAllProblems);
router.get('/random', problemsController.getRandomProblem);
router.get('/:slug', problemsController.getProblemBySlug);

export default router;
