import { db } from '../../db';
import { matches } from '@arena/database';
import { eq, desc, or } from 'drizzle-orm';

export class MatchesService {
    async getUserMatches(userId: string) {
        return db
            .select()
            .from(matches)
            .where(
                or(
                    eq(matches.player1Id, userId),
                    eq(matches.player2Id, userId)
                )
            )
            .orderBy(desc(matches.createdAt))
            .all();
    }

    async getRecentMatches(userId: string, limit: number = 10) {
        return db
            .select()
            .from(matches)
            .where(
                or(
                    eq(matches.player1Id, userId),
                    eq(matches.player2Id, userId)
                )
            )
            .orderBy(desc(matches.createdAt))
            .limit(limit)
            .all();
    }

    async getMatchById(id: string) {
        const match = await db.select().from(matches).where(eq(matches.id, id)).get();
        if (!match) {
            throw new Error('Match not found');
        }
        return match;
    }
}

export const matchesService = new MatchesService();
