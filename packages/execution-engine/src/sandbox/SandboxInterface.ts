import { SandboxOptions } from '../types';

export interface SandboxRunResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timeMs: number;
  memoryKb: number;
  timedOut: boolean;
  oomKilled: boolean;
  sandboxUnavailable?: boolean;
  error?: string;
}

export interface SandboxInterface {
  isAvailable(): Promise<boolean>;
  runCommand(
    command: string[],
    stdin: string | undefined,
    options: SandboxOptions
  ): Promise<SandboxRunResult>;
}

