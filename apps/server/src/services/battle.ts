import { Server, Socket } from 'socket.io';
import { db } from '../db';
import { matches, submissions, problems } from '@arena/database';
import { eq } from 'drizzle-orm';

interface CustomSocket extends Socket {
    user?: {
        id: string;
        username: string;
    };
}

interface MatchState {
    id: string;
    players: string[];
    userIds: string[];
    code: Record<string, string>;
    status: 'pending' | 'ongoing' | 'finished';
    problemId?: string;
}

class BattleService {
    private matches: Map<string, MatchState> = new Map();

    initialize(io: Server) {
        io.on('connection', (socket: CustomSocket) => {
            socket.on('join_match', async (matchId: string) => {
                socket.join(matchId);

                if (!this.matches.has(matchId)) {
                    // Fetch a random problem
                    const allProblems = await db.select().from(problems).all();
                    const randomProblem = allProblems[Math.floor(Math.random() * allProblems.length)];

                    this.matches.set(matchId, {
                        id: matchId,
                        players: [socket.id],
                        userIds: [socket.user?.id || ''],
                        code: {},
                        status: 'pending',
                        problemId: randomProblem?.id
                    });

                    // Persist to DB
                    try {
                        await db.insert(matches).values({
                            id: matchId,
                            player1Id: socket.user?.id,
                            problemId: randomProblem?.id,
                            status: 'pending'
                        }).run();
                    } catch (err) {
                        console.error('Failed to create match in DB:', err);
                    }

                    console.log(`Match ${matchId} initialized with problem ${randomProblem?.title}`);
                } else {
                    const match = this.matches.get(matchId)!;
                    if (!match.players.includes(socket.id)) {
                        match.players.push(socket.id);
                        match.userIds.push(socket.user?.id || '');

                        // Update player 2 in DB
                        if (match.players.length === 2) {
                            try {
                                await db.update(matches)
                                    .set({
                                        player2Id: socket.user?.id,
                                        status: 'ongoing'
                                    })
                                    .where(eq(matches.id, matchId))
                                    .run();
                                match.status = 'ongoing';
                                io.to(matchId).emit('match_start', {
                                    problemId: match.problemId,
                                    problem: await db.select().from(problems).where(eq(problems.id, match.problemId!)).get(),
                                    players: match.userIds
                                });
                            } catch (err) {
                                console.error('Failed to update match in DB:', err);
                            }
                        }
                    }
                }

                console.log(`User ${socket.id} joined match ${matchId}`);
            });

            socket.on('code_update', ({ matchId, code }: { matchId: string, code: string }) => {
                const match = this.matches.get(matchId);
                if (match) {
                    match.code[socket.id] = code;
                    socket.to(matchId).emit('opponent_code_update', {
                        playerId: socket.id,
                        code
                    });
                }
            });

            socket.on('submit_code', async ({ matchId, code, language }: { matchId: string, code: string, language: string }) => {
                const userId = socket.user?.id;
                console.log(`Submission received for match ${matchId} from user ${userId}`);

                try {
                    // Store submission in DB
                    await db.insert(submissions).values({
                        userId,
                        matchId,
                        code,
                        language,
                        status: 'completed',
                    }).run();

                    // For now, just emit success and finish the match
                    await db.update(matches)
                        .set({
                            winnerId: userId,
                            status: 'finished'
                        })
                        .where(eq(matches.id, matchId))
                        .run();

                    io.to(matchId).emit('match_result', {
                        winner: socket.id,
                        status: 'completed',
                        winnerId: userId
                    });
                } catch (err) {
                    console.error('Failed to process submission:', err);
                }
            });
        });
    }
}

export const battleService = new BattleService();
