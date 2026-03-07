import { Request, Response } from 'express';
import { submissionsService } from './submissions.service';

export class SubmissionsController {
    async create(req: any, res: Response) {
        try {
            const { matchId, code, languageId } = req.body;

            if (!matchId || !code || languageId === undefined) {
                return res.status(400).json({ message: 'Missing required fields' });
            }

            const submission = await submissionsService.createSubmission({
                matchId,
                userId: req.user.id,
                code,
                languageId,
            });

            // Step 22: Return 202 Accepted immediately for async processing
            res.status(202).json({
                message: 'Submission accepted for judging',
                submissionId: submission.id,
                status: submission.status,
            });
        } catch (err: any) {
            if (err.message.includes('Forbidden')) return res.status(403).json({ message: err.message });
            if (err.message.includes('not found')) return res.status(404).json({ message: err.message });
            res.status(400).json({ message: err.message });
        }
    }

    async getById(req: any, res: Response) {
        try {
            const submission = await submissionsService.getSubmissionById(req.params.id);

            // Security: Only the user who submitted can see details
            if (submission.userId !== req.user.id) {
                return res.status(403).json({ message: 'Forbidden: Not your submission' });
            }

            res.json(submission);
        } catch (err: any) {
            res.status(err.message === 'Submission not found' ? 404 : 500).json({ message: err.message });
        }
    }
}

export const submissionsController = new SubmissionsController();
