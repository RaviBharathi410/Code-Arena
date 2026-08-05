import { MatchRoom } from '../../models/MatchRoom';
import { User } from '../../models/User';
import { Submission } from '../../models/Submission';
import { RankHistory } from '../../models/RankHistory';
import { Problem } from '../../models/Problem';

export class MatchesService {
    private readonly ROOM_TTL = 7200;

    async createMatchRoom(data: { mode: '1v1' | 'practice' | 'ranked', player1Id: string, problemId?: string }) {
        const roomCode = crypto.randomBytes(3).toString('hex').toUpperCase();
        const id = crypto.randomUUID();

        let problemId = data.problemId;
        if (!problemId) {
            const [randomProblem] = await Problem.aggregate([{ $sample: { size: 1 } }]);
            if (!randomProblem) {
                logger.warn('[MATCHES] No problems found in database, using fallback null (will fail if notNull)');
            }
            problemId = randomProblem?._id;
        }

        const newRoom = await MatchRoom.create({
            _id: id,
            roomCode,
            mode: data.mode,
            status: data.mode === 'practice' ? 'active' : 'waiting',
            startedAt: data.mode === 'practice' ? new Date() : null,
            player1Id: data.player1Id,
            problemId: problemId as string,
        });

        await redis.setex(`room:${id}:ready:${data.player1Id}`, this.ROOM_TTL, 'false');
        return newRoom;
    }

    async joinMatchRoom(roomCode: string, userId: string) {
        const room = await MatchRoom.findOne({ roomCode }).lean();
        if (!room) throw new Error('Room not found');
        if (room.status !== 'waiting') throw new Error('Match already started or ended');
        if (room.player1Id === userId) return room;
        if (room.player2Id && room.player2Id !== userId) throw new Error('Room is full');

        const updatedRoom = await MatchRoom.findByIdAndUpdate(room._id, { $set: { player2Id: userId } }, { new: true }).lean();
        await redis.setex(`room:${room._id}:ready:${userId}`, this.ROOM_TTL, 'false');
        return updatedRoom;
    }

    async setReady(roomId: string, userId: string, isReady: boolean = true) {
        await redis.setex(`room:${roomId}:ready:${userId}`, this.ROOM_TTL, isReady.toString());
        const room = await MatchRoom.findById(roomId).lean();
        if (!room || !room.player2Id) return { room, bothReady: false };

        const p1Ready = await redis.get(`room:${roomId}:ready:${room.player1Id}`);
        const p2Ready = await redis.get(`room:${roomId}:ready:${room.player2Id}`);

        if (p1Ready === 'true' && p2Ready === 'true') {
            await MatchRoom.updateOne({ _id: roomId }, { $set: { status: 'active', startedAt: new Date() } });
            await redis.setex(`match:${roomId}:startedAt`, this.ROOM_TTL, Date.now().toString());
            return { room, bothReady: true };
        }
        return { room, bothReady: false };
    }

    async getMatchById(id: string) {
        return MatchRoom.findById(id).lean();
    }

    async getUserMatches(userId: string, limit = 10) {
        return MatchRoom.find({
            $or: [{ player1Id: userId }, { player2Id: userId }]
        }).sort({ createdAt: -1 }).limit(limit).lean();
    }

    async calculateMatchResult(matchId: string) {
        const room = await this.getMatchById(matchId);
        if (!room || !room.player1Id || !room.player2Id) return;

        // Fetch best submissions for both players
        const p1Sub = await Submission.findOne({
            matchId, userId: room.player1Id, status: 'ACCEPTED'
        }).sort({ finalScore: -1 }).lean();

        const p2Sub = await Submission.findOne({
            matchId, userId: room.player2Id, status: 'ACCEPTED'
        }).sort({ finalScore: -1 }).lean();

        const p1Score = p1Sub?.finalScore || 0;
        const p2Score = p2Sub?.finalScore || 0;

        let winnerId: string | null = null;
        if (p1Score > p2Score) winnerId = room.player1Id;
        else if (p2Score > p1Score) winnerId = room.player2Id;
        else if (p1Score > 0 && p2Score > 0) {
            // Tie breaker: first to submit
            winnerId = room.player1DoneAt! < room.player2DoneAt! ? room.player1Id : room.player2Id;
        }

        await MatchRoom.updateOne({ _id: matchId }, { $set: { 
            winnerId, 
            status: 'completed', 
            endedAt: new Date() 
        }});

        // Elo and Rank Updates
        let deltaP1 = 0, deltaP2 = 0;
        if (room.mode === 'ranked' && winnerId) {
            const deltas = await this.updateRankings(room.player1Id, room.player2Id, winnerId, matchId);
            deltaP1 = deltas?.deltaP1 ?? 0;
            deltaP2 = deltas?.deltaP2 ?? 0;
        }

        return { 
            winnerId, 
            p1Score, 
            p2Score, 
            p1Sub, 
            p2Sub, 
            deltaP1, 
            deltaP2,
            player1Id: room.player1Id,
            player2Id: room.player2Id
        };
    }

    private async updateRankings(p1Id: string, p2Id: string, winnerId: string, matchId: string) {
        const p1 = await User.findById(p1Id).lean();
        const p2 = await User.findById(p2Id).lean();
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
        await User.updateOne({ _id: p1Id }, { $set: {
            rankRating: newRatingP1,
            wins: (p1.wins || 0) + actualP1,
            losses: (p1.losses || 0) + (1 - actualP1),
            totalBattles: (p1.totalBattles || 0) + 1,
            tier: updateTier(newRatingP1)
        }});

        // Update User 2
        await User.updateOne({ _id: p2Id }, { $set: {
            rankRating: newRatingP2,
            wins: (p2.wins || 0) + actualP2,
            losses: (p2.losses || 0) + (1 - actualP2),
            totalBattles: (p2.totalBattles || 0) + 1,
            tier: updateTier(newRatingP2)
        }});

        // History
        await RankHistory.insertMany([
            { userId: p1Id, matchId, delta: deltaP1, newRating: newRatingP1, reason: 'MATCH_COMPLETE' },
            { userId: p2Id, matchId, delta: deltaP2, newRating: newRatingP2, reason: 'MATCH_COMPLETE' }
        ]);

        return { deltaP1, deltaP2, newRatingP1, newRatingP2 };
    }

    async getRecentMatches(userId: string, limit = 10) {
        return this.getUserMatches(userId, limit);
    }

    async forfeitMatch(matchId: string, forfeitingUserId: string) {
        const room = await this.getMatchById(matchId);
        if (!room) throw new Error('Match not found');
        if (room.status !== 'active') throw new Error('Match is not active');
        if (room.player1Id !== forfeitingUserId && room.player2Id !== forfeitingUserId) {
            throw new Error('Forbidden: You are not a player in this match');
        }

        const winnerId = room.player1Id === forfeitingUserId ? room.player2Id : room.player1Id;
        if (!winnerId) {
            await MatchRoom.updateOne({ _id: matchId }, { $set: {
                status: 'completed',
                endedAt: new Date()
            }});
            return { winnerId: null, status: 'completed' };
        }

        await MatchRoom.updateOne({ _id: matchId }, { $set: {
            winnerId,
            status: 'completed',
            endedAt: new Date()
        }});

        let deltaP1 = 0, deltaP2 = 0;
        if (room.mode === 'ranked') {
            const deltas = await this.updateRankings(room.player1Id, room.player2Id as string, winnerId, matchId);
            deltaP1 = deltas?.deltaP1 ?? 0;
            deltaP2 = deltas?.deltaP2 ?? 0;
        }

        return {
            winnerId,
            status: 'completed',
            deltaP1,
            deltaP2,
            player1Id: room.player1Id,
            player2Id: room.player2Id
        };
    }
}

export const matchesService = new MatchesService();
