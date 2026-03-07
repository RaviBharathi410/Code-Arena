import { Router } from 'express';
import { usersController } from './users.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireOwnership } from '../../middleware/ownership.middleware';
import { validate } from '../../middleware/validate';
import { updateUserSchema } from './users.schema';

const router = Router();

// Public profile access
router.get('/:id', usersController.getProfile);
router.get('/:id/matches', usersController.getMatches);
router.get('/:id/stats', usersController.getStats);

// Protected profile updates
router.patch('/:id', requireAuth, requireOwnership, validate(updateUserSchema), usersController.updateProfile);

export default router;
