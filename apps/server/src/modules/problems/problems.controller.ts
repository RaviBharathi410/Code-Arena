import { Request, Response } from 'express';
import { problemsService } from './problems.service';

export class ProblemsController {
    async getAllProblems(req: Request, res: Response) {
        try {
            const problems = await problemsService.getAllProblems();
            res.json(problems);
        } catch (err: any) {
            console.error('Error fetching problems:', err);
            res.status(500).json({ message: 'Error fetching problems' });
        }
    }

    async getProblemById(req: Request, res: Response) {
        try {
            const problem = await problemsService.getProblemById(req.params.id);
            res.json(problem);
        } catch (err: any) {
            console.error('Error fetching problem:', err);
            if (err.message === 'Problem not found') {
                return res.status(404).json({ message: 'Problem not found' });
            }
            res.status(500).json({ message: 'Error fetching problem' });
        }
    }
}

export const problemsController = new ProblemsController();
