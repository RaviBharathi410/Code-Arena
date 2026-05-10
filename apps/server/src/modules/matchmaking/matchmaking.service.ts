import { redis } from '../../lib/redis';
import { logger } from '../../lib/logger';
import { db } from '../db';
import { matchRooms } from '@arena/database';
import crypto from 'crypto';
import { Server } from 'socket.io';
import { problemsService } from '../problems/problems.service';
import { matchmakingQueue, type MatchPair } from '../../lib/matchmaking-queue';
import { matchesService } from '../matches/matches.service';

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
            // Create a 1v1 ranked room in 'waiting' status
            const room = await matchesService.createMatchRoom({
                mode: 'ranked',
                player1Id,
            });

            // Join player 2
            await matchesService.joinMatchRoom(room.roomCode, player2Id);

            const fullRoom = await matchesService.getMatchById(room.id);

            logger.info({ roomId: room.id, player1Id, player2Id }, '[MATCHMAKING] Match room created for pair');

            // Notify both players to join the waiting room
            // Emit as per requirements: room:player_joined -> {player2: {username, tier, rating}}
            // But for matchmaking both are joined at once.
            
            if (!fullRoom || !fullRoom.player1 || !fullRoom.player2) {
                throw new Error('Match intel corrupted');
            }

            this.io.to(`user:${player1Id}`).emit('MATCH_FOUND', {
                roomCode: room.roomCode,
                roomId: room.id,
                players: [
                    { id: fullRoom.player1.id, username: fullRoom.player1.username, tier: fullRoom.player1.tier, rating: fullRoom.player1.rankRating },
                    { id: fullRoom.player2.id, username: fullRoom.player2.username, tier: fullRoom.player2.tier, rating: fullRoom.player2.rankRating }
                ],
                problem: fullRoom.problem
            });

            this.io.to(`user:${player2Id}`).emit('MATCH_FOUND', {
                roomCode: room.roomCode,
                roomId: room.id,
                players: [
                    { id: fullRoom.player1.id, username: fullRoom.player1.username, tier: fullRoom.player1.tier, rating: fullRoom.player1.rankRating },
                    { id: fullRoom.player2.id, username: fullRoom.player2.username, tier: fullRoom.player2.tier, rating: fullRoom.player2.rankRating }
                ],
                problem: fullRoom.problem
            });

        } catch (err) {
            logger.error({ err }, '[MATCHMAKING] Failed to create match');
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
