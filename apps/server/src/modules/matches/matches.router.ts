import { Router } from 'express';
import { matchesController } from './matches.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();

router.get('/', authMiddleware, matchesController.getUserMatches);
router.get('/recent', authMiddleware, matchesController.getRecentMatches);
router.get('/:id', authMiddleware, matchesController.getMatchById);

export default router;
