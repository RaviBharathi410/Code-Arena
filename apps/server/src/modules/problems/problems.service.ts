import { db } from '../../db';
import { problems } from '@arena/database';
import { eq, and, sql, or, ilike } from 'drizzle-orm';

export class ProblemsService {
    async findAll(options: {
        limit?: number,
        offset?: number,
        difficulty?: string,
        category?: string,
        tag?: string,
        search?: string
    }) {
        const limit = Math.min(options.limit || 20, 100);
        const offset = options.offset || 0;

        const filters = [];
        if (options.difficulty) filters.push(eq(problems.difficulty, options.difficulty.toUpperCase()));
        if (options.category) filters.push(eq(problems.category, options.category));
        if (options.search) filters.push(or(ilike(problems.title, `%${options.search}%`), ilike(problems.slug, `%${options.search}%`)));
        
        // Filtering by tags (Postgres array)
        if (options.tag) {
            filters.push(sql`${problems.tags} @> ARRAY[${options.tag}]::text[]`);
        }

        const whereClause = filters.length > 0 ? and(...filters) : undefined;

        const [totalCount] = await db.select({ value: sql<number>`count(*)` })
            .from(problems)
            .where(whereClause);

        const data = await db.select({
            id: problems.id,
            slug: problems.slug,
            title: problems.title,
            difficulty: problems.difficulty,
            category: problems.category,
            description: problems.description,
            constraints: problems.constraints,
            examples: problems.examples,
            optimalTimeComplexity: problems.optimalTimeComplexity,
            optimalSpaceComplexity: problems.optimalSpaceComplexity,
            tags: problems.tags,
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

    async getProblemBySlug(slug: string) {
        const [problem] = await db.select()
            .from(problems)
            .where(or(eq(problems.slug, slug), eq(problems.id, slug)))
            .limit(1);

        if (!problem) {
            throw new Error('Problem not found');
        }
        return problem;
    }

    async getProblemById(id: string) {
        const [problem] = await db.select()
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
            ? eq(problems.difficulty, difficulty.toUpperCase())
            : undefined;

        const [problem] = await db.select()
            .from(problems)
            .where(whereClause)
            .orderBy(sql`RANDOM()`)
            .limit(1);

        if (!problem) throw new Error('No problems found');
        return problem;
    }
}

export const problemsService = new ProblemsService();
