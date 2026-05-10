import { Queue, Worker, Job } from 'bullmq';
import { bullmqConnection } from './connection';
import { db } from '../db';
import { submissions } from '@arena/database';
import { eq } from 'drizzle-orm';
import { env } from '../config/env';
import crypto from 'crypto';
import { logger } from '../lib/logger';

// ── Queue Definition ───────────────────────────────────────────────────────

export interface CodeExecutionJobData {
    submissionId: string;
    code: string;
    languageId: number;
    problemId: string;
    matchId: string;
    userId: string;
    testCases: any; // Problem test cases to run against
}

export interface CodeExecutionResult {
    submissionId: string;
    status: string;
    runtime: number | null;
    memory: number | null;
    testResults: any;
}

export const codeExecutionQueue = new Queue<CodeExecutionJobData>('code-execution', {
    connection: bullmqConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000,
        },
        removeOnComplete: { count: 1000 }, // Keep last 1000 completed jobs
        removeOnFail: { count: 5000 },     // Keep last 5000 failed jobs for debugging
    },
});

// ── Worker ─────────────────────────────────────────────────────────────────

/**
 * Code execution worker.
 *
 * Flow:
 * 1. Receives { submissionId, code, languageId, problemId, matchId, userId }
 * 2. POSTs to Judge0 REST API with a callbackUrl pointing to POST /internal/judge0/callback
 * 3. Saves submission record to DB with status PENDING
 * 4. On callback received (handled by the webhook route):
 *    - Parse verdict, update DB, emit Socket.IO event
 */
let socketIOInstance: any = null;

export function setSocketIOInstance(io: any) {
    socketIOInstance = io;
}

export const codeExecutionWorker = new Worker<CodeExecutionJobData>(
    'code-execution',
    async (job: Job<CodeExecutionJobData>) => {
        const { submissionId, code, languageId, matchId, userId, testCases } = job.data;

        logger.info({ submissionId, matchId, jobId: job.id }, '[QUEUE:CODE] Processing submission');

        try {
            // 1. Mark submission as PROCESSING in DB
            await db.update(submissions)
                .set({ status: 'processing' })
                .where(eq(submissions.id, submissionId));

            // 2. Build and sign the callback URL for Judge0 webhook
            const payload = `${submissionId}:${matchId}:${userId}`;
            const signature = crypto.createHmac('sha256', env.JWT_SECRET).update(payload).digest('hex');
            const callbackUrl = `${env.JUDGE0_API_URL.replace(/\/+$/, '')}/internal/judge0/callback?submissionId=${submissionId}&matchId=${matchId}&userId=${userId}&sig=${signature}`;

            // 3. Submit to Judge0
            const judge0Response = await fetch(`${env.JUDGE0_API_URL}/submissions?base64_encoded=false&wait=false`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-RapidAPI-Key': env.JUDGE0_API_KEY,
                    'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
                },
                body: JSON.stringify({
                    source_code: code,
                    language_id: languageId,
                    callback_url: callbackUrl,
                    stdin: testCases?.input || '',
                    expected_output: testCases?.expectedOutput || '',
                }),
            });

            if (!judge0Response.ok) {
                const errorText = await judge0Response.text();
                throw new Error(`Judge0 API error: ${judge0Response.status} — ${errorText}`);
            }

            const judge0Data = await judge0Response.json();
            
            logger.info({
                submissionId,
                judge0Token: judge0Data.token,
            }, '[QUEUE:CODE] Submitted to Judge0, awaiting callback');

            // Store Judge0 token for reference
            return { judge0Token: judge0Data.token, submissionId };

        } catch (err: any) {
            logger.error({ err, submissionId }, '[QUEUE:CODE] Execution failed');

            // Mark submission as failed
            await db.update(submissions)
                .set({ status: 'error' })
                .where(eq(submissions.id, submissionId));

            // Notify user of failure via Socket.IO
            if (socketIOInstance) {
                socketIOInstance.to(`user:${userId}`).emit('match:verdict', {
                    userId,
                    submissionId,
                    status: 'error',
                    message: 'Code execution failed. Please try again.',
                });
            }

            throw err; // BullMQ will retry based on backoff config
        }
    },
    {
        connection: bullmqConnection,
        concurrency: 10, // Process up to 10 submissions concurrently
    }
);

codeExecutionWorker.on('completed', (job) => {
    logger.info({ jobId: job.id }, '[QUEUE:CODE] Job completed');
});

codeExecutionWorker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, '[QUEUE:CODE] Job failed');
});

/**
 * Process Judge0 callback result.
 * Called by the /internal/judge0/callback webhook route.
 */
export async function processJudge0Callback(data: {
    submissionId: string;
    matchId: string;
    userId: string;
    status: { id: number; description: string };
    time: string | null;
    memory: number | null;
    stdout: string | null;
    stderr: string | null;
    compile_output: string | null;
}) {
    const { submissionId, matchId, userId, status, time, memory } = data;

    // Map Judge0 status IDs to our status strings
    // 1 = In Queue, 2 = Processing, 3 = Accepted, 4 = Wrong Answer, etc.
    const statusMap: Record<number, string> = {
        3: 'accepted',
        4: 'wrong_answer',
        5: 'time_limit_exceeded',
        6: 'compilation_error',
        7: 'runtime_error_sigsegv',
        8: 'runtime_error_sigxfsz',
        9: 'runtime_error_sigfpe',
        10: 'runtime_error_sigabrt',
        11: 'runtime_error_nzec',
        12: 'runtime_error_other',
        13: 'internal_error',
        14: 'exec_format_error',
    };

    const mappedStatus = statusMap[status.id] || 'unknown';
    const runtime = time ? parseFloat(time) * 1000 : null; // Convert to ms
    const memoryUsed = memory || null;

    // Update submission in DB
    await db.update(submissions)
        .set({
            status: mappedStatus,
            executionTime: runtime ? Math.round(runtime) : null,
            memoryUsed,
            testResults: {
                judge0StatusId: status.id,
                judge0StatusDesc: status.description,
                stdout: data.stdout,
                stderr: data.stderr,
                compileOutput: data.compile_output,
            },
        })
        .where(eq(submissions.id, submissionId));

    // Emit verdict to match room via Socket.IO
    if (socketIOInstance) {
        socketIOInstance.to(matchId).emit('match:verdict', {
            userId,
            submissionId,
            status: mappedStatus,
            runtime,
            memory: memoryUsed,
        });
    }

    logger.info({
        submissionId,
        matchId,
        status: mappedStatus,
        runtime,
    }, '[QUEUE:CODE] Verdict processed and emitted');

    return { submissionId, status: mappedStatus, runtime, memory: memoryUsed };
}
