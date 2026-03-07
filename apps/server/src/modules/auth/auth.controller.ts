import { Request, Response } from 'express';
import { authService } from './auth.service';
import { registerSchema, loginSchema } from './auth.schema';

export class AuthController {
    async register(req: Request, res: Response) {
        try {
            const validated = registerSchema.parse(req.body);
            const { accessToken, refreshToken, user } = await authService.register(validated);

            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            });

            res.status(201).json({ accessToken, user });
        } catch (err: any) {
            if (err.name === 'ZodError') {
                return res.status(400).json({
                    message: 'Validation failed',
                    errors: err.flatten().fieldErrors
                });
            }
            if (err.message === 'User already exists') {
                return res.status(409).json({ message: 'User already exists' });
            }
            console.error('Registration Error:', err);
            res.status(500).json({ message: 'Error registering user' });
        }
    }

    async login(req: Request, res: Response) {
        try {
            const validated = loginSchema.parse(req.body);
            const { accessToken, refreshToken, user } = await authService.login(
                validated.identifier,
                validated.password
            );

            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            });

            res.json({ accessToken, user });
        } catch (err: any) {
            if (err.name === 'ZodError') {
                return res.status(400).json({
                    message: 'Validation failed',
                    errors: err.flatten().fieldErrors
                });
            }
            if (err.message === 'Invalid credentials') {
                return res.status(401).json({ message: 'Invalid credentials' });
            }
            console.error('Login Error:', err);
            res.status(500).json({ message: 'Error logging in' });
        }
    }

    async refresh(req: Request, res: Response) {
        const token = req.cookies.refreshToken;
        if (!token) return res.status(401).json({ message: 'Unauthorized' });

        try {
            const { accessToken, refreshToken } = await authService.refresh(token);

            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000,
            });

            res.json({ accessToken });
        } catch (err: any) {
            res.status(401).json({ message: 'Unauthorized' });
        }
    }

    async logout(req: Request, res: Response) {
        const token = req.cookies.refreshToken;
        if (token) {
            await authService.revokeRefreshToken(token);
        }
        res.clearCookie('refreshToken');
        res.json({ message: 'Logged out successfully' });
    }

    async getProfile(req: any, res: Response) {
        try {
            const profile = await authService.getProfile(req.user.id);
            res.json(profile);
        } catch (err: any) {
            res.status(err.message === 'User not found' ? 404 : 500).json({ message: err.message });
        }
    }

    async updateProfile(req: any, res: Response) {
        try {
            const profile = await authService.updateProfile(req.user.id, req.body);
            res.json(profile);
        } catch (err: any) {
            console.error('Update Profile Error:', err);
            res.status(err.message === 'User not found' ? 404 : 500).json({ message: err.message });
        }
    }
}

export const authController = new AuthController();
