import { db } from '../../db';
import { problems } from '@arena/database';
import { eq, and, sql } from 'drizzle-orm';

export class ProblemsService {
    async findAll(options: {
        limit?: number,
        offset?: number,
        difficulty?: string
    }) {
        const limit = Math.min(options.limit || 20, 100);
        const offset = options.offset || 0;
        const difficulty = options.difficulty;

        const whereClause = difficulty
            ? eq(problems.difficulty, difficulty as any)
            : undefined;

        const [totalCount] = await db.select({ value: sql<number>`count(*)` })
            .from(problems)
            .where(whereClause);

        const data = await db.select({
            id: problems.id,
            title: problems.title,
            difficulty: problems.difficulty,
            description: problems.description,
            examples: problems.examples,
            constraints: problems.constraints,
            baseCode: problems.baseCode,
            createdAt: problems.createdAt,
        })
            .from(problems)
            .where(whereClause)
            .limit(limit)
            .offset(offset)
            .all();

        return {
            total: totalCount.value,
            limit,
            offset,
            data
        };
    }

    async getProblemById(id: string) {
        const problem = await db.select({
            id: problems.id,
            title: problems.title,
            difficulty: problems.difficulty,
            description: problems.description,
            examples: problems.examples,
            constraints: problems.constraints,
            baseCode: problems.baseCode,
            createdAt: problems.createdAt,
        })
            .from(problems)
            .where(eq(problems.id, id))
            .get();

        if (!problem) {
            throw new Error('Problem not found');
        }
        return problem;
    }

    async getRandomProblem(difficulty?: string) {
        const whereClause = difficulty
            ? eq(problems.difficulty, difficulty as any)
            : undefined;

        const allIds = await db.select({ id: problems.id })
            .from(problems)
            .where(whereClause)
            .all();

        if (allIds.length === 0) throw new Error('No problems found');

        const randomId = allIds[Math.floor(Math.random() * allIds.length)].id;
        return this.getProblemById(randomId);
    }
}

export const problemsService = new ProblemsService();
