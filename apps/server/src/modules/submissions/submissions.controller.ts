import { Request, Response } from 'express';
import { submissionsService } from './submissions.service';

export class SubmissionsController {
    async execute(req: Request, res: Response) {
        try {
            const { matchId, code, language, mode } = req.body;
            const result = await submissionsService.executeCode({
                matchId,
                userId: (req as any).user.id,
                code,
                language,
                mode
            });
            res.json(result);
        } catch (err: any) {
            res.status(400).json({ message: err.message });
        }
    }

    async getById(req: Request, res: Response) {
        try {
            const submission = await submissionsService.getSubmissionById(req.params.id);
            res.json(submission);
        } catch (err: any) {
            res.status(404).json({ message: err.message });
        }
    }
}

export const submissionsController = new SubmissionsController();
