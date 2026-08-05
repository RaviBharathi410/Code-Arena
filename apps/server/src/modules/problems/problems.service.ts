import { Problem } from '../../models/Problem';

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

        const query: any = {};
        if (options.difficulty) query.difficulty = options.difficulty.toUpperCase();
        if (options.category) query.category = options.category;
        if (options.search) {
            query.$or = [
                { title: { $regex: options.search, $options: 'i' } },
                { slug: { $regex: options.search, $options: 'i' } }
            ];
        }
        
        if (options.tag) {
            query.tags = options.tag;
        }

        const totalCount = await Problem.countDocuments(query);
        const data = await Problem.find(query)
            .limit(limit)
            .skip(offset)
            .lean();

        return {
            total: totalCount,
            limit,
            offset,
            data
        };
    }

    async getProblemBySlug(slug: string) {
        const problem = await Problem.findOne({
            $or: [{ slug }, { _id: slug }] // Note: this assumes slug might be an objectId, but it's safe-ish
        }).lean();

        if (!problem) {
            throw new Error('Problem not found');
        }
        return problem;
    }

    async getProblemById(id: string) {
        const problem = await Problem.findById(id).lean();

        if (!problem) {
            throw new Error('Problem not found');
        }
        return problem;
    }

    async getRandomProblem(difficulty?: string) {
        const query: any = {};
        if (difficulty) query.difficulty = difficulty.toUpperCase();

        const [problem] = await Problem.aggregate([
            { $match: query },
            { $sample: { size: 1 } }
        ]);

        if (!problem) throw new Error('No problems found');
        return problem;
    }
}

export const problemsService = new ProblemsService();
