import { Queue, Worker, Job } from 'bullmq';
import { db } from '../db';
import { submissions, matchRooms, problems } from '@arena/database';
import { eq } from 'drizzle-orm';
import { env } from '../config/env';
import { logger } from '../lib/logger';
import { createBullMQRedisClient } from '../lib/redis';
import { scoringEngine } from '../lib/scoring';
import { matchesService } from '../modules/matches/matches.service';

export interface CodeExecutionJobData {
    submissionId: string;
    code: string;
    languageId: number;
    problemId: string;
    matchId: string;
    userId: string;
    testCases: any[];
    mode: 'run' | 'submit';
    matchStartedAt?: string; // ISO string — used for time-to-solve scoring
}

export const codeExecutionQueue = new Queue<CodeExecutionJobData>('code-execution', {
    connection: createBullMQRedisClient(),
    defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
    },
});

let socketIOInstance: any = null;
export function setCodeQueueIO(io: any) { socketIOInstance = io; }
// Legacy alias kept for server.ts compatibility
export { setCodeQueueIO as setSocketIOInstance };

export const codeExecutionWorker = new Worker<CodeExecutionJobData>(
    'code-execution',
    async (job: Job<CodeExecutionJobData>) => {
        const { submissionId, code, languageId, matchId, userId, testCases, mode, matchStartedAt } = job.data;
        logger.info({ submissionId, matchId, userId, mode, testCount: testCases.length }, '[WORKER] Starting execution');

        try {
            if (mode === 'submit') {
                await db.update(submissions).set({ status: 'PROCESSING' }).where(eq(submissions.id, submissionId));
            }

            const isMock = !env.JUDGE0_API_KEY || env.JUDGE0_API_KEY === 'your_judge0_key';

            const judgeSubmissions = testCases.map((tc) => ({
                source_code: code,
                language_id: languageId,
                stdin: typeof tc.input === 'string' ? tc.input : JSON.stringify(tc.input),
                expected_output: typeof tc.output === 'string' ? tc.output
                    : typeof tc.expected_output === 'string' ? tc.expected_output
                    : JSON.stringify(tc.output ?? tc.expected_output),
            }));

            const results = await Promise.all(judgeSubmissions.map(async (sub) => {
                if (isMock) {
                    await new Promise(r => setTimeout(r, Math.random() * 300 + 200));
                    return { status: { id: 3, description: 'Accepted' }, time: '0.04', memory: 2048, stdout: sub.expected_output };
                }
                const res = await fetch(`${env.JUDGE0_API_URL}/submissions?base64_encoded=false&wait=true`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-RapidAPI-Key': env.JUDGE0_API_KEY },
                    body: JSON.stringify(sub),
                });
                if (!res.ok) throw new Error(`Judge0 error: ${res.status}`);
                return res.json();
            }));

            // Aggregate results
            let passedCount = 0;
            let maxTime = 0;
            let maxMemory = 0;
            const testResults = results.map((res, i) => {
                const passed = res.status?.id === 3;
                if (passed) passedCount++;
                if (res.time) maxTime = Math.max(maxTime, parseFloat(res.time) || 0);
                if (res.memory) maxMemory = Math.max(maxMemory, res.memory || 0);
                return { testCaseIndex: i, status: res.status?.description, passed, stdout: res.stdout, stderr: res.stderr, compile_output: res.compile_output, time: res.time, memory: res.memory };
            });

            const allPassed = passedCount === testCases.length;
            const finalStatus = allPassed ? 'ACCEPTED' : (testResults.find(r => !r.passed)?.status?.toUpperCase() || 'WRONG_ANSWER');

            // Complexity & quality analysis
            const detectedComplexity = scoringEngine.detectComplexity(maxTime * 1000, 1000);
            const qualityScore = scoringEngine.analyzeCodeQuality(code);

            const timeToSolveMs = matchStartedAt
                ? Date.now() - new Date(matchStartedAt).getTime()
                : undefined;

            if (mode === 'submit') {
                const problem = await db.query.problems.findFirst({ where: eq(problems.id, job.data.problemId) });

                const finalScore = scoringEngine.calculateScore({
                    status: finalStatus,
                    timeSeconds: maxTime,
                    detectedComplexity,
                    optimalComplexity: problem?.optimalTimeComplexity || 'O(n)',
                    qualityScore,
                    testCasesPass: passedCount,
                    testCasesTotal: testCases.length,
                    timeToSolveMs,
                });

                await db.update(submissions).set({
                    status: finalStatus,
                    timeMs: Math.round(maxTime * 1000),
                    memoryKb: maxMemory,
                    testCasesPass: passedCount,
                    testCasesTotal: testCases.length,
                    timeComplexity: detectedComplexity,
                    qualityScore,
                    finalScore,
                    testResults: testResults as any,
                }).where(eq(submissions.id, submissionId));

                // Mark player done; check if both finished
                if (allPassed) {
                    const room = await db.query.matchRooms.findFirst({ where: eq(matchRooms.id, matchId) });
                    const isP1 = room?.player1Id === userId;
                    const doneField = isP1 ? { player1DoneAt: new Date() } : { player2DoneAt: new Date() };
                    const [updatedRoom] = await db.update(matchRooms).set(doneField).where(eq(matchRooms.id, matchId)).returning();

                    if (updatedRoom.player1DoneAt && updatedRoom.player2DoneAt) {
                        const matchResult = await matchesService.calculateMatchResult(matchId);
                        if (socketIOInstance && matchResult) {
                            socketIOInstance.to(matchId).emit('match:result', {
                                ...matchResult,
                                rankDeltaP1: matchResult.deltaP1,
                                rankDeltaP2: matchResult.deltaP2,
                            });
                        }
                    }
                }
            }

            // Emit result to client
            if (socketIOInstance) {
                const event = mode === 'submit' ? 'battle:submission_result' : 'battle:run_result';
                const room = socketIOInstance.sockets.adapter.rooms.get(matchId);
                logger.info({ matchId, event, roomSize: room?.size ?? 0 }, '[WORKER] Emitting result');

                socketIOInstance.to(matchId).emit(event, {
                    userId,
                    submissionId,
                    status: finalStatus,
                    testCasesPass: passedCount,
                    testCasesTotal: testCases.length,
                    results: testResults,
                    timeMs: Math.round(maxTime * 1000),
                    memoryKb: maxMemory,
                    timeComplexity: detectedComplexity,
                    qualityScore,
                });

                if (mode === 'submit' && allPassed) {
                    socketIOInstance.to(matchId).emit('battle:opponent_done', {
                        userId, status: 'ACCEPTED', testCasesPass: passedCount, timeMs: Math.round(maxTime * 1000)
                    });
                }
            }

        } catch (err: any) {
            logger.error({ err: err.message, submissionId, matchId, mode }, '[WORKER] Execution failed');
            if (mode === 'submit') {
                await db.update(submissions).set({ status: 'ERROR' }).where(eq(submissions.id, submissionId)).catch(() => {});
            }
            if (socketIOInstance) {
                const event = mode === 'submit' ? 'battle:submission_result' : 'battle:run_result';
                socketIOInstance.to(matchId).emit(event, { userId, submissionId, status: 'INTERNAL_ERROR', error: err.message });
            }
            throw err;
        }
    },
    { connection: createBullMQRedisClient(), concurrency: 10 }
);

/**
 * processJudge0Callback — Manual processing for webhook callbacks.
 * Shared logic with the worker to ensure consistent state/scoring.
 */
export async function processJudge0Callback(data: {
    submissionId: string;
    matchId: string;
    userId: string;
    status: any;
    time: string;
    memory: number;
    stdout?: string;
    stderr?: string;
    compile_output?: string;
}) {
    const { submissionId, matchId, userId, status, time, memory } = data;
    const finalStatus = status?.description?.toUpperCase() || 'ERROR';
    const isAccepted = status?.id === 3;

    // 1. Update submission
    await db.update(submissions).set({
        status: finalStatus,
        timeMs: Math.round(parseFloat(time || '0') * 1000),
        memoryKb: memory,
    }).where(eq(submissions.id, submissionId));

    // 2. If it's a match and it was accepted, check if match is over
    if (isAccepted) {
        const room = await db.query.matchRooms.findFirst({ where: eq(matchRooms.id, matchId) });
        const isP1 = room?.player1Id === userId;
        const doneField = isP1 ? { player1DoneAt: new Date() } : { player2DoneAt: new Date() };
        const [updatedRoom] = await db.update(matchRooms).set(doneField).where(eq(matchRooms.id, matchId)).returning();

        if (updatedRoom.player1DoneAt && updatedRoom.player2DoneAt) {
            const matchResult = await matchesService.calculateMatchResult(matchId);
            if (socketIOInstance && matchResult) {
                socketIOInstance.to(matchId).emit('match:result', matchResult);
            }
        }
    }

    // 3. Emit to client
    if (socketIOInstance) {
        socketIOInstance.to(matchId).emit('battle:submission_result', {
            userId,
            submissionId,
            status: finalStatus,
            timeMs: Math.round(parseFloat(time || '0') * 1000),
            memoryKb: memory,
        });
    }

    return { status: finalStatus };
}
