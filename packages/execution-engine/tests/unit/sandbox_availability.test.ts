import { SandboxInterface, SandboxRunResult } from '../../src/sandbox/SandboxInterface';
import { NsJailSandbox } from '../../src/sandbox/NsJailSandbox';
import { CodeExecutor } from '../../src/executor/CodeExecutor';
import { LanguageRegistry } from '../../src/registry/LanguageRegistry';
import { ExecutionJob } from '../../src/types';

describe('Sandbox Availability Detection', () => {
  class MockUnavailableSandbox implements SandboxInterface {
    async isAvailable(): Promise<boolean> {
      return false;
    }

    async runCommand(): Promise<SandboxRunResult> {
      return {
        stdout: '',
        stderr: 'nsjail: command not found',
        exitCode: null,
        timeMs: 0,
        memoryKb: 0,
        timedOut: false,
        oomKilled: false,
        sandboxUnavailable: true,
        error: 'NsJail sandbox binary is not installed or available on this system host',
      };
    }
  }

  test('NsJailSandbox detects binary availability via isAvailable()', async () => {
    const sandbox = new NsJailSandbox();
    const available = await sandbox.isAvailable();
    // In dev Windows environment without nsjail installed, this should return false gracefully without throwing
    expect(typeof available).toBe('boolean');
  });

  test('CodeExecutor handles sandbox unavailability gracefully with INTERNAL_ERROR', async () => {
    const mockSandbox = new MockUnavailableSandbox();
    const executor = new CodeExecutor(mockSandbox);
    const registry = new LanguageRegistry();

    const job: ExecutionJob = {
      id: 'job-unavail-test',
      languageId: 'cpp17',
      sourceCode: '#include <iostream>\nint main() { return 0; }',
    };

    const langConfig = registry.get('cpp17')!;
    const result = await executor.execute(job, langConfig);

    expect(result.status).toBe('INTERNAL_ERROR');
    expect(result.error).toContain('Sandbox unavailable');
  });
});
