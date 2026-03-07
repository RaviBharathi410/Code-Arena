import { db } from '../../db';
import { matches, users } from '@arena/database';
import { eq, desc, or } from 'drizzle-orm';
import { logger } from '../../lib/logger';

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

    async forfeitMatch(matchId: string, userId: string) {
        const match = await this.getMatchById(matchId);

        if (match.status !== 'active') {
            throw new Error('Match is not active');
        }

        if (match.player1Id !== userId && match.player2Id !== userId) {
            throw new Error('Forbidden: Not a participant');
        }

        const winnerId = match.player1Id === userId ? match.player2Id : match.player1Id;

        if (!winnerId) {
            throw new Error('Opponent not found');
        }

        return this.setWinner(matchId, winnerId);
    }

    async setWinner(matchId: string, winnerId: string) {
        return db.transaction(async (tx) => {
            const match = await tx.select().from(matches).where(eq(matches.id, matchId)).get();
            if (!match || match.status !== 'active' || match.winnerId) {
                return match;
            }

            // 1. Update Match record
            const [updatedMatch] = await tx.update(matches)
                .set({
                    winnerId,
                    status: 'completed',
                    endedAt: new Date().toISOString()
                })
                .where(eq(matches.id, matchId))
                .returning();

            // 2. Fetch players for ELO update
            const player1 = await tx.select().from(users).where(eq(users.id, match.player1Id)).get();
            // player2Id is nullable in schema, but for competitive matches it should be present.
            const player2 = match.player2Id
                ? await tx.select().from(users).where(eq(users.id, match.player2Id))?.get()
                : null;

            if (player1 && player2) {
                const winner = player1.id === winnerId ? player1 : player2;
                const loser = player1.id === winnerId ? player2 : player1;

                const { winnerGain, loserLoss } = this.calculateEloChange(winner.elo, loser.elo);

                // 3. Apply ELO and stats updates
                await tx.update(users)
                    .set({
                        elo: winner.elo + winnerGain,
                        wins: (winner.wins || 0) + 1
                    })
                    .where(eq(users.id, winner.id));

                await tx.update(users)
                    .set({
                        elo: Math.max(0, loser.elo + loserLoss),
                        losses: (loser.losses || 0) + 1
                    })
                    .where(eq(users.id, loser.id));

                logger.info(`[ELO] Match ${matchId} winner determined: ${winner.username} (+${winnerGain}) beat ${loser.username} (${loserLoss})`);
            }

            return updatedMatch;
        });
    }

    private calculateEloChange(winnerElo: number, loserElo: number) {
        const K = 32;
        const expected = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
        const change = Math.round(K * (1 - expected));
        return { winnerGain: change, loserLoss: -change };
    }
}

export const matchesService = new MatchesService();
