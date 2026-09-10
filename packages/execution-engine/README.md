# CodeArena Execution Engine

Small, secure, self-hosted code-execution service built with TypeScript, NsJail sandbox isolation, in-memory job queues, and language registries for CodeArena.

---

## 1. Architecture Overview

```
CodeArena Backend / Socket.IO
        │
        ▼
POST /execute  (Execution API, Node.js / Express)
        │
        ▼
   InMemoryExecutionQueue (ExecutionQueue interface)
        │
   ┌────┴────┐
   ▼         ▼
Worker 1   Worker 2      (MAX_WORKERS, default 2)
   │         │
   ▼         ▼
NsJail Sandbox Engine    (Namespaces, cgroups v2, seccomp, PID & memory limits)
   │         │
   ▼         ▼
gcc/g++, javac/java, python3 (Host binaries inside WSL2 / Linux VM)
```

---

## 2. Resource Limit Knobs & Enforcements

Configured via environment variables (`.env`):

| Variable | Default | Purpose & Protection |
| :--- | :--- | :--- |
| `EXECUTOR_WORKERS` | `2` | Number of parallel worker threads handling sandbox jobs |
| `EXEC_CPU_PER_JOB` | `1` | CPU cores assigned per execution job |
| `EXEC_MEMORY_MB` | `256` | Address space limit per process (prevents host OOM) |
| `EXEC_PID_LIMIT` | `64` | Max PIDs/threads per sandbox (prevents fork bombs) |
| `EXEC_TIMEOUT_MS` | `2000` | Run time-out in milliseconds (prevents CPU exhaustion) |
| `COMPILE_TIMEOUT_MS` | `10000` | Compilation time-out limit |
| `EXEC_OUTPUT_LIMIT_KB` | `1024` | Truncation threshold for stdout/stderr output floods |
| `EXEC_NETWORK` | `off` | Enforces disabled network namespace (`clone_newnet: true`) |

---

## 3. How to Run Locally

```bash
# 1. Install dependencies
cd packages/execution-engine
npm install

# 2. Build TypeScript project
npm run build

# 3. Start the Execution Engine API server (port 3005)
npm start

# 4. Run Adversarial Security Regression Tests
npm run test:security
```

---

## 4. How to Add a New Language Registry Entry

Create a JSON file in `languages/<language_id>.json`:

```json
{
  "id": "go",
  "name": "Go 1.21",
  "sourceFile": "main.go",
  "compile": ["go", "build", "-o", "main", "main.go"],
  "run": ["./main"],
  "compileTimeoutMs": 10000,
  "runTimeoutMs": 2000
}
```

The executor automatically loads new registry entries at startup without code changes.
