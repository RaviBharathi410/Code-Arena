import { Router } from 'express';
import { authController } from './auth.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

// Example of protected route within the same router if needed
router.get('/profile', requireAuth, authController.getProfile);
router.patch('/profile', requireAuth, authController.updateProfile);

export default router;
