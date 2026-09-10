import { AIProvider, AICapability, AICompletionOptions } from '../types';

export class CerebrasProvider implements AIProvider {
    name = 'cerebras';
    capabilities = new Set<AICapability>([
        AICapability.TEXT_GEN,
        AICapability.CODE_GEN,
    ]);

    private apiKey: string;
    private baseUrl = 'https://api.cerebras.ai/v1/chat/completions';

    constructor(apiKey: string) {
        this.apiKey = apiKey ? apiKey.trim().replace(/^["']|["']$/g, '').trim() : '';
    }

    isAvailable(): boolean {
        return Boolean(this.apiKey && this.apiKey.length > 0);
    }

    async generateText(options: AICompletionOptions): Promise<string> {
        return this.callCerebras(options);
    }

    async generateCode(options: AICompletionOptions): Promise<string> {
        return this.callCerebras(options);
    }

    private async callCerebras(options: AICompletionOptions): Promise<string> {
        if (!this.isAvailable()) throw new Error('[CEREBRAS_UNAVAILABLE] API key missing');

        const messages = [];
        if (options.systemPrompt) {
            messages.push({ role: 'system', content: options.systemPrompt });
        }
        messages.push({ role: 'user', content: options.prompt });

        const response = await fetch(this.baseUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'llama3.1-8b',
                messages,
                temperature: options.temperature ?? 0.2,
                max_tokens: options.maxTokens ?? 2048,
            }),
        });

        if (!response.ok) {
            const errText = await response.text().catch(() => '');
            throw new Error(`[CEREBRAS_API_ERROR] (${response.status}): ${errText}`);
        }

        const data: any = await response.json();
        return data?.choices?.[0]?.message?.content || '';
    }
}
