import { env } from '../../config/env';

export interface ExecutionRequest {
    languageId: string;
    sourceCode: string;
    stdin: string;
    timeLimitMs?: number;
    memoryLimitMb?: number;
}

export interface ExecutionResponse {
    jobId: string;
    status: string;
    stdout: string;
    stderr: string;
    exitCode: number | null;
    timeMs: number;
    memoryKb: number;
    error?: string;
}

export class ExecutionEngineClient {
    private baseUrl: string;

    constructor() {
        this.baseUrl = env.EXECUTION_ENGINE_URL || process.env.EXECUTION_ENGINE_URL || 'http://localhost:3005';
    }

    async execute(request: ExecutionRequest): Promise<ExecutionResponse> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        if (env.EXECUTION_ENGINE_TOKEN) {
            headers['Authorization'] = `Bearer ${env.EXECUTION_ENGINE_TOKEN}`;
        }

        const response = await fetch(`${this.baseUrl}/execute`, {
            method: 'POST',
            headers,
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            const errText = await response.text().catch(() => '');
            throw new Error(`Execution engine error (${response.status}): ${errText}`);
        }

        return (await response.json()) as ExecutionResponse;
    }
}

export const executionEngineClient = new ExecutionEngineClient();
