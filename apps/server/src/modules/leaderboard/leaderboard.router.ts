import { Router } from 'express';
import { leaderboardController } from './leaderboard.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();

router.get('/', leaderboardController.getRankings);
router.get('/me', requireAuth, leaderboardController.getMe);

export default router;
