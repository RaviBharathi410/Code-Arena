import { execFile } from 'child_process';
import path from 'path';
import { SandboxInterface, SandboxRunResult } from './SandboxInterface';
import { SandboxOptions } from '../types';

export class NsJailSandbox implements SandboxInterface {
  private configPath: string;

  constructor(configPath?: string) {
    this.configPath = configPath || path.join(__dirname, '../../nsjail/default.cfg');
  }

  async isAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      execFile('nsjail', ['--help'], (error) => {
        if (error && (error as any).code === 'ENOENT') {
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }

  async runCommand(
    command: string[],
    stdin: string = '',
    options: SandboxOptions
  ): Promise<SandboxRunResult> {
    const startTime = Date.now();
    const timeLimitSec = Math.ceil(options.timeLimitMs / 1000);
    const memLimitBytes = options.memoryLimitMb * 1024 * 1024;

    const nsjailArgs: string[] = [
      '--config', this.configPath,
      '--bindmount', `${options.workspaceDir}:/tmp/job`,
      '--cwd', '/tmp/job',
      '--time_limit', `${timeLimitSec}`,
      '--rlimit_as', `${memLimitBytes}`,
      '--rlimit_nproc', `${options.pidLimit}`,
      '--',
      ...command
    ];

    return new Promise<SandboxRunResult>((resolve) => {
      const child = execFile('nsjail', nsjailArgs, {
        timeout: options.timeLimitMs + 1000,
        maxBuffer: 1024 * 1024 // 1 MB output cap limit
      }, (error, stdout, stderr) => {
        const timeMs = Date.now() - startTime;
        let timedOut = false;
        let oomKilled = false;
        let sandboxUnavailable = false;

        if (error) {
          if ((error as any).code === 'ENOENT') {
            sandboxUnavailable = true;
          }
          if (error.killed || error.signal === 'SIGTERM' || error.signal === 'SIGKILL') {
            timedOut = true;
          }
          if (stderr.includes('out of memory') || stderr.includes('Memory limit exceeded') || error.code === 137) {
            oomKilled = true;
          }
        }

        resolve({
          stdout: stdout.toString(),
          stderr: stderr.toString(),
          exitCode: child.exitCode ?? (error ? 1 : 0),
          timeMs,
          memoryKb: 0, // Recorded via cgroup/proc if available
          timedOut,
          oomKilled,
          sandboxUnavailable,
          error: sandboxUnavailable ? 'NsJail sandbox binary is not installed or available on this system host' : undefined
        });
      });

      if (stdin && child.stdin) {
        child.stdin.write(stdin);
        child.stdin.end();
      }
    });
  }
}
