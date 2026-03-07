import { Server, Socket } from 'socket.io';
import crypto from 'crypto';
import { db } from '../db';
import { matches, submissions, problems } from '@arena/database';
import { eq } from 'drizzle-orm';
import { CustomSocket } from '../middleware/socketAuth.middleware';
import { MatchmakingService } from '../modules/matchmaking/matchmaking.service';
import { redis } from '../lib/redis';
import { logger } from '../lib/logger';
import { matchesService } from '../modules/matches/matches.service';

export class BattleHandler {
    private matchmaking: MatchmakingService;
    private onlineUsers: Map<string, { id: string, username: string, socketId: string }> = new Map();

    constructor(private io: Server) {
        this.matchmaking = new MatchmakingService(io);
    }

    handleConnection(socket: CustomSocket) {
        if (socket.user) {
            const userId = socket.user.id;
            const userData = {
                id: userId,
                username: socket.user.username,
                socketId: socket.id
            };
            this.onlineUsers.set(userId, userData);

            // Join personal room for targeted notifications (used by matchmaking)
            socket.join(`user:${userId}`);

            socket.broadcast.emit('user_joined', userData);
            socket.emit('online_users', Array.from(this.onlineUsers.values()));
        }

        socket.on('disconnect', () => this.handleDisconnect(socket));
        socket.on('find_match', () => this.handleFindMatch(socket));
        socket.on('cancel_search', () => this.handleCancelSearch(socket));
        socket.on('join_match', (matchId) => this.handleJoinMatch(socket, matchId));
        socket.on('code_update', (data) => this.handleCodeUpdate(socket, data));
        socket.on('rejoin_match', (matchId) => this.handleRejoinMatch(socket, matchId));
    }

    private async handleDisconnect(socket: CustomSocket) {
        if (!socket.user) return;
        const userId = socket.user.id;

        this.onlineUsers.delete(userId);
        this.io.emit('user_left', { id: userId });

        // Step 26: Remove from matchmaking queue
        await this.matchmaking.removeFromQueue(userId);

        // Handle active match disconnect
        const matchId = socket.data.matchId;
        if (matchId) {
            // Set disconnect key with 30s TTL
            await redis.setex(`disconnect:${matchId}:${userId}`, 30, '1');

            // Notify opponent
            this.io.to(matchId).emit('OPPONENT_DISCONNECTED', {
                userId,
                gracePeriodSeconds: 30
            });

            // Schedule forfeit check
            setTimeout(async () => {
                const stillDisconnected = await redis.get(`disconnect:${matchId}:${userId}`);
                if (stillDisconnected) {
                    try {
                        logger.info(`[MATCH] Forfeiting match ${matchId} for user ${userId} due to timeout`);
                        await matchesService.forfeitMatch(matchId, userId);
                        this.io.to(matchId).emit('MATCH_FORFEITED', { userId });
                    } catch (err) {
                        logger.error({ err }, '[MATCH] Failed to forfeit match on timeout');
                    }
                }
            }, 30000);
        }
    }

    private async handleFindMatch(socket: CustomSocket) {
        if (!socket.user) return;
        // In a real app, fetch actual ELO. For now, use a default or 1200.
        const elo = 1200;
        await this.matchmaking.findMatch(socket.user.id, elo);
    }

    private async handleCancelSearch(socket: CustomSocket) {
        if (!socket.user) return;
        await this.matchmaking.removeFromQueue(socket.user.id);
    }

    private async handleJoinMatch(socket: CustomSocket, matchId: string) {
        socket.join(matchId);
        socket.data.matchId = matchId; // Store matchId in socket session
        logger.debug(`User ${socket.user?.id} joined match room ${matchId}`);
    }

    private async handleRejoinMatch(socket: CustomSocket, matchId: string) {
        if (!socket.user) return;
        const userId = socket.user.id;

        // Clear disconnect key
        await redis.del(`disconnect:${matchId}:${userId}`);

        socket.join(matchId);
        socket.data.matchId = matchId;

        this.io.to(matchId).emit('OPPONENT_RECONNECTED', { userId });
    }

    private handleCodeUpdate(socket: CustomSocket, { matchId, code }: { matchId: string, code: string }) {
        socket.to(matchId).emit('opponent_code_update', {
            playerId: socket.user?.id,
            code
        });
    }
}
