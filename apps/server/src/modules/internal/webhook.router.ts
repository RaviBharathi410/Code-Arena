import { Router, Request, Response } from 'express';
import { processJudge0Callback } from '../../queues';
import { logger } from '../../lib/logger';
import crypto from 'crypto';
import { env } from '../../config/env';

const router = Router();

/**
 * POST /internal/judge0/callback
 *
 * Webhook endpoint called by Judge0 when code execution completes.
 * Receives the verdict, updates the DB, and emits Socket.IO events.
 */
router.post('/judge0/callback', async (req: Request, res: Response) => {
    try {
        const { submissionId, matchId, userId, sig } = req.query as {
            submissionId: string;
            matchId: string;
            userId: string;
            sig?: string;
        };

        if (!submissionId || !matchId || !userId || !sig) {
            return res.status(400).json({ error: 'Missing query params or signature' });
        }

        // Verify HMAC signature
        const payload = `${submissionId}:${matchId}:${userId}`;
        const expectedSig = crypto.createHmac('sha256', env.JWT_SECRET).update(payload).digest('hex');
        
        // Use timingSafeEqual to prevent timing attacks
        if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
            logger.warn({ submissionId, matchId, ip: req.ip }, '[WEBHOOK] Invalid signature detected');
            return res.status(401).json({ error: 'Invalid signature' });
        }

        const body = req.body;

        if (!body || !body.status) {
            return res.status(400).json({ error: 'Invalid callback payload — missing status' });
        }

        logger.info({
            submissionId,
            matchId,
            statusId: body.status?.id,
            statusDesc: body.status?.description,
        }, '[WEBHOOK] Judge0 callback received');

        // Process the result (updates DB + emits Socket.IO event)
        const result = await processJudge0Callback({
            submissionId,
            matchId,
            userId,
            status: body.status,
            time: body.time,
            memory: body.memory,
            stdout: body.stdout,
            stderr: body.stderr,
            compile_output: body.compile_output,
        });

        res.status(200).json({ received: true, status: result.status });
    } catch (err: any) {
        logger.error({ err }, '[WEBHOOK] Judge0 callback processing failed');
        res.status(500).json({ error: 'Callback processing failed' });
    }
});

export default router;
