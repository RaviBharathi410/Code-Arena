import { Request, Response } from 'express';
import { problemsService } from './problems.service';

export class ProblemsController {
    async getAllProblems(req: Request, res: Response) {
        try {
            const { limit, offset, difficulty, category, tag, search } = req.query;
            const problems = await problemsService.findAll({
                limit: limit ? parseInt(limit as string) : undefined,
                offset: offset ? parseInt(offset as string) : undefined,
                difficulty: difficulty as string,
                category: category as string,
                tag: tag as string,
                search: search as string,
            });
            res.json(problems);
        } catch (err: any) {
            res.status(500).json({ message: 'Error fetching problems' });
        }
    }

    async getProblemBySlug(req: Request, res: Response) {
        try {
            const problem = await problemsService.getProblemBySlug(req.params.slug);
            res.json(problem);
        } catch (err: any) {
            if (err.message === 'Problem not found') {
                return res.status(404).json({ message: 'Problem not found' });
            }
            res.status(500).json({ message: 'Error fetching problem' });
        }
    }

    async getRandomProblem(req: Request, res: Response) {
        try {
            const { difficulty } = req.query;
            const problem = await problemsService.getRandomProblem(difficulty as string);
            res.json(problem);
        } catch (err: any) {
            res.status(err.message === 'No problems found' ? 404 : 500).json({ message: err.message });
        }
    }
}

export const problemsController = new ProblemsController();
