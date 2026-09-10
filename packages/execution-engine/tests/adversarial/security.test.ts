import fs from 'fs';
import path from 'path';
import { IsolateSandbox } from '../../src/sandbox/IsolateSandbox';
import { CodeExecutor } from '../../src/executor/CodeExecutor';
import { LanguageRegistry } from '../../src/registry/LanguageRegistry';
import { ExecutionJob } from '../../src/types';

describe('Adversarial Security Suite (Phase 4)', () => {
  const sandbox = new IsolateSandbox();
  const executor = new CodeExecutor(sandbox);
  const registry = new LanguageRegistry();
  const cppConfig = registry.get('cpp17')!;

  test('Infinite loop must trigger TLE', async () => {
    const code = fs.readFileSync(path.join(__dirname, 'infinite_loop.cpp'), 'utf8');
    const job: ExecutionJob = {
      id: 'adv-tle',
      languageId: 'cpp17',
      sourceCode: code,
      timeLimitMs: 1500,
    };
    const result = await executor.execute(job, cppConfig);
    expect(result.status).toBe('TLE');
  }, 15000);

  test('Fork bomb must be capped by PID limit', async () => {
    const code = fs.readFileSync(path.join(__dirname, 'fork_bomb.cpp'), 'utf8');
    const job: ExecutionJob = {
      id: 'adv-fork',
      languageId: 'cpp17',
      sourceCode: code,
      timeLimitMs: 2000,
    };
    const result = await executor.execute(job, cppConfig);
    // Process capped by PID limit and killed or times out safely
    expect(['RUNTIME_ERROR', 'TLE']).toContain(result.status);
  }, 15000);

  test('Memory abuse must trigger MLE', async () => {
    const code = fs.readFileSync(path.join(__dirname, 'memory_abuse.cpp'), 'utf8');
    const job: ExecutionJob = {
      id: 'adv-mle',
      languageId: 'cpp17',
      sourceCode: code,
      memoryLimitMb: 64,
    };
    const result = await executor.execute(job, cppConfig);
    expect(['MLE', 'RUNTIME_ERROR']).toContain(result.status);
  }, 15000);

  test('Filesystem escape must fail', async () => {
    const code = fs.readFileSync(path.join(__dirname, 'file_escape.cpp'), 'utf8');
    const job: ExecutionJob = {
      id: 'adv-file',
      languageId: 'cpp17',
      sourceCode: code,
    };
    const result = await executor.execute(job, cppConfig);
    expect(fs.existsSync('/etc/malicious.txt')).toBe(false);
  });

  test('Network access must fail', async () => {
    const code = fs.readFileSync(path.join(__dirname, 'network_escape.cpp'), 'utf8');
    const job: ExecutionJob = {
      id: 'adv-net',
      languageId: 'cpp17',
      sourceCode: code,
    };
    const result = await executor.execute(job, cppConfig);
    expect(result.stdout).toContain('NETWORK_BLOCKED');
  });

  test('Large output flood must be truncated', async () => {
    const code = fs.readFileSync(path.join(__dirname, 'large_output.cpp'), 'utf8');
    const job: ExecutionJob = {
      id: 'adv-flood',
      languageId: 'cpp17',
      sourceCode: code,
    };
    const result = await executor.execute(job, cppConfig);
    expect(result.stdout.length).toBeLessThanOrEqual(1024 * 1024 + 100);
  });
});
