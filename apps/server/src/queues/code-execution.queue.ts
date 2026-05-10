import { Queue, Worker, Job } from 'bullmq';
import { db } from '../db';
import { submissions, matchRooms, problems } from '@arena/database';
import { eq } from 'drizzle-orm';
import { env } from '../config/env';
import crypto from 'crypto';
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
}

export const codeExecutionQueue = new Queue<CodeExecutionJobData>('code-execution', {
    connection: createBullMQRedisClient(),
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
    },
});

let socketIOInstance: any = null;
export function setSocketIOInstance(io: any) {
    socketIOInstance = io;
}

export const codeExecutionWorker = new Worker<CodeExecutionJobData>(
    'code-execution',
    async (job: Job<CodeExecutionJobData>) => {
        const { submissionId, code, languageId, matchId, userId, testCases, mode } = job.data;

        try {
            if (mode === 'submit') {
                await db.update(submissions)
                    .set({ status: 'PROCESSING' })
                    .where(eq(submissions.id, submissionId));
            }

            // Prepare batch submissions for Judge0
            const judgeSubmissions = testCases.map((tc, index) => ({
                source_code: code,
                language_id: languageId,
                stdin: typeof tc.input === 'string' ? tc.input : JSON.stringify(tc.input),
                expected_output: typeof tc.expected_output === 'string' ? tc.expected_output : JSON.stringify(tc.expected_output),
                // We'll use a single callback for the whole batch if possible, or poll.
                // Judge0 Standard doesn't support batch callbacks easily. 
                // We'll submit individually but in parallel and wait.
            }));

            const results = await Promise.all(judgeSubmissions.map(async (sub) => {
                const response = await fetch(`${env.JUDGE0_API_URL}/submissions?base64_encoded=false&wait=true`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-RapidAPI-Key': env.JUDGE0_API_KEY,
                    },
                    body: JSON.stringify(sub),
                });
                return response.json();
            }));

            // Process results
            let allPassed = true;
            let passedCount = 0;
            let maxTime = 0;
            let maxMemory = 0;
            const testResults = results.map((res, i) => {
                const passed = res.status?.id === 3;
                if (!passed) allPassed = false;
                else passedCount++;

                if (res.time) maxTime = Math.max(maxTime, parseFloat(res.time));
                if (res.memory) maxMemory = Math.max(maxMemory, res.memory);

                return {
                    testCaseIndex: i,
                    status: res.status?.description,
                    passed,
                    stdout: res.stdout,
                    stderr: res.stderr,
                    compile_output: res.compile_output,
                    time: res.time,
                    memory: res.memory
                };
            });

            const finalStatus = allPassed ? 'ACCEPTED' : (testResults.find(r => !r.passed)?.status?.toUpperCase() || 'WRONG');

            if (mode === 'submit') {
                const problem = await db.query.problems.findFirst({ where: eq(problems.id, job.data.problemId) });
                
                // Complexity Detection
                const detectedComplexity = scoringEngine.detectComplexity(maxTime * 1000, 1000); // Dummy N=1000
                const finalScore = scoringEngine.calculateScore({
                    status: finalStatus as any,
                    timeSeconds: maxTime,
                    detectedComplexity,
                    optimalComplexity: problem?.optimalTimeComplexity || 'O(n)',
                    qualityScore: 8 // Placeholder
                });

                await db.update(submissions)
                    .set({
                        status: finalStatus,
                        timeMs: Math.round(maxTime * 1000),
                        memoryKb: maxMemory,
                        testCasesPass: passedCount,
                        testCasesTotal: testCases.length,
                        timeComplexity: detectedComplexity,
                        qualityScore: 8,
                        finalScore,
                        testResults: testResults as any
                    })
                    .where(eq(submissions.id, submissionId));
                
                // If accepted, check if match is over
                if (allPassed) {
                    const room = await db.query.matchRooms.findFirst({ where: eq(matchRooms.id, matchId) });
                    const isPlayer1 = room?.player1Id === userId;
                    const updatedField = isPlayer1 ? { player1DoneAt: new Date() } : { player2DoneAt: new Date() };
                    
                    const [updatedRoom] = await db.update(matchRooms)
                        .set(updatedField)
                        .where(eq(matchRooms.id, matchId))
                        .returning();

                    // Check if both are done
                    if (updatedRoom.player1DoneAt && updatedRoom.player2DoneAt) {
                        const results = await matchesService.calculateMatchResult(matchId);
                        if (socketIOInstance) {
                            socketIOInstance.to(matchId).emit('match:result', results);
                        }
                    }
                }
            }

            // Notify via Socket
            if (socketIOInstance) {
                const event = mode === 'submit' ? 'battle:submission_result' : 'battle:run_result';
                socketIOInstance.to(matchId).emit(event, {
                    userId,
                    submissionId,
                    status: finalStatus,
                    testCasesPass: passedCount,
                    testCasesTotal: testCases.length,
                    results: mode === 'run' ? testResults : undefined, // Only show details for run
                    timeMs: Math.round(maxTime * 1000),
                    memoryKb: maxMemory,
                    timeComplexity: detectedComplexity,
                    qualityScore: 8 // Placeholder
                });

                if (mode === 'submit' && allPassed) {
                    socketIOInstance.to(matchId).emit('battle:opponent_done', {
                        userId,
                        status: 'ACCEPTED',
                        testCasesPass: passedCount,
                        timeMs: Math.round(maxTime * 1000)
                    });
                }
            }

        } catch (err: any) {
            logger.error({ err, submissionId }, '[QUEUE:CODE] Execution failed');
            if (mode === 'submit') {
                await db.update(submissions).set({ status: 'ERROR' }).where(eq(submissions.id, submissionId));
            }
            throw err;
        }
    },
    { connection: createBullMQRedisClient(), concurrency: 10 }
);
