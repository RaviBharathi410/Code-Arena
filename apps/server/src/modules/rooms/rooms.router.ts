import { Router } from 'express';
import { roomsController } from './rooms.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();

router.post('/create', requireAuth, roomsController.create);
router.post('/join', requireAuth, roomsController.join);
router.post('/validate-custom', requireAuth, roomsController.validateCustomProblem);
router.get('/:roomCode', requireAuth, roomsController.getByCode);
router.post('/:roomCode/kick', requireAuth, roomsController.kick);
router.post('/:roomCode/start', requireAuth, roomsController.start);

export default router;
