import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { InMemoryExecutionQueue } from "../queue/InMemoryExecutionQueue";
import { WorkerPool } from '../queue/WorkerPool';
import { CodeExecutor } from '../executor/CodeExecutor';
import { IsolateSandbox } from '../sandbox/IsolateSandbox';
import { LanguageRegistry } from '../registry/LanguageRegistry';
import { ExecutionJob } from '../types';

const app = express();
app.use(express.json({ limit: '1mb' }));

const port = process.env.PORT || 3005;
const registry = new LanguageRegistry();
const sandbox = new IsolateSandbox();
const executor = new CodeExecutor(sandbox);
const queue = new InMemoryExecutionQueue();
const workerPool = new WorkerPool(queue, executor, registry);

workerPool.start();

const MAX_SOURCE_SIZE = 64 * 1024; // 64 KB
const MAX_STDIN_SIZE = 256 * 1024; // 256 KB

/**
 * Timing-safe authentication middleware for executor endpoints.
 * Rejects requests before any sandbox, queue, or isolate resources are allocated.
 */
function safeTokenCompare(provided: string, expected: string): boolean {
  const bufA = Buffer.from(provided);
  const bufB = Buffer.from(expected);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const expectedToken = process.env.EXECUTION_ENGINE_TOKEN;

  if (!expectedToken) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[SECURITY FATAL] EXECUTION_ENGINE_TOKEN is not configured in production environment.');
      res.status(500).json({ error: 'Server authentication misconfiguration' });
      return;
    }
    // In local non-production development where token is omitted, pass through
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn(`[AUTH REJECTED] Missing or malformed Authorization header from ${req.ip || 'unknown'}`);
    res.status(401).json({ error: 'Unauthorized: Missing or invalid execution token' });
    return;
  }

  const token = authHeader.slice(7).trim();
  if (!safeTokenCompare(token, expectedToken)) {
    console.warn(`[AUTH REJECTED] Invalid Bearer token from ${req.ip || 'unknown'}`);
    res.status(401).json({ error: 'Unauthorized: Missing or invalid execution token' });
    return;
  }

  next();
};

app.post('/execute', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { languageId, sourceCode, stdin, timeLimitMs, memoryLimitMb } = req.body;

    if (!languageId || typeof languageId !== 'string') {
      res.status(400).json({ error: 'Invalid or missing languageId' });
      return;
    }

    if (!registry.has(languageId)) {
      res.status(400).json({ error: `Language '${languageId}' is not supported` });
      return;
    }

    if (!sourceCode || typeof sourceCode !== 'string' || sourceCode.length > MAX_SOURCE_SIZE) {
      res.status(400).json({ error: `sourceCode must be non-empty and under ${MAX_SOURCE_SIZE} bytes` });
      return;
    }

    if (stdin && (typeof stdin !== 'string' || stdin.length > MAX_STDIN_SIZE)) {
      res.status(400).json({ error: `stdin must be under ${MAX_STDIN_SIZE} bytes` });
      return;
    }

    const jobId = uuidv4();
    const job: ExecutionJob = {
      id: jobId,
      languageId,
      sourceCode,
      stdin,
      timeLimitMs,
      memoryLimitMb,
    };

    await queue.enqueue(job);

    // Wait for worker execution result
    const result = await queue.waitForResult(jobId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ status: 'INTERNAL_ERROR', error: err.message || 'Execution error' });
  }
});

app.get('/status/:jobId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const result = await queue.getResult(req.params.jobId);
  if (!result) {
    res.status(404).json({ error: 'Job not found or pending' });
    return;
  }
  res.json(result);
});

app.get('/health', async (_req: Request, res: Response) => {
  const sandboxAvailable = await sandbox.isAvailable();
  res.json({
    status: sandboxAvailable ? 'ok' : 'degraded',
    sandboxAvailable,
    activeWorkers: workerPool.getActiveWorkers(),
    maxWorkers: workerPool.getMaxWorkers(),
    pendingJobs: queue.getPendingCount(),
  });
});
app.use((err: any, _req: Request, res: Response, next: any): void => {
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      error: 'Invalid JSON request body',
    });
    return;
  }

  next(err);
});
app.listen(port, () => {
  console.log(`[CodeArena Execution Engine] Server running on port ${port} (WorkerPool bounded to max ${workerPool.getMaxWorkers()} workers)`);
});
