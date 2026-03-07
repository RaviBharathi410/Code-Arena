import { Router } from 'express';
import { submissionsController } from './submissions.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();

router.post('/', requireAuth, submissionsController.create);
router.get('/:id', requireAuth, submissionsController.getById);

export default router;
