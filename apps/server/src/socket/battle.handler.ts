import { Server, Socket } from 'socket.io';
import { CustomSocket } from '../middleware/socketAuth.middleware';
import { MatchmakingService } from '../modules/matchmaking/matchmaking.service';
import { matchesService } from '../modules/matches/matches.service';
import { submissionsService } from '../modules/submissions/submissions.service';
import { logger } from '../lib/logger';
import { redis } from '../lib/redis';
import { db } from '../db';
import { users } from '@arena/database';
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

    private async handleRoomCreate(socket: CustomSocket, { mode }: { mode: '1v1' | 'practice' | 'ranked' }) {
        try {
            const room = await matchesService.createMatchRoom({
                mode,
                player1Id: socket.user!.id
            });
            socket.join(room.id);
            socket.data.roomId = room.id;

            const user = await db.query.users.findFirst({ where: eq(users.id, socket.user!.id) });
            
            const fullRoom = await matchesService.getMatchById(room.id);
            if (!fullRoom) throw new Error('Room intel corrupted');

            socket.emit('room:initial_data', {
                roomId: room.id,
                roomCode: room.roomCode,
                players: [{
                    id: socket.user!.id,
                    username: socket.user!.username,
                    tier: user?.tier || 'BRONZE',
                    rating: user?.rankRating || 1200
                }],
                problem: fullRoom.problem
            });

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
            const opponent = isP1 ? fullRoom.player2 : fullRoom.player1;

            if (opponent && fullRoom) {
                const user = await db.query.users.findFirst({ where: eq(users.id, socket.user!.id) });
                socket.to(room.id).emit('room:player_joined', {
                    player: {
                        id: socket.user!.id,
                        username: socket.user!.username,
                        tier: user?.tier || 'BRONZE',
                        rating: user?.rankRating || 1200
                    }
                });
            }

            if (!fullRoom) throw new Error('Room intel corrupted');

            socket.emit('room:initial_data', {
                roomId: room.id,
                roomCode: room.roomCode,
                players: [
                    {
                        id: fullRoom.player1.id,
                        username: fullRoom.player1.username,
                        tier: fullRoom.player1.tier,
                        rating: fullRoom.player1.rankRating
                    },
                    fullRoom.player2 ? {
                        id: fullRoom.player2.id,
                        username: fullRoom.player2.username,
                        tier: fullRoom.player2.tier,
                        rating: fullRoom.player2.rankRating
                    } : null
                ].filter(Boolean),
                problem: fullRoom.problem
            });

            logger.info({ roomId: room.id, userId: socket.user!.id }, '[SOCKET] User joined room');
        } catch (err: any) {
            socket.emit('room:error', { message: err.message });
        }
    }

    private async handleRoomReady(socket: CustomSocket) {
        const roomId = socket.data.roomId;
        if (!roomId || !socket.user) return;

        try {
            const { room, bothReady } = await matchesService.setReady(roomId, socket.user.id);
            
            this.io.to(roomId).emit('room:player_ready', { userId: socket.user.id });

            if (bothReady) {
                const fullRoom = await matchesService.getMatchById(roomId);
                if (!fullRoom) return;

                // Start 3-2-1 countdown on client via this event
                this.io.to(roomId).emit('room:both_ready', {
                    problem: fullRoom.problem,
                    startedAt: new Date()
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

    private async handleExecute(socket: CustomSocket, data: { code: string, language: string, mode: 'run' | 'submit' }) {
        const roomId = socket.data.roomId;
        if (!roomId || !socket.user) return;

        try {
            if (data.mode === 'submit') {
                socket.to(roomId).emit('battle:opponent_submitted', { status: 'CHECKING' });
            }

            await submissionsService.executeCode({
                matchId: roomId,
                userId: socket.user.id,
                code: data.code,
                language: data.language,
                mode: data.mode
            });
        } catch (err: any) {
            socket.emit('battle:error', { message: err.message });
        }
    }

    private handleVoiceSpeaking(socket: CustomSocket, { active }: { active: boolean }) {
        const roomId = socket.data.roomId;
        if (roomId) {
            socket.to(roomId).emit('voice:opponent_speaking', { active });
        }
    }

    private handleTyping(socket: CustomSocket, { lines }: { lines: number }) {
        const roomId = socket.data.roomId;
        if (roomId) {
            socket.to(roomId).emit('presence:opponent_typing', { lines });
        }
    }

    private async handleFindMatch(socket: CustomSocket) {
        if (!socket.user) return;
        const user = await db.query.users.findFirst({ where: eq(users.id, socket.user.id) });
        await this.matchmaking.findMatch(socket.user.id, user?.rankRating || 1200);
    }

    private async handleCancelSearch(socket: CustomSocket) {
        if (!socket.user) return;
        await this.matchmaking.removeFromQueue(socket.user.id);
    }

    private async handleDisconnect(socket: CustomSocket) {
        if (!socket.user) return;
        await this.matchmaking.removeFromQueue(socket.user.id);
        // Handle in-room disconnect if needed
    }
}
