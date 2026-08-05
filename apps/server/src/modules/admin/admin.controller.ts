import { Request, Response } from 'express';
import { adminService } from './admin.service';
import { monitor } from '../../lib/monitor';
import { z } from 'zod';

const listUsersSchema = z.object({
    limit: z.coerce.number().min(1).max(200).optional(),
    offset: z.coerce.number().min(0).optional(),
    role: z.string().optional(),
});

const updateUserRoleSchema = z.object({
    userId: z.string().uuid(),
    role: z.enum(['player', 'moderator', 'admin']),
});

const banUserSchema = z.object({
    userId: z.string().uuid(),
    reason: z.string().optional(),
});

export class AdminController {
    async listUsers(req: Request, res: Response) {
        try {
            const validated = listUsersSchema.parse(req.query);
            const users = await adminService.listUsers(validated);
            res.json(users);
        } catch (err: any) {
            if (err.name === 'ZodError') return res.status(400).json({ message: 'Validation failed', errors: err.flatten().fieldErrors });
            res.status(500).json({ message: err.message });
        }
    }

    async getUserDetail(req: Request, res: Response) {
        try {
            const user = await adminService.getUserDetail(req.params.id);
            res.json(user);
        } catch (err: any) {
            res.status(404).json({ message: err.message });
        }
    }

    async updateUserRole(req: any, res: Response) {
        try {
            const validated = updateUserRoleSchema.parse(req.body);
            const updated = await adminService.updateUserRole(req.user.id, validated.userId, validated.role);
            res.json(updated);
        } catch (err: any) {
            if (err.name === 'ZodError') return res.status(400).json({ message: 'Validation failed', errors: err.flatten().fieldErrors });
            res.status(400).json({ message: err.message });
        }
    }

    async banUser(req: any, res: Response) {
        try {
            const validated = banUserSchema.parse(req.body);
            const updated = await adminService.banUser(req.user.id, validated.userId, validated.reason || 'No reason specified');
            res.json(updated);
        } catch (err: any) {
            if (err.name === 'ZodError') return res.status(400).json({ message: 'Validation failed', errors: err.flatten().fieldErrors });
            res.status(err.status || 404).json({ message: err.message });
        }
    }

    async unbanUser(req: any, res: Response) {
        try {
            const updated = await adminService.unbanUser(req.user.id, req.params.id);
            res.json(updated);
        } catch (err: any) {
            res.status(err.status || 404).json({ message: err.message });
        }
    }

    async resetUserElo(req: Request, res: Response) {
        try {
            const updated = await adminService.resetUserElo(req.params.id);
            res.json(updated);
        } catch (err: any) {
            res.status(404).json({ message: err.message });
        }
    }

    async getSystemStats(req: Request, res: Response) {
        try {
            const stats = await adminService.getSystemStats();
            res.json(stats);
        } catch (err: any) {
            res.status(500).json({ message: err.message });
        }
    }

    async getMetrics(req: Request, res: Response) {
        try {
            const metrics = await monitor.getMetrics();
            res.json(metrics);
        } catch (err: any) {
            res.status(500).json({ message: err.message });
        }
    }
}

export const adminController = new AdminController();
