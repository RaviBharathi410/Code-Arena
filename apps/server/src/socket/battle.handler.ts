import { Server } from 'socket.io';
import crypto from 'crypto';
import { db } from '../db';
import { matches, submissions, problems } from '@arena/database';
import { eq } from 'drizzle-orm';
import { CustomSocket } from '../middleware/socketAuth.middleware';

interface MatchState {
    id: string;
    players: string[];
    userIds: string[];
    code: Record<string, string>;
    status: 'waiting' | 'active' | 'completed';
    problemId?: string;
}

export class BattleHandler {
    private matches: Map<string, MatchState> = new Map();
    private onlineUsers: Map<string, { id: string, username: string, socketId: string }> = new Map();

    constructor(private io: Server) { }

    handleConnection(socket: CustomSocket) {
        if (socket.user) {
            const userData = {
                id: socket.user.id,
                username: socket.user.username,
                socketId: socket.id
            };
            this.onlineUsers.set(socket.user.id, userData);
            socket.broadcast.emit('user_joined', userData);
            socket.emit('online_users', Array.from(this.onlineUsers.values()));
        }

        socket.on('disconnect', () => this.handleDisconnect(socket));
        socket.on('challenge_user', (data) => this.handleChallenge(socket, data));
        socket.on('join_match', (matchId) => this.handleJoinMatch(socket, matchId));
        socket.on('code_update', (data) => this.handleCodeUpdate(socket, data));
        socket.on('submit_code', (data) => this.handleSubmitCode(socket, data));
    }

    private handleDisconnect(socket: CustomSocket) {
        if (socket.user) {
            this.onlineUsers.delete(socket.user.id);
            this.io.emit('user_left', { id: socket.user.id });
        }
    }

    private handleChallenge(socket: CustomSocket, { challengerId, opponentId }: { challengerId: string, opponentId: string }) {
        const challenger = this.onlineUsers.get(challengerId);
        const opponent = this.onlineUsers.get(opponentId);

        if (challenger && opponent) {
            const matchId = crypto.randomUUID();
            socket.emit('match_start', { matchId });
            this.io.to(opponent.socketId).emit('challenge_received', {
                challengerId,
                challengerName: challenger.username,
                matchId
            });
            this.io.to(opponent.socketId).emit('match_start', { matchId });
        }
    }

    private async handleJoinMatch(socket: CustomSocket, matchId: string) {
        socket.join(matchId);

        if (!this.matches.has(matchId)) {
            const allProblems = await db.select().from(problems);
            const randomProblem = allProblems[Math.floor(Math.random() * allProblems.length)];

            this.matches.set(matchId, {
                id: matchId,
                players: [socket.id],
                userIds: [socket.user?.id || ''],
                code: {},
                status: 'waiting',
                problemId: randomProblem?.id
            });
        } else {
            const match = this.matches.get(matchId)!;
            if (!match.players.includes(socket.id)) {
                match.players.push(socket.id);
                match.userIds.push(socket.user?.id || '');

                if (match.players.length === 2) {
                    try {
                        await db.insert(matches).values({
                            id: matchId,
                            player1Id: match.userIds[0],
                            player2Id: match.userIds[1],
                            problemId: match.problemId!,
                            status: 'active'
                        });

                        match.status = 'active';

                        const problemResult = await db.select().from(problems).where(eq(problems.id, match.problemId!)).limit(1);
                        const problem = problemResult[0];

                        this.io.to(matchId).emit('match_start', {
                            problemId: match.problemId,
                            problem,
                            players: match.userIds
                        });
                    } catch (err) {
                        console.error('Failed to update match in DB:', err);
                    }
                }
            }
        }
    }

    private handleCodeUpdate(socket: CustomSocket, { matchId, code }: { matchId: string, code: string }) {
        const match = this.matches.get(matchId);
        if (match) {
            match.code[socket.id] = code;
            socket.to(matchId).emit('opponent_code_update', { playerId: socket.id, code });
        }
    }

    private async handleSubmitCode(socket: CustomSocket, { matchId, code, languageId }: { matchId: string, code: string, languageId: number }) {
        const userId = socket.user?.id;
        try {
            await db.insert(submissions).values({
                id: crypto.randomUUID(),
                userId: userId!,
                matchId,
                code,
                languageId: languageId || 63, // Fallback to JS
                status: 'accepted'
            });
            await db.update(matches).set({ winnerId: userId, status: 'completed' }).where(eq(matches.id, matchId));
            this.io.to(matchId).emit('match_result', { winner: socket.id, status: 'completed', winnerId: userId });
        } catch (err) {
            console.error('Failed to process submission:', err);
        }
    }
}
