import { InMemoryExecutionQueue } from './InMemoryExecutionQueue';
import { CodeExecutor } from '../executor/CodeExecutor';
import { LanguageRegistry } from '../registry/LanguageRegistry';

export class WorkerPool {
  private activeWorkers: number = 0;
  private maxWorkers: number;
  private isRunning: boolean = false;

  constructor(
    private queue: InMemoryExecutionQueue,
    private executor: CodeExecutor,
    private registry: LanguageRegistry,
    maxWorkers?: number
  ) {
    this.maxWorkers = maxWorkers || parseInt(process.env.MAX_WORKERS || process.env.EXECUTOR_WORKERS || '2', 10);
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.processLoop();
  }

  stop(): void {
    this.isRunning = false;
  }

  private async processLoop(): Promise<void> {
    while (this.isRunning) {
      if (this.activeWorkers < this.maxWorkers && this.queue.getPendingCount() > 0) {
        const job = this.queue.dequeue();
        if (job) {
          this.activeWorkers++;
          this.executeJob(job).finally(() => {
            this.activeWorkers--;
          });
        }
      }
      await new Promise((res) => setTimeout(res, 50));
    }
  }

  private async executeJob(job: any): Promise<void> {
    const langConfig = this.registry.get(job.languageId);
    if (!langConfig) {
      this.queue.setResult(job.id, {
        jobId: job.id,
        status: 'INTERNAL_ERROR',
        stdout: '',
        stderr: '',
        exitCode: null,
        timeMs: 0,
        memoryKb: 0,
        error: `Unsupported language: ${job.languageId}`,
      });
      return;
    }

    const result = await this.executor.execute(job, langConfig);
    this.queue.setResult(job.id, result);
  }

  getActiveWorkers(): number {
    return this.activeWorkers;
  }

  getMaxWorkers(): number {
    return this.maxWorkers;
  }
}
