import { Router } from 'express';
import { matchesController } from './matches.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();

router.post('/create', requireAuth, matchesController.create);
router.post('/join', requireAuth, matchesController.join);
router.get('/my', requireAuth, matchesController.getMyMatches);
router.get('/:id', requireAuth, matchesController.getById);

export default router;
