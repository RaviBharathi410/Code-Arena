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
import { executionEngineClient } from '../lib/execution/ExecutionEngineClient';
import { functionDriver } from '../lib/execution/FunctionDriver';

export interface CodeExecutionJobData {
    submissionId: string;
    code: string;
    languageId: string | number;
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
        let hasEmittedResult = false;

        let passedCount = 0;
        let maxTime = 0;
        let maxMemory = 0;
        let testResults: any[] = [];
        let finalStatus = 'INTERNAL_ERROR';
        let detectedComplexity = 'O(n)';
        let qualityScore = 50;

        // ── Phase 1: Core Execution & Verdict Emission ──
        try {
            if (mode === 'submit') {
                await Submission.updateOne({ _id: submissionId }, { $set: { status: 'PROCESSING' } }).catch(() => { });
            }

            const isMock = env.USE_JUDGE0_MOCK;
            if (isMock) {
                logger.warn('⚠️ USE_JUDGE0_MOCK IS ACTIVE. SIMULATED EXECUTION.');
            }

            logger.info({
                submissionId,
                languageId,
                mode,
                codeSnippet: code.slice(0, 100),
                testCaseCount: testCases.length,
                testCaseSample: testCases[0]
            }, '[TRACE Step 1] Execution request payload received by worker');

            if (!Array.isArray(testCases) || testCases.length === 0) {
                throw new Error('[BAD_TESTCASES] Invalid or empty test cases payload provided to worker');
            }

            const problemDoc = await Problem.findById(job.data.problemId).lean();

            function normalizeOutput(val: string): string {
                return (val || '')
                    .replace(/\r\n/g, '\n')
                    .replace(/\r/g, '\n')
                    .split('\n')
                    .map(l => l.trimEnd())
                    .join('\n')
                    .trim();
            }

            // Map numeric Judge0 IDs or string language IDs to ExecutionEngine language key
            let engineLang = typeof languageId === 'string' ? languageId : 'cpp17';
            if (typeof languageId === 'number') {
                const numericMap: Record<number, string> = { 54: 'cpp17', 71: 'python3', 62: 'java', 63: 'javascript' };
                engineLang = numericMap[languageId] || 'cpp17';
            }

            testResults = [];
            for (let i = 0; i < testCases.length; i++) {
                const tc = testCases[i];
                const inputVal = tc?.input !== undefined ? tc.input : tc?.stdin;
                const expectedVal = tc?.expected !== undefined ? tc.expected : (tc?.output !== undefined ? tc.output : tc?.expected_output);

                const toStdinString = (value: any): string => {
                    if (typeof value !== 'string') {
                        return Array.isArray(value)
                            ? value.map(String).join('\n')
                            : String(value ?? '');
                    }

                    try {
                        const parsed = JSON.parse(value);

                        if (Array.isArray(parsed)) {
                            return parsed.map(String).join('\n');
                        }

                        return value;
                    } catch {
                        return value;
                    }
                };

                const toExpectedString = (value: any): string => {
                    if (typeof value !== 'string') {
                        return Array.isArray(value)
                            ? value.map(String).join('\n')
                            : String(value ?? '');
                    }

                    try {
                        const parsed = JSON.parse(value);

                        if (Array.isArray(parsed)) {
                            return parsed.map(String).join('\n');
                        }

                        return value;
                    } catch {
                        return value;
                    }
                };

                const isFunctionProblem = problemDoc?.problemType === 'function' || (!problemDoc?.problemType && (problemDoc?.functionName || problemDoc?.boilerplate));

                const stdinStr = isFunctionProblem
                    ? (typeof inputVal === 'string'
                        ? inputVal
                        : JSON.stringify(inputVal ?? ''))
                    : toStdinString(inputVal);

                const expectedStr = isFunctionProblem
                    ? (typeof expectedVal === 'string'
                        ? expectedVal
                        : JSON.stringify(expectedVal ?? ''))
                    : toExpectedString(expectedVal);

                let sourceToRun = code;
                let stdinToRun = stdinStr;

                if (isFunctionProblem) {
                    const generated = functionDriver.generate({
                        problem: {
                            problemType: 'function',
                            functionName: problemDoc?.functionName,
                            returnType: problemDoc?.returnType,
                            parameters: problemDoc?.parameters,
                        },
                        userCode: code,
                        testCaseInput: stdinStr,
                        language: engineLang,
                    });
                    sourceToRun = generated.sourceCode;
                    stdinToRun = '';
                }

                const execResult = await executionEngineClient.execute({
                    languageId: engineLang,
                    sourceCode: sourceToRun,
                    stdin: stdinToRun,
                    timeLimitMs: 2000,
                    memoryLimitMb: 256,
                });

                let status = execResult.status;
                let passed = false;

                if (execResult.status === 'ACCEPTED') {
                    if (expectedVal === null) {
                        // Custom manual testcase with no strict expected output
                        passed = true;
                    } else {
                        const normActual = normalizeOutput(execResult.stdout);
                        const normExpected = normalizeOutput(expectedStr);
                        passed = normActual === normExpected;
                        if (!passed) {
                            try {
                                const jsonActual = JSON.parse(normActual);
                                const jsonExpected = JSON.parse(normExpected);
                                passed = JSON.stringify(jsonActual) === JSON.stringify(jsonExpected);
                            } catch {
                                const compactActual = normActual.replace(/\s+/g, '');
                                const compactExpected = normExpected.replace(/\s+/g, '');
                                passed = compactActual === compactExpected;
                            }
                        }
                        if (!passed) {
                            status = 'WRONG_ANSWER';
                        }
                    }
                }

                if (passed) passedCount++;
                maxTime = Math.max(maxTime, (execResult.timeMs || 0) / 1000);
                maxMemory = Math.max(maxMemory, execResult.memoryKb || 0);

                const actualOutput = execResult.stdout !== undefined && execResult.stdout !== null
                    ? execResult.stdout.trim()
                    : '';

                testResults.push({
                    testCaseIndex: i,
                    status,
                    passed,
                    input: stdinStr,
                    expected: expectedStr,
                    actual: actualOutput,
                    stdout: execResult.stdout,
                    stderr: execResult.stderr,
                    compile_output: execResult.stderr,
                    time: (execResult.timeMs / 1000).toFixed(3),
                    memory: execResult.memoryKb,
                });

                // Fail fast on compilation error or internal error for remaining cases
                if (execResult.status === 'COMPILATION_ERROR' || execResult.status === 'INTERNAL_ERROR') {
                    break;
                }
            }

            const allPassed = passedCount === testCases.length;
            finalStatus = allPassed ? 'ACCEPTED' : (testResults.find(r => !r.passed)?.status?.toUpperCase() || 'WRONG_ANSWER');

            logger.info({
                passedCount,
                testCasesTotal: testCases.length,
                finalStatus,
                sampleMappedResult: testResults[0]
            }, '[TRACE Step 4] Worker processed Judge0 result into final verdict');

            // Safe complexity & quality score calculations
            try {
                detectedComplexity = scoringEngine.detectComplexity(maxTime * 1000, 1000);
            } catch (err: any) {
                logger.warn({ error: err?.message }, '[WORKER] Complexity detection fallback used');
            }

            try {
                qualityScore = scoringEngine.analyzeCodeQuality(code);
            } catch (err: any) {
                logger.warn({ error: err?.message }, '[WORKER] Quality score analysis fallback used');
            }

            // Emit result to client IMMEDIATELY
            if (socketIOInstance) {
                const event = mode === 'submit' ? 'battle:submission_result' : 'battle:run_result';
                const room = socketIOInstance.sockets.adapter.rooms.get(matchId);
                logger.info({
                    matchId,
                    event,
                    roomSize: room?.size ?? 0,
                    payload: {
                        userId,
                        submissionId,
                        status: finalStatus,
                        testCasesPass: passedCount,
                        testCasesTotal: testCases.length
                    }
                }, '[TRACE Step 5] Socket.IO emitting verdict event to match room');

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
                hasEmittedResult = true;

                if (mode === 'submit' && allPassed) {
                    socketIOInstance.to(matchId).emit('battle:opponent_done', {
                        userId, status: 'ACCEPTED', testCasesPass: passedCount, timeMs: Math.round(maxTime * 1000)
                    });
                }
            }
        } catch (err: any) {
            logger.error({
                message: err.message,
                stack: err.stack,
                error: err
            }, "[WORKER] Code execution phase failed");

            if (mode === 'submit') {
                await Submission.updateOne({ _id: submissionId }, { $set: { status: 'ERROR' } }).catch(() => { });
            }
            if (socketIOInstance && !hasEmittedResult) {
                const event = mode === 'submit' ? 'battle:submission_result' : 'battle:run_result';
                const clientMessage = env.NODE_ENV === 'production'
                    ? 'Code execution failed due to an internal judge system error.'
                    : err.message;
                socketIOInstance.to(matchId).emit(event, { userId, submissionId, status: 'INTERNAL_ERROR', error: clientMessage });
            }
            return;
        }

        // ── Phase 2: Isolated Post-Processing & Persistence (Non-blocking) ──
        if (mode === 'submit') {
            try {
                const problem = await Problem.findById(job.data.problemId).lean();
                const timeToSolveMs = matchStartedAt ? Date.now() - new Date(matchStartedAt).getTime() : undefined;

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

                // Trigger analytics update
                await analyticsQueue.add('update-skills', {
                    userId,
                    matchId,
                    problemDifficulty: problem?.difficulty || 'easy',
                    result: finalStatus === 'ACCEPTED' ? 'win' : 'loss',
                    executionTime: Math.round(maxTime * 1000),
                    languageId: typeof languageId === 'number' ? languageId : (parseInt(String(languageId), 10) || 0),
                }).catch((err) => logger.error({ error: err.message }, '[WORKER] Analytics queue error'));

                // Mark player done & calculate match state
                if (passedCount === testCases.length) {
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
            } catch (postProcessingErr: any) {
                logger.error({
                    message: postProcessingErr.message,
                    stack: postProcessingErr.stack
                }, '[WORKER] Non-fatal post-processing error (Verdict already emitted)');
            }
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
