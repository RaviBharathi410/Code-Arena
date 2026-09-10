export type ExecutionStatus = 
  | 'ACCEPTED'
  | 'COMPILATION_ERROR'
  | 'TLE'
  | 'MLE'
  | 'RUNTIME_ERROR'
  | 'INTERNAL_ERROR';

export interface LanguageConfig {
  id: string;
  name: string;
  sourceFile: string;
  compile: string[] | null;
  run: string[];
  compileTimeoutMs: number;
  runTimeoutMs: number;
}

export interface ExecutionJob {
  id: string;
  languageId: string;
  sourceCode: string;
  stdin?: string;
  timeLimitMs?: number;
  memoryLimitMb?: number;
}

export interface ExecutionResult {
  jobId: string;
  status: ExecutionStatus;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timeMs: number;
  memoryKb: number;
  error?: string;
}

export interface SandboxOptions {
  workspaceDir: string;
  timeLimitMs: number;
  memoryLimitMb: number;
  pidLimit: number;
}
