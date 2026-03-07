import { Router } from 'express';
import { matchesController } from './matches.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();

router.get('/', requireAuth, matchesController.getUserMatches);
router.get('/recent', requireAuth, matchesController.getRecentMatches);
router.get('/:id', requireAuth, matchesController.getMatchById);
router.post('/:id/forfeit', requireAuth, matchesController.forfeit);

export default router;
