import { Router } from 'express';
import { leaderboardController } from './leaderboard.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();

router.get('/', authMiddleware, leaderboardController.getRankings);

export default router;
