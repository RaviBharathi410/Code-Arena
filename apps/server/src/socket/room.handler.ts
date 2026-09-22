import { Server } from 'socket.io';
import { CustomSocket } from '../middleware/socketAuth.middleware';
import { roomsService } from '../modules/rooms/rooms.service';
import { HostedRoom } from '../models/HostedRoom';
import { logger } from '../lib/logger';
import { executionEngineClient } from '../lib/execution/ExecutionEngineClient';
import { functionDriver } from '../lib/execution/FunctionDriver';
import { LANGUAGE_MAP } from '../modules/submissions/submissions.service';

export class RoomHandler {
    private io: Server;

    constructor(io: Server) {
        this.io = io;
    }

    handleConnection(socket: CustomSocket) {
        // Room lifecycle & management events (Phase 15F, 15G)
        socket.on('room:join_hosted', (data) => this.handleJoinHosted(socket, data));
        socket.on('room:leave_hosted', (data) => this.handleLeaveHosted(socket, data));
        socket.on('room:toggle_ready', (data) => this.handleToggleReady(socket, data));
        socket.on('room:kick_participant', (data) => this.handleKickParticipant(socket, data));
        socket.on('room:start_session', (data) => this.handleStartSession(socket, data));
        socket.on('room:end_session', (data) => this.handleEndSession(socket, data));

        // Live presence & race code execution (Phase 15G, 15H)
        socket.on('room:code_update', (data) => this.handleCodeUpdate(socket, data));
        socket.on('room:run_code', (data) => this.handleRunCode(socket, data));
        socket.on('room:submit_code', (data) => this.handleSubmitCode(socket, data));

        socket.on('disconnect', () => this.handleDisconnect(socket));
    }

    /**
     * Join hosted multi-user room socket channel
     */
    private async handleJoinHosted(socket: CustomSocket, { roomCode }: { roomCode: string }) {
        try {
            if (!socket.user) {
                socket.emit('room:error', { message: 'Authentication required' });
                return;
            }

            const normalizedCode = (roomCode || '').trim().toUpperCase();
            const room = await roomsService.joinRoom(normalizedCode, socket.user.id);

            // Join socket channel named hosted:ROOMCODE and ROOMCODE
            const channel = `hosted:${normalizedCode}`;
            await socket.join(channel);
            await socket.join(normalizedCode);
            socket.data.hostedRoomCode = normalizedCode;

            // Broadcast new participant arrival to all sockets in room
            const joinedParticipant = room.participants.find(p => p.userId.toString() === socket.user!.id);
            const plainParticipants = room.participants.map((p: any) => (p?.toObject ? p.toObject() : p));
            const plainJoined = joinedParticipant ? ((joinedParticipant as any)?.toObject ? (joinedParticipant as any).toObject() : joinedParticipant) : null;

            const joinPayload = {
                participant: plainJoined,
                participants: plainParticipants,
                participantCount: room.participants.length
            };

            this.io.to(channel).emit('room:participant_joined', joinPayload);
            this.io.to(normalizedCode).emit('room:participant_joined', joinPayload);

            // Send full room snapshot to joining user
            socket.emit('room:sync', {
                roomCode: room.roomCode,
                title: room.title,
                hostId: room.hostId.toString(),
                isHost: room.hostId.toString() === socket.user.id,
                status: room.status,
                capacity: room.capacity,
                config: room.config,
                problemSet: room.problemSet,
                participants: plainParticipants,
                results: room.results,
                startedAt: room.startedAt,
                endedAt: room.endedAt
            });

            logger.info({ roomCode: normalizedCode, userId: socket.user.id }, '[SOCKET:ROOM] User patched into hosted room');
        } catch (err: any) {
            socket.emit('room:error', { message: err.message });
        }
    }

    /**
     * Leave hosted room
     */
    private async handleLeaveHosted(socket: CustomSocket, { roomCode }: { roomCode: string }, isExplicitLeave = false) {
        try {
            if (!socket.user) return;
            const normalizedCode = (roomCode || socket.data.hostedRoomCode || '').trim().toUpperCase();
            if (!normalizedCode) return;

            const channel = `hosted:${normalizedCode}`;
            const { room, hostChanged, newHostId, roomCancelled } = await roomsService.leaveRoom(normalizedCode, socket.user.id, isExplicitLeave);

            await socket.leave(channel);
            await socket.leave(normalizedCode);
            socket.data.hostedRoomCode = undefined;

            if (roomCancelled) {
                const cancelPayload = { message: 'The room host departed and no operators remained. Room uplink dissolved.' };
                this.io.to(channel).emit('room:cancelled', cancelPayload);
                this.io.to(normalizedCode).emit('room:cancelled', cancelPayload);
            } else {
                if (hostChanged) {
                    this.io.to(channel).emit('room:host_changed', { newHostId });
                    this.io.to(normalizedCode).emit('room:host_changed', { newHostId });
                }
                const plainParticipants = room.participants.map((p: any) => (p?.toObject ? p.toObject() : p));
                const leavePayload = {
                    userId: socket.user.id,
                    participants: plainParticipants,
                    participantCount: room.participants.length
                };
                this.io.to(channel).emit('room:participant_left', leavePayload);
                this.io.to(normalizedCode).emit('room:participant_left', leavePayload);
            }
        } catch (err: any) {
            logger.warn({ error: err.message }, '[SOCKET:ROOM] Error in handleLeaveHosted');
        }
    }

    /**
     * Handle socket disconnect
     */
    private async handleDisconnect(socket: CustomSocket) {
        if (socket.data.hostedRoomCode && socket.user) {
            await this.handleLeaveHosted(socket, { roomCode: socket.data.hostedRoomCode }, false);
        }
    }

    /**
     * Toggle participant ready state in lobby
     */
    private async handleToggleReady(socket: CustomSocket, { roomCode, isReady }: { roomCode: string, isReady: boolean }) {
        try {
            if (!socket.user) return;
            const normalizedCode = (roomCode || socket.data.hostedRoomCode || '').trim().toUpperCase();
            const room = await roomsService.setReady(normalizedCode, socket.user.id, Boolean(isReady));

            const channel = `hosted:${normalizedCode}`;
            const plainParticipants = room.participants.map((p: any) => (p?.toObject ? p.toObject() : p));
            const readyPayload = {
                userId: socket.user.id,
                isReady: Boolean(isReady),
                participants: plainParticipants
            };
            this.io.to(channel).emit('room:participant_ready', readyPayload);
            this.io.to(normalizedCode).emit('room:participant_ready', readyPayload);
        } catch (err: any) {
            socket.emit('room:error', { message: err.message });
        }
    }

    /**
     * Host kicks a participant (Host Only - Phase 15G)
     */
    private async handleKickParticipant(socket: CustomSocket, { roomCode, targetUserId }: { roomCode: string, targetUserId: string }) {
        try {
            if (!socket.user) return;
            const normalizedCode = (roomCode || socket.data.hostedRoomCode || '').trim().toUpperCase();
            const room = await roomsService.kickParticipant(normalizedCode, socket.user.id, targetUserId);

            const channel = `hosted:${normalizedCode}`;
            const plainParticipants = room.participants.map((p: any) => (p?.toObject ? p.toObject() : p));
            const kickPayload = {
                targetUserId,
                participants: plainParticipants,
                participantCount: room.participants.length
            };
            this.io.to(channel).emit('room:participant_kicked', kickPayload);
            this.io.to(normalizedCode).emit('room:participant_kicked', kickPayload);
        } catch (err: any) {
            socket.emit('room:error', { message: err.message });
        }
    }

    /**
     * Host starts the race session (Host Only - Phase 15G)
     */
    private async handleStartSession(socket: CustomSocket, { roomCode }: { roomCode: string }) {
        try {
            if (!socket.user) return;
            const normalizedCode = (roomCode || socket.data.hostedRoomCode || '').trim().toUpperCase();
            const room = await roomsService.startSession(normalizedCode, socket.user.id);

            const channel = `hosted:${normalizedCode}`;
            const startPayload = {
                roomCode: room.roomCode,
                startedAt: room.startedAt,
                durationMinutes: room.config.durationMinutes,
                initialProblem: room.problemSet[0],
                totalProblems: room.problemSet.length
            };
            this.io.to(channel).emit('room:session_started', startPayload);
            this.io.to(normalizedCode).emit('room:session_started', startPayload);
            logger.info({ roomCode: normalizedCode }, '[SOCKET:ROOM] Race session broadcast to all participants');
        } catch (err: any) {
            socket.emit('room:error', { message: err.message });
        }
    }

    /**
     * Participant typing broadcast during active race
     */
    private handleCodeUpdate(socket: CustomSocket, { roomCode, lines }: { roomCode: string, lines: number }) {
        if (!socket.user) return;
        const normalizedCode = (roomCode || socket.data.hostedRoomCode || '').trim().toUpperCase();
        const channel = `hosted:${normalizedCode}`;
        socket.to(channel).emit('room:participant_typing', {
            userId: socket.user.id,
            lines
        });
    }

    /**
     * Run code against sample test cases in hosted room (Phase 15G)
     */
    private async handleRunCode(socket: CustomSocket, { roomCode, problemIndex, code, language }: { roomCode: string, problemIndex: number, code: string, language: string }) {
        try {
            if (!socket.user) {
                socket.emit('room:run_result', { status: 'INTERNAL_ERROR', error: 'Authentication required' });
                return;
            }

            const normalizedCode = (roomCode || socket.data.hostedRoomCode || '').trim().toUpperCase();
            const room = await HostedRoom.findOne({ roomCode: normalizedCode }).lean();
            if (!room) {
                socket.emit('room:run_result', { status: 'ERROR', error: 'Room not found' });
                return;
            }

            const problem = room.problemSet[problemIndex || 0];
            if (!problem) {
                socket.emit('room:run_result', { status: 'ERROR', error: 'Problem not found in sequence' });
                return;
            }

            const engineLang = LANGUAGE_MAP[language] || 'javascript';
            const sampleTestCases = (problem.testCases || []).filter((tc: any) => !tc.is_hidden).slice(0, 5);

            const results: any[] = [];
            let passedCount = 0;
            let maxTimeMs = 0;

            for (let i = 0; i < sampleTestCases.length; i++) {
                const tc = sampleTestCases[i];
                const inputVal = tc?.input;
                const expectedVal = tc?.expectedOutput !== undefined ? tc.expectedOutput : tc?.expected;

                const stdinStr = typeof inputVal === 'string' ? inputVal : JSON.stringify(inputVal ?? '');
                const expectedStr = typeof expectedVal === 'string' ? expectedVal : JSON.stringify(expectedVal ?? '');

                let sourceToRun = code;
                let stdinToRun = stdinStr;

                if (problem.functionName) {
                    try {
                        const generated = functionDriver.generate({
                            problem: {
                                problemType: 'function',
                                functionName: problem.functionName,
                                returnType: problem.returnType,
                                parameters: problem.parameters,
                            },
                            userCode: code,
                            testCaseInput: stdinStr,
                            language: engineLang,
                        });
                        sourceToRun = generated.sourceCode;
                        stdinToRun = '';
                    } catch (genErr) {
                        // Driver fallback
                    }
                }

                const execResult = await executionEngineClient.execute({
                    languageId: engineLang,
                    sourceCode: sourceToRun,
                    stdin: stdinToRun,
                    timeLimitMs: 2000,
                    memoryLimitMb: 256,
                });

                const actualOutput = (execResult.stdout || '').trim();
                let passed = false;
                try {
                    const normActual = actualOutput.replace(/\r\n/g, '\n').trim();
                    const normExpected = expectedStr.replace(/\r\n/g, '\n').trim();
                    passed = normActual === normExpected;
                    if (!passed) {
                        try {
                            passed = JSON.stringify(JSON.parse(normActual)) === JSON.stringify(JSON.parse(normExpected));
                        } catch { }
                    }
                } catch { }

                if (passed) passedCount++;
                maxTimeMs = Math.max(maxTimeMs, execResult.timeMs || 0);

                results.push({
                    testCaseIndex: i,
                    status: passed ? 'ACCEPTED' : (execResult.status === 'COMPILATION_ERROR' ? 'COMPILATION_ERROR' : 'WRONG_ANSWER'),
                    passed,
                    input: stdinStr,
                    expected: expectedStr,
                    actual: actualOutput,
                    stderr: execResult.stderr,
                    timeMs: execResult.timeMs || 0
                });

                if (execResult.status === 'COMPILATION_ERROR') break;
            }

            const allPassed = passedCount === sampleTestCases.length;
            socket.emit('room:run_result', {
                status: allPassed ? 'ACCEPTED' : (results.find(r => !r.passed)?.status || 'WRONG_ANSWER'),
                testCasesPass: passedCount,
                testCasesTotal: sampleTestCases.length,
                results,
                timeMs: maxTimeMs
            });
        } catch (err: any) {
            socket.emit('room:run_result', { status: 'INTERNAL_ERROR', error: err.message });
        }
    }

    /**
     * Submit code against full test cases during race (Phase 15G, 15H)
     */
    private async handleSubmitCode(socket: CustomSocket, { roomCode, problemIndex, code, language }: { roomCode: string, problemIndex: number, code: string, language: string }) {
        try {
            if (!socket.user) {
                socket.emit('room:submission_result', { status: 'INTERNAL_ERROR', error: 'Authentication required' });
                return;
            }

            const normalizedCode = (roomCode || socket.data.hostedRoomCode || '').trim().toUpperCase();
            const room = await HostedRoom.findOne({ roomCode: normalizedCode }).lean();
            if (!room) {
                socket.emit('room:submission_result', { status: 'ERROR', error: 'Room not found' });
                return;
            }

            const problem = room.problemSet[problemIndex || 0];
            if (!problem) {
                socket.emit('room:submission_result', { status: 'ERROR', error: 'Problem not found in sequence' });
                return;
            }

            const engineLang = LANGUAGE_MAP[language] || 'javascript';
            const allTestCases = problem.testCases || [];

            const results: any[] = [];
            let passedCount = 0;
            let maxTimeMs = 0;

            for (let i = 0; i < allTestCases.length; i++) {
                const tc = allTestCases[i];
                const inputVal = tc?.input;
                const expectedVal = tc?.expectedOutput !== undefined ? tc.expectedOutput : tc?.expected;

                const stdinStr = typeof inputVal === 'string' ? inputVal : JSON.stringify(inputVal ?? '');
                const expectedStr = typeof expectedVal === 'string' ? expectedVal : JSON.stringify(expectedVal ?? '');

                let sourceToRun = code;
                let stdinToRun = stdinStr;

                if (problem.functionName) {
                    try {
                        const generated = functionDriver.generate({
                            problem: {
                                problemType: 'function',
                                functionName: problem.functionName,
                                returnType: problem.returnType,
                                parameters: problem.parameters,
                            },
                            userCode: code,
                            testCaseInput: stdinStr,
                            language: engineLang,
                        });
                        sourceToRun = generated.sourceCode;
                        stdinToRun = '';
                    } catch (genErr) {
                        // Driver fallback
                    }
                }

                const execResult = await executionEngineClient.execute({
                    languageId: engineLang,
                    sourceCode: sourceToRun,
                    stdin: stdinToRun,
                    timeLimitMs: 2000,
                    memoryLimitMb: 256,
                });

                const actualOutput = (execResult.stdout || '').trim();
                let passed = false;
                try {
                    const normActual = actualOutput.replace(/\r\n/g, '\n').trim();
                    const normExpected = expectedStr.replace(/\r\n/g, '\n').trim();
                    passed = normActual === normExpected;
                    if (!passed) {
                        try {
                            passed = JSON.stringify(JSON.parse(normActual)) === JSON.stringify(JSON.parse(normExpected));
                        } catch { }
                    }
                } catch { }

                if (passed) passedCount++;
                maxTimeMs = Math.max(maxTimeMs, execResult.timeMs || 0);

                results.push({
                    testCaseIndex: i,
                    status: passed ? 'ACCEPTED' : (execResult.status === 'COMPILATION_ERROR' ? 'COMPILATION_ERROR' : 'WRONG_ANSWER'),
                    passed,
                    input: tc.is_hidden ? 'HIDDEN_TEST_CASE' : stdinStr,
                    expected: tc.is_hidden ? 'HIDDEN_EXPECTED' : expectedStr,
                    actual: tc.is_hidden ? (passed ? 'MATCHED' : 'DID_NOT_MATCH') : actualOutput,
                    stderr: execResult.stderr,
                    timeMs: execResult.timeMs || 0
                });

                if (execResult.status === 'COMPILATION_ERROR') break;
            }

            const allPassed = passedCount === allTestCases.length;
            const finalStatus = allPassed ? 'ACCEPTED' : (results.find(r => !r.passed)?.status || 'WRONG_ANSWER');

            // Record live progress in room service
            const { room: updatedRoom, solvedNext, finished, allFinished } = await roomsService.recordSubmissionResult(normalizedCode, socket.user.id, {
                problemIndex,
                testCasesPassed: passedCount,
                totalTestCases: allTestCases.length,
                allPassed,
                code,
                language,
                timeMs: maxTimeMs
            });

            // Emit submission result back to the submitting operator
            socket.emit('room:submission_result', {
                status: finalStatus,
                testCasesPass: passedCount,
                testCasesTotal: allTestCases.length,
                results,
                solvedNext,
                finished,
                nextProblemIndex: solvedNext ? problemIndex + 1 : problemIndex,
                nextProblem: solvedNext ? updatedRoom.problemSet[problemIndex + 1] : undefined
            });

            // Broadcast live progress update to entire room channel
            const channel = `hosted:${normalizedCode}`;
            const participant = updatedRoom.participants.find(p => p.userId.toString() === socket.user!.id);
            this.io.to(channel).emit('room:participant_progress', {
                userId: socket.user.id,
                username: socket.user.username,
                problemIndex: participant?.currentProblemIndex ?? problemIndex,
                solvedProblems: participant?.solvedProblems ?? [],
                testCasesPassed: passedCount,
                totalTestCases: allTestCases.length,
                totalScore: participant?.totalScore ?? 0,
                finished
            });

            // If all operators have crossed the finish line, broadcast completion
            if (allFinished) {
                this.io.to(channel).emit('room:session_completed', {
                    results: updatedRoom.results
                });
            }
        } catch (err: any) {
            socket.emit('room:submission_result', { status: 'INTERNAL_ERROR', error: err.message });
        }
    }

    /**
     * Host manually ends the session or timer expired
     */
    private async handleEndSession(socket: CustomSocket, { roomCode }: { roomCode: string }) {
        try {
            if (!socket.user) return;
            const normalizedCode = (roomCode || socket.data.hostedRoomCode || '').trim().toUpperCase();
            const room = await HostedRoom.findOne({ roomCode: normalizedCode });
            if (!room) return;

            if (room.hostId.toString() !== socket.user.id) {
                socket.emit('room:error', { message: 'Unauthorized: Only the host can terminate the session.' });
                return;
            }

            const completedRoom = await roomsService.completeSession(normalizedCode);
            const channel = `hosted:${normalizedCode}`;
            this.io.to(channel).emit('room:session_completed', {
                results: completedRoom.results
            });
        } catch (err: any) {
            socket.emit('room:error', { message: err.message });
        }
    }
}
