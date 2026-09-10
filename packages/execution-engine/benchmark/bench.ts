import http from 'http';
import { InMemoryExecutionQueue } from '../src/queue/InMemoryExecutionQueue';
import { WorkerPool } from '../src/queue/WorkerPool';
import { CodeExecutor } from '../src/executor/CodeExecutor';
import { NsJailSandbox } from '../src/sandbox/NsJailSandbox';
import { LanguageRegistry } from '../src/registry/LanguageRegistry';
import { ExecutionJob } from '../src/types';

async function runBenchmark() {
  console.log('=== CodeArena Execution Engine Benchmark Suite (Phase 10) ===\n');

  const registry = new LanguageRegistry();
  const sandbox = new NsJailSandbox();
  const executor = new CodeExecutor(sandbox);
  const queue = new InMemoryExecutionQueue();
  const workerPool = new WorkerPool(queue, executor, registry, 2);

  workerPool.start();

  const languages = ['c', 'cpp17', 'java', 'python3'];
  const testCode: Record<string, string> = {
    c: '#include <stdio.h>\nint main() { printf("Hello Benchmark\\n"); return 0; }',
    cpp17: '#include <iostream>\nint main() { std::cout << "Hello Benchmark" << std::endl; return 0; }',
    java: 'public class Main { public static void main(String[] args) { System.out.println("Hello Benchmark"); } }',
    python3: 'print("Hello Benchmark")',
  };

  for (const lang of languages) {
    console.log(`Benchmarking language: ${lang}`);
    const times: number[] = [];
    const iterations = 5;

    for (let i = 0; i < iterations; i++) {
      const jobId = `bench-${lang}-${i}`;
      const job: ExecutionJob = {
        id: jobId,
        languageId: lang,
        sourceCode: testCode[lang],
      };

      const start = Date.now();
      await queue.enqueue(job);
      const res = await queue.waitForResult(jobId);
      const elapsed = Date.now() - start;

      if (res.status === 'ACCEPTED') {
        times.push(elapsed);
      } else {
        console.error(`Job failed with status: ${res.status}`);
      }
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    console.log(`Results for ${lang}: Avg Latency: ${avgTime.toFixed(2)}ms across ${times.length} successful runs\n`);
  }

  workerPool.stop();
  process.exit(0);
}

runBenchmark();
