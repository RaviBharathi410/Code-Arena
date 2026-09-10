import { MatchRoom } from '../../models/MatchRoom';
import { User } from '../../models/User';
import { Submission } from '../../models/Submission';
import { RankHistory } from '../../models/RankHistory';
import { Problem } from '../../models/Problem';
import * as crypto from "crypto";
import { logger } from '../../lib/logger';
import { redis, isRedisReady } from '../../lib/redis';
import { notificationsService } from '../notifications/notifications.service';
import mongoose from 'mongoose';

export class MatchesService {
    private readonly ROOM_TTL = 7200;
    private static readyStatusMap = new Map<string, string>();

    async createMatchRoom(data: { mode: '1v1' | 'practice' | 'ranked', player1Id: string, problemId?: string }) {
        const roomCode = crypto.randomBytes(3).toString('hex').toUpperCase();

        let problemDoc: any = null;
        if (data.problemId) {
            const query: any[] = [{ slug: data.problemId }];
            if (mongoose.Types.ObjectId.isValid(data.problemId)) {
                query.push({ _id: data.problemId });
            }
            problemDoc = await Problem.findOne({ $or: query }).lean();
        }

        if (!problemDoc) {
            try {
                const [randomProblem] = await Problem.aggregate([{ $sample: { size: 1 } }]);
                problemDoc = randomProblem;
            } catch {
                problemDoc = null;
            }
        }

        if (!problemDoc) {
            problemDoc = await Problem.findOne().lean();
        }

        if (!problemDoc) {
            problemDoc = await Problem.create({
                slug: 'two-sum',
                title: 'Two Sum',
                difficulty: 'EASY',
                category: 'Arrays',
                description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
                constraints: '2 <= nums.length <= 10^4',
                boilerplate: {
                    js: 'function twoSum(nums, target) {\n    return [0, 1];\n}\n',
                    python: 'def two_sum(nums, target):\n    return [0, 1]\n'
                },
                testCases: [{ input: '[2,7,11,15]\n9', expectedOutput: '[0,1]' }]
            });
        }

        const safePlayer1Id = mongoose.Types.ObjectId.isValid(data.player1Id)
            ? new mongoose.Types.ObjectId(data.player1Id)
            : new mongoose.Types.ObjectId();

        const newRoom = await MatchRoom.create({
            roomCode,
            mode: data.mode,
            status: data.mode === "practice" ? "active" : "waiting",
            startedAt: data.mode === "practice" ? new Date() : null,
            player1Id: safePlayer1Id,
            problemId: problemDoc._id,
        });

        try {
            await redis.set(
                `room:${newRoom._id.toString()}:ready:${data.player1Id}`,
                "false",
                "EX",
                this.ROOM_TTL
            );
        } catch (e) {
            logger.warn({ err: e }, '[MATCHES] Redis ready set skipped');
        }

        return newRoom;
    }

    async joinMatchRoom(roomCode: string, userId: string) {
        const sanitizedCode = (roomCode || '').trim().toUpperCase();
        const room = await MatchRoom.findOne({ roomCode: sanitizedCode }).lean();
        if (!room) throw new Error('Room not found');
        if (room.status !== 'waiting') throw new Error('Match already started or ended');
        if (room.player1Id.toString() === userId) return room;
        if (room.player2Id && room.player2Id.toString() !== userId) throw new Error('Room is full');

        const updatedRoom = await MatchRoom.findByIdAndUpdate(room._id, { $set: { player2Id: userId } }, { new: true }).lean();
        await redis.setex(`room:${room._id}:ready:${userId}`, this.ROOM_TTL, 'false');
        return updatedRoom;
    }

    async setReady(roomId: string, userId: string, isReady: boolean = true) {
        const key = `room:${roomId}:ready:${userId}`;
        MatchesService.readyStatusMap.set(key, isReady.toString());
        if (isRedisReady()) {
            await redis.setex(key, this.ROOM_TTL, isReady.toString()).catch(() => {});
        }

        const room = await MatchRoom.findById(roomId).lean();
        if (!room || !room.player2Id) return { room, bothReady: false };

        const p1Id = room.player1Id.toString();
        const p2Id = room.player2Id.toString();

        let p1Ready = MatchesService.readyStatusMap.get(`room:${roomId}:ready:${p1Id}`);
        let p2Ready = MatchesService.readyStatusMap.get(`room:${roomId}:ready:${p2Id}`);

        if (isRedisReady()) {
            if (p1Ready !== 'true') p1Ready = (await redis.get(`room:${roomId}:ready:${p1Id}`)) || p1Ready;
            if (p2Ready !== 'true') p2Ready = (await redis.get(`room:${roomId}:ready:${p2Id}`)) || p2Ready;
        }

        if (p1Ready === 'true' && p2Ready === 'true') {
            await MatchRoom.updateOne({ _id: roomId }, { $set: { status: 'active', startedAt: new Date() } });
            if (isRedisReady()) {
                await redis.setex(`match:${roomId}:startedAt`, this.ROOM_TTL, Date.now().toString()).catch(() => {});
            }
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
        })
        .populate('player1Id', 'username elo avatar rank tier')
        .populate('player2Id', 'username elo avatar rank tier')
        .populate('problemId', 'title slug difficulty category')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
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
        if (p1Score > p2Score) winnerId = room.player1Id.toString();
        else if (p2Score > p1Score) winnerId = room.player2Id.toString();
        else if (p1Score > 0 && p2Score > 0) {
            // Tie breaker: first to submit
            winnerId = room.player1DoneAt! < room.player2DoneAt! ? room.player1Id.toString() : room.player2Id.toString();
        }

        // Elo and Rank Updates (Ranked Matches Only; Room-based / Private / Practice are strictly 0 RP)
        let deltaP1 = 0, deltaP2 = 0;
        if (room.mode === 'ranked') {
            const deltas = await this.updateRankings(room.player1Id.toString(), room.player2Id.toString(), winnerId, matchId);
            deltaP1 = deltas?.deltaP1 ?? 0;
            deltaP2 = deltas?.deltaP2 ?? 0;
        }

        await MatchRoom.updateOne({ _id: matchId }, {
            $set: {
                winnerId,
                status: 'completed',
                endedAt: new Date(),
                deltaP1,
                deltaP2
            }
        });

        // Dispatch notifications to both participants
        try {
            const p1Win = winnerId === room.player1Id.toString();
            const p1Msg = room.mode === 'ranked'
                ? `Ranked duel concluded: ${p1Win ? 'Victory' : 'Defeat'} (${deltaP1 >= 0 ? `+${deltaP1}` : deltaP1} RP)`
                : `Room match concluded: ${p1Win ? 'Victory' : 'Defeat'} (Unranked)`;
            await notificationsService.createNotification({
                userId: room.player1Id,
                title: p1Win ? 'Combat Victory' : 'Combat Defeat',
                message: p1Msg,
                type: 'match',
                data: { matchId, delta: deltaP1 }
            });

            if (room.player2Id) {
                const p2Win = winnerId === room.player2Id.toString();
                const p2Msg = room.mode === 'ranked'
                    ? `Ranked duel concluded: ${p2Win ? 'Victory' : 'Defeat'} (${deltaP2 >= 0 ? `+${deltaP2}` : deltaP2} RP)`
                    : `Room match concluded: ${p2Win ? 'Victory' : 'Defeat'} (Unranked)`;
                await notificationsService.createNotification({
                    userId: room.player2Id,
                    title: p2Win ? 'Combat Victory' : 'Combat Defeat',
                    message: p2Msg,
                    type: 'match',
                    data: { matchId, delta: deltaP2 }
                });
            }
        } catch (notifErr) {
            logger.warn({ err: notifErr }, 'Failed to persist match completion notifications');
        }

        return {
            winnerId,
            p1Score,
            p2Score,
            p1Sub,
            p2Sub,
            deltaP1,
            deltaP2,
            player1Id: room.player1Id.toString(),
            player2Id: room.player2Id.toString()
        };
    }

    async updateRankings(p1IdOrRoom: any, p2IdArg?: string, winnerIdArg?: string | null, matchIdArg?: string) {
        let p1Id: string;
        let p2Id: string;
        let winnerId: string | null = null;
        let matchId: string;

        if (typeof p1IdOrRoom === 'object' && p1IdOrRoom !== null) {
            const room = p1IdOrRoom;
            if (room.mode !== 'ranked') {
                return {
                    deltaP1: 0,
                    deltaP2: 0,
                    deltaA: 0,
                    deltaB: 0,
                    newRatingP1: 0,
                    newRatingP2: 0,
                    isPairFarming: false,
                    abuseClamped: false
                };
            }
            p1Id = (room.player1Id?._id || room.player1Id)?.toString();
            p2Id = (room.player2Id?._id || room.player2Id)?.toString();
            winnerId = room.winnerId ? (room.winnerId._id || room.winnerId).toString() : null;
            matchId = (room._id || room.id)?.toString();
        } else {
            p1Id = p1IdOrRoom;
            p2Id = p2IdArg!;
            winnerId = winnerIdArg ?? null;
            matchId = matchIdArg!;
        }

        const p1 = await User.findById(p1Id).lean();
        const p2 = await User.findById(p2Id).lean();
        if (!p1 || !p2) {
            return {
                deltaP1: 0,
                deltaP2: 0,
                deltaA: 0,
                deltaB: 0,
                newRatingP1: 0,
                newRatingP2: 0,
                isPairFarming: false,
                abuseClamped: false
            };
        }

        // Anti-Abuse: Track pair matches over a 24-hour sliding window
        const sortedPairKey = `ranked:pair:${[p1Id, p2Id].sort().join(':')}`;
        let pairMatchCount = 1;
        try {
            pairMatchCount = await redis.incr(sortedPairKey);
            if (pairMatchCount === 1) {
                await redis.expire(sortedPairKey, 86400); // 24 hours
            }
        } catch (redisErr) {
            logger.warn({ error: redisErr }, '[RANKING] Redis pair counter failed, proceeding with standard check');
        }

        const isPairFarming = pairMatchCount > 2;
        if (isPairFarming) {
            logger.warn({ p1Id, p2Id, pairMatchCount }, '[INTEGRITY] Rapid-fire pair farming detected; RP delta clamped to 0');
        }

        // Expected score calculation
        const expectedP1 = 1 / (1 + Math.pow(10, (p2.rankRating - p1.rankRating) / 400));
        const expectedP2 = 1 / (1 + Math.pow(10, (p1.rankRating - p2.rankRating) / 400));

        // Actual score: 1 = win, 0 = loss, 0.5 = draw (e.g. timeout / no winner)
        const isDraw = !winnerId;
        const actualP1 = isDraw ? 0.5 : (winnerId === p1Id ? 1 : 0);
        const actualP2 = isDraw ? 0.5 : (winnerId === p2Id ? 1 : 0);

        // K-Factor: K=64 during placement matches (first 5), K=32 post-placement
        const p1PlacementsRemaining = p1.placementMatchesRemaining ?? (p1.totalBattles < 5 ? 5 - p1.totalBattles : 0);
        const p2PlacementsRemaining = p2.placementMatchesRemaining ?? (p2.totalBattles < 5 ? 5 - p2.totalBattles : 0);

        const kP1 = p1PlacementsRemaining > 0 ? 64 : 32;
        const kP2 = p2PlacementsRemaining > 0 ? 64 : 32;

        let deltaP1 = Math.round(kP1 * (actualP1 - expectedP1));
        let deltaP2 = Math.round(kP2 * (actualP2 - expectedP2));

        // Clamp to 0 if pair farming detected
        if (isPairFarming) {
            deltaP1 = 0;
            deltaP2 = 0;
        }

        // RP Floor: Rating cannot drop below 0
        const newRatingP1 = Math.max(0, p1.rankRating + deltaP1);
        const newRatingP2 = Math.max(0, p2.rankRating + deltaP2);

        const nextP1Placements = Math.max(0, p1PlacementsRemaining - 1);
        const nextP2Placements = Math.max(0, p2PlacementsRemaining - 1);

        // Canonical Tier Ladder (Replaced conflicting 'OPERATOR' with 'GRANDMASTER')
        const calculateTier = (rating: number, placementsRemaining: number) => {
            if (placementsRemaining > 0) return 'PLACEMENT';
            if (rating >= 2000) return 'GRANDMASTER';
            if (rating >= 1800) return 'DIAMOND';
            if (rating >= 1600) return 'PLATINUM';
            if (rating >= 1400) return 'GOLD';
            if (rating >= 1200) return 'SILVER';
            if (rating >= 1000) return 'BRONZE';
            return 'IRON';
        };

        const tierP1 = calculateTier(newRatingP1, nextP1Placements);
        const tierP2 = calculateTier(newRatingP2, nextP2Placements);

        // Update User 1
        await User.updateOne({ _id: p1Id }, {
            $set: {
                rankRating: newRatingP1,
                eloRating: newRatingP1,
                wins: (p1.wins || 0) + (actualP1 === 1 ? 1 : 0),
                losses: (p1.losses || 0) + (actualP1 === 0 ? 1 : 0),
                totalBattles: (p1.totalBattles || 0) + 1,
                matchesPlayed: (p1.matchesPlayed || 0) + 1,
                matchesWon: (p1.matchesWon || 0) + (actualP1 === 1 ? 1 : 0),
                placementMatchesRemaining: nextP1Placements,
                tier: tierP1,
            }
        });

        // Update User 2
        await User.updateOne({ _id: p2Id }, {
            $set: {
                rankRating: newRatingP2,
                eloRating: newRatingP2,
                wins: (p2.wins || 0) + (actualP2 === 1 ? 1 : 0),
                losses: (p2.losses || 0) + (actualP2 === 0 ? 1 : 0),
                totalBattles: (p2.totalBattles || 0) + 1,
                matchesPlayed: (p2.matchesPlayed || 0) + 1,
                matchesWon: (p2.matchesWon || 0) + (actualP2 === 1 ? 1 : 0),
                placementMatchesRemaining: nextP2Placements,
                tier: tierP2,
            }
        });

        // Record Rank History
        const reason = isPairFarming ? 'INTEGRITY_FARMING_BLOCKED' : (isDraw ? 'MATCH_DRAW' : 'MATCH_COMPLETE');
        await RankHistory.insertMany([
            { userId: p1Id, matchId, delta: deltaP1, newRating: newRatingP1, reason },
            { userId: p2Id, matchId, delta: deltaP2, newRating: newRatingP2, reason }
        ]);

        return {
            deltaP1,
            deltaP2,
            deltaA: deltaP1,
            deltaB: deltaP2,
            newRatingP1,
            newRatingP2,
            isPairFarming,
            abuseClamped: isPairFarming
        };
    }

    async getRecentMatches(userId: string, limit = 10) {
        return this.getUserMatches(userId, limit);
    }

    async forfeitMatch(matchId: string, forfeitingUserId: string) {
        const room = await this.getMatchById(matchId);
        if (!room) throw new Error('Match not found');
        if (room.status !== 'active') throw new Error('Match is not active');
        if (room.player1Id.toString() !== forfeitingUserId && room.player2Id?.toString() !== forfeitingUserId) {
            throw new Error('Forbidden: You are not a player in this match');
        }

        const winnerId = room.player1Id.toString() === forfeitingUserId ? room.player2Id : room.player1Id;
        if (!winnerId) {
            await MatchRoom.updateOne({ _id: matchId }, {
                $set: {
                    status: 'completed',
                    endedAt: new Date()
                }
            });
            return { winnerId: null, status: 'completed' };
        }

        await MatchRoom.updateOne({ _id: matchId }, {
            $set: {
                winnerId,
                status: 'completed',
                endedAt: new Date()
            }
        });

        let deltaP1 = 0, deltaP2 = 0;
        if (room.mode === 'ranked') {
            const deltas = await this.updateRankings(room.player1Id.toString(), room.player2Id?.toString() as string, winnerId.toString(), matchId);
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
