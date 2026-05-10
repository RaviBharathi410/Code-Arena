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
import { codeExecutionQueue } from '../queues/code-execution.queue';

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
        socket.on('submit_code', (data) => this.handleSubmitCode(socket, data));
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

        // Fetch current match state from Redis (if any exists yet)
        if (socket.user) {
            const myCode = await redis.get(`match:${matchId}:code:${socket.user.id}`);
            if (myCode) {
                socket.emit('match:sync_state', {
                    userId: socket.user.id,
                    code: myCode
                });
            }
        }
    }

    private async handleRejoinMatch(socket: CustomSocket, matchId: string) {
        if (!socket.user) return;
        const userId = socket.user.id;

        // Clear disconnect key
        await redis.del(`disconnect:${matchId}:${userId}`);

        socket.join(matchId);
        socket.data.matchId = matchId;

        // Fetch latest match state to resync the reconnected user
        const myCode = await redis.get(`match:${matchId}:code:${userId}`);
        
        // Also fetch opponent's code state if we want to immediately sync them
        // This requires knowing the opponent's ID, which we'd typically get from the match metadata in Redis
        const matchMetaStr = await redis.get(`match:${matchId}`);
        let opponentCode = null;
        let opponentId = null;

        if (matchMetaStr) {
            const matchMeta = JSON.parse(matchMetaStr);
            opponentId = matchMeta.player1Id === userId ? matchMeta.player2Id : matchMeta.player1Id;
            if (opponentId) {
                opponentCode = await redis.get(`match:${matchId}:code:${opponentId}`);
            }
        }

        socket.emit('match:sync_state', {
            userId: userId,
            code: myCode || '',
            opponentId,
            opponentCode: opponentCode || ''
        });

        this.io.to(matchId).emit('OPPONENT_RECONNECTED', { userId });
    }

    private async handleCodeUpdate(socket: CustomSocket, { matchId, code }: { matchId: string, code: string }) {
        if (!socket.user) return;
        
        // Persist code state to Redis with a TTL (e.g., 2 hours)
        await redis.setex(`match:${matchId}:code:${socket.user.id}`, 7200, code);

        socket.to(matchId).emit('opponent_code_update', {
            playerId: socket.user.id,
            code
        });
    }

    private async handleSubmitCode(socket: CustomSocket, {
        matchId, code, language
    }: { matchId: string, code: string, language: string }) {
        if (!socket.user) return;
        const userId = socket.user.id;

        // Language ID mapping for Judge0
        const LANGUAGE_MAP: Record<string, number> = {
            javascript: 63,
            python: 71,
            java: 62,
            cpp: 54,
            typescript: 74,
        };
        const languageId = LANGUAGE_MAP[language] || 63;

        try {
            // 1. Fetch match + problem from DB
            const match = await db.query.matches.findFirst({ where: eq(matches.id, matchId) });
            if (!match) return;

            const problem = await db.query.problems.findFirst({ where: eq(problems.id, match.problemId) });
            if (!problem) return;

            // 2. Record submission start time in Redis
            const startTimeStr = await redis.get(`match:${matchId}:startedAt`);
            const startTime = startTimeStr ? parseInt(startTimeStr) : Date.now();
            const timeTaken = Math.floor((Date.now() - startTime) / 1000);
            await redis.setex(`match:${matchId}:timeTaken:${userId}`, 7200, timeTaken.toString());

            // 3. Create a Submission record in the DB
            const submissionId = crypto.randomUUID();
            await db.insert(submissions).values({
                id: submissionId,
                matchId,
                userId,
                code,
                languageId,
                status: 'pending',
                submittedAt: new Date(),
            });

            // 4. Enqueue code execution job
            await codeExecutionQueue.add('execute', {
                submissionId,
                code,
                languageId,
                problemId: match.problemId,
                matchId,
                userId,
                testCases: problem.testCases,
            });

            logger.info({ submissionId, matchId, userId }, '[SOCKET] Code submitted, execution queued');

            // 5. Notify user that their code is being evaluated
            socket.emit('submission:queued', { submissionId });

        } catch (err: any) {
            logger.error({ err, matchId, userId }, '[SOCKET] Failed to submit code');
            socket.emit('match:error', { message: 'Failed to queue code for execution.' });
        }
    }
}
