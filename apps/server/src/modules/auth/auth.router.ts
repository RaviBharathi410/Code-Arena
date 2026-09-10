import { Router } from 'express';
import { authController } from './auth.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate';
import { registerBodySchema, loginBodySchema, updateProfileBodySchema, googleAuthBodySchema } from './auth.schema';

const router = Router();

// Public — no auth required; validate() guards all input
router.post('/register', validate(registerBodySchema), authController.register);
router.post('/login', validate(loginBodySchema), authController.login);
router.post('/google', validate(googleAuthBodySchema), authController.googleAuth);
router.post('/demo', authController.demoLogin);
router.post('/refresh', authController.refresh);

// Protected/Optional — requireAuth only for profile/me
router.post('/logout', authController.logout);
router.get('/me', requireAuth, authController.getProfile);

export default router;
