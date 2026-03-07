import { db } from '../../db';
import { problems } from '@arena/database';
import { eq } from 'drizzle-orm';

export class ProblemsService {
    async getAllProblems() {
        return db.select().from(problems).all();
    }

    async getProblemById(id: string) {
        const problem = await db.select().from(problems).where(eq(problems.id, id)).get();
        if (!problem) {
            throw new Error('Problem not found');
        }
        return problem;
    }
}

export const problemsService = new ProblemsService();
