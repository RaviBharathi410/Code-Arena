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
            .offset(offset);

        return {
            total: Number(totalCount?.value || 0),
            limit,
            offset,
            data
        };
    }

    async getProblemById(id: string) {
        const [problem] = await db.select({
            id: problems.id,
            title: problems.title,
            difficulty: problems.difficulty,
            description: problems.description,
            examples: problems.examples,
            constraints: problems.constraints,
            baseCode: problems.baseCode,
            createdAt: problems.createdAt,
            testCases: problems.testCases,
        })
            .from(problems)
            .where(eq(problems.id, id))
            .limit(1);

        if (!problem) {
            throw new Error('Problem not found');
        }
        return problem;
    }

    async getRandomProblem(difficulty?: string) {
        const whereClause = difficulty
            ? eq(problems.difficulty, difficulty as any)
            : undefined;

        // Optimized: Use ORDER BY RANDOM() for PostgreSQL
        const [problem] = await db.select({
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
            .orderBy(sql`RANDOM()`)
            .limit(1);

        if (!problem) throw new Error('No problems found');
        return problem;
    }
}

export const problemsService = new ProblemsService();
