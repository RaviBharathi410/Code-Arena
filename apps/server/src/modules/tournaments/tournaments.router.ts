import { Router } from 'express';
import { tournamentsController } from './tournaments.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();

router.get('/', authMiddleware, tournamentsController.getAllTournaments);
router.get('/:id', authMiddleware, tournamentsController.getTournamentById);

export default router;
