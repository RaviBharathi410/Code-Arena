export enum AICapability {
    TEXT_GEN = 'TEXT_GEN',
    CODE_GEN = 'CODE_GEN',
    VISION = 'VISION',
    SPEECH_TO_TEXT = 'SPEECH_TO_TEXT',
}

export interface AICompletionOptions {
    prompt: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
}

export interface AISuggestOptions {
    codeSnippet: string;
    language: string;
    cursorPosition?: { line: number; column: number };
    problemContext?: string;
}

export interface AIDebugOptions {
    code: string;
    language: string;
    stderr?: string;
    status?: string;
    failedTestCase?: { input?: string; expected?: string; actual?: string };
}

export interface AIOptimizeOptions {
    code: string;
    language: string;
    timeMs?: number;
    memoryKb?: number;
}

export interface AIAnalyzeSubmissionOptions {
    code: string;
    language: string;
    problemTitle?: string;
    status: string;
    stderr?: string;
    stdout?: string;
    failedTestCases?: Array<{ input?: string; expected?: string; actual?: string }>;
    timeMs?: number;
    memoryKb?: number;
}

export interface AIServiceResult<T = string> {
    providerName: string;
    data: T;
    usage?: { promptTokens?: number; completionTokens?: number };
}

export interface AIProvider {
    name: string;
    capabilities: Set<AICapability>;
    isAvailable(): boolean;
    generateText?(options: AICompletionOptions): Promise<string>;
    generateCode?(options: AICompletionOptions): Promise<string>;
    analyzeVision?(imageBuffer: Buffer, prompt: string): Promise<string>;
    transcribeAudio?(audioBuffer: Buffer, mimeType?: string): Promise<string>;
}
