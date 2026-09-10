import { Router, Request, Response, NextFunction } from 'express';
import { aiService } from '../../lib/ai/AIService';
import { aiProviderManager } from '../../lib/ai/AIProviderManager';
import { requireAuth } from '../../middleware/auth.middleware';
import { aiLimiter } from '../../middleware/rateLimiter';
import { MatchRoom } from '../../models/MatchRoom';
import { logger } from '../../lib/logger';

const router = Router();

// Protect all AI endpoints with Auth + AI Rate Limiter
router.use(requireAuth);
router.use(aiLimiter);

/**
 * Non-negotiable server-side integrity guardrail (14E).
 * Blocks all real-time AI assistance endpoints if user has an active ranked match.
 */
export const blockActiveRankedMatches = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = (req as any).user?.id;
    if (!userId) {
        next();
        return;
    }

    // Practice sessions are allowed to use AI assistance
    if (req.body?.isPractice === true || req.body?.mode === 'practice') {
        next();
        return;
    }

    try {
        // Auto-expire stale ranked matches older than 20 minutes
        const staleCutoff = new Date(Date.now() - 20 * 60 * 1000);
        await MatchRoom.updateMany({
            mode: 'ranked',
            status: 'active',
            $and: [
                { $or: [{ player1Id: userId }, { player2Id: userId }] },
                {
                    $or: [
                        { startedAt: { $lt: staleCutoff } },
                        { createdAt: { $lt: staleCutoff } },
                    ]
                }
            ]
        }, {
            $set: { status: 'abandoned', endedAt: new Date() }
        });

        const activeRankedMatch = await MatchRoom.findOne({
            $or: [{ player1Id: userId }, { player2Id: userId }],
            mode: 'ranked',
            status: 'active',
        }).select('_id roomCode').lean();

        if (activeRankedMatch) {
            logger.warn({
                userId,
                matchId: (activeRankedMatch._id as any).toString(),
                roomCode: activeRankedMatch.roomCode,
                endpoint: req.originalUrl,
            }, '[INTEGRITY] AI assist attempt blocked during active ranked match');

            res.status(403).json({
                error: 'AI assistance is strictly prohibited during active ranked matches.',
                code: 'AI_ASSIST_BLOCKED_IN_RANKED',
                integrityViolation: true,
                matchId: activeRankedMatch._id,
            });
            return;
        }
    } catch (err: any) {
        logger.error({ error: err.message }, '[INTEGRITY] Error checking active ranked match');
    }

    next();
};

// ── GET /api/ai/status ────────────────────────────────────────────────────
router.get('/status', (req: Request, res: Response) => {
    res.json({
        available: aiProviderManager.isAvailable(),
        providers: aiProviderManager.getAvailableProviders(),
    });
});

// ── POST /api/ai/hint (Practice Mode Socratic Guidance) ───────────────────
router.post('/hint', blockActiveRankedMatches, async (req: Request, res: Response): Promise<void> => {
    try {
        const { code, language, problemTitle, problemDescription, description, level } = req.body;

        if (!code || typeof code !== 'string') {
            res.status(400).json({ error: 'Missing or invalid code' });
            return;
        }

        const result = await aiService.hint({
            code,
            language: language || 'cpp17',
            problemTitle,
            problemDescription: problemDescription || description,
        });

        res.json({
            provider: result.providerName,
            level: level || 1,
            focusArea: result.data.algorithmicFocus,
            ...result.data,
        });
    } catch (err: any) {
        logger.error({ error: err.message }, '[AI_ROUTER] /hint failed');
        res.status(500).json({ error: err.message || 'AI hint generation failed' });
    }
});

// ── POST /api/ai/suggest ──────────────────────────────────────────────────
router.post('/suggest', blockActiveRankedMatches, async (req: Request, res: Response) => {
    try {
        const { codeSnippet, language, cursorPosition, problemContext } = req.body;

        if (!codeSnippet || typeof codeSnippet !== 'string') {
            res.status(400).json({ error: 'Missing or invalid codeSnippet' });
            return;
        }

        const result = await aiService.suggest({
            codeSnippet: codeSnippet.slice(-2048), // Code window limit
            language: language || 'cpp17',
            cursorPosition,
            problemContext,
        });

        res.json({
            provider: result.providerName,
            suggestion: result.data,
        });
    } catch (err: any) {
        logger.error({ error: err.message }, '[AI_ROUTER] /suggest failed');
        res.status(500).json({ error: err.message || 'AI suggestion failed' });
    }
});

// ── POST /api/ai/explain ──────────────────────────────────────────────────
router.post('/explain', blockActiveRankedMatches, async (req: Request, res: Response) => {
    try {
        const { code, language } = req.body;

        if (!code || typeof code !== 'string') {
            res.status(400).json({ error: 'Missing or invalid code' });
            return;
        }

        const result = await aiService.explain(code, language || 'cpp17');

        res.json({
            provider: result.providerName,
            explanation: result.data,
        });
    } catch (err: any) {
        logger.error({ error: err.message }, '[AI_ROUTER] /explain failed');
        res.status(500).json({ error: err.message || 'AI explanation failed' });
    }
});

// ── POST /api/ai/debug ────────────────────────────────────────────────────
router.post('/debug', blockActiveRankedMatches, async (req: Request, res: Response) => {
    try {
        const { code, language, stderr, status, failedTestCase } = req.body;

        if (!code || typeof code !== 'string') {
            res.status(400).json({ error: 'Missing or invalid code' });
            return;
        }

        const result = await aiService.debug({
            code,
            language: language || 'cpp17',
            stderr,
            status,
            failedTestCase,
        });

        res.json({
            provider: result.providerName,
            ...result.data,
        });
    } catch (err: any) {
        logger.error({ error: err.message }, '[AI_ROUTER] /debug failed');
        res.status(500).json({ error: err.message || 'AI debug analysis failed' });
    }
});

// ── POST /api/ai/optimize ─────────────────────────────────────────────────
router.post('/optimize', blockActiveRankedMatches, async (req: Request, res: Response) => {
    try {
        const { code, language, timeMs, memoryKb } = req.body;

        if (!code || typeof code !== 'string') {
            res.status(400).json({ error: 'Missing or invalid code' });
            return;
        }

        const result = await aiService.optimize({
            code,
            language: language || 'cpp17',
            timeMs,
            memoryKb,
        });

        res.json({
            provider: result.providerName,
            ...result.data,
        });
    } catch (err: any) {
        logger.error({ error: err.message }, '[AI_ROUTER] /optimize failed');
        res.status(500).json({ error: err.message || 'AI optimization failed' });
    }
});

// ── POST /api/ai/analyze-submission ──────────────────────────────────────
router.post('/analyze-submission', async (req: Request, res: Response) => {
    try {
        const { code, language, problemTitle, status, stderr, stdout, failedTestCases, timeMs, memoryKb } = req.body;

        if (!code || !status) {
            res.status(400).json({ error: 'Missing code or submission status' });
            return;
        }

        const result = await aiService.analyzeSubmission({
            code,
            language: language || 'cpp17',
            problemTitle,
            status,
            stderr,
            stdout,
            failedTestCases,
            timeMs,
            memoryKb,
        });

        res.json({
            provider: result.providerName,
            ...result.data,
        });
    } catch (err: any) {
        logger.error({ error: err.message }, '[AI_ROUTER] /analyze-submission failed');
        res.status(500).json({ error: err.message || 'Submission analysis failed' });
    }
});

// ── POST /api/ai/voice/transcribe ─────────────────────────────────────────
router.post('/voice/transcribe', async (req: Request, res: Response) => {
    try {
        const { audioBase64, mimeType } = req.body;

        if (!audioBase64 || typeof audioBase64 !== 'string') {
            res.status(400).json({ error: 'Missing or invalid audioBase64 payload' });
            return;
        }

        const audioBuffer = Buffer.from(audioBase64, 'base64');
        const result = await aiService.transcribeAudio(audioBuffer, mimeType);

        res.json({
            provider: result.providerName,
            transcript: result.data,
        });
    } catch (err: any) {
        logger.error({ error: err.message }, '[AI_ROUTER] /voice/transcribe failed');
        res.status(500).json({ error: err.message || 'Voice transcription failed' });
    }
});

// ── POST /api/ai/voice/to-code ────────────────────────────────────────────
router.post('/voice/to-code', blockActiveRankedMatches, async (req: Request, res: Response) => {
    try {
        const { transcript, editorContext, language } = req.body;

        if (!transcript || typeof transcript !== 'string') {
            res.status(400).json({ error: 'Missing or invalid transcript string' });
            return;
        }

        const result = await aiService.voiceToCode(transcript, editorContext || '', language || 'cpp17');

        res.json({
            provider: result.providerName,
            ...result.data,
        });
    } catch (err: any) {
        logger.error({ error: err.message }, '[AI_ROUTER] /voice/to-code failed');
        res.status(500).json({ error: err.message || 'Voice-to-code transformation failed' });
    }
});

// ── POST /api/ai/handwriting/ocr ─────────────────────────────────────────
router.post('/handwriting/ocr', async (req: Request, res: Response) => {
    try {
        const { imageBase64 } = req.body;

        if (!imageBase64 || typeof imageBase64 !== 'string') {
            res.status(400).json({ error: 'Missing or invalid imageBase64 string' });
            return;
        }

        const imageBuffer = Buffer.from(imageBase64, 'base64');
        const result = await aiService.handwritingOcr(imageBuffer);

        res.json({
            provider: result.providerName,
            extractedText: result.data,
        });
    } catch (err: any) {
        logger.error({ error: err.message }, '[AI_ROUTER] /handwriting/ocr failed');
        res.status(500).json({ error: err.message || 'Handwriting OCR extraction failed' });
    }
});

// ── POST /api/ai/handwriting/to-code ──────────────────────────────────────
router.post('/handwriting/to-code', blockActiveRankedMatches, async (req: Request, res: Response) => {
    try {
        const { rawExtractedText, targetLanguage } = req.body;

        if (!rawExtractedText || typeof rawExtractedText !== 'string') {
            res.status(400).json({ error: 'Missing or invalid rawExtractedText payload' });
            return;
        }

        const result = await aiService.handwritingToCode(rawExtractedText, targetLanguage || 'cpp17');

        res.json({
            provider: result.providerName,
            ...result.data,
        });
    } catch (err: any) {
        logger.error({ error: err.message }, '[AI_ROUTER] /handwriting/to-code failed');
        res.status(500).json({ error: err.message || 'Handwriting-to-code processing failed' });
    }
});



export default router;
