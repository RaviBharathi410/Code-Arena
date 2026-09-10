import { ExecutionJob, ExecutionResult } from '../types';
import { ExecutionQueue } from './ExecutionQueue';

export class InMemoryExecutionQueue implements ExecutionQueue {
  private queue: ExecutionJob[] = [];
  private results: Map<string, ExecutionResult> = new Map();
  private listeners: Map<string, (result: ExecutionResult) => void> = new Map();

  async enqueue(job: ExecutionJob): Promise<string> {
    this.queue.push(job);
    return job.id;
  }

  dequeue(): ExecutionJob | undefined {
    return this.queue.shift();
  }

  async getResult(jobId: string): Promise<ExecutionResult | null> {
    return this.results.get(jobId) || null;
  }

  setResult(jobId: string, result: ExecutionResult): void {
    this.results.set(jobId, result);
    const listener = this.listeners.get(jobId);
    if (listener) {
      listener(result);
      this.listeners.delete(jobId);
    }
  }

  waitForResult(jobId: string, timeoutMs: number = 15000): Promise<ExecutionResult> {
    const existing = this.results.get(jobId);
    if (existing) return Promise.resolve(existing);

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.listeners.delete(jobId);
        reject(new Error(`Timeout waiting for execution result of job ${jobId}`));
      }, timeoutMs);

      this.listeners.set(jobId, (result) => {
        clearTimeout(timer);
        resolve(result);
      });
    });
  }

  getPendingCount(): number {
    return this.queue.length;
  }
}
