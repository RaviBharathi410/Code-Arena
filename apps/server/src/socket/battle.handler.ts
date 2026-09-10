import { Server, Socket } from 'socket.io';
import crypto from 'crypto';
import { CustomSocket } from '../middleware/socketAuth.middleware';
import { MatchmakingService } from '../modules/matchmaking/matchmaking.service';
import { MatchRoom } from '../models/MatchRoom';
import { matchesService } from '../modules/matches/matches.service';
import { submissionsService } from '../modules/submissions/submissions.service';
import { logger } from '../lib/logger';
import { redis, isRedisReady } from '../lib/redis';
import { User } from '../models/User';
import { Problem } from '../models/Problem';

export interface ActiveOperator {
    id: string;
    username: string;
    tier: string;
    rating: number;
    socketIds: Set<string>;
    status: 'online' | 'in_match';
    isLive: boolean;
}

export interface PendingChallenge {
    challengeId: string;
    challengerId: string;
    challenger: { id: string; username: string; rating: number; tier: string };
    recipientId: string;
    problemId?: string;
    problemTitle?: string;
    createdAt: number;
    timer?: NodeJS.Timeout;
}

export class BattleHandler {
    private matchmaking: MatchmakingService;

    // Active operators across connected sockets
    private static activeOperators = new Map<string, ActiveOperator>();

    // Pending 1v1 challenges
    private static pendingChallenges = new Map<string, PendingChallenge>();

    public static setOperatorStatus(userId: string, status: 'online' | 'in_match') {
        const op = BattleHandler.activeOperators.get(userId);
        if (op) {
            op.status = status;
        }
    }

    public static isOperatorInMatch(userId: string): boolean {
        return BattleHandler.activeOperators.get(userId)?.status === 'in_match';
    }

    constructor(private io: Server) {
        this.matchmaking = new MatchmakingService(io);
    }

    async handleConnection(socket: CustomSocket) {
        if (!socket.user) return;

        socket.join(`user:${socket.user.id}`);

        // Register presence & emit online operators non-blockingly so all socket event listeners attach immediately
        this.registerUserPresence(socket).catch(err => logger.warn({ err }, '[PRESENCE] Error registering presence'));

        socket.on('users:get_online', () => this.sendOnlineUsers(socket));
        socket.on('challenge:send', (data) => this.handleChallengeSend(socket, data));
        socket.on('challenge:accept', (data) => this.handleChallengeAccept(socket, data));
        socket.on('challenge:decline', (data) => this.handleChallengeDecline(socket, data));
        socket.on('challenge:cancel', (data) => this.handleChallengeCancel(socket, data));

        socket.on('room:create', (data) => this.handleRoomCreate(socket, data));
        socket.on('room:join', (data) => this.handleRoomJoin(socket, data));
        socket.on('room:join_by_id', (data) => this.handleJoinById(socket, data));
        socket.on('room:spectate', (data) => this.handleSpectate(socket, data));
        socket.on('room:ready', () => {
            if (socket.data.role !== 'player') return;
            this.handleRoomReady(socket);
        });
        socket.on('room:leave', () => {
            const roomId = socket.data.roomId;
            if (roomId) {
                socket.leave(roomId);
                socket.data.roomId = undefined;
                socket.data.role = undefined;
            }
            if (socket.user && BattleHandler.activeOperators.has(socket.user.id)) {
                BattleHandler.activeOperators.get(socket.user.id)!.status = 'online';
                this.broadcastOnlineUsers();
            }
        });
        socket.on('room:set_language', (data) => {
            if (socket.data.role !== 'player') return;
            this.handleSetLanguage(socket, data);
        });

            socket.on('battle:run_code', (data) => {
                logger.info({
                    user: socket.user?.id,
                    room: socket.data.roomId,
                    data
                }, "[SOCKET] battle:run_code received");

                logger.info({
                    roomId: socket.data.roomId,
                    role: socket.data.role,
                    userId: socket.user?.id,
                }, "[SOCKET] Socket state before execution");

                if (socket.data.role === 'spectator') {
                    logger.warn({
                        roomId: socket.data.roomId,
                        role: socket.data.role,
                        userId: socket.user?.id,
                    }, "[SOCKET] Run blocked: spectator cannot execute code");
                    return;
                }

                if (!socket.data.role) {
                    socket.data.role = 'player';
                }

                this.handleExecute(socket, { ...data, mode: 'run' });
            });
            socket.on('battle:submit', (data) => {
                if (socket.data.role === 'spectator') return;
                if (!socket.data.role) socket.data.role = 'player';
                this.handleExecute(socket, { ...data, mode: 'submit' });
            });

            socket.on('battle:code_update', (data) => {
                if (socket.data.role === 'spectator') return;
                this.handleCodeUpdate(socket, data);
            });
            socket.on('battle:cursor_update', (data) => {
                if (socket.data.role === 'spectator') return;
                this.handleCursorUpdate(socket, data);
            });

            socket.on('voice:speaking', (data) => {
                if (socket.data.role !== 'player') return;
                this.handleVoiceSpeaking(socket, data);
            });
            socket.on('presence:typing', (data) => {
                if (socket.data.role !== 'player') return;
                this.handleTyping(socket, data);
            });

        socket.on('find_match', () => this.handleFindMatch(socket));
        socket.on('cancel_search', () => this.handleCancelSearch(socket));
        socket.on('disconnect', () => this.handleDisconnect(socket));
    }

    private async handleRoomCreate(socket: CustomSocket, { mode, problemId }: { mode: '1v1' | 'practice' | 'ranked', problemId?: string }) {
        try {
            if (!socket.user?.id) {
                socket.emit('room:error', { message: 'Authentication required to create room' });
                return;
            }
            const safeMode = mode === 'practice' ? 'practice' : '1v1';
            logger.info({
                userId: socket.user.id,
                mode: safeMode,
                problemId
            }, "[SOCKET] room:create received");
            const room = await matchesService.createMatchRoom({ mode: safeMode, player1Id: socket.user.id, problemId });
            logger.info(room, "[SOCKET] Room created");
            socket.join(room.id);
            logger.info("[SOCKET] Joined socket room");
            socket.data.roomId = room.id;
            logger.info(socket.data, "[SOCKET] roomId assigned");
            socket.data.role = 'player';
            logger.info(socket.data, "[SOCKET] role assigned");

            const user = await User.findById(socket.user!.id).lean();
            const fullRoom = await MatchRoom.findById(room._id).populate(['player1Id', 'player2Id', 'problemId']).lean() as any;
            logger.info(fullRoom, "[SOCKET] Loaded full room");
            if (!fullRoom) throw new Error('Room intel corrupted');

            socket.emit('room:initial_data', {
                roomId: room.id,
                roomCode: room.roomCode,
                players: [{ id: socket.user!.id, username: socket.user!.username, tier: (user as any)?.tier || 'BRONZE', rating: (user as any)?.rankRating || 1200 }],
                problem: fullRoom.problemId
            });

            // Practice rooms start immediately — auto-set ready
            if (mode === 'practice') {
                await matchesService.setReady(room.id, socket.user!.id, true);
            }

            logger.info({ roomId: room.id, userId: socket.user!.id }, '[SOCKET] User created room');
        } catch (err: any) {
            logger.error(
                {
                    error: err,
                    message: err.message,
                    stack: err.stack,
                },
                "[SOCKET] handleRoomCreate FAILED"
            );

            socket.emit("room:error", {
                message: err.message,
            });
        }
    }

    private async handleRoomJoin(socket: CustomSocket, { roomCode }: { roomCode: string }) {
        try {
            if (!roomCode || typeof roomCode !== 'string') {
                socket.emit('room:error', { message: 'Please provide a valid 6-character room code' });
                return;
            }
            const sanitizedCode = roomCode.trim().toUpperCase();
            const room = await matchesService.joinMatchRoom(sanitizedCode, socket.user!.id);
            if (!room) return;
            socket.join(room._id.toString());
            socket.data.roomId = room._id.toString();
            socket.data.role = 'player';

            const fullRoom = await MatchRoom.findById(room._id).populate(['player1Id', 'player2Id', 'problemId']).lean() as any;
            if (!fullRoom) throw new Error('Room intel corrupted');

            const isP1 = room.player1Id?.toString() === socket.user!.id;
            const user = await User.findById(socket.user!.id).lean();

            // Notify existing player
            const roomIdStr = room._id.toString();
            socket.to(roomIdStr).emit('room:player_joined', {
                player: { id: socket.user!.id, username: socket.user!.username, tier: (user as any)?.tier || 'BRONZE', rating: (user as any)?.rankRating || 1200 }
            });

            socket.emit('room:initial_data', {
                roomId: roomIdStr,
                roomCode: room.roomCode,
                players: [
                    fullRoom.player1Id ? { id: fullRoom.player1Id._id.toString(), username: fullRoom.player1Id.username, tier: fullRoom.player1Id.tier, rating: fullRoom.player1Id.rankRating } : null,
                    fullRoom.player2Id ? { id: fullRoom.player2Id._id.toString(), username: fullRoom.player2Id.username, tier: fullRoom.player2Id.tier, rating: fullRoom.player2Id.rankRating } : null,
                ].filter(Boolean),
                problem: fullRoom.problemId
            });

            logger.info({ roomId: roomIdStr, userId: socket.user!.id }, '[SOCKET] User joined room');
        } catch (err: any) {
            socket.emit('room:error', { message: err.message });
        }
    }

    /**
     * Join a match by its UUID (used after matchmaking MATCH_FOUND).
     * Automatically marks the player as ready. When both join → match starts.
     */
    private async handleJoinById(socket: CustomSocket, { matchId }: { matchId: string }) {
        if (!socket.user || !matchId || matchId === 'new') return;
        try {
            const fullRoom = await MatchRoom.findById(matchId).populate(['player1Id', 'player2Id', 'problemId']).lean() as any;
            if (!fullRoom) { socket.emit('room:error', { message: 'Match not found' }); return; }

            // Verify player belongs to this match
            const isPlayer = fullRoom.player1Id?._id?.toString() === socket.user.id || fullRoom.player2Id?._id?.toString() === socket.user.id;
            if (!isPlayer) { socket.emit('room:error', { message: 'Not a participant in this match' }); return; }

            // Clear any pending disconnect forfeit timer
            const disconnectKey = `disconnect:${matchId}:${socket.user.id}`;
            await redis.del(disconnectKey);

            // If already active (both joined), just send state back
            if (fullRoom.status === 'active') {
                socket.join(matchId);

                socket.data.roomId = matchId;
                socket.data.role = 'player'; // <-- ADD THIS LINE

                socket.emit('room:initial_data', {
                    roomId: matchId,
                    roomCode: fullRoom.roomCode,
                    players: [
                        fullRoom.player1Id ? {
                            id: fullRoom.player1Id._id.toString(),
                            username: fullRoom.player1Id.username,
                            tier: fullRoom.player1Id.tier,
                            rating: fullRoom.player1Id.rankRating
                        } : null,
                        fullRoom.player2Id ? {
                            id: fullRoom.player2Id._id.toString(),
                            username: fullRoom.player2Id.username,
                            tier: fullRoom.player2Id.tier,
                            rating: fullRoom.player2Id.rankRating
                        } : null,
                    ].filter(Boolean),
                    problem: fullRoom.problemId
                });

                socket.emit('room:both_ready', {
                    problem: fullRoom.problemId,
                    startedAt: fullRoom.startedAt
                });

                return;
            }
            socket.join(matchId);
            socket.data.roomId = matchId;
            socket.data.role = 'player';

            // Announce to the other player
            socket.to(matchId).emit('room:player_joined', {
                player: { id: socket.user.id, username: socket.user.username }
            });

            socket.emit('room:initial_data', {
                roomId: matchId, roomCode: fullRoom.roomCode,
                players: [
                    fullRoom.player1Id ? { id: fullRoom.player1Id._id.toString(), username: fullRoom.player1Id.username, tier: fullRoom.player1Id.tier, rating: fullRoom.player1Id.rankRating } : null,
                    fullRoom.player2Id ? { id: fullRoom.player2Id._id.toString(), username: fullRoom.player2Id.username, tier: fullRoom.player2Id.tier, rating: fullRoom.player2Id.rankRating } : null,
                ].filter(Boolean),
                problem: fullRoom.problemId
            });

            // Auto-ready: ranked matches start when both sockets join
            const { bothReady } = await matchesService.setReady(matchId, socket.user.id, true);

            if (bothReady) {
                const updatedRoom = await MatchRoom.findById(matchId).populate(['problemId']).lean() as any;
                const durationMs = 30 * 60 * 1000;

                const p1Id = (fullRoom.player1Id?._id || fullRoom.player1Id)?.toString();
                const p2Id = (fullRoom.player2Id?._id || fullRoom.player2Id)?.toString();
                if (p1Id && BattleHandler.activeOperators.has(p1Id)) {
                    BattleHandler.activeOperators.get(p1Id)!.status = 'in_match';
                }
                if (p2Id && BattleHandler.activeOperators.has(p2Id)) {
                    BattleHandler.activeOperators.get(p2Id)!.status = 'in_match';
                }
                this.broadcastOnlineUsers();

                this.io.to(matchId).emit('room:both_ready', {
                    problem: updatedRoom?.problemId ?? fullRoom.problemId,
                    startedAt: new Date().toISOString(),
                    durationMs
                });
                logger.info({ matchId }, '[SOCKET] Both players joined — match starting');
            }

            logger.info({ matchId, userId: socket.user.id }, '[SOCKET] Player joined match by ID');
        } catch (err: any) {
            logger.error({ err, matchId }, '[SOCKET] Error in handleJoinById');
            socket.emit('room:error', { message: err.message });
        }
    }

    private async handleRoomReady(socket: CustomSocket) {
        const roomId = socket.data.roomId;
        if (!roomId || !socket.user) return;
        try {
            const { bothReady } = await matchesService.setReady(roomId, socket.user.id);
            this.io.to(roomId).emit('room:player_ready', { userId: socket.user.id });
            if (bothReady) {
                const fullRoom = await MatchRoom.findById(roomId).populate(['problemId']).lean() as any;
                if (!fullRoom) return;
                const durationMs = 30 * 60 * 1000; // 30 minutes

                const p1Id = (fullRoom.player1Id?._id || fullRoom.player1Id)?.toString();
                const p2Id = (fullRoom.player2Id?._id || fullRoom.player2Id)?.toString();
                if (p1Id && BattleHandler.activeOperators.has(p1Id)) {
                    BattleHandler.activeOperators.get(p1Id)!.status = 'in_match';
                }
                if (p2Id && BattleHandler.activeOperators.has(p2Id)) {
                    BattleHandler.activeOperators.get(p2Id)!.status = 'in_match';
                }
                this.broadcastOnlineUsers();

                this.io.to(roomId).emit('room:both_ready', {
                    problem: fullRoom.problemId,
                    startedAt: new Date().toISOString(),
                    durationMs
                });
                logger.info({ roomId }, '[SOCKET] Both players ready, match starting');
            }
        } catch (err: any) {
            socket.emit('room:error', { message: err.message });
        }
    }

    private async handleSetLanguage(socket: CustomSocket, { language }: { language: string }) {
        const roomId = socket.data.roomId;
        if (!roomId || !socket.user) return;
        socket.to(roomId).emit('room:opponent_language', { language });
    }

    private async handleExecute(socket: CustomSocket, data: { code: string, language: string, mode: 'run' | 'submit', customInputs?: string }) {
        let roomId = socket.data.roomId;
        logger.info({ roomId, userId: socket.user?.id, mode: data.mode }, '[SOCKET] Code execution request');

        if (!socket.user) {
            socket.emit(data.mode === 'run' ? 'battle:run_result' : 'battle:submission_result', {
                status: 'INTERNAL_ERROR', error: 'User unauthenticated. Please re-login.'
            });
            return;
        }

        // Rate limiting: 800ms cooldown for run, 2s for submit per user
        if (isRedisReady()) {
            const rlKey = `rl:exec:${socket.user.id}:${data.mode}`;
            try {
                const acquired = await redis.set(rlKey, '1', 'PX', data.mode === 'submit' ? 2000 : 800, 'NX');
                if (!acquired) {
                    socket.emit(data.mode === 'run' ? 'battle:run_result' : 'battle:submission_result', {
                        status: 'RATE_LIMITED',
                        error: `Action throttled. Please wait a moment before ${data.mode === 'submit' ? 'submitting' : 'running'} again.`
                    });
                    return;
                }
            } catch (rlErr: any) {
                // Non-blocking fallback if redis is in degraded mode
                logger.warn({ error: rlErr?.message }, '[RATE-LIMITER] Redis check bypassed');
            }
        }

        if (!roomId) {
            // Auto-create a practice room for single-player / direct sandbox runs
            try {
                logger.info({ userId: socket.user.id }, '[SOCKET] No roomId bound — auto-creating practice room for run');
                const practiceRoom = await matchesService.createMatchRoom({ mode: 'practice', player1Id: socket.user.id });
                roomId = practiceRoom._id.toString();
                socket.data.roomId = roomId;
                socket.data.role = 'player';
                socket.join(roomId);
            } catch (err: any) {
                logger.warn({ error: err.message }, '[SOCKET] Failed auto-creating practice room');
                socket.emit(data.mode === 'run' ? 'battle:run_result' : 'battle:submission_result', {
                    status: 'INTERNAL_ERROR', error: 'Not in a match room. Please refresh.'
                });
                return;
            }
        }

        try {
            if (data.mode === 'submit') {
                socket.to(roomId).emit('battle:opponent_submitted', { status: 'CHECKING' });
            }
            await submissionsService.executeCode({
                matchId: roomId, userId: socket.user.id,
                code: data.code, language: data.language, mode: data.mode, customInputs: data.customInputs
            });
        } catch (err: any) {
            socket.emit('battle:error', { message: err.message });
        }
    }

    private handleVoiceSpeaking(socket: CustomSocket, { active }: { active: boolean }) {
        const roomId = socket.data.roomId;
        if (roomId) socket.to(roomId).emit('voice:opponent_speaking', { active });
    }

    private handleTyping(socket: CustomSocket, { lines }: { lines: number }) {
        const roomId = socket.data.roomId;
        if (roomId) socket.to(roomId).emit('presence:opponent_typing', { lines });
    }

    private handleCodeUpdate(socket: CustomSocket, { code }: { code: string }) {
        const roomId = socket.data.roomId;
        if (roomId) socket.to(roomId).emit('battle:opponent_code', { code });
    }

    private handleCursorUpdate(socket: CustomSocket, { cursor }: { cursor: any }) {
        const roomId = socket.data.roomId;
        if (roomId) socket.to(roomId).emit('battle:opponent_cursor', { cursor });
    }

    private async handleSpectate(socket: CustomSocket, { matchId }: { matchId: string }) {
        if (!socket.user || !matchId) return;
        try {
            const fullRoom = await MatchRoom.findById(matchId).populate(['player1Id', 'player2Id', 'problemId']).lean() as any;
            if (!fullRoom) { socket.emit('room:error', { message: 'Match not found' }); return; }

            socket.join(matchId);
            socket.data.roomId = matchId;
            socket.data.role = 'spectator';

            socket.emit('room:initial_data', {
                roomId: matchId, roomCode: fullRoom.roomCode,
                players: [
                    fullRoom.player1Id ? { id: fullRoom.player1Id._id.toString(), username: fullRoom.player1Id.username, tier: fullRoom.player1Id.tier, rating: fullRoom.player1Id.rankRating } : null,
                    fullRoom.player2Id ? { id: fullRoom.player2Id._id.toString(), username: fullRoom.player2Id.username, tier: fullRoom.player2Id.tier, rating: fullRoom.player2Id.rankRating } : null,
                ].filter(Boolean),
                problem: fullRoom.problemId,
                spectator: true
            });
            logger.info({ matchId, userId: socket.user.id }, '[SOCKET] Spectator joined match');
        } catch (err: any) {
            socket.emit('room:error', { message: err.message });
        }
    }

    private async handleFindMatch(socket: CustomSocket) {
        if (!socket.user) return;

        try {
            logger.info({ userId: socket.user.id }, '[SOCKET] Player searching for match');

            // If the socket was previously attached to a room, leave it so they can queue fresh
            if (socket.data.roomId) {
                const oldRoom = socket.data.roomId;
                socket.leave(oldRoom);
                socket.data.roomId = undefined;
                socket.data.role = undefined;
                logger.info({ oldRoom, userId: socket.user.id }, '[SOCKET] Cleared previous room state before queueing');
            }

            // Reset operator status to online since user is queueing from dashboard
            const op = BattleHandler.activeOperators.get(socket.user.id);
            if (op) {
                op.status = 'online';
                this.broadcastOnlineUsers();
            }

            const user = await User.findById(socket.user.id).select('rankRating').lean();
            await this.matchmaking.findMatch(socket.user.id, (user as any)?.rankRating || 1200);
        } catch (err: any) {
            logger.error({ err, userId: socket.user?.id }, '[SOCKET] handleFindMatch error');
            socket.emit('match:error', { message: 'Failed to search for match. Please try again.' });
        }
    }

    private async handleCancelSearch(socket: CustomSocket) {
        if (!socket.user) return;
        await this.matchmaking.removeFromQueue(socket.user.id);
    }

    private async handleDisconnect(socket: CustomSocket) {
        if (!socket.user) return;
        await this.matchmaking.removeFromQueue(socket.user.id);

        const matchId = socket.data.roomId;
        if (matchId && socket.data.role === 'player') {
            const userId = socket.user.id;
            const disconnectKey = `disconnect:${matchId}:${userId}`;
            await redis.set(disconnectKey, '1', 'EX', 35); // 35s expiry in redis

            socket.to(matchId).emit('room:opponent_disconnected', { userId });
            logger.info({ matchId, userId }, '[SOCKET] Player disconnected, starting 30s grace period');

            setTimeout(async () => {
                const stillDisconnected = await redis.get(disconnectKey);
                if (stillDisconnected) {
                    logger.info({ matchId, userId }, '[SOCKET] Grace period expired, forfeiting match');
                    await redis.del(disconnectKey);

                    // Fetch room to find opponent ID for forfeit win
                    const room = await matchesService.getMatchById(matchId);
                    if (room && room.status === 'active') {
                        const winnerId = room.player1Id?.toString() === userId ? room.player2Id : room.player1Id;
                        BattleHandler.setOperatorStatus(userId, 'online');
                        if (winnerId) BattleHandler.setOperatorStatus(winnerId.toString(), 'online');
                        this.broadcastOnlineUsers();
                        this.io.to(matchId).emit('match:result', {
                            winnerId,
                            reason: 'disconnect'
                        });
                    }
                }
            }, 30000);
        }

        // Clean up operator presence
        const op = BattleHandler.activeOperators.get(socket.user.id);
        if (op) {
            op.socketIds.delete(socket.id);
            if (op.socketIds.size === 0) {
                BattleHandler.activeOperators.delete(socket.user.id);
                this.broadcastOnlineUsers();
            }
        }
    }

    // ── Presence Management ───────────────────────────────────────────────

    private async registerUserPresence(socket: CustomSocket) {
        if (!socket.user) return;
        const userId = socket.user.id;

        try {
            const userDoc = await User.findById(userId).lean();
            const existing = BattleHandler.activeOperators.get(userId);
            if (existing) {
                existing.socketIds.add(socket.id);
                existing.isLive = true;
            } else {
                BattleHandler.activeOperators.set(userId, {
                    id: userId,
                    username: socket.user.username,
                    tier: (userDoc as any)?.tier || 'ARCHITECT III',
                    rating: (userDoc as any)?.rankRating || 1200,
                    socketIds: new Set([socket.id]),
                    status: 'online',
                    isLive: true,
                });
            }

            // Immediately broadcast new presence
            this.broadcastOnlineUsers();
        } catch (err: any) {
            logger.warn({ err: err?.message }, '[PRESENCE] Error registering user presence');
        }
    }

    private async getAggregatedOperators(): Promise<any[]> {
        const liveList = Array.from(BattleHandler.activeOperators.values()).map(op => ({
            id: op.id,
            username: op.username,
            tier: op.tier,
            rating: op.rating,
            status: op.status,
            isLive: true,
        }));

        const liveIds = new Set(liveList.map(u => u.id));

        // Always supplement with registered database operators so the registry is never empty
        try {
            const dbUsers = await User.find({ _id: { $nin: Array.from(liveIds) } })
                .limit(20)
                .lean();

            const offlineList = dbUsers.map(u => ({
                id: u._id.toString(),
                username: u.username,
                tier: (u as any).tier || 'ARCHITECT III',
                rating: (u as any).rankRating || 1200,
                status: 'offline',
                isLive: false,
            }));

            // Live operators first, then offline registered operators
            return [...liveList, ...offlineList];
        } catch {
            return liveList;
        }
    }

    private async sendOnlineUsers(socket: CustomSocket) {
        const operators = await this.getAggregatedOperators();
        socket.emit('online_users', operators);
    }

    private async broadcastOnlineUsers() {
        const operators = await this.getAggregatedOperators();
        this.io.emit('online_users', operators);
    }

    // ── Challenge Protocol ────────────────────────────────────────────────

    private async handleChallengeSend(socket: CustomSocket, data: { toUserId: string; problemId?: string }) {
        if (!socket.user) return;
        const challengerId = socket.user.id;
        const recipientId = data.toUserId;

        if (challengerId === recipientId) {
            socket.emit('challenge:error', { message: 'Cannot initiate challenge protocol with yourself.' });
            return;
        }

        const challengerOp = BattleHandler.activeOperators.get(challengerId);
        if (challengerOp?.status === 'in_match') {
            socket.emit('challenge:error', { message: 'Cannot initiate challenge while engaged in live combat.' });
            return;
        }

        const recipientOp = BattleHandler.activeOperators.get(recipientId);
        if (recipientOp?.status === 'in_match') {
            socket.emit('challenge:error', { message: 'Target operator is currently in live combat. Challenge cannot be sent.' });
            return;
        }

        try {
            const challengerDoc = await User.findById(challengerId).lean();
            const recipientDoc = await User.findById(recipientId).lean();
            if (!recipientDoc) {
                socket.emit('challenge:error', { message: 'Target operator not found in registry.' });
                return;
            }

            let problemTitle = 'Algorithmic Duel';
            if (data.problemId) {
                const prob = await Problem.findById(data.problemId).lean();
                if (prob) problemTitle = prob.title;
            }

            const challenger = {
                id: challengerId,
                username: socket.user.username,
                rating: (challengerDoc as any)?.rankRating || 1200,
                tier: (challengerDoc as any)?.tier || 'ARCHITECT III',
            };

            const isRecipientLive = BattleHandler.activeOperators.has(recipientId);

            if (isRecipientLive) {
                const challengeId = crypto.randomUUID();
                const timer = setTimeout(() => {
                    const pending = BattleHandler.pendingChallenges.get(challengeId);
                    if (pending) {
                        BattleHandler.pendingChallenges.delete(challengeId);
                        this.io.to(`user:${challengerId}`).emit('challenge:declined', {
                            challengeId,
                            message: 'Challenge signal timed out with no response from operator.'
                        });
                    }
                }, 45000);

                BattleHandler.pendingChallenges.set(challengeId, {
                    challengeId,
                    challengerId,
                    challenger,
                    recipientId,
                    problemId: data.problemId,
                    problemTitle,
                    createdAt: Date.now(),
                    timer,
                });

                // Transmit incoming challenge to target operator
                this.io.to(`user:${recipientId}`).emit('challenge:received', {
                    challengeId,
                    challenger,
                    problemId: data.problemId,
                    problemTitle,
                });

                socket.emit('challenge:sent', {
                    challengeId,
                    recipientId,
                    recipientName: recipientDoc.username,
                    message: `Challenge dispatched to ${recipientDoc.username}. Awaiting response.`
                });
                logger.info({ challengerId, recipientId, challengeId }, '[CHALLENGE] Challenge sent to live operator');
            } else {
                // Offline registered operator: instant sparring deployment
                logger.info({ challengerId, recipientId }, '[CHALLENGE] Offline operator challenged — deploying sparring match');
                const room = await matchesService.createMatchRoom({
                    mode: '1v1',
                    player1Id: challengerId,
                    problemId: data.problemId,
                });
                await matchesService.joinMatchRoom(room.roomCode, recipientId);
                const fullRoom = await matchesService.getMatchById(room.id);

                const matchData = {
                    roomCode: room.roomCode,
                    roomId: room.id,
                    matchId: room.id,
                    players: [
                        { id: challenger.id, username: challenger.username, tier: challenger.tier, rating: challenger.rating },
                        { id: recipientDoc._id.toString(), username: recipientDoc.username, tier: recipientDoc.tier || 'ARCHITECT III', rating: recipientDoc.rankRating || 1200 }
                    ],
                    problem: fullRoom?.problemId,
                };

                socket.emit('MATCH_FOUND', matchData);
            }
        } catch (err: any) {
            logger.error({ err: err?.message }, '[CHALLENGE] Error in handleChallengeSend');
            socket.emit('challenge:error', { message: 'Failed to dispatch challenge signal.' });
        }
    }

    private async handleChallengeAccept(socket: CustomSocket, data: { challengeId: string }) {
        if (!socket.user) return;
        const challenge = BattleHandler.pendingChallenges.get(data.challengeId);
        if (!challenge) {
            socket.emit('challenge:error', { message: 'Challenge has expired or was revoked.' });
            return;
        }

        if (challenge.recipientId !== socket.user.id) {
            socket.emit('challenge:error', { message: 'Unauthorized response to challenge.' });
            return;
        }

        if (challenge.timer) clearTimeout(challenge.timer);
        BattleHandler.pendingChallenges.delete(data.challengeId);

        try {
            logger.info({ challengeId: data.challengeId, challengerId: challenge.challengerId, recipientId: socket.user.id }, '[CHALLENGE] Challenge accepted — creating match room');
            const room = await matchesService.createMatchRoom({
                mode: '1v1',
                player1Id: challenge.challengerId,
                problemId: challenge.problemId,
            });
            await matchesService.joinMatchRoom(room.roomCode, challenge.recipientId);
            const fullRoom = await matchesService.getMatchById(room.id);

            const p1 = await User.findById(challenge.challengerId).lean();
            const p2 = await User.findById(challenge.recipientId).lean();

            const matchData = {
                roomCode: room.roomCode,
                roomId: room.id,
                matchId: room.id,
                players: [
                    { id: p1?._id.toString(), username: p1?.username, tier: p1?.tier, rating: p1?.rankRating },
                    { id: p2?._id.toString(), username: p2?.username, tier: p2?.tier, rating: p2?.rankRating }
                ],
                problem: fullRoom?.problemId,
            };

            // Notify both operators
            this.io.to(`user:${challenge.challengerId}`).emit('MATCH_FOUND', matchData);
            this.io.to(`user:${challenge.recipientId}`).emit('MATCH_FOUND', matchData);
            this.io.to(`user:${challenge.challengerId}`).emit('challenge:accepted', { matchId: room.id });
        } catch (err: any) {
            logger.error({ err: err?.message }, '[CHALLENGE] Failed to initialize match on challenge accept');
            socket.emit('challenge:error', { message: 'Failed to initialize match uplink.' });
        }
    }

    private handleChallengeDecline(socket: CustomSocket, data: { challengeId: string }) {
        if (!socket.user) return;
        const challenge = BattleHandler.pendingChallenges.get(data.challengeId);
        if (!challenge) return;

        if (challenge.timer) clearTimeout(challenge.timer);
        BattleHandler.pendingChallenges.delete(data.challengeId);

        this.io.to(`user:${challenge.challengerId}`).emit('challenge:declined', {
            challengeId: data.challengeId,
            message: `${socket.user.username} declined the challenge.`
        });
        logger.info({ challengeId: data.challengeId, declinedBy: socket.user.id }, '[CHALLENGE] Challenge declined');
    }

    private handleChallengeCancel(socket: CustomSocket, data: { challengeId: string }) {
        if (!socket.user) return;
        const challenge = BattleHandler.pendingChallenges.get(data.challengeId);
        if (!challenge) return;

        if (challenge.challengerId !== socket.user.id) return;

        if (challenge.timer) clearTimeout(challenge.timer);
        BattleHandler.pendingChallenges.delete(data.challengeId);

        this.io.to(`user:${challenge.recipientId}`).emit('challenge:cancelled', {
            challengeId: data.challengeId,
            message: `${socket.user.username} cancelled the challenge.`
        });
        logger.info({ challengeId: data.challengeId, cancelledBy: socket.user.id }, '[CHALLENGE] Challenge cancelled');
    }
}
