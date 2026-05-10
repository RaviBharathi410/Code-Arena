import { db } from '../../db';
import { matchRooms, users, submissions, rankHistory, problems } from '@arena/database';
import { eq, and, or, desc, sql } from 'drizzle-orm';
import crypto from 'crypto';
import { logger } from '../../lib/logger';
import { redis } from '../../lib/redis';

export class MatchesService {
    private readonly ROOM_TTL = 7200;

    async createMatchRoom(data: { mode: '1v1' | 'practice' | 'ranked', player1Id: string, problemId?: string }) {
        const roomCode = crypto.randomBytes(3).toString('hex').toUpperCase();
        const id = crypto.randomUUID();

        let problemId = data.problemId;
        if (!problemId) {
            const [randomProblem] = await db.select().from(problems).orderBy(sql`RANDOM()`).limit(1);
            if (!randomProblem) {
                logger.warn('[MATCHES] No problems found in database, using fallback null (will fail if notNull)');
            }
            problemId = randomProblem?.id;
        }

        const [newRoom] = await db.insert(matchRooms).values({
            id,
            roomCode,
            mode: data.mode,
            status: 'waiting',
            player1Id: data.player1Id,
            problemId: problemId as string,
        }).returning();

        await redis.setex(`room:${id}:ready:${data.player1Id}`, this.ROOM_TTL, 'false');
        return newRoom;
    }

    async joinMatchRoom(roomCode: string, userId: string) {
        const room = await db.query.matchRooms.findFirst({ where: eq(matchRooms.roomCode, roomCode) });
        if (!room) throw new Error('Room not found');
        if (room.status !== 'waiting') throw new Error('Match already started or ended');
        if (room.player1Id === userId) return room;
        if (room.player2Id && room.player2Id !== userId) throw new Error('Room is full');

        const [updatedRoom] = await db.update(matchRooms).set({ player2Id: userId }).where(eq(matchRooms.id, room.id)).returning();
        await redis.setex(`room:${room.id}:ready:${userId}`, this.ROOM_TTL, 'false');
        return updatedRoom;
    }

    async setReady(roomId: string, userId: string, isReady: boolean = true) {
        await redis.setex(`room:${roomId}:ready:${userId}`, this.ROOM_TTL, isReady.toString());
        const room = await db.query.matchRooms.findFirst({ where: eq(matchRooms.id, roomId) });
        if (!room || !room.player2Id) return { room, bothReady: false };

        const p1Ready = await redis.get(`room:${roomId}:ready:${room.player1Id}`);
        const p2Ready = await redis.get(`room:${roomId}:ready:${room.player2Id}`);

        if (p1Ready === 'true' && p2Ready === 'true') {
            await db.update(matchRooms).set({ status: 'active', startedAt: new Date() }).where(eq(matchRooms.id, roomId));
            await redis.setex(`match:${roomId}:startedAt`, this.ROOM_TTL, Date.now().toString());
            return { room, bothReady: true };
        }
        return { room, bothReady: false };
    }

    async getMatchById(id: string) {
        return db.query.matchRooms.findFirst({
            where: eq(matchRooms.id, id),
            with: { player1: true, player2: true, problem: true, submissions: true }
        });
    }

    async getUserMatches(userId: string, limit = 10) {
        return db.query.matchRooms.findMany({
            where: or(eq(matchRooms.player1Id, userId), eq(matchRooms.player2Id, userId)),
            orderBy: [desc(matchRooms.createdAt)],
            limit,
            with: { player1: true, player2: true, problem: true }
        });
    }

    async calculateMatchResult(matchId: string) {
        const room = await this.getMatchById(matchId);
        if (!room || !room.player1Id || !room.player2Id) return;

        // Fetch best submissions for both players
        const p1Sub = await db.query.submissions.findFirst({
            where: and(eq(submissions.matchId, matchId), eq(submissions.userId, room.player1Id), eq(submissions.status, 'ACCEPTED')),
            orderBy: [desc(submissions.finalScore)]
        });

        const p2Sub = await db.query.submissions.findFirst({
            where: and(eq(submissions.matchId, matchId), eq(submissions.userId, room.player2Id), eq(submissions.status, 'ACCEPTED')),
            orderBy: [desc(submissions.finalScore)]
        });

        const p1Score = p1Sub?.finalScore || 0;
        const p2Score = p2Sub?.finalScore || 0;

        let winnerId: string | null = null;
        if (p1Score > p2Score) winnerId = room.player1Id;
        else if (p2Score > p1Score) winnerId = room.player2Id;
        else if (p1Score > 0 && p2Score > 0) {
            // Tie breaker: first to submit
            winnerId = room.player1DoneAt! < room.player2DoneAt! ? room.player1Id : room.player2Id;
        }

        await db.update(matchRooms).set({ 
            winnerId, 
            status: 'completed', 
            endedAt: new Date() 
        }).where(eq(matchRooms.id, matchId));

        // Elo and Rank Updates
        if (room.mode === 'ranked' && winnerId) {
            await this.updateRankings(room.player1Id, room.player2Id, winnerId, matchId);
        }

        return { winnerId, p1Score, p2Score, p1Sub, p2Sub };
    }

    private async updateRankings(p1Id: string, p2Id: string, winnerId: string, matchId: string) {
        const p1 = await db.query.users.findFirst({ where: eq(users.id, p1Id) });
        const p2 = await db.query.users.findFirst({ where: eq(users.id, p2Id) });
        if (!p1 || !p2) return;

        const K = 32;
        const expectedP1 = 1 / (1 + Math.pow(10, (p2.rankRating - p1.rankRating) / 400));
        const expectedP2 = 1 / (1 + Math.pow(10, (p1.rankRating - p2.rankRating) / 400));

        const actualP1 = winnerId === p1Id ? 1 : 0;
        const actualP2 = winnerId === p2Id ? 1 : 0;

        const deltaP1 = Math.round(K * (actualP1 - expectedP1));
        const deltaP2 = Math.round(K * (actualP2 - expectedP2));

        const newRatingP1 = p1.rankRating + deltaP1;
        const newRatingP2 = p2.rankRating + deltaP2;

        const updateTier = (rating: number) => {
            if (rating >= 2000) return 'OPERATOR';
            if (rating >= 1800) return 'DIAMOND';
            if (rating >= 1600) return 'PLATINUM';
            if (rating >= 1400) return 'GOLD';
            if (rating >= 1200) return 'SILVER';
            if (rating >= 1000) return 'BRONZE';
            return 'IRON';
        };

        // Update User 1
        await db.update(users).set({
            rankRating: newRatingP1,
            wins: (p1.wins || 0) + actualP1,
            losses: (p1.losses || 0) + (1 - actualP1),
            totalBattles: (p1.totalBattles || 0) + 1,
            tier: updateTier(newRatingP1)
        }).where(eq(users.id, p1Id));

        // Update User 2
        await db.update(users).set({
            rankRating: newRatingP2,
            wins: (p2.wins || 0) + actualP2,
            losses: (p2.losses || 0) + (1 - actualP2),
            totalBattles: (p2.totalBattles || 0) + 1,
            tier: updateTier(newRatingP2)
        }).where(eq(users.id, p2Id));

        // History
        await db.insert(rankHistory).values([
            { userId: p1Id, matchId, delta: deltaP1, newRating: newRatingP1, reason: 'MATCH_COMPLETE' },
            { userId: p2Id, matchId, delta: deltaP2, newRating: newRatingP2, reason: 'MATCH_COMPLETE' }
        ]);
    }
}

export const matchesService = new MatchesService();
