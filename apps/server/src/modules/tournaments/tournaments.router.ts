import { Router } from 'express';
import { tournamentsController } from './tournaments.controller';
import { authMiddleware, requireAdmin } from '../../middleware/auth.middleware';

const router = Router();

// Public reads (auth still required to prevent scraping)
router.get('/', authMiddleware, tournamentsController.getAllTournaments.bind(tournamentsController));
router.get('/:id', authMiddleware, tournamentsController.getTournamentById.bind(tournamentsController));

// Participant actions
router.post('/:id/join', authMiddleware, tournamentsController.joinTournament.bind(tournamentsController));
router.delete('/:id/leave', authMiddleware, tournamentsController.leaveTournament.bind(tournamentsController));

// Admin only: create tournaments
router.post('/', authMiddleware, requireAdmin, tournamentsController.createTournament.bind(tournamentsController));

export default router;
