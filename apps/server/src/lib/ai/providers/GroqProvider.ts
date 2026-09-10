import { AIProvider, AICapability, AICompletionOptions } from '../types';

export class GroqProvider implements AIProvider {
    name = 'groq';
    capabilities = new Set<AICapability>([
        AICapability.TEXT_GEN,
        AICapability.CODE_GEN,
        AICapability.SPEECH_TO_TEXT,
    ]);

    private apiKey: string;
    private baseUrl = 'https://api.groq.com/openai/v1';

    constructor(apiKey: string) {
        this.apiKey = apiKey ? apiKey.trim().replace(/^["']|["']$/g, '').trim() : '';
    }

    isAvailable(): boolean {
        return Boolean(this.apiKey && this.apiKey.length > 0);
    }

    async generateText(options: AICompletionOptions): Promise<string> {
        return this.callGroqChat(options, 'llama-3.3-70b-versatile');
    }

    async generateCode(options: AICompletionOptions): Promise<string> {
        return this.callGroqChat(options, 'llama-3.3-70b-versatile');
    }

    async transcribeAudio(audioBuffer: Buffer, mimeType = 'audio/wav'): Promise<string> {
        if (!this.isAvailable()) throw new Error('[GROQ_UNAVAILABLE] API key missing');

        const formData = new FormData();
        const blob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });
        formData.append('file', blob, 'audio.wav');
        formData.append('model', 'whisper-large-v3');

        const response = await fetch(`${this.baseUrl}/audio/transcriptions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
            },
            body: formData,
        });

        if (!response.ok) {
            const errText = await response.text().catch(() => '');
            throw new Error(`[GROQ_WHISPER_ERROR] (${response.status}): ${errText}`);
        }

        const data: any = await response.json();
        return data?.text || '';
    }

    private async callGroqChat(options: AICompletionOptions, model: string): Promise<string> {
        if (!this.isAvailable()) throw new Error('[GROQ_UNAVAILABLE] API key missing');

        const messages = [];
        if (options.systemPrompt) {
            messages.push({ role: 'system', content: options.systemPrompt });
        }
        messages.push({ role: 'user', content: options.prompt });

        const response = await fetch(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model,
                messages,
                temperature: options.temperature ?? 0.2,
                max_tokens: options.maxTokens ?? 2048,
            }),
        });

        if (!response.ok) {
            const errText = await response.text().catch(() => '');
            throw new Error(`[GROQ_API_ERROR] (${response.status}): ${errText}`);
        }

        const data: any = await response.json();
        return data?.choices?.[0]?.message?.content || '';
    }
}
