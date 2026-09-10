import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import { SandboxInterface, SandboxRunResult } from './SandboxInterface';
import { SandboxOptions } from '../types';

let nextBoxId = 1000;

function getNextBoxId(): number {
  const id = nextBoxId;
  nextBoxId = nextBoxId >= 65535 ? 1000 : nextBoxId + 1;
  return id;
}
interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  error?: string;
}

export class IsolateSandbox implements SandboxInterface {
  private isolatePath: string;

  constructor(
    isolatePath: string = process.env.ISOLATE_PATH || '/usr/local/bin/isolate'
  ) {
    this.isolatePath = isolatePath;
  }

  async isAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      execFile(
        this.isolatePath,
        ['--version'],
        { timeout: 3000 },
        (error) => {
          resolve(!error);
        }
      );
    });
  }
  async runCommand(
    command: string[],
    stdin: string | undefined,
    options: SandboxOptions
  ): Promise<SandboxRunResult> {
    const startTime = Date.now();
    const boxId = getNextBoxId();
    let initialized = false;

    try {
      const init = await this.execIsolate([
        '--cg',
        `--box-id=${boxId}`,
        '--init',
      ]);

      if (init.error) {
        return {
          stdout: '',
          stderr: init.stderr,
          exitCode: null,
          timeMs: Date.now() - startTime,
          memoryKb: 0,
          timedOut: false,
          oomKilled: false,
          sandboxUnavailable: true,
          error: init.error,
        };
      }

      initialized = true;

      const boxPath = this.extractBoxPath(init.stdout);

      await this.copyDirectory(options.workspaceDir, boxPath);

      /*
       * Capture the user's stdout/stderr separately from Isolate's
       * own status messages.
       */
      const stdoutFile = '.__codearena_stdout';
      const stderrFile = '.__codearena_stderr';
      const metaFile = path.join(options.workspaceDir, '.__codearena_meta');

      const memoryLimitKb = Math.max(
        16 * 1024,
        Math.ceil(options.memoryLimitMb * 1024)
      );

      const isolateArgs = [
        '--env=PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',

        '--cg',
        `--box-id=${boxId}`,
        `--cg-mem=${memoryLimitKb}`,
        `--processes=${Math.max(1, options.pidLimit)}`,

        `--time=${Math.max(
          1,
          Math.ceil(options.timeLimitMs / 1000)
        )}`,

        `--wall-time=${Math.max(
          1,
          Math.ceil(options.timeLimitMs / 1000) + 1
        )}`,

        `--stdout=${stdoutFile}`,
        `--stderr=${stderrFile}`,
        `--meta=${metaFile}`,

        '--run',
        '--',
        ...command,
      ];

      console.log('[ISOLATE DEBUG] memoryLimitMb:', options.memoryLimitMb);
      console.log('[ISOLATE DEBUG] isolateArgs:', isolateArgs);

      const result = await this.execIsolate(isolateArgs, stdin);

      /*
       * Read the actual program output.
       */
      const stdoutPath = path.join(boxPath, stdoutFile);
      const stderrPath = path.join(boxPath, stderrFile);
      const metaPath = metaFile;

      const programStdout = await this.readFileSafe(stdoutPath);
      const programStderr = await this.readFileSafe(stderrPath);
      const metadata = await this.readFileSafe(metaPath);
      const memoryKb = this.extractMemoryKb(metadata);
      const metadataExitCode = this.extractExitCode(metadata);
      console.log('[ISOLATE META]', metadata);
      /*
       * Copy generated files back into the CodeArena workspace.
       *
       * This is required for compilation artifacts such as:
       *
       * main
       * Main.class
       */
      if (result.exitCode === 0) {
        await this.copyDirectory(boxPath, options.workspaceDir);
      }

      const timeMs = Date.now() - startTime;

      /*
       * Isolate's manager stderr contains status messages such as:
       *
       * "Time limit exceeded"
       * "Caught fatal signal 11"
       *
       * We use those messages for sandbox-level classification,
       * while programStdout/programStderr contain only user output.
       */
      const sandboxStderr = result.stderr;

      const timedOut =
        result.timedOut ||
        /Time limit exceeded/i.test(sandboxStderr) ||
        /Wall time limit exceeded/i.test(sandboxStderr) ||
        /^killed:/im.test(metadata);

      const oomKilled =
        /cg-oom-killed/i.test(metadata) ||
        (
          /memory/i.test(sandboxStderr) &&
          /(limit|exceed|killed)/i.test(sandboxStderr)
        );

      return {
        stdout: programStdout,
        stderr: programStderr,
        exitCode: metadataExitCode ?? result.exitCode,
        timeMs,
        memoryKb,
        timedOut,
        oomKilled,
      };
    } catch (error: any) {
      return {
        stdout: '',
        stderr: '',
        exitCode: null,
        timeMs: Date.now() - startTime,
        memoryKb: 0,
        timedOut: false,
        oomKilled: false,
        error: error?.message || 'Isolate execution failed',
      };
    } finally {
      if (initialized) {
        await this.execIsolate([
          '--cg',
          `--box-id=${boxId}`,
          '--cleanup',
        ]);
      }
    }
  }

  private extractBoxPath(initOutput: string): string {
    const lines = initOutput
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const sandboxRoot = lines.find((line) =>
      /^\/var\/local\/lib\/isolate\/\d+$/.test(line)
    );

    if (!sandboxRoot) {
      throw new Error(
        `Unable to determine Isolate sandbox path. Output: ${initOutput}`
      );
    }

    return path.join(sandboxRoot, 'box');
  }

  private execIsolate(
    args: string[],
    stdin?: string
  ): Promise<ExecResult> {
    return new Promise((resolve) => {
      const child = execFile(
        this.isolatePath,
        args,
        {
          timeout: 30000,
          maxBuffer: 1024 * 1024,
        },
        (error, stdout, stderr) => {
          const timedOut =
            Boolean(error?.killed) ||
            error?.signal === 'SIGTERM' ||
            error?.signal === 'SIGKILL';

          let exitCode: number | null = null;

          if (typeof child.exitCode === 'number') {
            exitCode = child.exitCode;
          } else if (error && typeof error.code === 'number') {
            exitCode = error.code;
          } else if (!error) {
            exitCode = 0;
          }

          resolve({
            stdout: stdout?.toString() || '',
            stderr: stderr?.toString() || '',
            exitCode,
            timedOut,
            error: error?.message,
          });
        }
      );

      if (stdin !== undefined && child.stdin) {
        child.stdin.write(stdin);
        child.stdin.end();
      }
    });
  }

  private async readFileSafe(filePath: string): Promise<string> {
    try {
      return await fs.promises.readFile(filePath, 'utf8');
    } catch {
      return '';
    }
  }

  private extractMemoryKb(metadata: string): number {
    const match = metadata.match(/^max-rss:(\d+)$/m);

    if (!match) {
      return 0;
    }

    return Number(match[1]);
  }
  private extractExitCode(metadata: string): number | null {
    const match = metadata.match(/^exitcode:(-?\d+)$/m);

    if (!match) {
      return null;
    }

    return Number(match[1]);
  }

  private async copyDirectory(
    sourceDir: string,
    destinationDir: string
  ): Promise<void> {
    await fs.promises.mkdir(destinationDir, {
      recursive: true,
    });

    const entries = await fs.promises.readdir(sourceDir, {
      withFileTypes: true,
    });

    for (const entry of entries) {
      const source = path.join(sourceDir, entry.name);
      const destination = path.join(destinationDir, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirectory(source, destination);
      } else if (entry.isFile()) {
        await fs.promises.copyFile(source, destination);
      }
    }
  }
}
