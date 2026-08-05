import { redis } from '../../lib/redis';
import { logger } from '../../lib/logger';
import crypto from 'crypto';
import { Server } from 'socket.io';
import { problemsService } from '../problems/problems.service';
import { matchmakingQueue, type MatchPair } from '../../lib/matchmaking-queue';
import { matchesService } from '../matches/matches.service';
import { User } from '../../models/User';
import { Problem } from '../../models/Problem';
export class MatchmakingService {
    constructor(private io: Server) {
        matchmakingQueue.onMatch((pair: MatchPair) => {
            this.createMatch(pair.player1Id, pair.player2Id);
        });

        matchmakingQueue.startPolling();
        logger.info('[MATCHMAKING] Service initialized with background polling');
    }

    async findMatch(userId: string, eloRating: number) {
        logger.info({ userId, eloRating }, '[MATCHMAKING] User joining queue');
        await matchmakingQueue.addToQueue(userId, eloRating);
    }

    private async createMatch(player1Id: string, player2Id: string) {
        try {
            // Create a ranked room
            const room = await matchesService.createMatchRoom({
                mode: 'ranked',
                player1Id,
            });

            // Join player 2
            await matchesService.joinMatchRoom(room.roomCode, player2Id);

            const fullRoom = await matchesService.getMatchById(room.id);

            logger.info({ roomId: room.id, player1Id, player2Id }, '[MATCHMAKING] Match room created');

            if (!fullRoom || !fullRoom.player1Id || !fullRoom.player2Id) {
                throw new Error('Match intel corrupted after creation');
            }

            const p1 = await User.findById(fullRoom.player1Id).lean();
            const p2 = await User.findById(fullRoom.player2Id).lean();
            const problem = await Problem.findById(fullRoom.problemId).lean();

            if (!p1 || !p2 || !problem) {
                throw new Error('Match entities missing');
            }

            const matchData = {
                roomCode: room.roomCode,
                roomId: room.id,
                matchId: room.id,
                players: [
                    { id: p1._id, username: p1.username, tier: p1.tier, rating: p1.rankRating },
                    { id: p2._id, username: p2.username, tier: p2.tier, rating: p2.rankRating }
                ],
                problem: problem
            };

            // Notify both players
            this.io.to(`user:${player1Id}`).emit('MATCH_FOUND', matchData);
            this.io.to(`user:${player2Id}`).emit('MATCH_FOUND', matchData);

            logger.info({ roomId: room.id }, '[MATCHMAKING] MATCH_FOUND emitted to both players');

        } catch (err) {
            logger.error({ err }, '[MATCHMAKING] Failed to create match');
            // Re-queue both players so they can try again
            await matchmakingQueue.addToQueue(player1Id, 1200);
            await matchmakingQueue.addToQueue(player2Id, 1200);
        }
    }

    async removeFromQueue(userId: string) {
        await matchmakingQueue.removeFromQueue(userId);
    }

    async getQueueSize(): Promise<number> {
        return matchmakingQueue.getQueueSize();
    }
}
