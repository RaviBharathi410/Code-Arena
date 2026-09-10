import fs from 'fs';
import path from 'path';
import os from 'os';
import { LanguageConfig, ExecutionJob, ExecutionResult, SandboxOptions } from '../types';
import { SandboxInterface } from '../sandbox/SandboxInterface';

export class CodeExecutor {
  constructor(private sandbox: SandboxInterface) {}

  async execute(job: ExecutionJob, langConfig: LanguageConfig): Promise<ExecutionResult> {
    const baseTmpDir = process.env.EXEC_TMP_DIR || path.join(os.tmpdir(), 'codearena');
    const jobDir = path.join(baseTmpDir, job.id);

    // Guaranteed workspace setup & cleanup via try/finally
    if (!fs.existsSync(jobDir)) {
      fs.mkdirSync(jobDir, { recursive: true });
    }

    try {
      // 1. Write source file
      const sourcePath = path.join(jobDir, langConfig.sourceFile);
      fs.writeFileSync(sourcePath, job.sourceCode, 'utf8');

      const options: SandboxOptions = {
        workspaceDir: jobDir,
        timeLimitMs: job.timeLimitMs || langConfig.runTimeoutMs || 2000,
        memoryLimitMb: job.memoryLimitMb || 256,
        pidLimit: parseInt(process.env.EXEC_PID_LIMIT || '64', 10),
      };

      // 2. Compilation phase (if applicable)
      if (langConfig.compile && langConfig.compile.length > 0) {
        const compileOptions: SandboxOptions = {
          ...options,

          timeLimitMs: langConfig.compileTimeoutMs || 10000,
          memoryLimitMb: Math.max(options.memoryLimitMb, 512),
        };

        const compileRes = await this.sandbox.runCommand(langConfig.compile, undefined, compileOptions);

        if (compileRes.sandboxUnavailable) {
          return {
            jobId: job.id,
            status: 'INTERNAL_ERROR',
            stdout: '',
            stderr: compileRes.stderr || 'Sandbox engine unavailable (nsjail not found)',
            exitCode: null,
            timeMs: compileRes.timeMs,
            memoryKb: 0,
            error: 'Sandbox unavailable: nsjail binary is not installed or available on this host environment',
          };
        }

        if (compileRes.exitCode !== 0 || compileRes.timedOut) {
          return {
            jobId: job.id,
            status: 'COMPILATION_ERROR',
            stdout: compileRes.stdout.slice(0, 1024 * 1024),
            stderr: compileRes.stderr.slice(0, 1024 * 1024),
            exitCode: compileRes.exitCode,
            timeMs: compileRes.timeMs,
            memoryKb: compileRes.memoryKb,
            error: 'Compilation failed',
          };
        }
      }

      // 3. Execution phase
      const runRes = await this.sandbox.runCommand(langConfig.run, job.stdin, options);

      if (runRes.sandboxUnavailable) {
        return {
          jobId: job.id,
          status: 'INTERNAL_ERROR',
          stdout: '',
          stderr: runRes.stderr || 'Sandbox engine unavailable (nsjail not found)',
          exitCode: null,
          timeMs: runRes.timeMs,
          memoryKb: 0,
          error: 'Sandbox unavailable: nsjail binary is not installed or available on this host environment',
        };
      }

      let status: ExecutionResult['status'] = 'ACCEPTED';
      if (runRes.timedOut) {
        status = 'TLE';
      } else if (runRes.oomKilled) {
        status = 'MLE';
      } else if (runRes.exitCode !== 0) {
        status = 'RUNTIME_ERROR';
      }

      return {
        jobId: job.id,
        status,
        stdout: runRes.stdout.slice(0, 1024 * 1024), // 1024 KB limit truncation
        stderr: runRes.stderr.slice(0, 1024 * 1024),
        exitCode: runRes.exitCode,
        timeMs: runRes.timeMs,
        memoryKb: runRes.memoryKb,
      };
    } catch (err: any) {
      return {
        jobId: job.id,
        status: 'INTERNAL_ERROR',
        stdout: '',
        stderr: '',
        exitCode: null,
        timeMs: 0,
        memoryKb: 0,
        error: err.message || 'Internal execution failure',
      };
    } finally {
      // Guaranteed workspace destruction
      try {
        if (fs.existsSync(jobDir)) {
          fs.rmSync(jobDir, { recursive: true, force: true });
        }
      } catch (cleanErr) {
        // Ignored or logged
      }
    }
  }
}
