import { Server, Socket } from 'socket.io';
import { CustomSocket } from '../middleware/socketAuth.middleware';
import { MatchmakingService } from '../modules/matchmaking/matchmaking.service';
import { matchesService } from '../modules/matches/matches.service';
import { submissionsService } from '../modules/submissions/submissions.service';
import { logger } from '../lib/logger';
import { redis } from '../lib/redis';
import { db } from '../db';
import { users, matchRooms } from '@arena/database';
import { eq } from 'drizzle-orm';

export class BattleHandler {
    private matchmaking: MatchmakingService;

    constructor(private io: Server) {
        this.matchmaking = new MatchmakingService(io);
    }

    handleConnection(socket: CustomSocket) {
        if (!socket.user) return;

        socket.join(`user:${socket.user.id}`);

        socket.on('room:create', (data) => this.handleRoomCreate(socket, data));
        socket.on('room:join', (data) => this.handleRoomJoin(socket, data));
        // Used after matchmaking: join by room UUID directly (auto-ready)
        socket.on('room:join_by_id', (data) => this.handleJoinById(socket, data));
        socket.on('room:ready', () => this.handleRoomReady(socket));
        socket.on('room:set_language', (data) => this.handleSetLanguage(socket, data));

        socket.on('battle:run_code', (data) => this.handleExecute(socket, { ...data, mode: 'run' }));
        socket.on('battle:submit', (data) => this.handleExecute(socket, { ...data, mode: 'submit' }));

        socket.on('voice:speaking', (data) => this.handleVoiceSpeaking(socket, data));
        socket.on('presence:typing', (data) => this.handleTyping(socket, data));

        socket.on('find_match', () => this.handleFindMatch(socket));
        socket.on('cancel_search', () => this.handleCancelSearch(socket));
        socket.on('disconnect', () => this.handleDisconnect(socket));
    }

    private async handleRoomCreate(socket: CustomSocket, { mode, problemId }: { mode: '1v1' | 'practice' | 'ranked', problemId?: string }) {
        try {
            const room = await matchesService.createMatchRoom({ mode, player1Id: socket.user!.id, problemId });
            socket.join(room.id);
            socket.data.roomId = room.id;

            const user = await db.query.users.findFirst({ where: eq(users.id, socket.user!.id) });
            const fullRoom = await matchesService.getMatchById(room.id);
            if (!fullRoom) throw new Error('Room intel corrupted');

            socket.emit('room:initial_data', {
                roomId: room.id,
                roomCode: room.roomCode,
                players: [{ id: socket.user!.id, username: socket.user!.username, tier: user?.tier || 'BRONZE', rating: user?.rankRating || 1200 }],
                problem: fullRoom.problem
            });

            // Practice rooms start immediately — auto-set ready
            if (mode === 'practice') {
                await matchesService.setReady(room.id, socket.user!.id, true);
            }

            logger.info({ roomId: room.id, userId: socket.user!.id }, '[SOCKET] User created room');
        } catch (err: any) {
            socket.emit('room:error', { message: err.message });
        }
    }

    private async handleRoomJoin(socket: CustomSocket, { roomCode }: { roomCode: string }) {
        try {
            const room = await matchesService.joinMatchRoom(roomCode, socket.user!.id);
            socket.join(room.id);
            socket.data.roomId = room.id;

            const fullRoom = await matchesService.getMatchById(room.id);
            if (!fullRoom) throw new Error('Room intel corrupted');

            const isP1 = room.player1Id === socket.user!.id;
            const user = await db.query.users.findFirst({ where: eq(users.id, socket.user!.id) });

            // Notify existing player
            socket.to(room.id).emit('room:player_joined', {
                player: { id: socket.user!.id, username: socket.user!.username, tier: user?.tier || 'BRONZE', rating: user?.rankRating || 1200 }
            });

            socket.emit('room:initial_data', {
                roomId: room.id,
                roomCode: room.roomCode,
                players: [
                    fullRoom.player1 ? { id: fullRoom.player1.id, username: fullRoom.player1.username, tier: fullRoom.player1.tier, rating: fullRoom.player1.rankRating } : null,
                    fullRoom.player2 ? { id: fullRoom.player2.id, username: fullRoom.player2.username, tier: fullRoom.player2.tier, rating: fullRoom.player2.rankRating } : null,
                ].filter(Boolean),
                problem: fullRoom.problem
            });

            logger.info({ roomId: room.id, userId: socket.user!.id }, '[SOCKET] User joined room');
        } catch (err: any) {
            socket.emit('room:error', { message: err.message });
        }
    }

    /**
     * Join a match by its UUID (used after matchmaking MATCH_FOUND).
     * Automatically marks the player as ready. When both join → match starts.
     */
    private async handleJoinById(socket: CustomSocket, { matchId }: { matchId: string }) {
        if (!socket.user || !matchId) return;
        try {
            const fullRoom = await matchesService.getMatchById(matchId);
            if (!fullRoom) { socket.emit('room:error', { message: 'Match not found' }); return; }

            // Verify player belongs to this match
            const isPlayer = fullRoom.player1Id === socket.user.id || fullRoom.player2Id === socket.user.id;
            if (!isPlayer) { socket.emit('room:error', { message: 'Not a participant in this match' }); return; }

            // If already active (both joined), just send state back
            if (fullRoom.status === 'active') {
                socket.join(matchId);
                socket.data.roomId = matchId;
                socket.emit('room:initial_data', {
                    roomId: matchId, roomCode: fullRoom.roomCode,
                    players: [
                        fullRoom.player1 ? { id: fullRoom.player1.id, username: fullRoom.player1.username, tier: fullRoom.player1.tier, rating: fullRoom.player1.rankRating } : null,
                        fullRoom.player2 ? { id: fullRoom.player2.id, username: fullRoom.player2.username, tier: fullRoom.player2.tier, rating: fullRoom.player2.rankRating } : null,
                    ].filter(Boolean),
                    problem: fullRoom.problem
                });
                socket.emit('room:both_ready', { problem: fullRoom.problem, startedAt: fullRoom.startedAt });
                return;
            }

            socket.join(matchId);
            socket.data.roomId = matchId;

            // Announce to the other player
            socket.to(matchId).emit('room:player_joined', {
                player: { id: socket.user.id, username: socket.user.username }
            });

            socket.emit('room:initial_data', {
                roomId: matchId, roomCode: fullRoom.roomCode,
                players: [
                    fullRoom.player1 ? { id: fullRoom.player1.id, username: fullRoom.player1.username, tier: fullRoom.player1.tier, rating: fullRoom.player1.rankRating } : null,
                    fullRoom.player2 ? { id: fullRoom.player2.id, username: fullRoom.player2.username, tier: fullRoom.player2.tier, rating: fullRoom.player2.rankRating } : null,
                ].filter(Boolean),
                problem: fullRoom.problem
            });

            // Auto-ready: ranked matches start when both sockets join
            const { bothReady } = await matchesService.setReady(matchId, socket.user.id, true);

            if (bothReady) {
                const updatedRoom = await matchesService.getMatchById(matchId);
                this.io.to(matchId).emit('room:both_ready', {
                    problem: updatedRoom?.problem ?? fullRoom.problem,
                    startedAt: new Date().toISOString()
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
                const fullRoom = await matchesService.getMatchById(roomId);
                if (!fullRoom) return;
                this.io.to(roomId).emit('room:both_ready', { problem: fullRoom.problem, startedAt: new Date().toISOString() });
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

    private async handleExecute(socket: CustomSocket, data: { code: string, language: string, mode: 'run' | 'submit' }) {
        const roomId = socket.data.roomId;
        logger.info({ roomId, userId: socket.user?.id, mode: data.mode }, '[SOCKET] Code execution request');

        if (!roomId || !socket.user) {
            logger.warn({ userId: socket.user?.id }, '[SOCKET] Execution rejected: No room ID');
            socket.emit(data.mode === 'run' ? 'battle:run_result' : 'battle:submission_result', {
                status: 'INTERNAL_ERROR', error: 'Not in a match room. Please refresh.'
            });
            return;
        }

        try {
            if (data.mode === 'submit') {
                socket.to(roomId).emit('battle:opponent_submitted', { status: 'CHECKING' });
            }
            await submissionsService.executeCode({
                matchId: roomId, userId: socket.user.id,
                code: data.code, language: data.language, mode: data.mode
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

    private async handleFindMatch(socket: CustomSocket) {
        if (!socket.user) return;
        const user = await db.query.users.findFirst({ where: eq(users.id, socket.user.id) });
        logger.info({ userId: socket.user.id, elo: user?.rankRating }, '[SOCKET] Player searching for match');
        await this.matchmaking.findMatch(socket.user.id, user?.rankRating || 1200);
    }

    private async handleCancelSearch(socket: CustomSocket) {
        if (!socket.user) return;
        await this.matchmaking.removeFromQueue(socket.user.id);
    }

    private async handleDisconnect(socket: CustomSocket) {
        if (!socket.user) return;
        await this.matchmaking.removeFromQueue(socket.user.id);
    }
}
