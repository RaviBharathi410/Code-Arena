import { redis } from '../../lib/redis';
import { logger } from '../../lib/logger';
import crypto from 'crypto';
import { Server } from 'socket.io';
import { problemsService } from '../problems/problems.service';
import { matchmakingQueue, type MatchPair } from '../../lib/matchmaking-queue';
import { matchesService } from '../matches/matches.service';
import { User } from '../../models/User';
import { Problem } from '../../models/Problem';
import { MatchRoom } from '../../models/MatchRoom';
export class MatchmakingService {
    private userTimeouts: Map<string, NodeJS.Timeout> = new Map();

    constructor(private io: Server) {
        matchmakingQueue.onMatch((pair: MatchPair) => {
            this.clearUserTimeout(pair.player1Id);
            this.clearUserTimeout(pair.player2Id);
            this.createMatch(pair.player1Id, pair.player2Id);
        });

        matchmakingQueue.startPolling();
        logger.info('[MATCHMAKING] Service initialized with background polling');
    }

    private clearUserTimeout(userId: string) {
        const timer = this.userTimeouts.get(userId);
        if (timer) {
            clearTimeout(timer);
            this.userTimeouts.delete(userId);
        }
    }

    async findMatch(userId: string, eloRating: number) {
        // Non-blocking cleanup of any stale uncompleted rooms for this user
        MatchRoom.updateMany(
            {
                $or: [{ player1Id: userId }, { player2Id: userId }],
                status: { $in: ['waiting', 'active'] },
                mode: { $ne: 'practice' }
            },
            { $set: { status: 'abandoned' } }
        ).catch(err => logger.warn({ err }, '[MATCHMAKING] Auto-abandon failed'));

        if (matchmakingQueue.hasUser(userId)) {
            logger.info({ userId }, '[MATCHMAKING] User already in queue — refreshing queue entry');
        }

        logger.info({ userId, eloRating }, '[MATCHMAKING] User joining queue');
        this.clearUserTimeout(userId);
        await matchmakingQueue.addToQueue(userId, eloRating);

        // Give live human users 30 seconds to pair up naturally via queue polling
        const timer = setTimeout(async () => {
            this.userTimeouts.delete(userId);
            if (!matchmakingQueue.hasUser(userId)) return;

            logger.info({ userId, eloRating }, '[MATCHMAKING] Queue window elapsed — finding opponent');
            await matchmakingQueue.removeFromQueue(userId);

            try {
                // If another user is still waiting in queue, pair with them immediately
                const queueUsers = Array.from((matchmakingQueue as any).memQueue?.keys?.() || []).filter((id: any) => id !== userId);
                let chosenId: string | null = null;

                if (queueUsers.length > 0) {
                    chosenId = queueUsers[0] as string;
                    await matchmakingQueue.removeFromQueue(chosenId);
                    this.clearUserTimeout(chosenId);
                } else {
                    const candidates = await User.find({ _id: { $ne: userId } }).lean();
                    if (!candidates || candidates.length === 0) {
                        logger.warn({ userId }, '[MATCHMAKING] No other users found in database for match');
                        this.io.to(`user:${userId}`).emit('match:error', { message: 'No opponents currently available. Please try again.' });
                        return;
                    }

                    // Sort by rating difference to user
                    const sorted = candidates
                        .map(c => ({
                            candidate: c,
                            diff: Math.abs(((c as any).rankRating || (c as any).eloRating || 1200) - eloRating)
                        }))
                        .sort((a, b) => a.diff - b.diff);

                    // Pick randomly from top pool of closest rating matches
                    const topPool = sorted.slice(0, Math.min(3, sorted.length));
                    const chosen = topPool[Math.floor(Math.random() * topPool.length)].candidate;
                    chosenId = chosen._id.toString();

                    // If chosen user happened to be in queue, remove them and cancel their timer
                    if (matchmakingQueue.hasUser(chosenId)) {
                        await matchmakingQueue.removeFromQueue(chosenId);
                        this.clearUserTimeout(chosenId);
                    }
                }

                if (chosenId) {
                    logger.info({ userId, userElo: eloRating, opponentId: chosenId }, '[MATCHMAKING] Quick Match paired single room');
                    await this.createMatch(userId, chosenId);
                }
            } catch (err: any) {
                logger.error({ err }, '[MATCHMAKING] Error in ranking-matched opponent selection');
            }
        }, 30000);

        this.userTimeouts.set(userId, timer);
    }

    private async createMatch(player1Id: string, player2Id: string) {
        this.clearUserTimeout(player1Id);
        this.clearUserTimeout(player2Id);
        try {
            // Fetch players and create room in parallel
            const [p1, p2, room] = await Promise.all([
                User.findById(player1Id).select('_id username tier rankRating').lean(),
                User.findById(player2Id).select('_id username tier rankRating').lean(),
                matchesService.createMatchRoom({
                    mode: 'ranked',
                    player1Id,
                })
            ]);

            if (!p1 || !p2 || !room) {
                throw new Error('Match entities or room missing');
            }

            // Update player 2 and fetch problem in parallel
            const [updatedRoom, problem] = await Promise.all([
                MatchRoom.findByIdAndUpdate(
                    room._id,
                    { $set: { player2Id } },
                    { new: true }
                ).lean(),
                Problem.findById(room.problemId).lean()
            ]);

            const matchRoomId = (room._id || room.id).toString();
            const matchData = {
                roomCode: room.roomCode,
                roomId: matchRoomId,
                matchId: matchRoomId,
                players: [
                    { id: p1._id.toString(), username: p1.username, tier: (p1 as any).tier, rating: (p1 as any).rankRating },
                    { id: p2._id.toString(), username: p2.username, tier: (p2 as any).tier, rating: (p2 as any).rankRating }
                ],
                problem: problem
            };

            // Notify both players
            this.io.to(`user:${player1Id}`).emit('MATCH_FOUND', matchData);
            this.io.to(`user:${player2Id}`).emit('MATCH_FOUND', matchData);

            logger.info({ roomId: matchRoomId }, '[MATCHMAKING] MATCH_FOUND emitted to both players');

        } catch (err) {
            logger.error({ err }, '[MATCHMAKING] Failed to create match');
            // Re-queue both players so they can try again
            await matchmakingQueue.addToQueue(player1Id, 1200);
            await matchmakingQueue.addToQueue(player2Id, 1200);
        }
    }

    async removeFromQueue(userId: string) {
        this.clearUserTimeout(userId);
        await matchmakingQueue.removeFromQueue(userId);
    }

    async getQueueSize(): Promise<number> {
        return matchmakingQueue.getQueueSize();
    }
}
