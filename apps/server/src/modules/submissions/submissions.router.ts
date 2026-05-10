import { Router } from 'express';
import { submissionsController } from './submissions.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();

router.post('/execute', requireAuth, submissionsController.execute);
router.get('/:id', requireAuth, submissionsController.getById);

export default router;
