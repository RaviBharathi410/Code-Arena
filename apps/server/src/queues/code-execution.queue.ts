import { Queue, Worker, Job } from 'bullmq';
import { Submission } from '../models/Submission';
import { MatchRoom } from '../models/MatchRoom';
import { Problem } from '../models/Problem';
import { env } from '../config/env';
import { logger } from '../lib/logger';
import { createBullMQRedisClient } from '../lib/redis';
import { scoringEngine } from '../lib/scoring';
import { matchesService } from '../modules/matches/matches.service';
import { analyticsQueue } from './analytics.queue';

// Enforce strict startup constraints for Judge0 in production
const isProduction = env.NODE_ENV === 'production';
const hasValidKey = env.JUDGE0_API_KEY && env.JUDGE0_API_KEY !== 'your_judge0_key';

if (isProduction && !hasValidKey) {
    throw new Error('FATAL: env variable JUDGE0_API_KEY is missing or contains the placeholder value in production mode. uplink cannot deploy safely.');
}

function encodeB64(str: string): string {
    return Buffer.from(str || '').toString('base64');
}

function decodeB64(str: string | null | undefined): string {
    if (!str) return '';
    return Buffer.from(str, 'base64').toString('utf8');
}

async function runTestCase(code: string, languageId: number, stdin: string, expectedOutput: string) {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (env.JUDGE0_API_KEY && env.JUDGE0_API_KEY !== 'your_judge0_key') {
        headers['X-RapidAPI-Key'] = env.JUDGE0_API_KEY;
    }

    const payload = {
        source_code: encodeB64(code),
        language_id: languageId,
        stdin: encodeB64(stdin),
        expected_output: encodeB64(expectedOutput),
    };

    const res = await fetch(`${env.JUDGE0_API_URL}/submissions?base64_encoded=true`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        throw new Error(`Judge0 API POST failed: ${res.statusText} (${res.status})`);
    }

    const data = await res.json();
    const token = data.token;
    if (!token) {
        throw new Error('Judge0 did not return a submission token');
    }

    const maxPollAttempts = 20; // 20 * 500ms = 10s
    for (let attempt = 0; attempt < maxPollAttempts; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 500));

        const pollRes = await fetch(`${env.JUDGE0_API_URL}/submissions/${token}?base64_encoded=true`, {
            headers,
        });

        if (!pollRes.ok) {
            throw new Error(`Judge0 API poll failed: ${pollRes.statusText} (${pollRes.status})`);
        }

        const runResult = await pollRes.json();
        const statusId = runResult.status?.id;

        if (statusId !== 1 && statusId !== 2) {
            return {
                status: {
                    id: statusId,
                    description: runResult.status?.description,
                },
                time: runResult.time,
                memory: runResult.memory,
                stdout: decodeB64(runResult.stdout),
                stderr: decodeB64(runResult.stderr),
                compile_output: decodeB64(runResult.compile_output),
            };
        }
    }

    const error: any = new Error('Code execution timed out (Judge0 polling exceeded 10s)');
    error.status = 408;
    throw error;
}

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
                await Submission.updateOne({ _id: submissionId }, { $set: { status: 'PROCESSING' } });
            }

            const isMock = env.USE_JUDGE0_MOCK;
            if (isMock) {
                logger.warn('⚠️⚠️⚠️ WARNING: USE_JUDGE0_MOCK IS ACTIVE. USING SIMULATED EXECUTION. THIS MUST NOT BE USED IN PRODUCTION. ⚠️⚠️⚠️');
            }

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
                return runTestCase(code, languageId, sub.stdin, sub.expected_output);
            }));

            // Aggregate results
            let passedCount = 0;
            let maxTime = 0;
            let maxMemory = 0;
            const testResults = results.map((res: any, i) => {
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
                const problem = await Problem.findById(job.data.problemId).lean();

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

                await Submission.updateOne({ _id: submissionId }, {
                    $set: {
                        status: finalStatus,
                        timeMs: Math.round(maxTime * 1000),
                        memoryKb: maxMemory,
                        testCasesPass: passedCount,
                        testCasesTotal: testCases.length,
                        timeComplexity: detectedComplexity,
                        qualityScore,
                        finalScore,
                    }
                });

                // Trigger analytics skill update
                await analyticsQueue.add('update-skills', {
                    userId,
                    matchId,
                    problemDifficulty: problem?.difficulty || 'easy',
                    result: finalStatus === 'ACCEPTED' ? 'win' : 'loss',
                    executionTime: Math.round(maxTime * 1000),
                    languageId,
                });

                // Mark player done; check if both finished
                if (allPassed) {
                    const room = await MatchRoom.findById(matchId).lean();
                    if (room) {
                        const isP1 = room.player1Id?.toString() === userId;
                        const doneField = isP1 ? { player1DoneAt: new Date() } : { player2DoneAt: new Date() };
                        const updatedRoom = await MatchRoom.findByIdAndUpdate(matchId, { $set: doneField }, { new: true }).lean();

                        if (updatedRoom?.player1DoneAt && updatedRoom?.player2DoneAt) {
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
                await Submission.updateOne({ _id: submissionId }, { $set: { status: 'ERROR' } }).catch(() => {});
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
    await Submission.updateOne({ _id: submissionId }, {
        $set: {
            status: finalStatus,
            timeMs: Math.round(parseFloat(time || '0') * 1000),
            memoryKb: memory,
        }
    });

    // 2. If it's a match and it was accepted, check if match is over
    if (isAccepted) {
        const room = await MatchRoom.findById(matchId).lean();
        if (room) {
            const isP1 = room.player1Id?.toString() === userId;
            const doneField = isP1 ? { player1DoneAt: new Date() } : { player2DoneAt: new Date() };
            const updatedRoom = await MatchRoom.findByIdAndUpdate(matchId, { $set: doneField }, { new: true }).lean();

            if (updatedRoom?.player1DoneAt && updatedRoom?.player2DoneAt) {
                const matchResult = await matchesService.calculateMatchResult(matchId);
                if (socketIOInstance && matchResult) {
                    socketIOInstance.to(matchId).emit('match:result', matchResult);
                }
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
