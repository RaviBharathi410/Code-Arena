import { ExecutionJob, ExecutionResult } from '../types';

export interface ExecutionQueue {
  enqueue(job: ExecutionJob): Promise<string>;
  getResult(jobId: string): Promise<ExecutionResult | null>;
  getPendingCount(): number;
}
